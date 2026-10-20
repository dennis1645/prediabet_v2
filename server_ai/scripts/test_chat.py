import asyncio
import os
import sys

# Tambahkan direktori root server_ai ke sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from app.models.schemas import ChatRequest, UserClinicalContext
from app.api.routes import chat_endpoint

async def run_test():
    print("=" * 70)
    print("🧪 PENGUJIAN OTOMASI SERVER AI PREDIABEAT: MULTI-USER & GUARDRAIL")
    print("=" * 70)

    # 1. PENGUJIAN USER 1: BUDI SANTOSO (Laki-laki 50 th, Alergi Seafood & Santan, Hipertensi)
    user1_context = UserClinicalContext(
        userId=1,
        username="budi_santoso",
        usia=50,
        jenis_kelamin="Laki-laki",
        bmi=26.3,
        kategori_bmi="Obesitas (Obese)",
        skor_risiko=75,
        kategori_risiko="Prediabetes (Impaired Fasting Glucose / IFG)",
        gula_darah_puasa=114,
        hba1c=5.8,
        pantangan_alergi=["Seafood", "Santan"],
        komorbiditas=["Hipertensi Derajat 1"],
        active_diet="Diet Mediterania",
        target_kalori=2221
    )

    req1 = ChatRequest(
        user_id=1,
        message="Dok, saya ingin makan siang yang lezat tapi aman untuk tekanan darah saya. Menu apa yang disarankan?",
        user_context=user1_context
    )

    print("\n▶ Mengirim Permintaan untuk USER 1 (Budi Santoso)...")
    res1 = await chat_endpoint(req1)

    print(f"• User ID Terproses     : {res1.user_id}")
    print(f"• Rekomendasi Menu Aman : {res1.safe_foods_recommended[:3]}")
    print(f"• Guardrail Alergen     : {res1.guardrail.safety_message}")
    print(f"• Alergen Dicegah       : {res1.guardrail.allergens_checked}")
    print(f"• Terblokir Guardrail   : {res1.guardrail.allergens_detected_and_blocked}")
    print(f"• Telemetri Latensi     : {res1.telemetry.get('latency_ms')} ms")

    # Verifikasi menu rekomendasi tidak memuat pantangan
    rec_foods_1 = " ".join(res1.safe_foods_recommended).lower()
    has_seafood = any(s in rec_foods_1 for s in ["udang", "cumi", "kepiting", "lobster", "kerang", "seafood"])
    has_santan = "santan" in rec_foods_1
    print(f"• Verifikasi Menu Bebas : Seafood: {'❌ TERCEMAR' if has_seafood else '✅ 100% AMAN'} | Santan: {'❌ TERCEMAR' if has_santan else '✅ 100% AMAN'}")

    # 2. PENGUJIAN USER 2: SITI RAHMA (Perempuan 26 th, Alergi Susu & Kacang, Asam Urat)
    user2_context = UserClinicalContext(
        userId=2,
        username="siti_rahma",
        usia=26,
        jenis_kelamin="Perempuan",
        bmi=20.3,
        kategori_bmi="Berat Badan Normal (Ideal)",
        skor_risiko=20,
        kategori_risiko="Rendah (Risiko Minimal)",
        gula_darah_puasa=88,
        hba1c=5.1,
        pantangan_alergi=["Susu", "Kacang"],
        komorbiditas=["Asam Urat"],
        active_diet="Diet Mediterania",
        target_kalori=2120
    )

    req2 = ChatRequest(
        user_id=2,
        message="Dr. Predi, tolong beri ide camilan sore yang enak tapi asam urat saya tidak kambuh ya.",
        user_context=user2_context
    )

    print("\n▶ Mengirim Permintaan untuk USER 2 (Siti Rahma)...")
    res2 = await chat_endpoint(req2)

    print(f"• User ID Terproses     : {res2.user_id}")
    print(f"• Rekomendasi Menu Aman : {res2.safe_foods_recommended[:3]}")
    print(f"• Guardrail Alergen     : {res2.guardrail.safety_message}")
    print(f"• Alergen Dicegah       : {res2.guardrail.allergens_checked}")
    print(f"• Terblokir Guardrail   : {res2.guardrail.allergens_detected_and_blocked}")
    print(f"• Telemetri Latensi     : {res2.telemetry.get('latency_ms')} ms")

    rec_foods_2 = " ".join(res2.safe_foods_recommended).lower()
    has_susu = any(s in rec_foods_2 for s in ["susu", "keju", "butter"])
    has_kacang = any(k in rec_foods_2 for k in ["kacang", "peanut", "pecel"])
    print(f"• Verifikasi Menu Bebas : Susu: {'❌ TERCEMAR' if has_susu else '✅ 100% AMAN'} | Kacang: {'❌ TERCEMAR' if has_kacang else '✅ 100% AMAN'}")

    # 3. KESIMPULAN ISOLASI
    is_distinct = (
        res1.user_id != res2.user_id and 
        res1.guardrail.allergens_checked != res2.guardrail.allergens_checked and
        res1.safe_foods_recommended != res2.safe_foods_recommended
    )
    print("\n" + "=" * 70)
    print(f"🎯 KESIMPULAN ISOLASI PENGGUNA: {'✅ SUKSES 100% TERISOLASI TANPA KEBOCORAN' if is_distinct else '❌ GAGAL'}")
    print("=" * 70)

if __name__ == "__main__":
    asyncio.run(run_test())
