import csv
import math

HOTELS = []

print("\nLOADING HOTEL CSV DATA...")

# =========================
# LOAD CSV (SAFE VERSION)
# =========================
with open("dataset/Information for Accommodation.csv", encoding="utf-8") as f:

    reader = csv.DictReader(f)

    # ⭐ CLEAN HEADER NAMES (removes hidden spaces)
    reader.fieldnames = [h.strip() for h in reader.fieldnames]

    print("HEADERS:", reader.fieldnames)

    for r in reader:

        # ⭐ HANDLE BOTH POSSIBLE COLUMN SPELLINGS
        lat_raw = r.get("Latitude")
        lon_raw = r.get("Longitude") or r.get("Logitiute")

        try:
            lat = float(lat_raw)
            lon = float(lon_raw)
        except:
            lat = None
            lon = None

        HOTELS.append({
            "name": r.get("Name"),
            "lat": lat,
            "lon": lon,
            "type": r.get("Type", "Hotel")
        })

print("TOTAL HOTELS LOADED:", len(HOTELS))


# =========================
# DISTANCE FUNCTION
# =========================
def haversine(lat1, lon1, lat2, lon2):

    R = 6371

    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )

    return 2 * R * math.asin(math.sqrt(a))


# =========================
# RETURN CLOSEST HOTELS
# =========================
def get_hotels_near(location, lat, lon):

    print("\n🔥 USING REAL CSV GPS")

    results = []

    for h in HOTELS:

        if h["lat"] is None or h["lon"] is None:
            continue

        d = haversine(lat, lon, h["lat"], h["lon"])

        results.append({
            "name": h["name"],
            "lat": h["lat"],
            "lon": h["lon"],
            "distance_km": round(d, 1),
            "type": h["type"]
        })

    results = sorted(results, key=lambda x: x["distance_km"])

    print("🔥 HOTELS RETURNED:", len(results))

    return results[:20]   # ⭐ reduced for faster map
