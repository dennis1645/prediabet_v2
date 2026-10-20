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
        user_context: UserClinicalContext
    ) -> Tuple[str, List[str], List[str]]:
        """
        Menyusun Dossier Klinis unik untuk satu user tertentu.
        Menghasilkan:
        - dossier_text: Teks konteks yang aman dan terverifikasi untuk prompt LLM
        - safe_food_names: Daftar nama makanan yang dijamin aman
        - allergens_prevented: Daftar alergen yang dicegah
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

        # 3. Penelusuran Semantik Dokumen Panduan Medis
        semantic_hits = self.vector.query_semantic(user_query, n_results=2)
        guideline_texts = [h["document"] for h in semantic_hits]

        # 4. Perakitan Dossier Terisolasi (User-Specific Isolated Context)
        dossier_lines = [
            f"=== DOSSIER NUTRISI KLINIS TERVERIFIKASI (PASIEN: {user_context.username} | ID: {user_context.userId}) ===",
            f"• Demografi Pasien  : {user_context.jenis_kelamin}, {user_context.usia} tahun",
            f"• Status Klinis     : BMI {user_context.bmi} ({user_context.kategori_bmi}) | Skor Risiko: {user_context.skor_risiko} ({user_context.kategori_risiko})",
            f"• Hasil Lab         : GDP {user_context.gula_darah_puasa} mg/dL | HbA1c {user_context.hba1c}%",
            f"• Target Kalori     : {user_context.target_kalori} kkal / hari",
            f"• Diet Terpilih     : {user_context.active_diet}",
            f"• Riwayat Komorbid  : {', '.join(komorbid_list) if komorbid_list else 'Tidak ada komorbiditas tercatat'}",
            f"• PANTANGAN MUTLAK  : {', '.join(allergens) if allergens else 'Tidak ada pantangan khusus'}",
            "",
            "DAFTAR MAKANAN NUSANTARA TERVERIFIKASI AMAN (HASIL FILTER GRAF NEO4J 100% BEBAS ALERGEN):"
        ]

        for f in safe_foods[:6]:
            dossier_lines.append(
                f"- {f['nama']}: {f['kalori']} kkal (Karbo: {f['karbohidrat']}g, Protein: {f['protein']}g, Lemak: {f['lemak']}g, Sodium: {f['sodium_mg']}mg, GI: {f['gi']}). Cara olah: {f['cara_olah']}."
            )

        if guideline_texts:
            dossier_lines.append("\nPANDUAN KLINIS RESMI (PERKENI 2021 & KEMENKES 3J):")
            for doc in guideline_texts:
                dossier_lines.append(doc[:400])

        dossier_lines.append(
            f"\nPERINGATAN PROTOKOL ZERO-ALLERGEN (MUTLAK): DILARANG KERAS menyarankan makanan, resep, atau bahan masakan yang mengandung {', '.join(allergens) if allergens else 'gula sederhana dan minyak jelantah'}. Jangan sekali-kali menambahkan santan, kacang, kacang panjang, atau seafood jika tercantum dalam pantangan di atas!"
        )

        dossier_text = "\n".join(dossier_lines)
        return dossier_text, safe_food_names, allergens

fusion_engine = HybridGraphVectorFusion(neo4j_manager, vector_manager)
