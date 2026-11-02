-- ====================================================================
-- PrediaBeat Knowledge Base v3 — Database Schema (SQLite)
-- Normalised Relational Model for Indonesian Diabetes Clinical Nutrition
-- ====================================================================

-- 1. Source Provenance Table
CREATE TABLE IF NOT EXISTS sumber (
    sumber_id TEXT PRIMARY KEY,
    nama_sumber TEXT NOT NULL,
    jenis_sumber TEXT,
    url TEXT,
    tingkat_kepercayaan TEXT,
    keterangan TEXT
);

-- 2. Master Food Nutrition Items (per 100g, official TKPI/Kemenkes/Nutrinusa)
CREATE TABLE IF NOT EXISTS food_items (
    id_prediabeat TEXT PRIMARY KEY,
    sumber_id TEXT,
    kondisi_bahan TEXT,
    nama_kanonik TEXT NOT NULL,
    nama_asli TEXT NOT NULL,
    energi_kal REAL,
    protein_g REAL,
    lemak_g REAL,
    karbohidrat_g REAL,
    serat_g REAL,
    abu_g REAL,
    kalsium_mg REAL,
    besi_mg REAL,
    natrium_mg REAL,
    kalium_mg REAL,
    tembaga_mg REAL,
    seng_mg REAL,
    vit_c_mg REAL,
    bdd_persen INTEGER,
    temp_urt_string TEXT,
    glikemik_risk TEXT,
    FOREIGN KEY (sumber_id) REFERENCES sumber(sumber_id)
);

-- 3. Canonical Master Ingredients
CREATE TABLE IF NOT EXISTS master_bahan (
    bahan_id TEXT PRIMARY KEY,
    nama_kanonik TEXT NOT NULL,
    sumber TEXT,
    status_review TEXT
);

-- 4. User Synonym / Alias Mapping for NLP and Spelling Normalization
CREATE TABLE IF NOT EXISTS alias_bahan (
    alias_id TEXT PRIMARY KEY,
    bahan_id TEXT NOT NULL,
    nama_tertulis TEXT NOT NULL,
    FOREIGN KEY (bahan_id) REFERENCES master_bahan(bahan_id)
);

-- 5. Ingredient Categories & M:N Mapping
CREATE TABLE IF NOT EXISTS kategori (
    kategori_id TEXT PRIMARY KEY,
    nama_kategori TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bahan_kategori (
    bahan_id TEXT NOT NULL,
    kategori_id TEXT NOT NULL,
    PRIMARY KEY (bahan_id, kategori_id),
    FOREIGN KEY (bahan_id) REFERENCES master_bahan(bahan_id),
    FOREIGN KEY (kategori_id) REFERENCES kategori(kategori_id)
);

-- 6. Indonesian Recipes with Clinical Profile
CREATE TABLE IF NOT EXISTS resep (
    resep_id TEXT PRIMARY KEY,
    sumber_id TEXT,
    kode_sumber TEXT,
    nama_resep TEXT NOT NULL,
    nama_asli_sumber TEXT,
    nama_resep_clean TEXT NOT NULL,
    id_prediabeat_fk TEXT,
    glikemik_risk TEXT,
    sodium_level TEXT,
    safe_for_prediabetes INTEGER,
    FOREIGN KEY (sumber_id) REFERENCES sumber(sumber_id),
    FOREIGN KEY (id_prediabeat_fk) REFERENCES food_items(id_prediabeat)
);

-- 7. Recipe Ingredients Composition (Measurements & Household Units)
CREATE TABLE IF NOT EXISTS resep_bahan (
    resep_bahan_id TEXT PRIMARY KEY,
    resep_id TEXT NOT NULL,
    bahan_id TEXT NOT NULL,
    jumlah REAL,
    satuan TEXT,
    gram_estimasi REAL,
    FOREIGN KEY (resep_id) REFERENCES resep(resep_id),
    FOREIGN KEY (bahan_id) REFERENCES master_bahan(bahan_id)
);

-- 8. Household Portion Unit Conversion (URT to Grams)
CREATE TABLE IF NOT EXISTS konversi_satuan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bahan_id TEXT NOT NULL,
    sumber_id TEXT,
    kode_sumber TEXT,
    nama_kanonik TEXT,
    satuan TEXT NOT NULL,
    gram_per_unit REAL,
    sumber_rujukan TEXT,
    status TEXT,
    FOREIGN KEY (bahan_id) REFERENCES master_bahan(bahan_id)
);

-- 9. Clinical Dietary Contraindications & Comorbidity Rules
CREATE TABLE IF NOT EXISTS pantangan (
    pantangan_id TEXT PRIMARY KEY,
    kategori TEXT NOT NULL,
    tingkat_pembatasan TEXT NOT NULL,
    komorbid_terkait TEXT NOT NULL,
    contoh_makanan TEXT,
    alasan_klinis TEXT NOT NULL,
    sumber_referensi TEXT,
    url_sumber TEXT
);

-- 10. Direct Mapping between Contraindications and Food/Ingredient Items
CREATE TABLE IF NOT EXISTS pantangan_item_mapping (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pantangan_id TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    target_name TEXT,
    tingkat_pembatasan TEXT,
    FOREIGN KEY (pantangan_id) REFERENCES pantangan(pantangan_id)
);
