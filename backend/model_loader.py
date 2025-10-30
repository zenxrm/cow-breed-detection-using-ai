import torch
import json, os
from torchvision import transforms
from model import build_model, DEVICE

BASE_DIR = os.path.dirname(__file__)
MODEL_PATH = os.path.join(BASE_DIR, "indian_cattle_breed_classifier.pth")
CLASS_PATH = os.path.join(BASE_DIR, "class_indices.json")

with open(CLASS_PATH, "r") as f:
    class_indices = json.load(f)
idx_to_class = {v: k for k, v in class_indices.items()}

model = build_model(name="mobilenetv3_large_100", num_classes=len(class_indices), pretrained=False).to(DEVICE)

state_dict = torch.load(MODEL_PATH, map_location=DEVICE)
model.load_state_dict(state_dict)
model.eval()

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

def predict(img_tensor):
    with torch.no_grad():
        outputs = model(img_tensor.to(DEVICE))
        probs = torch.softmax(outputs, dim=1)
        conf, pred = torch.max(probs, 1)
        return idx_to_class[pred.item()], conf.item()

def get_model():
    """
    Return the loaded model instance for Grad-CAM generation
    """
    return model

def get_class_indices():
    """
    Return class indices mapping for Grad-CAM
    """
    return class_indices, idx_to_class