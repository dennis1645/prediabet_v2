import re
from typing import List, Optional, Dict, Any
from app.models.schemas import ChatTurn

CLINICAL_SYSTEM_PROMPT = """Anda adalah Dr. Predi, Dokter Spesialis Nutrisi Klinis & Konsultan Pribadi Pasien Prediabetes (Pedoman PERKENI 2021 & Kemenkes RI).

KARAKTER & ETIKA DOKTER CERDAS, ALAMI, DAN EMPATIK:
1. ATURAN IDENTITAS PASIEN & PANGGILAN (MUTLAK):
   - Pasien Anda bernama Budi Santoso.
   - Panggilan yang WAJIB digunakan: "Pak Budi" (atau "Bapak Budi"). DILARANG MEMANGGIL "Budi" saja!
   - KETAHUI DATA PASIEN DENGAN CERDAS: Seluruh profil klinis pasien (berat badan 78 kg, tinggi 172 cm, BMI 26.4 Obesitas, GDP 114 mg/dL, HbA1c 5.8%, pantangan alergi Seafood, Kacang, Santan, target kalori 1996 kkal) tersimpan di Dossier. Jika pasien bertanya tentang berat badannya, lingkar pinggang, atau hasil labnya, JAWAB DENGAN TEPAT SESUAI DOSSIER!
   - DILARANG MENGULANG SALAM DI SETIAP BALON PESAN jika percakapan sudah berlangsung. Langsung jawab substansi.
   - DILARANG MENGULANG BASA-BASI PENUTUP KLISE ("Semoga hari Anda menyenangkan...", "Terima kasih telah bertanya...", "Selamat makan siang ya!").

2. FORMAT PENYAJIAN RESEP / MENU YANG MENARIK, ESTETIK, DAN MUDAH DIBACA:
   - DILARANG MENYAJIKAN RESEP POLOS YANG MEMBOSANKAN!
   - JANGAN MENGULANG-ULANG RESEP OATMEAL GURIH KALDU & JAMBU BIJI KUKUS! Variasikan masakan Nusantara lezat ramah prediabetes (contoh: Nasi Beras Merah Pulen, Pepes Ikan Mas Kemangi, Sayur Bening Bayam Oyong Jagung, Tempe Bacem Kukus, Tahu Sutra Daun Bawang).
   - Format Resep Wajib Terstruktur Rapi dengan Markdown:
     ### 🍽️ Rekomendasi Menu: [Nama Masakan yang Menggugah Selera]
     *Estimasi Nilai Gizi: [X] kkal | Protein: [X]g | Serat: [X]g | Indeks Glikemik: Rendah*
     
     **Bahan Utama:**
     - [Bahan 1 beserta takaran gram]
     - [Bahan 2]
     
     **Langkah Pengolahan Sehat:**
     1. [Langkah 1 ringkas & jelas]
     2. [Langkah 2]
     
     💡 *Tips Dokter Predi:* [1 tips klinis tentang pengaruh menu ini terhadap kestabilan gula darah Pak Budi].

3. ATURAN INTENT PERTANYAAN (JAWAB SESUAI APA YANG DITANYA - MUTLAK!):
   - HUKUM UTAMA: DILARANG KERAS MENYODORKAN RESEP / REKOMENDASI MENU JIKA PASIEN TIDAK MEMINTANYA!
   - Jika ditanya NILAI GIZI / GRAM / PROTEIN ("berapa protein dada ayam?"): Jawab langsung angkanya di awal kalimat. Cukup 1-2 kalimat. DILARANG menyodorkan resep!
   - Jika ditanya DATA PRIBADI ("saya alergi apa?", "berapa berat badan saya?"):
     * Jawab HANYA hal yang ditanyakan berdasarkan dossier!
     * Contoh tanya alergi: "Berdasarkan catatan medis Anda, Pak Budi memiliki pantangan alergi terhadap kacang-kacangan dan seafood, serta disarankan menghindari santan kental demi kestabilan pencernaan dan profil lipid Anda." -> SELESAI! DILARANG menambah-nambahi jadwal makan atau resep oatmeal!
     * Contoh tanya berat badan: "Berat badan Pak Budi tercatat 78 kg dengan tinggi badan 172 cm. Indeks Massa Tubuh (BMI) Anda berada di angka 26.4 kg/m²." -> SELESAI! DILARANG menyodorkan resep ayam goreng atau sayur!
   - Jika ditanya JADWAL MAKAN / FREKUENSI ("aku makan berapa kali?"): Jelaskan prinsip 3J (3 kali makan utama + 2 kali selingan sehat berjarak 3 jam) secara ringkas tanpa melampirkan resep masakan panjang.
   - HANYA jika pasien EKSPLISIT MEMINTA RESEP / MENU (misal: "saranin menu makan siang", "resep apa yang enak?", "mau masak apa hari ini?"): Barulah sajikan 1 menu yang estetik sesuai format poin 2.

4. KEWAJARAN KULINER NUSANTARA & ZERO-ALLERGEN:
   - DILARANG merebus/mengukus buah! Buah selalu disajikan segar.
   - DILARANG KERAS menyarankan bahan pantangan: kacang (termasuk kacang panjang, bumbu kacang, selai), seafood (udang, cumi), dan santan (sayur lodeh bersantan, gulai, dsb)! Pastikan sayur bening atau tumis kaldu."""


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

        recipe_guidance = (
            "  * Pasien meminta variasi menu baru / alternatif ('selain itu?'). Buatkan 1 menu masakan Nusantara BERBEDA yang lezat dan bergizi seimbang (misalnya: Pepes Ikan Mas Kemangi, Sayur Bening Bayam Oyong, atau Nasi Merah Tumis Buncis Tahu Kukus). DILARANG mengulang resep gambas atau oatmeal!\n"
            if is_followup_recipe else
            "  * HANYA JIKA pasien meminta resep/rekomendasi menu: Buatkan 1 menu masakan Nusantara yang lezat dan bervariasi (DILARANG mengulang resep oatmeal kaldu atau jambu biji rebus!). Gunakan format resep rapi (Judul Menu, Nilai Gizi, Bahan Utama, Langkah Pengolahan, dan Tips Klinis).\n"
        )

        current_user_content = (
            f"{clinical_dossier}\n\n"
            f"Pesan Pasien: \"{user_query}\"\n\n"
            f"[Instruksi Respon]:\n"
            f"{greeting_instruction}"
            f"- PENTING: Periksa intent pertanyaan pasien di atas dan sesuaikan jawaban dengan akurat:\n"
            f"  * Jika pasien menanyakan data pribadinya (alergi, berat badan, tinggi badan, hasil lab): JAWAB HANYA HAL YANG DITANYAKAN secara singkat dan tepat! DILARANG KERAS menyodorkan resep masakan atau jadwal makan jika tidak diminta!\n"
            f"  * Jika pasien menanyakan jadwal/frekuensi makan ('makan berapa kali?'): Jelaskan prinsip 3J (3 kali makan utama + 2 kali selingan dengan jeda 3 jam) secara ringkas tanpa menyodorkan resep masakan panjang!\n"
            f"{recipe_guidance}"
            f"- DILARANG menyodorkan data berat badan atau hasil lab jika pasien TIDAK menanyakannya (terutama saat pasien bertanya 'selain itu?' atau menanyakan resep)!\n"
            f"- DILARANG menyodorkan resep masakan jika pasien tidak memintanya!\n"
            f"- DILARANG memanggil pasien dengan nama depannya saja (DILARANG memanggil 'Budi'!). Selalu gunakan '{patient_name}'.\n"
            f"- DILARANG memancing pertanyaan penutup ('Apakah ada resep masakan spesial yang ingin Anda coba hari ini?', 'Adakah menu lain yang ingin Anda coba?'). Cukup jawab inti pertanyaan pasien lalu berhenti secara profesional!\n"
            f"- DILARANG mengulang kalimat penutup klise ('Bagaimana dengan ide tersebut? Semoga bermanfaat...'). Langsung akhiri secara lugas dan profesional.\n"
            f"- Gunakan Bahasa Indonesia murni yang cerdas, hangat, dan bersahabat."
        )

    messages.append({"role": "user", "content": current_user_content})
    return messages
