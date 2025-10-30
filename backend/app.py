from flask import Flask, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename
from PIL import Image
import os
import traceback
import json
import base64
import io
import cv2
import numpy as np
import torch
import torch.nn.functional as F
from model_loader import predict, transform, get_model  # Added get_model import
from flask_cors import CORS

app = Flask(__name__, static_folder='../frontend') 
CORS(app)

# --- Load Breed Information ---
BASE_DIR = os.path.dirname(__file__)
with open(os.path.join(BASE_DIR, 'breed_info.json'), 'r') as f:
    breed_info_db = json.load(f)

UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

def generate_gradcam(model, img_tensor, target_class=None):
    """
    Generate Grad-CAM heatmap for timm MobileNetV3 wrapped model
    """
    model.eval()
    
    # For your custom ModelWrapper with timm backbone
    target_layer = None
    
    try:
        # Access the timm backbone inside your ModelWrapper
        backbone = model.backbone
        
        # For timm MobileNetV3, get the last convolutional block
        if hasattr(backbone, 'blocks'):
            # Get the last block in the backbone
            target_layer = backbone.blocks[-1]
        elif hasattr(backbone, 'features'):
            target_layer = backbone.features[-1]
        else:
            # Fallback: find the last conv layer
            for name, module in backbone.named_modules():
                if isinstance(module, (torch.nn.Conv2d, torch.nn.Sequential)):
                    target_layer = module
    except Exception as e:
        print(f"Error accessing backbone: {e}")
        return None
    
    if target_layer is None:
        print("Could not find appropriate layer for Grad-CAM in timm model")
        return None
    
    print(f"Using target layer: {target_layer}")
    
    # Hook to capture gradients and activations
    gradients = []
    activations = []
    
    def backward_hook(module, grad_input, grad_output):
        if grad_output[0] is not None:
            gradients.append(grad_output[0])
    
    def forward_hook(module, input, output):
        activations.append(output)
    
    # Register hooks
    try:
        backward_handle = target_layer.register_full_backward_hook(backward_hook)
        forward_handle = target_layer.register_forward_hook(forward_hook)
    except:
        # Fallback for older PyTorch versions
        backward_handle = target_layer.register_backward_hook(backward_hook)
        forward_handle = target_layer.register_forward_hook(forward_hook)
    
    try:
        # Forward pass
        img_tensor.requires_grad_(True)
        output = model(img_tensor)
        
        # Use predicted class if target_class not specified
        if target_class is None:
            target_class = output.argmax(dim=1).item()
        
        print(f"Generating Grad-CAM for class {target_class}")
        
        # Backward pass
        model.zero_grad()
        class_score = output[0, target_class]
        class_score.backward(retain_graph=True)
        
        if not gradients or not activations:
            print("No gradients or activations captured")
            return None
        
        # Calculate Grad-CAM
        gradients_val = gradients[0]
        activations_val = activations[0]
        
        print(f"Gradients shape: {gradients_val.shape}, Activations shape: {activations_val.shape}")
        
        # Global average pooling of gradients
        weights = torch.mean(gradients_val, dim=(2, 3), keepdim=True)
        
        # Weighted combination of activation maps
        cam = torch.sum(weights * activations_val, dim=1, keepdim=True)
        cam = F.relu(cam)  # Apply ReLU
        
        if cam.max() > cam.min():
            # Normalize to 0-1
            cam = cam.squeeze()
            cam = (cam - cam.min()) / (cam.max() - cam.min())
            print(f"CAM shape after processing: {cam.shape}")
            return cam.detach().cpu().numpy()
        else:
            print("CAM values are constant - no gradient information")
            return None
    
    except Exception as e:
        print(f"Error in Grad-CAM generation: {e}")
        print(f"Full traceback: {traceback.format_exc()}")
        return None
    finally:
        # Clean up hooks
        try:
            backward_handle.remove()
            forward_handle.remove()
        except:
            pass

def create_gradcam_overlay(original_image, cam, alpha=0.4):
    """
    Create Grad-CAM overlay on the original image
    """
    # Resize CAM to match original image size
    original_array = np.array(original_image)
    h, w = original_array.shape[:2]
    cam_resized = cv2.resize(cam, (w, h))
    
    # Convert CAM to heatmap
    heatmap = cv2.applyColorMap(np.uint8(255 * cam_resized), cv2.COLORMAP_JET)
    heatmap = cv2.cvtColor(heatmap, cv2.COLOR_BGR2RGB)
    
    # Overlay heatmap on original image
    overlay = heatmap * alpha + original_array * (1 - alpha)
    overlay = np.uint8(overlay)
    
    return Image.fromarray(overlay)

def image_to_base64(pil_image):
    """
    Convert PIL Image to base64 string
    """
    buffer = io.BytesIO()
    pil_image.save(buffer, format='JPEG', quality=95)
    img_str = base64.b64encode(buffer.getvalue()).decode()
    return f"data:image/jpeg;base64,{img_str}"

@app.route("/")
def serve_login():
    return send_from_directory("../frontend", "login.html")

@app.route("/dashboard")
def serve_dashboard():
    return send_from_directory("../frontend", "index.html")

@app.route("/<path:path>")
def serve_static(path):
    return send_from_directory("../frontend", path)

@app.route("/predict", methods=["POST"])
def classify_breed():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "Empty filename"}), 400

    filepath = ""
    try:
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)

        # Load and process image
        img = Image.open(filepath).convert("RGB")
        img_tensor = transform(img).unsqueeze(0)
        
        # Get prediction
        breed, confidence = predict(img_tensor)
        
        # Generate Grad-CAM
        gradcam_base64 = None
        try:
            print("Attempting to generate Grad-CAM...")
            model = get_model()
            cam = generate_gradcam(model, img_tensor)
            if cam is not None:
                gradcam_overlay = create_gradcam_overlay(img, cam)
                gradcam_base64 = image_to_base64(gradcam_overlay)
                print("Grad-CAM generated successfully")
            else:
                print("Grad-CAM generation returned None")
        except Exception as gradcam_error:
            print(f"Grad-CAM generation failed: {gradcam_error}")
            print(f"Error traceback: {traceback.format_exc()}")
            gradcam_base64 = None
        
        # Get breed information
        breed_info = breed_info_db.get(breed, {
            "origin": "N/A",
            "farmer_look_for": "No detailed information available for this breed in the database.",
            "uniqueness": "N/A"
        })
        
        response_data = {
            "breed": breed, 
            "confidence": round(confidence, 4),
            "info": breed_info
        }
        
        # Add Grad-CAM if generation was successful
        if gradcam_base64:
            response_data["gradcam"] = gradcam_base64
        
        return jsonify(response_data)
        
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500
    finally:
        if os.path.exists(filepath):
            os.remove(filepath)

if __name__ == "__main__":
    app.run(debug=True, port=5000)