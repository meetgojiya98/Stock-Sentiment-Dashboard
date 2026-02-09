# Stock Sentiment Backend

FastAPI backend for the Stock Sentiment Dashboard.

## Highlights

- Multi-source ingestion:
  - Yahoo Finance RSS
  - Reddit WallStreetBets RSS
- Enrichment pipeline per item:
  - sentiment label + score + confidence
  - ticker extraction
  - theme classification
  - summary text
- Analytics layers:
  - market overview metrics
  - sentiment timeline
  - ticker hype/momentum model
  - narrative and theme insights
- In-memory caching with force refresh support.

## Run

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## Endpoints

- `GET /api/health`
- `GET /api/dashboard?force_refresh=false`
- `GET /api/feed?source=news&sentiment=positive&ticker=NVDA&q=guidance&limit=50`
- `GET /api/news`
- `GET /api/reddit`
- `GET /api/sentiment`
- `GET /api/trending-stocks`
- `GET /api/ticker/NVDA`
- `GET /api/watchlist?tickers=AAPL,MSFT,NVDA`
- `GET /api/insights?ticker=MSFT`

## Frontend serving

If `/stock-sentiment-frontend/index.html` exists, backend mounts it at `/app`.
