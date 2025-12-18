#!/usr/bin/env python3
import io
import torch
import timm
from PIL import Image
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import JSONResponse
from torchvision import transforms

# -------------------------------
# Minimal Crop Disease Prediction API - Rice + Corn
# -------------------------------

app = FastAPI(title="Crop Disease Prediction API - Minimal (Rice + Corn)")

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
CONF_THRESHOLD = 0.70  # 70% confidence threshold

# -------------------------------
# MODEL PATHS
# -------------------------------
RICE_WEIGHTS = "mobilevit_rice2.pth"
CORN_WEIGHTS = "mobilevit_corn1.pth"

# -------------------------------
# RICE MODEL
# -------------------------------
RICE_NUM_CLASSES = 6
RICE_MODEL = timm.create_model("mobilevit_xxs", pretrained=False, num_classes=RICE_NUM_CLASSES)
RICE_MODEL.load_state_dict(torch.load(RICE_WEIGHTS, map_location=DEVICE))
RICE_MODEL.to(DEVICE).eval()

RICE_CLASSES = [
    "Bacterial_leaf_blight",
    "Brown_spot",
    "Healthy",
    "Leaf_blast",
    "Leaf_scald",
    "Unclassified",
]

RICE_LABEL_MAP = {
    "Bacterial_leaf_blight": "Bacterial Leaf Blight",
    "Brown_spot": "Brown Spot",
    "Healthy": "Healthy Rice Leaf",
    "Leaf_blast": "Leaf Blast",
    "Leaf_scald": "Leaf Scald",
    "Unclassified": "Unclassified",
}

RICE_ADVICE = {
    "Bacterial Leaf Blight": {
        "description": "Yellow or white streaks from leaf tips.",
        "advice": "Use resistant seed, balanced nitrogen, and good drainage."
    },
    "Brown Spot": {
        "description": "Brown circular or oval spots on leaves.",
        "advice": "Balance nutrients and avoid drought stress."
    },
    "Healthy Rice Leaf": {
        "description": "No visible disease symptoms.",
        "advice": "Continue routine monitoring and field hygiene."
    },
    "Leaf Blast": {
        "description": "Spindle-shaped lesions with gray centers.",
        "advice": "Use resistant varieties; apply fungicide if spreading."
    },
    "Leaf Scald": {
        "description": "Lesions start at leaf tips under humid conditions.",
        "advice": "Improve airflow and avoid excess nitrogen."
    },
    "Unclassified": {
        "description": "Model is not confident about the disease class.",
        "advice": "Upload a clearer image or consult an agriculture expert."
    },
}

# -------------------------------
# CORN MODEL
# -------------------------------
CORN_NUM_CLASSES = 5
CORN_MODEL = timm.create_model("mobilevit_xxs", pretrained=False, num_classes=CORN_NUM_CLASSES)
CORN_MODEL.load_state_dict(torch.load(CORN_WEIGHTS, map_location=DEVICE))
CORN_MODEL.to(DEVICE).eval()

CORN_CLASSES = [
    "Corn_Blight",
    "Common_Rust",
    "Gray_Leaf_Spot",
    "Healthy",
    "Unclassified",
]

CORN_ADVICE = {
    "Corn_Blight": {
        "description": "Yellow streaks and water-soaked lesions on leaves.",
        "advice": "Use clean seeds and rotate crops. Avoid overhead irrigation."
    },
    "Common_Rust": {
        "description": "Reddish-brown raised pustules on leaves.",
        "advice": "Use resistant hybrids; apply fungicide if severe."
    },
    "Gray_Leaf_Spot": {
        "description": "Gray rectangular lesions between veins.",
        "advice": "Rotate crops, improve airflow, apply fungicide if needed."
    },
    "Healthy": {
        "description": "Leaf appears normal without disease symptoms.",
        "advice": "Maintain standard field care and monitoring."
    },
    "Unclassified": {
        "description": "Model cannot confidently identify the disease.",
        "advice": "Capture a clearer image from a different angle."
    },
}

# -------------------------------
# IMAGE TRANSFORM
# -------------------------------
TRANSFORM = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
])

def preprocess_image_bytes(img_bytes: bytes):
    return (
        TRANSFORM(Image.open(io.BytesIO(img_bytes)).convert("RGB"))
        .unsqueeze(0)
        .to(DEVICE)
    )

# -------------------------------
# PREDICT ENDPOINT
# -------------------------------
@app.post("/predict")
async def predict(
    image: UploadFile = File(...),
    cropType: str = Form(...),
):
    try:
        crop = cropType.strip().lower()
        content = await image.read()

        if not content:
            return JSONResponse(status_code=400, content={"success": False, "error": "Empty image file."})

        inp = preprocess_image_bytes(content)

        # ---------- RICE ----------
        if crop == "rice":
            with torch.no_grad():
                logits = RICE_MODEL(inp)
                probs = torch.softmax(logits, dim=1).cpu().numpy()[0]

            idx = int(probs.argmax())
            conf = float(probs[idx])

            if conf < CONF_THRESHOLD:
                label = "Unclassified"
            else:
                label = RICE_CLASSES[idx]

            advice_key = RICE_LABEL_MAP[label]
            info = RICE_ADVICE[advice_key]

        # ---------- CORN ----------
        elif crop == "corn":
            with torch.no_grad():
                logits = CORN_MODEL(inp)
                probs = torch.softmax(logits, dim=1).cpu().numpy()[0]

            idx = int(probs.argmax())
            conf = float(probs[idx])

            if conf < CONF_THRESHOLD:
                label = "Unclassified"
            else:
                label = CORN_CLASSES[idx]

            info = CORN_ADVICE[label]

        else:
            return JSONResponse(
                status_code=400,
                content={"success": False, "error": "Unsupported cropType. Use 'rice' or 'corn'."},
            )

        return {
            "success": True,
            "crop": crop,
            "disease": label,
            "confidence": conf,
            "description": info["description"],
            "treatment": info["advice"],
        }

    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

# -------------------------------
# RUN
# -------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001, log_level="info")
