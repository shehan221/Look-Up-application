from flask import Blueprint, render_template, request, jsonify, session, redirect, url_for
import pyodbc
from core.config import DB_CONNECTION

users_bp = Blueprint("users_bp", __name__)

# =========================
# DATABASE CONNECTION
# =========================
def get_db_connection():
    return pyodbc.connect(DB_CONNECTION)

# =========================
# USERS PAGE (LOGIN UI)
# =========================
@users_bp.route("/users")
def users_page():
    return render_template("users.html")

# =========================
# USER REGISTER
# =========================
@users_bp.route("/api/users/register", methods=["POST"])
def user_register():
    try:
        data = request.get_json()

        username = data.get("username", "").strip()
        full_name = data.get("full_name", "").strip()
        email = data.get("email", "").strip()
        password = data.get("password", "")

        if not username or not full_name or not email or not password:
            return jsonify({"success": False, "error": "All fields are required"})

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT user_id FROM Users WHERE username=?", (username,))
        if cursor.fetchone():
            conn.close()
            return jsonify({"success": False, "error": "Username already exists"})

        cursor.execute("SELECT user_id FROM Users WHERE email=?", (email,))
        if cursor.fetchone():
            conn.close()
            return jsonify({"success": False, "error": "Email already registered"})

        cursor.execute("""
            INSERT INTO Users (username, full_name, email, password, created_at)
            VALUES (?, ?, ?, ?, GETDATE())
        """, (username, full_name, email, password))

        conn.commit()
        conn.close()

        return jsonify({"success": True, "message": "Registration successful!"})

    except Exception as e:
        print("Register error:", e)
        return jsonify({"success": False, "error": "Registration failed"})

# =========================
# USER LOGIN
# =========================
@users_bp.route("/api/users/login", methods=["POST"])
def user_login():
    try:
        data = request.get_json()

        user_input = data.get("username_or_email", "").strip()
        password = data.get("password", "")

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT user_id, username, full_name, password
            FROM Users
            WHERE username=? OR email=?
        """, (user_input, user_input))

        user = cursor.fetchone()
        conn.close()

        if not user:
            return jsonify({"success": False, "error": "User not found"})

        if user[3] != password:
            return jsonify({"success": False, "error": "Incorrect password"})

        session["user_id"] = user[0]
        session["username"] = user[1]
        session["full_name"] = user[2]

        return jsonify({"success": True, "message": "Login successful!"})

    except Exception as e:
        print("Login error:", e)
        return jsonify({"success": False, "error": "Login failed"})

# =========================
# LOGOUT (⭐ SAFE FIX ONLY)
# =========================
@users_bp.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("index"))
