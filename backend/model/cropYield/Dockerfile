# Use a lightweight Python image
FROM python:3.10-slim

# Set working directory inside the container
WORKDIR /app

# Copy dependency file first (for caching)
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy all source files (including model and script)
COPY . .

# Expose Crop Yield API port
EXPOSE 8002

# Start FastAPI Crop Yield server
CMD ["python", "cropYieldService.py"]
