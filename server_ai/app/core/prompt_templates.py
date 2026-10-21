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

3. ATURAN INTENT PERTANYAAN (JAWAB SESUAI APA YANG DITANYA):
   - Jika ditanya NILAI GIZI / GRAM / PROTEIN: Jawab langsung angkanya di awal kalimat. JANGAN menyodorkan resep jika tidak diminta!
   - Jika ditanya JADWAL MAKAN / FREKUENSI ("aku makan berapa kali?"): Jelaskan prinsip Jadwal 3J (3 kali makan utama + 2 kali selingan sehat berjarak 3 jam) secara ringkas tanpa melampirkan resep masakan panjang.
   - Jika ditanya DATA PROFIL / ALERGI / BERAT BADAN: Jawab lugas berdasarkan data rekam medis pasien di dossier.
   - Jika MEMANG DIMINTA RESEP / MENU MAKAN: Sajikan menu yang bervariasi, estetik, dan lezat sesuai format di poin 2.

4. KEWAJARAN KULINER NUSANTARA (CULINARY COMMON SENSE):
   - BUAH (apel, pepaya, pir, jambu biji) SELALU disajikan SEGAR SEBAGAI BUAH POTONG, BUKAN DIREBUS/DIKUKUS!
   - LAUK & SAYUR: Olah secara wajar (kukus, rebus kaldu bening, panggang, pepes). Dilarang santan, kacang, dan seafood bagi Pak Budi!"""


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
        "kabar baik", "apa kabar", "bagaimana kabarmu", "lagi apa", "lagi ngapain"
    }

    if q_clean in greetings:
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
            if turn.role in ["user", "assistant"]:
                messages.append({"role": turn.role, "content": turn.content})
                has_prior_chat = True

    # Ekstrak nama pasien
    patient_name = "Pak Budi"

    # 1. Jika hanya sapaan pendek / test pembuka
    if is_short_greeting_or_test(user_query):
        current_user_content = (
            f"[Profil Pasien]: Pasien bernama {patient_name}.\n"
            f"Pesan Pasien: \"{user_query}\"\n\n"
            f"[Instruksi Khusus Respon Sapaan]:\n"
            f"- Sapa pasien dengan hangat dan ramah: \"Halo {patient_name}, selamat pagi/siang! Semoga kabar Bapak baik hari ini.\"\n"
            f"- Tanyakan dengan singkat apa yang bisa dibantu seputar nutrisi, takaran makanan ramah prediabetes, atau rekomendasi menu sehat hari ini (cukup 1-2 kalimat pendek).\n"
            f"- DILARANG KERAS membeberkan rekam medis pasien (berat badan, tinggi badan, kalori) jika pasien hanya menyapa!\n"
            f"- DILARANG menyodorkan resep masakan panjang atau jadwal makan jika tidak diminta!"
        )
    # 2. Jika pasien menanyakan nilai gizi bahan makanan spesifik
    elif specific_food:
        current_user_content = (
            f"{clinical_dossier}\n\n"
            f"Pesan Pasien: \"{user_query}\"\n\n"
            f"[Instruksi Khusus Pertanyaan Gizi Spesifik]:\n"
            f"- Pasien menanyakan data nutrisi/protein/kalori dari {specific_food['nama']}.\n"
            f"- WAJIB MENJAWAB LANGSUNG ANGKA GIZI PRESISINYA TERLEBIH DAHULU: per 100 gram mengandung sekitar {specific_food['protein']} gram protein, {specific_food['kalori']} kkal energi, dan {specific_food['lemak']}g lemak.\n"
            f"- JANGAN bertele-tele atau langsung menawarkan resep masakan panjang jika pasien hanya bertanya jumlah protein/gram!\n"
            f"- DILARANG memanggil pasien 'Budi'! Gunakan 'Pak Budi' atau langsung jawab tanpa mengulang sapaan nama.\n"
            f"- Hentikan pengulangan salam penutup klise. Jawab to-the-point dan cerdas."
        )
    # 3. Pesan konsultasi mengalir umum
    else:
        greeting_instruction = (
            "- Percakapan sedang berlangsung. DILARANG mengulang salam seperti 'Halo Pak Budi' atau 'Budi, ...' di awal kalimat. Langsung jawab inti pertanyaan pasien.\n"
            if has_prior_chat else
            f"- Sapa dengan hormat menggunakan '{patient_name}'. DILARANG memanggil 'Budi' saja!\n"
        )
        current_user_content = (
            f"{clinical_dossier}\n\n"
            f"Pesan Pasien: \"{user_query}\"\n\n"
            f"[Instruksi Respon]:\n"
            f"{greeting_instruction}"
            f"- PENTING: Periksa intent pertanyaan pasien di atas dan sesuaikan jawaban dengan akurat:\n"
            f"  * Jika pasien menanyakan data pribadinya (berat badan, tinggi, usia, alergi, gula darah, target kalori): BACA dari rekam medis di atas dan jawab langsung angkanya dengan jelas dan tepat!\n"
            f"  * Jika pasien menanyakan jadwal/frekuensi makan ('makan berapa kali?'): Jelaskan prinsip 3J (3 kali makan utama + 2 kali selingan dengan jeda 3 jam) tanpa menyodorkan resep masakan panjang!\n"
            f"  * Jika pasien meminta resep/rekomendasi menu makan siang/malam: Buatkan menu masakan Nusantara yang lezat dan bervariasi (DILARANG mengulang resep oatmeal kaldu atau jambu biji rebus!). Gunakan format resep rapi (Judul Menu, Nilai Gizi, Bahan Utama, Langkah Pengolahan, dan Tips Klinis).\n"
            f"- DILARANG memanggil pasien dengan nama depannya saja (DILARANG memanggil 'Budi'!). Selalu gunakan '{patient_name}'.\n"
            f"- DILARANG mengulang kalimat penutup klise ('Bagaimana dengan ide tersebut? Semoga bermanfaat...'). Langsung akhiri secara lugas dan profesional.\n"
            f"- Gunakan Bahasa Indonesia murni yang cerdas, hangat, dan bersahabat."
        )

    messages.append({"role": "user", "content": current_user_content})
    return messages
