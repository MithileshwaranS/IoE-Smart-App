FROM python:3.10-slim

WORKDIR /app

# Copy requirements
COPY requirements.txt .

# Install all dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy server code
COPY . .

# Expose Flask-SocketIO port
EXPOSE 8000

CMD ["python", "geofence_server.py"]
