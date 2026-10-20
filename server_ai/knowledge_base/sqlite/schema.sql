-- ============================================================
-- nutrition.db Schema
-- Source: (XLSX)Primary_Dataset_Cleaned.xlsx
-- Generated: auto
-- Note: NaN values are preserved as NULL (never as 0)
-- Note: 'hifh' typo in glikemik_risk is preserved (1 row), documented
-- ============================================================

CREATE TABLE IF NOT EXISTS nutrition (
    id                                INTEGER PRIMARY KEY,
    kode                              TEXT,           -- NULLABLE (6.49% missing)
    nama_makanan                      TEXT NOT NULL,  -- Normalized from "Nama Makanan"
    kategori_umum                     TEXT,           -- NULLABLE (0.02% missing)
    siap_konsumsi                     REAL,           -- NULLABLE (67.79% missing); 0=tidak, 1=ya
    kategori_spesifik                 TEXT,           -- NULLABLE (0.23% missing)
    cara_olah                         TEXT,           -- NULLABLE (99.34% missing); values: Kukus, Rebus
    porsi_g                           REAL,           -- NULLABLE (0.02% missing)
    kalori_kal                        REAL,           -- NULLABLE (0.18% missing)
    karbohidrat_g                     REAL,           -- NULLABLE (0.18% missing)
    serat_g                           REAL,           -- NULLABLE (5.92% missing)
    gula_g                            REAL,           -- NULLABLE (24.48% missing)
    starch_g                          REAL,           -- NULLABLE (40.21% missing)
    protein_g                         REAL,           -- NULLABLE (0.09% missing)
    lemak_g                           REAL,           -- NULLABLE (0.07% missing)
    lemak_jenuh_g                     REAL,           -- NULLABLE (23.61% missing)
    lemak_trans_g                     REAL,           -- NULLABLE (32.73% missing)
    mufa_pufa_lemak_tak_jenuh_g       REAL,           -- NULLABLE (93.44% missing); original col: (MUFA+PUFA)_lemak_tak_jenuh_g
    lemak_tak_jenuh_tunggal_g_mufa    REAL,           -- NULLABLE (30.4% missing)
    lemak_tak_jenuh_ganda_g_pufa      REAL,           -- NULLABLE (30.4% missing)
    air_g                             REAL,           -- NULLABLE (22.63% missing)
    abu_g                             REAL,           -- NULLABLE (20.85% missing)
    sodium_mg                         REAL,           -- NULLABLE (12.73% missing)
    glikemik_indeks                   REAL,           -- NULLABLE (98.38% missing)
    estimated_glikemik_indeks         REAL,           -- NULLABLE (93.51% missing)
    net_karbo                         REAL,           -- NULLABLE (7.57% missing)
    zinc_mg                           REAL,           -- NULLABLE (14.06% missing)
    glikemik_risk                     TEXT,           -- NULLABLE (37.49% missing); values: low, moderate, high; NOTE: 1 typo 'hifh' preserved as-is
    kategori_utama                    TEXT,           -- NULLABLE (0.02% missing)
    familiar                          TEXT,           -- original col: familiar?; values: Familiar, Tidak Familiar, none
    kategori_daging                   TEXT,           -- NULLABLE (85.19% missing)
    lauk_nabati                       INTEGER,        -- binary flag 0/1
    lauk_hewani                       INTEGER,        -- binary flag 0/1
    seafood                           INTEGER,        -- binary flag 0/1
    bumbu                             INTEGER,        -- binary flag 0/1
    snack                             INTEGER,        -- binary flag 0/1
    dessert                           INTEGER,        -- binary flag 0/1
    dairy                             INTEGER,        -- binary flag 0/1
    bahan_mentah                      INTEGER,        -- binary flag 0/1; original col: bahan-mentah
    minuman                           INTEGER,        -- binary flag 0/1
    buah                              INTEGER,        -- binary flag 0/1
    ultraproses_kemasan               INTEGER         -- binary flag 0/1
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_id ON nutrition(id);
CREATE INDEX IF NOT EXISTS idx_kode ON nutrition(kode);
CREATE INDEX IF NOT EXISTS idx_nama ON nutrition(nama_makanan);
CREATE INDEX IF NOT EXISTS idx_kategori_umum ON nutrition(kategori_umum);
CREATE INDEX IF NOT EXISTS idx_kategori_spesifik ON nutrition(kategori_spesifik);
CREATE INDEX IF NOT EXISTS idx_glikemik_risk ON nutrition(glikemik_risk);
CREATE INDEX IF NOT EXISTS idx_kategori_utama ON nutrition(kategori_utama);

-- ============================================================
-- Example Queries
-- ============================================================

-- 1. Find food by name
-- SELECT * FROM nutrition WHERE nama_makanan LIKE '%nasi%';

-- 2. Find foods with glycemic risk = high
-- SELECT id, nama_makanan, glikemik_risk, glikemik_indeks, kalori_kal
--   FROM nutrition WHERE glikemik_risk = 'high';

-- 3. Find foods with sodium info for hypertension management
-- SELECT id, nama_makanan, sodium_mg, kategori_utama
--   FROM nutrition WHERE sodium_mg IS NOT NULL ORDER BY sodium_mg DESC;

-- 4. Find low-GI foods
-- SELECT id, nama_makanan, glikemik_indeks, estimated_glikemik_indeks
--   FROM nutrition WHERE glikemik_indeks <= 55 OR estimated_glikemik_indeks <= 55;
