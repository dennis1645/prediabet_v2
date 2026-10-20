# Graph Knowledge Base Schema Documentation
# Source: knowledge_base/neo4j/
# Generated from: Primary_Dataset_Cleaned.xlsx + New_Ingredients_category.xlsx

## Node Types

### 1. Food
Represents individual food items from the primary nutrition dataset.

**Source:** `Primary_Dataset_Cleaned.xlsx`
**Node ID format:** `food_{id}` (e.g., `food_1`, `food_4375`)
**CSV file:** `nodes_food.csv`

| Property | Type | Description | Nullable |
|----------|------|-------------|---------|
| `food_id` | int | Original ID from source dataset | No |
| `kode` | string | Food code (e.g., A001) | Yes (6.49% missing) |
| `nama_makanan` | string | Food name in Indonesian | No |
| `kategori_umum` | string | General category (Mentah/Olahan/Restaurant/Kemasan) | Yes |
| `siap_konsumsi` | string | Ready to eat (0=no, 1=yes) | Yes (67.79% missing) |
| `kategori_spesifik` | string | Specific category (Nasi/Lauk/Snack/etc.) | Yes |
| `cara_olah` | string | Cooking method (Kukus/Rebus) | Yes (99.34% missing) |
| `porsi_g` | float | Serving size in grams | Yes |
| `kalori_kal` | float | Calories in kcal | Yes |
| `karbohidrat_g` | float | Carbohydrates in grams | Yes |
| `serat_g` | float | Dietary fiber in grams | Yes |
| `gula_g` | float | Sugar in grams | Yes |
| `protein_g` | float | Protein in grams | Yes |
| `lemak_g` | float | Fat in grams | Yes |
| `sodium_mg` | float | Sodium in mg | Yes |
| `glikemik_indeks` | float | Glycemic Index (actual, 98.4% missing) | Yes |
| `estimated_gi` | float | Estimated Glycemic Index (93.5% missing) | Yes |
| `net_karbo` | float | Net carbs (karbohidrat - serat) | Yes |
| `glikemik_risk` | string | Glycemic risk (low/moderate/high; 1 typo: "hifh") | Yes |
| `kategori_utama` | string | Main category | Yes |
| `familiar` | string | Familiarity level (Familiar/Tidak Familiar/none) | No |
| `source_dataset` | string | Provenance: "Primary_Dataset_Cleaned.xlsx" | No |

### 2. Recipe
Represents unique recipes (grouped from ingredient rows).

**Source:** `New_Ingredients_category.xlsx`
**Node ID format:** `recipe_00000` to `recipe_00452`
**CSV file:** `nodes_recipe.csv`

| Property | Type | Description | Nullable |
|----------|------|-------------|---------|
| `recipe_id` | string | Generated ID (recipe_NNNNN) | No |
| `kode` | string | Original recipe code | Yes (46.3% missing → empty string) |
| `nama_masakan` | string | Recipe name in Indonesian | No |
| `nama_asli_resep` | string | Original recipe name | No |
| `ingredient_count` | int | Number of ingredients in recipe | No |
| `source_dataset` | string | Provenance | No |

### 3. Ingredient
Represents unique ingredients (deduplicated by lowercase name).

**Source:** `New_Ingredients_category.xlsx`
**Node ID format:** `ingr_00000` to `ingr_00886`
**CSV file:** `nodes_ingredient.csv`

| Property | Type | Description | Nullable |
|----------|------|-------------|---------|
| `ingredient_id` | string | Generated ID | No |
| `nama_bahan` | string | Ingredient name (original case) | No |
| `source_dataset` | string | Provenance | No |

> ⚠️ **Note on allergens:** Ingredients are listed but there is NO formal allergen ontology in the source data.
> Do NOT infer allergen relationships from ingredient names alone.
> Status: **NOT_SUPPORTED_BY_SOURCE_DATA**

### 4. Category
Represents food/ingredient categories from both datasets.

**Source:** Both datasets
**Node ID format:** `cat_00000` to `cat_00185`
**CSV file:** `nodes_category.csv`

| Property | Type | Description |
|----------|------|-------------|
| `category_id` | string | Generated ID |
| `nama_kategori` | string | Category name |
| `jenis_kategori` | string | Type: `kategori_umum`, `kategori_utama`, `kategori_spesifik`, `ingredient_kategori` |
| `source_dataset` | string | Provenance |

---

## Relationship Types

### 1. CONTAINS
**Meaning:** Recipe contains this ingredient
**From:** Recipe → **To:** Ingredient
**CSV file:** `rels_contains.csv`
**Total:** 2,760 relationships

| Property | Description |
|----------|-------------|
| `jumlah` | Quantity (float, empty if unknown) |
| `satuan` | Unit (URT - Ukuran Rumah Tangga, e.g., sdm, sdt, buah) |

### 2. HAS_INGREDIENT_CATEGORY
**Meaning:** Recipe has at least one ingredient belonging to this category
**From:** Recipe → **To:** Category (ingredient_kategori type only)
**CSV file:** `rels_recipe_ingredient_category.csv`
**Total:** 1,722 relationships

### 3. BELONGS_TO
**Meaning:** Food item belongs to this category
**From:** Food → **To:** Category
**CSV file:** `rels_food_category.csv`
**Total:** 13,113 relationships

| Property | Description |
|----------|-------------|
| `kategori_type` | Which category field: `kategori_umum`, `kategori_utama`, or `kategori_spesifik` |

---

## Graph Statistics
| Entity | Count |
|--------|-------|
| Food nodes | 4,375 |
| Recipe nodes | 453 |
| Ingredient nodes | 887 |
| Category nodes | 186 |
| **Total Nodes** | **5,901** |
| CONTAINS rels | 2,760 |
| HAS_INGREDIENT_CATEGORY rels | 1,722 |
| BELONGS_TO rels | 13,113 |
| **Total Relationships** | **17,595** |

---

## Neo4j Import Instructions

### Using Neo4j Admin Import (Bulk)
```bash
neo4j-admin database import full \
  --nodes=Food=nodes_food.csv \
  --nodes=Recipe=nodes_recipe.csv \
  --nodes=Ingredient=nodes_ingredient.csv \
  --nodes=Category=nodes_category.csv \
  --relationships=CONTAINS=rels_contains.csv \
  --relationships=HAS_INGREDIENT_CATEGORY=rels_recipe_ingredient_category.csv \
  --relationships=BELONGS_TO=rels_food_category.csv \
  --delimiter=',' \
  --database=nutrition_kb
```

### Using Cypher (Row by Row — for smaller datasets)
```cypher
-- Load Food nodes
LOAD CSV WITH HEADERS FROM 'file:///nodes_food.csv' AS row
CREATE (:Food {
  food_id: toInteger(row.`food_id:int`),
  nama_makanan: row.nama_makanan,
  kalori_kal: CASE WHEN row.`kalori_kal:float` = '' THEN null ELSE toFloat(row.`kalori_kal:float`) END,
  glikemik_risk: CASE WHEN row.glikemik_risk = '' THEN null ELSE row.glikemik_risk END,
  sodium_mg: CASE WHEN row.`sodium_mg:float` = '' THEN null ELSE toFloat(row.`sodium_mg:float`) END
});

-- Load Recipe nodes
LOAD CSV WITH HEADERS FROM 'file:///nodes_recipe.csv' AS row
CREATE (:Recipe {
  recipe_id: row.recipe_id,
  nama_masakan: row.nama_masakan,
  nama_asli_resep: row.nama_asli_resep
});

-- Load CONTAINS relationships
LOAD CSV WITH HEADERS FROM 'file:///rels_contains.csv' AS row
MATCH (r:Recipe {recipe_id: row.`:START_ID`})
MATCH (i:Ingredient {ingredient_id: row.`:END_ID`})
CREATE (r)-[:CONTAINS {
  jumlah: CASE WHEN row.jumlah = '' THEN null ELSE toFloat(row.jumlah) END,
  satuan: CASE WHEN row.satuan = '' THEN null ELSE row.satuan END
}]->(i);
```

### Example Cypher Queries
```cypher
-- Find all ingredients of a recipe
MATCH (r:Recipe {nama_masakan: 'Rendang'})-[:CONTAINS]->(i:Ingredient)
RETURN r.nama_masakan, i.nama_bahan;

-- Find recipes containing a specific ingredient
MATCH (r:Recipe)-[:CONTAINS]->(i:Ingredient)
WHERE toLower(i.nama_bahan) CONTAINS 'tempe'
RETURN r.nama_masakan, r.nama_asli_resep;

-- Find high-GI foods by category
MATCH (f:Food)-[:BELONGS_TO]->(c:Category)
WHERE f.glikemik_risk = 'high'
RETURN f.nama_makanan, f.glikemik_risk, f.glikemik_indeks, c.nama_kategori
LIMIT 20;

-- Find foods with sodium data (for hypertension management)
MATCH (f:Food)
WHERE f.sodium_mg IS NOT NULL
RETURN f.nama_makanan, f.sodium_mg
ORDER BY toFloat(f.sodium_mg) DESC
LIMIT 20;
```

---

## Important Notes

### Medical Relationships NOT Created
The following relationships were explicitly NOT created because they are NOT supported by the source datasets:
- `Food -[TREATS]-> Disease`
- `Food -[PREVENTS]-> Disease`
- `Food -[SAFE_FOR]-> PatientType`
- `Ingredient -[CAUSES_ALLERGY]-> Allergen`

These would require separately provided, authoritative clinical data sources.

### Data Quality Notes
- `glikemik_risk` field: 1 typo "hifh" preserved as-is (documented)
- Empty strings in CSV = NULL values (Neo4j should convert to null)
- `kode` in Recipe nodes: empty string when source kode was NULL
