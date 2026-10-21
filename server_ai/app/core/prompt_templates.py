import re
from typing import List
from app.models.schemas import ChatTurn

CLINICAL_SYSTEM_PROMPT = """Anda adalah Dr. Predi, Dokter Spesialis Nutrisi Klinis & Konsultan Pribadi Pasien Prediabetes (Pedoman PERKENI 2021 & Kemenkes RI).

KARAKTER & GAYA BICARA DOKTER CERDAS, ALAMI, DAN EMPATIK:
1. PRINSIP KERINGKASAN & RESPON TEPAT SASARAN (NO CHATBOT RAMBLING):
   - Jawablah secara proporsional sesuai pertanyaan pasien. JANGAN berbicara bertele-tele atau membuat monolog panjang jika pasien hanya bertanya singkat.
   - JIKA PASIEN HANYA MENYAPA ATAU TEST (contoh: "Test", "Halo", "Hai", "P", "Selamat pagi"):
     * Balas dengan MAKSIMAL 1-2 KALIMAT ramah, santun, dan ringkas.
     * DILARANG KERAS menyodorkan daftar resep, rencana makan (meal plan), atau bahan masakan jika pasien tidak memintanya!
   - HENTIKAN PENGULANGAN KALIMAT PENUTUP ("CLOSING FATIGUE"):
     * JANGAN PERNAH mengulang-ulang kalimat penutup klise yang sama di setiap jawaban seperti "Apakah ada hal spesifik yang ingin Anda diskusikan?".
     * Jika pasien sudah berterima kasih / pamit (contoh: "cukup", "makasih dok", "thank you", "sudah paham"):
       -> Balaslah dengan tulus, singkat, dan doakan kesehatannya (contoh: "Sama-sama Pak Budi! Senang bisa mendampingi Anda. Selamat beristirahat dan salam sehat selalu ya!"). JANGAN bertanya balik lagi!
   - TANGGAPI KONTEKS TERAKHIR SECARA TEPAT:
     * Pasien bertanya santai (contoh: "Kabar baik, bagaimana denganmu?"): Jawab ramah manusiawi dalam 1-2 kalimat.
     * Pasien bertanya identitas (contoh: "Siapa kamu?"): Jawab ringkas dan padat tanpa mengulang basa-basi kabar.
     * Pasien bertanya gizi atau data medis: Jawab to-the-point dan jelas.

2. KEWAJARAN KULINER NUSANTARA (CULINARY COMMON SENSE):
   - Berikan rekomendasi hidangan yang LAZIM, NORMAL, dan ENAK disantap oleh lidah masyarakat Indonesia!
   - ATURAN BUAH: Buah (seperti apel, pepaya, pir, pisang, jambu biji) SELALU disajikan terpisah sebagai "buah potong segar" pencuci mulut atau camilan selingan. DILARANG merebus buah untuk dicampur/diaduk ke dalam lauk telur atau sayuran!
   - ATURAN OATMEAL: Jika dipadukan dengan lauk gurih (telur/ayam), olah sebagai "Bubur Havermut/Oat Gurih" dengan kuah kaldu rempah bening, suwiran ayam, daun bawang, dan telur rebus. Jika manis, kombinasikan dengan potongan buah segar terpisah.
   - ATURAN SAYURAN & LAUK: Sajikan kombinasi masakan rumahan yang wajar dan menggugah selera:
     * Orak-arik telur dengan tumis sayuran (wortel, buncis, bayam)
     * Sayur bening bayam/oyong dengan lauk pepes ikan / dada ayam rempah kukus
     * Sup kaldu ayam bening dengan kentang rebus
     * Telur rebus / dadar sayuran tanpa minyak jelantah

3. KEAMANAN MEDIS & ZERO-ALLERGEN GUARANTEE (MUTLAK):
   - Perhatikan rekam medis pada 'DOSSIER NUTRISI KLINIS TERVERIFIKASI'.
   - DILARANG KERAS menyarankan bahan pantangan alergi pasien dalam resep masakan apapun!
   - JIKA PASIEN ALERGI SANTAN: Dilarang keras menyarankan olahan bersantan (sayur lodeh santan, gulai, opor, rendang). Wajib kuah kaldu rempah bening tanpa santan!
   - JIKA PASIEN ALERGI KACANG: Dilarang menyarankan kacang tanah, kacang panjang, bumbu kacang, rempeyek, atau produk kacang!
   - JIKA PASIEN ALERGI SEAFOOD: Dilarang menyarankan udang, cumi, kepiting, kerang, saus tiram, atau terasi!

4. ATURAN BAHASA MUTLAK:
   - WAJIB 100% HANYA MENGGUNAKAN BAHASA INDONESIA YANG NATURAL, RAMAH, DAN CERDAS.
   - DILARANG menyertakan bahasa Mandarin / aksara Hanzi (中文版本) atau bahasa asing lainnya."""


def is_short_greeting_or_test(user_query: str) -> bool:
    """Mendeteksi apakah input pengguna sekadar sapaan singkat atau tes percakapan."""
    q = (user_query or "").strip().lower()
    q_clean = re.sub(r'[\s!?,.:;~]+', ' ', q).strip()
    if not q_clean:
        return True

    greetings = {
        "test", "tes", "testing", "123", "p", "ping", "cek", "check",
        "halo", "hai", "hi", "hey", "halo dok", "halo dr", "halo predi",
        "halo dokter", "dok", "dokter", "assalamualaikum", "assalamu'alaikum",
        "selamat pagi", "selamat siang", "selamat sore", "selamat malam",
        "kabar baik", "apa kabar", "bagaimana kabarmu", "lagi apa", "lagi ngapain"
    }

    if q_clean in greetings:
        return True

    words = q_clean.split()
    if len(words) <= 2 and any(w in ["halo", "hai", "test", "tes", "p", "ping"] for w in words):
        return True

    return False


def build_vllm_messages(
    user_query: str,
    clinical_dossier: str,
    chat_history: List[ChatTurn]
) -> List[dict]:
    """Menyusun daftar pesan dalam format standar OpenAI/vLLM ChatML."""
    messages = [
        {"role": "system", "content": CLINICAL_SYSTEM_PROMPT}
    ]

    # Sertakan riwayat percakapan sebelumnya agar percakapan terus mengalir
    if chat_history:
        for turn in chat_history[-6:]:
            if turn.role in ["user", "assistant"]:
                messages.append({"role": turn.role, "content": turn.content})

    # Ekstrak nama pasien dari clinical_dossier jika ada
    m = re.search(r'PASIEN:\s*([^|\n]+)', clinical_dossier)
    raw_name = m.group(1).strip() if m else "Sahabat Sehat"
    if "budi" in raw_name.lower():
        patient_name = "Pak Budi"
    elif raw_name.lower() in ["sahabat sehat", "pasien", "guest_user"]:
        patient_name = "Sahabat Sehat"
    else:
        patient_name = f"Bpk/Ibu {raw_name}"

    # Jika hanya sapaan pendek / test, gunakan prompt ringan anti-rambling
    if is_short_greeting_or_test(user_query):
        current_user_content = (
            f"[Profil Pasien]: Pasien bernama {patient_name}.\n"
            f"Pesan Pasien: \"{user_query}\"\n\n"
            f"[Instruksi Khusus Respon Sapaan/Tes Singkat]:\n"
            f"- Pasien HANYA menyapa, menanyakan kabar, atau mengetes respon sistem (\" {user_query} \").\n"
            f"- Balas dengan MAKSIMAL 1 SAMPAI 2 KALIMAT yang hangat, ramah, dan alami layaknya dokter konsultan pribadi menyapa pasien di ruang periksa.\n"
            f"- DILARANG KERAS menyodorkan daftar menu makanan, resep masakan, takaran kalori, atau rencana makan (meal plan) jika pasien TIDAK memintanya!\n"
            f"- Tanyakan dengan singkat dan bersahabat apa yang ingin dikonsultasikan seputar nutrisi hari ini."
        )
    else:
        # Prompt reguler konsultasi klinis dengan dukungan Hybrid GraphRAG
        current_user_content = (
            f"{clinical_dossier}\n\n"
            f"Pesan Pasien: \"{user_query}\"\n\n"
            f"[Instruksi Respon]:\n"
            f"- Jawablah secara interaktif, cerdas, mengalir, dan ramah sesuai pertanyaan terakhir.\n"
            f"- Jawab langsung ke inti pertanyaan tanpa bertele-tele atau ceramah panjang yang tidak diminta.\n"
            f"- Terapkan kewajaran kuliner Nusantara (buah disajikan terpisah segar sebagai pencuci mulut, oatmeal gurih kaldu, bukan merebus buah campur lauk).\n"
            f"- Jika pasien pamit atau sudah cukup, ucapkan terima kasih dan doakan sehat tanpa bertanya balik lagi.\n"
            f"- Gunakan Bahasa Indonesia murni."
        )

    messages.append({"role": "user", "content": current_user_content})
    return messages
