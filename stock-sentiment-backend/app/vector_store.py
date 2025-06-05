import faiss
import numpy as np
from app.sentiment import get_sentiment

class VectorStore:
    def __init__(self):
        self.texts = []
        self.ids = []
        self.sentiments = []
        self.entities = []
        self.dim = 512
        self.index = faiss.IndexFlatL2(self.dim)
        self.embeddings = []

    def add(self, id_, text, sentiment, entities):
        embedding = self._dummy_embed(text)
        self.index.add(np.array([embedding]).astype('float32'))
        self.ids.append(id_)
        self.texts.append(text)
        self.sentiments.append(sentiment)
        self.entities.append(entities)
        self.embeddings.append(embedding)

    def _dummy_embed(self, text):
        # Dummy embedding: hash mod some range to vector of fixed dim
        vec = np.zeros(self.dim, dtype=np.float32)
        h = hash(text) % (10**8)
        vec[0] = h % 1000 / 1000
        vec[1] = (h // 1000) % 1000 / 1000
        return vec

    def get_sentiment_summary(self):
        # Aggregate sentiment counts per label
        summary = {"POSITIVE": 0, "NEGATIVE": 0, "NEUTRAL": 0}
        for sent in self.sentiments:
            label = sent.get("label")
            if label in summary:
                summary[label] += 1
            else:
                summary["NEUTRAL"] += 1
        return summary

    def get_top_entities(self, top_k=10):
        from collections import Counter
        all_entities = [e for sublist in self.entities for e in sublist]
        counter = Counter(all_entities)
        return counter.most_common(top_k)
