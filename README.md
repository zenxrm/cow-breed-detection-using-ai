# 🐄 AI Breed Classifier 🧬

A full-stack web application that uses a custom-trained **PyTorch deep learning model** to instantly identify **41 different breeds of Indian cattle and buffalo**.
The project leverages a **MobileNetV3-Large** architecture and features a futuristic **HUD-style dashboard** with a secure login, analytics, and a dynamic breed information panel.

> *(Note: Replace the URL below with a link to your project screenshot)*
> ![Dashboard Preview]([https://github.com/zenxrm/cow-breed-detection-using-ai/blob/main/screenshots/home.png](https://github.com/zenxrm/cow-breed-detection-using-ai/blob/main/Screenshot%202025-10-30%20213520.png))

---

## ✨ Core Features

⚡ **Real-Time AI Classification**
Upload or drag-and-drop an image to get an instant breed prediction and confidence score.

📈 **Dynamic Results Panel**
The UI updates instantly to show:

* 🐂 **Breed Name** (e.g., "Gir", "Sahiwal")
* 📊 **Confidence Percentage Bar**
* 📘 **Detailed Breed Profile** (Origin, Milk Production, Temperament, etc.) pulled from a JSON database.

🔐 **Secure Login Portal**
A sleek, animated login page with a “show password” toggle and modern styling.

🖥️ **Full Dashboard UI**
A complete single-page application (SPA) with functional sections for:

* 📊 **Analytics** – Charts showing breed prediction stats
* 📜 **Logs** – Track and view past predictions
* 👤 **Profile** – Custom user dashboard

🎨 **Futuristic Design**
HUD-style theme with CSS animations, glowing borders, and a smooth dark-mode aesthetic.

---

## 🤖 The AI Model

The heart of this application is a **deep learning model** trained to solve a specific real-world problem — recognizing Indian cattle breeds.

**🧱 Architecture:**
Uses **MobileNetV3-Large**, a lightweight CNN architecture optimized for mobile and web deployment. It balances high accuracy with excellent speed.

**🧠 Training Method:**
Implemented **Transfer Learning** — starting from ImageNet-pretrained weights and fine-tuning on a **custom dataset of 41 Indian cattle breeds** for precise classification.

**⚙️ Custom Classifier Head:**
Replaced the original MobileNet head with a custom block containing:

* Fully Connected Layers
* Batch Normalization
* ReLU Activation
* Dropout Regularization

This ensures the model remains stable, efficient, and generalizes well to unseen images.

**📦 Final Model File:**
`indian_cattle_breed_classifier.pth` – A specialized model capable of high-accuracy multi-class breed identification.

---

## 🚀 Tech Stack

| Category     | Technologies Used                                  |
| ------------ | -------------------------------------------------- |
| **Frontend** | HTML5, CSS3, JavaScript (ES6+)                     |
| **Backend**  | Python, Flask                                      |
| **AI / ML**  | PyTorch, timm (PyTorch Image Models), Pillow (PIL) |
| **Database** | JSON (for class indices & breed info)              |

---

## 📸 Screenshots

*(Replace with your actual screenshots)*
![Login Page](https://github.com/zenxrm/cow-breed-detection-using-ai/blob/main/screenshots/login.png)
![Prediction Result](https://github.com/zenxrm/cow-breed-detection-using-ai/blob/main/screenshots/result.png)

---

## 🧑‍💻 Author

**Raghav Marwaha**
🔗 [GitHub](https://github.com/zenxrm) | 💼 AI & ML Enthusiast | 🧠 Deep Learning Explorer

---

## 🪪 License

This project is licensed under the [MIT License](LICENSE).

---

## 🌟 Show Your Support

If you liked this project, don’t forget to ⭐ **star** the repo and share it!
Your feedback and contributions are always welcome 🚀
