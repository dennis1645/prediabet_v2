import os
import re
from typing import List, Dict, Any, Optional
from app.config import settings

class ClinicalVectorStoreManager:
    """Manajer penelusuran semantik dokumen panduan PERKENI 2021 dan resep masakan."""

    def __init__(self):
        self.medical_file = os.path.join(settings.KNOWLEDGE_BASE_DIR, "medical", "diabetes_nutrition_guidelines.md")
        self.recipes_file = os.path.join(settings.KNOWLEDGE_BASE_DIR, "recipes", "recipes_all.md")
        self._guidelines_chunks: List[Dict[str, str]] = []
        self._load_and_chunk_documents()

    def _load_and_chunk_documents(self):
        chunks = []
        # 1. Baca pedoman medis
        if os.path.exists(self.medical_file):
            try:
                with open(self.medical_file, "r", encoding="utf-8") as f:
                    content = f.read()
                    # Pisahkan berdasarkan heading ##
                    sections = re.split(r'\n(?=##\s+)', content)
                    for sec in sections:
                        if sec.strip():
                            lines = sec.strip().split("\n")
                            title = lines[0].replace("##", "").strip()
                            chunks.append({
                                "title": f"Pedoman PERKENI: {title}",
                                "text": sec.strip(),
                                "category": "medical"
                            })
            except Exception as e:
                print(f"[Vector Manager] Gagal membaca guidelines: {e}")

        # 2. Baca resep
        if os.path.exists(self.recipes_file):
            try:
                with open(self.recipes_file, "r", encoding="utf-8") as f:
                    content = f.read()
                    recipes = re.split(r'\n(?=##\s+)', content)
                    for rec in recipes[:40]:  # Simpan 40 resep unggulan
                        if rec.strip():
                            lines = rec.strip().split("\n")
                            title = lines[0].replace("##", "").strip()
                            chunks.append({
                                "title": f"Resep Nusantara: {title}",
                                "text": rec.strip()[:600],  # Ringkas 600 karakter
                                "category": "recipe"
                            })
            except Exception as e:
                print(f"[Vector Manager] Gagal membaca recipes: {e}")

        self._guidelines_chunks = chunks

    def query_semantic(self, query: str, n_results: int = 3) -> List[Dict[str, Any]]:
        """Pencarian semantik cepat berbasis TF/Keyword density (Microsecond response)."""
        if not self._guidelines_chunks:
            return []

        words = [w.lower() for w in re.findall(r'\w+', query) if len(w) > 2]
        scored = []

        for chunk in self._guidelines_chunks:
            text_lower = chunk["text"].lower()
            score = 0
            for w in words:
                if w in text_lower:
                    score += text_lower.count(w)
            if score > 0:
                scored.append((score, chunk))

        scored.sort(key=lambda x: x[0], reverse=True)
        results = []
        for s, c in scored[:n_results]:
            results.append({
                "document": c["text"],
                "metadata": {"title": c["title"], "category": c["category"]}
            })

        # Fallback jika query tidak ada kata kunci yang cocok persis
        if not results and self._guidelines_chunks:
            results.append({
                "document": self._guidelines_chunks[0]["text"][:500],
                "metadata": {"title": self._guidelines_chunks[0]["title"], "category": "medical"}
            })

        return results

vector_manager = ClinicalVectorStoreManager()
