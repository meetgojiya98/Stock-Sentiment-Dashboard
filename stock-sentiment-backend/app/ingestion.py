import aiohttp
from bs4 import BeautifulSoup
import uuid

NEWS_RSS_URL = "https://finance.yahoo.com/news/rssindex"
REDDIT_RSS_URL = "https://www.reddit.com/r/wallstreetbets/.rss"

async def fetch_rss(url):
    async with aiohttp.ClientSession() as session:
        async with session.get(url, headers={"User-Agent": "Mozilla/5.0"}) as response:
            return await response.text()

async def fetch_news():
    rss_xml = await fetch_rss(NEWS_RSS_URL)
    soup = BeautifulSoup(rss_xml, "lxml-xml")
    items = soup.find_all("item")
    news_list = []
    for item in items[:20]:
        title = item.title.text if item.title else ""
        description = item.description.text if item.description else ""
        text = f"{title}. {description}".strip(". ")
        news_list.append({
            "id": str(uuid.uuid4()),
            "text": text
        })
    return news_list

async def fetch_reddit_posts():
    rss_xml = await fetch_rss(REDDIT_RSS_URL)
    soup = BeautifulSoup(rss_xml, "xml")
    items = soup.find_all("entry")
    reddit_list = []
    for item in items[:20]:
        title = item.title.text if item.title else ""
        content = item.content.text if item.content else ""
        text = f"{title}. {content}".strip(". ")
        reddit_list.append({
            "id": str(uuid.uuid4()),
            "text": text
        })
    return reddit_list
