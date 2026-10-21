"""
Kalkulator Kalori Olahraga Deterministik (MET Science Formula)
Berdasarkan Compendium of Physical Activities (Ainsworth et al., CDC / ACSM).
Formula: Kalori (kkal) = MET * Berat Badan (kg) * (Durasi (menit) / 60)
"""

import re
from typing import Optional, Dict, Any

MET_ACTIVITIES = {
    # Jalan Kaki
    "jalan santai": {"name": "Jalan Santai", "met": 3.5},
    "jalan kaki": {"name": "Jalan Kaki", "met": 3.5},
    "jalan cepat": {"name": "Jalan Cepat (Brisk Walk)", "met": 4.8},
    "brisk walk": {"name": "Jalan Cepat (Brisk Walk)", "met": 4.8},
    "treadmill": {"name": "Jalan di Treadmill", "met": 4.5},

    # Lari / Jogging
    "jogging": {"name": "Jogging Santai", "met": 7.0},
    "lari santai": {"name": "Jogging Santai", "met": 7.0},
    "lari": {"name": "Lari Sedang", "met": 8.5},
    "lari cepat": {"name": "Lari Cepat", "met": 10.5},
    "sprint": {"name": "Lari Cepat / Sprint", "met": 11.5},

    # Sepeda
    "sepeda": {"name": "Bersepeda Santai", "met": 6.0},
    "bersepeda": {"name": "Bersepeda Santai", "met": 6.0},
    "sepedaan": {"name": "Bersepeda Santai", "met": 6.0},
    "sepeda statis": {"name": "Sepeda Statis", "met": 5.5},

    # Renang
    "renang": {"name": "Berenang", "met": 6.0},
    "berenang": {"name": "Berenang", "met": 6.0},

    # Senam & Aerobik
    "senam": {"name": "Senam Aerobik Ringan", "met": 4.5},
    "aerobik": {"name": "Senam Aerobik Sedang", "met": 5.5},
    "zumba": {"name": "Senam Zumba", "met": 6.5},
    "senam diabetes": {"name": "Senam Diabetes / Kaki", "met": 3.5},

    # Permainan / Raket
    "badminton": {"name": "Bulu Tangkis (Badminton)", "met": 6.0},
    "bulutangkis": {"name": "Bulu Tangkis (Badminton)", "met": 6.0},
    "tenis meja": {"name": "Tenis Meja / Pingpong", "met": 4.0},
    "futsal": {"name": "Futsal / Sepak Bola", "met": 8.0},
    "basket": {"name": "Bola Basket", "met": 7.5},

    # Latihan Otot & Fleksibilitas
    "latihan beban": {"name": "Latihan Beban / Otot", "met": 4.0},
    "angkat beban": {"name": "Latihan Beban / Otot", "met": 4.0},
    "gym": {"name": "Fitness / Gym", "met": 4.5},
    "push up": {"name": "Kalistenik (Push up, Sit up)", "met": 4.5},
    "yoga": {"name": "Yoga / Stretching", "met": 2.8},
    "stretching": {"name": "Peregangan Otot", "met": 2.5},
}


def calculate_exercise_calories(query: str, user_weight: Optional[float] = 68.0) -> Optional[Dict[str, Any]]:
    """
    Mendeteksi jenis dan durasi latihan dari teks, menghitung kalori terbakar deterministik.
    """
    if not query:
        return None
    ql = query.lower()

    # Ekstrak durasi menit
    duration = None
    hour_match = re.search(r'(\d+(?:[.,]\d+)?)\s*(?:jam|hours?)', ql)
    if hour_match:
        duration = round(float(hour_match.group(1).replace(',', '.')) * 60)
    else:
        min_match = re.search(r'(\d+)\s*(?:menit|mnt|mins?)', ql)
        if min_match:
            duration = int(min_match.group(1))

    # Cek apakah ada frasa olahraga jika durasi tidak disebutkan eksplisit
    if not duration:
        trigger_phrases = [
            "tadi lari", "habis lari", "sudah lari", "tadi jalan", "habis jalan", "jalan kaki",
            "olahraga tadi", "bersepeda tadi", "sepedaan tadi", "renang tadi", "senam tadi"
        ]
        if any(p in ql for p in trigger_phrases):
            duration = 30
        else:
            return None

    duration = max(5, min(duration, 360))

    # Cocokkan aktivitas
    matched_act = None
    for key, val in MET_ACTIVITIES.items():
        if key in ql:
            matched_act = val
            break

    if not matched_act:
        if any(w in ql for w in ["olahraga", "workout", "latihan"]):
            matched_act = {"name": "Latihan Aerobik Sedang", "met": 5.0}
        else:
            return None

    weight = float(user_weight) if user_weight and 30 <= float(user_weight) <= 250 else 68.0
    burned = round(matched_act["met"] * weight * (duration / 60.0))

    return {
        "activity_name": matched_act["name"],
        "duration_minutes": duration,
        "activity_calories": burned,
        "met": matched_act["met"],
        "weight_used": weight,
        "clinical_note": (
            f"Latihan {matched_act['name']} selama {duration} menit efektif membakar sekitar {burned} kkal "
            f"dan merangsang sensitivitas reseptor insulin otot."
        )
    }
