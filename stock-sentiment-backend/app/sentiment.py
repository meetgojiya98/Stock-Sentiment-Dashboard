from transformers import pipeline

# Load sentiment-analysis pipeline once (small model)
sentiment_pipeline = pipeline("sentiment-analysis")

def get_sentiment(text):
    result = sentiment_pipeline(text[:512])[0]  # limit input size
    label = result["label"]
    score = result["score"]
    return {"label": label, "score": score}
