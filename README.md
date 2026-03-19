# IoE Smart Agriculture Platform

![Node.js](https://img.shields.io/badge/Node.js-20-green)
![React](https://img.shields.io/badge/React-18-blue)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E)
![Solidity](https://img.shields.io/badge/Solidity-0.8.21-363636)
![Python](https://img.shields.io/badge/Python-3.10+-yellow)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED)

A full-stack Internet of Everything (IoE) platform for smart agriculture — combining real-time IoT sensor monitoring, ML-based crop disease and yield prediction, geofence GPS tracking, a live auction marketplace, and blockchain-verified sales on the Ethereum Sepolia testnet.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Prerequisites](#prerequisites)
5. [Project Structure](#project-structure)
6. [Environment Variables](#environment-variables)
7. [Manual Setup (Development)](#manual-setup-development)
   - [1. Clone the Repository](#1-clone-the-repository)
   - [2. Backend Setup](#2-backend-setup)
   - [3. Frontend Setup](#3-frontend-setup)
   - [4. ML Service — Crop Disease Prediction](#4-ml-service--crop-disease-prediction)
   - [5. ML Service — Crop Yield Prediction](#5-ml-service--crop-yield-prediction)
   - [6. Geofence Server](#6-geofence-server)
8. [Docker Setup (Production)](#docker-setup-production)
9. [Database Setup (Supabase)](#database-setup-supabase)
10. [Blockchain Setup](#blockchain-setup)
11. [Available Scripts](#available-scripts)
12. [Service Ports Reference](#service-ports-reference)
13. [API Endpoints Reference](#api-endpoints-reference)
14. [Features Overview](#features-overview)
15. [Troubleshooting](#troubleshooting)

---

## Overview

The IoE Smart Agriculture Platform is a multi-service system designed to help farmers and buyers interact through a technology-driven agricultural ecosystem. Key capabilities include:

- **IoT Sensor Monitoring** — Live readings from field sensors (temperature, humidity, soil moisture, water level) via MQTT
- **Crop Disease Prediction** — Upload crop images and get AI-powered disease diagnosis (PyTorch CNN model)
- **Crop Yield Prediction** — Predict seasonal yields based on environmental parameters (FastAPI + ML model)
- **Geofence & GPS Tracking** — Draw geofence zones on a map and track live GPS positions (Flask + Socket.IO)
- **Live Auction Marketplace** — Real-time crop auctions with WebSocket-powered live bidding
- **Blockchain Sales** — Create and verify crop sales on the Ethereum Sepolia testnet using MetaMask
- **Water Control** — Remote water pump control based on sensor thresholds
- **Role-Based Access** — Separate dashboards and features for `farmer` and `buyer` roles

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser / Client                         │
│              React 18 + Vite (Port 5173 dev / 80 prod)          │
│   Tailwind CSS · Framer Motion · Leaflet Maps · ethers.js v6    │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP / WebSocket
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Node.js / Express Backend (Port 3001)           │
│        REST API · JWT Auth · WebSocket (live auctions)          │
│                  Supabase Client · Multer uploads                │
└───┬──────────────┬──────────────┬───────────────────────────────┘
    │ HTTP         │ HTTP         │ HTTP
    ▼              ▼              ▼
┌─────────┐  ┌──────────┐  ┌──────────────────┐
│ FastAPI  │  │ FastAPI  │  │  Flask + SocketIO │
│ Crop     │  │ Crop     │  │  Geofence Server  │
│ Disease  │  │ Yield    │  │  (Port 8000)      │
│ (8001)   │  │ (8002)   │  └──────────────────┘
└─────────┘  └──────────┘
                                    │
┌───────────────────────────────────▼─────────────────────────────┐
│                         Supabase                                 │
│              PostgreSQL · Auth · Storage · Realtime             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     MQTT Broker (Port 1883)                      │
│              IoT Sensors → sensor topics → Backend              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│               Ethereum Sepolia Testnet                           │
│    PredictionRecord Contract · MetaMask · ethers.js v6          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, TailwindCSS, Framer Motion, React Router v7 |
| **UI Components** | lucide-react, react-hot-toast, Chart.js, react-chartjs-2 |
| **Maps** | Leaflet, react-leaflet, @turf/turf |
| **Backend** | Node.js 20, Express.js |
| **Authentication** | JWT (jsonwebtoken), bcrypt |
| **Database** | Supabase (PostgreSQL) |
| **File Uploads** | Multer |
| **Real-time** | WebSockets (ws), MQTT |
| **ML — Disease** | FastAPI, PyTorch, Pillow |
| **ML — Yield** | FastAPI, scikit-learn / pandas |
| **Geofence** | Flask, Flask-SocketIO, SQLite |
| **Blockchain** | Solidity 0.8.21, ethers.js v6, Ethereum Sepolia |
| **Containerisation** | Docker, Docker Compose, Nginx |

---

## Prerequisites

Install the following before setting up the project:

| Tool | Version | Install |
|---|---|---|
| **Node.js** | 20.x LTS | https://nodejs.org |
| **npm** | 10.x (bundled with Node) | — |
| **Python** | 3.10 or later | https://python.org |
| **Git** | Latest | https://git-scm.com |
| **Docker** | Latest | https://docs.docker.com/get-docker/ |
| **Docker Compose** | v2 (bundled with Docker Desktop) | — |
| **MetaMask** | Browser Extension | https://metamask.io |

Verify your installations:

```bash
node --version          # v20.x.x
npm --version           # 10.x.x
python3 --version       # Python 3.10.x or later
docker --version        # Docker 25.x or later
docker compose version  # Docker Compose version v2.x
git --version
```

---

## Project Structure

```
IoE-Smart-Agriculture/
├── docker-compose.yml              # Orchestrates all services
│
├── frontend/                       # React 18 + Vite application
│   ├── Dockerfile                  # Multi-stage: build → nginx
│   ├── nginx.conf                  # SPA routing fallback
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── src/
│       ├── App.jsx                 # Router and all route definitions
│       ├── main.jsx                # Vite entry point
│       ├── blockchain/
│       │   ├── blockchain.js       # ethers.js: connectWallet, getContract
│       │   └── PredictionRecord.json  # Compiled contract ABI
│       ├── components/
│       │   ├── Layout.jsx          # Sidebar navigation (role-based)
│       │   ├── ProtectedRoute.jsx
│       │   ├── WalletConnect.jsx
│       │   ├── SalesList.jsx
│       │   ├── CreateSale.jsx
│       │   ├── PlaceBid.jsx
│       │   ├── ConfirmSale.jsx
│       │   ├── GeofenceEditor.jsx
│       │   ├── GpsStatusPanel.jsx
│       │   └── MarketplaceCard.jsx
│       ├── context/
│       │   └── AuthContext.jsx     # useAuth(), user.role, getToken()
│       ├── pages/
│       │   ├── Home.jsx
│       │   ├── Login.jsx
│       │   ├── Marketplace.jsx
│       │   ├── AuctionListing.jsx
│       │   ├── AuctionDetails.jsx
│       │   ├── AuctionManagement.jsx
│       │   ├── BlockchainSales.jsx
│       │   ├── BuyerDashboard.jsx
│       │   ├── CropDiseasePrediction.jsx
│       │   ├── CropPrediction.jsx
│       │   ├── GeofencePage.jsx
│       │   ├── SensorReadings.jsx
│       │   ├── WaterControl.jsx
│       │   └── WaterLevel.jsx
│       └── utils/
│           ├── apiConfig.js            # Dynamic API base URL
│           └── auctionWebSocket.js     # WS client for live bidding
│
├── backend/                        # Node.js + Express API
│   ├── Dockerfile
│   ├── server.js                   # Entry point
│   ├── supabase.js                 # Supabase client singleton
│   ├── package.json
│   ├── routes/
│   │   ├── auctionRoutes.js
│   │   └── bidRoutes.js
│   ├── services/
│   │   └── auctionWebSocketManager.js  # WS room management
│   ├── schema/
│   │   └── auction_schema.sql      # Run this in Supabase SQL editor
│   └── model/
│       ├── cropDisease/            # FastAPI crop disease service
│       └── cropYield/              # FastAPI crop yield service
│
├── IotBroker/                      # MQTT broker configuration
├── data_preprocessing/             # Data cleaning / preprocessing scripts
│
├── PredictionRecord.sol            # Solidity smart contract source
└── PredictionRecord.json           # Contract ABI (Hardhat artifact)
```

---

## Environment Variables

### Backend — `backend/.env`

Create this file at `backend/.env`:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# Server
PORT=3001

# MQTT Broker (IoT sensors)
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_HOST=localhost
MQTT_PORT=1883

# ML Microservice URLs
# Use localhost for dev; use Docker service names when running via docker compose
ML_SERVER_URL=http://localhost:8001
YIELD_SERVER_URL=http://localhost:8002
GEOFENCE_SERVER_URL=http://localhost:8000
FLASK_SERVER_URL=http://localhost:8000
```

> **Docker Compose note:** When running via `docker compose up`, change the ML URLs to use Docker service names:
> `ML_SERVER_URL=http://mlserver:8001`
> `YIELD_SERVER_URL=http://cropprediction:8002`
> `GEOFENCE_SERVER_URL=http://geofence:8000`

---

### Frontend — `frontend/.env`

Create this file at `frontend/.env`:

```env
# Supabase (same project as backend)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Backend API (dev)
VITE_API_BASE_URL=http://localhost:3001

# WebSocket (dev)
VITE_WS_BASE_URL=ws://localhost:3001
```

> **Note:** For Docker/production, `VITE_API_BASE_URL` should point to the backend container host. The `apiConfig.js` utility automatically uses `window.location.hostname` at runtime when the env var is not set, which works correctly for production deployments.

---

## Manual Setup (Development)

Use this approach for local development with hot-reload on code changes.

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd IoE-Smart-Agriculture
```

---

### 2. Backend Setup

```bash
# Navigate to backend
cd backend

# Install Node.js dependencies
npm install

# Create your environment file and fill in your values
cp .env.example .env
# (or create backend/.env manually — see Environment Variables section above)

# Start the backend server
node server.js
```

The backend starts on **http://localhost:3001**.

Expected output:

```
Server running on port 3001
Supabase connected
MQTT client connected
WebSocket server ready
```

---

### 3. Frontend Setup

Open a **new terminal tab**:

```bash
# Navigate to frontend
cd frontend

# Install Node.js dependencies
npm install

# Create your environment file and fill in your values
cp .env.example .env
# (or create frontend/.env manually — see Environment Variables section above)

# Start the Vite dev server
npm run dev
```

The frontend starts on **http://localhost:5173**.

To run both the Express proxy server and Vite together in one terminal:

```bash
npm run dev:full
```

---

### 4. ML Service — Crop Disease Prediction

Open a **new terminal tab**:

```bash
cd backend/model/cropDisease

# Create and activate a Python virtual environment
python3 -m venv venv
source venv/bin/activate        # macOS / Linux
# venv\Scripts\activate         # Windows

# Install Python dependencies
pip install fastapi uvicorn torch torchvision pillow python-multipart

# Start the FastAPI server
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

Available at **http://localhost:8001** — Swagger docs at **http://localhost:8001/docs**

> **Note:** First startup may take up to 60 seconds while the PyTorch model loads into memory. Wait for the `Application startup complete` log before sending requests.

---

### 5. ML Service — Crop Yield Prediction

Open a **new terminal tab**:

```bash
cd backend/model/cropYield

# Create and activate a Python virtual environment
python3 -m venv venv
source venv/bin/activate        # macOS / Linux
# venv\Scripts\activate         # Windows

# Install Python dependencies
pip install fastapi uvicorn scikit-learn pandas numpy python-multipart

# Start the FastAPI server
uvicorn main:app --host 0.0.0.0 --port 8002 --reload
```

Available at **http://localhost:8002** — Swagger docs at **http://localhost:8002/docs**

---

### 6. Geofence Server

Open a **new terminal tab**:

```bash
cd backend/gps

# Create and activate a Python virtual environment
python3 -m venv venv
source venv/bin/activate        # macOS / Linux
# venv\Scripts\activate         # Windows

# Install Python dependencies
pip install flask flask-socketio flask-cors geopy

# Start the geofence server
python geofence_server.py
```

Available at **http://localhost:8000**

---

## Docker Setup (Production)

Docker Compose builds and starts **all five services** with a single command — no manual Python or Node setup required.

### Step 1 — Create environment files

```bash
# Create backend env (edit values after copying)
cp backend/.env.example backend/.env

# Create frontend env (edit values after copying)
cp frontend/.env.example frontend/.env
```

In `backend/.env`, use Docker service names for internal communication:

```env
ML_SERVER_URL=http://mlserver:8001
YIELD_SERVER_URL=http://cropprediction:8002
GEOFENCE_SERVER_URL=http://geofence:8000
FLASK_SERVER_URL=http://geofence:8000
```

### Step 2 — Build and start all services

```bash
docker compose up --build
```

Run in the background (detached mode):

```bash
docker compose up --build -d
```

### Step 3 — Verify all services are healthy

```bash
docker compose ps
```

All containers should show status `Up` or `healthy`.

### Useful Docker commands

```bash
# View real-time logs for a specific service
docker compose logs -f backend
docker compose logs -f mlserver
docker compose logs -f frontend

# Stop all running services
docker compose down

# Stop and remove all volumes (resets database uploads)
docker compose down -v

# Rebuild a single service after code changes
docker compose up --build backend

# Open an interactive shell inside a container
docker compose exec backend sh
docker compose exec mlserver bash
```

### Services started by Docker Compose

| Service | Description | Port |
|---|---|---|
| `frontend` | React app served via Nginx | **80** |
| `backend` | Node.js/Express API + WebSocket server | **3001** |
| `mlserver` | FastAPI crop disease prediction (PyTorch) | **8001** |
| `cropprediction` | FastAPI crop yield prediction | **8002** |
| `geofence` | Flask + Socket.IO geofence & GPS tracking | **8000** |

---

## Database Setup (Supabase)

### Step 1 — Create a Supabase project

1. Go to [https://supabase.com](https://supabase.com) and sign in (or create a free account)
2. Click **New Project**
3. Choose an organisation, enter a project name, set a strong database password, and select a region close to you
4. Wait for provisioning to complete (~2 minutes)

### Step 2 — Get your API credentials

1. In the Supabase dashboard go to **Settings → API**
2. Copy the following values:
   - **Project URL** → paste as `SUPABASE_URL` (backend) and `VITE_SUPABASE_URL` (frontend)
   - **anon public** key → paste as `SUPABASE_ANON_KEY` (backend) and `VITE_SUPABASE_ANON_KEY` (frontend)

### Step 3 — Run the database schema

1. In the Supabase dashboard go to **SQL Editor**
2. Click **New Query**
3. Open `backend/schema/auction_schema.sql` from this project in any text editor
4. Copy the entire file contents and paste into the SQL editor
5. Click **Run** (or press `Ctrl+Enter`)

This creates the following tables:

| Table | Description |
|---|---|
| `auctions` | Crop auction listings with status tracking and expiry |
| `bids` | Bid records — statuses: `ACTIVE`, `OUTBID`, `ACCEPTED`, `REJECTED` |
| `auction_settlements` | Transaction settlement and confirmation records |

It also installs:
- Auto-expiry triggers that update auction status on timeout
- `updated_at` auto-update triggers on all tables
- A constraint that prevents a farmer from bidding on their own auction
- Indexes on commonly queried columns for performance

### Step 4 — Enable Row Level Security (recommended)

In the Supabase dashboard go to **Authentication → Policies**. Enable RLS on each table and add policies that restrict reads/writes to authenticated users with the appropriate role.

---

## Blockchain Setup

The platform uses an Ethereum smart contract deployed on the **Sepolia testnet** for tamper-proof crop sale records.

**Contract address:** `0x011c3f24343bC0A65F9064653A906b16D587b22f`
**Network:** Ethereum Sepolia
**Chain ID:** `11155111`

### Step 1 — Install MetaMask

1. Install the MetaMask browser extension from [https://metamask.io](https://metamask.io)
2. Follow the setup wizard to create a new wallet
3. Store your 12-word seed phrase securely offline — never share it

### Step 2 — Add Sepolia Testnet to MetaMask

MetaMask usually includes Sepolia by default. To verify or add it manually:

1. Open MetaMask → click the network selector at the top left
2. If Sepolia is listed, select it and skip to Step 3
3. If not, click **Add Network → Add a network manually** and enter:

| Field | Value |
|---|---|
| Network Name | Sepolia |
| New RPC URL | `https://rpc.sepolia.org` |
| Chain ID | `11155111` |
| Currency Symbol | `ETH` |
| Block Explorer URL | `https://sepolia.etherscan.io` |

4. Click **Save**, then switch to the Sepolia network

> **Tip:** The app will also prompt MetaMask to switch to Sepolia automatically when you click Connect Wallet.

### Step 3 — Get free test ETH (SepoliaETH)

You need SepoliaETH to pay transaction gas fees. Get free tokens from a faucet:

- **Alchemy Faucet:** https://sepoliafaucet.com
- **Infura Faucet:** https://www.infura.io/faucet/sepolia
- **Chainlink Faucet:** https://faucets.chain.link/sepolia

Paste your MetaMask wallet address and request tokens. You will receive 0.1–0.5 SepoliaETH — enough for dozens of transactions.

### Step 4 — Connect your wallet in the app

1. Navigate to the **Blockchain Sales** page at `/blockchain-sales`
2. Click **Connect Wallet**
3. MetaMask will pop up asking for permission — click **Connect**
4. The app will switch to Sepolia automatically if you are on a different network

### Smart contract functions

| Function | Who calls it | Description |
|---|---|---|
| `createSale(crop, qty, price)` | Farmer | Creates a new on-chain sale record |
| `placeBid(saleId, amount)` | Buyer | Places a bid on an existing sale |
| `confirmSale(saleId)` | Farmer | Confirms and finalises the sale |
| `getSale(saleId)` | Anyone | Reads sale details by ID |
| `getTotalSales()` | Anyone | Returns total number of on-chain sales |

---

## Available Scripts

### Frontend (`frontend/`)

```bash
# Start Vite development server with hot module replacement
npm run dev

# Start the Express proxy server only (no Vite)
npm run server

# Start both Express proxy server and Vite concurrently
npm run dev:full

# Build for production (outputs to dist/)
npm run build

# Preview the production build locally
npm run preview

# Run ESLint across all source files
npm run lint
```

### Backend (`backend/`)

```bash
# Start the Express API server
node server.js
```

---

## Service Ports Reference

| Service | Port | Local URL |
|---|---|---|
| Frontend — Vite dev server | **5173** | http://localhost:5173 |
| Frontend — Docker / Nginx | **80** | http://localhost |
| Backend — Express + WebSocket | **3001** | http://localhost:3001 |
| ML — Crop Disease (FastAPI) | **8001** | http://localhost:8001/docs |
| ML — Crop Yield (FastAPI) | **8002** | http://localhost:8002/docs |
| Geofence Server (Flask) | **8000** | http://localhost:8000 |
| MQTT Broker | **1883** | mqtt://localhost:1883 |

---

## API Endpoints Reference

All backend routes are served from `http://localhost:3001`.

### Authentication

| Method | Endpoint | Description | Auth required |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register a new user (`farmer` or `buyer`) | No |
| `POST` | `/api/auth/login` | Login — returns a JWT token | No |

### Auctions

| Method | Endpoint | Description | Auth required |
|---|---|---|---|
| `GET` | `/api/auctions` | List all active auctions | Yes |
| `POST` | `/api/auctions` | Create a new auction listing | Yes (farmer) |
| `GET` | `/api/auctions/:id` | Get details for a specific auction | Yes |
| `PUT` | `/api/auctions/:id` | Update an auction | Yes (farmer) |
| `DELETE` | `/api/auctions/:id` | Delete an auction | Yes (farmer) |

### Bids

| Method | Endpoint | Description | Auth required |
|---|---|---|---|
| `POST` | `/api/bids` | Place a bid on an auction | Yes (buyer) |
| `GET` | `/api/bids/:auctionId` | Get all bids for an auction | Yes |
| `PUT` | `/api/bids/:id/accept` | Accept a bid | Yes (farmer) |
| `PUT` | `/api/bids/:id/reject` | Reject a bid | Yes (farmer) |

### ML Prediction

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/predict/disease` | Upload a crop image — returns disease diagnosis |
| `POST` | `/api/predict/yield` | Submit crop parameters — returns yield estimate |

### IoT & Sensors

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/sensors` | Get latest sensor readings |
| `POST` | `/api/water/control` | Send water pump on/off command |

### Health Check

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Returns `{ status: "ok" }` — used by Docker healthcheck |

### WebSocket — Live Auctions

Connect to `ws://localhost:3001` and exchange JSON messages:

**Send:**
```json
{ "type": "SUBSCRIBE",   "auctionId": "uuid-here" }
{ "type": "UNSUBSCRIBE", "auctionId": "uuid-here" }
{ "type": "PING" }
```

**Receive:**
```json
{ "type": "BID_PLACED",    "data": { ... } }
{ "type": "AUCTION_ENDED", "data": { ... } }
{ "type": "AUCTION_SOLD",  "data": { ... } }
```

---

## Features Overview

| Feature | Available To | Route |
|---|---|---|
| Home / Landing page | All | `/` |
| Login | All | `/login` |
| IoT Sensor Readings | Farmer | `/sensor-readings` |
| Water Pump Control | Farmer | `/water-control` |
| Water Level Monitor | Farmer | `/water-level` |
| Geofence & GPS Tracking | Farmer | `/geofence` |
| Crop Disease Prediction | Farmer | `/crop-disease` |
| Crop Yield Prediction | Farmer | `/crop-prediction` |
| Create Auction Listing | Farmer | `/auctions` |
| Manage My Auctions | Farmer | `/auction-management` |
| Blockchain Sales | Farmer + Buyer | `/blockchain-sales` |
| Live Auction Marketplace | Buyer | `/marketplace` |
| Auction Details & Bidding | Buyer | `/auctions/:id` |
| Buyer Dashboard | Buyer | `/buyer-dashboard` |

---

## Troubleshooting

### Backend fails to start — Supabase connection error

- Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `backend/.env` match your Supabase project's API settings
- Free Supabase projects pause after 1 week of inactivity — go to your Supabase dashboard and click **Restore project**

### Frontend shows a blank page or network errors

- Confirm the backend is running on port 3001
- Check `VITE_API_BASE_URL=http://localhost:3001` is set in `frontend/.env`
- Open the browser developer console (F12) and look for CORS errors
- Ensure no `https` vs `http` mismatch between frontend and backend URLs

### ML service not responding / prediction timeout

- The PyTorch model takes up to 60 seconds to load on first start — check `http://localhost:8001/docs` and wait until it responds before sending a prediction request
- Verify `ML_SERVER_URL` in `backend/.env` points to the correct host and port
- Check the ML service terminal for Python errors such as missing model weights files

### Docker services exit immediately or fail to build

- Ensure Docker Desktop is running before running `docker compose` commands
- Clear stale containers and volumes: `docker compose down -v`, then `docker compose up --build`
- Inspect logs for the failing service: `docker compose logs <service-name>`
- Ensure all `.env` files exist and have values before building

### MetaMask — wrong network warning

- The platform requires the **Sepolia testnet** (Chain ID: 11155111)
- Open MetaMask, click the network selector, and switch to Sepolia
- If Sepolia is not listed, add it manually following the [Blockchain Setup](#blockchain-setup) steps above

### MetaMask — transaction fails with "insufficient funds"

- You need free SepoliaETH to pay gas fees
- Get tokens from a Sepolia faucet (links in [Blockchain Setup](#blockchain-setup) above)

### MQTT sensors not showing live data

- Verify `MQTT_HOST`, `MQTT_PORT`, and `MQTT_BROKER_URL` in `backend/.env`
- Make sure your MQTT broker process is running and accessible from the backend
- Check the backend console on startup for the `MQTT client connected` confirmation message

### Port already in use

```bash
# macOS / Linux — find which process is using a port
lsof -i :3001
kill -9 <PID>

# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

### Auction WebSocket not receiving live updates

- Check the backend console for `WebSocket server ready` on startup
- Open the browser console (F12) and look for WebSocket connection errors
- Ensure no proxy, firewall, or VPN is blocking the WebSocket upgrade on port 3001
- Confirm the client is subscribing to the correct `auctionId` after connecting
