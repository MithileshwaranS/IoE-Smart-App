#!/usr/bin/env python3
import os
import io
import torch
import timm
import uvicorn
from PIL import Image
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import JSONResponse
from torchvision import transforms
from typing import Optional, List

# -------------------------------
# App
# -------------------------------
app = FastAPI(title="Crop Disease Prediction API")

# -------------------------------
# Device
# -------------------------------
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# -------------------------------
# EXACT class orders (must match what you want the API to return)
# Keep these human-friendly labels in the exact order you expect the model outputs to map to.
RICE_CLASSES = [
    "Bacterial Leaf Blight",
    "Brown Spot",
    "Healthy Rice Leaf",
    "Leaf Blast",
    "Leaf Scald",
    "Unclassified",
]

CORN_CLASSES = [
    "Bacterial Leaf Streak",
    "Common_Rust",
    "Gray_Leaf_Spot",
    "Maize Chlorotic Mottle Virus",
    "Healthy",
    "Unclassified",
]

# -------------------------------
# Concise advice (keys match labels 1:1)
RICE_ADVICE = {
    "Bacterial Leaf Blight": {"description": "Yellow/white streaks from leaf tips.", "advice": "Use resistant seed, balanced N, good drainage."},
    "Brown Spot": {"description": "Brown circular/oval spots.", "advice": "Balance nutrients; avoid drought stress."},
    "Healthy Rice Leaf": {"description": "No visible disease.", "advice": "Maintain spacing; routine scouting."},
    "Leaf Blast": {"description": "Spindle lesions with gray centers.", "advice": "Resistant variety; early fungicide if spreading."},
    "Leaf Scald": {"description": "Tip lesions worsen in humidity.", "advice": "Improve airflow; avoid excess N."},
    "Unclassified": {
        "description": "Model unable to confidently map to known disease classes.",
        "advice": "Try another photo (different angle/lighting). Consider sending multiple images or consult an expert for lab testing.",
    },
}

CORN_ADVICE = {
    "Bacterial Leaf Streak": {"description": "Water-soaked streaks with yellow halos.", "advice": "Use clean seed; rotate crops; avoid overhead irrigation."},
    "Common_Rust": {"description": "Reddish-brown pustules on leaves.", "advice": "Resistant hybrids; fungicide if severe."},
    "Gray_Leaf_Spot": {"description": "Gray rectangular lesions between veins.", "advice": "Rotate crops; manage residue; fungicide if progressing."},
    "Maize Chlorotic Mottle Virus": {"description": "Yellow mottling; stunting.", "advice": "Control insect vectors; remove infected plants."},
    "Healthy": {"description": "No visible disease.", "advice": "Continue standard field hygiene and monitoring."},
    "Unclassified": {
        "description": "Model unable to confidently map to known disease classes.",
        "advice": "Try another photo (different angle/lighting). Consider sending multiple images or consult an expert for lab testing.",
    },
}

# -------------------------------
# Model registry: adjust weights paths as needed
CROP_MODELS = {
    "rice": {"weights": "mobilevit_rice2.pth", "classes": RICE_CLASSES, "advice": RICE_ADVICE},
    "corn": {"weights": "mobilevit_corn1.pth", "classes": CORN_CLASSES, "advice": CORN_ADVICE},
}

# -------------------------------
# Preprocessing - NOTE: use same mean/std as training
# Typical ImageNet mean/std (change if your training used different stats)
preprocess_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
])


def preprocess_image(pil_img: Image.Image) -> torch.Tensor:
    return preprocess_transform(pil_img.convert("RGB")).unsqueeze(0).to(DEVICE)


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

# -------------------------------
# Utility: find classifier weight key in checkpoint
def find_classifier_weight_key(state_dict):
    """
    Return (weight_key, bias_key, num_classes, feature_dim) if found, else (None, None, None, None).
    Searches common keys then falls back to scanning for a 2D weight + bias pair.
    """
    candidates = [
        "head.fc.weight",
        "head.weight",
        "fc.weight",
        "classifier.weight",
        "head.classifier.weight",
        "model.fc.weight",
        "classifier.1.weight",
    ]
    for k in candidates:
        if k in state_dict:
            w = state_dict[k]
            if hasattr(w, "dim") and w.dim() == 2:
                b_key = k.replace("weight", "bias")
                b_present = b_key in state_dict
                return k, (b_key if b_present else None), w.shape[0], w.shape[1]

    # Generic scan fallback: find any 2D weight with a matching bias key
    for k, v in state_dict.items():
        if "weight" in k and hasattr(v, "dim") and v.dim() == 2:
            b_key = k.replace("weight", "bias")
            if b_key in state_dict and hasattr(state_dict[b_key], "dim"):
                return k, b_key, v.shape[0], v.shape[1]
    return None, None, None, None

# -------------------------------
# Load models ONCE during app startup
@app.on_event("startup")
async def load_all_models():
    global LOADED_MODELS
    print("Loading models at startup...")

    for crop, cfg in CROP_MODELS.items():
        weights_path = cfg["weights"]
        desired_classes = cfg["classes"]
        print(f"→ Loading {crop} model from '{weights_path}' ... (desired classes = {len(desired_classes)})")

        if not os.path.isfile(weights_path):
            raise FileNotFoundError(f"Weights file for '{crop}' not found at: {weights_path}")

        # load checkpoint (could be state_dict or dict containing 'state_dict')
        ckpt = torch.load(weights_path, map_location="cpu")

        if isinstance(ckpt, dict) and "state_dict" in ckpt and isinstance(ckpt["state_dict"], dict):
            state = ckpt["state_dict"]
        elif isinstance(ckpt, dict) and all(isinstance(v, torch.Tensor) for v in ckpt.values()):
            state = ckpt
        else:
            # sometimes checkpoints contain nested model keys, try to extract the largest tensor map
            raise ValueError(f"Unexpected checkpoint format for '{weights_path}'. Expected state_dict-like dict.")

        # Remove DataParallel prefix if present
        if any(k.startswith("module.") for k in list(state.keys())):
            state = {k.replace("module.", "", 1): v for k, v in state.items()}

        # find classifier weight key info
        weight_key, bias_key, checkpoint_num_classes, feat_dim = find_classifier_weight_key(state)
        if weight_key is None:
            raise ValueError(f"Could not determine classifier size from checkpoint '{weights_path}'. Keys found: {list(state.keys())[:20]}...")

        print(f"Detected checkpoint classifier key '{weight_key}' with {checkpoint_num_classes} classes (feature dim {feat_dim}).")

        # Create model with desired number of classes
        num_desired = len(desired_classes)
        model = timm.create_model("mobilevit_xxs", pretrained=False, num_classes=num_desired)

        # Acquire model state_dict for shapes/keys
        model_state = model.state_dict()

        # Helper to determine model classifier keys (prefer checkpoint key if exists in model_state)
        if weight_key in model_state:
            model_weight_key = weight_key
        else:
            # fallback: find first 2D weight in model_state (likely classifier)
            model_weight_key = None
            for k, v in model_state.items():
                if "weight" in k and hasattr(v, "dim") and v.dim() == 2:
                    model_weight_key = k
                    break
            if model_weight_key is None:
                raise RuntimeError("Could not find classifier weight key in model state_dict to adapt head.")

        bias_key_model = model_weight_key.replace("weight", "bias")
        model_w = model_state[model_weight_key]
        model_b = model_state[bias_key_model] if bias_key_model in model_state else None

        # Now adapt/load depending on checkpoint vs desired class counts
        ckpt_w = state[weight_key]
        ckpt_b = state[bias_key] if (bias_key in state and state[bias_key].ndim == 1) else None

        # Ensure feature dims match
        if ckpt_w.shape[1] != model_w.shape[1]:
            raise RuntimeError(f"Checkpoint head feature-dim ({ckpt_w.shape[1]}) != model head feature-dim ({model_w.shape[1]}). Can't adapt automatically.")

        # Build a load-state dict starting from model_state (so all keys exist) and then override with adapted head
        load_state = model_state.copy()

        if checkpoint_num_classes is not None and checkpoint_num_classes < num_desired:
            # copy checkpoint rows into the first rows of model classifier, keep rest as model init
            print(f"[INFO] Adapting checkpoint head: checkpoint classes={checkpoint_num_classes} < desired={num_desired}.")
            new_w = model_w.clone()  # model init
            new_w[: ckpt_w.shape[0], :] = ckpt_w.clone().to(new_w.device)
            load_state[model_weight_key] = new_w

            if model_b is not None:
                new_b = model_b.clone()
                if ckpt_b is not None:
                    new_b[: ckpt_b.shape[0]] = ckpt_b.clone().to(new_b.device)
                load_state[bias_key_model] = new_b
            elif ckpt_b is not None:
                # model has no bias but ckpt does — ignore ckpt bias
                pass

            # keep other model parameters as-is (backbone etc)
            try:
                model.load_state_dict(load_state)
                print(f"[OK] Adapted checkpoint head and loaded into model for '{crop}'.")
            except RuntimeError as e:
                print(f"[WARN] Adapted load failed with RuntimeError: {e}. Trying non-strict load (strict=False).")
                model.load_state_dict(load_state, strict=False)

        elif checkpoint_num_classes is not None and checkpoint_num_classes == num_desired:
            # same class count — try direct load
            print(f"[INFO] Checkpoint classes match desired ({num_desired}). Attempting direct load.")
            try:
                model.load_state_dict(state)
                print(f"[OK] Strict load succeeded for '{crop}'.")
            except RuntimeError as e:
                print(f"[WARN] Strict load failed: {e}. Trying strict=False.")
                model.load_state_dict(state, strict=False)

        else:
            # checkpoint has more classes or unknown — best-effort non-strict load
            if checkpoint_num_classes is not None and checkpoint_num_classes > num_desired:
                print(f"[WARN] Checkpoint has {checkpoint_num_classes} classes but desired model has {num_desired}. Loading with strict=False (this will ignore mismatched params).")
            try:
                model.load_state_dict(state, strict=False)
                print(f"[INFO] Loaded checkpoint into model for '{crop}' with strict=False.")
            except Exception as e:
                raise RuntimeError(f"Failed to load checkpoint for '{crop}': {e}")

        model = model.to(DEVICE).eval()
        LOADED_MODELS[crop] = {"model": model, "classes": desired_classes, "advice": cfg["advice"]}
        print(f"→ Model for '{crop}' ready. Using {len(desired_classes)} classes (labels preserved as provided).")

    print("✅ All models loaded successfully!")

# -------------------------------
# Prediction endpoint
# -------------------------------
@app.post("/predict")
async def predict(
    image: UploadFile = File(...),
    cropType: str = Form(...),
    threshold: Optional[float] = Form(0.70),
    top_k: Optional[int] = Form(1),
):
    """
    Predict disease from uploaded image.

    - threshold: float between 0 and 1. If top prediction confidence < threshold, returns 'Unclassified'.
    - top_k: number of top predictions to return (1 returns single best). Maximum will be clamped to number of classes.
    """
    try:
        crop = cropType.strip().lower()
        if crop not in LOADED_MODELS:
            return JSONResponse(status_code=400, content={"success": False, "error": f"Unsupported crop type '{crop}'. Choose from: {list(LOADED_MODELS.keys())}"})

        model_info = LOADED_MODELS[crop]
        model = model_info["model"]
        CLASSES: List[str] = model_info["classes"]
        advice_dict = model_info["advice"]

        if model is None:
            return JSONResponse(status_code=500, content={"success": False, "error": f"Model for '{crop}' failed to load on server. Check server logs."})

        # Read and validate upload
        data = await image.read()
        if not data:
            return JSONResponse(status_code=400, content={"success": False, "error": "Empty file uploaded."})

        try:
            pil_img = Image.open(io.BytesIO(data)).convert("RGB")
        except Exception as e:
            return JSONResponse(status_code=400, content={"success": False, "error": f"Unable to open image file: {e}"})

        # Preprocess and infer
        with torch.no_grad():
            inp = preprocess_image(pil_img)
            output = model(inp)

            # handle some timm variants that return dicts
            if isinstance(output, dict) and "logits" in output:
                logits = output["logits"]
            else:
                logits = output

            # ensure logits shape is (N, C)
            if logits.ndim == 1:
                logits = logits.unsqueeze(0)

            probs_tensor = torch.softmax(logits, dim=1).cpu()
            probs = probs_tensor.numpy()[0]

            # clamp top_k
            k = max(1, int(top_k))
            k = min(k, len(CLASSES))

            # indices sorted by probability desc
            topk_idx = probs.argsort()[::-1][:k]
            topk = [(CLASSES[int(i)], float(probs[int(i)])) for i in topk_idx]

            # primary prediction is first entry
            primary_label, primary_conf = topk[0]

            # If confidence < threshold -> Unclassified (use label if 'Unclassified' exists else 'Unclassified')
            if primary_conf < float(threshold):
                predicted_class = "Unclassified"
                confidence = primary_conf
            else:
                predicted_class = primary_label
                confidence = primary_conf

        # prepare probabilities map (label -> prob)
        probs_map = {label: float(probs[idx]) for idx, label in enumerate(CLASSES)}

        info = get_advice_safe(advice_dict, predicted_class)

        return {
            "success": True,
            "crop": crop,
            "confidence": confidence,
            "disease": predicted_class,
            "description": info.get("description", ""),
            "treatment": info.get("advice", ""),
            "top_k": topk,
            "probabilities": probs_map,
        }

    except Exception as e:
        # server error
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

# -------------------------------
# Run with uvicorn when executed directly
# -------------------------------
if __name__ == "__main__":
    # Example: python disease_prediction.py
    uvicorn.run(app, host="0.0.0.0", port=8001, log_level="info")
