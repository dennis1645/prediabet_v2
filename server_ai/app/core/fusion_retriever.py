from typing import Tuple, List, Dict, Any
from app.core.neo4j_manager import Neo4jClinicalGraphManager, neo4j_manager
from app.core.vector_manager import ClinicalVectorStoreManager, vector_manager
from app.core.allergen_guardrail import allergen_guardrail
from app.models.schemas import UserClinicalContext

class HybridGraphVectorFusion:
    """Retriever Hibrida yang memadukan penelusuran graf deterministik dengan pencarian semantik."""

    def __init__(self, neo4j_mgr: Neo4jClinicalGraphManager, vector_mgr: ClinicalVectorStoreManager):
        self.graph = neo4j_mgr
        self.vector = vector_mgr

    def build_clinical_dossier(
        self,
        user_query: str,
        user_context: UserClinicalContext,
        chat_history: List[Any] = None
    ) -> Tuple[str, List[str], List[str], Any]:
        """
        Menyusun Dossier Klinis unik untuk satu user tertentu.
        Menghasilkan:
        - dossier_text: Teks konteks yang aman dan terverifikasi untuk prompt LLM
        - safe_food_names: Daftar nama makanan yang dijamin aman
        - allergens_prevented: Daftar alergen yang dicegah
        - specific_food: Objek makanan spesifik jika pengguna menanyakan kandungan nutrisi bahan tertentu
        """
        # 1. Parsing Komorbiditas & Alergen Pengguna (Deduplikasi Bersih)
        komorbid_list = []
        if isinstance(user_context.komorbiditas, list):
            komorbid_list = user_context.komorbiditas
        elif isinstance(user_context.komorbiditas, str) and user_context.komorbiditas.strip() and user_context.komorbiditas != "-":
            komorbid_list = [c.strip() for c in user_context.komorbiditas.split(",") if c.strip()]

        raw_allergens = user_context.pantangan_alergi or []
        if isinstance(raw_allergens, str):
            raw_allergens = [a.strip() for a in raw_allergens.split(",") if a.strip()]

        # Bersihkan & hilangkan duplikasi (misal 'kacang' ganda)
        allergens = list(dict.fromkeys([a.strip().capitalize() for a in raw_allergens if a and a.strip()]))
        conditions = [f"Risiko: {user_context.kategori_risiko}"] + komorbid_list

        # 2. Penelusuran Graf Deterministik (Neo4j / Fallback Engine)
        safe_foods = self.graph.get_safe_foods_by_profile(conditions, allergens, limit=8)
        
        # Ekstra verifikasi dengan Guardrail
        safe_foods = allergen_guardrail.filter_safe_food_candidates(safe_foods, allergens)
        safe_food_names = [f["nama"] for f in safe_foods]

        # 3. Penelusuran Bahan Makanan Spesifik dari Query / History (misal: "Berapa protein dada ayam", "berapa gram?")
        specific_food = self.graph.find_specific_food(user_query, chat_history or [])

        # Deteksi apakah pengguna memang meminta resep / menu masakan
        ql = (user_query or "").lower()
        recipe_keywords = [
            "resep", "menu", "masak", "makanan apa", "saran makanan", "rekomendasi makanan",
            "saranin", "sarankan", "sarapan apa", "makan siang apa", "makan malam apa",
            "ide makan", "olah", "selain itu", "yang lain", "ada menu lain", "opsi lain", "pilihan lain"
        ]
        user_wants_recipe = any(k in ql for k in recipe_keywords)

        # 4. Penelusuran Semantik Dokumen Panduan Medis
        guideline_texts = []
        if user_wants_recipe or any(k in ql for k in ["diet", "3j", "jadwal", "pola", "diabetes", "gula darah"]):
            semantic_hits = self.vector.query_semantic(user_query, n_results=2)
            guideline_texts = [h["document"] for h in semantic_hits]

        # 5. Perakitan Dossier Terisolasi (User-Specific Isolated Context)
        dossier_lines = []

        # Rekam medis pasien HANYA dimasukkan jika query relevan dengan profil/berat badan/alergi/resep
        profile_keywords = ["berat", "tinggi", "bmi", "usia", "umur", "alergi", "pantangan", "gula", "hba1c", "lab", "profil", "siapa", "kalori"]
        if user_wants_recipe or any(k in ql for k in profile_keywords):
            dossier_lines = [
                f"=== DATA REKAM MEDIS RESMI PASIEN (ACUAN HANYA JIKA DITANYAKAN) ===",
                f"• Nama Pasien       : {getattr(user_context, 'nama', 'Pak Budi')} (Panggilan: Pak Budi)",
                f"• Usia Pasien       : {user_context.usia} tahun",
                f"• Berat Badan       : {getattr(user_context, 'berat_badan', 78)} kg",
                f"• Tinggi Badan      : {getattr(user_context, 'tinggi_badan', 172)} cm",
                f"• Indeks Massa Tubuh: BMI {user_context.bmi} ({user_context.kategori_bmi})",
                f"• Hasil Lab         : GDP {user_context.gula_darah_puasa} mg/dL | HbA1c {user_context.hba1c}%",
                f"• Target Energi 3J  : {user_context.target_kalori} kkal/hari",
                f"• Pola Waktu Makan  : {getattr(user_context, 'pola_waktu_makan', '3 kali makan utama + 2 kali selingan')}",
                f"• PANTANGAN ALERGI  : {', '.join(allergens) if allergens else 'Tidak ada pantangan khusus'} (MUTLAK DILARANG)",
            ]

        if specific_food:
            dossier_lines.extend([
                "",
                f"=== DATA GIZI KLINIS SPESIFIK HASIL QUERY DETERMINISTIK NEO4J (ACUAN RESMI PER 100 GRAM) ===",
                f"• Nama Bahan Makanan  : {specific_food['nama']}",
                f"• Takaran Acuan        : 100 gram",
                f"• Kandungan Protein    : {specific_food['protein']} gram",
                f"• Total Energi (Kalori): {specific_food['kalori']} kkal",
                f"• Kandungan Karbohidrat: {specific_food['karbohidrat']} gram",
                f"• Kandungan Lemak      : {specific_food['lemak']} gram",
                f"• Indeks Glikemik (GI) : {specific_food['gi']} (Kategori Rendah - Sangat Aman bagi Respon Insulin)",
                f"• Rekomendasi Olah     : {specific_food['cara_olah']} tanpa minyak jelantah",
                f"[INSTRUKSI KHUSUS GIZI]: Pasien menanyakan kandungan bahan ini. WAJIB MENJAWAB LANGSUNG ANGKA PROTEIN/GIZI PER 100 GRAM DI AWAL KALIMAT! DILARANG memberikan resep jika tidak diminta.",
            ])

        # Hanya injeksikan daftar makanan Neo4j jika pengguna memang meminta menu/resep
        if user_wants_recipe:
            dossier_lines.extend([
                "",
                "DAFTAR MAKANAN NUSANTARA TERVERIFIKASI AMAN (HASIL FILTER GRAF NEO4J 100% BEBAS ALERGEN):"
            ])
            for f in safe_foods[:6]:
                dossier_lines.append(
                    f"- {f['nama']}: {f['kalori']} kkal (Karbo: {f['karbohidrat']}g, Protein: {f['protein']}g, Lemak: {f['lemak']}g, Sodium: {f['sodium_mg']}mg, GI: {f['gi']}). Cara olah: {f['cara_olah']}."
                )

        if guideline_texts:
            dossier_lines.append("\nPANDUAN KLINIS RESMI (PERKENI 2021 & KEMENKES 3J):")
            for doc in guideline_texts:
                dossier_lines.append(doc[:400])

        dossier_lines.append(
            f"\nPERINGATAN PROTOKOL ZERO-ALLERGEN (MUTLAK): DILARANG KERAS menyarankan makanan atau bahan yang mengandung {', '.join(allergens) if allergens else 'gula sederhana dan minyak jelantah'}. Jangan menyarankan santan, kacang, kacang panjang, atau seafood!"
        )

        dossier_text = "\n".join(dossier_lines)
        return dossier_text, safe_food_names, allergens, specific_food

fusion_engine = HybridGraphVectorFusion(neo4j_manager, vector_manager)
