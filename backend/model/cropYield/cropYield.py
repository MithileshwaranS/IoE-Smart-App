import pandas as pd
from catboost import CatBoostRegressor

# Load trained CatBoost model
model = CatBoostRegressor()
model.load_model("crop_yield_catboost.cbm")

# Create input data (1 row)
sample_input = pd.DataFrame({
    "state": ["bihar"],
    "district": ["patna"],
    "year": [2000],
    "season": ["kharif"],
    "crop": ["rice"],
    "area": [99073],
    "rainfall_mm": [229.5],
    "temperature_c": [29.5],
    "humidity": [78],
    "wind_speed": [3.5],
    "solar_radiation": [17],
    "soil_moisture": [0.605],
    "n_avg": [202.68],
    "p_avg": [21.54],
    "k_avg": [92]
})

# OPTIONAL but safe: ensure categorical columns are strings


# Predict
prediction = model.predict(sample_input)

print(f"Predicted Yield: {prediction[0]:.2f}")
