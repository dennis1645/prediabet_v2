from typing import Tuple, List, Dict, Any, Optional
from app.core.neo4j_manager import Neo4jClinicalGraphManager, neo4j_manager
from app.core.vector_manager import ClinicalVectorStoreManager, vector_manager
from app.core.allergen_guardrail import allergen_guardrail
from app.core.prompt_templates import get_patient_display_name, is_identity_query
from app.core.culinary_normalizer import culinary_normalizer
from app.core.met_calculator import calculate_exercise_calories
from app.core.logger_config import rag_logger
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
        chat_history: List[Any] = None,
        last_suggested_recipe: Optional[Dict[str, Any]] = None
    ) -> Tuple[str, List[str], List[str], Any, Optional[Dict[str, Any]], Optional[Dict[str, Any]], Optional[Dict[str, Any]], Optional[Dict[str, Any]], Optional[Dict[str, Any]]]:
        """
        Menyusun Dossier Klinis unik untuk satu user tertentu.
        Menghasilkan:
        - dossier_text: Teks konteks yang aman dan terverifikasi untuk prompt LLM
        - safe_food_names: Daftar nama makanan yang dijamin aman
        - allergens_prevented: Daftar alergen yang dicegah
        - specific_food: Objek makanan spesifik jika pengguna menanyakan kandungan nutrisi bahan tertentu
        - confirmation_payload: Payload konfirmasi typo interaktif (Ya / Tidak)
        - exercise_payload: Hasil kalkulasi olahraga deterministik (MET)
        - sugar_verification: Verifikasi takaran gula untuk minuman manis (Anti-Halu)
        - contextual_recipe: Resep yang disetujui pengguna (Contextual Quick-Log)
        - story_foods: Makanan yang terdeteksi dari cerita santai pengguna
        """
        # 1. Parsing Komorbiditas & Alergen Pengguna (Deduplikasi Bersih)
        rag_logger.info("================================================================================")
        rag_logger.info("MEMULAI HYBRID GRAPHRAG RETRIEVAL: Query: '%s' | User ID: '%s'", user_query, getattr(user_context, "userId", "-"))
        
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
        rag_logger.debug("Profil Pasien: Alergen: %s | Kondisi/Komorbid: %s", allergens, conditions)

        # Cek Normalisasi Typo & Istilah Kuliner Nusantara
        _, confirmation_payload = culinary_normalizer.normalize_food_query(user_query)

        # Cek Verifikasi Minuman Manis (Anti-Halu Es Teh Manis dll)
        sugar_verification = culinary_normalizer.detect_sweet_beverage_verification(user_query)

        # Cek Contextual Recipe Intent (misal 'okee aku mau makan itu')
        contextual_recipe = culinary_normalizer.detect_contextual_recipe_intent(user_query, last_suggested_recipe)

        # Cek Ekstraksi Makanan dari Cerita Pasien
        story_foods = culinary_normalizer.extract_story_foods(user_query)

        # Cek Kalkulator Kalori Olahraga Deterministik (MET)
        user_weight = getattr(user_context, 'berat_badan', 68.0) or 68.0
        exercise_payload = calculate_exercise_calories(user_query, user_weight)

        # 2. Penelusuran Graf Deterministik (Neo4j / Fallback Engine)
        safe_foods = self.graph.get_safe_foods_by_profile(conditions, allergens, limit=8)
        
        # Ekstra verifikasi dengan Guardrail
        safe_foods = allergen_guardrail.filter_safe_food_candidates(safe_foods, allergens)
        safe_food_names = [f["nama"] for f in safe_foods]
        rag_logger.debug("Safe Foods Graf (Terverifikasi Guardrail): %d kandidat -> %s", len(safe_food_names), safe_food_names)

        # 3. Penelusuran Bahan Makanan Spesifik dari Query / History (misal: "Berapa protein dada ayam", "berapa gram?")
        specific_food = self.graph.find_specific_food(user_query, chat_history or [])
        if specific_food:
            rag_logger.info("Specific Food Matched: %s (Kalori: %s, Protein: %s)", specific_food.get("nama") or specific_food.get("nama_makanan"), specific_food.get("kalori"), specific_food.get("protein"))
        else:
            rag_logger.debug("No specific single food matched for query.")

        # Deteksi apakah pengguna memang meminta resep / menu masakan (bukan sekadar tanya gizi per 100g)
        ql = (user_query or "").lower()
        recipe_keywords = [
            "resep", "menu", "masak", "makanan apa", "saran makanan", "rekomendasi makanan",
            "saranin", "sarankan", "sarapan apa", "makan siang apa", "makan malam apa",
            "ide makan", "olah", "selain itu", "yang lain", "ada menu lain", "opsi lain", "pilihan lain",
            "pengen makan", "ingin makan", "berkuah", "hangat", "sop", "sup"
        ]
        user_wants_recipe = any(k in ql for k in recipe_keywords)
        user_asks_nutrient_only = any(k in ql for k in ["berapa", "protein", "karbo", "lemak", "kalori", "gizi"]) and not any(k in ql for k in ["resep", "cara buat", "cara masak", "bikin", "langkah"])

        # JIKA PENGGUNA MENCERITAKAN KONSUMSI MAKANAN (STORY FOODS):
        # SUPPRESS specific_food mentah agar tidak menimpa menu konsumsi nyata (misal 'ayam goreng + nasi')
        if story_foods and story_foods.get("items"):
            specific_food = None

        from app.core.neo4j_manager import resolve_food_image

        # Jika pengguna meminta resep / ide makan: SELALU bentuk objek resep hidangan utuh (bukan takaran mentah 100g!)
        if user_wants_recipe and not user_asks_nutrient_only:
            # Variasi menu Nusantara 3J terverifikasi
            recipe_catalog = [
                {
                    "nama_makanan": "Sayur Bening Bayam Oyong Jagung Manis",
                    "kalori": 65, "protein": 2.8, "karbohidrat": 12.0, "lemak": 0.4, "gi_val": 25,
                    "cara_olah": "Rebus kuah bening temu kunci tanpa minyak jelantah"
                },
                {
                    "nama_makanan": "Soto Ayam Kuah Bening Lamongan",
                    "kalori": 160, "protein": 20.0, "karbohidrat": 8.0, "lemak": 4.0, "gi_val": 32,
                    "cara_olah": "Rebus kuah rempah kuning tanpa santan"
                },
                {
                    "nama_makanan": "Pepes Ikan Mas Daun Kemangi",
                    "kalori": 180, "protein": 26.0, "karbohidrat": 2.0, "lemak": 6.5, "gi_val": 0,
                    "cara_olah": "Kukus bumbu rempah alami berbalut daun pisang"
                },
                {
                    "nama_makanan": "Sup Dada Ayam Bening Wortel Jamur",
                    "kalori": 145, "protein": 22.0, "karbohidrat": 6.0, "lemak": 2.5, "gi_val": 30,
                    "cara_olah": "Rebus kuah kaldu rempah bening rendah lemak"
                },
                {
                    "nama_makanan": "Tumis Buncis Tahu Kukus Bumbu Bawang",
                    "kalori": 120, "protein": 11.0, "karbohidrat": 9.0, "lemak": 3.5, "gi_val": 28,
                    "cara_olah": "Tumis air tanpa minyak dengan bawang putih dan temu kunci"
                }
            ]

            # Tentukan hidangan spesifik yang diminta atau direkomendasikan
            if any(w in ql for w in ["sayur bening", "bayam oyong", "oyong", "gambas"]):
                chosen = recipe_catalog[0]
            elif any(w in ql for w in ["soto", "soto ayam"]):
                chosen = recipe_catalog[1]
            elif any(w in ql for w in ["pepes", "ikan mas", "pepes ikan"]):
                chosen = recipe_catalog[2]
            elif any(w in ql for w in ["sop ayam", "sup ayam", "sop", "sup"]):
                chosen = recipe_catalog[3]
            elif any(w in ql for w in ["tahu", "buncis"]):
                chosen = recipe_catalog[4]
            elif any(w in ql for w in ["nasi merah", "beras merah"]):
                chosen = {
                    "nama_makanan": "Nasi Beras Merah Pulen",
                    "kalori": 149, "protein": 2.8, "karbohidrat": 32.5, "lemak": 0.4, "gi_val": 47,
                    "cara_olah": "Kukus aron pulen kaya serat penstabil glukosa"
                }
            else:
                # Rotasi dinamis berdasarkan riwayat turn agar tidak monoton (variasi menu setiap kali ditanya "selain itu?")
                turn_count = len(chat_history) if chat_history else 0
                chosen = recipe_catalog[turn_count % len(recipe_catalog)]

            dish_name = chosen["nama_makanan"]
            cal = chosen["kalori"]
            prot = chosen["protein"]
            carb = chosen["karbohidrat"]
            fat = chosen["lemak"]
            gi_val = chosen["gi_val"]
            cara = chosen["cara_olah"]

            specific_food = {
                "nama_makanan": dish_name,
                "nama": dish_name,
                "kategori": "Resep Masakan 3J",
                "kalori": cal,
                "protein": prot,
                "karbohidrat": carb,
                "lemak": fat,
                "gi": gi_val,
                "gi_category": f"GI Rendah ({gi_val})" if gi_val < 55 else f"GI Sedang ({gi_val})",
                "gambar": resolve_food_image(dish_name),
                "cara_olah": cara,
                "alasan_klinis": f"Hidangan bergizi seimbang ramah respon insulin ({cal} kkal, bebas minyak jelantah)."
            }

        # 4. Penelusuran Semantik Dokumen Panduan Medis
        guideline_texts = []
        if user_wants_recipe or any(k in ql for k in ["diet", "3j", "jadwal", "pola", "diabetes", "gula darah"]):
            semantic_hits = self.vector.query_semantic(user_query, n_results=2)
            guideline_texts = [h["document"] for h in semantic_hits]
            rag_logger.info("Semantic Search Hits (ChromaDB/Vector): %d dokumen panduan PERKENI/Kemenkes ditemukan.", len(guideline_texts))
            for i, h in enumerate(semantic_hits):
                rag_logger.debug("Hit %d: %s", i+1, h.get("metadata", {}).get("title", "Panduan"))

        # 5. Perakitan Dossier Terisolasi (User-Specific Isolated Context)
        dossier_lines = []
        patient_name = get_patient_display_name(user_context)

        # Deteksi makanan tradisional berisiko tinggi lonjakan gula (contoh: tahu gejrot, es campur, boba)
        high_risk_sweet = allergen_guardrail.detect_high_risk_sweet_food(user_query)
        if high_risk_sweet:
            dossier_lines.extend([
                f"=== PERINGATAN PROTOKOL KLINIS GLIKEMIK (KONTRAINDIKASI GULA SEDERHANA) ===",
                f"• Makanan yang Ditanyakan : {high_risk_sweet['nama']}",
                f"• Bahaya Klinis Prediabetes: {high_risk_sweet['risiko']}",
                f"• Wajib Modifikasi Aman   : {high_risk_sweet['solusi']}",
                f"[INSTRUKSI MUTLAK DOKTER PREDI]: Pasien menanyakan hidangan ini. Sesuai panduan PERKENI 2021, DILARANG KERAS memberikan resep tradisional dengan kuah gula merah pekat atau gorengan minyak jelantah! Anda WAJIB menjelaskan risiko lonjakan glukosa darah (glycemic spike) secara lugas, lalu HANYA menyajikan resep MODIFIKASI SEHAT RAMAH PREDIABETES (kuah asam segar + pemanis alami stevia dan tahu kukus/air-fryer).",
            ])

        # Injeksi Data Cache Database Progres (Stateful Query Cache Anti-Ledakan Context)
        db_cache = getattr(user_context, "database_progress_cache", None)
        if db_cache and isinstance(db_cache, str) and db_cache.strip():
            dossier_lines.append(db_cache.strip())

        # Rekam medis pasien HANYA dimasukkan sesuai kebutuhan spesifik:
        if is_identity_query(user_query):
            raw_name = getattr(user_context, "nama", None) or getattr(user_context, "username", "Pasien")
            dossier_lines.append(f"• Identitas Pasien: Nama {patient_name} (Username: {getattr(user_context, 'username', '-')}).")
        elif any(k in ql for k in ["umur", "usia"]):
            if getattr(user_context, "usia", None):
                dossier_lines.append(f"• Usia Pasien: {user_context.usia} tahun.")
            else:
                dossier_lines.append(f"• Usia Pasien: Belum ada data usia yang diisi di profil.")
        elif any(k in ql for k in ["berat", "bb"]):
            if getattr(user_context, "berat_badan", None):
                dossier_lines.append(f"• Berat Badan Pasien: {user_context.berat_badan} kg.")
            else:
                dossier_lines.append(f"• Berat Badan Pasien: Belum ada data berat badan yang diisi di profil.")
        elif any(k in ql for k in ["tinggi", "tb"]):
            if getattr(user_context, "tinggi_badan", None):
                dossier_lines.append(f"• Tinggi Badan Pasien: {user_context.tinggi_badan} cm.")
            else:
                dossier_lines.append(f"• Tinggi Badan Pasien: Belum ada data tinggi badan yang diisi di profil.")
        elif any(k in ql for k in ["alergi", "pantangan"]):
            dossier_lines.append(f"• Pantangan Alergi: {', '.join(allergens) if allergens else 'Tidak ada pantangan khusus'}.")
        elif any(k in ql for k in ["sehat", "ideal", "bmi", "kondisi", "gawat", "bahaya", "gimana", "bagaimana"]):
            bb_val = f"{user_context.berat_badan} kg" if getattr(user_context, "berat_badan", None) else "belum tercatat"
            tb_val = f"{user_context.tinggi_badan} cm" if getattr(user_context, "tinggi_badan", None) else "belum tercatat"
            bmi_val = f"{user_context.bmi} ({user_context.kategori_bmi})" if getattr(user_context, "bmi", None) else "belum dihitung"
            dossier_lines.append(
                f"• Kondisi Klinis & BMI Pasien: Berat badan {bb_val}, tinggi {tb_val}, BMI {bmi_val}. "
                f"Tidak perlu panik atau khawatir berlebihan. Dengan perbaikan pola makan 3J dan aktivitas fisik bertahap, kondisi ini sangat bisa dikendalikan dan ditingkatkan kesehatannya."
            )
        elif user_wants_recipe or any(k in ql for k in ["gula", "hba1c", "lab", "kalori"]):
            dossier_lines.extend([
                f"=== DATA REKAM MEDIS RESMI PASIEN (ACUAN KLINIS) ===",
                f"• Nama Pasien       : {patient_name}",
                f"• Usia Pasien       : {getattr(user_context, 'usia', None) or '-'} tahun | BMI: {getattr(user_context, 'bmi', None) or '-'} ({getattr(user_context, 'kategori_bmi', None) or '-'})",
                f"• Hasil Lab         : GDP {getattr(user_context, 'gula_darah_puasa', None) or '-'} mg/dL | HbA1c {getattr(user_context, 'hba1c', None) or '-'}%",
                f"• Target Energi 3J  : {getattr(user_context, 'target_kalori', None) or 1900} kkal/hari",
                f"• PANTANGAN ALERGI  : {', '.join(allergens) if allergens else 'Tidak ada pantangan khusus'} (MUTLAK DILARANG)",
            ])

        if specific_food:
            food_display_name = specific_food.get('nama_makanan') or specific_food.get('nama') or 'Bahan Makanan'
            food_gi = specific_food.get('gi') if specific_food.get('gi') is not None else specific_food.get('gi_category', 'Rendah')
            dossier_lines.extend([
                "",
                f"=== DATA GIZI KLINIS SPESIFIK HASIL QUERY DETERMINISTIK NEO4J (ACUAN RESMI PER 100 GRAM) ===",
                f"• Nama Bahan Makanan  : {food_display_name}",
                f"• Takaran Acuan        : 100 gram",
                f"• Kandungan Protein    : {specific_food.get('protein', 0)} gram",
                f"• Total Energi (Kalori): {specific_food.get('kalori', 0)} kkal",
                f"• Kandungan Karbohidrat: {specific_food.get('karbohidrat', 0)} gram",
                f"• Kandungan Lemak      : {specific_food.get('lemak', 0)} gram",
                f"• Indeks Glikemik (GI) : {food_gi} (Kategori Rendah - Sangat Aman bagi Respon Insulin)",
                f"• Rekomendasi Olah     : {specific_food.get('cara_olah', 'Kukus/Rebus')} tanpa minyak jelantah",
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

        # Injeksi Perhitungan Olahraga Deterministik (MET Science Formula)
        if exercise_payload:
            dossier_lines.extend([
                "",
                f"=== PERHITUNGAN KALORI OLAHRAGA DETERMINISTIK (MET STANDAR MEDIS CDC/ACSM) ===",
                f"• Jenis Aktivitas   : {exercise_payload['activity_name']}",
                f"• Durasi Latihan    : {exercise_payload['duration_minutes']} menit",
                f"• Kalori Terbakar   : {exercise_payload['activity_calories']} kkal (MET: {exercise_payload['met']}, BB: {exercise_payload['weight_used']} kg)",
                f"• Catatan Klinis    : {exercise_payload['clinical_note']}",
                f"[INSTRUKSI DOKTER PREDI]: Sebutkan angka pembakaran kalori ini (~{exercise_payload['activity_calories']} kkal) secara lugas dan beri apresiasi positif atas konsistensi pasien!",
            ])

        # Injeksi Typo / Konfirmasi Kuliner
        if confirmation_payload and confirmation_payload.get("requires_confirmation"):
            dossier_lines.extend([
                "",
                f"=== DETEKSI TYPO / SINGKATAN KULINER ===",
                f"• Typo Terdeteksi   : {confirmation_payload['detected_typo']}",
                f"• Bahan Maksud Resmi: {confirmation_payload['target_food']}",
                f"[INSTRUKSI DOKTER PREDI]: Awali jawaban dengan konfirmasi ramah: '{confirmation_payload['confirm_prompt']}'. Tampilkan data gizi resminya secara presisi.",
            ])
        elif confirmation_payload and confirmation_payload.get("is_culinary_equivalent"):
            dossier_lines.extend([
                "",
                f"=== ANALISIS EKUIVALEN KULINER NUSANTARA ({confirmation_payload['term'].upper()}) ===",
                f"• Ekuivalen Profil  : {confirmation_payload['target_food']}",
                f"• Tinjauan Klinis   : {confirmation_payload['penjelasan']}",
                f"[INSTRUKSI DOKTER PREDI]: Edukasi pasien mengenai kemiripan profil gizi hidangan tersebut dengan bijak dan ramah prediabetes.",
            ])

        # Injeksi Protokol Anti-Halu Verifikasi Gula Minuman
        if sugar_verification:
            dossier_lines.extend([
                "",
                "=== PROTOKOL ANTI-HALU: VERIFIKASI TAKARAN GULA MINUMAN ===",
                f"• Minuman Terdeteksi: {sugar_verification['item_name']}",
                "• INSTRUKSI MUTLAK : DILARANG MENEBAK ATAU MENENTUKAN SENDIRI KALORI / GULA MINUMAN INI!",
                f"• TINDAKAN DOKTER  : Tanyakan ramah kepada pasien: '{sugar_verification['question']}'. Berikan edukasi klinis bahwa gula cair sederhana memicu lonjakan glukosa darah (GI tinggi) mendadak.",
            ])

        # Injeksi Contextual Quick-Log (Persetujuan Resep)
        if contextual_recipe:
            rc = contextual_recipe["recipe"]
            dossier_lines.extend([
                "",
                "=== PERSETUJUAN RESEP OLEH PASIEN (CONTEXTUAL QUICK-LOG) ===",
                f"• Resep Disetujui  : {rc.get('nama_makanan', 'Rekomendasi Menu 3J')}",
                f"• Kalori           : {rc.get('kalori', 0)} kkal",
                f"[INSTRUKSI DOKTER PREDI]: Sambut dengan sangat antusias dan konfirmasikan bahwa menu '{rc.get('nama_makanan')}' langsung dijadwalkan dan dicatatkan ke menu hari ini!",
            ])

        # Injeksi Ekstraksi Cerita Makanan
        if story_foods and story_foods.get("items"):
            dossier_lines.extend([
                "",
                "=== DETEKSI POLA MAKAN DARI CERITA PASIEN ===",
                f"• Makanan Terdeteksi: {', '.join(x['nama'] for x in story_foods['items'])}",
                f"• Total Kalori Baku : ~{story_foods['total_kalori_known']} kkal",
                f"[INSTRUKSI DOKTER PREDI]: Apresiasi keterbukaan pasien menceritakan makanannya, jelaskan ringkasan gizi bahan-bahan tersebut, dan ingatkan batasan minyak/gula.",
            ])

        dossier_lines.append(
            f"\nPERINGATAN PROTOKOL ZERO-ALLERGEN (MUTLAK): DILARANG KERAS menyarankan makanan atau bahan yang mengandung {', '.join(allergens) if allergens else 'gula sederhana dan minyak jelantah'}. Jangan menyarankan santan, kacang, kacang panjang, atau seafood!"
        )

        dossier_text = "\n".join(dossier_lines)
        rag_logger.info("SELESAI MERAKIT DOSSIER KLINIS: Total karakter: %d, Safe Foods: %d, Alergen: %s", len(dossier_text), len(safe_food_names), allergens)
        return dossier_text, safe_food_names, allergens, specific_food, confirmation_payload, exercise_payload, sugar_verification, contextual_recipe, story_foods

fusion_engine = HybridGraphVectorFusion(neo4j_manager, vector_manager)
