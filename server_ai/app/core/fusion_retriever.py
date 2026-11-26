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
        patient_name = get_patient_display_name(user_context)
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
        is_snack_request = any(k in ql for k in ["selingan", "cemilan", "camilan", "ngemil", "snack", "kudapan"])
        recipe_keywords = [
            "resep", "menu", "masak", "makanan apa", "saran makanan", "rekomendasi makanan",
            "saranin", "sarankan", "sarapan apa", "makan siang apa", "makan malam apa",
            "ide makan", "olah", "olahan", "selain itu", "yang lain", "ada menu lain", "opsi lain", "pilihan lain",
            "pengen makan", "ingin makan", "berkuah", "hangat", "sop", "sup", "soto",
            "basis", "bahan dasar", "enaknya dimasak apa", "punya bahan", "masak apa", "dimasak apa", "bikin apa",
            "kalau basis", "kalau bahan", "makan siang", "makan malam", "sarapan",
            "selingan", "cemilan", "camilan", "ngemil", "snack", "kudapan"
        ]
        user_wants_recipe = any(k in ql for k in recipe_keywords)
        user_asks_nutrient_only = any(k in ql for k in ["berapa", "gizi"]) and not any(k in ql for k in [
            "resep", "cara buat", "cara masak", "bikin", "langkah", "basis", "bahan dasar", "olahan", "masak apa", "dimasak apa", "menu", "saran"
        ])

        # Pertanyaan keamanan / pantangan alergi (misal: "Gado-gado kalau alergi kacang bisa gak?", "apakah saya boleh makan sop daging sapi?") bukan permintaan resep
        is_dietary_safety_inquiry = any(k in ql for k in [
            "alergi", "pantangan", "boleh", "bolehkah", "diperbolehkan",
            "bisa gak", "bisa makan", "aman", "bahaya"
        ]) and not any(k in ql for k in ["resep", "cara masak", "cara buat", "langkah masak", "bumbu"])
        if is_dietary_safety_inquiry:
            user_wants_recipe = False

        # JIKA PENGGUNA MENCERITAKAN KONSUMSI MAKANAN (STORY FOODS):
        # SUPPRESS specific_food mentah agar tidak menimpa menu konsumsi nyata (misal 'ayam goreng + nasi')
        if story_foods and story_foods.get("items"):
            specific_food = None

        # JIKA PENGGUNA MENANYAKAN MEAL PLAN ATAU PROGRESS TRACKER:
        # SUPPRESS specific_food agar tidak terdistraksi oleh resep acak
        from app.core.prompt_templates import is_meal_plan_query, is_progress_tracker_query
        if is_meal_plan_query(user_query) or is_progress_tracker_query(user_query):
            specific_food = None
            user_wants_recipe = False

        from app.core.neo4j_manager import resolve_food_image

        # Jika pengguna meminta resep / ide makan: TELUSURI RAG DOKUMEN RESEP DINAMIS (Anti-Looping)
        if user_wants_recipe and not user_asks_nutrient_only:
            # 1. Kumpulkan judul resep yang sudah pernah disarankan di sesi ini agar tidak mengulang (Blacklist)
            already_suggested = []
            if chat_history:
                for turn in chat_history:
                    c_text = (turn.content if hasattr(turn, "content") else turn.get("content", "")).lower()
                    for r_item in getattr(self.vector, "_recipes_catalog", []):
                        r_name = r_item["nama_makanan"]
                        if r_name.lower() in c_text and r_name not in already_suggested:
                            already_suggested.append(r_name)

            if last_suggested_recipe and last_suggested_recipe.get("nama_makanan"):
                if last_suggested_recipe["nama_makanan"] not in already_suggested:
                    already_suggested.append(last_suggested_recipe["nama_makanan"])

            # JANGAN blacklist resep jika user sekarang justru secara spesifik meminta resep hidangan tersebut!
            import re
            already_suggested = [
                name for name in already_suggested
                if not any(token in ql for token in re.findall(r'\w+', name.lower()) if len(token) >= 4 and token not in ["resep", "ayam", "sayur", "kuah", "masak", "goreng"])
            ]

            # 2. Cek apakah ini pertanyaan kelanjutan ("ada yang lain?", "selain itu ada ngga?", "ada lagi?")
            context_theme = ""
            is_follow_up_recipe = any(k in ql for k in ["selain itu", "yang lain", "ada lagi", "menu lain", "opsi lain", "resep lain", "ada yang lain"])
            if is_follow_up_recipe and chat_history:
                for turn in reversed(chat_history):
                    role = getattr(turn, "role", None) or (turn.get("role") if isinstance(turn, dict) else "")
                    if role == "user":
                        u_text = (turn.content if hasattr(turn, "content") else turn.get("content", "")).lower()
                        if any(w in u_text for w in ["kuah", "berkuah", "hangat", "sop", "sup", "soto", "ikan", "ayam", "sayur", "tumis", "pepes"]):
                            context_theme = u_text
                            break

            # 3. Khusus permintaan SELINGAN / CEMILAN: wajib camilan ringan (~65-115 kkal), BUKAN makan berat
            if is_snack_request:
                snack_pool = [
                    {"nama": "Apel Malang Segar", "nama_makanan": "Apel Malang Segar", "kategori": "Cemilan / Selingan", "kalori": 65, "protein": 0.3, "karbohidrat": 15.0, "lemak": 0.2, "gi": 36, "alasan_klinis": "Buah rendah GI kaya pektin, pas untuk selingan ~65 kkal tanpa memicu lonjakan gula."},
                    {"nama": "Pir Hijau Potong", "nama_makanan": "Pir Hijau Potong", "kategori": "Cemilan / Selingan", "kalori": 75, "protein": 0.5, "karbohidrat": 18.0, "lemak": 0.2, "gi": 38, "alasan_klinis": "Serat larut tinggi memperlambat absorbsi glukosa, cocok sebagai camilan segar ~75 kkal."},
                    {"nama": "Pepaya Potong Jeruk Nipis", "nama_makanan": "Pepaya Potong Jeruk Nipis", "kategori": "Cemilan / Selingan", "kalori": 70, "protein": 0.8, "karbohidrat": 16.0, "lemak": 0.3, "gi": 40, "alasan_klinis": "Ringan di lambung dan kaya antioksidan dengan kalori terkontrol ~70 kkal."},
                    {"nama": "Edamame Rebus", "nama_makanan": "Edamame Rebus", "kategori": "Cemilan / Selingan", "kalori": 95, "protein": 9.0, "karbohidrat": 8.0, "lemak": 4.0, "gi": 18, "alasan_klinis": "Camilan tinggi protein nabati & serat (GI 18), menjaga rasa kenyang di antara jam makan."},
                    {"nama": "Alpukat Kocok Tawar", "nama_makanan": "Alpukat Kocok Tawar", "kategori": "Cemilan / Selingan", "kalori": 110, "protein": 1.5, "karbohidrat": 6.0, "lemak": 9.0, "gi": 15, "alasan_klinis": "Lemak tak jenuh tunggal membantu sensitivitas insulin tanpa tambahan gula."},
                    {"nama": "Pisang Kepok Kukus", "nama_makanan": "Pisang Kepok Kukus", "kategori": "Cemilan / Selingan", "kalori": 90, "protein": 1.1, "karbohidrat": 22.0, "lemak": 0.3, "gi": 45, "alasan_klinis": "Camilan Nusantara dikukus tanpa minyak/gula, pas untuk energi ringan ~90 kkal."},
                    {"nama": "Kacang Almond Panggang Tawar", "nama_makanan": "Kacang Almond Panggang Tawar", "kategori": "Cemilan / Selingan", "kalori": 95, "protein": 3.5, "karbohidrat": 3.0, "lemak": 8.0, "gi": 15, "alasan_klinis": "Camilan rendah karbohidrat (3g) kaya magnesium untuk kestabilan glukosa."},
                ]
                safe_snacks = allergen_guardrail.filter_safe_food_candidates(snack_pool, allergens)
                fresh_snacks = [s for s in safe_snacks if s["nama"] not in already_suggested]
                chosen_snack = (fresh_snacks or safe_snacks or snack_pool)[0]
                specific_food = {
                    **chosen_snack,
                    "gi_category": f"GI Rendah ({chosen_snack['gi']})",
                    "gambar": resolve_food_image(chosen_snack["nama"]),
                    "bahan": f"1 porsi {chosen_snack['nama']} segar",
                    "langkah": "Cuci bersih atau kukus sebentar tanpa tambahan gula/garam berlebih, lalu sajikan sesuai porsi selingan.",
                    "cara_olah": "Segar / Kukus",
                    "meal_time": "Selingan",
                }
            else:
                # 3. Panggil RAG Resep Masakan (Bebas Alergen & Anti-Looping)
                patient_id_seed = f"{getattr(user_context, 'userId', '')}_{patient_name}"
                chosen = self.vector.query_recipes(
                    query=user_query,
                    exclude_titles=already_suggested,
                    user_allergens=allergens,
                    context_theme=context_theme,
                    user_conditions=conditions,
                    patient_seed=patient_id_seed
                )

                if chosen:
                    dish_name = chosen["nama_makanan"]
                    cal = chosen["kalori"]
                    prot = chosen["protein"]
                    carb = chosen["karbohidrat"]
                    fat = chosen["lemak"]
                    gi_val = chosen["gi_val"]
                    cara = chosen["cara_olah"]
                    inferred_meal_time = (
                        "Makan Malam" if "makan malam" in ql else
                        "Makan Siang" if "makan siang" in ql else
                        "Sarapan" if "sarapan" in ql else
                        None
                    )

                    specific_food = {
                        "nama_makanan": dish_name,
                        "nama": dish_name,
                        "kategori": chosen.get("kategori", "Resep Masakan 3J"),
                        "kalori": cal,
                        "protein": prot,
                        "karbohidrat": carb,
                        "lemak": fat,
                        "gi": gi_val,
                        "gi_category": f"GI Rendah ({gi_val})" if gi_val < 55 else f"GI Sedang ({gi_val})",
                        "gambar": resolve_food_image(dish_name),
                        "bahan": chosen.get("bahan", ""),
                        "langkah": chosen.get("langkah", ""),
                        "cara_olah": cara,
                        "meal_time": inferred_meal_time,
                        "alasan_klinis": chosen.get("tips", f"Hidangan bergizi seimbang ramah respon insulin ({cal} kkal, bebas minyak jelantah).")
                    }

                    # Jika pengguna meminta multi-menu (misal: "sarankan 3 menu dulu"), lampirkan multi-candidates ke specific_food
                    is_multi_req = any(k in ql for k in ["3 menu", "tiga menu", "2 menu", "dua menu", "beberapa menu", "pilihan menu", "opsi menu"])
                    if is_multi_req:
                        multi_candidates = self.vector.get_multi_recipe_candidates(
                            query=user_query,
                            limit=3,
                            exclude_titles=already_suggested,
                            user_allergens=allergens
                        )
                        specific_food["multi_menu_candidates"] = multi_candidates

                    rag_logger.info("RAG Resep Dinamis Terpilih: '%s' (Kalori: %s, Excluded: %s)", dish_name, cal, already_suggested)

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

        # Rekam medis resmi pasien dimasukkan secara konsisten sebagai acuan klinis Dr. Predi:
        user_bb = f"{user_context.berat_badan} kg" if getattr(user_context, "berat_badan", None) else "belum tercatat"
        user_tb = f"{user_context.tinggi_badan} cm" if getattr(user_context, "tinggi_badan", None) else "belum tercatat"
        user_age = f"{user_context.usia} tahun" if getattr(user_context, "usia", None) else "belum tercatat"
        user_bmi = f"{user_context.bmi} ({user_context.kategori_bmi})" if getattr(user_context, "bmi", None) else "belum dihitung"
        user_risk = getattr(user_context, "kategori_risiko", "Prediabetes")
        user_cal = getattr(user_context, "target_kalori", 1850)
        user_diet = getattr(user_context, "active_diet", "Diet Gizi Seimbang 3J")

        dossier_lines.extend([
            f"=== DATA REKAM MEDIS & PROFIL RESMI PASIEN (ACUAN KLINIS DR. PREDI) ===",
            f"• Nama Pasien        : {patient_name} (Username: {getattr(user_context, 'username', '-')})",
            f"• Berat Badan Pasien : {user_bb}",
            f"• Tinggi Badan Pasien: {user_tb}",
            f"• Usia Pasien        : {user_age}",
            f"• Indeks Massa Tubuh : {user_bmi}",
            f"• Kategori Risiko    : {user_risk}",
            f"• Target Kalori 3J   : {user_cal} kkal/hari ({user_diet})",
            f"• Pantangan Alergi   : {', '.join(allergens) if allergens else 'Tidak ada pantangan khusus'}",
            f"• Kondisi Komorbid   : {', '.join(conditions) if conditions else 'Tidak ada komorbid'}"
        ])

        if specific_food and not specific_food.get("bahan"):
            food_display_name = specific_food.get('nama_makanan') or specific_food.get('nama') or 'Bahan Makanan'
            # Cek konflik alergen pada specific_food agar tidak pernah lolos dengan badge aman!
            if allergens and not allergen_guardrail.verify_food_item_is_safe(food_display_name, allergen_guardrail.expand_allergen_keywords(allergens)):
                specific_food["allergen_conflict"] = allergens

            raw_gi = specific_food.get('gi')
            if raw_gi is not None and isinstance(raw_gi, (int, float)) and raw_gi > 0:
                gi_cat = "Rendah" if raw_gi < 55 else ("Sedang" if raw_gi < 70 else "Tinggi - Perlu Dibatasi")
                gi_line = f"• Indeks Glikemik (GI) : {raw_gi} (Kategori {gi_cat})"
            else:
                gi_line = "• Indeks Glikemik (GI) : Data GI spesifik tidak tersedia (opsional)"

            porsi_label = specific_food.get('porsi_label') or '100 gram'
            sugar_val = specific_food.get('gula', 0)
            comorbid_str = ", ".join(conditions).lower()
            has_htn = any(k in comorbid_str or k in ql for k in ["hipertensi", "darah tinggi", "tensi"])
            is_goat = any(k in food_display_name.lower() or k in ql for k in ["kambing", "sate kambing", "gulai"])

            extra_notes = []
            if specific_food.get("not_found_item"):
                alts = ", ".join(specific_food.get("available_alternatives") or ["Nasi Putih", "Nasi Merah"])
                extra_notes.append(f"[INFO DATASET]: '{specific_food['not_found_item']}' TIDAK ADA di database PrediaBeat. Jelaskan jujur bahwa item tersebut tidak tersedia dan tawarkan pilihan yang ada: {alts}.")
            if specific_food.get("ambiguous_choices"):
                choices_str = ", ".join(specific_food["ambiguous_choices"])
                extra_notes.append(f"[KLARIFIKASI SATE]: Pasien menyebut 'sate' secara umum. Tampilkan acuan {food_display_name}, lalu TANYAKAN dengan ramah sate mana yang dimaksud ({choices_str}) karena nilai kalori, lemak, dan keamanan hipertensinya berbeda.")
            if specific_food.get("allergen_conflict"):
                extra_notes.append(f"[PERINGATAN ALERGI KERAS]: Makanan '{food_display_name}' MENGANDUNG pantangan/alergi pasien ({', '.join(allergens)}). DILARANG menyarankan makan ini; peringatkan pasien dan beri alternatif aman!")
            if is_goat and has_htn:
                extra_notes.append("[PERINGATAN HIPERTENSI]: Pasien memiliki komorbid hipertensi/darah tinggi. Sate kambing/daging kambing tinggi lemak jenuh & natrium bumbu kecap — WAJIB diwaspadai, batasi porsi maksimal 3-5 tusuk tanpa lemak/gajih dan tanpa kecap/garam berlebih!")

            dossier_lines.extend([
                "",
                f"=== DATA GIZI KLINIS SPESIFIK HASIL QUERY DETERMINISTIK (ACUAN {porsi_label.upper()}) ===",
                f"• Nama Bahan Makanan  : {food_display_name}",
                f"• Takaran Acuan        : {porsi_label}",
                f"• [1. MAKRO UTAMA]     : Kalori {specific_food.get('kalori', 0)} kkal | Karbo {specific_food.get('karbohidrat', 0)}g | Protein {specific_food.get('protein', 0)}g | Lemak {specific_food.get('lemak', 0)}g",
                f"• [2. GULA MAKANAN]    : {sugar_val}g (cek juga total asupan harian pasien hari ini sebelum menyarankan)",
                gi_line,
                f"• Rekomendasi Olah     : {specific_food.get('cara_olah', 'Kukus/Rebus')} tanpa minyak jelantah",
                *extra_notes,
                f"[INSTRUKSI KHUSUS GIZI]: Evaluasi berurutan: (1) Makronutrisi utama dibanding diet/target, (2) Kadar gula & asupan gula harian pasien, (3) GI sebagai pemberat opsional hanya jika datanya ada. Sebutkan data sesuai nama item di database ({food_display_name}); jika merk/varian yang ditanya tidak ada, jelaskan jujur.",
            ])

        # Hanya injeksikan daftar makanan Neo4j jika pengguna memang meminta menu/resep
        if user_wants_recipe:
            dossier_lines.extend([
                "",
                "DAFTAR MAKANAN NUSANTARA TERVERIFIKASI AMAN (HASIL FILTER GRAF NEO4J 100% BEBAS ALERGEN):"
            ])
            for f in safe_foods[:6]:
                f_name = f.get('nama') or f.get('nama_makanan') or 'Bahan Sehat'
                f_cal = f.get('kalori') or f.get('kalori_kal') or 0
                f_carb = f.get('karbohidrat') or f.get('karbo') or 0
                f_prot = f.get('protein') or 0
                f_fat = f.get('lemak') or 0
                f_sod = f.get('sodium_mg') or 0
                f_gi = f.get('gi') if f.get('gi') is not None else 35
                f_olah = f.get('cara_olah') or 'Kukus/Rebus'
                dossier_lines.append(
                    f"- {f_name}: {f_cal} kkal (Karbo: {f_carb}g, Protein: {f_prot}g, Lemak: {f_fat}g, Sodium: {f_sod}mg, GI: {f_gi}). Cara olah: {f_olah}."
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
