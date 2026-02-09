#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import math
import re
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from html import unescape
from pathlib import Path
from statistics import pstdev
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET

NEWS_RSS_URL = "https://finance.yahoo.com/news/rssindex"
REDDIT_RSS_URL = "https://www.reddit.com/r/wallstreetbets/.rss"
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
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
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


def fetch_url(url: str) -> str:
    request = Request(url, headers=RSS_HEADERS)
    try:
        with urlopen(request, timeout=15) as response:
            return response.read().decode("utf-8", errors="replace")
    except (HTTPError, URLError, TimeoutError):
        return ""


def parse_news_feed(xml: str) -> list[RawFeedItem]:
    if not xml.strip():
        return []

    try:
        root = ET.fromstring(xml)
    except ET.ParseError:
        return []

    rows: list[RawFeedItem] = []
    for item in root.findall(".//item")[:80]:
        title = normalize_whitespace(text_of(item.find("title"))) or "Untitled"
        description = html_to_text(text_of(item.find("description")))
        link = normalize_whitespace(text_of(item.find("link")))
        published_at = parse_datetime(text_of(item.find("pubDate")))
        text = normalize_whitespace(f"{title}. {description}".strip(". "))
        if not text:
            continue
        rows.append(
            RawFeedItem(
                id=f"news-{stable_hash(title + link)}",
                source="news",
                title=title,
                url=link,
                published_at=published_at,
                text=text,
            )
        )
    return rows


def parse_reddit_feed(xml: str) -> list[RawFeedItem]:
    if not xml.strip():
        return []

    try:
        root = ET.fromstring(xml)
    except ET.ParseError:
        return []

    ns = {"atom": "http://www.w3.org/2005/Atom"}
    entries = root.findall(".//atom:entry", ns)
    if not entries:
        entries = root.findall(".//entry")

    rows: list[RawFeedItem] = []
    for entry in entries[:80]:
        title = normalize_whitespace(text_of(entry.find("atom:title", ns) or entry.find("title"))) or "Untitled"
        content = html_to_text(text_of(entry.find("atom:content", ns) or entry.find("content")))

        link = ""
        links = entry.findall("atom:link", ns) + entry.findall("link")
        for link_node in links:
            href = normalize_whitespace(link_node.attrib.get("href", ""))
            if href:
                link = href
                break

        published_at = parse_datetime(text_of(entry.find("atom:updated", ns) or entry.find("updated")))
        text = normalize_whitespace(f"{title}. {content}".strip(". "))
        if not text:
            continue

        rows.append(
            RawFeedItem(
                id=f"reddit-{stable_hash(title + link)}",
                source="reddit",
                title=title,
                url=link,
                published_at=published_at,
                text=text,
            )
        )
    return rows


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

    rows = []
    for row in seed:
        rows.append(
            RawFeedItem(
                id=f"fallback-{stable_hash(row['title'])}",
                source=row["source"],
                title=row["title"],
                url=row["url"],
                published_at=now - timedelta(minutes=int(row["minutes"])),
                text=row["text"],
            )
        )
    return rows


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
    return clean[: max_length - 1].rstrip() + "..."


def build_dashboard_payload(items: list[EnrichedFeedItem], generated_at: datetime) -> dict[str, Any]:
    sentiment_breakdown = build_sentiment_breakdown(items)
    source_breakdown = build_source_breakdown(items)
    ticker_insights = build_ticker_insights(items, top_n=12)
    theme_insights = build_theme_insights(items, top_n=10)

    return {
        "generatedAt": generated_at.isoformat(),
        "cached": True,
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
    clean = re.sub(r"<[^>]+>", " ", text or "")
    return normalize_whitespace(unescape(clean))


def text_of(element: ET.Element | None) -> str:
    if element is None:
        return ""
    return "".join(element.itertext()).strip()


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


def stable_hash(value: str) -> str:
    cleaned = value.encode("utf-8", errors="ignore")
    acc = 2166136261
    for byte in cleaned:
        acc ^= byte
        acc *= 16777619
        acc &= 0xFFFFFFFF
    return f"{acc:08x}"


def build_snapshot() -> dict[str, Any]:
    news_xml = fetch_url(NEWS_RSS_URL)
    reddit_xml = fetch_url(REDDIT_RSS_URL)

    raw_items = parse_news_feed(news_xml) + parse_reddit_feed(reddit_xml)
    if not raw_items:
        raw_items = fallback_items()

    enriched_items = [enrich_item(item) for item in raw_items]
    enriched_items.sort(key=lambda row: row.published_at, reverse=True)
    enriched_items = enriched_items[:MAX_ITEMS]

    generated_at = utc_now()
    dashboard = build_dashboard_payload(enriched_items, generated_at)

    return {
        "generatedAt": generated_at.isoformat(),
        "dashboard": dashboard,
        "feed": [serialize_item(item) for item in enriched_items],
        "tickerIndex": build_ticker_insights(enriched_items, top_n=250),
        "meta": {
            "source": "rss" if news_xml or reddit_xml else "fallback",
            "itemCount": len(enriched_items),
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate static dashboard snapshot for GitHub Pages")
    parser.add_argument(
        "--output",
        default="stock-sentiment-frontend/data/snapshot.json",
        help="Output JSON path",
    )
    args = parser.parse_args()

    payload = build_snapshot()
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote snapshot to {output_path} with {payload['meta']['itemCount']} items", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
