# Data Quality Report
Generated: 2026-09-10 10:38:20

## Dataset A: Primary_Dataset_Cleaned.xlsx (→ SQLite)

### Basic Statistics
- **Total rows:** 4,375
- **Total columns:** 42
- **Duplicate rows:** 0

### Missing Values per Column
  - `id`: 0 missing (0.0%)
  - `kode`: 284 missing (6.49%)
  - `Nama Makanan`: 0 missing (0.0%)
  - `kategori_umum`: 1 missing (0.02%)
  - `siap_konsumsi`: 2966 missing (67.79%)
  - `kategori_spesifik`: 10 missing (0.23%)
  - `cara_olah`: 4346 missing (99.34%)
  - `porsi_g`: 1 missing (0.02%)
  - `kalori_kal`: 8 missing (0.18%)
  - `karbohidrat_g`: 8 missing (0.18%)
  - `serat_g`: 259 missing (5.92%)
  - `gula_g`: 1071 missing (24.48%)
  - `starch_g`: 1759 missing (40.21%)
  - `protein_g`: 4 missing (0.09%)
  - `lemak_g`: 3 missing (0.07%)
  - `lemak_jenuh_g`: 1033 missing (23.61%)
  - `lemak_trans_g`: 1432 missing (32.73%)
  - `(MUFA+PUFA)_lemak_tak_jenuh_g`: 4088 missing (93.44%)
  - `lemak_tak_jenuh_tunggal_g(MUFA)`: 1330 missing (30.4%)
  - `lemak_tak_jenuh_ganda_g(PUFA)`: 1330 missing (30.4%)
  - `air_g`: 990 missing (22.63%)
  - `abu_g`: 912 missing (20.85%)
  - `sodium_mg`: 557 missing (12.73%)
  - `glikemik_indeks`: 4304 missing (98.38%)
  - `estimated_glikemik_indeks`: 4091 missing (93.51%)
  - `net_karbo`: 331 missing (7.57%)
  - `zinc_mg`: 615 missing (14.06%)
  - `glikemik_risk`: 1640 missing (37.49%)
  - `kategori_utama`: 1 missing (0.02%)
  - `familiar?`: 0 missing (0.0%)
  - `kategori_daging`: 3727 missing (85.19%)
  - `lauk_nabati`: 0 missing (0.0%)
  - `lauk_hewani`: 0 missing (0.0%)
  - `seafood`: 0 missing (0.0%)
  - `bumbu`: 0 missing (0.0%)
  - `snack`: 0 missing (0.0%)
  - `dessert`: 0 missing (0.0%)
  - `dairy`: 0 missing (0.0%)
  - `bahan-mentah`: 0 missing (0.0%)
  - `minuman`: 0 missing (0.0%)
  - `buah`: 0 missing (0.0%)
  - `ultraproses_kemasan`: 0 missing (0.0%)

### Data Quality Issues Found
1. **Typo in `glikemik_risk`:** 1 row contains value `"hifh"` (likely typo of `"high"`)
   - **Action:** Preserved as-is, documented
   - **Reason:** Cannot modify source data without explicit authorization
   
2. **Column `cara_olah`:** 99.34% missing (4,346 of 4,375 rows)
   - Only values: `Kukus`, `Rebus`
   - **Action:** Preserved as-is with NULL for missing
   
3. **Column `glikemik_indeks`:** 98.38% missing (4,304 of 4,375 rows)
   - Only 71 rows have actual measured GI
   - **Action:** Preserved as NULL; use `estimated_glikemik_indeks` when `glikemik_indeks` is NULL
   
4. **Column `(MUFA+PUFA)_lemak_tak_jenuh_g`:** Column name contains brackets — incompatible with standard SQL
   - **Action:** Renamed to `mufa_pufa_lemak_tak_jenuh_g` in SQLite
   
5. **Column `siap_konsumsi`:** 67.79% missing — numeric float (0.0/1.0)
   - **Action:** Preserved as NULL when missing
   
6. **Column `kategori_daging`:** 85.19% missing
   - **Action:** Preserved as NULL when missing

### Transformations Applied (Primary Dataset)
| Original Column | Transformed Field | Reason |
|----------------|------------------|--------|
| `(MUFA+PUFA)_lemak_tak_jenuh_g` | `mufa_pufa_lemak_tak_jenuh_g` | SQL-incompatible brackets |
| `lemak_tak_jenuh_tunggal_g(MUFA)` | `lemak_tak_jenuh_tunggal_g_MUFA` | SQL-incompatible brackets |
| `lemak_tak_jenuh_ganda_g(PUFA)` | `lemak_tak_jenuh_ganda_g_PUFA` | SQL-incompatible brackets |
| `bahan-mentah` | `bahan_mentah` | SQL-incompatible hyphen |
| `familiar?` | `familiar` | SQL-incompatible question mark |
| NaN | NULL | Standard null preservation (NEVER converted to 0) |

---

## Dataset B: New_Ingredients_category.xlsx (→ ChromaDB + Neo4j)

### Basic Statistics
- **Total rows:** 2,760
- **Total columns:** 7
- **Duplicate rows:** 80

### Missing Values per Column
  - `kode`: 1277 missing (46.27%)
  - `nama_masakan`: 0 missing (0.0%)
  - `nama_asli_resep`: 0 missing (0.0%)
  - `bahan_bahan`: 0 missing (0.0%)
  - `jumlah_satuan_float`: 222 missing (8.04%)
  - `satuan_urt_clean`: 1366 missing (49.49%)
  - `kategori`: 464 missing (16.81%)

### Data Quality Issues Found
1. **Column `kode`:** 46.3% missing (1,277 rows)
   - **Action:** Used `nama_masakan` as fallback recipe identifier: `NOCODE_{nama_masakan}`
   
2. **Column `satuan_urt_clean`:** 49.49% missing (1,366 rows)
   - **Action:** Omitted from ingredient text when missing; still possible to list ingredient name
   
3. **Column `kategori`:** 16.81% missing (464 rows)
   - **Action:** Empty list used when missing; omitted from document text and metadata
   
4. **Column `kategori` format:** Stored as Python list string e.g. `"['Sayur', 'Bumbu Rempah']"`
   - **Action:** Parsed using `ast.literal_eval()`
   
5. **Duplicate rows:** 80 duplicate rows found
   - **Action:** De-duplication occurs naturally during recipe grouping (ingredients grouped per recipe)
   - **No data loss** — all unique ingredient-recipe combinations preserved

### Transformations Applied (Ingredients Dataset)
| Operation | Description |
|-----------|-------------|
| Grouping | Rows grouped by `kode` (or `nama_masakan` fallback) to form recipe-level documents |
| kategori parsing | Python list strings parsed to actual lists using `ast.literal_eval()` |
| Ingredient text formatting | `{jumlah} {satuan} {nama_bahan}` — omits missing fields |
| ChromaDB NULL handling | NULL values stored as empty strings (ChromaDB metadata cannot be None) |

---

## Allergy Metadata Assessment

> **Status: NOT_SUPPORTED_BY_SOURCE_DATA**

The `New_Ingredients_category.xlsx` dataset contains ingredient names (e.g., "udang", "kacang tanah", "susu") but does **NOT** contain:
- A formal allergen ontology
- Allergen labels (shellfish, nuts, dairy, gluten, etc.)
- Any explicit allergen-to-ingredient mapping

**Therefore:**
- No allergen database was created
- No `allergen`, `allergy_safe`, `gluten_free`, or similar metadata was added to ChromaDB
- Allergen information must be input manually by the user (as planned in system design)

**If allergen support is needed in the future:**
- A controlled allergen ontology must be provided (e.g., FDA/BPOM food allergen list)
- Ingredient-to-allergen mapping table must be explicitly defined
- Only then can allergen metadata be reliably added

---

## Summary of Knowledge Bases Created

| Component | Source | Records | Status |
|-----------|--------|---------|--------|
| SQLite (nutrition.db) | Primary_Dataset_Cleaned.xlsx | 4,375 rows | ✅ Complete |
| ChromaDB (recipe docs) | New_Ingredients_category.xlsx | See recipe count | ✅ JSON ready, ChromaDB on import |
| Neo4j (graph CSVs) | Both datasets | See node/rel counts | ✅ CSV files ready |
| Medical Guidelines | PERKENI, Kemenkes, IDAI | 11 sections | ✅ Markdown ready |
| Data Dictionary | - | 60 entries | ✅ Complete |
| Source Provenance Log | - | 9 entries | ✅ Complete |

---

## Data Integrity Validation Checklist

- [x] Original Excel files were NOT modified
- [x] No missing values were fabricated (NaN → NULL)
- [x] No nutritional values were estimated or imputed
- [x] No unsupported medical claims introduced (TREATS, PREVENTS, SAFE_FOR relationships NOT created)
- [x] No unsupported allergy relationships created (NOT_SUPPORTED_BY_SOURCE_DATA)
- [x] Every derived field documented in data_dictionary.csv
- [x] Typo in glikemik_risk documented and preserved
- [x] Column renames for SQL compatibility documented
- [x] Allergy assessment documented explicitly

---

## Source Citations
All medical and dietary information in `diabetes_nutrition_guidelines.md` is traceable to:
1. PERKENI (2021) – pbperkeni.or.id
2. Kemenkes RI – kemkes.go.id
3. IDAI – idai.or.id
4. International GI Database – glycemicindex.com (for GI reference table only)

See `source_provenance_log.csv` for complete provenance records.
