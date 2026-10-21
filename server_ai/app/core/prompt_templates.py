import re
from typing import List, Optional, Dict, Any
from app.models.schemas import ChatTurn

CLINICAL_SYSTEM_PROMPT = """Anda adalah Dr. Predi, Dokter Spesialis Nutrisi Klinis Pribadi Pak Budi (PrediaBeat).

PRINSIP KOMUNIKASI DOKTER CERDAS & NATURAL:
1. PANGGILAN & TONE:
   - Pasien Anda bernama Pak Budi. Gunakan panggilan "Pak Budi" secara wajar dan sopan.
   - Bersikaplah cerdas, tenang, to-the-point, dan ramah seperti dokter spesialis asli.
   - JANGAN mengulang-ulang kalimat klise di setiap pesan! (DILARANG: "Jangan khawatir, Pak Budi. Kondisi prediabetes Anda masih sangat bisa diperbaiki...", "Semoga hari Anda menyenangkan...", "Bagaimana informasi ini membantu Bapak?").
   - Jika pasien tidak sedang cemas atau panik, TIDAK PERLU mengucapkan "jangan khawatir" atau "tidak perlu panik"! Jawab langsung substansinya.

2. ATURAN INTENT PERTANYAAN (JAWAB HANYA APA YANG DITANYAKAN):
   - Pertanyaan Gizi (protein/karbo/kalori bahan): Jawab angka gizinya secara presisi dalam 1-2 kalimat. SELESAI.
   - Pertanyaan Profil (berat badan, tinggi, alergi, umur): Jawab angkanya secara lugas dan akurat. SELESAI.
   - Obrolan Santai / Opini / Reaksi ("okee enak keknya nasi ayam goreng", "makasih yaa"): Tanggapi secara wajar dan santai layaknya manusia sedang mengobrol. (Contoh: "Pilihan yang lezat, Pak Budi! Nasi putih dengan dada ayam tanpa kulit sangat pas untuk makan siang."). DILARANG membeberkan angka gizi atau resep lagi!
   - HANYA JIKA PASIEN MEMINTA RESEP / MENU MAKAN: Sajikan 1 rekomendasi menu masakan Nusantara yang lezat, bergizi seimbang, dan ramah prediabetes (bebas kacang, seafood, dan santan).

3. KEAMANAN MEDIS & ZERO-ALLERGEN:
   - Pak Budi memiliki pantangan alergi: Kacang-kacangan (termasuk kacang panjang, bumbu kacang), Seafood (udang, cumi), dan Santan kelapa.
   - Buah selalu disajikan segar sebagai buah potong, bukan direbus."""


def is_short_greeting_or_test(user_query: str) -> bool:
    """Mendeteksi apakah input pengguna sekadar sapaan singkat atau tes percakapan."""
    q = (user_query or "").strip().lower()
    q_clean = re.sub(r'[\s!?,.:;~]+', ' ', q).strip()
    if not q_clean:
        return True

    # Bersihkan salam umum dan variasinya
    greetings = {
        "test", "tes", "testing", "123", "p", "ping", "cek", "check",
        "halo", "hai", "hi", "hey", "halo dok", "halo dr", "halo predi",
        "halo dokter", "dok", "dokter", "assalamualaikum", "assalamu'alaikum",
        "selamat pagi", "selamat siang", "selamat sore", "selamat malam",
        "halo selamat pagi", "halo selamat siang", "halo selamat sore", "halo selamat malam",
        "kabar baik", "apa kabar", "bagaimana kabarmu", "lagi apa", "lagi ngapain",
        "makasih", "terima kasih", "terimakasih", "thanks", "thank you", "ok makasih",
        "okee makasih", "oke makasih", "sip", "ok", "oke", "siap", "baik", "baiklah", "sama-sama"
    }

    if q_clean in greetings:
        return True

    # Jika mengandung kata terima kasih atau penutup singkat
    if any(k in q_clean for k in ["makasih", "terima kasih", "terimakasih", "thank you"]) and len(q_clean.split()) <= 5:
        return True

    # Jika mengandung kata sapaan dasar dan panjang kalimat <= 4 kata tanpa tanda tanya khusus
    words = q_clean.split()
    greeting_keywords = {"halo", "hai", "hey", "selamat", "pagi", "siang", "sore", "malam", "dok", "dokter", "predi", "tes", "test"}
    if len(words) <= 4 and all(w in greeting_keywords for w in words):
        return True

    return False


def build_vllm_messages(
    user_query: str,
    clinical_dossier: str,
    chat_history: List[ChatTurn],
    specific_food: Optional[Dict[str, Any]] = None
) -> List[dict]:
    """Menyusun daftar pesan dalam format standar OpenAI/vLLM ChatML."""
    messages = [
        {"role": "system", "content": CLINICAL_SYSTEM_PROMPT}
    ]

    has_prior_chat = False
    # Sertakan riwayat percakapan sebelumnya agar percakapan terus mengalir
    if chat_history:
        for turn in chat_history[-6:]:
            role = getattr(turn, "role", None) or (turn.get("role") if isinstance(turn, dict) else None)
            content = getattr(turn, "content", None) or (turn.get("content") if isinstance(turn, dict) else None)
            if role in ["user", "assistant"] and content:
                messages.append({"role": role, "content": content})
                has_prior_chat = True

    # Ekstrak nama pasien
    patient_name = "Pak Budi"

    # 1. Jika hanya sapaan pendek, test, atau ucapan terima kasih
    if is_short_greeting_or_test(user_query):
        ql = (user_query or "").lower().strip()
        is_thanks = any(k in ql for k in ["makasih", "terima kasih", "terimakasih", "thanks", "thank you"])
        if is_thanks:
            resp_instruction = (
                f"- Tanggapi ucapan terima kasih dengan ramah dan hangat: \"Sama-sama, {patient_name}! Senang bisa mendampingi pola makan sehat Bapak. Jangan ragu bertanya kembali jika butuh saran nutrisi lainnya ya.\"\n"
                f"- DILARANG KERAS menyodorkan resep masakan panjang, data rekam medis, atau menu baru jika pasien hanya berterima kasih!\n"
                f"- Cukup 1-2 kalimat pendek dan ramah."
            )
        else:
            resp_instruction = (
                f"- Sapa pasien dengan hangat dan ramah: \"Halo {patient_name}, selamat pagi/siang! Semoga kabar Bapak baik hari ini.\"\n"
                f"- Tanyakan dengan singkat apa yang bisa dibantu seputar nutrisi, takaran makanan ramah prediabetes, atau rekomendasi menu sehat hari ini (cukup 1-2 kalimat pendek).\n"
                f"- DILARANG KERAS membeberkan rekam medis pasien (berat badan, tinggi badan, kalori) jika pasien hanya menyapa!\n"
                f"- DILARANG menyodorkan resep masakan panjang atau jadwal makan jika tidak diminta!"
            )
        current_user_content = (
            f"[Profil Pasien]: Pasien bernama {patient_name}.\n"
            f"Pesan Pasien: \"{user_query}\"\n\n"
            f"[Instruksi Khusus]:\n"
            f"{resp_instruction}"
        )
    # 2. Jika pasien menanyakan nilai gizi bahan makanan spesifik
    elif specific_food:
        ql = (user_query or "").lower()
        # Periksa apakah pasien menanyakan karbohidrat, protein, lemak, atau kalori
        if "karbo" in ql:
            nutrisi_utama = f"kandungan karbohidratnya adalah sekitar {specific_food['karbohidrat']} gram, dengan energi sekitar {specific_food['kalori']} kkal dan serat {specific_food.get('serat', 0)} gram"
        elif "lemak" in ql:
            nutrisi_utama = f"kandungan lemaknya adalah sekitar {specific_food['lemak']} gram, dengan energi sekitar {specific_food['kalori']} kkal"
        elif "kalori" in ql:
            nutrisi_utama = f"total kalorinya adalah sekitar {specific_food['kalori']} kkal per 100 gram"
        else:
            nutrisi_utama = f"kandungan proteinnya adalah sekitar {specific_food['protein']} gram, dengan kalori sekitar {specific_food['kalori']} kkal"

        current_user_content = (
            f"Pesan Pasien: \"{user_query}\"\n\n"
            f"[Data Gizi Spesifik dari Graf Database Neo4j]:\n"
            f"- Bahan Makanan: {specific_food['nama']}\n"
            f"- Takaran Acuan: 100 gram\n"
            f"- Protein: {specific_food['protein']} gram\n"
            f"- Karbohidrat: {specific_food['karbohidrat']} gram\n"
            f"- Lemak: {specific_food['lemak']} gram\n"
            f"- Kalori: {specific_food['kalori']} kkal\n"
            f"- Indeks Glikemik (GI): {specific_food['gi']}\n\n"
            f"[Instruksi Respon]:\n"
            f"- Pasien HANYA menanyakan kandungan nutrisi bahan ini.\n"
            f"- JAWAB LANGSUNG KANDUNGAN NUTRISINYA: 'Untuk 100 gram {specific_food['nama']}, {nutrisi_utama}.'\n"
            f"- DILARANG KERAS membeberkan berat badan pasien, BMI, tinggi badan, atau hasil lab! Pasien TIDAK menanyakan hal itu!\n"
            f"- DILARANG menyodorkan resep masakan panjang atau jadwal makan!\n"
            f"- Selesaikan jawaban dalam 1-2 kalimat lugas, cerdas, dan bersahabat."
        )
    # 3. Pesan konsultasi mengalir umum
    else:
        greeting_instruction = (
            "- Percakapan sedang berlangsung. DILARANG mengulang salam seperti 'Halo Pak Budi' atau 'Budi, ...' di awal kalimat. Langsung jawab inti pertanyaan pasien.\n"
            if has_prior_chat else
            f"- Sapa dengan hormat menggunakan '{patient_name}'. DILARANG memanggil 'Budi' saja!\n"
        )
        # Periksa apakah pasien menanyakan resep lanjutan seperti "selain itu?", "menu lain?"
        ql = (user_query or "").lower().strip()
        is_followup_recipe = any(k in ql for k in ["selain itu", "menu lain", "resep lain", "opsi lain", "yang lain", "pilihan lain"])

        # Periksa apakah pasien hanya memberi reaksi santai terhadap makanan (contoh: "enak keknya nasi ayam goreng", "keliatannya enak ya", "mantap tuh")
        is_casual_reaction = any(k in ql for k in ["enak keknya", "keliatannya enak", "kayaknya enak", "enak ya", "mantap", "boleh juga", "sedap", "menarik"])

        if is_casual_reaction:
            recipe_guidance = (
                "  * Pasien hanya menanggapi atau memuji hidangan yang disarankan sebelumnya ('enak keknya...'). Tanggapi dengan santai, hangat, dan positif (misalnya: 'Betul sekali, Pak Budi! Kombinasi tersebut sangat lezat dan pas untuk makan siang Bapak. Selamat menikmati ya!'). DILARANG membeberkan angka gizi detail, resep baru, atau rekam medis lagi!\n"
            )
        elif is_followup_recipe:
            recipe_guidance = (
                "  * Pasien meminta variasi menu baru / alternatif ('selain itu?'). Langsung sajikan 1 menu masakan Nusantara BERBEDA yang lezat dan bergizi seimbang (misalnya: Pepes Ikan Mas Kemangi atau Sayur Bening Bayam Oyong). DILARANG membuka dengan kalimat 'tidak perlu panik' atau mengulang bahasan rekam medis! Langsung berikan rekomendasi menu alternatifnya.\n"
            )
        else:
            recipe_guidance = (
                "  * HANYA JIKA pasien meminta resep/rekomendasi menu: Buatkan 1 menu masakan Nusantara yang lezat dan bervariasi (DILARANG mengulang resep oatmeal kaldu atau jambu biji rebus!). Gunakan format resep rapi (Judul Menu, Nilai Gizi, Bahan Utama, Langkah Pengolahan, dan Tips Klinis).\n"
            )

        current_user_content = (
            f"{clinical_dossier}\n\n"
            f"Pesan Pasien: \"{user_query}\"\n\n"
            f"[Instruksi Respon]:\n"
            f"{greeting_instruction}"
            f"- PENTING: Periksa intent pesan pasien di atas dan tanggapi secara manusiawi, mengalir, dan empatik layaknya dokter nutrisi asli:\n"
            f"  * Jika pasien hanya bereaksi santai/curhat (seperti 'wah gawat yaa', 'aduh gimana dong', 'takut saya'): JANGAN mengulang membacakan rekam medis lengkap lagi! Tanggapi dengan empati dan tenangkan: 'Tidak perlu panik atau berkecil hati, Pak Budi. Kondisi prediabetes dan berat badan ini masih sangat bisa diperbaiki dengan langkah bertahap melalui pola makan 3J dan olahraga teratur. Saya siap mendampingi perjalanan sehat Bapak.' Cukup 2-3 kalimat.\n"
            f"  * Jika pasien menanyakan umur/usia: Jawab umur saja ('Umur Pak Budi saat ini adalah 50 tahun'). DILARANG menambahkan pembahasan berat badan atau obesitas jika hanya ditanya umur!\n"
            f"  * Jika pasien menanyakan kondisi tubuhnya (seperti 'apakah sehat?', 'apakah ideal?'): Jelaskan evaluasi berat badan secara jujur dan empatik tanpa menyodorkan resep masakan!\n"
            f"  * Jika pasien menanyakan data pribadi spesifik (alergi, berat badan, tinggi badan): JAWAB HANYA HAL YANG DITANYAKAN secara singkat dan tepat! DILARANG menambahkan kalimat klise 'jangan khawatir' jika pasien tidak cemas!\n"
            f"  * Jika pasien menanyakan jadwal/frekuensi makan ('makan berapa kali?'): Jelaskan prinsip 3J secara ringkas tanpa resep masakan panjang!\n"
            f"{recipe_guidance}"
            f"- DILARANG menambahkan kalimat template klise di setiap jawaban (seperti: 'Jangan khawatir, Pak Budi. Kondisi prediabetes...', 'Kondisi prediabetes dan alergi Anda masih bisa dikelola...'). HAPUS SEMUA KALIMAT KLISE ITU! Jawab langsung intinya saja!\n"
            f"- DILARANG memuntahkan rekam medis (berat badan, tinggi, hasil lab) jika pasien TIDAK menanyakannya!\n"
            f"- DILARANG menyodorkan resep masakan jika pasien tidak memintanya!\n"
            f"- DILARANG memanggil pasien dengan nama depannya saja (DILARANG memanggil 'Budi'!). Selalu gunakan '{patient_name}'.\n"
            f"- DILARANG memancing pertanyaan penutup ('Apakah ada resep masakan spesial yang ingin Anda coba hari ini?', 'Bagaimana informasi ini membantu Bapak?'). Cukup jawab inti pesan pasien secara hangat dan profesional.\n"
            f"- Gunakan Bahasa Indonesia murni yang cerdas, hangat, dan mengalir alami."
        )

    messages.append({"role": "user", "content": current_user_content})
    return messages
