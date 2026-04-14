# First-time setup and run

Work from the **repository root** (folder that contains `backend/` and `frontend/`).

**Prerequisites:** Python 3.8+, Node.js 16+.

---

## Backend — first time only

```bash
cd backend
python3 -m venv venv
```

**Activate the virtual environment**

- macOS / Linux:

```bash
source venv/bin/activate
```

**Install dependencies**

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

**Environment variables**

Create `backend/.env` with your OpenRouter API key (used for scenario options and recommendations):

```bash
echo 'OPENROUTER_API_KEY=your_openrouter_api_key_here' > .env
```

Or create `backend/.env` in your editor and set `OPENROUTER_API_KEY=...`.

---

## Frontend — first time only

```bash
cd frontend
npm install
```

If `npm run dev` or `npm run build` fails with **Permission denied** on `vite` (macOS / Linux):

```bash
chmod +x node_modules/.bin/*
```

---

## Run (after setup — two terminals)

**Terminal 1 — backend** (with venv activated)

```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

On Windows, use `venv\Scripts\activate` instead of `source venv/bin/activate`.

**Terminal 2 — frontend**

```bash
cd frontend
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). The UI expects the API at `http://localhost:8000`.

**Optional:** To point the UI at another API URL, set `VITE_BACKEND_URL` in `frontend/.env` before `npm run dev`.
