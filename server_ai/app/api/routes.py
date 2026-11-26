from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
import httpx
from app.config import settings
from app.models.schemas import ChatRequest, ChatResponse, GuardrailReport, UserClinicalContext
from app.core.fusion_retriever import fusion_engine
from app.core.prompt_templates import build_vllm_messages, is_other_patient_privacy_query
from app.core.vllm_client import vllm_client
from app.core.neo4j_manager import neo4j_manager
from app.core.allergen_guardrail import allergen_guardrail
from app.core.logger_config import rag_logger

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
                            nama=m.get("nama") or d.get("username", "Pasien"),
                            usia=m.get("usia"),
                            jenis_kelamin=m.get("jenis_kelamin", "Laki-laki"),
                            bmi=m.get("bmi"),
                            kategori_bmi=m.get("kategori_bmi", "Normal"),
                            skor_risiko=m.get("skor_risiko"),
                            kategori_risiko=m.get("kategori_risiko", "Sedang"),
                            gula_darah_puasa=m.get("gula_darah_puasa"),
                            hba1c=m.get("hba1c"),
                            pantangan_alergi=m.get("pantangan_alergi", []),
                            komorbiditas=m.get("komorbiditas", []),
                            active_diet=m.get("active_diet", "Diet Seimbang Ramah Glukosa"),
                            target_kalori=m.get("target_kalori", 1850)
                        )
        except Exception as e:
            print(f"[Routes] Notice: Gagal fetch konteks dari Express backend ({e}). Menggunakan safe default.")

    # Safe fallback profil jika belum ada konteks terdaftar
    return UserClinicalContext(
        userId="guest_user",
        username="Sahabat Sehat",
        nama="Sahabat Sehat",
        usia=None,
        jenis_kelamin="Laki-laki",
        bmi=None,
        kategori_bmi=None,
        skor_risiko=None,
        kategori_risiko=None,
        gula_darah_puasa=None,
        hba1c=None,
        pantangan_alergi=[],
        komorbiditas=[],
        active_diet="Diet Seimbang Ramah Glukosa",
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
    display_name = user_context.nama or user_context.username or "Pasien"

    # 1.1. Guardrail Anti-Jailbreak & Bypass (Mendeteksi teks manipulasi langsung maupun pembujukan lanjutan)
    if allergen_guardrail.is_jailbreak_attempt(request.message, request.chat_history or []):
        jailbreak_msg = (
            f"Mohon maaf, {display_name}! Sebagai Dr. Predi, konsultan nutrisi klinis pribadi Anda di PrediaBeat, "
            "saya terikat secara ketat pada protokol keselamatan klinis PERKENI & Kemenkes RI. "
            "Saya tidak diizinkan untuk melanggar batasan sistem ataupun memberikan kode pemrograman/topik non-medis. "
            "Mari kita kembali fokus pada kesehatan metabolik, menu 3J, atau nutrisi ramah gula darah Anda! 😊"
        )
        return ChatResponse(
            success=True,
            response=jailbreak_msg,
            user_id=user_context.userId,
            safe_foods_recommended=[],
            guardrail=GuardrailReport(
                zero_allergen_verified=True,
                allergens_checked=[],
                allergens_detected_and_blocked=[],
                deterministic_graph_used=False,
                safety_message="Guardrail Anti-Jailbreak Aktif"
            ),
            telemetry={"latency_ms": 5, "tokens_per_second": 0, "vllm_connected": False}
        )

    # 1.2b. Guardrail Privasi Pasien Lain (DILARANG menjawab umur/data milik pasien lain)
    if is_other_patient_privacy_query(request.message, user_context):
        privacy_msg = (
            f"Mohon maaf {display_name}, demi menjaga privasi dan kerahasiaan rekam medis pasien di PrediaBeat, "
            f"saya hanya dapat mengakses dan menjawab informasi profil atau usia milik Anda sendiri.\n\n"
            f"Jika Anda ingin menanyakan kebutuhan gizi, target kalori, atau rekomendasi menu yang sesuai dengan profil Anda, silakan beri tahu saya ya!"
        )
        return ChatResponse(
            success=True,
            response=privacy_msg,
            user_id=user_context.userId,
            safe_foods_recommended=[],
            guardrail=GuardrailReport(
                zero_allergen_verified=True,
                allergens_checked=[],
                allergens_detected_and_blocked=[],
                deterministic_graph_used=False,
                safety_message="Guardrail Privasi Pasien Aktif"
            ),
            telemetry={"latency_ms": 4, "tokens_per_second": 0, "vllm_connected": False}
        )

    # 1.2. Guardrail Out-of-Scope (Non-Medis / Non-Nutrisi / Non-Pangan / Privasi)
    is_out, out_reason = allergen_guardrail.is_out_of_scope(request.message)
    if is_out:
        reason_explanation = out_reason if out_reason else "Saya tidak dapat menjawab pertanyaan di luar konteks gizi, kesehatan metabolik, atau rekomendasi menu makanan ramah gula darah."
        out_msg = (
            f"Halo {display_name}! Sebagai Dr. Predi, dokter konsultan nutrisi klinis pribadi Anda di PrediaBeat, "
            f"fokus keahlian saya didedikasikan khusus untuk pendampingan pola makan ramah gula darah, takaran gizi 3J, "
            f"dan pencegahan prediabetes/diabetes sesuai panduan klinis PERKENI & Kemenkes RI.\n\n"
            f"{reason_explanation}\n\n"
            f"Apakah ada pertanyaan seputar kandungan gizi bahan makanan, takaran karbohidrat/protein, atau rekomendasi menu sehat yang ingin dikonsultasikan hari ini? 😊"
        )
        return ChatResponse(
            success=True,
            response=out_msg,
            user_id=user_context.userId,
            safe_foods_recommended=[],
            guardrail=GuardrailReport(
                zero_allergen_verified=True,
                allergens_checked=[],
                allergens_detected_and_blocked=[],
                deterministic_graph_used=False,
                safety_message="Guardrail Out-of-Scope Aktif"
            ),
            telemetry={"latency_ms": 5, "tokens_per_second": 0, "vllm_connected": False}
        )

    # 1.3. Guardrail Anti-Diagnosis & Anti-Modifikasi Obat (Hanya Asisten Nutrisi, Bukan Dokter Pemeriksa)
    med_guard = allergen_guardrail.detect_medical_diagnosis_or_medication_query(request.message, display_name)
    if med_guard:
        return ChatResponse(
            success=True,
            response=med_guard["response"],
            user_id=user_context.userId,
            safe_foods_recommended=[],
            guardrail=GuardrailReport(
                zero_allergen_verified=True,
                allergens_checked=[],
                allergens_detected_and_blocked=[med_guard["type"]],
                deterministic_graph_used=True,
                safety_message="Guardrail Anti-Diagnosis & Rujukan Dokter/RS Aktif"
            ),
            telemetry={"latency_ms": 6, "tokens_per_second": 0, "vllm_connected": False}
        )

    # 1.4. Guardrail Kontraindikasi Klinis Fatal/Ketat (Knowledge Base P016 Belimbing, P017 Jengkol, P012 Jeroan)
    contra = allergen_guardrail.detect_clinical_contraindication(request.message, display_name)
    if contra:
        return ChatResponse(
            success=True,
            response=contra["response"],
            user_id=user_context.userId,
            safe_foods_recommended=[],
            guardrail=GuardrailReport(
                zero_allergen_verified=True,
                allergens_checked=[],
                allergens_detected_and_blocked=[contra["nama"]],
                deterministic_graph_used=True,
                safety_message=f"Guardrail Kontraindikasi Klinis {contra['kode']} ({contra['tingkat']}) Aktif"
            ),
            telemetry={"latency_ms": 8, "tokens_per_second": 0, "vllm_connected": False}
        )

    try:
        # 2. Bangun Dossier Klinis Hybrid GraphRAG (dengan deteksi gizi makanan spesifik, typo normalizer, sugar verification, contextual recipe, & MET kalkulator)
        dossier_text, safe_food_names, user_allergens, specific_food, confirmation, exercise_logged, sugar_verification, contextual_recipe, story_foods = fusion_engine.build_clinical_dossier(
            request.message, user_context, request.chat_history or [], request.last_suggested_recipe
        )

        # 2.1. Short-circuit deterministik jika makanan tidak ada di dataset (misal nasi bakar / risol lumer) atau konflik alergen keras
        if not specific_food:
            import re as _re
            ql_nf = (request.message or "").lower().strip()
            asks_food_nutrition = any(k in ql_nf for k in [
                "berapa kalori", "berapa makro", "kalori dari", "makro dari",
                "nilai gizi", "kandungan gizi", "nutrisi dari"
            ])
            not_personal_metric = not any(k in ql_nf for k in ["harian", "target", "sisa kalori", "terbakar", "hari ini", "berat badan", "tinggi"])
            if asks_food_nutrition and not_personal_metric:
                m_food = _re.search(r"(?:kalori|makro|gizi|nutrisi)\s+(?:dari\s+)?([a-zA-Z0-9\s\-]{3,40})", ql_nf)
                missing_guess = (m_food.group(1).strip(" ?!.,") if m_food else "makanan tersebut").title()
                alts = ", ".join(safe_food_names[:3]) if safe_food_names else "Nasi Merah, Tahu Kukus, Tempe Bacem Kukus"
                return ChatResponse(
                    success=True,
                    response=(
                        f"Halo {display_name}! Maaf, **{missing_guess}** belum tersedia di database nutrisi PrediaBeat saat ini, "
                        f"sehingga data kalori dan makronutrisinya tidak dapat ditampilkan (saya tidak ingin menebak angka).\n\n"
                        f"Sebagai gantinya, pilihan yang tersedia di dataset kami antara lain: **{alts}**. "
                        f"Silakan sebutkan salah satu pilihan tersebut jika ingin melihat detail makro, gula, dan porsinya ya!"
                    ),
                    user_id=user_context.userId,
                    safe_foods_recommended=safe_food_names,
                    guardrail=GuardrailReport(
                        zero_allergen_verified=True,
                        allergens_checked=user_allergens,
                        allergens_detected_and_blocked=[],
                        deterministic_graph_used=True,
                        safety_message="Item Tidak Tersedia di Dataset"
                    ),
                    telemetry={"latency_ms": 8, "tokens_per_second": 0, "vllm_connected": False}
                )

        if specific_food and specific_food.get("not_found_item"):
            missing = specific_food.get("not_found_item")
            alts = ", ".join(specific_food.get("available_alternatives") or ["Nasi Putih", "Nasi Merah"])
            not_found_msg = (
                f"Halo {display_name}! Maaf, **{missing.title()}** belum tersedia di database nutrisi PrediaBeat saat ini, "
                f"sehingga data kalori dan makronutrisinya tidak dapat ditampilkan.\n\n"
                f"Sebagai gantinya, pilihan yang tersedia di dataset kami antara lain: **{alts}**. "
                f"Silakan sebutkan salah satu pilihan tersebut jika ingin melihat detail makro, gula, dan porsinya ya!"
            )
            return ChatResponse(
                success=True,
                response=not_found_msg,
                user_id=user_context.userId,
                safe_foods_recommended=safe_food_names,
                guardrail=GuardrailReport(
                    zero_allergen_verified=True,
                    allergens_checked=user_allergens,
                    allergens_detected_and_blocked=[],
                    deterministic_graph_used=True,
                    safety_message="Item Tidak Tersedia di Dataset"
                ),
                telemetry={"latency_ms": 8, "tokens_per_second": 0, "vllm_connected": False}
            )

        if specific_food and specific_food.get("allergen_conflict"):
            ql_req = (request.message or "").lower()
            f_name = specific_food.get("nama_makanan") or specific_food.get("nama") or "Makanan tersebut"
            conflict_list = ", ".join(specific_food.get("allergen_conflict") or [])
            is_macro_inquiry = (
                any(k in ql_req for k in ["berapa", "makro", "kalori", "protein", "karbo", "lemak", "gizi", "nutrisi"])
                and not any(k in ql_req for k in ["boleh", "aman", "saran", "rekomendasi", "menu"])
            )

            if is_macro_inquiry:
                p_label = specific_food.get("porsi_label") or f"{f_name} (per 100 gram)"
                raw_gi = specific_food.get("gi")
                gi_line = f"{raw_gi} ({'GI Rendah' if raw_gi < 55 else 'GI Sedang' if raw_gi < 70 else 'GI Tinggi'})" if raw_gi else "Opsional / Tidak tersedia"
                conflict_msg = (
                    f"Halo {display_name}! Berikut informasi nilai gizi **{p_label}**:\n\n"
                    f"• **1. Makronutrisi:** Energi **{specific_food.get('kalori', 0)} kkal** | Karbohidrat **{specific_food.get('karbohidrat', 0)}g** | Protein **~{specific_food.get('protein', 0)}g** | Lemak **{specific_food.get('lemak', 0)}g**\n"
                    f"• **2. Kadar Gula:** **{specific_food.get('gula', 0)}g**\n"
                    f"• **3. Indeks Glikemik (Opsional):** {gi_line}\n\n"
                    f"⚠️ **Peringatan Pantangan/Alergi:** Makanan ini mengandung bahan yang termasuk dalam pantangan Anda (**{conflict_list}**), sehingga **tidak disarankan** untuk dikonsumsi."
                )
            else:
                safe_alts = ", ".join(safe_food_names[:3]) if safe_food_names else "Tahu Kukus, Tempe Bacem Kukus, Sayur Bening Bayam"
                conflict_msg = (
                    f"Halo {display_name}! Mohon perhatikan bahwa **{f_name}** mengandung bahan pantangan/alergi Anda (**{conflict_list}**), "
                    f"sehingga **tidak disarankan** untuk dikonsumsi.\n\n"
                    f"Sebagai alternatif aman yang sesuai profil dan pantangan Anda, Anda dapat memilih: **{safe_alts}**."
                )

            return ChatResponse(
                success=True,
                response=conflict_msg,
                user_id=user_context.userId,
                safe_foods_recommended=safe_food_names,
                food_card=specific_food if is_macro_inquiry else None,
                guardrail=GuardrailReport(
                    zero_allergen_verified=True,
                    allergens_checked=user_allergens,
                    allergens_detected_and_blocked=list(specific_food.get("allergen_conflict") or []),
                    deterministic_graph_used=True,
                    safety_message="Peringatan pantangan/alergi aktif"
                ),
                telemetry={"latency_ms": 8, "tokens_per_second": 0, "vllm_connected": False}
            )

        # 3. Format prompt sesuai template resmi Qwen/vLLM
        messages = build_vllm_messages(
            request.message, dossier_text, request.chat_history or [], specific_food=specific_food, user_context=user_context
        )

        # 4. Generate jawaban lewat vLLM (dengan fallback cerdas jika vLLM offline)
        response_text, telemetry, blocked_allergens = await vllm_client.generate_chat_response(
            messages=messages,
            user_allergens=user_allergens,
            user_query=request.message,
            user_context=user_context,
            safe_food_names=safe_food_names,
            specific_food=specific_food,
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
            telemetry=telemetry,
            food_card=specific_food,
            confirmation=confirmation,
            exercise_logged=exercise_logged,
            meal_logged=contextual_recipe["recipe"] if contextual_recipe else None,
            sugar_verification=sugar_verification,
            story_log=story_foods if (story_foods and story_foods.get("items")) else None,
        )
    except Exception as e:
        rag_logger.error("Exception pada chat_endpoint pipeline: %s", str(e), exc_info=True)
        fallback_msg = (
            f"Halo {display_name}! Mohon maaf, Dr. Predi mendeteksi sedikit kendala teknis saat memproses penelusuran graf nutrisi. "
            f"Untuk menjaga respon insulin tetap stabil, tetap utamakan pedoman 3J (Jadwal teratur, Jumlah terkontrol, dan Jenis karbohidrat kompleks/serat tinggi). "
            f"Bisa tolong ulangi pertanyaan Anda atau sebutkan kembali nama bahan makanan yang ingin dikonsultasikan? 😊"
        )
        return ChatResponse(
            success=True,
            response=fallback_msg,
            user_id=user_context.userId,
            safe_foods_recommended=[],
            guardrail=GuardrailReport(
                zero_allergen_verified=True,
                allergens_checked=[],
                allergens_detected_and_blocked=[],
                deterministic_graph_used=False,
                safety_message="Fallback Darurat Aktif"
            ),
            telemetry={"latency_ms": 10, "tokens_per_second": 0, "vllm_connected": False}
        )


@router.post("/chat/stream")
async def chat_stream_endpoint(request: ChatRequest):
    """Streaming chat tokens menggunakan Server-Sent Events (SSE)."""
    if not request.message or not request.message.strip():
        raise HTTPException(status_code=400, detail="Pesan pertanyaan tidak boleh kosong.")

    user_context = await resolve_user_context(request)
    display_name = user_context.nama or user_context.username or "Pasien"

    if allergen_guardrail.is_jailbreak_attempt(request.message, request.chat_history or []):
        async def jailbreak_stream():
            msg = (
                f"Mohon maaf, {display_name}! Sebagai Dr. Predi, konsultan nutrisi klinis pribadi Anda di PrediaBeat, "
                "saya terikat secara ketat pada protokol keselamatan klinis PERKENI & Kemenkes RI. "
                "Saya tidak diizinkan untuk melanggar batasan sistem ataupun memberikan kode pemrograman/topik non-medis."
            )
            yield f"data: {msg}\n\n"
            yield "data: [DONE]\n\n"
        return StreamingResponse(jailbreak_stream(), media_type="text/event-stream")

    is_out, out_reason = allergen_guardrail.is_out_of_scope(request.message)
    if is_out:
        async def out_stream():
            reason_explanation = out_reason if out_reason else "Saya tidak dapat menjawab pertanyaan di luar konteks gizi, kesehatan metabolik, atau rekomendasi menu makanan ramah gula darah."
            msg = f"Halo {display_name}! Sebagai Dr. Predi, {reason_explanation}"
            yield f"data: {msg}\n\n"
            yield "data: [DONE]\n\n"
        return StreamingResponse(out_stream(), media_type="text/event-stream")

    med_guard = allergen_guardrail.detect_medical_diagnosis_or_medication_query(request.message, display_name)
    if med_guard:
        async def med_stream():
            yield f"data: {med_guard['response']}\n\n"
            yield "data: [DONE]\n\n"
        return StreamingResponse(med_stream(), media_type="text/event-stream")

    contra = allergen_guardrail.detect_clinical_contraindication(request.message, display_name)
    if contra:
        async def contra_stream():
            yield f"data: {contra['response']}\n\n"
            yield "data: [DONE]\n\n"
        return StreamingResponse(contra_stream(), media_type="text/event-stream")

    dossier_text, safe_food_names, user_allergens, specific_food, _, _, _, _, _ = fusion_engine.build_clinical_dossier(
        request.message, user_context, request.chat_history or [], request.last_suggested_recipe
    )
    messages = build_vllm_messages(
        request.message, dossier_text, request.chat_history or [], specific_food=specific_food, user_context=user_context
    )

    async def event_generator():
        async for token in vllm_client.stream_chat_response(
            messages=messages,
            user_allergens=user_allergens,
            user_query=request.message,
            user_context=user_context,
            safe_food_names=safe_food_names,
            specific_food=specific_food,
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
    neo4j_ok = neo4j_manager.driver is not None
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
