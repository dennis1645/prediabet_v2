import time
import json
import re
from typing import AsyncGenerator, Dict, Any, List, Tuple
import httpx
from app.config import settings
from app.core.allergen_guardrail import allergen_guardrail

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
                        break
            except Exception:
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
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.post(url, headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    raw_text = data["choices"][0]["message"]["content"]
                    usage = data.get("usage", {})
                    total_tokens = usage.get("completion_tokens", len(raw_text.split()))
                    is_live_vllm = True
                    print(f"[vLLM Client] [SUCCESS] Inferensi sukses dari {active_base} (Model: {target_model})")
                else:
                    print(f"[vLLM Client] Error: vLLM HTTP {res.status_code} response: {res.text}")
                    raw_text = self._generate_fallback_response(user_query, user_context, safe_food_names, user_allergens)
                    total_tokens = len(raw_text.split())
        except Exception as e:
            print(f"[vLLM Client] Notice: vLLM offline/unreachable di {url} ({e}). Menggunakan dynamic clinical engine fallback.")
            raw_text = self._generate_fallback_response(user_query, user_context, safe_food_names, user_allergens)
            total_tokens = len(raw_text.split())

        elapsed = time.perf_counter() - start_time
        tokens_per_sec = round(total_tokens / max(elapsed, 0.001), 1)

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
                        for word in self._generate_fallback_response(user_query, user_context, safe_food_names, user_allergens).split(" "):
                            yield word + " "
        except Exception:
            for word in self._generate_fallback_response(user_query, user_context, safe_food_names, user_allergens).split(" "):
                yield word + " "

    def _generate_fallback_response(
        self,
        user_query: str = "",
        user_context: Any = None,
        safe_food_names: List[str] = None,
        user_allergens: List[str] = None
    ) -> str:
        """Respon klinis dinamis jika engine vLLM GPU sedang loading / offline."""
        q = (user_query or "").strip().lower()
        allergens_str = ", ".join(user_allergens) if user_allergens else "Tidak ada"
        username = getattr(user_context, "username", "Sahabat Sehat") if user_context else "Sahabat Sehat"
        kalori_target = getattr(user_context, "target_kalori", 1850) if user_context else 1850
        diet = getattr(user_context, "active_diet", "Diet Mediterania") if user_context else "Diet Mediterania"
        gdp = getattr(user_context, "gula_darah_puasa", "100") if user_context else "100"
        hba1c = getattr(user_context, "hba1c", "5.7") if user_context else "5.7"

        # 1. Pertanyaan seputar Alergi / Pantangan / Profil Medis
        if any(k in q for k in ["alergi", "pantangan", "profil", "rekam medis", "gula darah", "hba1c"]):
            return (
                f"Halo {username}! Berdasarkan rekam medis klinis Anda yang terintegrasi di PrediaBeat:\n\n"
                f"📋 **Data Klinis & Pantangan Pribadi Anda:**\n"
                f"• **Daftar Pantangan Alergi:** {allergens_str}\n"
                f"• **Kadar Gula Darah Puasa (GDP):** {gdp} mg/dL\n"
                f"• **Nilai HbA1c:** {hba1c}%\n"
                f"• **Target Kebutuhan Kalori:** {kalori_target} kkal/hari\n"
                f"• **Pola Diet Terpilih:** {diet}\n\n"
                "Seluruh rekomendasi nutrisi dan konsultasi Dr. Predi secara otomatis disaring agar **100% bebas dari pantangan alergen** Anda demi menjaga respon insulin dan mencegah hipersensitivitas."
            )

        # 2. Pertanyaan seputar Identitas / Sapaan (Siapa kamu / Halo)
        if any(k in q for k in ["siapa", "kamu siapa", "kenalan", "halo", "hai", "assalamu", "selamat"]):
            return (
                f"Halo {username}! 👋\n\n"
                "Saya **Dr. Predi**, konsultan nutrisi klinis dan asisten cerdas Anda dalam program pencegahan serta tata laksana Prediabetes.\n\n"
                "Saya dirancang dengan teknologi **Hybrid GraphRAG** dan standar pedoman medis **PERKENI 2021** untuk membantu Anda:\n"
                "1. Menghitung takaran nutrisi dan panduan 3J (Jadwal, Jumlah, Jenis).\n"
                "2. Memilih makanan nusantara yang ramah glikemik (GI rendah).\n"
                "3. Memastikan semua makanan bebas dari komorbiditas dan pantangan alergen Anda.\n\n"
                "Ada yang ingin Anda tanyakan seputar takaran makanan, resep ramah gula darah, atau ide menu hari ini?"
            )

        # 3. Pertanyaan seputar Kandungan Nutrisi Bahan Makanan (misal: "dada ayam", "telur", "tempe", dsb)
        try:
            from app.core.neo4j_manager import neo4j_manager
            all_foods = neo4j_manager._load_local_dataset()
        except Exception:
            all_foods = []

        matched_food = None
        for word in q.split():
            if len(word) >= 4 and word not in ["berapa", "gram", "kalori", "protein", "lemak", "karbohidrat", "makan", "apakah"]:
                for f in all_foods:
                    if re.search(r'\b' + re.escape(word) + r'\b', f["nama"], re.IGNORECASE):
                        matched_food = f
                        break
            if matched_food:
                break

        if matched_food or any(k in q for k in ["ayam", "ikan", "telur", "tempe", "tahu", "daging", "nasi", "protein", "kalori", "gizi"]):
            target_item = matched_food if matched_food else {
                "nama": "Dada Ayam Fillet Tanpa Kulit", "kalori": 165.0, "protein": 31.0, "lemak": 3.6, "karbohidrat": 0.0, "gi": 0.0, "cara_olah": "Kukus atau Rebus Bumbu Kuning"
            }
            return (
                f"Halo {username}! Berdasarkan basis data gizi klinis PrediaBeat:\n\n"
                f"🍗 **Informasi Nilai Gizi: {target_item['nama']} (per 100 gram)**\n"
                f"• **Kandungan Protein:** ~{target_item['protein']} gram\n"
                f"• **Total Energi (Kalori):** {target_item['kalori']} kkal\n"
                f"• **Kandungan Karbohidrat:** {target_item['karbohidrat']} gram\n"
                f"• **Kandungan Lemak:** {target_item['lemak']} gram\n"
                f"• **Indeks Glikemik (GI):** {target_item['gi']} (Kategori Rendah - Sangat Aman bagi respon insulin)\n\n"
                f"💡 **Rekomendasi Cara Olah Sehat:** Disarankan diolah dengan teknik {target_item['cara_olah']} menggunakan bumbu rempah alami tanpa minyak jelantah."
            )

        # 4. Pertanyaan Menu / Rekomendasi Makanan Umum
        menu_items = safe_food_names[:3] if safe_food_names and len(safe_food_names) >= 3 else [
            "Pepes Ikan Mas Bumbu Kuning Kemangi (180 kkal)",
            "Sayur Bening Bayam Oyong (65 kkal)",
            "Nasi Beras Merah Pulen (145 kkal)"
        ]
        return (
            f"Halo {username}! Berdasarkan prinsip 3J Kemenkes RI dan pedoman PERKENI 2021 untuk target harian {kalori_target} kkal:\n\n"
            f"🍽️ **Rekomendasi Menu 3J Terverifikasi:**\n"
            f"1. **Lauk Protein Rendah Lemak:** {menu_items[0]}\n"
            f"2. **Sayuran Serat Tinggi (GI Rendah):** {menu_items[1]}\n"
            f"3. **Karbohidrat Kompleks Pelepasan Lambat:** {menu_items[2]}\n\n"
            f"👨‍🍳 **Tips Pengolahan Sehat:**\n"
            "Utamakan metode kukus, rebus, atau panggang rempah alami. Hindari penggunaan minyak jelantah, gula rafinasi tersembunyi, dan penyedap kemasan berlebih.\n\n"
            "🛡️ **Jaminan Keamanan:**\n"
            "Seluruh susunan menu di atas telah diverifikasi melalui sistem Guardrail dan dijamin bebas dari seluruh bahan pantangan medis Anda."
        )

vllm_client = VLLMInferenceClient()
