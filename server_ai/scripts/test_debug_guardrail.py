import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.allergen_guardrail import allergen_guardrail
from app.core.neo4j_manager import neo4j_manager

allergens = ["Seafood", "Santan"]
expanded = allergen_guardrail.expand_allergen_keywords(allergens)
print("Expanded allergens count:", len(expanded), expanded)

foods = neo4j_manager._load_local_dataset()
print("Total foods:", len(foods))

safe_candidates = []
dropped_count = 0
dropped_reasons = {}

for f in foods[:20]:
    name = f["nama"]
    is_safe = allergen_guardrail.verify_food_item_is_safe(name, expanded)
    if is_safe:
        safe_candidates.append(name)
    else:
        for a in expanded:
            if a in name.lower():
                dropped_reasons[a] = dropped_reasons.get(a, 0) + 1

print("From first 20 foods, safe:", len(safe_candidates), safe_candidates)
print("Dropped reasons in first 20:", dropped_reasons)
