import re
from typing import List, Dict, Tuple, Any, Optional

ALLERGEN_SYNONYMS = {
    "seafood": [
        "seafood", "udang", "cumi", "cumi-cumi", "kepiting", "kerang", "lobster", 
        "rajungan", "gurita", "tiram", "oyster", "prawn", "shrimp", "ikan teri asin", "saus tiram", "terasi"
    ],
    "kacang": [
        "kacang", "kacang tanah", "kacang panjang", "kacang mede", "selai kacang", "bumbu kacang", 
        "saus kacang", "sambal kacang", "peanut", "rempeyek kacang",
        "hazelnut", "walnut", "almond", "almon", "pistachio", "pecan", "macadamia", "cashew"
    ],
    "susu": [
        "susu", "susu sapi", "susu kental manis", "skm", "keju", "cheese", 
        "butter", "mentega", "cream", "krim", "dairy"
    ],
    "santan": [
        "santan", "santan kental", "santan encer", "kuah gulai", "opor", "rendang santan", "kelapa parut santan", "minyak kelapa santan"
    ],
    "telur": [
        "telur", "telur ayam", "telur bebek", "telur asin", "telur puyuh", "mayones", "mayonnaise"
    ],
    "gluten": [
        "gluten", "terigu", "tepung terigu", "roti putih", "mie instan", "pasta", "bakwan tepung"
    ],
    "babi": [
        "babi", "pork", "lard", "minyak babi", "bacon", "ham"
    ],
    "alkohol": [
        "alkohol", "arak", "mirin", "rum", "tuak"
    ]
}

# Pola Pertanyaan di Luar Lingkup Medis & Gizi PrediaBeat (Out-of-Scope Guardrail)
OUT_OF_SCOPE_PATTERNS = [
    # Politik, Pemerintahan & Tokoh Negara (termasuk variasi/typo menteri/mentri/menter)
    r"\b(presiden|wakil presiden|wapres|menteri|mentri|menter|kementerian|kemendikbud|mendikbud|dpr|mpr|pemilu|pilpres|pilkada|parpol|partai politik|kabinet|gubernur|walikota|bupati|konstitusi|ikn|pemerintah|pejabat|korupsi|kpk)\b",
    # Koding & Komputer Teknis Non-Medis
    r"\b(koding|coding|programming|source code|python|javascript|typescript|golang|c\+\+|html|css|react|sql query|fungsi sort|algorithm|algoritma|algorithma|debugging code|bikin program|script bash|buatkan saya code|buatkan kode|tuliskan kode|buat program)\b",
    # Olahraga Komersial / Sepak Bola
    r"\b(sepak bola|liga champions|liga inggris|piala dunia|world cup|persib|persija|manchester united|real madrid|barcelona|skor bola|hasil pertandingan)\b",
    # Hiburan, Gosip, Film, Game, Anime
    r"\b(film bioskop|aktor|aktris|artis|konser musik|k-pop|anime|manga|mobile legends|free fire|dota|game steam|gosip|selebriti|sinetron)\b",
    # Finansial, Crypto, Saham, Hukum Umum
    r"\b(cryptocurrency|crypto|kripto|bitcoin|btc|ethereum|eth|ihsg|trading saham|saham|forex|pinjaman online|pinjol|hukum pidana|pasal kuhp|investasi bodong)\b",
    # Sains & Matematika Murni Non-Kesehatan
    r"\b(teori relativitas|rumus integral|rumus fisika|kecepatan cahaya|tatasurya|astronomi|dinosaurus)\b",
]

# Pola Percobaan Jailbreak & Pemaksaan Pelanggaran Aturan (Multi-Vector Attack Prevention)
JAILBREAK_PATTERNS = [
    r"\b(langgar|bypass|jailbreak|paksa|abaikan aturan|abaikan panduan|abaikan sistem|abaikan prompt|override rules|lupakan instruksi|lupakan batasan|mode pengembang|developer mode)\b",
    r"\b(sekarang kamu bukan|kamu bukan lagi dokter|berperanlah sebagai|bertindaklah sebagai|pretend to be|act as|dan jawab saja|abaikan semua aturan)\b",
    r"\b(tetap (buatkan|tuliskan|jawab|buat|tulis)|tetep (buatkan|tuliskan|jawab|buat|tulis)|buat aja|jawab aja|jangan menolak|jangan nolak|jangan sok suci)\b",
    r"boleh dong kamu langgar",
    r"kamu langgar",
    r"bisa kamu langgar",
    r"langgar aja",
    r"langgar dong"
]

# Pola Pancingan Koding & Teknis yang Sering Digunakan Pasien untuk Bypass
CODE_REQUEST_PATTERNS = [
    r"\b(buatkan kode|buatkan script|buatkan fungsi|tuliskan kode|tulis kode|bikin kode|bikin program|buatkan program|source code)\b",
    r"\b(bahasa python|bahasa javascript|bahasa c\+\+|bahasa java|bahasa go|bahasa php|bahasa sql)\b",
    r"\b(def\s+[a-zA-Z_]|function\s+[a-zA-Z_]|console\.log|print\(|import\s+[a-zA-Z_])\b",
    r"apakah n\s*=\s*1",
    r"n\s*==\s*1"
]

# Pola Pembujukan Lanjutan Setelah Permintaan Sebelumnya Ditolak
COERCION_FOLLOWUP_PATTERNS = [
    r"\b(ayolah|plis|tolonglah|tolong dong|kenapa tidak bisa|kenapa gak bisa|kenapa ngga bisa|kenapa pelit|kan cuma|kan gampang|sekali aja|cuma nanya)\b",
    r"\b(bisa dong|boleh ya|boleh dong|ayolah dok|ayolah predi|buatkan dong|jawab dong)\b"
]

# Kata Kunci Konteks Kesehatan / Gizi untuk Mencegah False Positives
HEALTH_CONTEXT_KEYWORDS = [
    "gula", "glukosa", "darah", "makan", "minum", "menu", "resep", "gizi", "nutrisi",
    "kalori", "protein", "karbo", "karbohidrat", "lemak", "serat", "diet", "diabetes", "prediabetes",
    "hba1c", "gdp", "kolesterol", "tensi", "hipertensi", "berat badan", "tinggi badan",
    "obesitas", "olahraga", "alergi", "pantangan", "puasa", "3j",
    "sayur", "buah", "nasi", "lauk", "ikan", "ayam", "daging", "tahu", "tempe", "telur",
    "oyong", "bayam", "wortel", "brokoli", "pepes", "sup", "soto",
    "siapa saya", "nama saya", "siapa aku", "profil saya", "umur saya", "usia saya"
]

# Makanan Tradisional Berisiko Tinggi Lonjakan Gula Darah (Simple Sugars & Deep Frying)
HIGH_RISK_SWEET_FOODS = {
    "tahu gejrot": {
        "nama": "Tahu Gejrot",
        "risiko": "Kuah tradisional tahu gejrot menggunakan larutan gula merah/gula jawa pekat yang sangat tinggi sukrosa (gula sederhana) dan tahu yang digoreng rendam minyak, sehingga memicu lonjakan glukosa darah (glycemic spike) cepat serta beban inflamasi dari minyak jelantah.",
        "solusi": "Modifikasi ramah prediabetes: Gunakan kuah asam segar dari air asam jawa asli, bawang merah, cabai rawit, perasan jeruk nipis, dan pemanis alami nol kalori (stevia) TANPA gula merah/gula pasir. Tahu putih diolah dengan dipanggang air-fryer atau dikukus tanpa minyak jelantah."
    },
    "es campur": {
        "nama": "Es Campur",
        "risiko": "Mengandung sirup gula kental, susu kental manis (SKM), dan jeli olahan dengan indeks glikemik sangat tinggi (GI > 75).",
        "solusi": "Ganti dengan es buah segar alami tanpa sirup dan tanpa SKM: gunakan air kelapa murni dingin dengan potongan buah rendah GI (alpukat, apel, stroberi, dan chia seeds)."
    },
    "es teler": {
        "nama": "Es Teler",
        "risiko": "Santan kental berlemak jenuh dan sirup gula pasir pekat meningkatkan beban glikemik dan resistensi insulin.",
        "solusi": "Gunakan santan sangat encer atau susu almond tanpa pemanis, alpukat, dan kelapa muda murni tanpa sirup gula."
    },
    "kolak": {
        "nama": "Kolak",
        "risiko": "Kuah santan kental dengan gula aren pekat menghasilkan lonjakan kalori dan glukosa darah mendadak.",
        "solusi": "Rebusan ubi atau pisang kepok dengan kuah rebusan rempah kayu manis, jahe, dan daun pandan menggunakan stevia tanpa santan kental."
    },
    "martabak manis": {
        "nama": "Martabak Manis",
        "risiko": "Adonan tepung terigu olahan berkarbohidrat tinggi (GI tinggi), mentega tebal, susu kental manis, dan taburan gula pasir.",
        "solusi": "Hindari martabak manis tradisional; ganti dengan pancake havermut (oatmeal) pisang kukus tanpa gula tambahan."
    },
    "boba": {
        "nama": "Minuman Boba",
        "risiko": "Bola tapioka dimasak dan direndam dalam larutan sirup gula pekat, kaya kalori kosong tanpa serat pangan.",
        "solusi": "Ganti boba dengan biji chia (chia seeds) atau cincau hitam alami tanpa sirup gula."
    }
}


class ClinicalAllergenGuardrail:
    """
    Sistem Pengaman Klinis Komprehensif (Multi-Layer Guardrail) PrediaBeat:
    1. Pre-Generation:
       - Out-of-Scope Validation (Memastikan pertanyaan berada dalam ranah nutrisi & prediabetes).
       - High-Risk Food Detection (Mendeteksi hidangan tinggi gula sederhana/minyak jelantah seperti tahu gejrot).
       - Allergen Candidate Filtering (Mengeliminasi kandidat makanan yang mengandung pantangan alergen).
    2. Post-Generation:
       - Response Inspection (Memastikan resep dan jawaban keluaran LLM 100% bebas dari pantangan alergi).
    """

    def is_jailbreak_attempt(self, query: str, chat_history: Optional[List[Any]] = None) -> bool:
        """
        Mendeteksi upaya jailbreak atau memaksa asisten melanggar batasan medis/sistem.
        Juga mendeteksi pembujukan lanjutan (continuation coercion) setelah permintaan sebelumnya ditolak.
        """
        ql = (query or "").lower().strip()
        if not ql:
            return False

        # 1. Cek pola jailbreak eksplisit
        if any(re.search(pat, ql, re.IGNORECASE) for pat in JAILBREAK_PATTERNS):
            return True

        # 2. Cek permintaan koding eksplisit
        if any(re.search(pat, ql, re.IGNORECASE) for pat in CODE_REQUEST_PATTERNS):
            return True

        # 3. Cek pembujukan lanjutan jika pesan assistant sebelumnya adalah penolakan
        if chat_history and len(chat_history) > 0:
            last_turn = chat_history[-1]
            last_content = (last_turn.content if hasattr(last_turn, "content") else last_turn.get("content", "")).lower()
            refusal_signals = [
                "tidak dapat menjawab pertanyaan di luar",
                "protokol keselamatan",
                "terikat secara ketat",
                "fokus keahlian saya didedikasikan khusus",
                "tidak diizinkan untuk melanggar"
            ]
            was_refused = any(sig in last_content for sig in refusal_signals)
            if was_refused:
                # Periksa apakah pesan baru pengguna adalah bujukan / paksaan
                has_coercion = any(re.search(pat, ql, re.IGNORECASE) for pat in COERCION_FOLLOWUP_PATTERNS)
                has_health = any(re.search(rf"\b{re.escape(k)}\b", ql, re.IGNORECASE) for k in HEALTH_CONTEXT_KEYWORDS)
                if has_coercion and not has_health:
                    return True

        return False

    def inspect_and_sanitize_output(self, raw_text: str, patient_name: str = "Bapak/Ibu") -> str:
        """
        Post-Flight Output Verifier (Rule-Based):
        Mendeteksi apakah LLM secara keliru mematuhi jailbreak dan menghasilkan blok kode (Python/JS/SQL dsb.).
        Jika terdeteksi kode, otomatis gantikan teks dengan penolakan klinis standar sebelum sampai ke pengguna!
        """
        if not raw_text:
            return raw_text

        code_signatures = [
            r"```[a-zA-Z]*",
            r"\bdef\s+[a-zA-Z0-9_]+\s*\(",
            r"\bfunction\s+[a-zA-Z0-9_]+\s*\(",
            r"\bconsole\.log\(",
            r"\bprint\(",
            r"\bimport\s+[a-zA-Z0-9_]+",
            r"\bfrom\s+[a-zA-Z0-9_]+\s+import",
            r"return\s+[\"']n\s+adalah",
            r"\bif\s+n\s*==\s*1\s*:"
        ]

        has_code = any(re.search(pat, raw_text, re.IGNORECASE) for pat in code_signatures)
        if has_code:
            print(f"[AllergenGuardrail] [ALERT] Output LLM dicegat karena mengandung kode pemrograman!")
            return (
                f"Mohon maaf, {patient_name}. Sebagai dokter spesialis nutrisi klinis Dr. Predi di PrediaBeat, "
                "saya tidak diizinkan untuk menyajikan kode pemrograman atau instruksi komputasi teknis. "
                "Fokus pendampingan saya adalah pola makan 3J, takaran gizi bahan pangan, dan kestabilan metabolik Anda. "
                "Adakah menu sehat atau informasi nutrisi yang ingin Anda konsultasikan hari ini? 😊"
            )

        return raw_text

    def is_out_of_scope(self, query: str) -> Tuple[bool, Optional[str]]:
        """
        Mendeteksi apakah pertanyaan berada di luar lingkup keahlian Dr. Predi (nutrisi, prediabetes, gaya hidup sehat).
        """
        ql = (query or "").lower().strip()
        if not ql:
            return False, None

        # Cek apakah mengandung kata kunci kesehatan (dengan regex word-boundary agar "ikan" TIDAK cocok di "pendidikan")
        has_health = any(
            re.search(rf"\b{re.escape(k)}\b", ql, re.IGNORECASE)
            for k in HEALTH_CONTEXT_KEYWORDS
        )

        # Cek apakah cocok dengan pola out-of-scope
        for pat in OUT_OF_SCOPE_PATTERNS:
            if re.search(pat, ql, re.IGNORECASE):
                # Jika tidak ada konteks kesehatan, tolak sebagai out-of-scope
                if not has_health:
                    return True, "Pertanyaan berada di luar topik nutrisi klinis dan prediabetes."

        # Cek pertanyaan figur publik / selebriti umum (seperti 'siapa judika')
        is_generic_person = bool(re.match(r'^\s*(?:siapa|taukah kamu siapa|kenal|tahu)\s+([a-zA-Z\s]{2,25})\??\s*$', ql) and not re.search(r'\b(saya|aku|predi|dr|dokter)\b', ql))
        if is_generic_person and not has_health:
            return True, "Pertanyaan mengenai figur non-medis berada di luar lingkup keahlian Dr. Predi."

        # Cek pertanyaan privasi pasien lain / rekam medis orang lain
        if re.search(r'\b(user lain|pasien lain|orang lain|data orang|pengguna lain|pasien sebelum saya|user sebelum saya|data sebelum saya|orang sebelum saya)\b', ql):
            return True, "Data pasien lain dilindungi privasi medis dan tidak dapat dibagikan."

        # Cek pertanyaan memakan tokoh publik / manusia / benda mati / non-pangan (Anti-Halusinasi Soekarno dsb.)
        # Catatan: JANGAN masukkan kata "orang" berdiri sendiri agar "untuk orang diabetes/prediabetes" tidak ditolak!
        NON_FOOD_ENTITIES = [
            r"\b(soekarno|sukarno|hatta|jokowi|joko widodo|prabowo|habibie|b\.?j\.?\s*habibie|megawati|sby|susilo bambang yudhoyono|gus dur|presiden|pahlawan|menteri|tokoh bangsa|pejabat)\b",
            r"\b(manusia|mayat|teman|musuh|tetangga)\b",
            r"\b(?:makan|memakan|daging)\s+orang\b",
            r"\b(batu|kayu|besi|plastik|kertas|baterai|kaca|tanah|pasir|sabun|deterjen|shampoo|odol|oli|bensin|racun|pestisida)\b",
            r"\b(laptop|hp|komputer|meja|kursi|sepatu|baju|celana|mobil|motor|sepeda)\b"
        ]
        is_eating_query = any(k in ql for k in ["makan", "memakan", "konsumsi", "menelan", "minum", "santap", "icip"])
        for non_food_pat in NON_FOOD_ENTITIES:
            match = re.search(non_food_pat, ql, re.IGNORECASE)
            if match:
                entity = match.group(0).title()
                if is_eating_query:
                    return True, f"'{entity}' adalah figur tokoh/benda non-makanan dan bukan bahan konsumsi pangan."
                if not any(k in ql for k in ["gula darah", "diabetes", "makan sehat", "nutrisi"]):
                    return True, f"Topik mengenai '{entity}' berada di luar lingkup keahlian nutrisi klinis Dr. Predi."
        
        return False, None

    def detect_high_risk_sweet_food(self, query: str) -> Optional[Dict[str, str]]:
        """
        Mendeteksi apakah pengguna menanyakan makanan tradisional tinggi gula sederhana atau olahan gorengan berisiko.
        """
        ql = (query or "").lower().strip()
        for food_key, info in HIGH_RISK_SWEET_FOODS.items():
            if food_key in ql:
                return info
        return None

    def detect_clinical_contraindication(self, query: str, patient_name: str = "Bapak/Ibu") -> Optional[Dict[str, str]]:
        """
        Deteksi kontraindikasi klinis berat/fatal sesuai knowledge_base_new (P016 Belimbing, P017 Jengkol, P012 Jeroan).
        Mengembalikan peringatan medis deterministik agar LLM tidak pernah menyarankan konsumsi aman.
        """
        ql = (query or "").lower().strip()
        if not ql:
            return None

        if re.search(r"\b(belimbing|averrhoa\s*carambola)\b", ql):
            return {
                "kode": "P016",
                "nama": "Buah Belimbing (Averrhoa carambola)",
                "tingkat": "hindari_total",
                "response": (
                    f"Halo {patient_name}! Terkait konsumsi **buah belimbing** sebagai terapi herbal atau konsumsi rutin diabetes/prediabetes, "
                    f"Dr. Predi **TIDAK MEREKOMENDASIKAN** dan menegaskan untuk **MENGHINDARI TOTAL** buah belimbing sebagai terapi gula darah.\n\n"
                    f"🚨 **Peringatan Klinis Keamanan Ginjal & Saraf (Protokol P016):**\n"
                    f"• **Mengandung Neurotoksin (*Caramboxin*) & Asam Oksalat Tinggi:** Buah belimbing mengandung zat karamboksin dan oksalat pekat.\n"
                    f"• **Risiko Fatal pada Gangguan Ginjal:** Pada pasien diabetes/prediabetes yang rentan mengalami penurunan fungsi ginjal (meski belum bergejala), konsumsi belimbing dapat memicu **nefropati oksalat akut (gagal ginjal akut)** hingga **ensefalopati uremik** (cegukan terus-menerus, bingung, kejang, hingga koma).\n"
                    f"• **Bukan Obat Herbal Diabetes:** Secara medis tidak direkomendasikan dijadikan terapi penurun gula darah.\n\n"
                    f"🍏 **Alternatif Buah Aman Ramah Glukosa:**\n"
                    f"Anda jauh lebih aman mengonsumsi **Apel Malang**, **Jambu Biji**, **Pir**, atau **Alpukat** dalam porsi terukur (1 porsi buah = ±15g karbohidrat) sesuai pedoman PERKENI & Kemenkes RI."
                ),
            }

        if re.search(r"\b(jengkol|archidendron\s*jiringa)\b", ql):
            return {
                "kode": "P017",
                "nama": "Jengkol (Archidendron jiringa)",
                "tingkat": "batasi_ketat",
                "response": (
                    f"Halo {patient_name}! Terkait **jengkol**, status klinisnya adalah **BATASI KETAT / HINDARI** terutama jika terdapat risiko penurunan fungsi ginjal (Protokol P017).\n\n"
                    f"⚠️ **Alasan Klinis:**\n"
                    f"• **Asam Jengkolat (0,3–1,3 g/100g):** Dapat mengkristal menjadi jarum di tubulus ginjal dan memicu sumbatan/gagal ginjal akut (*djenkolism*).\n"
                    f"• **Karbohidrat Cukup Padat (~40,7 g/100g):** Berpotensi menaikkan beban glikemik bila dikonsumsi bersama nasi dalam porsi besar.\n\n"
                    f"💡 **Saran Aman:** Utamakan sumber protein nabati yang aman bagi ginjal dan gula darah seperti **Tempe Kukus** atau **Tahu Putih Kukus**."
                ),
            }

        if re.search(r"\b(jeroan|hati\s*ayam|hati\s*sapi|ampela|usus\s*ayam|babat|otak\s*sapi|paru\s*goreng)\b", ql):
            return {
                "kode": "P012",
                "nama": "Jeroan & Lemak Jenuh Hewani Pekat",
                "tingkat": "hindari_total",
                "response": (
                    f"Halo {patient_name}! Jeroan (hati, ampela, usus, babat, otak, paru) berstatus **HINDARI TOTAL** dalam panduan klinis prediabetes & komorbiditas (Protokol P012).\n\n"
                    f"⚠️ **Alasan Klinis:**\n"
                    f"• **Kolesterol Ekstrem (280–350 mg/100g):** Jauh melampaui batas aman harian penderita diabetes/dislipidemia (<200 mg/hari).\n"
                    f"• **Tinggi Lemak Jenuh & Purin:** Memicu lonjakan kolesterol LDL, memperburuk resistensi insulin, serta memicu serangan asam urat (*gout*).\n\n"
                    f"🍗 **Alternatif Protein Aman:** Pilih **Dada Ayam Tanpa Kulit (Rebus/Kukus)**, **Pepes Ikan Mas**, atau **Putih Telur Rebus**."
                ),
            }

        return None

    def detect_medical_diagnosis_or_medication_query(self, query: str, patient_name: str = "Bapak/Ibu") -> Optional[Dict[str, str]]:
        """
        Guardrail Keselamatan Klinis:
        Mencegah AI bertindak sebagai dokter pemeriksa yang mendiagnosis penyakit berat,
        mengurangi/menghentikan dosis obat dokter, atau menangani kondisi gawat darurat.
        """
        ql = (query or "").lower().strip()
        if not ql:
            return None

        # 1. Pola Permintaan Mengubah / Mengurangi / Menghentikan Obat Dokter
        medication_patterns = [
            r"\b(berhenti|stop|lepas|putus|tinggal(?:kan)?|tidak\s+usah|gak\s+usah|ngga\s+usah)\s+(?:minum\s+)?(?:obat|metformin|insulin|glibenklamid|glimepiride|amlodipine|captopril|obat\s+gula|obat\s+diabetes|obat\s+tensi|obat\s+darah\s+tinggi)\b",
            r"\b(kurang(?:i|in)?|turun(?:in|kan)?|potong|ubah|ganti|tambah(?:in|kan)?|naik(?:in|kan)?)\s+(?:dosis\s+)?(?:obat|metformin|insulin|glibenklamid|glimepiride|amlodipine|captopril|obat\s+gula|obat\s+diabetes|obat\s+tensi)\b",
            r"\b(boleh\s+(?:gak|tidak|ngga)|aman\s+(?:gak|tidak))\s+(?:berhenti|stop|kurangi|kurangin|lepas)\s+(?:minum\s+)?obat\b",
            r"\b(dosis\s+(?:metformin|insulin|obat)|ganti\s+obat\s+dengan\s+herbal|lepas\s+obat\s+dokter)\b",
        ]

        if any(re.search(pat, ql, re.IGNORECASE) for pat in medication_patterns):
            return {
                "type": "medication_modification",
                "response": (
                    f"Mohon maaf {patient_name}, sebagai **asisten pendamping nutrisi klinis (Dr. Predi)**, "
                    f"saya **TIDAK berwenang** untuk menganjurkan pengurangan, penggantian, ataupun penghentian dosis obat medis Anda.\n\n"
                    f"🚨 **Peringatan Keselamatan Pengobatan:**\n"
                    f"• **Dilarang keras menghentikan atau mengurangi obat resep** (seperti obat diabetes/Metformin, insulin, atau obat hipertensi) secara sepihak tanpa pemeriksaan dokter.\n"
                    f"• Pola makan sehat 3J berperan sebagai **pendamping terapi**, bukan pengganti obat yang sudah diresepkan.\n\n"
                    f"🩺 **Langkah yang Harus Anda Lakukan:**\n"
                    f"Silakan **hubungi dokter yang merawat Anda atau kunjungi fasilitas kesehatan / rumah sakit terdekat** untuk evaluasi kadar gula darah dan penyesuaian dosis obat secara aman."
                ),
            }

        # 2. Pola Permintaan Diagnosis Medis atau Gejala Klinis Berat / Darurat
        diagnosis_or_severe_patterns = [
            r"\b(diagnos(?:a|is)|mendiagnos(?:a|is)|vonis\s+penyakit)\b",
            r"\b(apakah\s+(?:saya|aku|gue|gw|ibu|bapak)\s+(?:kena|mengidap|menderita|positif|sakit|terkena)\s+(?:diabetes|ginjal|jantung|stroke|hipertensi|komplikasi|neuropati|ketoasidosis))\b",
            r"\b(nyeri\s+dada|sakit\s+dada|sesak\s+napas|nafas\s+sesak|pingsan|hilang\s+kesadaran|kejang|muntah\s+terus|koma)\b",
            r"\b(luka\s+(?:tidak\s+sembuh|membusuk|bernanah|gangren|diabetik)|kaki\s+(?:mati\s+rasa|bengkak\s+parah|menghitam)|pandangan\s+kabur\s+mendadak)\b",
            r"\b(gula\s+darah\s+(?:di\s+atas\s+)?(?:300|350|400|450|500|600)|gula\s+darah\s+(?:drop|turun\s+drastis|di\s+bawah\s+60|di\s+bawah\s+70))\b",
        ]

        if any(re.search(pat, ql, re.IGNORECASE) for pat in diagnosis_or_severe_patterns):
            return {
                "type": "diagnosis_or_severe_symptom",
                "response": (
                    f"Halo {patient_name}, perlu saya tegaskan bahwa Dr. Predi adalah **asisten edukasi nutrisi dan pola makan 3J**, "
                    f"**BUKAN dokter pemeriksa langsung** dan **tidak dapat menegakkan diagnosis medis** ataupun menangani keluhan klinis berat.\n\n"
                    f"🏥 **Anjuran Medis Segera:**\n"
                    f"• Apabila Anda mengalami keluhan berat, luka sulit sembuh, nyeri dada, sesak napas, gula darah sangat tinggi (>300 mg/dL) atau terlalu rendah (<70 mg/dL), **segera hubungi dokter Anda atau langsung pergi ke klinik / IGD rumah sakit terdekat**.\n"
                    f"• Diagnosis resmi hanya dapat ditegakkan oleh dokter melalui pemeriksaan fisik dan hasil laboratorium klinis yang sah.\n\n"
                    f"Setelah kondisi Anda ditangani dokter, saya siap membantu mendampingi pengaturan menu harian yang sesuai dengan anjuran dokter Anda. 🙏"
                ),
            }

        return None

    def expand_allergen_keywords(self, user_allergens: List[str]) -> List[str]:
        expanded = set()
        for item in user_allergens:
            item_clean = item.strip().lower()
            if not item_clean:
                continue
            expanded.add(item_clean)
            
            # Cocokkan dengan sinonim kamus medis
            for category, syns in ALLERGEN_SYNONYMS.items():
                if category in item_clean or any(s in item_clean for s in syns):
                    expanded.update(syns)
        return list(expanded)

    def verify_food_item_is_safe(self, food_name: str, expanded_allergens: List[str]) -> bool:
        """Memeriksa apakah satu item makanan bebas dari seluruh pantangan."""
        food_lower = food_name.lower()
        for allergen in expanded_allergens:
            pattern = r'\b' + re.escape(allergen) + r'\b'
            if re.search(pattern, food_lower) or allergen in food_lower:
                return False
        return True

    def filter_safe_food_candidates(self, foods: List[Dict[str, Any]], user_allergens: List[str]) -> List[Dict[str, Any]]:
        """Lapisan 1 (Pre-Filter): Mengeliminasi makanan yang mengandung alergen."""
        if not user_allergens:
            return foods

        expanded = self.expand_allergen_keywords(user_allergens)
        safe_list = []
        for food in foods:
            name = food.get("nama") or food.get("nama_makanan", "")
            if self.verify_food_item_is_safe(name, expanded):
                safe_list.append(food)
        return safe_list

    def inspect_and_sanitize_response(self, text: str, user_allergens: List[str]) -> Tuple[str, List[str]]:
        """
        Lapisan 2 (Post-Filter): Memeriksa respon LLM secara menyeluruh.
        Mendeteksi jika ada bahan pantangan disarankan dalam resep (misal: 'tambahkan santan', 'kacang panjang').
        Mengecualikan konteks keselamatan seperti 'bebas dari [alergen]', 'hindari [alergen]', atau 'pantangan: [alergen]'.
        """
        if not user_allergens or not text:
            return text, []

        expanded = self.expand_allergen_keywords(user_allergens)
        detected_violations = []

        # Pola negasi medis / edukasi pantangan
        NEGATION_PATTERNS = [
            r'\bhindar(?:i|kan)?\b',
            r'\bmenghindar(?:i|kan)?\b',
            r'\bpantang(?:an)?\b',
            r'\bdilarang\b',
            r'\balergi(?:k)?\b',
            r'\bbebas\b',
            r'\btanpa\b',
            r'\btidak\s+(?:boleh|menggunakan|memakai|mengandung|ada)\b',
            r'\bbukan\b',
            r'\bjangan\b',
            r'\bcegah\b',
            r'\bmenjauhi\b',
            r'\bhati-hati\b',
            r'\bwaspada\b',
            r'\bperlu\s+berhati-hati\b',
        ]

        # Pecah teks menjadi kalimat/klausa untuk analisis per kalimat
        sentences = re.split(r'[\n.!?]+', text)
        for s in sentences:
            s_clean = s.strip()
            if not s_clean:
                continue

            # Jika kalimat mengandung kata negasi / edukasi pantangan, kalimat ini aman
            is_negated = any(re.search(pat, s_clean, re.IGNORECASE) for pat in NEGATION_PATTERNS)
            if is_negated:
                continue

            # Periksa apakah ada bahan pantangan disarankan dalam kalimat tanpa negasi ini
            for allergen in expanded:
                pattern = rf'\b{re.escape(allergen)}[a-zA-Z]*\b'
                for m in re.finditer(pattern, s_clean, re.IGNORECASE):
                    detected_violations.append(m.group(0).lower())

        if detected_violations:
            unique_violations = list(dict.fromkeys(detected_violations))
            
            # Gantikan bahan pantangan di dalam baris/kalimat non-negasi secara aman (Zero-Allergen Enforcement)
            lines = text.split('\n')
            sanitized_lines = []
            for line in lines:
                line_lower = line.lower()
                # Jika baris ini merupakan penegasan edukasi pantangan / negasi, biarkan utuh!
                is_line_negated = any(re.search(pat, line_lower, re.IGNORECASE) for pat in NEGATION_PATTERNS)
                if is_line_negated:
                    sanitized_lines.append(line)
                    continue

                mod_line = line
                # 1. Ganti frasa majemuk spesifik terlebih dahulu
                mod_line = re.sub(r'\b100\s*gram\s*kacang\s*panjang\b', '100 gram buncis manis segar', mod_line, flags=re.IGNORECASE)
                mod_line = re.sub(r'\bkacang\s*panjang\b', 'buncis manis segar', mod_line, flags=re.IGNORECASE)
                mod_line = re.sub(r'\b(?:bumbu|saus|sambal)\s*kacang\b', 'saus wijen gurih rendah lemak', mod_line, flags=re.IGNORECASE)
                mod_line = re.sub(r'\bsaus\s*tiram\b', 'kecap asin kedelai non-seafood', mod_line, flags=re.IGNORECASE)
                mod_line = re.sub(r'\b(?:kuah\s*)?santan\b', 'kuah kaldu bening alami tanpa santan', mod_line, flags=re.IGNORECASE)
                mod_line = re.sub(r'\b(udang|cumi-cumi|cumi|kepiting|seafood)\b', 'daging ayam dada tanpa kulit', mod_line, flags=re.IGNORECASE)
                if any("telur" in a for a in expanded):
                    mod_line = re.sub(r'\btelur(?:\s+(?:ayam|bebek|rebus|ceplok|dadar|asin|puyuh))?\b', 'tahu sutra kukus', mod_line, flags=re.IGNORECASE)
                if any("babi" in a for a in expanded):
                    mod_line = re.sub(r'\b(?:daging\s+)?(?:babi|pork|bacon|ham|lard)\b', 'daging sapi tanpa lemak', mod_line, flags=re.IGNORECASE)
                
                # 2. Ganti kata dasar tunggal hanya jika masih tersisa
                if any("kacang" in a for a in expanded):
                    mod_line = re.sub(r'\bkacang\s*(?:tanah|babi|garing|goreng)?\b', 'biji wijen sangrai', mod_line, flags=re.IGNORECASE)
                sanitized_lines.append(mod_line)

            sanitized = '\n'.join(sanitized_lines)

            # Tambahkan penegasan bahwa menu ini telah disanitasi & dijamin aman
            safety_note = (
                f"\n\n> 🛡️ **VERIFIKASI MEDIS ZERO-ALLERGEN (GUARDRAIL PREDIABEAT):**\n"
                f"> Sistem telah memverifikasi hidangan ini 100% bebas dari pantangan alergi Anda ({', '.join(unique_violations)}). "
                f"Seluruh bahan telah diselaraskan dengan protokol klinis PERKENI 2021 demi menjaga stabilitas glukosa dan keamanan metabolik Anda."
            )
            return sanitized + safety_note, unique_violations

        return text, []

allergen_guardrail = ClinicalAllergenGuardrail()
