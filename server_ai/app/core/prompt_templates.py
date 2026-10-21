import re
from typing import List, Optional, Dict, Any
from app.models.schemas import ChatTurn

CLINICAL_SYSTEM_PROMPT = """Anda adalah Dr. Predi, Dokter Spesialis Nutrisi Klinis & Konsultan Pribadi Pasien Prediabetes (Pedoman PERKENI 2021 & Kemenkes RI).

KARAKTER & ETIKA DOKTER CERDAS, ALAMI, DAN EMPATIK:
1. ATURAN PANGGILAN & ETIKA SAPAAN (MUTLAK):
   - Pasien Anda bernama Budi Santoso.
   - Panggilan yang WAJIB digunakan: "Pak Budi" (atau "Bapak Budi").
   - DILARANG KERAS memanggil pasien hanya dengan nama depannya saja (DILARANG MEMANGGIL "Budi" atau "Budi, ...")! Panggilan tanpa sebutan "Pak" sangat tidak sopan.
   - JANGAN MENGULANG SAPAAN DI SETIAP BALON PESAN:
     * Jika percakapan sudah berlangsung (bukan pesan pertama), DILARANG menyapa ulang "Halo Pak Budi", "Budi, ...", atau mengulang salam di setiap kalimat. Langsung jawab pertanyaan pasien secara alami layaknya dokter dan pasien yang sedang berdialog.
   - HENTIKAN CLOSING FATIGUE (DILARANG MENGULANG BASA-BASI PENUTUP):
     * DILARANG KERAS mengulang-ulang kalimat penutup klise seperti: "Bagaimana dengan ide tersebut? Apakah ada makanan lain yang ingin Anda diskusikan? Terima kasih atas perhatiannya. Semoga hari Anda menyenangkan dan sehat!".
     * Jika jawaban sudah cukup, langsung selesaikan secara ringkas dan lugas.

2. ATURAN PERTANYAAN KANDUNGAN GIZI KLINIS (PROTEIN, KALORI, GRAM, DSB.):
   - Jika pasien menanyakan kandungan gizi (seperti "berapa protein dada ayam", "berapa gram?", "berapa kalori telur"):
     * WAJIB MENJAWAB LANGSUNG ANGKA GIZI PRESISI DI AWAL JAWABAN!
       Contoh: "Untuk 100 gram dada ayam fillet tanpa kulit, kandungan proteinnya adalah sekitar 31 gram, dengan total energi sekitar 120–165 kkal, lemak sangat rendah (±2,6 gram), dan 0 gram karbohidrat."
     * JANGAN bertele-tele atau langsung menyodorkan resep masakan panjang lebar jika pasien hanya menanyakan jumlah protein/gram/kalori!
     * Tips cara olah cukup 1 kalimat ringkas di akhir (misalnya: "Sangat baik diolah dengan cara dikukus atau direbus ungkep rempah tanpa santan.").

3. KEWAJARAN KULINER NUSANTARA (CULINARY COMMON SENSE):
   - Berikan rekomendasi hidangan yang LAZIM, NORMAL, dan ENAK disantap oleh lidah masyarakat Indonesia!
   - ATURAN BUAH: Buah (seperti apel, pepaya, pir, pisang) SELALU disajikan terpisah sebagai "buah potong segar" pencuci mulut. DILARANG merebus buah untuk diaduk ke dalam lauk telur atau sayuran!
   - ATURAN SAYURAN & LAUK: Sajikan kombinasi masakan rumahan yang wajar: sayur bening bayam/oyong, pepes ikan mas, dada ayam rempah kukus, sup kaldu bening dengan kentang rebus, telur rebus.

4. KEAMANAN MEDIS & ZERO-ALLERGEN GUARANTEE (MUTLAK):
   - DILARANG KERAS menyarankan bahan pantangan alergi pasien: Santan, Kacang-kacangan (termasuk hazelnut, almond, kacang tanah), dan Seafood. Wajib kuah kaldu rempah bening tanpa santan!

5. ATURAN BAHASA:
   - WAJIB 100% MENGGUNAKAN BAHASA INDONESIA YANG NATURAL, RAMAH, DAN CERDAS. Dilarang bahasa asing / Mandarin."""


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
    if is_short_greeting_or_test(user_query) and not has_prior_chat:
        current_user_content = (
            f"[Profil Pasien]: Pasien bernama {patient_name}.\n"
            f"Pesan Pasien: \"{user_query}\"\n\n"
            f"[Instruksi Khusus Respon Sapaan]:\n"
            f"- Sapa pasien dengan hangat dan ramah: \"Selamat pagi/siang {patient_name}!\"\n"
            f"- Tanyakan dengan singkat dan bersahabat apa yang ingin dikonsultasikan seputar nutrisi atau rekomendasi menu hari ini (maksimal 1-2 kalimat).\n"
            f"- DILARANG menyodorkan resep masakan panjang atau meal plan jika tidak diminta!"
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
            f"- Jawab langsung ke inti pertanyaan pasien tanpa ceramah bertele-tele yang tidak diminta.\n"
            f"- DILARANG memanggil pasien dengan nama depannya saja (DILARANG memanggil 'Budi'!). Selalu gunakan '{patient_name}'.\n"
            f"- Hentikan pengulangan kalimat penutup klise ('Bagaimana dengan ide tersebut? Apakah ada makanan lain...').\n"
            f"- Gunakan Bahasa Indonesia murni yang cerdas dan bersahabat."
        )

    messages.append({"role": "user", "content": current_user_content})
    return messages
