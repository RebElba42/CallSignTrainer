import random
import json

# Präfix-Definitionen mit Regeln
prefix_rules = {
    # Deutschland
    "DL": {"ziffer": True, "suffix": (2, 3)},
    "DB": {"ziffer": True, "suffix": (2, 3)},
    "DC": {"ziffer": True, "suffix": (2, 3)},
    "DD": {"ziffer": True, "suffix": (2, 3)},
    "DE": {"ziffer": True, "suffix": (2, 3)},
    "DF": {"ziffer": True, "suffix": (2, 3)},
    "DG": {"ziffer": True, "suffix": (2, 3)},
    "DH": {"ziffer": True, "suffix": (2, 3)},
    "DJ": {"ziffer": True, "suffix": (2, 3)},
    "DK": {"ziffer": True, "suffix": (2, 3)},
    "DM": {"ziffer": True, "suffix": (2, 3)},
    "DO": {"ziffer": True, "suffix": (2, 3)},
    "DP": {"ziffer": True, "suffix": (2, 3)},
    "DR": {"ziffer": True, "suffix": (2, 3)},
    # Schweiz
    "HB9": {"ziffer": False, "suffix": (2, 3)},
    # USA
    "K": {"ziffer": True, "suffix": (1, 3)},
    "N": {"ziffer": True, "suffix": (1, 3)},
    "W": {"ziffer": True, "suffix": (1, 3)},
    "AA": {"ziffer": True, "suffix": (2, 3)},
    "AB": {"ziffer": True, "suffix": (2, 3)},
    "AC": {"ziffer": True, "suffix": (2, 3)},
    # Kanada
    "VE": {"ziffer": True, "suffix": (2, 3)},
    "VA": {"ziffer": True, "suffix": (2, 3)},
    "VO": {"ziffer": True, "suffix": (2, 3)},
    "VY": {"ziffer": True, "suffix": (2, 3)},
    # UK
    "G": {"ziffer": True, "suffix": (2, 3)},
    "M": {"ziffer": True, "suffix": (2, 3)},
    # Frankreich, Italien, Japan, Australien, etc.
    "F": {"ziffer": True, "suffix": (2, 3)},
    "I": {"ziffer": True, "suffix": (2, 3)},
    "JA": {"ziffer": True, "suffix": (2, 3)},
    "VK": {"ziffer": True, "suffix": (2, 3)},
    "ZS": {"ziffer": True, "suffix": (2, 3)},
    "PY": {"ziffer": True, "suffix": (2, 3)},
    "LU": {"ziffer": True, "suffix": (2, 3)},
    "UA": {"ziffer": True, "suffix": (2, 3)},
    "R": {"ziffer": True, "suffix": (2, 3)},
    "ON": {"ziffer": True, "suffix": (2, 3)},
    "OE": {"ziffer": True, "suffix": (2, 3)},
    "9A": {"ziffer": True, "suffix": (2, 3)},
    "SM": {"ziffer": True, "suffix": (2, 3)},
    "SP": {"ziffer": True, "suffix": (2, 3)},
    "YV": {"ziffer": True, "suffix": (2, 3)},
    "HS": {"ziffer": True, "suffix": (2, 3)},
    "9M": {"ziffer": False, "suffix": (2, 3)},
    "SU": {"ziffer": True, "suffix": (2, 3)},
    "ZL": {"ziffer": True, "suffix": (2, 3)},
}

all_prefixes = list(prefix_rules.keys())


def generate_suffix(length):
    # Kein Suffix mit Q am Anfang (optional)
    while True:
        suffix = "".join(random.choices("ABCDEFGHIJKLMNOPQRSTUVWXYZ", k=length))
        if not suffix.startswith("Q"):
            return suffix


def generate_callsign(prefix):
    rule = prefix_rules[prefix]
    # Special case for Croatia: allow both with and without digit after 9A
    if prefix == "9A":
        # 50% chance for digit, 50% for no digit (adjust as needed)
        if random.random() < 0.5:
            ziffer = str(random.randint(0, 9))
        else:
            ziffer = ""
    else:
        ziffer = str(random.randint(0, 9)) if rule["ziffer"] else ""
    suffix_len = random.randint(rule["suffix"][0], rule["suffix"][1])
    suffix = generate_suffix(suffix_len)
    return prefix + ziffer + suffix


callsigns = []

for _ in range(10000):
    prefix = random.choice(
        [
            p
            for p in all_prefixes
            if p in prefix_rules and p not in ["K", "N", "W", "AA", "AB", "AC"]
        ]
    )
    callsigns.append(generate_callsign(prefix))

for _ in range(10000):
    prefix = random.choice([p for p in ["K", "N", "W", "AA", "AB", "AC"]])
    callsigns.append(generate_callsign(prefix))

random.shuffle(callsigns)

with open("rufzeichen_international.json", "w") as f:
    json.dump(callsigns, f, indent=2)

print("20,000 callsigns have been successfully generated and saved.")
