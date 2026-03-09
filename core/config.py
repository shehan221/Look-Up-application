import os
from dotenv import load_dotenv

load_dotenv()

# =========================
# OPENAI TOKEN
# =========================
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")

if not GITHUB_TOKEN:
    raise RuntimeError("GITHUB_TOKEN not set. Check your .env file.")

# =========================
# SQL SERVER CONNECTION
# =========================
DB_CONNECTION = (
    "DRIVER={ODBC Driver 17 for SQL Server};"
    "SERVER=DESKTOP-N80S0HA\\SQLEXPRESS;"   # ⭐ DOUBLE BACKSLASH FIX
    "DATABASE=LookUpDB;"
    "Trusted_Connection=yes;"
)
