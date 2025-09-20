# IOE Smart App - Agricultural IoT System

A modern agricultural IoT application for crop monitoring, disease prediction, and water management.

## Features

- **Disease Prediction**: AI-powered crop disease detection with image upload
- **Crop Prediction**: Yield forecasting based on environmental data
- **Sensor Readings**: Real-time environmental monitoring
- **Water Management**: Level monitoring and irrigation control
- **Responsive Design**: Works on mobile, tablet, and desktop

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- Python ML server running on another machine (optional for testing)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server and backend:
```bash
npm run dev:full
```

Or run them separately:
```bash
# Terminal 1 - Backend server
npm run server

# Terminal 2 - Frontend development server
npm run dev
```

### Backend API

The Node.js backend runs on `http://localhost:3001` and provides:

- `POST /api/predict` - Disease prediction endpoint
- `GET /api/health` - Health check endpoint

### Python ML Server Configuration

Update the Python server URL in `server.js`:
```javascript
const pythonServerUrl = 'http://192.168.1.50:5000/predict';
```

Expected Python server response format:
```json
{
  "disease": "Powdery Mildew",
  "treatment": "Use fungicide spray with sulfur",
  "confidence": 0.92
}
```

### Usage

1. Navigate to the Disease Prediction page
2. Upload an image or take a photo of your crop
3. Click "Analyze Image" to get AI-powered disease detection
4. View results including disease type, confidence level, and treatment recommendations

## Technology Stack

- **Frontend**: React, Tailwind CSS, Framer Motion
- **Backend**: Node.js, Express, Multer
- **Image Processing**: FormData, File API
- **Icons**: Lucide React