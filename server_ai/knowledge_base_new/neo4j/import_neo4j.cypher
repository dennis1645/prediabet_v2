// ====================================================================
// PrediaBeat Neo4j Knowledge Graph Ingestion Script
// Version 3.0 — Hybrid RAG & Knowledge Graph Engine
// ====================================================================

// 1. Constraints and Unique Indexes
CREATE CONSTRAINT unique_food_id IF NOT EXISTS FOR (f:FoodItem) REQUIRE f.id IS UNIQUE;
CREATE CONSTRAINT unique_recipe_id IF NOT EXISTS FOR (r:Recipe) REQUIRE r.id IS UNIQUE;
CREATE CONSTRAINT unique_ingredient_id IF NOT EXISTS FOR (i:Ingredient) REQUIRE i.id IS UNIQUE;
CREATE CONSTRAINT unique_category_id IF NOT EXISTS FOR (c:Category) REQUIRE c.id IS UNIQUE;
CREATE CONSTRAINT unique_alias_id IF NOT EXISTS FOR (a:Alias) REQUIRE a.id IS UNIQUE;
CREATE CONSTRAINT unique_comorbid_name IF NOT EXISTS FOR (cm:Comorbid) REQUIRE cm.name IS UNIQUE;
CREATE CONSTRAINT unique_contra_id IF NOT EXISTS FOR (ct:Contraindication) REQUIRE ct.id IS UNIQUE;
CREATE CONSTRAINT unique_unit_name IF NOT EXISTS FOR (u:Unit) REQUIRE u.satuan IS UNIQUE;

CREATE INDEX idx_recipe_name IF NOT EXISTS FOR (r:Recipe) ON (r.nama_resep_clean);
CREATE INDEX idx_food_name IF NOT EXISTS FOR (f:FoodItem) ON (f.nama_kanonik);
CREATE INDEX idx_alias_text IF NOT EXISTS FOR (a:Alias) ON (a.nama_tertulis);
CREATE INDEX idx_ingredient_name IF NOT EXISTS FOR (i:Ingredient) ON (i.nama_kanonik);

// 2. Load Nodes
LOAD CSV WITH HEADERS FROM 'file:///nodes_food.csv' AS row
MERGE (f:FoodItem {id: row.`id:ID(FoodItem)`})
SET f.nama_kanonik = row.nama_kanonik,
    f.nama_asli = row.nama_asli,
    f.energi_kal = toFloat(row.`energi_kal:float`),
    f.protein_g = toFloat(row.`protein_g:float`),
    f.lemak_g = toFloat(row.`lemak_g:float`),
    f.karbohidrat_g = toFloat(row.`karbohidrat_g:float`),
    f.serat_g = toFloat(row.`serat_g:float`),
    f.natrium_mg = toFloat(row.`natrium_mg:float`),
    f.kalium_mg = toFloat(row.`kalium_mg:float`),
    f.bdd_persen = toInteger(row.`bdd_persen:int`),
    f.glikemik_risk = row.glikemik_risk;

LOAD CSV WITH HEADERS FROM 'file:///nodes_recipe.csv' AS row
MERGE (r:Recipe {id: row.`id:ID(Recipe)`})
SET r.nama_resep = row.nama_resep,
    r.nama_resep_clean = row.nama_resep_clean,
    r.energi_kal = toFloat(row.`energi_kal:float`),
    r.protein_g = toFloat(row.`protein_g:float`),
    r.lemak_g = toFloat(row.`lemak_g:float`),
    r.karbohidrat_g = toFloat(row.`karbohidrat_g:float`),
    r.serat_g = toFloat(row.`serat_g:float`),
    r.natrium_mg = toFloat(row.`natrium_mg:float`),
    r.glikemik_risk = row.glikemik_risk,
    r.sodium_level = row.sodium_level,
    r.safe_for_prediabetes = toBoolean(row.`safe_for_prediabetes:boolean`);

LOAD CSV WITH HEADERS FROM 'file:///nodes_ingredient.csv' AS row
MERGE (i:Ingredient {id: row.`id:ID(Ingredient)`})
SET i.nama_kanonik = row.nama_kanonik,
    i.status_review = row.status_review;

LOAD CSV WITH HEADERS FROM 'file:///nodes_category.csv' AS row
MERGE (c:Category {id: row.`id:ID(Category)`})
SET c.nama_kategori = row.nama_kategori;

LOAD CSV WITH HEADERS FROM 'file:///nodes_alias.csv' AS row
MERGE (a:Alias {id: row.`id:ID(Alias)`})
SET a.nama_tertulis = row.nama_tertulis;

LOAD CSV WITH HEADERS FROM 'file:///nodes_comorbid.csv' AS row
MERGE (cm:Comorbid {name: row.`name:ID(Comorbid)`})
SET cm.nama = row.nama;

LOAD CSV WITH HEADERS FROM 'file:///nodes_contraindication.csv' AS row
MERGE (ct:Contraindication {id: row.`id:ID(Contraindication)`})
SET ct.kategori = row.kategori,
    ct.tingkat_pembatasan = row.tingkat_pembatasan,
    ct.alasan_klinis = row.alasan_klinis,
    ct.sumber_referensi = row.sumber_referensi;

LOAD CSV WITH HEADERS FROM 'file:///nodes_unit.csv' AS row
MERGE (u:Unit {satuan: row.`satuan:ID(Unit)`})
SET u.nama = row.nama;

// 3. Load Relationships
LOAD CSV WITH HEADERS FROM 'file:///rels_recipe_food.csv' AS row
MATCH (r:Recipe {id: row.`:START_ID(Recipe)`})
MATCH (f:FoodItem {id: row.`:END_ID(FoodItem)`})
MERGE (r)-[:LINKED_TO_FOOD]->(f);

LOAD CSV WITH HEADERS FROM 'file:///rels_recipe_contains_ingredient.csv' AS row
MATCH (r:Recipe {id: row.`:START_ID(Recipe)`})
MATCH (i:Ingredient {id: row.`:END_ID(Ingredient)`})
MERGE (r)-[rel:CONTAINS_INGREDIENT]->(i)
SET rel.jumlah = toFloat(row.`jumlah:float`),
    rel.satuan = row.satuan,
    rel.gram_estimasi = toFloat(row.`gram_estimasi:float`);

LOAD CSV WITH HEADERS FROM 'file:///rels_ingredient_category.csv' AS row
MATCH (i:Ingredient {id: row.`:START_ID(Ingredient)`})
MATCH (c:Category {id: row.`:END_ID(Category)`})
MERGE (i)-[:BELONGS_TO_CATEGORY]->(c);

LOAD CSV WITH HEADERS FROM 'file:///rels_ingredient_alias.csv' AS row
MATCH (i:Ingredient {id: row.`:START_ID(Ingredient)`})
MATCH (a:Alias {id: row.`:END_ID(Alias)`})
MERGE (i)-[:HAS_ALIAS]->(a);

LOAD CSV WITH HEADERS FROM 'file:///rels_ingredient_conversion.csv' AS row
MATCH (i:Ingredient {id: row.`:START_ID(Ingredient)`})
MATCH (u:Unit {satuan: row.`:END_ID(Unit)`})
MERGE (i)-[rel:HAS_CONVERSION]->(u)
SET rel.gram_per_unit = toFloat(row.`gram_per_unit:float`),
    rel.status = row.status;

LOAD CSV WITH HEADERS FROM 'file:///rels_contraindication_comorbid.csv' AS row
MATCH (ct:Contraindication {id: row.`:START_ID(Contraindication)`})
MATCH (cm:Comorbid {name: row.`:END_ID(Comorbid)`})
MERGE (ct)-[:TARGETS_COMORBID]->(cm);

LOAD CSV WITH HEADERS FROM 'file:///rels_contraindication_food.csv' AS row
MATCH (ct:Contraindication {id: row.`:START_ID(Contraindication)`})
MATCH (f:FoodItem {id: row.`:END_ID(FoodItem)`})
MERGE (ct)-[rel:RESTRICTS_FOOD]->(f)
SET rel.tingkat_pembatasan = row.tingkat_pembatasan;

LOAD CSV WITH HEADERS FROM 'file:///rels_contraindication_ingredient.csv' AS row
MATCH (ct:Contraindication {id: row.`:START_ID(Contraindication)`})
MATCH (i:Ingredient {id: row.`:END_ID(Ingredient)`})
MERGE (ct)-[rel:RESTRICTS_INGREDIENT]->(i)
SET rel.tingkat_pembatasan = row.tingkat_pembatasan;
