# Stock Sentiment Dashboard (Revamped)

A full-stack stock sentiment intelligence platform with a redesigned UX and richer analytics engine.

## What changed

### Backend upgrades
- Rebuilt sentiment engine with weighted lexical scoring + confidence estimation.
- Resilient ingestion from Yahoo Finance RSS and WallStreetBets RSS with in-memory cache and fallback data.
- Rich analytics endpoints:
  - `/api/dashboard` for complete UI payload (overview, timeline, themes, narratives, feed preview).
  - `/api/feed` with server-side filtering (`source`, `sentiment`, `ticker`, `q`).
  - `/api/ticker/{symbol}` for single-ticker drilldowns.
  - `/api/watchlist` for multi-ticker snapshot intelligence.
  - `/api/insights` for thematic and narrative summaries.
- Trending ticker model with hype score, momentum, source mix, and sentiment split.
- Backward-compatible legacy routes kept (`/api/news`, `/api/reddit`, `/api/sentiment`, `/api/trending-stocks`).

### Frontend upgrades
- Fully rebuilt command-center style UI/UX from scratch.
- Advanced dashboard sections:
  - Live market pulse hero + sentiment index gauge.
  - Animated KPI cards.
  - Sentiment timeline chart on canvas.
  - Ticker arena cards with distribution bars.
  - Narrative signals and theme heatmap.
  - Intelligence feed with rich chips and server-side filters.
  - Persistent local watchlist with fast drill-down.
- UX enhancements:
  - Auto-refresh toggling.
  - Keyboard shortcut (`/`) for instant feed search.
  - Filter state + active ticker pill.
  - Toast notifications and loading skeletons.
- Responsive layout for desktop/tablet/mobile.

## Project structure

- `stock-sentiment-backend`: FastAPI service and analytics engine.
- `stock-sentiment-frontend`: Static frontend files (`index.html`, `styles.css`, `app.js`).
- `scripts/generate_static_snapshot.py`: Snapshot generator for GitHub Pages static mode.

## GitHub Pages mode

- GitHub Pages deployment at `https://meetgojiya98.github.io/Stock-Sentiment-Dashboard/` uses `stock-sentiment-frontend/data/snapshot.json`.
- Frontend automatically falls back to this snapshot when `/api/*` is unavailable.
- Snapshot is refreshed hourly by workflow:
  - `.github/workflows/refresh-static-data.yml`
  - and re-deployed by `.github/workflows/deploy-frontend-pages.yml`.
- To use a live backend instead, set `API Base` in the app header and click **Save**.

## Vercel deployment

- This repo is deployed on Vercel as a static site from `stock-sentiment-frontend`.
- Root `vercel.json` sets:
  - `framework: null`
  - `buildCommand: echo "Static frontend deployment"`
  - `outputDirectory: stock-sentiment-frontend`
- If your Vercel project still shows `react-scripts build`, remove that custom Build Command in Project Settings so Vercel uses `vercel.json`.

## Run locally

### 1. Backend
```bash
cd stock-sentiment-backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 2. Frontend
The backend serves the frontend at:
- `http://127.0.0.1:8000/app`

If needed, you can also open `stock-sentiment-frontend/index.html` directly and set API base to your backend URL.

## Core API routes

- `GET /api/health`
- `GET /api/dashboard`
- `GET /api/feed`
- `GET /api/trending-stocks`
- `GET /api/ticker/{symbol}`
- `GET /api/watchlist?tickers=AAPL,MSFT,NVDA`
- `GET /api/insights?ticker=NVDA`
