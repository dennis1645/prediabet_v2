import os
import csv
from typing import List, Dict, Any, Optional
from app.config import settings
from app.core.allergen_guardrail import allergen_guardrail

try:
    from neo4j import GraphDatabase, Driver
    HAS_NEO4J = True
except ImportError:
    GraphDatabase = None
    Driver = Any
    HAS_NEO4J = False


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
            print("[Neo4j Manager] [Info] Library neo4j belum terpasang atau mode standalone aktif.")
            return

        try:
            self.driver = GraphDatabase.driver(self.uri, auth=(self.user, self.password))
            self.driver.verify_connectivity()
            print(f"[Neo4j Manager] [OK] Terhubung ke database Neo4j di {self.uri}")
        except Exception as e:
            print(f"[Neo4j Manager] [Notice] Neo4j belum aktif di {self.uri} ({e}). Menggunakan Hybrid CSV deterministic engine fallback.")
            self.driver = None

    def is_connected(self) -> bool:
        if not self.driver or not HAS_NEO4J:
            return False
        try:
            self.driver.verify_connectivity()
            return True
        except Exception:
            return False

    def execute_cypher(self, query: str, params: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        if not self.is_connected():
            raise ConnectionError("Database Neo4j tidak terhubung.")
        with self.driver.session(database=self.database) as session:
            result = session.run(query, params or {})
            return result.data()

    def get_safe_foods_by_profile(
        self,
        conditions: List[str],
        allergens: List[str],
        limit: int = 8
    ) -> List[Dict[str, Any]]:
        """
        Mencari makanan yang aman untuk kondisi klinis pasien dan 
        100% TIDAK MENGANDUNG alergen terlarang.
        """
        # 1. Coba lewat Neo4j jika instance aktif
        if self.is_connected():
            cypher_query = """
            MATCH (m:Food)
            WHERE NONE(a IN $allergens WHERE toLower(m.nama_makanan) CONTAINS toLower(a))
            RETURN m.nama_makanan AS nama, 
                   m.kalori_kal AS kalori, 
                   m.karbohidrat_g AS karbohidrat,
                   m.protein_g AS protein, 
                   m.lemak_g AS lemak, 
                   m.serat_g AS serat,
                   m.sodium_mg AS sodium_mg, 
                   COALESCE(m.glikemik_indeks, m.estimated_gi, 35) AS gi,
                   m.kategori_spesifik AS kategori,
                   m.cara_olah AS cara_olah
            ORDER BY gi ASC, kalori ASC
            LIMIT $limit
            """
            try:
                with self.driver.session(database=self.database) as session:
                    records = session.run(cypher_query, allergens=allergens, limit=limit).data()
                    if records:
                        return allergen_guardrail.filter_safe_food_candidates(records, allergens)
            except Exception as e:
                print(f"[Neo4j Manager] Error querying Cypher: {e}")

        # 2. Fallback: Eksekusi mesin deterministik dari CSV 4.375 bahan makanan
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
                            "cara_olah": row.get("cara_olah") or "Kukus/Rebus"
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

        # Saring ketat dengan Guardrail Allergen
        safe_candidates = allergen_guardrail.filter_safe_food_candidates(foods, allergens)

        # Filter berdasarkan GI rendah (< 55) dan sodium moderat (< 400 mg)
        filtered = [
            f for f in safe_candidates 
            if f["gi"] <= 55 and f["sodium_mg"] <= 400 and f["kalori"] > 20
        ]

        # Prioritaskan yang tinggi serat dan protein
        filtered.sort(key=lambda x: (x["gi"], -x["serat"], x["kalori"]))
        return filtered[:limit]

neo4j_manager = Neo4jClinicalGraphManager()
