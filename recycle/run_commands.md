# How to Run and Verify TestoZa Locally

Here are the commands to start both the Frontend and Backend servers locally on your machine.

---

## 1. Start the Frontend (Vite)

Open a terminal, navigate to the `frontend` folder, and run:

```powershell
cd frontend
npm run dev
```

*By default, the frontend will be accessible at: `http://localhost:5173`*

---

## 2. Start the Backend (FastAPI / Uvicorn)

Open a second terminal, navigate to the `backend` folder, activate the Python virtual environment, and run:

```powershell
cd backend
python -m uvicorn app.main:app --reload --host 127.0.5.1 --port 8000
```

*By default, the backend API will run at: `http://127.0.0.1:8000`*
