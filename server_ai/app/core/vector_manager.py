import os
import re
from typing import List, Dict, Any, Optional
from app.config import settings

# 10 Resep Terverifikasi Klinis Pola 3J Kemenkes & PERKENI (Kategori Beragam: Kuah, Pepes, Tumis, Sup Ikan, Nabati)
CURATED_3J_RECIPES: List[Dict[str, Any]] = [
    {
        "nama_makanan": "Soto Ayam Kuah Bening Lamongan",
        "kategori": "Resep Masakan 3J - Kuah",
        "kalori": 160, "protein": 20.0, "karbohidrat": 8.0, "lemak": 4.0, "gi_val": 32,
        "keywords": ["soto", "soto ayam", "kuah", "hangat", "bening", "segar", "ayam"],
        "bahan": "Daging dada ayam (100g, suwir), tauge segar, irisan tomat, serai, daun salam, bawang merah, bawang putih, kunyit bakar, temu kunci, kaldu rebusan bening tanpa santan.",
        "langkah": "1. Rebus dada ayam hingga empuk, suwir tipis.\n2. Tumis bumbu kuning halus tanpa minyak jelantah (gunakan sedikit air).\n3. Masukkan kaldu rebusan, didihkan bersama serai dan rempah.\n4. Sajikan hangat dengan tauge dan perasan jeruk nipis.",
        "cara_olah": "Rebus kuah rempah kuning bening tanpa santan & tanpa jelantah",
        "tips": "Kaya kurkumin dari kunyit yang membantu menurunkan resistensi insulin. Bebas santan dan rendah lemak."
    },
    {
        "nama_makanan": "Sayur Bening Bayam Oyong Jagung Manis",
        "kategori": "Resep Masakan 3J - Sayur Kuah",
        "kalori": 65, "protein": 2.8, "karbohidrat": 12.0, "lemak": 0.4, "gi_val": 25,
        "keywords": ["sayur bening", "bayam", "oyong", "gambas", "jagung", "kuah", "hangat", "bening", "segar", "sayur"],
        "bahan": "Daun bayam segar (1 ikat), 1 buah oyong (kupas berserat), 1/2 bonggol jagung manis pipil, 3 siung bawang merah iris, 2 cm temu kunci memar, air 600 ml.",
        "langkah": "1. Didihkan air, masukkan irisan bawang merah dan temu kunci hingga harum.\n2. Masukkan jagung pipil dan oyong, masak 2-3 menit.\n3. Masukkan daun bayam terakhir, masak cepat 1 menit agar klorofil tetap utuh.\n4. Angkat dan sajikan hangat segar.",
        "cara_olah": "Rebus kuah bening temu kunci alami tanpa minyak",
        "tips": "Tinggi magnesium dan serat larut yang efektif memperlambat penyerapan glukosa di usus."
    },
    {
        "nama_makanan": "Sup Dada Ayam Bening Jamur Tiram",
        "kategori": "Resep Masakan 3J - Kuah",
        "kalori": 145, "protein": 22.0, "karbohidrat": 6.0, "lemak": 2.5, "gi_val": 30,
        "keywords": ["sup", "sop", "sup ayam", "sop ayam", "jamur", "wortel", "kuah", "hangat", "ayam"],
        "bahan": "Dada ayam tanpa kulit (100g), jamur tiram (50g), 1 batang wortel iris, seledri, daun bawang, bawang putih cincang, kaldu ayam alami rendah sodium.",
        "langkah": "1. Rebus ayam hingga kaldu bening terbentuk.\n2. Masukkan bawang putih tumis air, irisan wortel, dan jamur tiram.\n3. Beri sedikit merica dan garam, taburi daun seledri sebelum diangkat.",
        "cara_olah": "Rebus kuah kaldu rempah bening rendah lemak",
        "tips": "Jamur tiram kaya beta-glukan penstabil respon insulin postprandial."
    },
    {
        "nama_makanan": "Sup Dada Ayam & Tahu Kukus Bening",
        "kategori": "Resep Masakan 3J - Ayam & Tahu",
        "kalori": 155, "protein": 22.0, "karbohidrat": 4.0, "lemak": 3.5, "gi_val": 25,
        "keywords": ["ayam dan tahu", "ayam tahu", "tahu ayam", "olahan ayam dan tahu", "ayam", "tahu", "sup", "kuah", "hangat", "bening"],
        "bahan": "Dada ayam tanpa kulit (100g, potong dadu), tahu putih kukus (100g, potong dadu), daun bawang, seledri, 3 siung bawang putih cincang, kaldu ayam alami rendah sodium.",
        "langkah": "1. Rebus dada ayam hingga empuk dan kaldu bening terbentuk.\n2. Masukkan bawang putih tumis air dan tahu kukus dadu.\n3. Masak dengan api kecil selama 3 menit agar kaldu meresap ke dalam tahu.\n4. Beri sedikit merica dan garam, taburi seledri lalu sajikan hangat.",
        "cara_olah": "Rebus kuah kaldu rempah bening tanpa minyak",
        "tips": "Paduan protein hewani dan nabati yang sangat padat nutrisi dengan kalori rendah dan indeks glikemik minimal."
    },
    {
        "nama_makanan": "Tumis Ayam Suwir Tahu Bumbu Bawang",
        "kategori": "Resep Masakan 3J - Tumis Sehat",
        "kalori": 165, "protein": 20.0, "karbohidrat": 6.0, "lemak": 4.5, "gi_val": 26,
        "keywords": ["tumis ayam tahu", "ayam dan tahu", "ayam tahu", "tahu ayam", "tumis", "ayam", "tahu"],
        "bahan": "Dada ayam rebus suwir (80g), tahu kukus potong dadu (80g), 3 siung bawang putih cincang, 2 siung bawang merah, cabai merah iris, sedikit air.",
        "langkah": "1. Tumis bawang putih dan merah dengan 2 sdm air hingga wangi.\n2. Masukkan ayam suwir dan tahu dadu, aduk perlahan.\n3. Tambahkan sedikit garam dan lada, masak hingga bumbu meresap.",
        "cara_olah": "Tumis air tanpa minyak jelantah dengan bumbu bawang melimpah",
        "tips": "Tinggi protein dan rendah karbohidrat sederhana, sangat aman bagi respon glukosa."
    },
    {
        "nama_makanan": "Sup Ikan Nila Kuah Asam Segar",
        "kategori": "Resep Masakan 3J - Kuah Ikan",
        "kalori": 175, "protein": 24.0, "karbohidrat": 4.0, "lemak": 3.8, "gi_val": 20,
        "keywords": ["sup ikan", "sop ikan", "ikan", "nila", "kuah asam", "segar", "kuah", "hangat"],
        "bahan": "Fillet ikan nila segar (120g), tomat hijau (2 buah), belimbing wuluh (3 buah), daun kemangi, serai, daun jeruk, jahe, bawang putih, air 500 ml.",
        "langkah": "1. Didihkan air dengan serai, jahe, daun jeruk, dan bawang putih.\n2. Masukkan fillet ikan nila, masak api sedang hingga matang.\n3. Tambahkan belimbing wuluh dan tomat hijau untuk rasa asam segar alami.\n4. Masukkan daun kemangi sesaat sebelum diangkat.",
        "cara_olah": "Rebus kuah asam belimbing wuluh rempah alami",
        "tips": "Omega-3 pada ikan dan asam organik alami meningkatkan sensitivitas insulin perifer."
    },
    {
        "nama_makanan": "Pepes Ikan Mas Daun Kemangi",
        "kategori": "Resep Masakan 3J - Pepes",
        "kalori": 180, "protein": 26.0, "karbohidrat": 2.0, "lemak": 6.5, "gi_val": 0,
        "keywords": ["pepes", "ikan mas", "pepes ikan", "kemangi", "kukus", "ikan"],
        "bahan": "Ikan mas segar (1 ekor sedang ~150g), daun kemangi melimpah, daun pisang pembungkus, bumbu halus (kunyit, kemiri, bawang merah, bawang putih, cabai merah).",
        "langkah": "1. Baluri ikan mas dengan bumbu halus dan daun kemangi.\n2. Bungkus rapat daun pisang, semat kedua ujungnya dengan lidi.\n3. Kukus selama 35 menit hingga bumbu meresap sempurna.",
        "cara_olah": "Kukus bumbu rempah alami berbalut daun pisang",
        "tips": "Teknik pepes mempertahankan protein ikan tanpa oksidasi minyak jelantah."
    },
    {
        "nama_makanan": "Pepes Tahu Jamur Daun Kemangi",
        "kategori": "Resep Masakan 3J - Nabati",
        "kalori": 115, "protein": 11.0, "karbohidrat": 5.0, "lemak": 4.5, "gi_val": 25,
        "keywords": ["pepes tahu", "tahu", "jamur", "kemangi", "kukus", "nabati"],
        "bahan": "Tahu putih (150g haluskan), jamur merang cincang (50g), 1 butir telur ayam ras, daun kemangi, irisan cabai merah, daun pisang.",
        "langkah": "1. Campur tahu halus, jamur, telur, daun kemangi, dan bumbu halus.\n2. Bungkus dengan daun pisang, kukus selama 25 menit hingga matang padat.",
        "cara_olah": "Kukus bumbu rempah daun pisang",
        "tips": "Isoflavon tahu dan serat jamur sangat ramah bagi kendali glikemik jangka panjang."
    },
    {
        "nama_makanan": "Tumis Buncis Tahu Kukus Bumbu Bawang",
        "kategori": "Resep Masakan 3J - Tumis Sehat",
        "kalori": 120, "protein": 11.0, "karbohidrat": 9.0, "lemak": 3.5, "gi_val": 28,
        "keywords": ["tumis", "buncis", "tahu", "tumis buncis", "sayur"],
        "bahan": "Buncis muda (100g potong serong), tahu kukus potong dadu (80g), 3 siung bawang putih cincang, 2 siung bawang merah, sedikit air.",
        "langkah": "1. Tumis bawang putih dan merah dengan sedikit air hingga harum.\n2. Masukkan buncis dan tahu kukus, aduk cepat selama 2-3 menit agar buncis tetap renyah.",
        "cara_olah": "Tumis air tanpa jelantah dengan bawang putih melimpah",
        "tips": "Buncis kaya serat pektin yang memperlambat laju pencernaan karbohidrat."
    },
    {
        "nama_makanan": "Capcay Kuah Bening Sayuran & Dada Ayam",
        "kategori": "Resep Masakan 3J - Kuah Sayur",
        "kalori": 135, "protein": 18.0, "karbohidrat": 7.0, "lemak": 2.8, "gi_val": 28,
        "keywords": ["capcay", "capcay kuah", "sayur campur", "wortel", "brokoli", "kuah", "hangat"],
        "bahan": "Brokoli, kembang kol, wortel, sawi putih, irisan dada ayam (80g), bawang putih geprek, lada putih, kaldu bening.",
        "langkah": "1. Tumis bawang putih hingga wangi, masukkan irisan ayam.\n2. Masukkan kaldu dan sayuran keras (wortel, brokoli), lalu sayuran hijau.\n3. Masak kuah bening segar hingga sayur matang renyah.",
        "cara_olah": "Rebus kuah kaldu sayuran segar aneka serat",
        "tips": "Kombinasi aneka serat sayuran terbukti klinis meningkatkan sensitivitas insulin."
    },
    {
        "nama_makanan": "Orak-Arik Buncis Telur Rebus Rempah",
        "kategori": "Resep Masakan 3J - Telur & Sayur",
        "kalori": 130, "protein": 10.5, "karbohidrat": 6.0, "lemak": 6.0, "gi_val": 27,
        "keywords": ["orak arik", "telur", "buncis", "sayur telur"],
        "bahan": "1 butir telur ayam ras, 100g buncis iris tipis, bawang putih, bawang merah, lada halus, sedikit minyak kelapa murni.",
        "langkah": "1. Tumis bawang putih dan merah hingga harum.\n2. Masukkan irisan buncis, aduk rata.\n3. Masukkan telur, orak-arik cepat hingga matang berserat.",
        "cara_olah": "Orak-arik cepat dengan bumbu rempah sederhana",
        "tips": "Paduan protein telur dan serat buncis menjaga kurva gula darah tetap datar."
    },
    {
        "nama_makanan": "Nasi Beras Merah Pulen",
        "kategori": "Resep Masakan 3J - Pokok",
        "kalori": 149, "protein": 2.8, "karbohidrat": 32.5, "lemak": 0.4, "gi_val": 47,
        "keywords": ["nasi merah", "beras merah", "pulen", "karbohidrat kompleks"],
        "bahan": "100g beras merah pulen, air bersih, daun pandan.",
        "langkah": "1. Cuci beras merah, rendam 20 menit agar pulen.\n2. Kukus aron bersama daun pandan hingga matang pulen dan wangi.",
        "cara_olah": "Kukus aron pulen kaya serat penstabil glukosa",
        "tips": "Beras merah memiliki Indeks Glikemik rendah yang mencegah lonjakan gula setelah makan."
    }
]

class ClinicalVectorStoreManager:
    """Manajer penelusuran semantik dokumen panduan PERKENI 2021 dan resep masakan berbasis RAG."""

    def __init__(self):
        self.medical_file = os.path.join(settings.KNOWLEDGE_BASE_DIR, "medical", "diabetes_nutrition_guidelines.md")
        self.recipes_file = os.path.join(settings.KNOWLEDGE_BASE_DIR, "recipes", "recipes_all.md")
        self._guidelines_chunks: List[Dict[str, str]] = []
        self._recipes_catalog: List[Dict[str, Any]] = list(CURATED_3J_RECIPES)
        self._load_and_chunk_documents()

    def _load_and_chunk_documents(self):
        chunks = []
        # 1. Baca pedoman medis
        if os.path.exists(self.medical_file):
            try:
                with open(self.medical_file, "r", encoding="utf-8") as f:
                    content = f.read()
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
                    for rec in recipes:
                        if rec.strip():
                            lines = rec.strip().split("\n")
                            title = lines[0].replace("##", "").strip()
                            chunks.append({
                                "title": f"Resep Nusantara: {title}",
                                "text": rec.strip()[:600],
                                "category": "recipe"
                            })
            except Exception as e:
                print(f"[Vector Manager] Gagal membaca recipes: {e}")

        self._guidelines_chunks = chunks

    def query_semantic(self, query: str, n_results: int = 3) -> List[Dict[str, Any]]:
        """Pencarian semantik cepat dokumen pedoman klinis berbasis kata kunci & relevansi."""
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

        if not results and self._guidelines_chunks:
            results.append({
                "document": self._guidelines_chunks[0]["text"][:500],
                "metadata": {"title": self._guidelines_chunks[0]["title"], "category": "medical"}
            })

        return results

    def query_recipes(
        self,
        query: str,
        exclude_titles: Optional[List[str]] = None,
        user_allergens: Optional[List[str]] = None,
        context_theme: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Pencarian resep masakan dinamis anti-looping:
        - Mengecualikan resep yang sudah pernah disarankan di percakapan sesi ini (exclude_titles).
        - Mengecualikan resep yang mengandung bahan pantangan alergi pasien (user_allergens).
        - Mencocokkan tema (berkuah, hangat, ikan, ayam, tumis, dll.).
        """
        excluded = [t.lower().strip() for t in (exclude_titles or []) if t]
        allergens = [a.lower().strip() for a in (user_allergens or []) if a]

        # Gabungkan query dengan tema sebelumnya jika follow-up ("ada yang lain?", "selain itu?")
        full_query = f"{query or ''} {context_theme or ''}".lower()
        query_words = [w for w in re.findall(r'\w+', full_query) if len(w) > 2]

        candidates = []
        for r in self._recipes_catalog:
            title_lower = r["nama_makanan"].lower()

            # 1. Anti-Looping: Lewati jika judul resep ini sudah pernah disarankan
            if any(ex in title_lower or title_lower in ex for ex in excluded):
                continue

            # 2. Guardrail Alergen: Lewati jika mengandung alergen pasien
            r_text = f"{r['nama_makanan']} {r.get('bahan', '')} {r.get('keywords', [])}".lower()
            if any(alg in r_text for alg in allergens):
                continue

            # 3. Hitung skor relevansi terhadap query
            score = 0
            for kw in r.get("keywords", []):
                if kw in full_query:
                    score += 6
            for w in query_words:
                if w in r_text:
                    score += 2

            # Bonus besar jika pasien menyebutkan bahan majemuk (misal 'ayam dan tahu', 'ikan dan kemangi')
            key_ingredients = ["ayam", "tahu", "tempe", "ikan", "telur", "buncis", "bayam", "oyong", "jagung", "jamur"]
            mentioned_ingredients = [ing for ing in key_ingredients if ing in full_query]
            if len(mentioned_ingredients) >= 2:
                if all(ing in r_text for ing in mentioned_ingredients):
                    score += 25
            elif len(mentioned_ingredients) == 1:
                if mentioned_ingredients[0] in r_text:
                    score += 10

            candidates.append((score, r))

        if not candidates:
            # Jika semua kandidat habis atau ter-exclude, reset exclude dan ambil yang belum sama persis dengan yang terakhir
            for r in self._recipes_catalog:
                r_text = f"{r['nama_makanan']} {r.get('bahan', '')}".lower()
                if not any(alg in r_text for alg in allergens):
                    if not excluded or r["nama_makanan"].lower() != excluded[-1]:
                        return dict(r)
            return dict(self._recipes_catalog[0])

        # Urutkan berdasarkan skor tertinggi
        candidates.sort(key=lambda x: x[0], reverse=True)
        return dict(candidates[0][1])

vector_manager = ClinicalVectorStoreManager()
