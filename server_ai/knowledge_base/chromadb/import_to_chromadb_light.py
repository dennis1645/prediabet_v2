"""
ChromaDB Import with Default Embedding (no sentence-transformers needed)
========================================================================
Uses ChromaDB's built-in 'all-MiniLM-L6-v2' default embedding function
which downloads automatically (~90MB vs ~500MB for sentence-transformers).

This is a lighter alternative to import_to_chromadb.py
Run: /home/nox/venv/bin/python3 import_to_chromadb_light.py
"""
import chromadb
import json
import os

DOCS_JSON  = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'recipe_documents.json')
CHROMA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'chroma_store')

print(f"Loading documents from {DOCS_JSON}")
with open(DOCS_JSON, 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"Total documents to import: {data['total_documents']}")

# Use ChromaDB default embedding (all-MiniLM-L6-v2, downloads ~90MB on first run)
client = chromadb.PersistentClient(path=CHROMA_DIR)

try:
    client.delete_collection(data['collection_name'])
    print(f"Deleted existing collection: {data['collection_name']}")
except Exception:
    pass

collection = client.create_collection(
    name=data['collection_name'],
    metadata={
        'description': 'Indonesian recipe ingredients knowledge base',
        'source': 'New_Ingredients_category.xlsx',
        'embedding_model': 'all-MiniLM-L6-v2 (ChromaDB default)',
        'allergy_metadata': 'NOT_SUPPORTED_BY_SOURCE_DATA',
        'note': 'For multilingual support, re-import using import_to_chromadb.py with paraphrase-multilingual-MiniLM-L12-v2'
    }
)

batch_size = 100
docs   = data['documents']
metas  = data['metadatas']
ids    = data['ids']

for i in range(0, len(docs), batch_size):
    collection.add(
        documents=docs[i:i+batch_size],
        metadatas=metas[i:i+batch_size],
        ids=ids[i:i+batch_size]
    )
    print(f"Inserted {min(i+batch_size, len(docs))}/{len(docs)} documents")

print(f"\n✅ ChromaDB import complete!")
print(f"   Collection: {data['collection_name']}")
print(f"   Documents : {collection.count()}")
print(f"   Store path: {CHROMA_DIR}")

# Example query
print("\n=== Example Semantic Query ===")
results = collection.query(
    query_texts=["resep dengan ayam dan bawang"],
    n_results=3
)
for i, (doc, meta) in enumerate(zip(results['documents'][0], results['metadatas'][0])):
    print(f"\nResult {i+1}: {meta['recipe_name']}")
    print(f"  Original: {meta['original_recipe_name']}")
    print(f"  {doc[:200]}...")
