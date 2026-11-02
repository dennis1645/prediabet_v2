#!/usr/bin/env python3
"""
PrediaBeat ChromaDB Ingestion Script
Loads recipe_documents.json, clinical_documents.json, and food_documents.json
into persistent ChromaDB collections with rich metadata.
"""

import os
import json
import chromadb
from chromadb.config import Settings

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CHROMA_STORE_DIR = os.path.join(SCRIPT_DIR, "chroma_store")
os.makedirs(CHROMA_STORE_DIR, exist_ok=True)

print("Initializing ChromaDB Persistent Client...")
client = chromadb.PersistentClient(path=CHROMA_STORE_DIR)

# Collections to build
collections_to_load = [
    ("prediabeat_recipes", "recipe_documents.json"),
    ("prediabeat_clinical", "clinical_documents.json"),
    ("prediabeat_foods", "food_documents.json")
]

BATCH_SIZE = 100

for col_name, json_file in collections_to_load:
    file_path = os.path.join(SCRIPT_DIR, json_file)
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}, skipping...")
        continue
        
    print(f"\nProcessing collection: {col_name} from {json_file}...")
    with open(file_path, "r", encoding="utf-8") as f:
        docs_data = json.load(f)
        
    # Get or create collection
    collection = client.get_or_create_collection(
        name=col_name,
        metadata={"hnsw:space": "cosine"}
    )
    
    total = len(docs_data)
    for i in range(0, total, BATCH_SIZE):
        batch = docs_data[i:i + BATCH_SIZE]
        ids = [item['id'] for item in batch]
        documents = [item['document'] for item in batch]
        metadatas = [item['metadata'] for item in batch]
        
        collection.upsert(
            ids=ids,
            documents=documents,
            metadatas=metadatas
        )
        print(f"  Inserted {min(i + BATCH_SIZE, total)} / {total} documents...")
        
    print(f"Successfully loaded {total} documents into '{col_name}'.")

print("\nChromaDB Knowledge Base Ingestion Complete!")
