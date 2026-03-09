from flask import Flask, render_template, request, jsonify, session, redirect, url_for
import torch, clip, os
from PIL import Image
from openai import OpenAI
import pyodbc
from services.users import users_bp

from services.chatbot import travel_assistant
from services.hotel_service import get_hotels_near
from services.community_reviews import (
    get_csv_hotels,
    add_review,
    get_reviews
)

# ⭐ USING CONFIG FILE
from core.config import GITHUB_TOKEN, DB_CONNECTION


app = Flask(__name__)
app.register_blueprint(users_bp)

app.secret_key = "lookup-secret-session"

app.config["UPLOAD_FOLDER"] = "static/uploads"
os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

client = OpenAI(
    api_key=GITHUB_TOKEN,
    base_url="https://models.inference.ai.azure.com"
)

# =========================
# DATABASE CONNECTION (FROM CONFIG)
# =========================
def get_db_connection():
    return pyodbc.connect(DB_CONNECTION)

# =========================
# LOAD CLIP (FAST SETUP)
# =========================
device = "cuda" if torch.cuda.is_available() else "cpu"

# Load base CLIP model
model, preprocess = clip.load("ViT-B/32", device=device)

# Load your fine-tuned weights
model.load_state_dict(
    torch.load("models/lookup_clip_model.pt", map_location=device)
)

model.eval()

# Reduce CPU overhead
torch.set_num_threads(1)

LABELS = [
    "Sigiriya",
    "Yala National Park",
    "Galle Fort",
    "Adam's Peak",
    "Temple of the Tooth",
    "Arugam Bay",
    "Mirissa",
    "Dambulla Cave Temple",
    "Ravana Falls",
    "Udawalawe National Park",
    "Kataragama",
    "Gal Viharaya",
    "Unawatuna",
    "Mihintale",
    "Nine Arch Bridge",

    # ⭐ NEW RELIGIOUS LOCATIONS
    "Gangaramaya Temple",
    "Kelaniya Raja Maha Vihara",
    "Ruwanwelisaya",
    "Jaya Sri Maha Bodhi",
    "Seetha Amman Temple",
    "Sri Pada Temple",
    "Nagadeepa Temple",
    "Madu Church"
]

LABEL_PROMPTS = [
    "Sigiriya ancient rock fortress Sri Lanka landmark",
    "Yala National Park wildlife safari elephants Sri Lanka",
    "Galle Fort colonial dutch fort ocean Sri Lanka",
    "Adam's Peak pilgrimage mountain Sri Lanka",
    "Temple of the Tooth Kandy Buddhist temple Sri Lanka",
    "Arugam Bay surfing beach Sri Lanka waves",
    "Mirissa whale watching coconut hill beach Sri Lanka",
    "Dambulla Cave Temple golden buddha Sri Lanka cave temple",
    "Ravana Falls Ella waterfall Sri Lanka jungle",
    "Udawalawe National Park elephants safari Sri Lanka",
    "Kataragama sacred temple Sri Lanka pilgrimage",
    "Gal Viharaya Polonnaruwa stone Buddha Sri Lanka",
    "Unawatuna beach palm trees turquoise water Sri Lanka",
    "Mihintale ancient Buddhist ruins Sri Lanka hill",
    "Nine Arch Bridge Ella train bridge Sri Lanka jungle",

    # ⭐ RELIGIOUS LOCATIONS PROMPTS
    "Gangaramaya Temple Colombo Buddhist temple Sri Lanka statues monastery",
    "Kelaniya Raja Maha Vihara Buddhist temple Kelaniya Sri Lanka murals",
    "Ruwanwelisaya Anuradhapura white stupa Buddhist sacred site Sri Lanka",
    "Jaya Sri Maha Bodhi Anuradhapura sacred bo tree Buddhist temple Sri Lanka",
    "Seetha Amman Temple Nuwara Eliya Hindu temple Sri Lanka Ramayana site",
    "Sri Pada Temple Adam's Peak summit shrine Buddhist pilgrimage Sri Lanka",
    "Nagadeepa Temple Nainativu Buddhist temple island Sri Lanka",
    "Madu Church Mannar Catholic church lagoon Sri Lanka pilgrimage site"
]


text_tokens = clip.tokenize(LABEL_PROMPTS).to(device)

# =========================
# AI SIMILAR PLACES
# =========================
def get_similar_places(place):
    try:
        prompt = f"Give 5 tourist places in Sri Lanka similar to {place}. Return only names, comma-separated."

        res = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3
        )

        return [p.strip() for p in res.choices[0].message.content.split(",")]

    except Exception as e:
        print("Similar error:", e)
        return []

# =========================
# ROUTES
# =========================
@app.route("/")
def index():

    just_logged_in = session.pop("just_logged_in", False)

    return render_template(
        "index.html",
        username=session.get("username"),
        just_logged_in=just_logged_in
    )

# ⭐ FIX ADDED HERE — LOGOUT ROUTE

@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("index"))

# ⭐ USERS PAGE (LOGIN UI)
@app.route("/users")
def users():
    return render_template("users.html")

# =========================
# USER LOGIN API
# =========================
@app.route("/api/users/login", methods=["POST"])
def api_user_login():

    data = request.json
    user_input = data.get("username_or_email")
    password = data.get("password")

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT user_id, username, full_name, password
        FROM Users
        WHERE username=? OR email=?
    """,(user_input,user_input))

    user = cursor.fetchone()
    conn.close()

    if not user:
        return jsonify({"success":False,"error":"User not found"})

    if user[3] != password:
        return jsonify({"success":False,"error":"Incorrect password"})

    session["user_id"] = user[0]
    session["username"] = user[1]
    session["full_name"] = user[2]
    session["just_logged_in"] = True


    return jsonify({"success":True,"message":"Login successful"})

# =========================
# USER REGISTER API
# =========================
@app.route("/api/users/register", methods=["POST"])
def api_user_register():

    data = request.json

    username = data.get("username")
    full_name = data.get("full_name")
    email = data.get("email")
    password = data.get("password")

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO Users (username,full_name,email,password,created_at)
        VALUES (?,?,?,?,GETDATE())
    """,(username,full_name,email,password))

    conn.commit()
    conn.close()

    return jsonify({"success":True,"message":"Registration successful"})

# =========================
# PREDICT ROUTE
# =========================
@app.route("/predict", methods=["POST"])
def predict():

    # ⭐ LOGIN REQUIRED (YOU ALREADY ADDED — KEEP)
    if "user_id" not in session:
        return jsonify({"error":"login_required"}),401

    file = request.files["image"]
    path = os.path.join(app.config["UPLOAD_FOLDER"], file.filename)
    file.save(path)

    with Image.open(path) as img:
        img = img.convert("RGB")
        img.thumbnail((512,512))
        image = preprocess(img).unsqueeze(0).to(device)

    with torch.no_grad():
        image_f = model.encode_image(image)
        text_f = model.encode_text(text_tokens)

        image_f /= image_f.norm(dim=-1, keepdim=True)
        text_f /= text_f.norm(dim=-1, keepdim=True)

        sim = (100 * image_f @ text_f.T).softmax(dim=-1)
        val, idx = sim[0].topk(1)

    location = LABELS[idx.item()]
    confidence = round(val.item()*100,2)
    similar = get_similar_places(location)

    return jsonify({
        "location":location,
        "confidence":confidence,
        "image_url":"/"+path,
        "recommendations":similar
    })

# =========================
# HOTELS ROUTE
# =========================
@app.route("/hotels")
def hotels():

    location = request.args.get("location")

    try:
        lat = float(request.args.get("lat"))
        lon = float(request.args.get("lon"))
    except:
        return jsonify({"hotels":[]})

    hotels = get_hotels_near(location,lat,lon)

    return jsonify({
        "location":location,
        "hotels":hotels
    })

# =========================
# CHAT ROUTE
# =========================
@app.route("/chat", methods=["POST"])
def chat():

    data = request.json

    reply = travel_assistant(
        data["message"],
        data.get("location"),
        data.get("confidence"),
        data.get("similar"),
        None
    )

    return jsonify({"reply":reply})

# =========================
# COMMUNITY REVIEWS
# =========================
@app.route("/community/hotels")
def community_hotels():
    return jsonify(get_csv_hotels())

@app.route("/community/add", methods=["POST"])
def community_add():
    data = request.json
    add_review(data["hotel"],int(data["rating"]),data["review"])
    return jsonify({"status":"ok"})

@app.route("/community/<hotel>")
def community_get(hotel):
    return jsonify(get_reviews(hotel))

@app.route("/community/top")
def community_top():
    from services.community_reviews import get_top_hotels
    data = get_top_hotels()
    return jsonify(data)

@app.route("/leaderboard")
def leaderboard():
    return render_template("leaderboard.html")

@app.route("/hotel-image")
def hotel_image():
    from services.community_reviews import get_hotel_image_query
    hotel = request.args.get("hotel")
    if not hotel:
        return jsonify({"query":""})
    query = get_hotel_image_query(hotel)
    return jsonify({"query":query})

@app.route("/hotel-gps")
def hotel_gps():
    from services.hotel_service import HOTELS
    hotel = request.args.get("hotel","").lower()

    for h in HOTELS:
        if hotel in h["name"].lower() or h["name"].lower() in hotel:
            return jsonify({"lat":h["lat"],"lon":h["lon"]})

    return jsonify({"lat":None,"lon":None})

# 🚨 ALWAYS KEEP THIS LAST
if __name__ == "__main__":
    app.run(debug=True)