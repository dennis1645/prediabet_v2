import re
from typing import List, Dict, Tuple, Any

ALLERGEN_SYNONYMS = {
    "seafood": [
        "seafood", "udang", "cumi", "cumi-cumi", "kepiting", "kerang", "lobster", 
        "rajungan", "gurita", "tiram", "oyster", "prawn", "shrimp", "ikan teri asin", "saus tiram", "terasi"
    ],
    "kacang": [
        "kacang", "kacang tanah", "kacang panjang", "kacang mede", "selai kacang", "bumbu kacang", 
        "saus kacang", "sambal kacang", "peanut", "rempeyek kacang"
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
        if not user_allergens:
            return text, []

        expanded = self.expand_allergen_keywords(user_allergens)
        detected_violations = []

        # Deteksi keberadaan bahan pantangan dalam teks
        for allergen in expanded:
            for m in re.finditer(rf'\b{re.escape(allergen)}[a-zA-Z]*\b', text, re.IGNORECASE):
                matched_word = m.group(0)
                start_ctx = max(0, m.start() - 45)
                prefix = text[start_ctx:m.start()]

                # Periksa apakah kalimat tersebut adalah negasi keselamatan / edukasi pantangan
                is_safe_negation = bool(re.search(
                    r'(?:bebas|bebas dari|hindari|pantangan|pantang|dilarang|jangan|jangan pakai|tanpa|bukan|alergi|tidak mengandung|tidak memakai)\s+[^.\n]*?$',
                    prefix,
                    re.IGNORECASE
                ))
                if not is_safe_negation:
                    detected_violations.append(matched_word.lower())

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
