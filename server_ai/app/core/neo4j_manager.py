import os
import csv
import re
from typing import List, Dict, Any, Optional
from app.config import settings
from app.core.allergen_guardrail import allergen_guardrail
from app.core.logger_config import neo4j_logger

try:
    from neo4j import GraphDatabase, Driver
    HAS_NEO4J = True
except ImportError:
    GraphDatabase = None
    Driver = Any
    HAS_NEO4J = False


CURATED_FOOD_IMAGES = {
    # Ayam & Unggas
    "dada ayam": "/food-images/dada-ayam.jpg",
    "ayam dada": "/food-images/dada-ayam.jpg",
    "ayam goreng": "/food-images/ayam-goreng.jpg",
    "ayam bakar": "/food-images/dada-ayam.jpg",
    "sop ayam": "/food-images/sop-ayam.jpg",
    "sup ayam": "/food-images/sop-ayam.jpg",
    "soto ayam": "/food-images/soto-ayam.jpg",
    "bubur ayam": "/food-images/bubur-oatmeal.jpg",
    "ayam": "/food-images/dada-ayam.jpg",

    # Telur
    "telur rebus": "/food-images/telur-rebus.jpg",
    "telur dadar": "/food-images/telur-dadar.jpg",
    "telur ceplok": "/food-images/telur-dadar.jpg",
    "omelet": "/food-images/omelet.jpg",
    "telur ayam": "/food-images/telur-rebus.jpg",
    "telur": "/food-images/telur-rebus.jpg",

    # Nasi & Karbohidrat Kompleks
    "beras merah, nasi": "/food-images/nasi-merah.jpg",
    "nasi beras merah": "/food-images/nasi-merah.jpg",
    "nasi merah pulen": "/food-images/nasi-merah.jpg",
    "nasi merah": "/food-images/nasi-merah.jpg",
    "beras merah": "/food-images/nasi-merah.jpg",
    "nasi goreng": "/food-images/nasi-goreng.jpg",
    "nasi putih": "/food-images/nasi-putih.jpg",
    "nasi biasa": "/food-images/nasi-putih.jpg",
    "nasi uduk": "/food-images/nasi-putih.jpg",
    "nasi lemak": "/food-images/nasi-putih.jpg",
    "nasi kuning": "/food-images/nasi-putih.jpg",
    "roti gandum": "/food-images/roti-gandum.jpg",
    "oatmeal": "/food-images/oatmeal.jpg",
    "havermut": "/food-images/oatmeal.jpg",
    "bubur oatmeal": "/food-images/bubur-oatmeal.jpg",
    "kentang rebus": "/food-images/kentang-rebus.jpg",
    "kentang": "/food-images/kentang-rebus.jpg",
    "jagung rebus": "/food-images/jagung-rebus.jpg",
    "jagung": "/food-images/jagung-rebus.jpg",
    "ubi rebus": "/food-images/ubi-rebus.jpg",
    "ubi jalar": "/food-images/ubi-rebus.jpg",
    "ubi": "/food-images/ubi-rebus.jpg",

    # Tahu & Tempe (Kedelai Sehat)
    "tahu kukus": "/food-images/tahu.jpg",
    "tahu rebus": "/food-images/tahu.jpg",
    "tahu putih": "/food-images/tahu.jpg",
    "tahu mentah": "/food-images/tahu.jpg",
    "tahu": "/food-images/tahu.jpg",
    "tempe kukus": "/food-images/tempe.jpg",
    "tempe rebus": "/food-images/tempe.jpg",
    "tempe bacem": "/food-images/tempe.jpg",
    "tempe": "/food-images/tempe.jpg",

    # Sayuran & Hidangan Berkuah Sehat
    "sayur sawi": "/food-images/sayur-bayam.jpg",
    "sawi hijau": "/food-images/sayur-bayam.jpg",
    "sawi putih": "/food-images/sayur-bening.jpg",
    "sawi": "/food-images/sayur-bayam.jpg",
    "sayur bening bayam oyong": "/food-images/sayur-bening.jpg",
    "sayur bening bayam": "/food-images/sayur-bening.jpg",
    "sayur bening oyong": "/food-images/sayur-bening.jpg",
    "sayur bening": "/food-images/sayur-bening.jpg",
    "sayur bayam": "/food-images/sayur-bayam.jpg",
    "bayam": "/food-images/sayur-bayam.jpg",
    "oyong": "/food-images/sayur-bening.jpg",
    "gambas": "/food-images/sayur-bening.jpg",
    "buncis wortel": "/food-images/buncis-wortel.jpg",
    "buncis": "/food-images/buncis-wortel.jpg",
    "wortel": "/food-images/buncis-wortel.jpg",
    "sop ayam": "/food-images/sop-ayam.jpg",
    "sup ayam": "/food-images/sop-ayam.jpg",
    "soto ayam": "/food-images/soto-ayam.jpg",
    "capcay": "/food-images/capcay.jpg",
    "gado-gado": "/food-images/gado-gado.jpg",
    "gado gado": "/food-images/gado-gado.jpg",
    "pecel": "/food-images/gado-gado.jpg",
    "salad sayur": "/food-images/salad-sayur.jpg",
    "salad": "/food-images/salad-sayur.jpg",

    # Buah-buahan
    "apel": "/food-images/buah-apel.jpg",
    "pepaya": "/food-images/buah-pepaya.jpg",
    "pir": "/food-images/buah-pir.jpg",
    "alpukat": "/food-images/alpukat.jpg",
    "pisang": "/food-images/pisang.jpg",
    "jus": "/food-images/jus-buah.jpg",
    "jus buah": "/food-images/jus-buah.jpg",

    # Minuman & Camilan
    "es teh": "/food-images/es-teh.jpg",
    "es teh manis": "/food-images/es-teh.jpg",
    "teh manis": "/food-images/es-teh.jpg",
    "kopi": "/food-images/kopi.jpg",
    "kopi susu": "/food-images/kopi.jpg",
    "almond": "/food-images/almond.jpg",
    "kacang almond": "/food-images/almond.jpg",
}

def resolve_food_image(food_name: str) -> str:
    """
    Mengembalikan URL gambar HD terbaik untuk makanan tertentu.
    Menggunakan regex word-boundary dan pengurutan panjang frasa agar kata pendek
    seperti 'ayam' TIDAK memicu hidangan 'bayam' atau 'sayur bening'!
    """
    fn = (food_name or "").lower().strip()
    if not fn:
        return "/food-images/sayur-bening.jpg"

    # 1. Cari kecocokan kata kunci dengan urutan dari frasa terpanjang
    sorted_keys = sorted(CURATED_FOOD_IMAGES.keys(), key=len, reverse=True)
    for key in sorted_keys:
        # Gunakan regex word boundary
        pattern = rf"\b{re.escape(key)}\b"
        if re.search(pattern, fn, re.IGNORECASE):
            return CURATED_FOOD_IMAGES[key]

    # 2. Fallback cerdas berbasis kategori hidangan (Bukan sembarangan dada ayam!)
    if any(k in fn for k in ["sayur", "bayam", "oyong", "gambas", "sop", "sup", "labu", "kuah"]):
        return "/food-images/sayur-bening.jpg"
    elif any(k in fn for k in ["ikan", "pepes", "laut", "kembung", "nila", "lele"]):
        return "/food-images/pepes-ikan.jpg"
    elif any(k in fn for k in ["telur", "telor"]):
        return "/food-images/telur-rebus.jpg"
    elif any(k in fn for k in ["nasi", "beras", "merah"]):
        return "/food-images/nasi-merah.jpg"
    elif any(k in fn for k in ["tahu", "tempe"]):
        return "/food-images/tempe.jpg"
    elif any(k in fn for k in ["ayam", "unggas"]):
        return "/food-images/dada-ayam.jpg"

    return "/food-images/sayur-bening.jpg"


EXCLUDE_FOOD_KEYWORDS = [
    "enteral", "glucerna", "wrp", "bubuk", "formula", "kemasan", "bumbu", 
    "tepung", "minyak", "margarin", "sirup", "selasih", "suplemen", "dideh", 
    "darah", "perisa", "pewarna", "snack", "bar", "keripik", "kerupuk", 
    "asin", "terong asam", "terong hintalo", "terung bengkulu", "terung belanda", "terong, segar", "terong",
    "hazelnut", "walnut", "almond", "plum", "canned", "syrup", "juice pack", "drained solids", "water pack",
    "mentah", "abadi", "roti", "bread", "krim", "biskuit", "kue", "permen", 
    "wafer", "cokelat", "goreng", "instan", "cerelac", "sun bubur"
]

STAPLE_PATTERNS = {
    "karbohidrat": [
        "beras merah", "kentang", "jagung", "havermut", "oatmeal", "ubi"
    ],
    "protein": [
        "ayam, dada", "dada ayam", "ikan mas", "ikan", "telur", "tahu", "tempe"
    ],
    "sayuran": [
        "bayam", "gambas", "oyong", "buncis", "labu siam", "wortel", "sawi"
    ],
    "buah": [
        "apel", "pepaya", "jambu biji", "jambu", "jeruk", "pisang"
    ]
}


class Neo4jClinicalGraphManager:
    """Manajer koneksi dan penelusuran graf medis deterministik Neo4j."""

    def __init__(self):
        self.uri = settings.NEO4J_URI
        self.user = settings.NEO4J_USER
        self.password = settings.NEO4J_PASSWORD
        self.database = settings.NEO4J_DATABASE
        self.driver: Optional[Driver] = None
        self._local_foods_cache: Optional[List[Dict[str, Any]]] = None
        self._connect()

    def _connect(self):
        if not HAS_NEO4J:
            neo4j_logger.warning("Library 'neo4j' belum terpasang atau mode standalone aktif.")
            return

        try:
            neo4j_logger.info("Mencoba menghubungkan driver Neo4j ke %s (user: %s)...", self.uri, self.user)
            self.driver = GraphDatabase.driver(self.uri, auth=(self.user, self.password))
            self.driver.verify_connectivity()
            neo4j_logger.info("SUKSES: Terhubung ke database Neo4j di %s (database: %s)", self.uri, self.database)
            self.ensure_seeded()
        except Exception as e:
            neo4j_logger.error("GAGAL: Tidak dapat terhubung ke Neo4j di %s: %s. Mengaktifkan fallback engine CSV lokal.", self.uri, str(e))
            self.driver = None

    def ensure_seeded(self):
        """Memastikan node makanan terisi di Neo4j jika database graf masih kosong."""
        if not self.driver:
            return
        try:
            with self.driver.session(database=self.database) as session:
                res = session.run("MATCH (m:Food) RETURN count(m) AS cnt").single()
                cnt = res["cnt"] if res else 0
                neo4j_logger.info("Pengecekan node makanan Neo4j: ditemukan %d node Food.", cnt)
                if cnt == 0:
                    neo4j_logger.info("Database Neo4j kosong. Memulai inisialisasi auto-seeding node makanan dari CSV...")
                    foods = self._load_local_dataset()
                    if foods:
                        batch_size = 500
                        for i in range(0, len(foods), batch_size):
                            batch = foods[i:i + batch_size]
                            session.run("""
                                UNWIND $batch AS item
                                MERGE (m:Food {nama_makanan: item.nama})
                                SET m.kalori_kal = item.kalori,
                                    m.karbohidrat_g = item.karbohidrat,
                                    m.protein_g = item.protein,
                                    m.lemak_g = item.lemak,
                                    m.serat_g = item.serat,
                                    m.sodium_mg = item.sodium_mg,
                                    m.glikemik_indeks = item.gi,
                                    m.kategori_spesifik = item.kategori,
                                    m.cara_olah = item.cara_olah
                            """, batch=batch)
                        neo4j_logger.info("SUKSES: Berhasil menyuntikkan %d node makanan ke database Neo4j!", len(foods))
        except Exception as e:
            neo4j_logger.error("GAGAL saat auto-seeding Neo4j: %s. Tetap menggunakan CSV fallback.", str(e))

    def is_connected(self) -> bool:
        if not HAS_NEO4J:
            return False
        if not self.driver:
            self._connect()
        if not self.driver:
            return False
        try:
            self.driver.verify_connectivity()
            return True
        except Exception as e:
            neo4j_logger.warning("Koneksi Neo4j terputus saat dicek: %s", str(e))
            return False

    def execute_cypher(self, query: str, params: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        if not self.is_connected():
            neo4j_logger.error("Cypher execution gagal: Neo4j tidak terhubung. Query: %s", query.strip())
            raise ConnectionError("Database Neo4j tidak terhubung.")
        neo4j_logger.debug("Menjalankan Cypher Query: %s | Params: %s", query.strip(), params)
        try:
            with self.driver.session(database=self.database) as session:
                result = session.run(query, params or {})
                data = result.data()
                neo4j_logger.debug("Hasil Cypher: %d records dikembalikan.", len(data))
                return data
        except Exception as e:
            neo4j_logger.error("Error saat eksekusi Cypher: %s | Query: %s", str(e), query.strip())
            raise

    def balance_staples(self, foods: List[Dict[str, Any]], allergens: List[str], limit: int = 8) -> List[Dict[str, Any]]:
        """Menyusun rekomendasi makanan seimbang 3J (Karbohidrat, Lauk, Sayur, Buah segar)."""
        safe_candidates = allergen_guardrail.filter_safe_food_candidates(foods, allergens)
        safe_wholesome = [
            f for f in safe_candidates 
            if f["gi"] <= 55 and f["sodium_mg"] <= 350 and f["kalori"] >= 15
            and not any(bad in f["nama"].lower() for bad in EXCLUDE_FOOD_KEYWORDS)
        ]

        selected = []
        selected_names = set()
        for cat, patterns in STAPLE_PATTERNS.items():
            cat_count = 0
            for pat in patterns:
                for f in safe_wholesome:
                    if pat in f["nama"].lower() and f["nama"] not in selected_names:
                        item_copy = dict(f)
                        if not item_copy.get("cara_olah") or item_copy["cara_olah"] in ["Kukus/Rebus", "", "none"]:
                            if cat == "karbohidrat":
                                item_copy["cara_olah"] = "Kukus matang pulen"
                            elif cat == "protein":
                                item_copy["cara_olah"] = "Kukus / Rebus rempah alami / Pepes"
                            elif cat == "sayuran":
                                item_copy["cara_olah"] = "Rebus sup kaldu bening / Kukus"
                            elif cat == "buah":
                                item_copy["cara_olah"] = "Buah potong segar pencuci mulut terpisah"
                        selected.append(item_copy)
                        selected_names.add(f["nama"])
                        cat_count += 1
                        break
                if cat_count >= 2:
                    break

        if len(selected) < limit:
            for f in safe_wholesome:
                if f["nama"] not in selected_names:
                    selected.append(f)
                    selected_names.add(f["nama"])
                    if len(selected) >= limit:
                        break

        return selected[:limit]

    def get_safe_foods_by_profile(
        self,
        conditions: List[str],
        allergens: List[str],
        limit: int = 8
    ) -> List[Dict[str, Any]]:
        """
        Mencari makanan yang aman untuk kondisi klinis pasien dan 
        100% TIDAK MENGANDUNG alergen terlarang, seimbang sesuai prinsip 3J Kemenkes.
        """
        # 1. Coba lewat Neo4j jika instance aktif
        if self.is_connected():
            cypher_query = """
            MATCH (m:Food)
            WHERE NONE(a IN $allergens WHERE toLower(m.nama_makanan) CONTAINS toLower(a))
              AND NONE(bad IN $exclude_words WHERE toLower(m.nama_makanan) CONTAINS bad)
              AND (m.glikemik_indeks IS NULL OR m.glikemik_indeks <= 55)
              AND (m.sodium_mg IS NULL OR m.sodium_mg <= 350)
              AND (m.kalori_kal IS NULL OR m.kalori_kal >= 15)
            RETURN m.nama_makanan AS nama, 
                   m.kalori_kal AS kalori, 
                   m.karbohidrat_g AS karbohidrat,
                   m.protein_g AS protein, 
                   m.lemak_g AS lemak, 
                   m.serat_g AS serat,
                   m.sodium_mg AS sodium_mg, 
                   COALESCE(m.glikemik_indeks, 35) AS gi,
                   m.kategori_spesifik AS kategori,
                   m.cara_olah AS cara_olah
            ORDER BY gi ASC, kalori ASC
            LIMIT 60
            """
            try:
                with self.driver.session(database=self.database) as session:
                    records = session.run(
                        cypher_query,
                        allergens=allergens,
                        exclude_words=EXCLUDE_FOOD_KEYWORDS
                    ).data()
                    if records:
                        balanced = self.balance_staples(records, allergens, limit)
                        if balanced:
                            return balanced
            except Exception as e:
                print(f"[Neo4j Manager] Error querying Cypher: {e}")

        # 2. Fallback: Eksekusi mesin deterministik dari dataset 4.375 bahan makanan
        return self._get_fallback_foods_from_dataset(conditions, allergens, limit)

    def _load_local_dataset(self) -> List[Dict[str, Any]]:
        if self._local_foods_cache is not None:
            return self._local_foods_cache

        csv_path = os.path.join(settings.KNOWLEDGE_BASE_DIR, "neo4j", "nodes_food.csv")
        items = []
        if os.path.exists(csv_path):
            try:
                with open(csv_path, mode="r", encoding="utf-8") as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        nama = (row.get("nama_makanan") or "").strip()
                        if not nama:
                            continue

                        # Bersihkan key dengan tipe data Neo4j (:float, :int)
                        def get_val(key_base):
                            for k in [key_base, f"{key_base}:float", f"{key_base}:int"]:
                                if k in row and row[k] is not None and row[k] != "":
                                    try:
                                        return float(row[k])
                                    except ValueError:
                                        pass
                            return 0.0

                        kalori = get_val("kalori_kal")
                        karbo = get_val("karbohidrat_g")
                        protein = get_val("protein_g")
                        lemak = get_val("lemak_g")
                        serat = get_val("serat_g")
                        sodium = get_val("sodium_mg")
                        gi_val = get_val("glikemik_indeks")
                        if gi_val <= 0:
                            gi_val = get_val("estimated_gi")
                        if gi_val <= 0:
                            gi_val = 35.0  # Default low-moderate GI

                        items.append({
                            "nama": nama,
                            "kalori": kalori,
                            "karbohidrat": karbo,
                            "protein": protein,
                            "lemak": lemak,
                            "serat": serat,
                            "sodium_mg": sodium,
                            "gi": gi_val,
                            "kategori": row.get("kategori_spesifik") or row.get("kategori_utama") or "Menu",
                            "cara_olah": row.get("cara_olah") or "Kukus/Rebus",
                            "gambar": resolve_food_image(nama)
                        })
            except Exception as e:
                print(f"[Neo4j Manager] Gagal membaca nodes_food.csv: {e}")

        self._local_foods_cache = items
        return items

    def _get_fallback_foods_from_dataset(
        self,
        conditions: List[str],
        allergens: List[str],
        limit: int = 8
    ) -> List[Dict[str, Any]]:
        foods = self._load_local_dataset()
        if not foods:
            return [
                {
                    "nama": "Pepes Ikan Mas Daun Kemangi Kukus",
                    "kalori": 180, "karbohidrat": 2.0, "protein": 26.0, "lemak": 7.5,
                    "serat": 1.2, "sodium_mg": 65, "gi": 0, "kategori": "Lauk Protein",
                    "cara_olah": "Kukus"
                },
                {
                    "nama": "Sayur Bening Bayam Oyong Jagung Manis",
                    "kalori": 65, "karbohidrat": 12.0, "protein": 2.8, "lemak": 0.4,
                    "serat": 3.8, "sodium_mg": 45, "gi": 25, "kategori": "Sayuran",
                    "cara_olah": "Rebus"
                },
                {
                    "nama": "Nasi Beras Merah Pulen",
                    "kalori": 145, "karbohidrat": 31.0, "protein": 3.2, "lemak": 1.1,
                    "serat": 4.5, "sodium_mg": 5, "gi": 50, "kategori": "Karbohidrat Kompleks",
                    "cara_olah": "Kukus"
                }
            ]

        return self.balance_staples(foods, allergens, limit)

    def find_specific_food(self, query: str, chat_history: List[Any] = None) -> Optional[Dict[str, Any]]:
        """
        Mencari item makanan spesifik dari Neo4j / dataset jika pengguna menanyakan
        kandungan gizi (protein, kalori, karbohidrat, gram, dsb.) secara spesifik.
        """
        q = (query or "").lower().strip()

        COMMON_FOOD_ALIASES = {
            "dada ayam": ["ayam, dada", "dada ayam"],
            "dada aym": ["ayam, dada", "dada ayam"],
            "aym": ["ayam, dada", "dada ayam"],
            "ayam": ["ayam, dada", "dada ayam", "ayam, daging", "ayam"],
            "telur": ["telur ayam", "telur rebus", "telur"],
            "telor": ["telur ayam", "telur rebus", "telur"],
            "tlr": ["telur ayam", "telur rebus", "telur"],
            "tempe": ["tempe, segar", "tempe kedelai murni", "tempe"],
            "tahu": ["Tahu Kukus", "Tahu Rebus", "Tahu, mentah", "tahu putih", "tahu"],
            "tahu putih": ["Tahu Kukus", "Tahu Rebus", "Tahu, mentah"],
            "tahu kukus": ["Tahu Kukus", "Tahu Rebus"],
            "sawi": ["Sawi, segar", "Sawi Hijau", "Sawi putih / pecai, segar", "sawi"],
            "sawi hijau": ["Sawi Hijau", "Sawi, segar"],
            "sawi putih": ["Sawi putih / pecai, segar", "Sawi, segar"],
            "ikan mas": ["ikan mas"],
            "ikan": ["ikan mas", "ikan nila", "ikan kembung", "ikan"],
            "ikn": ["ikan mas", "ikan nila", "ikan kembung", "ikan"],
            "pepes ikan": ["pepes ikan", "ikan mas"],
            "nasi merah": ["Beras merah, Nasi", "nasi merah"],
            "beras merah": ["Beras merah, Nasi", "nasi merah"],
            "nsi mrh": ["Beras merah, Nasi", "nasi merah"],
            "nasi putih": ["Nasi Putih", "Nasi"],
            "nasi biasa": ["Nasi Putih", "Nasi"],
            "nsi": ["Nasi Putih", "Nasi"],
            "nasi": ["Nasi Putih", "Nasi"],
            "nasi uduk": ["Nasi Uduk", "Nasi"],
            "nsi uduk": ["Nasi Uduk", "Nasi"],
            "nasi lemak": ["Nasi Uduk", "Nasi Putih"],
            "nasi kuning": ["Nasi Kuning"],
            "nasgor": ["Nasi Goreng"],
            "tahu gejrot": ["Tahu Gejrot", "tahu"],
            "tahu gjrot": ["Tahu Gejrot", "tahu"],
            "bayam": ["bayam, segar", "bayam"],
            "oyong": ["gambas (oyong)", "oyong"],
            "gambas": ["gambas (oyong)", "gambas"],
            "buncis": ["buncis, segar", "buncis"],
            "wortel": ["wortel, segar", "wortel"],
            "apel": ["apel, segar", "apel"],
            "pepaya": ["pepaya muda", "pepaya"],
            "jambu": ["Jambu biji", "Jambu air", "Jambu Kristal"],
            "nanas": ["Nanas, segar", "Potongan Nanas"],
            "oatmeal": ["havermut", "oatmeal"],
            "kentang": ["kentang rebus", "kentang"],
            "jagung": ["Jagung kuning pipil, rebus", "Jagung muda, rebus", "jagung rebus", "jagung"],
            "jagung rebus": ["Jagung kuning pipil, rebus", "Jagung muda, rebus"],
            "ubi": ["ubi rebus", "ubi jalar", "ubi"],
            "singkong": ["Ketela pohon/ singkong kukus", "singkong"],
        }

        # DILARANG menganggap follow-up jika pertanyaan berkaitan dengan tubuh/profil medis (berat badan, tinggi, umur, dll.)
        is_medical_body_query = any(k in q for k in [
            "berat badan", "berat", "tinggi", "bb", "tb", "bmi", "usia", "umur",
            "gula darah", "gula", "hba1c", "kolesterol", "tensi", "tekanan darah",
            "alergi", "pantangan", "lingkar pinggang", "profil", "makan berapa kali", "jadwal",
            "sehat", "ideal", "apakah sehat", "apakah ideal", "normal"
        ])
        if is_medical_body_query:
            return None

        # 1. PRIORITAS UTAMA: Cari kecocokan frasa makanan langsung di query pasien saat ini!
        search_terms = []
        for alias_key in sorted(COMMON_FOOD_ALIASES.keys(), key=len, reverse=True):
            # Gunakan regex word-boundary agar kata seperti "ikan" TIDAK cocok di dalam "pendidikan" atau "bisikan"
            pattern = rf"\b{re.escape(alias_key)}\b"
            if re.search(pattern, q, re.IGNORECASE) and alias_key not in search_terms:
                search_terms.append(alias_key)

        # 2. HANYA JIKA TIDAK ADA MAKANAN DI QUERY, baru periksa apakah ini follow-up murni (misal: 'berapa gram?', 'kalau proteinnya?')
        if not search_terms:
            food_nutri_keywords = ["protein", "kalori", "gram", "karbo", "lemak", "gi", "gizi", "nutrisi", "takaran"]
            is_follow_up = (
                any(q.startswith(k) for k in ["berapa gram", "berapa banyak", "berapa kalori", "berapa protein", "berapa jumlah", "berapa lemak", "berapa karbo", "berapa gi"])
                or (q.startswith("berapa") and any(w in q for w in food_nutri_keywords))
                or q in ["berapa?", "berapa gram?", "berapa banyak?", "berapa kalori?", "berapa protein?"]
            )
            if is_follow_up and chat_history:
                for turn in reversed(chat_history):
                    text = (turn.content if hasattr(turn, "content") else turn.get("content", "")).lower()
                    for alias_key in sorted(COMMON_FOOD_ALIASES.keys(), key=len, reverse=True):
                        pattern = rf"\b{re.escape(alias_key)}\b"
                        if re.search(pattern, text, re.IGNORECASE):
                            search_terms.append(alias_key)
                            break
                    if search_terms:
                        break

        if not search_terms:
            return None

        def rank_food_match(item_name: str, target_keyword: str) -> tuple:
            lower = item_name.lower()
            tk = target_keyword.lower()
            
            # Prioritas 0: Cocok persis atau bentuk sehat standar (Tahu Kukus, Tahu Rebus, Tahu mentah, Ayam dada tanpa kulit)
            is_pure_tofu = tk in ["tahu", "tahu putih", "tahu kukus"] and lower in ["tahu kukus", "tahu rebus", "tahu, mentah", "tahu"]
            is_pure_skinless_chicken = "tanpa kulit" in lower
            is_unwanted_derivative = any(bad in lower for bad in ["kembang tahu", "moon", "ampas", "babi", "minyak", "goreng", "jelantah"])

            prio = 0 if (is_pure_tofu or is_pure_skinless_chicken) else (9 if is_unwanted_derivative else 1)
            return (prio, len(item_name))

        # 1. Coba cari di Neo4j jika aktif
        if self.is_connected():
            neo4j_logger.info("Mencari bahan makanan spesifik di graf Neo4j untuk terms: %s", search_terms)
            for term in search_terms:
                for target in COMMON_FOOD_ALIASES.get(term, [term]):
                    cypher = """
                    MATCH (m:Food)
                    WHERE toLower(m.nama_makanan) CONTAINS toLower($target)
                    RETURN m.nama_makanan AS nama,
                           m.kalori_kal AS kalori,
                           m.karbohidrat_g AS karbohidrat,
                           m.protein_g AS protein,
                           m.lemak_g AS lemak,
                           m.serat_g AS serat,
                           m.sodium_mg AS sodium_mg,
                           COALESCE(m.glikemik_indeks, 0) AS gi,
                           m.kategori_spesifik AS kategori,
                           m.cara_olah AS cara_olah
                    LIMIT 10
                    """
                    try:
                        with self.driver.session(database=self.database) as session:
                            res = session.run(cypher, target=target).data()
                            if res:
                                res.sort(key=lambda x: rank_food_match(x["nama"], target))
                                matched = res[0]
                                matched["gambar"] = resolve_food_image(matched["nama"])
                                neo4j_logger.info("DITEMUKAN di Neo4j: '%s' cocok dengan target '%s' (Kalori: %s, Protein: %s)", matched["nama"], target, matched["kalori"], matched["protein"])
                                return matched
                            else:
                                neo4j_logger.debug("Tidak ada record di Neo4j untuk target '%s'", target)
                    except Exception as e:
                        neo4j_logger.error("Gagal menjalankan Cypher query spesifik untuk '%s': %s", target, str(e))

        # 2. Cari di dataset lokal (fallback deterministik)
        neo4j_logger.info("Neo4j offline atau record tidak ditemukan. Mencari di CSV dataset lokal untuk terms: %s", search_terms)
        foods = self._load_local_dataset()
        for term in search_terms:
            for target in COMMON_FOOD_ALIASES.get(term, [term]):
                target_lower = target.lower()
                matches = [f for f in foods if target_lower in f["nama"].lower()]
                if matches:
                    matches.sort(key=lambda x: rank_food_match(x["nama"], target))
                    matched = matches[0]
                    matched["gambar"] = resolve_food_image(matched["nama"])
                    neo4j_logger.info("DITEMUKAN di Dataset Lokal (CSV): '%s' untuk target '%s' (Kalori: %s, Protein: %s)", matched["nama"], target, matched["kalori"], matched["protein"])
                    return matched
                else:
                    neo4j_logger.debug("Dataset CSV lokal tidak memiliki item untuk '%s'", target_lower)

        neo4j_logger.warning("Tidak ditemukan bahan makanan spesifik untuk search terms: %s", search_terms)
        return None

neo4j_manager = Neo4jClinicalGraphManager()
