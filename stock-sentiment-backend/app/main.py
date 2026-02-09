from __future__ import annotations

import asyncio
import math
import re
import uuid
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from statistics import pstdev
from typing import Any

import aiohttp
from bs4 import BeautifulSoup
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

APP_NAME = "Stock Sentiment Intelligence API"
APP_VERSION = "2.0.0"
NEWS_RSS_URL = "https://finance.yahoo.com/news/rssindex"
REDDIT_RSS_URL = "https://www.reddit.com/r/wallstreetbets/.rss"
CACHE_TTL_SECONDS = 180
MAX_ITEMS = 120

POSITIVE_WEIGHTS = {
    "beat": 1.4,
    "bull": 1.2,
    "bullish": 1.35,
    "buy": 1.0,
    "breakout": 1.25,
    "gain": 1.15,
    "growth": 1.1,
    "green": 0.8,
    "momentum": 0.95,
    "optimistic": 1.2,
    "outperform": 1.4,
    "profit": 1.3,
    "rally": 1.4,
    "record": 1.0,
    "rebound": 1.1,
    "recover": 1.0,
    "surge": 1.5,
    "upgrade": 1.25,
    "upside": 1.2,
    "win": 1.0,
}

NEGATIVE_WEIGHTS = {
    "bankrupt": 1.7,
    "bear": 1.2,
    "bearish": 1.35,
    "crash": 1.65,
    "cut": 0.8,
    "decline": 1.15,
    "downgrade": 1.35,
    "drop": 1.1,
    "fear": 1.0,
    "loss": 1.25,
    "miss": 1.2,
    "missed": 1.2,
    "plunge": 1.65,
    "risk": 0.9,
    "sell": 1.15,
    "slump": 1.35,
    "volatile": 0.9,
    "warning": 0.95,
    "weak": 0.95,
}

INTENSIFIERS = {"very", "extremely", "strong", "massive", "huge", "major", "sharp"}

THEME_KEYWORDS = {
    "AI": ["ai", "artificial intelligence", "chip", "semiconductor", "model", "gpu"],
    "Earnings": ["earnings", "eps", "revenue", "guidance", "quarter", "forecast"],
    "Rates": ["fed", "rates", "interest", "inflation", "cpi", "bond"],
    "M&A": ["acquire", "acquisition", "merger", "deal", "buyout"],
    "Crypto": ["bitcoin", "ethereum", "crypto", "token", "blockchain"],
    "EV": ["electric vehicle", "ev", "battery", "charging", "tesla"],
    "Labor": ["strike", "layoff", "hiring", "workforce", "union"],
}

COMPANY_TO_TICKER = {
    "apple": "AAPL",
    "amazon": "AMZN",
    "alphabet": "GOOGL",
    "google": "GOOGL",
    "microsoft": "MSFT",
    "meta": "META",
    "nvidia": "NVDA",
    "tesla": "TSLA",
    "netflix": "NFLX",
    "palantir": "PLTR",
    "coinbase": "COIN",
    "amd": "AMD",
    "intel": "INTC",
}

TICKER_NOISE = {
    "A",
    "AI",
    "AM",
    "AN",
    "ARE",
    "AS",
    "AT",
    "CEO",
    "CFO",
    "CPI",
    "DO",
    "EV",
    "FED",
    "FOR",
    "GDP",
    "HAS",
    "HOW",
    "IPO",
    "IS",
    "IT",
    "LOW",
    "NEW",
    "NO",
    "NOW",
    "ON",
    "OR",
    "OUT",
    "PM",
    "RSI",
    "SO",
    "THE",
    "TO",
    "TOP",
    "USA",
    "USD",
    "WSB",
    "YOLO",
}

RSS_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
}


@dataclass(slots=True)
class RawFeedItem:
    id: str
    source: str
    title: str
    url: str
    published_at: datetime
    text: str


@dataclass(slots=True)
class EnrichedFeedItem:
    id: str
    source: str
    title: str
    url: str
    published_at: datetime
    text: str
    summary: str
    sentiment_label: str
    sentiment_score: float
    sentiment_confidence: float
    tickers: list[str]
    themes: list[str]


class FeedCache:
    def __init__(self, ttl_seconds: int = CACHE_TTL_SECONDS):
        self.ttl = timedelta(seconds=ttl_seconds)
        self.generated_at = datetime.min.replace(tzinfo=timezone.utc)
        self.items: list[EnrichedFeedItem] = []
        self.lock = asyncio.Lock()

    async def get(self, *, force_refresh: bool = False) -> tuple[list[EnrichedFeedItem], datetime, bool]:
        now = utc_now()
        if not force_refresh and self.items and now - self.generated_at < self.ttl:
            return self.items, self.generated_at, True

        async with self.lock:
            now = utc_now()
            if not force_refresh and self.items and now - self.generated_at < self.ttl:
                return self.items, self.generated_at, True

            raw_items = await fetch_all_sources()
            enriched = [enrich_item(item) for item in raw_items]
            if not enriched:
                enriched = [enrich_item(item) for item in fallback_items()]

            self.items = sorted(enriched, key=lambda item: item.published_at, reverse=True)[:MAX_ITEMS]
            self.generated_at = now
            return self.items, self.generated_at, False


app = FastAPI(title=APP_NAME, version=APP_VERSION)
cache = FeedCache()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://stock-sentiment-frontend.vercel.app",
        "https://meetgojiya98.github.io",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

FRONTEND_DIR = Path(__file__).resolve().parents[2] / "stock-sentiment-frontend"
if FRONTEND_DIR.exists():
    app.mount("/app", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")


@app.get("/", include_in_schema=False)
async def root() -> Any:
    if FRONTEND_DIR.exists() and (FRONTEND_DIR / "index.html").exists():
        return RedirectResponse(url="/app")
    return {"message": f"{APP_NAME} is running", "version": APP_VERSION, "docs": "/docs"}


@app.get("/api/health")
async def health() -> dict[str, Any]:
    items, generated_at, cached = await cache.get()
    return {
        "status": "ok",
        "version": APP_VERSION,
        "cached": cached,
        "cacheAgeSeconds": max(0, int((utc_now() - generated_at).total_seconds())),
        "items": len(items),
        "generatedAt": generated_at.isoformat(),
    }


@app.get("/api/dashboard")
async def dashboard(force_refresh: bool = Query(default=False)) -> dict[str, Any]:
    items, generated_at, cached = await cache.get(force_refresh=force_refresh)
    return build_dashboard_payload(items, generated_at, cached)


@app.get("/api/feed")
async def feed(
    source: str | None = Query(default=None, description="news or reddit"),
    sentiment: str | None = Query(default=None, description="positive, neutral, negative"),
    ticker: str | None = Query(default=None),
    q: str | None = Query(default=None, description="text search"),
    limit: int = Query(default=40, ge=1, le=200),
    force_refresh: bool = Query(default=False),
) -> dict[str, Any]:
    items, generated_at, cached = await cache.get(force_refresh=force_refresh)
    filtered = filter_items(items, source=source, sentiment=sentiment, ticker=ticker, q=q)
    return {
        "generatedAt": generated_at.isoformat(),
        "cached": cached,
        "count": len(filtered),
        "items": [serialize_item(item) for item in filtered[:limit]],
    }


@app.get("/api/news")
async def news(force_refresh: bool = Query(default=False), limit: int = Query(default=20, ge=1, le=100)) -> list[dict[str, Any]]:
    items, _, _ = await cache.get(force_refresh=force_refresh)
    only_news = [item for item in items if item.source == "news"][:limit]
    return [legacy_item_payload(item) for item in only_news]


@app.get("/api/reddit")
async def reddit(
    force_refresh: bool = Query(default=False),
    limit: int = Query(default=20, ge=1, le=100),
) -> list[dict[str, Any]]:
    items, _, _ = await cache.get(force_refresh=force_refresh)
    only_reddit = [item for item in items if item.source == "reddit"][:limit]
    return [legacy_item_payload(item) for item in only_reddit]


@app.get("/api/sentiment")
async def sentiment(force_refresh: bool = Query(default=False)) -> list[dict[str, Any]]:
    items, _, _ = await cache.get(force_refresh=force_refresh)
    breakdown = build_sentiment_breakdown(items)
    return [
        {"sentiment": "POSITIVE", "count": breakdown["positive"]},
        {"sentiment": "NEGATIVE", "count": breakdown["negative"]},
        {"sentiment": "NEUTRAL", "count": breakdown["neutral"]},
    ]


@app.get("/api/trending-stocks")
async def trending_stocks(force_refresh: bool = Query(default=False), limit: int = Query(default=15, ge=1, le=50)) -> list[dict[str, Any]]:
    items, _, _ = await cache.get(force_refresh=force_refresh)
    return build_ticker_insights(items, top_n=limit)


@app.get("/api/ticker/{ticker_symbol}")
async def ticker_detail(ticker_symbol: str, force_refresh: bool = Query(default=False)) -> dict[str, Any]:
    symbol = sanitize_ticker(ticker_symbol)
    if not symbol:
        return {"ticker": ticker_symbol.upper(), "mentions": 0, "items": [], "message": "Ticker symbol is invalid."}

    items, generated_at, cached = await cache.get(force_refresh=force_refresh)
    related = [item for item in items if symbol in item.tickers]
    ticker_insight = next((row for row in build_ticker_insights(items, top_n=200) if row["ticker"] == symbol), None)
    return {
        "generatedAt": generated_at.isoformat(),
        "cached": cached,
        "ticker": symbol,
        "mentions": len(related),
        "snapshot": ticker_insight,
        "items": [serialize_item(item) for item in related[:40]],
        "themes": build_theme_insights(related, top_n=6),
    }


@app.get("/api/watchlist")
async def watchlist(
    tickers: str = Query(default="AAPL,MSFT,NVDA"),
    force_refresh: bool = Query(default=False),
) -> dict[str, Any]:
    requested = [sanitize_ticker(token) for token in tickers.split(",")]
    requested = [ticker for ticker in requested if ticker]
    unique_tickers = list(dict.fromkeys(requested))[:25]

    items, generated_at, cached = await cache.get(force_refresh=force_refresh)
    ticker_index = {row["ticker"]: row for row in build_ticker_insights(items, top_n=300)}
    payload = []
    for ticker_symbol in unique_tickers:
        row = ticker_index.get(ticker_symbol)
        if row:
            payload.append(row)
        else:
            payload.append(
                {
                    "ticker": ticker_symbol,
                    "mentions": 0,
                    "averageSentiment": 0,
                    "bullish": 0,
                    "bearish": 0,
                    "neutral": 0,
                    "momentum": 0,
                    "hypeScore": 0,
                    "sourceMix": {},
                }
            )

    return {
        "generatedAt": generated_at.isoformat(),
        "cached": cached,
        "count": len(payload),
        "items": payload,
    }


@app.get("/api/insights")
async def insights(
    ticker: str | None = Query(default=None),
    source: str | None = Query(default=None),
    force_refresh: bool = Query(default=False),
) -> dict[str, Any]:
    items, generated_at, cached = await cache.get(force_refresh=force_refresh)
    filtered = filter_items(items, source=source, sentiment=None, ticker=ticker, q=None)

    return {
        "generatedAt": generated_at.isoformat(),
        "cached": cached,
        "itemCount": len(filtered),
        "sentimentIndex": compute_sentiment_index(filtered),
        "themes": build_theme_insights(filtered, top_n=8),
        "trendingTickers": build_ticker_insights(filtered, top_n=10),
        "narratives": build_narratives(filtered, limit=6),
    }


async def fetch_all_sources() -> list[RawFeedItem]:
    timeout = aiohttp.ClientTimeout(total=12)
    async with aiohttp.ClientSession(timeout=timeout) as session:
        news_task = asyncio.create_task(fetch_rss(session, NEWS_RSS_URL))
        reddit_task = asyncio.create_task(fetch_rss(session, REDDIT_RSS_URL))
        news_xml, reddit_xml = await asyncio.gather(news_task, reddit_task)

    news_items = parse_news_feed(news_xml) if news_xml else []
    reddit_items = parse_reddit_feed(reddit_xml) if reddit_xml else []

    items = sorted(news_items + reddit_items, key=lambda item: item.published_at, reverse=True)
    if items:
        return items[:MAX_ITEMS]
    return fallback_items()


async def fetch_rss(session: aiohttp.ClientSession, url: str) -> str:
    try:
        async with session.get(url, headers=RSS_HEADERS) as response:
            if response.status >= 400:
                return ""
            return await response.text()
    except Exception:
        return ""


def parse_news_feed(xml: str) -> list[RawFeedItem]:
    soup = BeautifulSoup(xml, "xml")
    items: list[RawFeedItem] = []
    for item in soup.find_all("item")[:80]:
        title = normalize_whitespace(item.title.text if item.title else "Untitled")
        description = html_to_text(item.description.text if item.description else "")
        url = item.link.text if item.link else ""
        published_at = parse_datetime(item.pubDate.text if item.pubDate else "")
        text = normalize_whitespace(f"{title}. {description}".strip(". "))
        if not text:
            continue
        items.append(
            RawFeedItem(
                id=str(uuid.uuid4()),
                source="news",
                title=title,
                url=url,
                published_at=published_at,
                text=text,
            )
        )
    return items


def parse_reddit_feed(xml: str) -> list[RawFeedItem]:
    soup = BeautifulSoup(xml, "xml")
    entries: list[RawFeedItem] = []
    for entry in soup.find_all("entry")[:80]:
        title = normalize_whitespace(entry.title.text if entry.title else "Untitled")
        content = html_to_text(entry.content.text if entry.content else "")
        link_tag = entry.find("link")
        url = link_tag.get("href", "") if link_tag else ""
        published_at = parse_datetime(entry.updated.text if entry.updated else "")
        text = normalize_whitespace(f"{title}. {content}".strip(". "))
        if not text:
            continue
        entries.append(
            RawFeedItem(
                id=str(uuid.uuid4()),
                source="reddit",
                title=title,
                url=url,
                published_at=published_at,
                text=text,
            )
        )
    return entries


def fallback_items() -> list[RawFeedItem]:
    now = utc_now()
    seed = [
        {
            "source": "news",
            "title": "Nvidia leads AI stocks after upbeat guidance",
            "url": "https://finance.yahoo.com",
            "text": "Nvidia and other semiconductor leaders rallied after strong guidance and a surge in enterprise AI demand.",
            "minutes": 15,
        },
        {
            "source": "news",
            "title": "Federal Reserve signals caution as inflation cools",
            "url": "https://finance.yahoo.com",
            "text": "Markets stayed mixed as the Fed highlighted ongoing inflation risks despite softer CPI prints.",
            "minutes": 37,
        },
        {
            "source": "news",
            "title": "Apple supplier concerns pressure hardware outlook",
            "url": "https://finance.yahoo.com",
            "text": "Investors weighed weaker hardware demand and margin pressure, though service revenue remained resilient.",
            "minutes": 58,
        },
        {
            "source": "reddit",
            "title": "$TSLA breakout or bull trap?",
            "url": "https://reddit.com/r/wallstreetbets",
            "text": "WSB traders debate whether Tesla momentum is a real breakout or a short-term squeeze before a pullback.",
            "minutes": 77,
        },
        {
            "source": "reddit",
            "title": "Rotation into $MSFT and $AMZN",
            "url": "https://reddit.com/r/wallstreetbets",
            "text": "Comments show bullish rotation into mega-cap software as risk appetite improves.",
            "minutes": 94,
        },
        {
            "source": "reddit",
            "title": "Bears circle regional banks",
            "url": "https://reddit.com/r/wallstreetbets",
            "text": "Posts mention rising credit losses and higher funding costs, keeping bank sentiment negative.",
            "minutes": 122,
        },
    ]

    return [
        RawFeedItem(
            id=str(uuid.uuid4()),
            source=row["source"],
            title=row["title"],
            url=row["url"],
            published_at=now - timedelta(minutes=int(row["minutes"])),
            text=row["text"],
        )
        for row in seed
    ]


def enrich_item(item: RawFeedItem) -> EnrichedFeedItem:
    label, score, confidence = analyze_sentiment(item.text)
    tickers = extract_tickers(f"{item.title} {item.text}")
    themes = extract_themes(item.text)
    summary = summarize_text(item.text)
    return EnrichedFeedItem(
        id=item.id,
        source=item.source,
        title=item.title,
        url=item.url,
        published_at=item.published_at,
        text=item.text,
        summary=summary,
        sentiment_label=label,
        sentiment_score=score,
        sentiment_confidence=confidence,
        tickers=tickers,
        themes=themes,
    )


def analyze_sentiment(text: str) -> tuple[str, float, float]:
    tokens = re.findall(r"[a-z][a-z\-']*", text.lower())
    if not tokens:
        return "neutral", 0.0, 0.2

    score = 0.0
    intensity = 1.0
    for token in tokens:
        if token in INTENSIFIERS:
            intensity = 1.35
            continue

        delta = 0.0
        if token in POSITIVE_WEIGHTS:
            delta = POSITIVE_WEIGHTS[token]
        elif token in NEGATIVE_WEIGHTS:
            delta = -NEGATIVE_WEIGHTS[token]

        if delta:
            score += delta * intensity
        intensity = 1.0

    base = max(2.4, math.sqrt(len(tokens) + 1.0))
    normalized = max(-1.0, min(1.0, score / base))

    if normalized >= 0.18:
        label = "positive"
    elif normalized <= -0.18:
        label = "negative"
    else:
        label = "neutral"

    confidence = min(0.99, abs(normalized) * 1.45 + min(0.3, len(tokens) / 110.0))
    return label, round(normalized, 4), round(confidence, 4)


def extract_tickers(text: str) -> list[str]:
    found: set[str] = set()
    for match in re.findall(r"\$?[A-Z]{1,5}\b", text):
        token = match.lstrip("$").strip().upper()
        if token in TICKER_NOISE:
            continue
        if len(token) == 1 and token not in {"C", "F", "T"}:
            continue
        found.add(token)

    lowered = text.lower()
    for company_name, ticker in COMPANY_TO_TICKER.items():
        if company_name in lowered:
            found.add(ticker)

    return sorted(found)[:10]


def extract_themes(text: str) -> list[str]:
    lowered = text.lower()
    themes = []
    for theme, keywords in THEME_KEYWORDS.items():
        if any(keyword in lowered for keyword in keywords):
            themes.append(theme)
    return themes


def summarize_text(text: str, max_length: int = 180) -> str:
    clean = normalize_whitespace(text)
    if len(clean) <= max_length:
        return clean
    return clean[: max_length - 1].rstrip() + "…"


def build_dashboard_payload(items: list[EnrichedFeedItem], generated_at: datetime, cached: bool) -> dict[str, Any]:
    sentiment_breakdown = build_sentiment_breakdown(items)
    source_breakdown = build_source_breakdown(items)
    ticker_insights = build_ticker_insights(items, top_n=12)
    theme_insights = build_theme_insights(items, top_n=10)

    return {
        "generatedAt": generated_at.isoformat(),
        "cached": cached,
        "overview": {
            "totalItems": len(items),
            "sentimentIndex": compute_sentiment_index(items),
            "volatilityIndex": compute_volatility_index(items),
            "activeTickers": len({ticker for item in items for ticker in item.tickers}),
            "positiveRatio": ratio(sentiment_breakdown["positive"], len(items)),
            "negativeRatio": ratio(sentiment_breakdown["negative"], len(items)),
            "neutralRatio": ratio(sentiment_breakdown["neutral"], len(items)),
            "marketPulse": describe_market_pulse(items),
            "trendDirection": describe_trend_direction(items),
        },
        "sentiment": sentiment_breakdown,
        "sources": source_breakdown,
        "timeline": build_timeline(items, buckets=10),
        "trending": ticker_insights,
        "themes": theme_insights,
        "narratives": build_narratives(items, limit=8),
        "feedPreview": [serialize_item(item) for item in items[:15]],
    }


def build_sentiment_breakdown(items: list[EnrichedFeedItem]) -> dict[str, int]:
    counts = {"positive": 0, "negative": 0, "neutral": 0}
    for item in items:
        counts[item.sentiment_label] = counts.get(item.sentiment_label, 0) + 1
    return counts


def build_source_breakdown(items: list[EnrichedFeedItem]) -> dict[str, int]:
    counter = Counter(item.source for item in items)
    return {"news": counter.get("news", 0), "reddit": counter.get("reddit", 0)}


def compute_sentiment_index(items: list[EnrichedFeedItem]) -> float:
    if not items:
        return 0.0
    avg = sum(item.sentiment_score for item in items) / len(items)
    return round(avg * 100, 2)


def compute_volatility_index(items: list[EnrichedFeedItem]) -> float:
    if len(items) < 2:
        return 0.0
    std = pstdev(item.sentiment_score for item in items)
    return round(std * 100, 2)


def describe_market_pulse(items: list[EnrichedFeedItem]) -> str:
    index = compute_sentiment_index(items)
    if index >= 22:
        return "Risk-on momentum"
    if index >= 8:
        return "Constructive optimism"
    if index <= -22:
        return "Risk-off pressure"
    if index <= -8:
        return "Defensive tone"
    return "Balanced / mixed"


def describe_trend_direction(items: list[EnrichedFeedItem]) -> str:
    if len(items) < 6:
        return "flat"
    ordered = sorted(items, key=lambda item: item.published_at)
    midpoint = len(ordered) // 2
    first_half = ordered[:midpoint]
    second_half = ordered[midpoint:]
    first_score = sum(item.sentiment_score for item in first_half) / max(1, len(first_half))
    second_score = sum(item.sentiment_score for item in second_half) / max(1, len(second_half))
    delta = second_score - first_score
    if delta > 0.1:
        return "improving"
    if delta < -0.1:
        return "deteriorating"
    return "flat"


def build_timeline(items: list[EnrichedFeedItem], buckets: int = 10) -> list[dict[str, Any]]:
    if not items:
        return []

    ordered = sorted(items, key=lambda item: item.published_at)
    bucket_size = max(1, math.ceil(len(ordered) / buckets))

    timeline = []
    for start in range(0, len(ordered), bucket_size):
        segment = ordered[start : start + bucket_size]
        if not segment:
            continue

        avg_score = sum(item.sentiment_score for item in segment) / len(segment)
        avg_confidence = sum(item.sentiment_confidence for item in segment) / len(segment)
        mentions = len(segment)

        ticker_counter: Counter[str] = Counter()
        for item in segment:
            ticker_counter.update(item.tickers)

        top_ticker = ticker_counter.most_common(1)[0][0] if ticker_counter else ""

        timeline.append(
            {
                "time": segment[-1].published_at.isoformat(),
                "label": segment[-1].published_at.strftime("%b %d %H:%M"),
                "sentiment": round(avg_score * 100, 2),
                "confidence": round(avg_confidence * 100, 2),
                "mentions": mentions,
                "leadTicker": top_ticker,
            }
        )

    return timeline[-buckets:]


def build_ticker_insights(items: list[EnrichedFeedItem], top_n: int = 12) -> list[dict[str, Any]]:
    score_total: defaultdict[str, float] = defaultdict(float)
    mentions: defaultdict[str, int] = defaultdict(int)
    bullish: defaultdict[str, int] = defaultdict(int)
    bearish: defaultdict[str, int] = defaultdict(int)
    neutral: defaultdict[str, int] = defaultdict(int)
    source_mix: defaultdict[str, Counter[str]] = defaultdict(Counter)
    series: defaultdict[str, list[float]] = defaultdict(list)

    for item in items:
        unique_tickers = list(dict.fromkeys(item.tickers))
        if not unique_tickers:
            continue

        for ticker in unique_tickers:
            mentions[ticker] += 1
            score_total[ticker] += item.sentiment_score
            series[ticker].append(item.sentiment_score)
            source_mix[ticker][item.source] += 1
            if item.sentiment_label == "positive":
                bullish[ticker] += 1
            elif item.sentiment_label == "negative":
                bearish[ticker] += 1
            else:
                neutral[ticker] += 1

    rows = []
    for ticker, mention_count in mentions.items():
        avg_sentiment = score_total[ticker] / mention_count
        momentum = compute_momentum(series[ticker])
        hype_score = (mention_count * 6.5) + (abs(avg_sentiment) * 40) + (abs(momentum) * 22)
        row = {
            "ticker": ticker,
            "mentions": mention_count,
            "averageSentiment": round(avg_sentiment * 100, 2),
            "bullish": bullish[ticker],
            "bearish": bearish[ticker],
            "neutral": neutral[ticker],
            "momentum": round(momentum * 100, 2),
            "hypeScore": round(hype_score, 2),
            "sourceMix": dict(source_mix[ticker]),
        }
        rows.append(row)

    rows.sort(key=lambda row: (row["hypeScore"], row["mentions"], abs(row["averageSentiment"])), reverse=True)
    return rows[:top_n]


def build_theme_insights(items: list[EnrichedFeedItem], top_n: int = 10) -> list[dict[str, Any]]:
    counts: Counter[str] = Counter()
    score_totals: defaultdict[str, float] = defaultdict(float)

    for item in items:
        for theme in item.themes:
            counts[theme] += 1
            score_totals[theme] += item.sentiment_score

    rows = []
    for theme, count in counts.most_common(top_n):
        rows.append(
            {
                "theme": theme,
                "mentions": count,
                "averageSentiment": round((score_totals[theme] / count) * 100, 2),
            }
        )
    return rows


def build_narratives(items: list[EnrichedFeedItem], limit: int = 8) -> list[dict[str, Any]]:
    if not items:
        return []

    buckets: defaultdict[str, list[EnrichedFeedItem]] = defaultdict(list)
    for item in items:
        if item.themes:
            for theme in item.themes:
                buckets[theme].append(item)
        else:
            buckets["Macro"].append(item)

    rows = []
    for theme, theme_items in buckets.items():
        avg_sentiment = sum(item.sentiment_score for item in theme_items) / len(theme_items)
        lead = max(theme_items, key=lambda row: abs(row.sentiment_score) * row.sentiment_confidence)
        rows.append(
            {
                "theme": theme,
                "mentions": len(theme_items),
                "sentiment": round(avg_sentiment * 100, 2),
                "headline": lead.title,
                "tickerFocus": lead.tickers[:3],
            }
        )

    rows.sort(key=lambda row: (row["mentions"], abs(row["sentiment"])), reverse=True)
    return rows[:limit]


def compute_momentum(series: list[float]) -> float:
    if len(series) < 3:
        return 0.0
    midpoint = len(series) // 2
    first = series[:midpoint]
    second = series[midpoint:]
    first_avg = sum(first) / len(first)
    second_avg = sum(second) / len(second)
    return max(-1.0, min(1.0, second_avg - first_avg))


def filter_items(
    items: list[EnrichedFeedItem],
    source: str | None,
    sentiment: str | None,
    ticker: str | None,
    q: str | None,
) -> list[EnrichedFeedItem]:
    filtered = items

    if source:
        source_filter = source.strip().lower()
        filtered = [item for item in filtered if item.source == source_filter]

    if sentiment:
        sentiment_filter = sentiment.strip().lower()
        filtered = [item for item in filtered if item.sentiment_label == sentiment_filter]

    if ticker:
        symbol = sanitize_ticker(ticker)
        if symbol:
            filtered = [item for item in filtered if symbol in item.tickers]

    if q:
        query = q.strip().lower()
        filtered = [item for item in filtered if query in item.title.lower() or query in item.text.lower()]

    return filtered


def legacy_item_payload(item: EnrichedFeedItem) -> dict[str, Any]:
    return {
        "id": item.id,
        "title": item.title,
        "url": item.url,
        "date": item.published_at.isoformat(),
        "text": item.text,
    }


def serialize_item(item: EnrichedFeedItem) -> dict[str, Any]:
    return {
        "id": item.id,
        "source": item.source,
        "title": item.title,
        "url": item.url,
        "publishedAt": item.published_at.isoformat(),
        "text": item.text,
        "summary": item.summary,
        "sentiment": {
            "label": item.sentiment_label,
            "score": round(item.sentiment_score * 100, 2),
            "confidence": round(item.sentiment_confidence * 100, 2),
        },
        "tickers": item.tickers,
        "themes": item.themes,
    }


def normalize_whitespace(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def html_to_text(text: str) -> str:
    return normalize_whitespace(BeautifulSoup(text, "html.parser").get_text(" "))


def sanitize_ticker(value: str) -> str:
    token = re.sub(r"[^A-Za-z]", "", value or "").upper()
    if not token or token in TICKER_NOISE or len(token) > 5:
        return ""
    return token


def parse_datetime(value: str) -> datetime:
    if not value:
        return utc_now()

    try:
        parsed = parsedate_to_datetime(value)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)
    except Exception:
        pass

    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)
    except Exception:
        return utc_now()


def ratio(count: int, total: int) -> float:
    if total <= 0:
        return 0.0
    return round((count / total) * 100, 2)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)
