# Stock Sentiment Frontend

Static, interaction-heavy dashboard UI for sentiment intelligence.

## Files

- `index.html`: App structure.
- `styles.css`: Full design system, responsive layout, animations.
- `app.js`: Data fetching, state management, rendering, interactions.

## Features

- Live market pulse hero and sentiment gauge.
- Timeline chart via canvas.
- Trend-ranked ticker cards.
- Narrative/theme analysis cards.
- Filterable intelligence feed.
- Persistent watchlist with drill-down.
- Auto refresh and keyboard shortcuts.

## Usage

Recommended:
- Run backend and open `http://127.0.0.1:8000/app`.

Alternative:
- Open `index.html` directly and set API base to your backend URL.

GitHub Pages:
- Pages deployment uses `data/snapshot.json` as built-in data source.
- If `/api/*` endpoints fail, app automatically serves dashboard/feed/watchlist from snapshot.
- Set API base from header to point at a live backend when available.
