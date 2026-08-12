#!/usr/bin/env python3
"""Classify EarnKaro/CashKaro partner stores into 6FeetnAbove verticals.

Input : assets/affiliate_partners.json  (raw store dump)
Output: curated_partners.json           (vertical + category + payout, sorted)
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve()
ROOT_DIR = Path(__file__).resolve().parent.parent
SRC = ROOT_DIR / "assets" / "affiliate_partners.json"
OUT = ROOT_DIR / "assets" / "curated_partners.json"

# ── Manual classification. category => list of exact store names ───────────
WELLNESS = {
    "Nutrition & Foods": [
        "Ounce Organics", "Neurogum", "Nature 4 Nature", "Nutriburst Store",
        "Neuherbs", "City Gold Tea", "Nutslane", "Rage Coffee", "True Elements Store",
        "Zoff Foods", "Curiously Positive",
    ],
    "Supplements & Sports Nutrition": [
        "HK Vitals", "Nutrabay", "MuscleBlaze", "TrueBasics", "Gritzo",
        "Healthkart Store", "Hyugalife", "Kindlife", "AGEasy",
    ],
    "Ayurveda & Herbal": [
        "Kapiva Store", "Zandu Care", "Rasayanam", "Kerala Ayurveda",
        "JiViSa", "Ramam Group", "WorldofAsaya",
    ],
    "Health Care & Diagnostics": [
        "PharmEasy Diagnostics", "Medibuddy Labs New", "Netmeds",
        "Truemeds Store", "XYLife",
    ],
    "Skin Care": [
        "Aqualogica", "The Derma Co", "Foxtale", "Dot & Key Store", "Dr. Sheth’s",
        "Bella Vita Store", "CosIQ", "Be Neude", "Gabit Skincare", "Hyphen",
        "Kama Ayurveda", "Forest Essentials India", "mCaffeine Store",
        "Soulflower", "WoW", "IBA Cosmetics", "Swiss Beauty", "Sugar Cosmetics",
    ],
    "Hair & Grooming": [
        "Brillare", "BBlunt", "Ustraa", "The Man Company Store", "Yaan Man",
        "VLCC",
    ],
    "Body Care & Hygiene": [
        "Sirona", "Durex Store", "Perfora", "Ghar Soaps", "Beco",
        "The Moms Co", "Baby Forest", "Koparo Clean Store",
    ],
}

FASHION = {
    "Marketplaces": [
        "Myntra New", "Ajio New Store", "Ajiogram", "AJIO Luxe", "Amazon",
        "Tata CLiQ", "Shopsy Store", "Meesho", "ShopClues Store",
    ],
    "Apparel Brands": [
        "Levis", "Libas", "BeYoung", "Linen Club", "Uniqlo", "Jaypore",
        "Rigo", "Strch", "Kimti", "House Of Koala", "Haute Sauce",
        "The Luxury Closet", "Shyaway",
    ],
    "Innerwear & Basics": ["XYXX Crew"],
    "Activewear & Sports": ["Hummel", "Decathlon"],
    "Footwear": ["Campus Shoes", "Neemans"],
    "Accessories": ["Salty", "Daily Objects", "Tiaraa", "IGP"],
}

# Everything else (credit cards, loans, travel, electronics, software, home) is out.
# Loophoop is excluded on purpose: its asset path (loophoop-kids-store) shows it is a
# kidswear brand, which does not fit a 6ft+ menswear catalogue.

def payout(text):
    text = text or ""
    m = re.search(r"([\d.]+)%", text)
    if m:
        return {"kind": "percent", "value": float(m.group(1))}
    m = re.search(r"Rs\s*([\d.]+)", text)
    if m:
        return {"kind": "flat_inr", "value": float(m.group(1))}
    return {"kind": "unknown", "value": 0.0}

def main():
    raw = json.loads(SRC.read_text())["pageProps"]["allStores"]["data"]
    by_name = {}
    for s in raw:
        a = s["attributes"]
        by_name[a["name"]] = {
            "id": s["id"],
            "name": a["name"],
            "slug": a["unique_identifier"],
            "logo": a["image_url"],
            "payoutLabel": a.get("cashback_button_text", ""),
            "payout": payout(a.get("cashback_button_text")),
        }

    curated, missing = [], []
    for vertical, groups in (("wellness", WELLNESS), ("fashion", FASHION)):
        for cat, names in groups.items():
            for n in names:
                if n not in by_name:
                    missing.append(n)
                    continue
                curated.append({**by_name[n], "vertical": vertical, "category": cat})

    curated.sort(key=lambda p: (p["vertical"], -p["payout"]["value"]))
    OUT.write_text(json.dumps(curated, indent=2, ensure_ascii=False))

    if missing:
        print("!! NAME MISMATCH (not found in source):", missing, file=sys.stderr)

    for vertical in ("wellness", "fashion"):
        rows = [p for p in curated if p["vertical"] == vertical]
        print(f"\n=== {vertical.upper()} — {len(rows)} stores ===")
        cats = {}
        for p in rows:
            cats.setdefault(p["category"], []).append(p)
        for cat, ps in cats.items():
            ps.sort(key=lambda p: -p["payout"]["value"])
            head = ", ".join(f"{p['name']} {p['payoutLabel'].replace(' Profit','')}" for p in ps[:6])
            print(f"  {cat:32} ({len(ps):2}) {head}")

    total = len(by_name)
    print(f"\nused {len(curated)} of {total} stores; {total - len(curated)} excluded "
          f"(cards/loans/travel/electronics/software/home)")

if __name__ == "__main__":
    main()
