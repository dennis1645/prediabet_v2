"""
Modul Normalisasi Typo, Singkatan, & Pemetaan Istilah Kuliner Nusantara
Mencegah halusinasi model dan menghasilkan metadata konfirmasi interaktif (Ya / Tidak).
"""

import re
from typing import Optional, Dict, Any, Tuple

# Pemetaan Singkatan & Typo Umum ke Nama Bahan Makanan Resmi
TYPO_SLANG_MAP = {
    # Ayam
    "aym": "Dada Ayam",
    "ayam": "Dada Ayam",
    "dd aym": "Dada Ayam",
    "dada aym": "Dada Ayam",
    "aym bkr": "Ayam Bakar",
    "ayam bkr": "Ayam Bakar",
    "aym grg": "Ayam Goreng",

    # Telur
    "tlr": "Telur Ayam",
    "telor": "Telur Ayam",
    "tlr rbs": "Telur Rebus",
    "telor rbs": "Telur Rebus",
    "tlr ddr": "Telur Dadar",
    "pth tlr": "Putih Telur",
    "putih telor": "Putih Telur",

    # Nasi & Karbohidrat
    "nsi": "Nasi Putih",
    "nasgor": "Nasi Goreng",
    "nsi uduk": "Nasi Uduk",
    "nsi mrh": "Nasi Beras Merah",
    "nasi mrh": "Nasi Beras Merah",
    "beras mrh": "Nasi Beras Merah",
    "ktang": "Kentang Rebus",
    "kntng": "Kentang Rebus",
    "havermut": "Oatmeal",
    "otmil": "Oatmeal",

    # Ikan & Seafood
    "ikn": "Ikan Mas",
    "ikn mas": "Ikan Mas",
    "pepes ikn": "Pepes Ikan Mas",
    "udg": "Udang",

    # Nabati
    "tmp": "Tempe",
    "tmpe": "Tempe",
    "th": "Tahu",
    "tahu gjrot": "Tahu Gejrot",
    "tahu gejrot": "Tahu Gejrot",

    # Sayuran
    "byam": "Bayam",
    "byang": "Bayam",
    "kcg pjg": "Kacang Panjang",
    "wrtl": "Wortel",
    "oyng": "Gambas (Oyong)",
}

# Minuman yang memerlukan verifikasi kadar gula / pemanis (Anti-Halu)
SWEET_BEVERAGE_KEYWORDS = {
    "es teh manis": {
        "nama": "Es Teh Manis",
        "pertanyaan": "Apakah Anda mengetahui takaran gula pada Es Teh Manis yang diminum?",
        "options": [
            {"label": "1 sdt Gula Pasir (~16 kkal)", "gula_g": 4, "kalori": 16},
            {"label": "1 sdm Gula Pasir (~48 kkal)", "gula_g": 12, "kalori": 48},
            {"label": "2-3 sdm Gula Warung/Manis Pekat (~80-120 kkal)", "gula_g": 25, "kalori": 100},
            {"label": "Tanpa Gula / Teh Tawar (0 kkal)", "gula_g": 0, "kalori": 0},
            {"label": "Pemanis Khusus Stevia / Nol Kalori", "gula_g": 0, "kalori": 0}
        ]
    },
    "teh manis": {
        "nama": "Teh Manis",
        "pertanyaan": "Apakah Anda mengetahui takaran gula pada Teh Manis yang diminum?",
        "options": [
            {"label": "1 sdt Gula Pasir (~16 kkal)", "gula_g": 4, "kalori": 16},
            {"label": "1 sdm Gula Pasir (~48 kkal)", "gula_g": 12, "kalori": 48},
            {"label": "2-3 sdm Gula Warung (~80-120 kkal)", "gula_g": 25, "kalori": 100},
            {"label": "Tanpa Gula / Teh Tawar (0 kkal)", "gula_g": 0, "kalori": 0},
            {"label": "Pemanis Nol Kalori / Stevia", "gula_g": 0, "kalori": 0}
        ]
    },
    "es jeruk": {
        "nama": "Es Jeruk Manis",
        "pertanyaan": "Berapa takaran gula tambahan pada Es Jeruk tersebut?",
        "options": [
            {"label": "1 sdm Gula Pasir (~48 kkal)", "gula_g": 12, "kalori": 48},
            {"label": "2 sdm Gula Pekat (~96 kkal)", "gula_g": 24, "kalori": 96},
            {"label": "Murni Tanpa Gula Tambahan (~45 kkal fruktosa)", "gula_g": 9, "kalori": 45}
        ]
    },
    "kopi susu": {
        "nama": "Kopi Susu Manis",
        "pertanyaan": "Apakah kopi susu menggunakan krimer kental manis atau gula aren?",
        "options": [
            {"label": "Kopi Susu Rendah Lemak & Tanpa Gula (~45 kkal)", "gula_g": 4, "kalori": 45},
            {"label": "Kopi Susu Gula Aren / Kental Manis (~140-180 kkal)", "gula_g": 22, "kalori": 160}
        ]
    }
}

# Pola Pengguna Merujuk Resep Terakhir (Contextual Quick-Log) - Strict Anchored Patterns
CONTEXTUAL_RECIPE_PATTERNS = [
    r"^(ya|oke|okee|baik|siap)?\s*(aku|saya)?\s*(mau|akan|pilih|ambil)\s+(makan|jadwalkan|catat)\s+(itu|resep itu|menu itu)$",
    r"^(catat|jadwalkan|simpan)\s+(resep|menu)?\s*(ini|itu)\s*(dong|ya|ke menu)?$",
    r"^(aku|saya)\s+mau\s+makan\s+(itu|resep ini|menu ini)$",
    r"^(catat|jadwalkan)\s+(resep ini|menu ini|resep itu|menu itu)$",
    r"^(aku|saya)\s+pilih\s+(menu ini|resep ini|itu)$"
]

# Pemetaan Ekuivalen Kuliner Nusantara (Istilah Lokal -> Profil Resmi Knowledge Base)
CULINARY_EQUIVALENT_MAP = {
    "nasi lemak": {
        "nama_resmi": "Nasi Uduk (Santan Gurih)",
        "penjelasan": "Nasi lemak memiliki profil nutrisi klinis serupa dengan Nasi Uduk (beras putih yang dimasak dengan santan kelapa kental dan daun rempah). Bagi prediabetes, nasi lemak memiliki Indeks Glikemik Tinggi (GI > 70) dan lemak jenuh dari santan, sehingga porsinya wajib dibatasi atau diganti nasi merah."
    },
    "nasi kuning": {
        "nama_resmi": "Nasi Kuning (Santan & Kunyit)",
        "penjelasan": "Nasi kuning diolah menggunakan beras putih dan santan kelapa pekat bersama kunyit. Beban glikemiknya tinggi dan perlu diimbangi sayuran kaya serat serta lauk tinggi protein tanpa santan."
    },
    "gado gado": {
        "nama_resmi": "Gado-Gado (Sayuran Saus Kacang)",
        "penjelasan": "Gado-gado kaya akan serat sayur (bayam, tauge, labu siam), namun bumbu kacang tanah kentalnya menyumbang kalori dan lemak cukup tinggi. PENTING: Dilarang keras jika pasien memiliki pantangan alergi kacang."
    },
    "gado-gado": {
        "nama_resmi": "Gado-Gado (Sayuran Saus Kacang)",
        "penjelasan": "Gado-gado kaya akan serat sayur (bayam, tauge, labu siam), namun bumbu kacang tanah kentalnya menyumbang kalori dan lemak cukup tinggi. PENTING: Dilarang keras jika pasien memiliki pantangan alergi kacang."
    },
    "pecel": {
        "nama_resmi": "Pecel Sayur",
        "penjelasan": "Sayuran rebus dengan saus kacang. Sayuran sangat baik untuk glukosa darah, namun takaran bumbu kacang perlu dikontrol agar kalori tetap sesuai target 3J."
    },
    "ketoprak": {
        "nama_resmi": "Ketoprak (Bihun, Tahu, Saus Kacang)",
        "penjelasan": "Mengandung karbohidrat sederhana dari bihun putih dan kerupuk, serta saus kacang manis. Disarankan memperbanyak tahu kukus dan mengurangi porsi bihun serta kerupuk minyak jelantah."
    }
}


class CulinaryNormalizer:
    """Normalizer Cerdas Typo, Singkatan, dan Istilah Kuliner."""

    def normalize_food_query(self, query: str) -> Tuple[str, Optional[Dict[str, Any]]]:
        """
        Menormalkan query pengguna dan mendeteksi apakah memerlukan konfirmasi interaktif.
        Returns:
            (normalized_query, confirmation_payload)
        """
        if not query:
            return query, None

        ql = query.lower().strip()
        words = re.findall(r'[a-zA-Z0-9]+', ql)

        # 1. Cek Pemetaan Istilah Kuliner Nusantara
        for term, info in CULINARY_EQUIVALENT_MAP.items():
            if term in ql:
                return query, {
                    "is_culinary_equivalent": True,
                    "term": term,
                    "target_food": info["nama_resmi"],
                    "penjelasan": info["penjelasan"]
                }

        # 2. Cek Deteksi Typo / Singkatan Kuat
        detected_typo = None
        target_official = None

        # Cek frasa multi-kata dulu (misal "dd aym", "tahu gjrot", "nsi mrh")
        for typo, official in TYPO_SLANG_MAP.items():
            pattern = r'\b' + re.escape(typo) + r'\b'
            if re.search(pattern, ql):
                # Hanya jika typo bukan kata biasa yang formal
                if typo in ["aym", "tlr", "dd aym", "nasgor", "nsi mrh", "nsi uduk", "tahu gjrot", "telor", "byam", "wrtl", "ikn"]:
                    detected_typo = typo
                    target_official = official
                    break

        if detected_typo and target_official:
            return query, {
                "requires_confirmation": True,
                "detected_typo": detected_typo,
                "target_food": target_official,
                "confirm_prompt": f"Apakah yang Anda maksud adalah **{target_official}**?"
            }

        return query, None

    def detect_sweet_beverage_verification(self, query: str) -> Optional[Dict[str, Any]]:
        """
        Mendeteksi minuman berisiko gula/kalori tinggi yang memerlukan konfirmasi takaran (Anti-Halu).
        """
        if not query:
            return None
        ql = query.lower()

        # JIKA pengguna sedang menjawab/mengonfirmasi takaran gula atau pemanis, JANGAN tanya lagi!
        sugar_answer_signals = [
            "takaran", "takaran gulanya", "gula pasir", "sdm", "sdt", "sendok",
            "tawar", "teh tawar", "tanpa gula", "stevia", "diabetasol", "nol kalori", "gula warung"
        ]
        if any(s in ql for s in sugar_answer_signals):
            return None

        for bev_key, bev_data in SWEET_BEVERAGE_KEYWORDS.items():
            if bev_key in ql:
                return {
                    "item_name": bev_data["nama"],
                    "needs_sugar_verification": True,
                    "question": bev_data["pertanyaan"],
                    "options": bev_data["options"]
                }
        return None

    def detect_sugar_answer(self, query: str) -> Optional[Dict[str, Any]]:
        """
        Mendeteksi jawaban takaran gula dan mengonversinya ke kalori riil.
        """
        if not query:
            return None
        ql = query.lower()
        if "takaran gula" in ql or "gula pasir" in ql or "sdm" in ql or "sdt" in ql or "teh tawar" in ql or "stevia" in ql:
            cal = 0
            gula = 0
            label = "Takaran Gula"
            if "1 sdt" in ql:
                cal, gula, label = 16, 4, "1 sdt Gula Pasir (~16 kkal)"
            elif "1 sdm" in ql:
                cal, gula, label = 48, 12, "1 sdm Gula Pasir (~48 kkal)"
            elif "2-3 sdm" in ql or "gula warung" in ql:
                cal, gula, label = 100, 25, "Gula Warung Manis (~100 kkal)"
            elif "tawar" in ql or "tanpa gula" in ql or "0 kkal" in ql:
                cal, gula, label = 0, 0, "Teh Tawar Tanpa Gula (0 kkal)"
            elif "stevia" in ql or "nol kalori" in ql:
                cal, gula, label = 0, 0, "Pemanis Nol Kalori / Stevia (0 kkal)"
            return {
                "nama": "Es Teh Manis" if "es teh" in ql else "Minuman Manis",
                "label": label,
                "kalori": cal,
                "gula_g": gula,
                "protein": 0,
                "karbo": gula,
                "lemak": 0
            }
        return None

    def detect_contextual_recipe_intent(self, query: str, last_suggested_recipe: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        """
        Mendeteksi jika pengguna menyetujui / merujuk pada resep yang baru saja disarankan.
        Misal: 'okee aku mau makan itu', 'catat ini dong', 'aku pilih menu ini'.
        """
        if not query or not last_suggested_recipe:
            return None
        ql = query.lower().strip()
        for pattern in CONTEXTUAL_RECIPE_PATTERNS:
            if re.search(pattern, ql):
                return {
                    "is_contextual_log": True,
                    "recipe": last_suggested_recipe,
                    "confirmation_text": f"Menu **{last_suggested_recipe.get('nama_makanan', 'Rekomendasi 3J')}** langsung dicatatkan ke progres harian Anda!"
                }
        return None

    def extract_story_foods(self, query: str) -> Dict[str, Any]:
        """
        Mengekstrak entitas makanan dari cerita percakapan santai.
        Misal: 'saya hari ini makan ayam goreng sama nasi, terus minum nya es teh manis'
        """
        if not query:
            return {"items": [], "sweet_beverage": None, "total_kalori_known": 0}

        ql = query.lower().strip()

        # 1. Cegah eksekusi jika ini hanya pertanyaan nutrisi, bukan laporan makan
        # Misal: 'Berapa protein pada dada ayam?', 'Bolehkan saya makan nasi?', 'Saranin resep...'
        question_words = ["berapa", "apakah", "bolehkah", "gizi", "protein", "karbo", "lemak", "kalori", "resep", "saran", "rekomendasi", "pengen makan"]
        if any(q in ql for q in question_words) and not any(r in ql for r in ["saya makan", "tadi makan", "hari ini saya makan", "habis makan"]):
            return {"items": [], "sweet_beverage": None, "total_kalori_known": 0}

        # 2. Wajib ada indikasi eksplisit bahwa pengguna sedang menceritakan apa yang dimakan
        consumption_indicators = [
            "saya makan", "aku makan", "tadi makan", "hari ini makan", "hari ini saya makan",
            "habis makan", "sarapan saya", "makan siang saya", "makan malam saya",
            "saya minum", "aku minum", "tadi minum", "sarapan dengan", "makan dengan"
        ]
        if not any(ind in ql for ind in consumption_indicators):
            return {"items": [], "sweet_beverage": None, "total_kalori_known": 0}

        items = []

        # Deteksi protein & lauk
        if "ayam goreng" in ql:
            items.append({"nama": "Ayam Goreng", "kalori": 245, "protein": 18, "karbo": 0, "lemak": 15})
        elif "dada ayam" in ql or "ayam dada" in ql:
            items.append({"nama": "Dada Ayam Tanpa Kulit", "kalori": 165, "protein": 31, "karbo": 0, "lemak": 3.6})
        elif "ayam bakar" in ql:
            items.append({"nama": "Ayam Bakar", "kalori": 190, "protein": 24, "karbo": 2, "lemak": 8})
        elif "ayam" in ql:
            items.append({"nama": "Ayam", "kalori": 200, "protein": 22, "karbo": 0, "lemak": 10})

        if "telur rebus" in ql:
            items.append({"nama": "Telur Rebus", "kalori": 78, "protein": 6.3, "karbo": 0.6, "lemak": 5.3})
        elif "telur dadar" in ql or "telur ceplok" in ql:
            items.append({"nama": "Telur Dadar", "kalori": 110, "protein": 6.5, "karbo": 0.8, "lemak": 9})
        elif "telur" in ql:
            items.append({"nama": "Telur", "kalori": 78, "protein": 6.3, "karbo": 0.6, "lemak": 5.3})

        # Deteksi karbohidrat
        if "nasi merah" in ql or "beras merah" in ql:
            items.append({"nama": "Nasi Beras Merah", "kalori": 110, "protein": 2.6, "karbo": 23, "lemak": 0.9})
        elif "nasi uduk" in ql or "nasi lemak" in ql:
            items.append({"nama": "Nasi Uduk", "kalori": 260, "protein": 5, "karbo": 40, "lemak": 9})
        elif "nasi goreng" in ql:
            items.append({"nama": "Nasi Goreng", "kalori": 250, "protein": 6, "karbo": 38, "lemak": 8})
        elif "nasi" in ql:
            items.append({"nama": "Nasi Putih", "kalori": 194, "protein": 4.0, "karbo": 43.0, "lemak": 0.5})

        # Deteksi sayuran & nabati
        if "tahu" in ql:
            items.append({"nama": "Tahu", "kalori": 76, "protein": 8, "karbo": 2, "lemak": 4.8})
        if "tempe" in ql:
            items.append({"nama": "Tempe", "kalori": 150, "protein": 14, "karbo": 8, "lemak": 7})
        if "bayam" in ql or "sayur bening" in ql:
            items.append({"nama": "Sayur Bening Bayam", "kalori": 45, "protein": 2, "karbo": 6, "lemak": 0.5})
        if "sop" in ql or "sayur sop" in ql:
            items.append({"nama": "Sayur Sop", "kalori": 60, "protein": 3, "karbo": 8, "lemak": 1.2})

        sweet_bev = self.detect_sweet_beverage_verification(query)

        # Deteksi eksplisit waktu makan jika disebutkan dalam cerita pasien
        meal_time = None
        if any(w in ql for w in ["sarapan", "pagi", "makan pagi", "breakfast"]):
            meal_time = "Sarapan"
        elif any(w in ql for w in ["makan siang", "siang", "lunch"]):
            meal_time = "Makan Siang"
        elif any(w in ql for w in ["makan malam", "malam", "dinner"]):
            meal_time = "Makan Malam"
        elif any(w in ql for w in ["camilan", "ngemil", "snack", "sore", "selingan"]):
            meal_time = "Selingan"

        return {
            "items": items,
            "meal_time": meal_time,
            "sweet_beverage": sweet_bev,
            "total_kalori_known": sum(x["kalori"] for x in items)
        }


culinary_normalizer = CulinaryNormalizer()
