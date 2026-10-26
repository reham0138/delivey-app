# RehamRec

**Semantic music recommendation from a free-text description.**
Type something like *"a dark grunge song about toxic love"* and RehamRec returns songs ranked by semantic similarity, together with album, cover art and a 30-second preview.

<!-- Add a screenshot or GIF of the running app here, e.g. ![RehamRec](docs/screenshot.png) -->

---

## How it works

```
Frontend (HTML / CSS / JavaScript)
        │  POST /recommend  { "description": "..." }
        ▼
FastAPI backend
        │
        ▼
Recommendation model (SentenceTransformer embeddings + cosine similarity)
        │
        ▼
iTunes Search API  → album, cover, preview URL
        │
        ▼
JSON response → frontend renders recommendation cards
```

Three retrieval methods are supported:

| Method | Description |
|--------|-------------|
| `lyrics` | Matches the query against `{genre} + {artist} + lyrics preview` embeddings |
| `description` | Matches the query against pre-generated natural-language song descriptions |
| `combined` (default) | Averages both similarity scores |

## Repository structure

```
RehamRec/
├── frontend/                          # Static web UI (HTML/CSS/JS)
├── backend/
│   └── description_model_project/     # FastAPI backend + recommendation model
│       └── README.md                  # Full API documentation
└── Run_RehamRec.bat                   # Windows launcher (backend + frontend)
```

## Tech stack

- **Backend:** Python, FastAPI, Uvicorn
- **Model:** SentenceTransformers (`all-MiniLM-L6-v2`), precomputed song embeddings
- **Metadata:** iTunes Search API (no API key required)
- **Frontend:** HTML, CSS, JavaScript

## Dataset

[60k Songs with Descriptions](https://www.kaggle.com/datasets/rehammayea/60k-songs-with-description) on Kaggle. The CSV is not stored in this repository; see the backend README for how to download it.

## Quick start

**1. Set up the backend** (from the repository root):

```bash
cd backend/description_model_project
python -m venv .venv
.venv\Scripts\activate          # Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
```

**2. Get the dataset and configure the environment** — follow steps 3–4 in
[`backend/description_model_project/README.md`](backend/description_model_project/README.md).

**3. Run the project**

- **Windows (one click):** double-click `Run_RehamRec.bat` in the repository root. It starts the backend, serves the frontend on port 5500 and opens the browser. It expects the `.venv` created in step 1.
- **Manually:**

```bash
# Terminal 1 — backend (http://127.0.0.1:8000)
cd backend/description_model_project
uvicorn src.inference.app:app --reload

# Terminal 2 — frontend (http://127.0.0.1:5500)
cd frontend
python -m http.server 5500
```

Then open <http://127.0.0.1:5500>.

## API

The backend exposes `POST /recommend` and `GET /health`. Request and response formats are documented in the [backend README](backend/description_model_project/README.md#api-documentation).

## About

Built by **Reham Mayea**. The recommendation model and backend come from my graduation project in AI-powered music recommendation; the web frontend was built during the Bytes4Future training program.

## License

For academic / educational use only. The dataset is subject to its original provider's terms.
