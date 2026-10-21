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


culinary_normalizer = CulinaryNormalizer()
