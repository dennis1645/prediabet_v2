import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.neo4j_manager import neo4j_manager

foods = neo4j_manager._load_local_dataset()
print("Loaded foods count:", len(foods))
safe = neo4j_manager.get_safe_foods_by_profile(["Hipertensi"], ["Seafood", "Santan"])
print("Safe count:", len(safe))
for s in safe[:5]:
    print(" -", s["nama"], "| GI:", s["gi"], "| Sodium:", s["sodium_mg"], "| Kalori:", s["kalori"])
