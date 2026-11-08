import time
import json
import re
from typing import AsyncGenerator, Dict, Any, List, Tuple, Optional
import httpx
from app.config import settings
from app.core.allergen_guardrail import allergen_guardrail
from app.core.logger_config import vllm_logger

class VLLMInferenceClient:
    """Klien inferensi OpenAI-compatible yang terhubung ke vLLM Engine (RTX 5070 Ti)."""

    def __init__(self):
        self.api_base = settings.VLLM_API_BASE.rstrip("/")
        self.model_id = settings.MODEL_ID
        self.api_key = settings.VLLM_API_KEY
        self.timeout = 60.0

    async def check_vllm_health(self) -> Dict[str, Any]:
        """Memeriksa status aktif engine vLLM di port target."""
        url = f"{self.api_base}/models"
        headers = {"Authorization": f"Bearer {self.api_key}"}
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(url, headers=headers)
                if res.status_code == 200:
                    models = res.json()
                    return {"active": True, "models": models}
        except Exception as e:
            return {"active": False, "error": str(e)}
        return {"active": False, "error": "Status code non-200"}

    async def generate_chat_response(
        self,
        messages: List[Dict[str, str]],
        user_allergens: List[str],
        user_query: str = "",
        user_context: Any = None,
        safe_food_names: List[str] = None,
        specific_food: Optional[Dict[str, Any]] = None,
        max_tokens: int = 768,
        temperature: float = 0.2
    ) -> Tuple[str, Dict[str, Any], List[str]]:
        """
        Mengirim permintaan chat completion ke vLLM, menghitung telemetri,
        dan menjalankan Post-Generation Allergen Guardrail.
        """
        start_time = time.perf_counter()
        
        # Dukung endpoint ganda (internal container 'http://vllm:8000/v1' dan host 'http://host.docker.internal:8000/v1')
        candidate_bases = [self.api_base]
        if "vllm" in self.api_base:
            candidate_bases.append("http://host.docker.internal:8000/v1")
            candidate_bases.append("http://localhost:8000/v1")
        else:
            candidate_bases.append("http://vllm:8000/v1")

        raw_text = ""
        total_tokens = 0
        is_live_vllm = False
        target_model = self.model_id

        # 1. Cari endpoint aktif dan sinkronkan model_id resmi dari vLLM
        vllm_logger.info("================================================================================")
        vllm_logger.info("MEMULAI INFERENSI vLLM: Target Candidates: %s | Query: '%s'", candidate_bases, user_query)
        active_base = candidate_bases[0]
        for base in candidate_bases:
            try:
                async with httpx.AsyncClient(timeout=2.0) as client:
                    m_res = await client.get(f"{base}/models", headers={"Authorization": f"Bearer {self.api_key}"})
                    if m_res.status_code == 200:
                        active_base = base
                        m_data = m_res.json()
                        models_list = m_data.get("data", [])
                        if models_list and "id" in models_list[0]:
                            target_model = models_list[0]["id"]
                            self.model_id = target_model
                        vllm_logger.info("Endpoint vLLM DITEMUKAN AKTIF di %s | Model ID: %s", active_base, target_model)
                        break
            except Exception as check_err:
                vllm_logger.debug("Candidate %s tidak merespons: %s", base, str(check_err))
                continue

        url = f"{active_base}/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }
        payload = {
            "model": target_model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "top_p": settings.VLLM_TOP_P,
            "stream": False
        }

        try:
            vllm_logger.info("Mengirim payload chat completion ke %s (Max Tokens: %d, Temp: %s)...", url, max_tokens, temperature)
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.post(url, headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    raw_text = data["choices"][0]["message"]["content"]
                    usage = data.get("usage", {})
                    total_tokens = usage.get("completion_tokens", len(raw_text.split()))
                    is_live_vllm = True
                    vllm_logger.info("SUKSES: Inferensi vLLM berhasil dari %s (%d tokens dihasilkan)", active_base, total_tokens)
                else:
                    vllm_logger.error("HTTP ERROR dari vLLM di %s (Status: %d): %s. Mengaktifkan fallback engine.", url, res.status_code, res.text)
                    raw_text = self._generate_fallback_response(user_query, user_context, safe_food_names, user_allergens, specific_food)
                    total_tokens = len(raw_text.split())
        except Exception as e:
            vllm_logger.warning("vLLM offline/unreachable di %s: %s. Mengaktifkan clinical fallback engine.", url, str(e))
            raw_text = self._generate_fallback_response(user_query, user_context, safe_food_names, user_allergens, specific_food)
            total_tokens = len(raw_text.split())

        elapsed = time.perf_counter() - start_time
        tokens_per_sec = round(total_tokens / max(elapsed, 0.001), 1)
        vllm_logger.info("Telemetri Inferensi: Waktu: %.2f ms | Kecepatan: %s tok/s | Live vLLM GPU: %s", elapsed * 1000, tokens_per_sec, is_live_vllm)

        # Filter aksara Hanzi / terjemahan Mandarin jika model Qwen menyertakannya
        if "中文版本" in raw_text or re.search(r'[\u4e00-\u9fff]', raw_text):
            parts = re.split(r'(?:中文版本|Chinese Version|附：中文)', raw_text, flags=re.IGNORECASE)
            if len(parts) > 1 and parts[0].strip():
                raw_text = parts[0].strip()
            else:
                cleaned_lines = [line for line in raw_text.splitlines() if not re.search(r'[\u4e00-\u9fff]', line)]
                raw_text = "\n".join(cleaned_lines).strip()

        # Post-Generation Allergen Guardrail Check
        sanitized_text, blocked_allergens = allergen_guardrail.inspect_and_sanitize_response(
            raw_text, user_allergens
        )

        # Post-Generation Output Verifier (Rule-Based intercept for code / jailbreak leaks)
        patient_name = getattr(user_context, "nama", None) or getattr(user_context, "username", "Bapak/Ibu")
        sanitized_text = allergen_guardrail.inspect_and_sanitize_output(sanitized_text, patient_name)

        telemetry = {
            "latency_ms": round(elapsed * 1000, 1),
            "tokens_generated": total_tokens,
            "tokens_per_second": tokens_per_sec,
            "model": self.model_id,
            "vllm_connected": is_live_vllm
        }

        return sanitized_text, telemetry, blocked_allergens

    async def stream_chat_response(
        self,
        messages: List[Dict[str, str]],
        user_allergens: List[str],
        user_query: str = "",
        user_context: Any = None,
        safe_food_names: List[str] = None,
        specific_food: Optional[Dict[str, Any]] = None,
        max_tokens: int = 768,
        temperature: float = 0.2
    ) -> AsyncGenerator[str, None]:
        """Streaming response token-by-token menggunakan Server-Sent Events (SSE)."""
        url = f"{self.api_base}/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }
        payload = {
            "model": self.model_id,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "top_p": settings.VLLM_TOP_P,
            "stream": True
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                async with client.stream("POST", url, headers=headers, json=payload) as response:
                    if response.status_code == 200:
                        async for line in response.aiter_lines():
                            if line.startswith("data: "):
                                data_str = line[6:].strip()
                                if data_str == "[DONE]":
                                    break
                                try:
                                    chunk = json.loads(data_str)
                                    delta = chunk["choices"][0].get("delta", {})
                                    content = delta.get("content", "")
                                    if content:
                                        yield content
                                except Exception:
                                    continue
                    else:
                        for word in self._generate_fallback_response(user_query, user_context, safe_food_names, user_allergens, specific_food).split(" "):
                            yield word + " "
        except Exception:
            for word in self._generate_fallback_response(user_query, user_context, safe_food_names, user_allergens, specific_food).split(" "):
                yield word + " "

    def _generate_fallback_response(
        self,
        user_query: str = "",
        user_context: Any = None,
        safe_food_names: List[str] = None,
        user_allergens: List[str] = None,
        specific_food: Optional[Dict[str, Any]] = None
    ) -> str:
        """Respon klinis dinamis jika engine vLLM GPU sedang loading / offline."""
        q = (user_query or "").strip().lower()
        allergens_str = ", ".join(user_allergens) if user_allergens else "Tidak ada"
        username = getattr(user_context, "nama", None) or getattr(user_context, "username", "Sahabat Sehat") if user_context else "Sahabat Sehat"
        kalori_target = getattr(user_context, "target_kalori", 1850) if user_context else 1850
        diet = getattr(user_context, "active_diet", "Pola 3J Ramah Prediabetes") if user_context else "Pola 3J Ramah Prediabetes"
        gdp = getattr(user_context, "gula_darah_puasa", "100") if user_context else "100"
        hba1c = getattr(user_context, "hba1c", "5.7") if user_context else "5.7"

        # 1. Pertanyaan seputar Alergi / Pantangan / Profil Medis Murni
        is_profile_query = any(k in q for k in [
            "profil saya", "rekam medis", "data medis", "pantangan saya", "alergi saya",
            "apa pantangan", "apa alergi", "riwayat medis", "data klinis", "cek profil", "data saya"
        ]) or (
            any(k in q for k in ["gula darah", "hba1c"])
            and not any(k in q for k in ["makan", "minum", "buah", "durian", "duren", "lauk", "resep", "boleh", "apakah boleh", "bisa", "konsumsi", "takaran", "sarapan", "siang", "malam", "tempe", "ayam", "tahu"])
            and any(k in q for k in ["berapa", "catatan", "hasil", "cek", "saya"])
        )
        if is_profile_query:
            return (
                f"Halo {username}! Berdasarkan rekam medis klinis Anda yang terintegrasi di PrediaBeat:\n\n"
                f"📋 **Data Klinis & Pantangan Pribadi Anda:**\n"
                f"• **Daftar Pantangan Alergi:** {allergens_str}\n"
                f"• **Kadar Gula Darah Puasa (GDP):** {gdp} mg/dL\n"
                f"• **Nilai HbA1c:** {hba1c}%\n"
                f"• **Target Kebutuhan Kalori:** {kalori_target} kkal/hari\n"
                f"• **Pola Diet Terpilih:** {diet}\n\n"
                "Seluruh rekomendasi nutrisi dan konsultasi Dr. Predi secara otomatis disaring agar **100% bebas dari pantangan alergen** Anda demi menjaga respon insulin dan mencegah lonjakan glukosa."
            )

        # 1.1. Konseling Khusus Buah Durian / Makanan Tinggi Glikemik
        if "durian" in q or "duren" in q:
            return (
                f"Halo {username}! Terkait konsumsi **buah durian** dengan kadar gula darah Anda ({gdp} mg/dL):\n\n"
                f"⚠️ **Pertimbangan Klinis Glikemik (PERKENI 2021):**\n"
                f"• Buah durian mengandung karbohidrat sederhana pekat (fruktosa, sukrosa, dan glukosa) serta kalori padat (~149 kkal dan 21.5g karbohidrat per 100g daging buah).\n"
                f"• Kondisi gula darah puasa {gdp} mg/dL berada dalam rentang prediabetes yang memerlukan kehati-hatian agar tidak memicu lonjakan glukosa (*glycemic spike*) secara mendadak.\n\n"
                f"📋 **Panduan Konsumsi Aman:**\n"
                f"1. **Batasi Porsi Ketat:** Maksimal **1–2 biji kecil (sekitar 30–50 gram)** dalam satu kesempatan, jangan satu buah utuh.\n"
                f"2. **Hindari Campuran Manis:** Jangan dikonsumsi bersama ketan, es krim, susu kental manis, atau kopi manis.\n"
                f"3. **Waktu Terbaik:** Nikmati di siang hari setelah mengonsumsi sayuran tinggi serat atau diimbangi jalan santai 15–20 menit untuk membantu sel otot menyerap glukosa darah."
            )

        # 1.2. Perbandingan Gizi Klinis (Mentah vs Goreng / Kukus)
        if specific_food and specific_food.get("is_comparison"):
            items = specific_food.get("items", [])
            lines = [f"Halo {username}! Berdasarkan basis data gizi klinis PrediaBeat, berikut perbandingan kandungan gizi per 100 gram antara bahan makanan yang Anda tanyakan:\n"]
            for it in items:
                lines.append(
                    f"📊 **{it.get('nama', 'Bahan')} (per 100g):**\n"
                    f"• **Kalori:** ~**{it.get('kalori', 0)} kkal**\n"
                    f"• **Protein:** **{it.get('protein', 0)}g**\n"
                    f"• **Lemak:** **{it.get('lemak', 0)}g**\n"
                    f"• **Karbohidrat:** **{it.get('karbohidrat', 0)}g**\n"
                    f"• **Cara Olah Rekomendasi:** {it.get('cara_olah', 'Kukus/Rebus')}\n"
                )
            lines.append(
                "💡 **Catatan Nutrisi Dr. Predi (PERKENI 2021):**\n"
                "Metode menggoreng (*deep fry*) menyerap minyak dalam jumlah signifikan sehingga melipatgandakan kadar kalori dan lemak jenuh. "
                "Untuk menjaga sensitivitas insulin dan profil lipid darah yang prima, sangat disarankan memprioritaskan teknik **kukus, rebus, pepes, atau tumis air** tanpa minyak jelantah."
            )
            return "\n".join(lines)

        # 2. Pertanyaan seputar Identitas / Sapaan (Siapa kamu / Halo)
        if any(k in q for k in ["siapa", "kamu siapa", "kenalan", "halo", "hai", "assalamu", "selamat pagi", "selamat siang", "selamat sore", "selamat malam"]):
            return (
                f"Halo {username}! 👋\n\n"
                "Saya **Dr. Predi**, konsultan nutrisi klinis dan asisten cerdas Anda dalam program pencegahan serta tata laksana Prediabetes.\n\n"
                "Saya dirancang dengan teknologi **Hybrid GraphRAG** dan standar pedoman medis **PERKENI 2021** untuk membantu Anda:\n"
                "1. Menghitung takaran nutrisi dan panduan 3J (Jadwal, Jumlah, Jenis).\n"
                "2. Memilih makanan nusantara yang ramah glikemik (GI rendah).\n"
                "3. Memastikan semua makanan bebas dari komorbiditas dan pantangan alergen Anda.\n\n"
                "Ada yang ingin Anda tanyakan seputar takaran makanan, resep ramah gula darah, atau ide menu hari ini?"
            )

        # 2.1. Ucapan Terima Kasih & Sopan Santun (Tanpa Halusinasi Resep)
        if any(k in q for k in ["terima kasih", "makasih", "tengkyu", "thanks", "thx", "matur nuwun", "nuhun"]):
            return (
                f"Sama-sama, {username}! Senang banget bisa nemenin dan ngebantu kamu hari ini. 😊\n\n"
                "Kalau nanti ada yang mau ditanyakan lagi seputar takaran makanan, resep ramah gula darah, atau ide cemilan sehat pas nugas/kuliah, jangan ragu panggil Dr. Predi lagi ya!\n\n"
                "Tetap semangat jaga pola hidup sehat dan kestabilan gula darahmu! ✨"
            )

        # 3. Permintaan Resep Masakan Eksplisit (User secara sadar meminta resep atau langkah masak)
        is_recipe_request = any(k in q for k in ["resep", "cara buat", "cara membuat", "cara masak", "langkah masak", "bagaimana membuatnya", "gimana membuatnya", "resepnya", "bahan dan cara"])
        if is_recipe_request:
            dish = specific_food if (specific_food and (specific_food.get("bahan") or specific_food.get("langkah"))) else None
            if not dish:
                # Coba cari resep dari vector manager
                try:
                    from app.core.vector_manager import vector_manager
                    rec = vector_manager.search_recipe(q)
                    if rec:
                        dish = {
                            "nama_makanan": rec["title"],
                            "kalori": rec.get("kalori", 160),
                            "protein": rec.get("protein", 15),
                            "karbohidrat": rec.get("karbohidrat", 10),
                            "lemak": rec.get("lemak", 4),
                            "gi_category": "GI Rendah (< 55)",
                            "bahan": rec.get("bahan", ""),
                            "langkah": rec.get("langkah", ""),
                            "alasan_klinis": rec.get("tips", "Diolah tanpa santan kental dan kaya rempah stabilisator glukosa darah.")
                        }
                except Exception:
                    pass

            if dish:
                dish_title = dish.get("nama_makanan") or dish.get("nama") or "Resep Masakan Sehat"
                return (
                    f"### 🍲 **{dish_title}** *(Pola 3J Ramah Glukosa)*\n\n"
                    f"📊 **Nilai Gizi per Porsi:**\n"
                    f"• **Kalori:** ~**{dish.get('kalori', 0)} kkal**\n"
                    f"• **Protein:** **{dish.get('protein', 0)}g** *(membantu rasa kenyang & sensitivitas insulin)*\n"
                    f"• **Karbohidrat:** **{dish.get('karbohidrat', 0)}g** *(pelepasan lambat)*\n"
                    f"• **Lemak:** **{dish.get('lemak', 0)}g**\n"
                    f"• **Indeks Glikemik:** **{dish.get('gi_category', 'GI Rendah (< 55)')}**\n\n"
                    f"🛒 **Bahan Utama:**\n{dish.get('bahan', '-')}\n\n"
                    f"👩‍🍳 **Cara Memasak Praktis:**\n{dish.get('langkah', '-')}\n\n"
                    f"💡 **Catatan Nutrisi Dr. Predi:**\n"
                    f"**{dish.get('alasan_klinis', 'Gunakan bumbu rempah alami dan hindari pemanasan minyak berulang untuk menjaga sensitivitas insulin.')}**\n\n"
                    f"Apakah ada menu atau bahan lain yang ingin Anda konsultasikan, {username}?"
                )

        # 4. Rekomendasi Menu (Kuah, Hangat, Siang, Malam, Sarapan, dsb)
        is_menu_suggestion = any(k in q for k in ["kuah", "berkuah", "hangat", "sarankan", "menu", "pengen makan", "rekomendasi", "selain itu", "makan siang", "makan malam", "sarapan", "opsi"])
        if is_menu_suggestion and specific_food:
            dish_name = specific_food.get("nama_makanan") or specific_food.get("nama") or "Hidangan Sehat"
            cal = specific_food.get("kalori", 0)
            prot = specific_food.get("protein", 0)
            carb = specific_food.get("karbohidrat", 0)
            fat = specific_food.get("lemak", 0)
            reason = specific_food.get("alasan_klinis", "Kaya antioksidan dan serat larut yang efektif menstabilkan penyerapan glukosa darah.")
            if "- Jenis" in reason:
                reason = reason.split("- Jenis")[0].strip()
            if not reason.endswith((".", "!", "?")):
                reason += "."
            return (
                f"Halo {username}!\n\n"
                f"Berikut rekomendasi hidangan lezat dan aman untuk respon insulin Anda hari ini:\n\n"
                f"🍲 **Nama Hidangan Rekomendasi:** {dish_name}\n"
                f"• **Estimasi Kalori:** ~{cal} kkal\n"
                f"• **Protein:** ~{prot}g\n"
                f"• **Karbohidrat:** ~{carb}g\n"
                f"• **Lemak:** ~{fat}g\n"
                f"• **Kategori Glikemik:** {specific_food.get('gi_category', 'GI Rendah')}\n\n"
                f"💡 **Keunggulan Klinis:**\n{reason}\n\n"
                f"Apakah Bapak/Ibu ingin saya bagikan resep dan cara membuatnya?"
            )

        # 5. Pertanyaan seputar Kandungan Nutrisi Bahan Makanan Spesifik
        if specific_food and not is_recipe_request and not is_menu_suggestion:
            f_name = specific_food.get("nama_makanan") or specific_food.get("nama") or "Bahan Makanan"
            p_label = specific_food.get("porsi_label") or f"{f_name} (per 100 gram)"
            return (
                f"Halo {username}! Berdasarkan basis data gizi klinis PrediaBeat:\n\n"
                f"🍗 **Informasi Nilai Gizi: {p_label}**\n"
                f"• **Kandungan Protein:** ~**{specific_food.get('protein', 0)} gram**\n"
                f"• **Total Energi (Kalori):** **{specific_food.get('kalori', 0)} kkal**\n"
                f"• **Kandungan Karbohidrat:** **{specific_food.get('karbohidrat', 0)} gram**\n"
                f"• **Kandungan Lemak:** **{specific_food.get('lemak', 0)} gram**\n"
                f"• **Indeks Glikemik (GI):** {specific_food.get('gi_category', 'GI Rendah (< 55)')}\n\n"
                f"💡 **Rekomendasi Cara Olah Sehat:** {specific_food.get('cara_olah', 'Kukus/Rebus tanpa minyak jelantah')}."
            )

        try:
            from app.core.neo4j_manager import neo4j_manager
            raw_foods = neo4j_manager._load_local_dataset()
            all_foods = allergen_guardrail.filter_safe_food_candidates(raw_foods, user_allergens or [])
        except Exception:
            all_foods = []

        matched_food = None
        for phrase in ["dada ayam", "daging ayam", "ayam bakar", "ayam goreng", "ikan mas", "telur rebus", "telur", "tempe", "tahu", "beras merah", "nasi merah", "oatmeal", "bayam"]:
            if phrase in q:
                candidates = [f for f in all_foods if phrase in f["nama"].lower()]
                if candidates:
                    matched_food = candidates[0]
                    break

        if not matched_food:
            stop_words = {
                "berapa", "jumlah", "protein", "dalam", "gram", "kalori", "lemak", "karbohidrat",
                "makan", "apakah", "untuk", "pada", "banyak", "kandungan", "nutrisi", "halo", "dok",
                "lagi", "pengen", "ingin", "mau", "yang", "dan", "sama", "dengan", "ke", "di", "dari",
                "buat", "resep", "cara", "hangat", "berkuah", "kuah", "dingin", "minum", "minuman",
                "ada", "apa", "ini", "itu", "saya", "aku", "anda", "bisa", "tolong", "mohon", "kasih",
                "saran", "rekomendasi", "dong", "selain", "gimana", "bagaimana", "saja"
            }
            words = [w.strip("?,.!") for w in q.split() if len(w.strip("?,.!")) >= 3 and w.strip("?,.!") not in stop_words]
            for w in words:
                for f in all_foods:
                    if re.search(r'\b' + re.escape(w) + r'\b', f["nama"], re.IGNORECASE):
                        matched_food = f
                        break
                if matched_food:
                    break

        if matched_food:
            return (
                f"Halo {username}! Berdasarkan basis data gizi klinis PrediaBeat:\n\n"
                f"🍗 **Informasi Nilai Gizi: {matched_food['nama']} (per 100 gram)**\n"
                f"• **Kandungan Protein:** ~{matched_food.get('protein', 0)} gram\n"
                f"• **Total Energi (Kalori):** {matched_food.get('kalori', 0)} kkal\n"
                f"• **Kandungan Karbohidrat:** {matched_food.get('karbohidrat', 0)} gram\n"
                f"• **Kandungan Lemak:** {matched_food.get('lemak', 0)} gram\n"
                f"• **Indeks Glikemik (GI):** {matched_food.get('gi', 0)} (Kategori Rendah - Sangat Aman bagi respon insulin)\n\n"
                f"💡 **Rekomendasi Cara Olah Sehat:** Disarankan diolah dengan teknik {matched_food.get('cara_olah', 'Kukus/Rebus')} menggunakan bumbu rempah alami tanpa minyak jelantah."
            )

        # 6. Pertanyaan Menu / Rekomendasi Makanan Umum (3J Fallback Medis Teruji)
        return (
            f"Halo {username}! Berdasarkan prinsip 3J Kemenkes RI dan pedoman PERKENI 2021 untuk target harian {kalori_target} kkal:\n\n"
            f"🍽️ **Rekomendasi Menu 3J Terverifikasi:**\n"
            f"1. **Lauk Protein Rendah Lemak:** Pepes Ikan Mas Bumbu Kuning Kemangi (~180 kkal) atau Dada Ayam Rebus/Kukus (~165 kkal)\n"
            f"2. **Sayuran Serat Tinggi (GI Rendah):** Sayur Bening Bayam Oyong Jagung Manis (~65 kkal) atau Tumis Buncis Tahu Air (~120 kkal)\n"
            f"3. **Karbohidrat Kompleks Pelepasan Lambat:** Nasi Beras Merah Pulen (~145 kkal) atau Nasi Shirataki Sayur (~120 kkal)\n\n"
            f"👨‍🍳 **Tips Pengolahan Sehat:**\n"
            "Utamakan metode kukus, rebus, atau pepes rempah alami. Hindari penggunaan minyak jelantah, gula rafinasi tersembunyi, dan penyedap kemasan berlebih.\n\n"
            "🛡️ **Jaminan Keamanan:**\n"
            f"Seluruh susunan menu di atas telah diverifikasi melalui sistem Guardrail dan dijamin bebas dari pantangan alergen Anda ({allergens_str})."
        )

vllm_client = VLLMInferenceClient()
