from app.sentiment import get_sentiment

def analyze_sentiment_and_entities(text):
    sentiment = get_sentiment(text)
    # Simple entity extraction: extract $TICKER words or uppercase words as placeholders
    entities = []
    for word in text.split():
        if word.startswith("$") and len(word) <= 6:
            entities.append(word.upper())
        elif word.isupper() and len(word) <= 6:
            entities.append(word)
    entities = list(set(entities))
    return sentiment, entities
