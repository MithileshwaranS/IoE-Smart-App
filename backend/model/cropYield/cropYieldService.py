#!/usr/bin/env python3
import os
import pandas as pd
from catboost import CatBoostRegressor
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import uvicorn

# -------------------------------
# App
# -------------------------------
app = FastAPI(title="Crop Yield Prediction API")

# -------------------------------
# Model Loading
# -------------------------------
MODEL_PATH = os.path.join(os.path.dirname(__file__), "crop_yield_catboost.cbm")
model = None

def load_model():
    global model
    if model is None:
        try:
            model = CatBoostRegressor()
            model.load_model(MODEL_PATH)
            print(f"✅ Crop yield model loaded from {MODEL_PATH}")
        except Exception as e:
            print(f"❌ Error loading model: {e}")
            raise
    return model

# Load model on startup
@app.on_event("startup")
async def startup_event():
    load_model()

# -------------------------------
# Request Model
# -------------------------------
class CropYieldRequest(BaseModel):
    state: str
    district: str
    year: int
    season: str
    crop: str
    area: float
    rainfall_mm: float
    temperature_c: float
    humidity: float
    wind_speed: float
    solar_radiation: float
    soil_moisture: float
    n_avg: float
    p_avg: float
    k_avg: float

# -------------------------------
# Prediction endpoint
# -------------------------------
@app.post("/predict")
async def predict_yield(request: CropYieldRequest):
    """
    Predict crop yield based on input parameters.
    """
    try:
        # Ensure model is loaded
        model = load_model()
        
        # Normalize inputs (lowercase for categorical fields)
        input_data = pd.DataFrame({
            "state": [request.state.lower().strip()],
            "district": [request.district.lower().strip()],
            "year": [request.year],
            "season": [request.season.lower().strip()],
            "crop": [request.crop.lower().strip()],
            "area": [request.area],
            "rainfall_mm": [request.rainfall_mm],
            "temperature_c": [request.temperature_c],
            "humidity": [request.humidity],
            "wind_speed": [request.wind_speed],
            "solar_radiation": [request.solar_radiation],
            "soil_moisture": [request.soil_moisture],
            "n_avg": [request.n_avg],
            "p_avg": [request.p_avg],
            "k_avg": [request.k_avg]
        })
        
        # Make prediction
        prediction = model.predict(input_data)
        predicted_yield = float(prediction[0])
        
        return {
            "success": True,
            "predicted_yield": predicted_yield,
            "yield_unit": "tons/hectare",
            "formatted_yield": f"{predicted_yield:.2f} tons/hectare"
        }
        
    except Exception as e:
        print(f"Error in prediction: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": str(e)
            }
        )

# -------------------------------
# Health check endpoint
# -------------------------------
@app.get("/health")
async def health():
    return {"status": "ok", "model_loaded": model is not None}

# -------------------------------
# Run with uvicorn when executed directly
# -------------------------------
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8002)

