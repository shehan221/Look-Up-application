/* ═══════════════════════════════════════════════════════
   LOOK-UP — leaderboard.js  (modern UI + no-reload back)
════════════════════════════════════════════════════════ */

let leaderboardLoaded = false;

/* ═══════════════════════════════════════════════════════
   BACK NAVIGATION — no full reload
   Uses History API: pushes a state so the browser back
   button returns to "/" without reloading the leaderboard.
════════════════════════════════════════════════════════ */
function goBack() {
  sessionStorage.setItem("RETURN_FROM_LEADERBOARD", "true");

  /* If we came from the main app, use history.back()
     so the browser restores the cached page (bfcache).
     Otherwise fall back to a normal href. */
  if (document.referrer.includes(location.hostname) &&
      !document.referrer.includes("/leaderboard")) {
    history.back();
  } else {
    window.location.href = "/";
  }
}

/* ═══════════════════════════════════════════════════════
   LOAD LEADERBOARD
════════════════════════════════════════════════════════ */
async function loadLeaderboard() {
  if (leaderboardLoaded) return;
  leaderboardLoaded = true;

  const box = document.getElementById("leaderboardList");
  if (!box) return;

  /* Show loading spinner */
  box.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <span>Loading leaderboard…</span>
    </div>`;

  try {
    const list = await fetch("/community/top").then(r => r.json());

    /* Sort by review count descending */
    list.sort((a, b) => b.count - a.count);

    /* ── Resolve GPS + location for all hotels in parallel ── */
    const enriched = await Promise.all(list.map(async (h, idx) => {
      let gps = null;
      let locationText = "📍 Sri Lanka";

      try {
        gps = await fetch(`/hotel-gps?hotel=${encodeURIComponent(h.hotel)}`)
          .then(r => r.json());
      } catch (_) {}

      if (gps?.lat && gps?.lon) {
        try {
          const geo = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${gps.lat}&lon=${gps.lon}`,
            { headers: { "User-Agent": "LOOK-UP Assistant" } }
          ).then(r => r.json());

          const addr = geo.address || {};
          const district =
            addr.city_district || addr.state_district ||
            addr.city || addr.town || addr.village ||
            addr.county || addr.state || "Sri Lanka";

          locationText = "📍 " + district;
        } catch (_) {}
      }

      let reviews = [];
      try {
        reviews = await fetch(`/community/${encodeURIComponent(h.hotel)}`)
          .then(r => r.json());
      } catch (_) {}

      return { ...h, gps, locationText, reviews, rank: idx + 1 };
    }));

    /* Clear spinner */
    box.innerHTML = "";

    /* ── PODIUM (top 3) ── */
    const top3 = enriched.slice(0, 3);
    if (top3.length >= 1) {
      const podium = document.createElement("div");
      podium.className = "podium";

      /* Visual order: 2nd, 1st, 3rd */
      const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);
      const rankEmoji = ["🥈", "🥇", "🥉"];
      const rankClass = ["rank-2", "rank-1", "rank-3"];

      podiumOrder.forEach((h, vi) => {
        const isFirst = h?.rank === 1;
        const emojiIdx = [1, 0, 2][vi];
        const card = document.createElement("div");
        card.className = `podium-card ${rankClass[vi]}`;
        card.innerHTML = `
          <div class="podium-rank">${rankEmoji[emojiIdx]}</div>
          <div class="podium-name">${h.hotel}</div>
          <div class="podium-location">${h.locationText}</div>
          <div class="podium-stars">${"⭐".repeat(Math.round(h.avg))} <span style="color:var(--text)">${h.avg.toFixed(1)}</span></div>
          <div class="podium-count">${h.count} reviews</div>
        `;
        podium.appendChild(card);
      });

      box.appendChild(podium);
    }

    /* ── Remaining cards (rank 4+) ── */
    enriched.forEach((h, idx) => {
      const mapId = "map-" + h.hotel.replace(/\W/g, "");
      const reviewsId = "rev-" + h.hotel.replace(/\W/g, "");

      const starsHTML = "⭐".repeat(Math.round(h.avg));

      /* Reviews HTML */
      let reviewHTML = "";
      h.reviews.forEach(r => {
        reviewHTML += `
          <div class="review-item">
            <span class="review-stars">${"⭐".repeat(r.rating)}</span>
            ${r.review}
          </div>`;
      });

      const card = document.createElement("div");
      card.className = "leaderboard-card";
      card.style.animationDelay = `${idx * 0.06}s`;

      card.innerHTML = `
        <div class="card-rank-num">#${h.rank}</div>

        <div class="card-body">
          <div class="leaderboard-title">${h.hotel}</div>
          <div class="leaderboard-location">${h.locationText}</div>
          <div class="leaderboard-stars">
            ${starsHTML}
            <span class="star-score">${h.avg.toFixed(1)}</span>
          </div>
          <div class="leaderboard-meta">${h.count} review${h.count !== 1 ? "s" : ""}</div>

          <div style="display:flex;flex-wrap:wrap;gap:0">
            ${h.gps?.lat ? `<button class="map-btn" onclick="toggleMiniMap('${mapId}',${h.gps.lat},${h.gps.lon})">🗺 Map</button>` : ""}
            ${reviewHTML ? `<button class="reviews-toggle" onclick="toggleReviews('${reviewsId}')">💬 Reviews</button>` : ""}
          </div>

          <div id="${reviewsId}" class="reviews-drawer">
            ${reviewHTML}
          </div>

          <div id="${mapId}" class="mini-map" style="display:none;"></div>
        </div>

        <div class="card-right">
          ${h.rank <= 3 ? '<span class="popular-badge">🔥 Popular</span>' : ""}
        </div>
      `;

      box.appendChild(card);
    });

  } catch (e) {
    console.error("Leaderboard load failed", e);
    document.getElementById("leaderboardList").innerHTML =
      `<div class="loading-state">⚠️ Failed to load leaderboard. Please try again.</div>`;
  }
}

/* ═══════════════════════════════════════════════════════
   TOGGLE REVIEWS DRAWER
════════════════════════════════════════════════════════ */
function toggleReviews(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.toggle("open");
}

/* ═══════════════════════════════════════════════════════
   MINI MAP TOGGLE
════════════════════════════════════════════════════════ */
function toggleMiniMap(id, lat, lon) {
  if (!lat || !lon) {
    alert("Hotel GPS not found.");
    return;
  }

  const box = document.getElementById(id);
  if (!box) return;

  if (box.style.display === "block") {
    box.style.display = "none";
    return;
  }

  box.style.display = "block";
  if (box.dataset.loaded) return;

  setTimeout(() => {
    const map = L.map(id).setView([lat, lon], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

    const icon = L.divIcon({
      className: "",
      html: `<div style="
        width:32px;height:32px;border-radius:50%;
        background:linear-gradient(135deg,#3b82f6,#06b6d4);
        border:3px solid #fff;
        box-shadow:0 4px 12px rgba(59,130,246,.5);
        display:flex;align-items:center;justify-content:center;
        font-size:14px;
      ">🏨</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32]
    });

    L.marker([lat, lon], { icon }).addTo(map);
    box.dataset.loaded = "true";
  }, 200);
}

/* ═══════════════════════════════════════════════════════
   AUTO LOAD
════════════════════════════════════════════════════════ */
window.addEventListener("DOMContentLoaded", loadLeaderboard);