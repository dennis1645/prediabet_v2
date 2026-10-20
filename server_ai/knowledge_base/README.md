# Knowledge Base — Chatbot Prediabetes/Diabetes Indonesia
# Versi 2.0

## Deskripsi

Knowledge base ini disiapkan untuk sistem RAG (Retrieval-Augmented Generation) chatbot asisten kesehatan bagi penderita prediabetes dan diabetes di Indonesia.

**Dibuat oleh:** Data Engineering Pipeline (Build Date: 2026-09-10)

**PENTING:** Knowledge base ini adalah **SUMBER DATA** untuk chatbot, bukan chatbot itu sendiri. Komponen chatbot (LLM, Semantic Router, API, UI) diimplementasikan secara terpisah.

---

## Struktur Direktori

```
knowledge_base/
├── sqlite/
│   ├── nutrition.db          ← Database nutrisi makanan Indonesia (4,375 makanan)
│   └── schema.sql            ← Definisi tabel + indeks + contoh query
│
├── chromadb/
│   ├── recipe_documents.json ← 453 dokumen resep (siap import ke ChromaDB)
│   ├── import_to_chromadb.py ← Script import ke ChromaDB
│   └── chroma_store/         ← ChromaDB persistent store (setelah import)
│
├── neo4j/
│   ├── nodes_food.csv              ← 4,375 Food nodes
│   ├── nodes_recipe.csv            ← 453 Recipe nodes
│   ├── nodes_ingredient.csv        ← 887 Ingredient nodes (unique)
│   ├── nodes_category.csv          ← 186 Category nodes
│   ├── rels_contains.csv           ← 2,760 CONTAINS relationships
│   ├── rels_recipe_ingredient_category.csv ← 1,722 HAS_INGREDIENT_CATEGORY
│   ├── rels_food_category.csv      ← 13,113 BELONGS_TO relationships
│   └── graph_schema.md             ← Dokumentasi schema + Cypher queries
│
├── medical/
│   └── diabetes_nutrition_guidelines.md  ← Panduan klinis (PERKENI, Kemenkes, IDAI)
│
└── metadata/
    ├── data_dictionary.csv          ← 60 field mappings
    ├── data_quality_report.md       ← Laporan kualitas data
    └── source_provenance_log.csv    ← Rekam jejak sumber data (9 entries)
```

---

## Komponen Knowledge Base

### A. SQLite — Nutrisi Deterministik
**File:** `sqlite/nutrition.db`  
**Tabel:** `nutrition`  
**Sumber:** `Primary_Dataset_Cleaned.xlsx`

- 4,375 makanan Indonesia dengan data nutrisi lengkap
- Preservasi penuh: NaN → NULL (tidak pernah diisi dengan 0 atau estimasi)
- Kolom penting: `kalori_kal`, `karbohidrat_g`, `gula_g`, `serat_g`, `protein_g`, `lemak_g`, `sodium_mg`, `glikemik_indeks`, `estimated_glikemik_indeks`, `glikemik_risk`, `net_karbo`
- Dioptimalkan dengan 7 indeks untuk lookup cepat

**Cara Pakai:**
```python
import sqlite3
conn = sqlite3.connect('sqlite/nutrition.db')
# Query nilai nutrisi spesifik
result = conn.execute(
    'SELECT "Nama Makanan", kalori_kal, karbohidrat_g, gula_g, sodium_mg '
    'FROM nutrition WHERE "Nama Makanan" LIKE ?',
    ('%nasi%',)
).fetchall()
```

### B. ChromaDB — Semantic Recipe Retrieval
**Collection:** `indonesian_recipes`  
**Sumber:** `New_Ingredients_category.xlsx`  
**Embedding Model:** `paraphrase-multilingual-MiniLM-L12-v2`

- 453 dokumen resep masakan Indonesia
- Setiap dokumen = 1 resep dengan daftar bahan-bahan lengkap
- Mendukung pencarian semantik dalam bahasa Indonesia

**Import ChromaDB:**
```bash
cd knowledge_base/chromadb
pip install chromadb sentence-transformers
python3 import_to_chromadb.py
```

**Cara Pakai (setelah import):**
```python
import chromadb
from chromadb.utils import embedding_functions

ef = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name='paraphrase-multilingual-MiniLM-L12-v2'
)
client = chromadb.PersistentClient(path='chromadb/chroma_store')
collection = client.get_collection('indonesian_recipes', embedding_function=ef)

# Semantic search
results = collection.query(
    query_texts=['resep ayam rendah lemak'],
    n_results=5
)
```

**⚠️ Penting — Informasi Alergi:**
> Status: **NOT_SUPPORTED_BY_SOURCE_DATA**
>
> Dataset tidak mengandung ontologi alergen formal. Metadata `allergen`, `allergy_safe`, dll. TIDAK dibuat.
> Alergi diinput secara manual oleh pengguna.

### C. Neo4j — Graph Knowledge Base
**Sumber:** Kedua dataset  
**File:** `neo4j/*.csv`

Total: **5,901 nodes** dan **17,595 relationships**

Node types:
- `Food` (4,375) — makanan dengan data nutrisi
- `Recipe` (453) — resep masakan
- `Ingredient` (887) — bahan-bahan unik
- `Category` (186) — kategori makanan/bahan

Relationship types:
- `Recipe -[CONTAINS]-> Ingredient` (2,760)
- `Recipe -[HAS_INGREDIENT_CATEGORY]-> Category` (1,722)
- `Food -[BELONGS_TO]-> Category` (13,113)

**⚠️ Tidak ada medical relationships** seperti `TREATS`, `PREVENTS`, `SAFE_FOR` — tidak didukung data sumber.

**Import Neo4j:**
```bash
neo4j-admin database import full \
  --nodes=Food=nodes_food.csv \
  --nodes=Recipe=nodes_recipe.csv \
  --nodes=Ingredient=nodes_ingredient.csv \
  --nodes=Category=nodes_category.csv \
  --relationships=CONTAINS=rels_contains.csv \
  --relationships=HAS_INGREDIENT_CATEGORY=rels_recipe_ingredient_category.csv \
  --relationships=BELONGS_TO=rels_food_category.csv \
  --database=nutrition_kb
```

### D. Medical Guidelines — Panduan Klinis
**File:** `medical/diabetes_nutrition_guidelines.md`  
**Sumber:** PERKENI 2021, Kemenkes RI, IDAI

Mencakup:
- Definisi & kriteria diagnosis Prediabetes, DM Tipe 1, DM Tipe 2
- Panduan diet untuk setiap kondisi (prinsip 3J, komposisi makronutrien)
- Daftar makanan yang HARUS DIHINDARI per kondisi
- Panduan komorbiditas: Hipertensi + Diabetes
- Panduan komorbiditas: Dislipidemia + Diabetes
- Tabel indeks glikemik referensi (estimasi berdasarkan literatur)
- Metode Piring Sehat Diabetes (Kemenkes RI)

**Format:** Markdown — siap untuk chunking dan embedding ke RAG

---

## Data Sources & Provenance

| ID | Sumber | Jenis | Verifikasi |
|----|--------|-------|-----------|
| PROV_001 | PERKENI 2021 | Clinical Guideline | ✅ Terverifikasi |
| PROV_002 | PERKENI 2021 | Clinical Guideline | ✅ Terverifikasi |
| PROV_003 | IDAI Konsensus | Clinical Guideline | ✅ Terverifikasi |
| PROV_004 | Kemenkes RI | Government Guideline | ✅ Terverifikasi |
| PROV_005 | Kemenkes RI | Government Guideline | ✅ Terverifikasi |
| PROV_006 | Primary_Dataset_Cleaned.xlsx | Dataset (user-provided) | ✅ Data Integrity OK |
| PROV_007 | New_Ingredients_category.xlsx | Dataset (user-provided) | ✅ Data Integrity OK |
| PROV_008 | N/A — Alergi | NOT_SUPPORTED | ❌ Tidak ada data sumber |
| PROV_009 | GI Database (Univ. Sydney) | Academic Reference | ⚠️ Estimasi/referensi umum |

Lihat `metadata/source_provenance_log.csv` untuk detail lengkap.

---

## Data Quality Summary

### Primary Dataset
| Metrik | Nilai |
|--------|-------|
| Total baris | 4,375 |
| Total kolom | 42 |
| Duplikat | 0 |
| Typo dokumentasi | 1 ("hifh" di glikemik_risk) |
| Kolom NULL tertinggi | cara_olah (99.34%), glikemik_indeks (98.38%) |

### Ingredients Dataset
| Metrik | Nilai |
|--------|-------|
| Total baris | 2,760 |
| Total kolom | 7 |
| Duplikat | 80 (normal — bahan per resep) |
| Resep unik | 453 |
| Bahan unik | 887 |
| kode missing | 46.3% |

---

## Aturan Data Integrity (WAJIB DIPATUHI)

1. **TIDAK ADA halusinasi data** — tidak ada nilai yang dikarang
2. **NaN → NULL** — nilai kosong tidak pernah diisi dengan 0 atau estimasi
3. **Tidak ada klaim medis yang tidak didukung** — tidak ada TREATS, PREVENTS, SAFE_FOR
4. **Tidak ada data alergi otomatis** — alergi diinput manual oleh pengguna
5. **File Excel asli tidak dimodifikasi**
6. **Setiap field terdokumentasi** di `metadata/data_dictionary.csv`
7. **Setiap sumber tercatat** di `metadata/source_provenance_log.csv`

---

## Cara Build Ulang Knowledge Base

```bash
# Persiapan (sekali saja)
python3 -m venv /home/nox/venv
/home/nox/venv/bin/pip install pandas openpyxl chromadb sentence-transformers

# Build semua
cd /home/nox/testing
/home/nox/venv/bin/python3 build_scripts/00_build_all.py
```

Script individual:
- `build_scripts/01_build_sqlite.py` — Build SQLite
- `build_scripts/02_build_chromadb.py` — Build ChromaDB documents
- `build_scripts/03_build_neo4j.py` — Build Neo4j CSVs
- `build_scripts/04_build_metadata.py` — Build data dictionary & report

---

## Komponen yang TIDAK Ada di Sini (Diimplementasikan Terpisah)

- ❌ Semantic Router
- ❌ LLM (Qwen, Gemma, Llama)
- ❌ FastAPI / Backend
- ❌ Conversation Memory
- ❌ Text-to-SQL Agent
- ❌ Chatbot UI
- ❌ Prompt Orchestration
- ❌ Caching Layer
