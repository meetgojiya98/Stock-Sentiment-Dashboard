from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import aiohttp
from bs4 import BeautifulSoup
import uuid
from collections import Counter
import re

app = FastAPI()

@app.get("/")
async def root():
    return {"message": "Stock Sentiment Backend is up and running!"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://stock-sentiment-frontend.vercel.app"],
    allow_methods=["*"],
    allow_headers=["*"],
)

YAHOO_FINANCE_NEWS_RSS = "https://finance.yahoo.com/news/rssindex"
REDDIT_WSB_RSS = "https://www.reddit.com/r/wallstreetbets/.rss"

def extract_tickers(text):
    # Simple regex to extract all uppercase words of length 1-5 (basic stock tickers)
    return re.findall(r"\b[A-Z]{1,5}\b", text)

async def fetch_rss(url):
    async with aiohttp.ClientSession() as session:
        async with session.get(url, headers={"User-Agent": "Mozilla/5.0"}) as resp:
            return await resp.text()

@app.get("/api/news")
async def get_news():
    rss_xml = await fetch_rss(YAHOO_FINANCE_NEWS_RSS)
    soup = BeautifulSoup(rss_xml, "xml")
    items = soup.find_all("item")[:20]
    news_list = []
    for item in items:
        title = item.title.text if item.title else "No title"
        url = item.link.text if item.link else ""
        date = item.pubDate.text if item.pubDate else ""
        description = item.description.text if item.description else ""
        text = f"{title} {description}"

        news_list.append({
            "id": str(uuid.uuid4()),
            "title": title,
            "url": url,
            "date": date,
            "text": text,
        })
    return news_list

@app.get("/api/reddit")
async def get_reddit():
    rss_xml = await fetch_rss(REDDIT_WSB_RSS)
    soup = BeautifulSoup(rss_xml, "xml")
    entries = soup.find_all("entry")[:20]
    reddit_list = []
    for entry in entries:
        title = entry.title.text if entry.title else "No title"
        url = entry.link['href'] if entry.link and entry.link.has_attr('href') else ""
        date = entry.updated.text if entry.updated else ""
        content = entry.content.text if entry.content else ""
        text = f"{title} {content}"

        reddit_list.append({
            "id": str(uuid.uuid4()),
            "title": title,
            "url": url,
            "date": date,
            "text": text,
        })
    return reddit_list

@app.get("/api/sentiment")
async def get_sentiment():
    news = await get_news()
    reddit = await get_reddit()
    combined_texts = [item["text"].lower() for item in news + reddit]

    positive = sum(1 for t in combined_texts if any(w in t for w in ["up", "gain", "positive", "bull", "win"]))
    negative = sum(1 for t in combined_texts if any(w in t for w in ["down", "loss", "negative", "bear", "sell"]))
    neutral = len(combined_texts) - positive - negative

    return [
        {"sentiment": "POSITIVE", "count": positive},
        {"sentiment": "NEGATIVE", "count": negative},
        {"sentiment": "NEUTRAL", "count": neutral},
    ]

@app.get("/api/trending-stocks")
async def get_trending_stocks():
    news = await get_news()
    reddit = await get_reddit()
    combined_texts = [item["text"] for item in news + reddit]

    tickers = []
    for text in combined_texts:
        tickers.extend(extract_tickers(text))

    counter = Counter(tickers)
    trending = [{"ticker": k, "count": v} for k, v in counter.most_common() if v > 1]

    return trending
