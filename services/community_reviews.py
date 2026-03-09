import csv
import pyodbc
from core.config import DB_CONNECTION
from openai import OpenAI
from core.config import GITHUB_TOKEN

client = OpenAI(
    api_key=GITHUB_TOKEN,
    base_url="https://models.inference.ai.azure.com"
)

# =========================
# LOAD CSV HOTELS
# =========================
def get_csv_hotels():

    hotels=[]

    with open("dataset/Information for Accommodation.csv",encoding="utf-8") as f:
        reader=csv.DictReader(f)

        for r in reader:
            hotels.append({
                "name":r.get("Name"),
                "district":r.get("District")
            })

    return hotels


# =========================
# ADD REVIEW
# =========================
def add_review(hotel,rating,review):

    conn=pyodbc.connect(DB_CONNECTION)
    cursor=conn.cursor()

    cursor.execute("""
        INSERT INTO dbo.CommunityReviews
        (HotelName,Rating,Review,CreatedAt)
        VALUES (?,?,?,GETDATE())
    """,hotel,rating,review)

    conn.commit()
    conn.close()


# =========================
# GET REVIEWS
# =========================
def get_reviews(hotel):

    conn=pyodbc.connect(DB_CONNECTION)
    cursor=conn.cursor()

    rows=cursor.execute("""
        SELECT Rating,Review,CreatedAt
        FROM dbo.CommunityReviews
        WHERE HotelName=?
        ORDER BY Id DESC
    """,hotel).fetchall()

    conn.close()

    return [{
        "rating":r[0],
        "review":r[1],
        "date":str(r[2])
    } for r in rows]


# =========================
# TOP HOTELS
# =========================
def get_top_hotels():

    conn=pyodbc.connect(DB_CONNECTION)
    cursor=conn.cursor()

    rows=cursor.execute("""
        SELECT HotelName,
               AVG(CAST(Rating AS FLOAT)),
               COUNT(*)
        FROM dbo.CommunityReviews
        GROUP BY HotelName
        ORDER BY AVG(CAST(Rating AS FLOAT)) DESC
    """).fetchall()

    conn.close()

    return [{
        "hotel":r[0],
        "avg":round(r[1],1),
        "count":r[2]
    } for r in rows]


# =====================================================
# ⭐ HYBRID HOTEL INFO (CSV + AI)
# =====================================================
def get_hotel_info(hotel):

    search=hotel.lower().strip()

    # -------- TRY CSV FIRST --------
    with open("dataset/Information for Accommodation.csv",encoding="utf-8") as f:
        reader=csv.DictReader(f)

        for r in reader:

            csv_name=r.get("Name","").lower()

            if search in csv_name or csv_name in search:

                try:
                    lat=float(r.get("Latitude"))
                    lon=float(r.get("Logitute"))
                except:
                    lat=None
                    lon=None

                return {
                    "district":r.get("District",""),
                    "lat":lat,
                    "lon":lon
                }

    # -------- FALLBACK → AI GEOLOCATE --------
    try:

        prompt=f"""
Return ONLY latitude and longitude of this Sri Lanka hotel:

{hotel}

Format:
lat,lon
"""

        res=client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0,
            messages=[{"role":"user","content":prompt}]
        )

        txt=res.choices[0].message.content.strip()

        lat,lon=txt.split(",")

        return {
            "district":"",
            "lat":float(lat),
            "lon":float(lon)
        }

    except Exception as e:
        print("AI GEO ERROR:",e)

    return {}
