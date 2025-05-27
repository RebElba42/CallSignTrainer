# gen_callsigns.py
# This script generates random amateur radio callsigns for German and international prefixes.
# It creates about 10,000 German and 10,000 international callsigns, shuffles them,
# and saves the result as a JSON file ("rufzeichen_international.json").
#
# Usage:
#   python gen_callsigns.py
#
# The output file can be used for Morse code training apps or similar projects.
import random
import json

# German prefixes
german_prefixes = ["DL", "DB", "DC", "DD", "DE", "DF", "DG", "DH", "DJ", "DK", "DM", "DO", "DP", "DR"]

# International prefixes
international_prefixes = [
    "K", "N", "W", "AA", "AB", "AC",  # USA
    "VE", "VA", "VO", "VY",           # Canada
    "G", "M",                         # United Kingdom
    "F",                              # France
    "I",                              # Italy
    "JA",                             # Japan
    "VK",                             # Australia
    "ZS",                             # South Africa
    "PY",                             # Brazil
    "LU",                             # Argentina
    "UA", "R",                        # Russia
    "ON",                             # Belgium
    "OE",                             # Austria
    "HB9",                            # Switzerland
    "9A",                             # Croatia
    "SM",                             # Sweden
    "SP",                             # Poland
    "YV",                             # Venezuela
    "HS",                             # Thailand
    "9M",                             # Malaysia
    "SU",                             # Egypt
    "ZL",                             # New Zealand
]

def generate_callsign(prefix):
    """
    Generate a random callsign for a given prefix.
    If the prefix already contains a digit (e.g. 'HB9'), do not add a number.
    Otherwise, add a random digit between 0 and 9.
    The suffix consists of 2 or 3 random uppercase letters.
    """
    if any(char.isdigit() for char in prefix):
        number = ""
    else:
        number = str(random.randint(0, 9))
    suffix = ''.join(random.choices("ABCDEFGHIJKLMNOPQRSTUVWXYZ", k=random.randint(2, 3)))
    return prefix + number + suffix

# Generate about 10,000 German and 10,000 international callsigns
callsigns = []

for _ in range(10000):
    callsigns.append(generate_callsign(random.choice(german_prefixes)))

for _ in range(10000):
    callsigns.append(generate_callsign(random.choice(international_prefixes)))

# Shuffle the list for randomness
random.shuffle(callsigns)

# Output as JSON file
with open("rufzeichen_international.json", "w") as f:
    json.dump(callsigns, f, indent=2)

print("20,000 callsigns have been successfully generated and saved.")