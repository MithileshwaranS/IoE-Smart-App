# 🌐 IoE Smart Agriculture System

## 🚀 Overview

This project is a containerized IoE-based Smart Agriculture system that integrates machine learning, geofencing, and real-time data visualization through a modern React + Node.js + Python stack.

### Key Features

- 🌾 **Monitor crop health** using ML models (FastAPI + PyTorch)
- 📍 **Define and visualize geofences** (Flask + SocketIO)
- 🛰️ **Stream GPS updates and alerts** in real-time
- 📊 **Unified web dashboard** for system interaction (React frontend)

---

## 🧩 Architecture

```
+-------------------------+
|      React Frontend     |  → Port 5173
| (Vite + Tailwind)       |
+-----------+-------------+
            |
            v
+-----------+-------------+
|    Node.js Backend      |  → Port 3001
| (Express + Supabase)    |
+-----------+-------------+
        |           |
        v           v
+-------+--+     +--+----------+
|  ML API  |     | Geofence API|  → Ports 8001, 8000
| (FastAPI)|     | (Flask)     |
+----------+     +-------------+
```

Each component runs in its own Docker container, orchestrated using Docker Compose.

---

## 🐳 Dockerized Services

| Service      | Tech Stack                      | Port | Path              | Description                                 |
| ------------ | ------------------------------- | ---- | ----------------- | ------------------------------------------- |
| **frontend** | React (Vite)                    | 5173 | `./frontend`      | Web interface for IoE system                |
| **backend**  | Node.js + Express + Supabase    | 3001 | `./backend`       | Handles APIs and ML/geofence communication  |
| **mlserver** | Python + FastAPI + PyTorch      | 8001 | `./backend/model` | Predicts crop diseases using trained models |
| **geofence** | Flask + Flask-SocketIO + SQLite | 8000 | `./backend/gps`   | Geofence and GPS management server          |

---

## ⚙️ Prerequisites

Make sure you have the following installed:

- 🐳 **Docker** - [Install Docker](https://docs.docker.com/get-docker/)
- 🧱 **Docker Compose** - [Install Docker Compose](https://docs.docker.com/compose/install/)
- (Optional) Python/Node.js for local testing

---

## 🚀 Getting Started

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/<your-username>/IoE-CCET.git
cd IoE-CCET
```

### 2️⃣ Build and Start All Containers

```bash
docker compose up --build
```

This will automatically build and start all four services.

### 3️⃣ Access the System

| Component               | URL                        |
| ----------------------- | -------------------------- |
| Frontend (React)        | http://localhost:5173      |
| Backend (Node.js)       | http://localhost:3001      |
| ML Server (FastAPI)     | http://localhost:8001/docs |
| Geofence Server (Flask) | http://localhost:8000      |

---

## ⚙️ Development Notes

### 🔧 Rebuilding after code changes

If you modify any code, rebuild the affected service:

```bash
docker compose build <service_name>
```

**Example:**

```bash
docker compose build frontend
docker compose up frontend
```

### 📦 Stopping Containers

To stop everything:

```bash
docker compose down
```

---

## 🧠 Machine Learning Component

- **Framework:** FastAPI
- **Models:** `mobilevit_corn.pth`, `mobilevit_rice.pth`

The server loads both models at startup and serves prediction results for uploaded crop images.

---

## 📡 Geofence and GPS Tracking

- **Server:** Flask + SocketIO
- **Client:** Python socket client (`geofence_client.py`)
- **Storage:** SQLite (`geofence.db`) for coordinates and GPS logs
- **Visualization:** Live Folium map with GPS paths and boundary zones

---

## 🧰 Backend (Node.js + Express)

### Handles:

- API routing
- Supabase integration
- Communication with ML and Geofence servers

**Port:** 3001

### Environment Variables

Create a `.env` file in the `backend` directory:

```env
SUPABASE_URL=<your_supabase_url>
SUPABASE_ANON_KEY=<your_supabase_anon_key>
GEOFENCE_SERVER_URL=http://geofence:8000/api/geofence
FLASK_SERVER_URL=http://mlserver:8001/api/geofence
```

---

## 🌱 Frontend (React + Vite)

- **Development port:** 5173
- **Styling:** Tailwind CSS
- **Features:** Responsive and real-time dashboards

### Environment Variables

Create a `.env` file in the `frontend` directory:

```env
VITE_API_BASE_URL=http://localhost:3001
```

---

## 🔒 Environment Variables Summary

| Variable              | Description                    |
| --------------------- | ------------------------------ |
| `SUPABASE_URL`        | Supabase project URL           |
| `SUPABASE_ANON_KEY`   | Supabase public API key        |
| `GEOFENCE_SERVER_URL` | Internal geofence API endpoint |
| `FLASK_SERVER_URL`    | ML API endpoint                |
| `VITE_API_BASE_URL`   | Frontend → Backend connection  |

---

## 🧱 Project Folder Structure

```
IoE-CCET/
├── frontend/             # React app
│   ├── Dockerfile
│   └── src/
├── backend/
│   ├── Dockerfile
│   ├── server.js
│   ├── model/            # ML Server
│   │   ├── diseasePrediction.py
│   │   ├── mobilevit_corn.pth
│   │   ├── mobilevit_rice.pth
│   │   └── Dockerfile
│   └── gps/              # Geofence Server
│       ├── geofence_server.py
│       ├── geofence_client.py
│       ├── gps_sender.py
│       └── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## ⚡ Useful Docker Commands

| Command                                      | Description                        |
| -------------------------------------------- | ---------------------------------- |
| `docker compose ps`                          | Check running containers           |
| `docker compose logs -f <service>`           | Follow logs for a specific service |
| `docker exec -it <container_name> /bin/bash` | Access container shell             |
| `docker system prune -a`                     | Clean up unused Docker data        |

---

## 🧩 Future Improvements

- [ ] Integrate MQTT for real-time sensor data
- [ ] Add Prometheus + Grafana for monitoring
- [ ] Deploy to cloud (AWS / GCP / Azure)
- [ ] Use Nginx reverse proxy for unified routing
- [ ] Implement authentication and authorization
- [ ] Add automated testing suite

---

## 👨‍💻 Author

**Mithileshwaran (Mithu)**

- 🎓 B.Tech Electrical and Computer Engineering @ Amrita Vishwa Vidyapeetham
- 💡 Passionate about IoE, Embedded Systems, and Smart Agriculture
- 📧 [mithileshwaran24@gmail.com](mailto:mithileshwaran24@gmail.com)
- 🔗 [GitHub](https://github.com/MithileshwaranS)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Thanks to the open-source community for the amazing tools and libraries
- Special thanks to Amrita Vishwa Vidyapeetham for supporting this project

---

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/<your-username>/IoE-CCET/issues) page
2. Create a new issue with detailed information
3. Contact the author directly

---

<div align="center">
  <strong>⭐ Star this repository if you find it helpful!</strong>
</div>
