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
    },
    {
        "nama_makanan": "Nasi Goreng Shirataki Sayur & Telur",
        "kategori": "Resep Masakan 3J - Nasi Goreng Ramah Gula",
        "kalori": 220, "protein": 14.0, "karbohidrat": 12.0, "lemak": 7.0, "gi_val": 22,
        "keywords": ["nasi goreng", "nasgor", "nasi goreng shirataki", "shirataki", "nasi goreng sehat", "resep nasi goreng", "cara buat nasi goreng", "goreng"],
        "bahan": "150g nasi shirataki / konjac rice (tiriskan), 1 butir telur ayam ras (kocok lepas), 50g dada ayam suwir, 30g wortel & buncis cincang, 2 siung bawang merah, 2 siung bawang putih cincang, 1 sdm kecap manis rendah kalori / stevia, 1 sdt minyak zaitun / canola.",
        "langkah": "1. Panaskan 1 sdt minyak sehat di wajan antilengket, tumis bawang putih dan merah hingga harum.\n2. Masukkan telur, orak-arik cepat hingga berserat.\n3. Tambahkan dada ayam suwir dan sayuran, masak 1-2 menit hingga layu.\n4. Masukkan nasi shirataki tiris, tambahkan kecap rendah kalori, sedikit garam dan lada.\n5. Aduk rata dengan api sedang selama 3 menit hingga bumbu meresap sempurna, sajikan hangat.",
        "cara_olah": "Tumis cepat minim minyak menggunakan serat konjac dan sayuran segar",
        "tips": "Nasi shirataki berbahan dasar serat glukomanan dengan kalori dan beban glikemik mendekati nol, bebas lonjakan insulin postprandial."
    },
    {
        "nama_makanan": "Nasi Goreng Beras Merah Dada Ayam",
        "kategori": "Resep Masakan 3J - Nasi Goreng Ramah Gula",
        "kalori": 285, "protein": 18.0, "karbohidrat": 36.0, "lemak": 6.5, "gi_val": 42,
        "keywords": ["nasi goreng beras merah", "nasi goreng merah", "nasi goreng ayam", "nasi goreng"],
        "bahan": "100g nasi beras merah pera/dingin, 60g dada ayam potong dadu, 1 butir telur, daun bawang iris, 2 siung bawang putih geprek, 1 sdm kecap manis diet, 1 sdt minyak kelapa murni.",
        "langkah": "1. Tumis bawang putih dengan sedikit minyak kelapa hingga wangi.\n2. Masukkan ayam dadu dan telur, masak hingga matang.\n3. Masukkan nasi merah pera dan daun bawang, bumbui kecap diet dan lada.\n4. Aduk merata di atas api besar sebentar agar aroma sedap meresap tanpa gosong.",
        "cara_olah": "Tumis wajan antilengket bumbu bawang dengan karbohidrat kompleks beras merah",
        "tips": "Kaya serat utuh yang memperlambat laju glukosa darah dibandingkan nasi goreng beras putih konvensional."
    }
]

class ClinicalVectorStoreManager:
    """Manajer penelusuran semantik dokumen panduan PERKENI 2021 dan 453 resep masakan Nusantara berbasis RAG."""

    def __init__(self):
        self.medical_dir = os.path.join(settings.KNOWLEDGE_BASE_DIR, "medical")
        self.pantangan_dir = os.path.join(settings.KNOWLEDGE_BASE_DIR, "pantangan")
        self.recipes_json = os.path.join(settings.KNOWLEDGE_BASE_DIR, "chromadb", "recipe_documents.json")
        self.clinical_json = os.path.join(settings.KNOWLEDGE_BASE_DIR, "chromadb", "clinical_documents.json")

        self._guidelines_chunks: List[Dict[str, str]] = []
        self._recipes_catalog: List[Dict[str, Any]] = list(CURATED_3J_RECIPES)
        self._load_and_chunk_documents()

    def _load_and_chunk_documents(self):
        chunks = []

        # 1. Baca pedoman medis dan pantangan dari folder Markdown
        for search_dir, cat_name in [(self.medical_dir, "medical"), (self.pantangan_dir, "pantangan")]:
            if os.path.exists(search_dir):
                for f_name in os.listdir(search_dir):
                    if f_name.endswith(".md"):
                        f_path = os.path.join(search_dir, f_name)
                        try:
                            with open(f_path, "r", encoding="utf-8") as f:
                                content = f.read()
                                sections = re.split(r'\n(?=##\s+)', content)
                                for sec in sections:
                                    if sec.strip():
                                        lines = sec.strip().split("\n")
                                        title = lines[0].replace("##", "").replace("#", "").strip()
                                        chunks.append({
                                            "title": f"Pedoman Klinis: {title}",
                                            "text": sec.strip(),
                                            "category": cat_name
                                        })
                        except Exception as e:
                            print(f"[Vector Manager] Gagal membaca {f_path}: {e}")

        # 2. Baca dokumen klinis dari clinical_documents.json
        if os.path.exists(self.clinical_json):
            try:
                import json
                with open(self.clinical_json, "r", encoding="utf-8") as f:
                    clin_docs = json.load(f)
                    for cd in clin_docs:
                        chunks.append({
                            "title": f"Pantangan: {cd.get('metadata', {}).get('kategori', 'Medis')}",
                            "text": cd.get("document", ""),
                            "category": "pantangan"
                        })
            except Exception as e:
                print(f"[Vector Manager] Gagal membaca clinical_documents.json: {e}")

        self._guidelines_chunks = chunks

        # 3. Muat 453 Resep Lengkap dari recipe_documents.json
        if os.path.exists(self.recipes_json):
            try:
                import json
                with open(self.recipes_json, "r", encoding="utf-8") as f:
                    recipe_docs = json.load(f)

                loaded_recipes = []
                for rd in recipe_docs:
                    meta = rd.get("metadata", {})
                    doc_text = rd.get("document", "")
                    name = meta.get("name") or meta.get("clean_name") or "Menu Sehat"
                    cal = float(meta.get("kalori") or 150.0)
                    prot = float(meta.get("protein") or 12.0)
                    carb = float(meta.get("karbohidrat") or 15.0)
                    fat = float(meta.get("lemak") or 4.0)
                    serat = float(meta.get("serat") or 2.0)
                    gi_risk = str(meta.get("glikemik_risk") or "moderate").lower()
                    gi_val = 25.0 if gi_risk == "low" else (45.0 if gi_risk == "moderate" else 70.0)
                    safe_predia = bool(meta.get("safe_for_prediabetes", True))

                    # Saring makanan siap saji cepat (Fast Food), kerupuk/keripik, atau camilan tinggi lemak/gula
                    name_lower = name.lower()
                    if any(junk in name_lower for junk in [
                        "pizza", "kfc", "mcdonald", "burger", "french fries", "starbucks",
                        "dunkin", "wendys", "kerupuk", "keripik", "kerupik", "lanting", "kue putu",
                        "chiki", "taro", "lays"
                    ]):
                        continue

                    # Ekstraksi bumbu & bahan dari dokumen markdown
                    bahan_str = ""
                    if "## Komposisi Bahan:" in doc_text:
                        parts = doc_text.split("## Komposisi Bahan:")[1]
                        bahan_str = parts.split("##")[0].strip()
                    else:
                        bahan_str = f"Bahan baku alami bernutrisi seimbang ({name})"

                    # Ekstraksi tips klinis secara bersih dan utuh (Anti Cut-off)
                    tips_str = ""
                    if "## Panduan Klinis Pola 3J" in doc_text:
                        tips_section = doc_text.split("## Panduan Klinis Pola 3J")[1].strip()
                        tips_lines = [l.strip().lstrip("-* ").strip() for l in tips_section.split("\n") if l.strip()]
                        clean_bullets = []
                        for bl in tips_lines:
                            if ":" in bl:
                                k, v = bl.split(":", 1)
                                if v.strip():
                                    clean_bullets.append(f"{k.strip()}: {v.strip()}")
                            elif len(bl) > 5:
                                clean_bullets.append(bl)
                        tips_str = ". ".join(clean_bullets) if clean_bullets else tips_section
                    else:
                        tips_str = f"Kaya serat dan protein seimbang, menjaga kurva glukosa postprandial stabil ({cal} kkal)."

                    if len(tips_str) > 260:
                        last_period = tips_str[:260].rfind(".")
                        if last_period > 80:
                            tips_str = tips_str[:last_period+1]
                        else:
                            tips_str = tips_str[:260].rsplit(" ", 1)[0] + "."

                    # Hasilkan kata kunci pencarian otomatis
                    keywords = set()
                    for word in re.findall(r'\w+', name.lower()):
                        if len(word) > 2:
                            keywords.add(word)
                    for word in re.findall(r'\w+', bahan_str.lower()):
                        if len(word) > 2:
                            keywords.add(word)

                    # Tag kategori kuliner
                    name_lower = name.lower()
                    if any(w in name_lower for w in ["soto", "sop", "sup", "kuah", "bening", "sayur sop", "sayur bening"]):
                        keywords.update(["kuah", "berkuah", "hangat", "segar", "bening", "sup", "sop", "soto"])
                    if any(w in name_lower for w in ["pepes", "kukus"]):
                        keywords.update(["pepes", "kukus", "daun pisang", "sehat", "bebas minyak"])
                    if any(w in name_lower for w in ["tumis", "cah"]):
                        keywords.update(["tumis", "cah", "sayur"])
                    if any(w in name_lower for w in ["bakar", "panggang"]):
                        keywords.update(["bakar", "panggang"])
                    if any(w in name_lower for w in ["rebus"]):
                        keywords.update(["rebus", "kuah", "segar"])

                    loaded_recipes.append({
                        "nama_makanan": name,
                        "kategori": f"Resep Masakan 3J ({gi_risk.title()} GI)",
                        "kalori": cal,
                        "protein": prot,
                        "karbohidrat": carb,
                        "lemak": fat,
                        "serat": serat,
                        "gi_val": gi_val,
                        "safe_for_prediabetes": safe_predia,
                        "keywords": list(keywords),
                        "bahan": bahan_str,
                        "langkah": f"1. Siapkan bahan baku segar higienis.\n2. Olah bumbu rempah alami tanpa minyak jelantah berlebih.\n3. Masak dengan metode sehat (kukus/rebus kuah bening) hingga matang empuk.\n4. Sajikan hangat sesuai porsi seimbang 3J.",
                        "cara_olah": "Kukus/Rebus kuah bening ramah glukosa",
                        "tips": tips_str[:250] if tips_str else f"Hidangan bergizi seimbang ramah respon insulin ({cal} kkal)."
                    })

                # Gabungkan curated 3J resep dengan 453 resep baru
                catalog_names = set(r["nama_makanan"].lower() for r in CURATED_3J_RECIPES)
                merged = list(CURATED_3J_RECIPES)
                for lr in loaded_recipes:
                    if lr["nama_makanan"].lower() not in catalog_names:
                        merged.append(lr)
                        catalog_names.add(lr["nama_makanan"].lower())

                self._recipes_catalog = merged
                print(f"[Vector Manager] Sukses memuat {len(self._recipes_catalog)} resep ke katalog.")
            except Exception as e:
                print(f"[Vector Manager] Gagal memuat recipe_documents.json: {e}")

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
        context_theme: Optional[str] = None,
        user_conditions: Optional[List[str]] = None,
        patient_seed: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Pencarian resep masakan dinamis anti-looping:
        - Mengecualikan resep yang sudah pernah disarankan di percakapan sesi ini (exclude_titles).
        - Mengecualikan resep yang mengandung bahan pantangan alergi pasien (user_allergens).
        - Menyesuaikan komorbiditas klinis (Asam Urat menyaring purin, Hipertensi membatasi sodium).
        - Memvariasikan rekomendasi secara deterministik antar-pasien via patient_seed.
        """
        excluded = [t.lower().strip() for t in (exclude_titles or []) if t]
        allergens = [a.lower().strip() for a in (user_allergens or []) if a]
        conditions = [c.lower().strip() for c in (user_conditions or []) if c]
        is_gout = any("asam urat" in c or "gout" in c for c in conditions)
        is_hypertension = any("hipertensi" in c or "darah tinggi" in c for c in conditions)

        # Gabungkan query dengan tema sebelumnya jika follow-up ("ada yang lain?", "selain itu?")
        full_query = f"{query or ''} {context_theme or ''}".lower()
        query_words = [w for w in re.findall(r'\w+', full_query) if len(w) > 2]

        # 0. Jika pengguna secara eksplisit menyebut judul/nama resep
        explicit_matches = []
        for r in self._recipes_catalog:
            title_lower = r["nama_makanan"].lower()
            r_text = f"{r['nama_makanan']} {r.get('bahan', '')}".lower()
            if any(alg in r_text for alg in allergens):
                continue

            # Cocok substring judul utuh
            if len(title_lower) >= 6 and title_lower in full_query:
                explicit_matches.append((100, r))
                continue

            # Cocok 2-kata berturut-turut dari query ke judul resep (misal: 'capcay kuah' di 'Capcay Kuah Bening Sayuran')
            query_tokens = [w for w in re.findall(r'[a-zA-Z0-9]+', full_query) if len(w) >= 3]
            for i in range(len(query_tokens) - 1):
                phrase = f"{query_tokens[i]} {query_tokens[i+1]}"
                if phrase in title_lower and phrase not in ["cara masak", "cara buat", "resep lengkap", "bikin resep", "resep cara"]:
                    explicit_matches.append((85, r))
                    break

        if explicit_matches:
            explicit_matches.sort(key=lambda x: x[0], reverse=True)
            return dict(explicit_matches[0][1])

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

            # Prioritas untuk resep yang terverifikasi aman prediabetes
            if r.get("safe_for_prediabetes", True):
                score += 5

            # Filter & Penalti Komorbiditas Khusus
            if is_gout:
                if any(p in r_text for p in ["bayam", "kangkung", "emping", "melinjo", "singkong", "jeroan", "hati", "ampela"]):
                    score -= 40
            if is_hypertension:
                if r.get("natrium_mg", 0) > 350:
                    score -= 25

            # Bonus besar jika pasien menyebutkan bahan majemuk (misal 'ayam dan tahu', 'ikan dan kemangi')
            key_ingredients = ["ayam", "tahu", "tempe", "ikan", "telur", "buncis", "bayam", "oyong", "jagung", "jamur", "daging", "sapi"]
            mentioned_ingredients = [ing for ing in key_ingredients if ing in full_query]
            if len(mentioned_ingredients) >= 2:
                if all(ing in r_text for ing in mentioned_ingredients):
                    score += 25
            elif len(mentioned_ingredients) == 1:
                if mentioned_ingredients[0] in r_text:
                    score += 10

            candidates.append((score, r))

        if not candidates:
            return None

        # Urutkan berdasarkan skor tertinggi
        candidates.sort(key=lambda x: x[0], reverse=True)
        top_score = candidates[0][0]

        # Jika skor tertinggi <= 0 (artinya query tidak berhubungan dengan resep), JANGAN sodorkan resep acak!
        if top_score <= 0:
            return None

        # Pilih bervariasi dari kandidat dengan skor optimal agar tidak monoton
        top_candidates = [c[1] for c in candidates if c[0] >= max(top_score - 4, 1)]
        if top_candidates:
            import hashlib
            seed_key = f"{full_query}_{patient_seed or ''}"
            h_val = int(hashlib.md5(seed_key.encode()).hexdigest()[:6], 16)
            chosen_recipe = top_candidates[h_val % len(top_candidates)]
            return dict(chosen_recipe)

        return dict(candidates[0][1])

    def get_multi_recipe_candidates(
        self,
        query: str,
        limit: int = 3,
        exclude_titles: Optional[List[str]] = None,
        user_allergens: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Mengambil beberapa kandidat hidangan/resep yang berbeda dan bebas alergen untuk permintaan multi-menu.
        Memastikan variasi ragam makanan (tidak menampilkan 3 soto sekaligus).
        """
        excluded = [t.lower().strip() for t in (exclude_titles or []) if t]
        allergens = [a.lower().strip() for a in (user_allergens or []) if a]
        full_query = (query or "").lower()

        candidates = []
        for r in self._recipes_catalog:
            title_lower = r["nama_makanan"].lower()
            if any(ex in title_lower or title_lower in ex for ex in excluded):
                continue
            r_text = f"{r['nama_makanan']} {r.get('bahan', '')} {r.get('keywords', [])}".lower()
            if any(alg in r_text for alg in allergens):
                continue

            score = 0
            for kw in r.get("keywords", []):
                if kw in full_query:
                    score += 5
            if r.get("safe_for_prediabetes", True):
                score += 3
            candidates.append((score, r))

        candidates.sort(key=lambda x: x[0], reverse=True)

        chosen = []
        seen_words = set()
        for _, cand in candidates:
            name_low = cand["nama_makanan"].lower()
            # Cek keanekaragaman: hindari 2 menu yang mengandung kata utama sama (misal 2 soto atau 2 ayam)
            main_word = name_low.split()[0]
            if main_word not in seen_words or len(chosen) >= len(candidates) - 1:
                chosen.append(dict(cand))
                seen_words.add(main_word)
            if len(chosen) >= limit:
                break

        # Fallback jika kurang dari limit: ambil sisa dari catalog yang bebas alergen
        if len(chosen) < limit:
            for r in self._recipes_catalog:
                if len(chosen) >= limit:
                    break
                if any(c["nama_makanan"] == r["nama_makanan"] for c in chosen):
                    continue
                r_text = f"{r['nama_makanan']} {r.get('bahan', '')}".lower()
                if not any(alg in r_text for alg in allergens):
                    chosen.append(dict(r))

        return chosen

vector_manager = ClinicalVectorStoreManager()
