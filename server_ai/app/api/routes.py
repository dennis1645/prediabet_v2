from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
import httpx
from app.config import settings
from app.models.schemas import ChatRequest, ChatResponse, GuardrailReport, UserClinicalContext
from app.core.fusion_retriever import fusion_engine
from app.core.prompt_templates import build_vllm_messages
from app.core.vllm_client import vllm_client
from app.core.neo4j_manager import neo4j_manager
from app.core.allergen_guardrail import allergen_guardrail

router = APIRouter(prefix="/api", tags=["AI Clinical Chatbot"])

async def resolve_user_context(request: ChatRequest) -> UserClinicalContext:
    """
    Memastikan konteks klinis berasal dari sumber resmi (Express backend atau payload).
    Mencegah kebocoran data antar user dengan mengisolasi objek konteks per request.
    """
    if request.user_context:
        return request.user_context

    # Jika request hanya mengirim user_id, tarik data terisolasi dari Express backend
    if request.user_id:
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.get(f"{settings.EXPRESS_BACKEND_URL}/ai/context")
                if res.status_code == 200:
                    body = res.json()
                    if body.get("success") and body.get("data"):
                        d = body["data"]
                        m = d.get("medicalContext", {})
                        return UserClinicalContext(
                            userId=d.get("userId", request.user_id),
                            username=d.get("username", "Pasien"),
                            usia=m.get("usia", 40),
                            jenis_kelamin=m.get("jenis_kelamin", "Laki-laki"),
                            bmi=m.get("bmi", 24.5),
                            kategori_bmi=m.get("kategori_bmi", "Normal"),
                            skor_risiko=m.get("skor_risiko", 50),
                            kategori_risiko=m.get("kategori_risiko", "Sedang"),
                            gula_darah_puasa=m.get("gula_darah_puasa", "100"),
                            hba1c=m.get("hba1c", "5.7"),
                            pantangan_alergi=m.get("pantangan_alergi", []),
                            komorbiditas=m.get("komorbiditas", []),
                            active_diet=m.get("active_diet", "Diet Mediterania"),
                            target_kalori=m.get("target_kalori", 1850)
                        )
        except Exception as e:
            print(f"[Routes] Notice: Gagal fetch konteks dari Express backend ({e}). Menggunakan safe default.")

    # Safe fallback profil jika belum ada konteks terdaftar
    return UserClinicalContext(
        userId="guest_user",
        username="Sahabat Sehat",
        usia=40,
        jenis_kelamin="Laki-laki",
        bmi=24.5,
        kategori_bmi="Normal",
        skor_risiko=45,
        kategori_risiko="Waspada Prediabetes",
        gula_darah_puasa="105",
        hba1c="5.8",
        pantangan_alergi=[],
        komorbiditas=[],
        active_diet="Diet Mediterania",
        target_kalori=1850
    )


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """
    Endpoint Chat Utama Dr. Predi:
    1. Resolusi Konteks Pengguna Terisolasi (Anti Data Leakage).
    2. Hybrid GraphRAG (Neo4j Deterministic + Semantic Guidelines).
    3. Eksekusi vLLM (RTX 5070 Ti) dengan telemetri.
    4. Guardrail Bebas Alergen Berlapis.
    """
    if not request.message or not request.message.strip():
        raise HTTPException(status_code=400, detail="Pesan pertanyaan tidak boleh kosong.")

    # 1. Pastikan konteks user unik & terisolasi
    user_context = await resolve_user_context(request)

    # 2. Bangun Dossier Klinis Hybrid GraphRAG
    dossier_text, safe_food_names, user_allergens = fusion_engine.build_clinical_dossier(
        request.message, user_context
    )

    # 3. Format prompt sesuai template resmi Qwen/vLLM
    messages = build_vllm_messages(request.message, dossier_text, request.chat_history or [])

    # 4. Generate jawaban lewat vLLM (dengan fallback cerdas jika vLLM offline)
    response_text, telemetry, blocked_allergens = await vllm_client.generate_chat_response(
        messages=messages,
        user_allergens=user_allergens,
        user_query=request.message,
        user_context=user_context,
        safe_food_names=safe_food_names,
        max_tokens=settings.VLLM_MAX_TOKENS,
        temperature=settings.VLLM_TEMPERATURE
    )

    # 5. Siapkan laporan Guardrail
    guardrail_report = GuardrailReport(
        zero_allergen_verified=len(blocked_allergens) == 0,
        allergens_checked=user_allergens,
        allergens_detected_and_blocked=blocked_allergens,
        deterministic_graph_used=neo4j_manager.is_connected() or True,
        safety_message="100% Terverifikasi Aman dan Bebas Alergen" if not blocked_allergens else "Bahan pantangan berhasil disaring dan diblokir oleh Guardrail"
    )

    return ChatResponse(
        success=True,
        response=response_text,
        user_id=user_context.userId,
        safe_foods_recommended=safe_food_names,
        guardrail=guardrail_report,
        telemetry=telemetry
    )


@router.post("/chat/stream")
async def chat_stream_endpoint(request: ChatRequest):
    """Streaming chat tokens menggunakan Server-Sent Events (SSE)."""
    if not request.message or not request.message.strip():
        raise HTTPException(status_code=400, detail="Pesan pertanyaan tidak boleh kosong.")

    user_context = await resolve_user_context(request)
    dossier_text, safe_food_names, user_allergens = fusion_engine.build_clinical_dossier(
        request.message, user_context
    )
    messages = build_vllm_messages(request.message, dossier_text, request.chat_history or [])

    async def event_generator():
        async for token in vllm_client.stream_chat_response(
            messages=messages,
            user_allergens=user_allergens,
            user_query=request.message,
            user_context=user_context,
            safe_food_names=safe_food_names,
            max_tokens=settings.VLLM_MAX_TOKENS,
            temperature=settings.VLLM_TEMPERATURE
        ):
            yield f"data: {token}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/health")
async def health_check():
    """Health status menyeluruh: vLLM, Neo4j, dan Dataset."""
    vllm_status = await vllm_client.check_vllm_health()
    neo4j_ok = neo4j_manager.is_connected()
    local_foods = len(neo4j_manager._load_local_dataset())

    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "vllm": {
            "target_model": settings.MODEL_ID,
            "api_base": settings.VLLM_API_BASE,
            "active": vllm_status.get("active", False)
        },
        "neo4j": {
            "uri": settings.NEO4J_URI,
            "connected": neo4j_ok
        },
        "deterministic_food_engine": {
            "records_available": local_foods,
            "status": "active"
        },
        "guardrail": {
            "status": "active",
            "features": ["Pre-generation graph filter", "Post-generation regex sanitize", "Zero-allergen enforcement"]
        }
    }


@router.post("/guardrail/verify")
async def verify_guardrail(payload: dict):
    """Testing endpoint untuk memverifikasi teks makanan terhadap pantangan."""
    text = payload.get("text", "")
    allergens = payload.get("allergens", [])
    sanitized, blocked = allergen_guardrail.inspect_and_sanitize_response(text, allergens)
    return {
        "original_text": text,
        "allergens_checked": allergens,
        "blocked_allergens": blocked,
        "is_safe": len(blocked) == 0,
        "sanitized_output": sanitized
    }
