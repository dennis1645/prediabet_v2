# Neo4j Graph Schema Specification — PrediaBeat Knowledge Base v3

## 1. Node Labels & Properties

| Node Label | Key Property | Main Properties | Description |
| :--- | :--- | :--- | :--- |
| `(:FoodItem)` | `id` | `nama_kanonik, nama_asli, energi_kal, protein_g, lemak_g, karbohidrat_g, serat_g, natrium_mg, kalium_mg, bdd_persen, glikemik_risk` | Official Indonesian food item nutritional density per 100g. |
| `(:Recipe)` | `id` | `nama_resep, nama_resep_clean, energi_kal, protein_g, lemak_g, karbohidrat_g, serat_g, natrium_mg, glikemik_risk, sodium_level, safe_for_prediabetes` | Composite Indonesian recipe dish. |
| `(:Ingredient)` | `id` | `nama_kanonik, status_review` | Canonical cooking ingredient. |
| `(:Category)` | `id` | `nama_kategori` | Food/ingredient group classification. |
| `(:Alias)` | `id` | `nama_tertulis` | Natural query term / colloquial synonym. |
| `(:Unit)` | `satuan` | `nama` | Household portion unit (sdt, sdm, porsi, butir, dsb.). |
| `(:Contraindication)` | `id` | `kategori, tingkat_pembatasan, alasan_klinis, sumber_referensi` | Clinical dietary restriction rule. |
| `(:Comorbid)` | `name` | `nama` | Clinical comorbidity condition (Prediabetes, Hipertensi, Obesitas, MASLD, PGK, dsb.). |

---

## 2. Relationships

| Relationship | Start Node | End Node | Properties |
| :--- | :--- | :--- | :--- |
| `[:LINKED_TO_FOOD]` | `(:Recipe)` | `(:FoodItem)` | - |
| `[:CONTAINS_INGREDIENT]` | `(:Recipe)` | `(:Ingredient)` | `jumlah, satuan, gram_estimasi` |
| `[:BELONGS_TO_CATEGORY]` | `(:Ingredient)` | `(:Category)` | - |
| `[:HAS_ALIAS]` | `(:Ingredient)` | `(:Alias)` | - |
| `[:HAS_CONVERSION]` | `(:Ingredient)` | `(:Unit)` | `gram_per_unit, status` |
| `[:TARGETS_COMORBID]` | `(:Contraindication)` | `(:Comorbid)` | - |
| `[:RESTRICTS_FOOD]` | `(:Contraindication)` | `(:FoodItem)` | `tingkat_pembatasan` |
| `[:RESTRICTS_INGREDIENT]` | `(:Contraindication)` | `(:Ingredient)` | `tingkat_pembatasan` |

---

## 3. Example Clinical Cypher Queries for Dr. Predi AI

### A. Rekomendasi Menu Aman untuk Prediabetes Komorbid Hipertensi
```cypher
MATCH (r:Recipe)
WHERE r.safe_for_prediabetes = true
  AND r.sodium_level IN ['rendah', 'sedang']
  AND NOT EXISTS {
      MATCH (ct:Contraindication)-[:TARGETS_COMORBID]->(cm:Comorbid {name: 'Hipertensi'})
      MATCH (ct)-[:RESTRICTS_INGREDIENT]->(i:Ingredient)<-[:CONTAINS_INGREDIENT]-(r)
      WHERE ct.tingkat_pembatasan = 'hindari_total'
  }
RETURN r.id, r.nama_resep, r.energi_kal, r.protein_g, r.karbohidrat_g, r.serat_g, r.natrium_mg
ORDER BY r.serat_g DESC, r.natrium_mg ASC
LIMIT 5;
```

### B. Pencarian Bahan Kanonik dari Alias Pengguna
```cypher
MATCH (a:Alias)
WHERE toLower(a.nama_tertulis) CONTAINS 'bawang putih'
MATCH (i:Ingredient)-[:HAS_ALIAS]->(a)
OPTIONAL MATCH (i)-[c:HAS_CONVERSION]->(u:Unit)
RETURN i.id, i.nama_kanonik, collect(u.satuan + ' (' + toString(c.gram_per_unit) + 'g)') AS konversi_satuan;
```

### C. Analisis Pantangan Makanan Tertentu
```cypher
MATCH (f:FoodItem)
WHERE toLower(f.nama_kanonik) CONTAINS 'es teh'
MATCH (ct:Contraindication)-[rel:RESTRICTS_FOOD]->(f)
MATCH (ct)-[:TARGETS_COMORBID]->(cm:Comorbid)
RETURN f.nama_kanonik, ct.kategori, rel.tingkat_pembatasan, collect(cm.name) AS komorbid, ct.alasan_klinis;
```
