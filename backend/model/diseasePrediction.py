#!/usr/bin/env python3
import os
import uvicorn
import io
import torch
import timm
import numpy as np
from torchvision import transforms
from PIL import Image
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import JSONResponse

# -------------------------------
# App
app = FastAPI(title="Crop Disease Prediction API")

# -------------------------------
# Device
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# -------------------------------
# EXACT class orders (must match training)
RICE_CLASSES = [
    "Bacterial Leaf Blight",
    "Brown Spot",
    "Healthy Rice Leaf",
    "Leaf Blast",
    "Leaf Scald",
    "Sheath Blight",
]

CORN_CLASSES = [
    "Bacterial Leaf Streak",
    "Common_Rust",
    "Gray_Leaf_Spot",
    "Maize Chlorotic Mottle Virus",
    "Healthy",
]

# -------------------------------
# Concise advice (keys match labels 1:1)
RICE_ADVICE = {
    "Bacterial Leaf Blight": {"description": "Yellow/white streaks from leaf tips.", "advice": "Use resistant seed, balanced N, good drainage."},
    "Brown Spot": {"description": "Brown circular/oval spots.", "advice": "Balance nutrients; avoid drought stress."},
    "Healthy Rice Leaf": {"description": "No visible disease.", "advice": "Maintain spacing; routine scouting."},
    "Leaf Blast": {"description": "Spindle lesions with gray centers.", "advice": "Resistant variety; early fungicide if spreading."},
    "Leaf Scald": {"description": "Tip lesions worsen in humidity.", "advice": "Improve airflow; avoid excess N."},
    "Sheath Blight": {"description": "Elliptical sheath lesions in dense canopy.", "advice": "Reduce density; fungicide at onset if needed."},
}

CORN_ADVICE = {
    "Bacterial Leaf Streak": {"description": "Water-soaked streaks with yellow halos.", "advice": "Use clean seed; rotate crops; avoid overhead irrigation."},
    "Common_Rust": {"description": "Reddish-brown pustules on leaves.", "advice": "Resistant hybrids; fungicide if severe."},
    "Gray_Leaf_Spot": {"description": "Gray rectangular lesions between veins.", "advice": "Rotate crops; manage residue; fungicide if progressing."},
    "Maize Chlorotic Mottle Virus": {"description": "Yellow mottling; stunting.", "advice": "Control insect vectors; remove infected plants."},
    "Healthy": {"description": "No visible disease.", "advice": "Continue standard field hygiene and monitoring."},
}

# -------------------------------
# Model metadata registry (adjust paths if needed)
CROP_MODELS = {
    "rice": {"weights": "mobilevit_rice.pth", "classes": RICE_CLASSES, "advice": RICE_ADVICE},
    "corn": {"weights": "mobilevit_corn.pth", "classes": CORN_CLASSES, "advice": CORN_ADVICE},
}

# -------------------------------
# Preprocessing

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
])

def preprocess_image(pil_img: Image.Image) -> torch.Tensor:
    return transform(pil_img.convert("RGB")).unsqueeze(0).to(DEVICE)

def get_advice_safe(advice_dict, label):
    if label in advice_dict:
        return advice_dict[label]
    norm = label.replace("_", " ").strip().lower()
    for k in advice_dict:
        if k.replace("_", " ").strip().lower() == norm:
            return advice_dict[k]
    return {"description": "—", "advice": "—"}

# -------------------------------
# GLOBAL model storage
LOADED_MODELS = {}

# Load models ONCE during app startup
@app.on_event("startup")
async def load_all_models():
    global LOADED_MODELS
    print("Loading models at startup...")

    for crop, cfg in CROP_MODELS.items():
        weights_path = cfg["weights"]
        print(f"→ Loading {crop} model from '{weights_path}' ...")

        if not os.path.isfile(weights_path):
            raise FileNotFoundError(f"Weights file for '{crop}' not found at: {weights_path}")

        # create model (same architecture used during training)
        model = timm.create_model("mobilevit_xxs", pretrained=False, num_classes=len(cfg["classes"]))

        # load state safely (support plain state_dict or {'state_dict': ...} formats)
        state = torch.load(weights_path, map_location=DEVICE)
        if isinstance(state, dict) and "state_dict" in state and isinstance(state["state_dict"], dict):
            state = state["state_dict"]

        if isinstance(state, dict):
            # remove common DataParallel prefix if present
            if any(k.startswith("module.") for k in state.keys()):
                state = {k.replace("module.", "", 1): v for k, v in state.items()}

            model.load_state_dict(state)
        else:
            raise ValueError(f"Unexpected checkpoint format for '{weights_path}'")

        model = model.to(DEVICE).eval()
        LOADED_MODELS[crop] = {"model": model, "classes": cfg["classes"], "advice": cfg["advice"]}

    print("✅ All models loaded successfully!")

# -------------------------------
# Prediction endpoint
@app.post("/predict")
async def predict(image: UploadFile = File(...), cropType: str = Form(...)):
    try:
        crop = cropType.lower()
        if crop not in LOADED_MODELS:
            raise ValueError(f"Unsupported crop type '{crop}'. Choose from: {list(LOADED_MODELS.keys())}")

        model_info = LOADED_MODELS[crop]
        model = model_info["model"]
        CLASSES = model_info["classes"]
        advice_dict = model_info["advice"]

        data = await image.read()
        pil_img = Image.open(io.BytesIO(data)).convert("RGB")
        print(f"Received image: {image.filename}, Crop: {crop}")

        with torch.no_grad():
            inp = preprocess_image(pil_img)
            logits = model(inp)
            probs = torch.softmax(logits, dim=1).cpu().numpy()[0]
            idx = int(np.argmax(probs))
            predicted_class = CLASSES[idx]
            confidence = float(probs[idx])

        info = get_advice_safe(advice_dict, predicted_class)

        return {
            "success": True,
            "crop": crop,
            "confidence": confidence,
            "disease": predicted_class,
            "description": info["description"],
            "treatment": info["advice"],
        }

    except Exception as e:
        return JSONResponse(status_code=400, content={"success": False, "error": str(e)})

# -------------------------------
# Run with uvicorn when executed directly
if __name__ == "__main__":

    uvicorn.run("diseasePrediction:app", host="0.0.0.0", port=8000, log_level="info")

