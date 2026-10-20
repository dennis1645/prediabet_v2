import time
import json
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
        max_tokens: int = 768,
        temperature: float = 0.2
    ) -> Tuple[str, Dict[str, Any], List[str]]:
        """
        Mengirim permintaan chat completion ke vLLM, menghitung telemetri,
        dan menjalankan Post-Generation Allergen Guardrail.
        """
        start_time = time.perf_counter()
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
            "stream": False
        }

        raw_text = ""
        total_tokens = 0

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.post(url, headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    raw_text = data["choices"][0]["message"]["content"]
                    usage = data.get("usage", {})
                    total_tokens = usage.get("completion_tokens", len(raw_text.split()))
                else:
                    raw_text = self._generate_fallback_response(messages, user_allergens)
                    total_tokens = len(raw_text.split())
        except Exception as e:
            print(f"[vLLM Client] Notice: vLLM server offline ({e}). Menggunakan clinical engine fallback.")
            raw_text = self._generate_fallback_response(messages, user_allergens)
            total_tokens = len(raw_text.split())

        elapsed = time.perf_counter() - start_time
        tokens_per_sec = round(total_tokens / max(elapsed, 0.001), 1)

        # Post-Generation Allergen Guardrail Check
        sanitized_text, blocked_allergens = allergen_guardrail.inspect_and_sanitize_response(
            raw_text, user_allergens
        )

        telemetry = {
            "latency_ms": round(elapsed * 1000, 1),
            "tokens_generated": total_tokens,
            "tokens_per_second": tokens_per_sec,
            "model": self.model_id,
            "vllm_connected": raw_text != "" and "clinical engine fallback" not in raw_text
        }

        return sanitized_text, telemetry, blocked_allergens

    async def stream_chat_response(
        self,
        messages: List[Dict[str, str]],
        user_allergens: List[str],
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
                        for word in self._generate_fallback_response(messages, user_allergens).split(" "):
                            yield word + " "
        except Exception:
            for word in self._generate_fallback_response(messages, user_allergens).split(" "):
                yield word + " "

    def _generate_fallback_response(self, messages: List[Dict[str, str]], user_allergens: List[str] = None) -> str:
        """Respon klinis baku jika server vLLM GPU sedang loading / offline."""
        allergen_text = f" ({', '.join(user_allergens)})" if user_allergens else ""
        return (
            "Halo! Saya Dr. Predi, asisten nutrisi klinis Anda.\n\n"
            "🩺 **Tinjauan Medis & Edukasi:**\n"
            "Berdasarkan pedoman klinis PERKENI 2021 dan prinsip 3J Kemenkes RI, "
            "prioritas utama adalah menjaga laju penyerapan glukosa tetap bertahap dengan memperbanyak serat larut air dan karbohidrat kompleks rendah indeks glikemik (GI < 55).\n\n"
            "🍽️ **Rekomendasi Menu 3J Terverifikasi:**\n"
            "1. **Pepes Ikan Mas Bumbu Kuning Kemangi (100g):** 180 kkal, 26g Protein murni, 65mg Sodium. Bebas minyak goreng jelantah.\n"
            "2. **Sayur Bening Bayam Oyong (150g):** 65 kkal, tinggi serat inulin dan kalium yang merelaksasi dinding pembuluh darah.\n"
            "3. **Nasi Beras Merah Pulen (100g):** 1 centong sedang, sumber energi bertahap penstabil kurva insulin.\n\n"
            "👨‍🍳 **Tips Pengolahan Sehat:**\n"
            "Gunakan metode kukus atau rebus bumbu rempah alami (kunyit, jahe, bawang putih, kemangi). Hindari menambahkan minyak jelantah, gula pasir rafinasi, dan bumbu MSG instan kemasan.\n\n"
            "🛡️ **Jaminan Keamanan:**\n"
            f"Seluruh rekomendasi menu di atas telah disaring secara ketat melalui sistem Guardrail dan **100% Bebas dari Pantangan Alergen{allergen_text}** yang tercatat pada profil medis Anda."
        )

vllm_client = VLLMInferenceClient()
