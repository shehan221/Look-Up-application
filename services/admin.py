from flask import Blueprint, render_template, session, redirect, url_for

admin_bp = Blueprint("admin_bp", __name__)

@admin_bp.route("/admin")
def admin_dashboard():

    # allow only admin
    if session.get("role") != "admin":
        return redirect(url_for("index"))

    return render_template("admin.html")
