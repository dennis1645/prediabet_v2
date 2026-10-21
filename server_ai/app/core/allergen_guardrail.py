import re
from typing import List, Dict, Tuple, Any

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

class ClinicalAllergenGuardrail:
    """
    Sistem Pengaman Berlapis (Dual-Layer Guardrail) PrediaBeat
    1. Pre-Generation: Menyaring bahan makanan sebelum masuk ke prompt LLM.
    2. Post-Generation: Memindai respon keluaran LLM untuk mencegah kebocoran pantangan.
    """

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
            r'\bmenjauhi\b'
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
