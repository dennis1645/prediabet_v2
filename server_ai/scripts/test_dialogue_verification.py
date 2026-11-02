import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from app.models.schemas import ChatRequest, UserClinicalContext
from app.api.routes import chat_endpoint

async def test_dialogue():
    user1 = UserClinicalContext(
        userId=1,
        username="budi_santoso",
        usia=52,
        jenis_kelamin="Laki-laki",
        bmi=26.0,
        kategori_bmi="Kelebihan Berat Badan",
        skor_risiko=70,
        kategori_risiko="Prediabetes",
        gula_darah_puasa=110,
        pantangan_alergi=["Santan", "Seafood"],
        komorbiditas=["Hipertensi"],
        active_diet="Pola 3J Ramah Prediabetes",
        target_kalori=2100
    )

    print("=" * 70)
    print("TURN 1: Budi Santoso -> 'Lagi pengen makan yang berkuah & hangat'")
    print("=" * 70)
    req1 = ChatRequest(user_id=1, message="Lagi pengen makan yang berkuah & hangat", user_context=user1)
    res1 = await chat_endpoint(req1)
    print("\n[BOT RESPONSE 1]:\n" + res1.response)
    if res1.food_card:
        print("\n[FOOD CARD 1]:", res1.food_card.get("nama_makanan"), f"({res1.food_card.get('kalori')} kkal)")
        print("[IMAGE URL 1]:", res1.food_card.get("gambar"))
    
    suggested_recipe_card = res1.food_card
    suggested_recipe_name = (res1.food_card or {}).get("nama_makanan") or "Sayur Bening Bayam"

    print("\n" + "=" * 70)
    print(f"TURN 2: Budi Santoso -> 'resep dan cara buat {suggested_recipe_name} gimana?'")
    print("=" * 70)
    req2 = ChatRequest(
        user_id=1,
        message=f"resep dan cara buat {suggested_recipe_name} gimana?",
        user_context=user1,
        last_suggested_recipe=suggested_recipe_card,
        chat_history=[
            {"role": "user", "content": "Lagi pengen makan yang berkuah & hangat"},
            {"role": "assistant", "content": res1.response}
        ]
    )
    res2 = await chat_endpoint(req2)
    print("\n[BOT RESPONSE 2 (Resep)]:\n" + res2.response)

    print("\n" + "=" * 70)
    print("TURN 3: Budi Santoso -> 'Berapa protein pada dada ayam?'")
    print("=" * 70)
    req3 = ChatRequest(user_id=1, message="Berapa protein pada dada ayam?", user_context=user1)
    res3 = await chat_endpoint(req3)
    print("\n[BOT RESPONSE 3 (Makronutrisi)]:\n" + res3.response)

    print("\n" + "=" * 70)
    print("TURN 4: Siti Rahma (Asam Urat) -> 'Lagi pengen makan yang berkuah & hangat'")
    print("=" * 70)
    user2 = UserClinicalContext(
        userId=2,
        username="siti_rahma",
        usia=48,
        jenis_kelamin="Perempuan",
        bmi=24.0,
        kategori_bmi="Normal",
        skor_risiko=65,
        kategori_risiko="Prediabetes",
        gula_darah_puasa=105,
        pantangan_alergi=["Susu", "Kacang"],
        komorbiditas=["Asam Urat"],
        active_diet="Pola 3J Ramah Prediabetes",
        target_kalori=1800
    )
    req4 = ChatRequest(user_id=2, message="Lagi pengen makan yang berkuah & hangat", user_context=user2)
    res4 = await chat_endpoint(req4)
    print("\n[BOT RESPONSE 4]:\n" + res4.response)
    if res4.food_card:
        print("\n[FOOD CARD 4]:", res4.food_card.get("nama_makanan"), f"({res4.food_card.get('kalori')} kkal)")
        print("[IMAGE URL 4]:", res4.food_card.get("gambar"))

    print("\n" + "=" * 70)
    print("VERIFIKASI HASIL:")
    print("=" * 70)
    has_leak_1 = any(w in res1.response.lower() for w in ["langkah pengolahan", "1. tumis", "1. rebus", "1. siapkan", "bahan utama:"])
    has_steps_2 = any(w in res2.response.lower() for w in ["langkah pengolahan", "cara", "bahan"])
    has_protein_3 = "protein" in res3.response.lower() and ("gram" in res3.response.lower() or "g" in res3.response.lower())
    
    card1_name = (res1.food_card or {}).get("nama_makanan")
    card4_name = (res4.food_card or {}).get("nama_makanan")
    different_recommendations = (card1_name != card4_name)

    print(f"1. Turn 1 Tidak Membocorkan Langkah Masak : {'✅ AMAN' if not has_leak_1 else '❌ BOCOR'}")
    print(f"2. Turn 2 Menyajikan Resep Lengkap       : {'✅ SUKSES' if has_steps_2 else '❌ GAGAL'}")
    print(f"3. Turn 3 Menjawab Makronutrisi Presisi   : {'✅ SUKSES' if has_protein_3 else '❌ GAGAL'}")
    print(f"4. Turn 4 Personalisasi Berbeda Pasien   : {'✅ SUKSES (' + str(card1_name) + ' vs ' + str(card4_name) + ')' if different_recommendations else '⚠️ SAMA'}")

if __name__ == "__main__":
    asyncio.run(test_dialogue())
