import re
from typing import List, Dict, Tuple, Any, Optional

ALLERGEN_SYNONYMS = {
    "seafood": [
        "seafood", "udang", "cumi", "cumi-cumi", "kepiting", "kerang", "lobster", 
        "rajungan", "gurita", "tiram", "oyster", "prawn", "shrimp", "ikan teri asin", "saus tiram", "terasi"
    ],
    "kacang": [
        "kacang", "kacang tanah", "kacang panjang", "kacang mede", "selai kacang", "bumbu kacang", 
        "saus kacang", "sambal kacang", "peanut", "rempeyek kacang",
        "hazelnut", "walnut", "almond", "almon", "pistachio", "pecan", "macadamia", "cashew"
    ],
    "susu": [
        "susu", "susu sapi", "susu kental manis", "skm", "keju", "cheese", 
        "butter", "mentega", "cream", "krim", "dairy"
    ],
    "santan": [
        "santan", "santan kental", "santan encer", "kuah gulai", "opor", "rendang santan", "kelapa parut santan", "minyak kelapa santan"
    ],
    "telur": [
        "telur", "telur ayam", "telur bebek", "telur asin", "telur puyuh", "mayones", "mayonnaise"
    ],
    "gluten": [
        "gluten", "terigu", "tepung terigu", "roti putih", "mie instan", "pasta", "bakwan tepung"
    ],
    "babi": [
        "babi", "pork", "lard", "minyak babi", "bacon", "ham"
    ],
    "alkohol": [
        "alkohol", "arak", "mirin", "rum", "tuak"
    ]
}

# Pola Pertanyaan di Luar Lingkup Medis & Gizi PrediaBeat (Out-of-Scope Guardrail)
OUT_OF_SCOPE_PATTERNS = [
    # Politik & Pemerintahan
    r"\b(presiden|wakil presiden|menteri|dpr|mpr|pemilu|pilpres|pilkada|parpol|partai politik|kabinet|gubernur|walikota|bupati|konstitusi|ikn|pemerintah)\b",
    # Koding & Komputer Teknis Non-Medis
    r"\b(koding|coding|programming|source code|python|javascript|golang|c\+\+|html|css|react|sql query|fungsi sort|algorithm|debugging code|bikin program|script bash)\b",
    # Olahraga Komersial / Sepak Bola
    r"\b(sepak bola|liga champions|liga inggris|piala dunia|world cup|persib|persija|manchester united|real madrid|barcelona|skor bola|hasil pertandingan)\b",
    # Hiburan, Gosip, Film, Game, Anime
    r"\b(film bioskop|aktor|aktris|artis|konser musik|k-pop|anime|manga|mobile legends|free fire|dota|game steam|gosip|selebriti|sinetron)\b",
    # Finansial, Crypto, Saham, Hukum Umum
    r"\b(cryptocurrency|crypto|bitcoin|ethereum|trading saham|forex|pinjaman online|pinjol|hukum pidana|pasal kuhp|investasi bodong)\b",
    # Sains & Matematika Murni Non-Kesehatan
    r"\b(teori relativitas|rumus integral|rumus fisika|kecepatan cahaya|tatasurya|astronomi|dinosaurus)\b",
]

# Kata Kunci Konteks Kesehatan / Gizi untuk Mencegah False Positives
HEALTH_CONTEXT_KEYWORDS = [
    "gula", "glukosa", "darah", "makan", "minum", "menu", "resep", "gizi", "nutrisi",
    "kalori", "protein", "karbo", "lemak", "serat", "diet", "diabetes", "prediabetes",
    "hba1c", "gdp", "kolesterol", "tensi", "hipertensi", "berat badan", "tinggi badan",
    "obesitas", "olahraga", "alergi", "badan", "sehat", "sakit", "puasa", "3j",
    "sayur", "buah", "nasi", "lauk", "ikan", "ayam", "daging", "tahu", "tempe", "telur",
    "siapa saya", "nama saya", "siapa aku", "profil saya", "umur saya", "usia saya"
]

# Makanan Tradisional Berisiko Tinggi Lonjakan Gula Darah (Simple Sugars & Deep Frying)
HIGH_RISK_SWEET_FOODS = {
    "tahu gejrot": {
        "nama": "Tahu Gejrot",
        "risiko": "Kuah tradisional tahu gejrot menggunakan larutan gula merah/gula jawa pekat yang sangat tinggi sukrosa (gula sederhana) dan tahu yang digoreng rendam minyak, sehingga memicu lonjakan glukosa darah (glycemic spike) cepat serta beban inflamasi dari minyak jelantah.",
        "solusi": "Modifikasi ramah prediabetes: Gunakan kuah asam segar dari air asam jawa asli, bawang merah, cabai rawit, perasan jeruk nipis, dan pemanis alami nol kalori (stevia) TANPA gula merah/gula pasir. Tahu putih diolah dengan dipanggang air-fryer atau dikukus tanpa minyak jelantah."
    },
    "es campur": {
        "nama": "Es Campur",
        "risiko": "Mengandung sirup gula kental, susu kental manis (SKM), dan jeli olahan dengan indeks glikemik sangat tinggi (GI > 75).",
        "solusi": "Ganti dengan es buah segar alami tanpa sirup dan tanpa SKM: gunakan air kelapa murni dingin dengan potongan buah rendah GI (alpukat, apel, stroberi, dan chia seeds)."
    },
    "es teler": {
        "nama": "Es Teler",
        "risiko": "Santan kental berlemak jenuh dan sirup gula pasir pekat meningkatkan beban glikemik dan resistensi insulin.",
        "solusi": "Gunakan santan sangat encer atau susu almond tanpa pemanis, alpukat, dan kelapa muda murni tanpa sirup gula."
    },
    "kolak": {
        "nama": "Kolak",
        "risiko": "Kuah santan kental dengan gula aren pekat menghasilkan lonjakan kalori dan glukosa darah mendadak.",
        "solusi": "Rebusan ubi atau pisang kepok dengan kuah rebusan rempah kayu manis, jahe, dan daun pandan menggunakan stevia tanpa santan kental."
    },
    "martabak manis": {
        "nama": "Martabak Manis",
        "risiko": "Adonan tepung terigu olahan berkarbohidrat tinggi (GI tinggi), mentega tebal, susu kental manis, dan taburan gula pasir.",
        "solusi": "Hindari martabak manis tradisional; ganti dengan pancake havermut (oatmeal) pisang kukus tanpa gula tambahan."
    },
    "boba": {
        "nama": "Minuman Boba",
        "risiko": "Bola tapioka dimasak dan direndam dalam larutan sirup gula pekat, kaya kalori kosong tanpa serat pangan.",
        "solusi": "Ganti boba dengan biji chia (chia seeds) atau cincau hitam alami tanpa sirup gula."
    }
}


class ClinicalAllergenGuardrail:
    """
    Sistem Pengaman Klinis Komprehensif (Multi-Layer Guardrail) PrediaBeat:
    1. Pre-Generation:
       - Out-of-Scope Validation (Memastikan pertanyaan berada dalam ranah nutrisi & prediabetes).
       - High-Risk Food Detection (Mendeteksi hidangan tinggi gula sederhana/minyak jelantah seperti tahu gejrot).
       - Allergen Candidate Filtering (Mengeliminasi kandidat makanan yang mengandung pantangan alergen).
    2. Post-Generation:
       - Response Inspection (Memastikan resep dan jawaban keluaran LLM 100% bebas dari pantangan alergi).
    """

    def is_out_of_scope(self, query: str) -> Tuple[bool, Optional[str]]:
        """
        Mendeteksi apakah pertanyaan berada di luar lingkup keahlian Dr. Predi (nutrisi, prediabetes, gaya hidup sehat).
        """
        ql = (query or "").lower().strip()
        if not ql:
            return False, None

        # Cek apakah mengandung kata kunci kesehatan
        has_health = any(k in ql for k in HEALTH_CONTEXT_KEYWORDS)

        # Cek apakah cocok dengan pola out-of-scope
        for pat in OUT_OF_SCOPE_PATTERNS:
            if re.search(pat, ql, re.IGNORECASE):
                # Jika tidak ada konteks kesehatan, tolak sebagai out-of-scope
                if not has_health:
                    return True, "Pertanyaan berada di luar topik nutrisi klinis dan prediabetes."
        
        return False, None

    def detect_high_risk_sweet_food(self, query: str) -> Optional[Dict[str, str]]:
        """
        Mendeteksi apakah pengguna menanyakan makanan tradisional tinggi gula sederhana atau olahan gorengan berisiko.
        """
        ql = (query or "").lower().strip()
        for food_key, info in HIGH_RISK_SWEET_FOODS.items():
            if food_key in ql:
                return info
        return None

    def expand_allergen_keywords(self, user_allergens: List[str]) -> List[str]:
        expanded = set()
        for item in user_allergens:
            item_clean = item.strip().lower()
            if not item_clean:
                continue
            expanded.add(item_clean)
            
            # Cocokkan dengan sinonim kamus medis
            for category, syns in ALLERGEN_SYNONYMS.items():
                if category in item_clean or any(s in item_clean for s in syns):
                    expanded.update(syns)
        return list(expanded)

    def verify_food_item_is_safe(self, food_name: str, expanded_allergens: List[str]) -> bool:
        """Memeriksa apakah satu item makanan bebas dari seluruh pantangan."""
        food_lower = food_name.lower()
        for allergen in expanded_allergens:
            pattern = r'\b' + re.escape(allergen) + r'\b'
            if re.search(pattern, food_lower) or allergen in food_lower:
                return False
        return True

    def filter_safe_food_candidates(self, foods: List[Dict[str, Any]], user_allergens: List[str]) -> List[Dict[str, Any]]:
        """Lapisan 1 (Pre-Filter): Mengeliminasi makanan yang mengandung alergen."""
        if not user_allergens:
            return foods

        expanded = self.expand_allergen_keywords(user_allergens)
        safe_list = []
        for food in foods:
            name = food.get("nama") or food.get("nama_makanan", "")
            if self.verify_food_item_is_safe(name, expanded):
                safe_list.append(food)
        return safe_list

    def inspect_and_sanitize_response(self, text: str, user_allergens: List[str]) -> Tuple[str, List[str]]:
        """
        Lapisan 2 (Post-Filter): Memeriksa respon LLM secara menyeluruh.
        Mendeteksi jika ada bahan pantangan disarankan dalam resep (misal: 'tambahkan santan', 'kacang panjang').
        Mengecualikan konteks keselamatan seperti 'bebas dari [alergen]', 'hindari [alergen]', atau 'pantangan: [alergen]'.
        """
        if not user_allergens or not text:
            return text, []

        expanded = self.expand_allergen_keywords(user_allergens)
        detected_violations = []

        # Pola negasi medis / edukasi pantangan
        NEGATION_PATTERNS = [
            r'\bhindar(?:i|kan)?\b',
            r'\bmenghindar(?:i|kan)?\b',
            r'\bpantang(?:an)?\b',
            r'\bdilarang\b',
            r'\balergi(?:k)?\b',
            r'\bbebas\b',
            r'\btanpa\b',
            r'\btidak\s+(?:boleh|menggunakan|memakai|mengandung|ada)\b',
            r'\bbukan\b',
            r'\bjangan\b',
            r'\bcegah\b',
            r'\bmenjauhi\b',
            r'\bhati-hati\b',
            r'\bwaspada\b',
            r'\bperlu\s+berhati-hati\b',
        ]

        # Pecah teks menjadi kalimat/klausa untuk analisis per kalimat
        sentences = re.split(r'[\n.!?]+', text)
        for s in sentences:
            s_clean = s.strip()
            if not s_clean:
                continue

            # Jika kalimat mengandung kata negasi / edukasi pantangan, kalimat ini aman
            is_negated = any(re.search(pat, s_clean, re.IGNORECASE) for pat in NEGATION_PATTERNS)
            if is_negated:
                continue

            # Periksa apakah ada bahan pantangan disarankan dalam kalimat tanpa negasi ini
            for allergen in expanded:
                pattern = rf'\b{re.escape(allergen)}[a-zA-Z]*\b'
                for m in re.finditer(pattern, s_clean, re.IGNORECASE):
                    detected_violations.append(m.group(0).lower())

        if detected_violations:
            unique_violations = list(dict.fromkeys(detected_violations))
            # Tambahkan peringatan keamanan tegas di akhir respon
            warning_box = (
                f"\n\n> 🛡️ **PERINGATAN SISTEM KEAMANAN MEDIS (GUARDRAIL PREDIABEAT):**\n"
                f"> Sistem mendeteksi potensi penyebutan bahan pantangan Anda ({', '.join(unique_violations)}). "
                f"Sesuai protokol PERKENI 2021, bahan ini **DILARANG KERAS** untuk Anda konsumsi. "
                f"Selalu pastikan hidangan Anda 100% bebas dari bahan tersebut demi keamanan respon insulin dan kestabilan metabolik Anda."
            )
            return text + warning_box, unique_violations

        return text, []

allergen_guardrail = ClinicalAllergenGuardrail()
