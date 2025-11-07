# Use a lightweight Python image
FROM python:3.10-slim

# Set working directory inside the container
WORKDIR /app

# Copy dependency file first (for caching)
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy all source files (including models and script)
COPY . .

# Expose ML server port
EXPOSE 8000

# Start FastAPI ML server
CMD ["python", "diseasePrediction.py"]
