import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.neo4j_manager import neo4j_manager

foods = neo4j_manager._load_local_dataset()
gi_vals = [f["gi"] for f in foods[:50]]
print("Sample GI values:", gi_vals[:15])

filtered = [f for f in foods if f["gi"] <= 55]
print("Count of foods with GI <= 55:", len(filtered))

filtered2 = [f for f in foods if f["sodium_mg"] <= 400]
print("Count of foods with sodium <= 400:", len(filtered2))

filtered3 = [f for f in foods if f["gi"] <= 55 and f["sodium_mg"] <= 400]
print("Count with both:", len(filtered3))

for f in filtered3[:5]:
    print("MATCH:", f["nama"], f["gi"], f["sodium_mg"], f["kalori"])
