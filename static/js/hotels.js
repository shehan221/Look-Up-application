/* ============================================================
   hotels.js  —  Hotel markers & map logic
   Functions: loadHotels(), toggleHotels(), getHotelIcon()
   Markers: crisp inline SVG pins — clearly visible at all zooms
============================================================ */

/* ── SVG pin builder ────────────────────────────────────── */
function makeHotelSVG(fillColor, borderColor, label) {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="26" height="34" viewBox="0 0 36 46">
      <ellipse cx="18" cy="44" rx="7" ry="2.5" fill="rgba(0,0,0,0.3)"/>
      <path d="M18 0 C8.059 0 0 8.059 0 18 C0 30 18 46 18 46 C18 46 36 30 36 18 C36 8.059 27.941 0 18 0 Z"
            fill="${fillColor}" stroke="${borderColor}" stroke-width="2"/>
      <circle cx="18" cy="18" r="11" fill="rgba(0,0,0,0.15)"/>
      <text x="18" y="23" text-anchor="middle"
            font-family="'DM Sans',system-ui,sans-serif"
            font-size="13" font-weight="800"
            fill="white" letter-spacing="0.5">${label}</text>
    </svg>`;
}

/* ── Colour + label per type ────────────────────────────── */
function getHotelMeta(type) {
  if (!type) return { fill:"#0ea5be", border:"#0891b2", label:"H" };
  const t = type.toLowerCase();
  if (t.includes("luxury"))   return { fill:"#f59e0b", border:"#d97706", label:"L" };
  if (t.includes("resort"))   return { fill:"#10b981", border:"#059669", label:"R" };
  if (t.includes("guest"))    return { fill:"#8b5cf6", border:"#7c3aed", label:"G" };
  if (t.includes("villa"))    return { fill:"#8b5cf6", border:"#7c3aed", label:"V" };
  if (t.includes("boutique")) return { fill:"#ec4899", border:"#db2777", label:"B" };
  return { fill:"#0ea5be", border:"#0891b2", label:"H" };
}

/* ── getHotelIcon — same signature as before ────────────── */
function getHotelIcon(type) {
  const meta = getHotelMeta(type);
  const svg  = makeHotelSVG(meta.fill, meta.border, meta.label);
  return L.divIcon({
    className:   "hotel-pin-icon",
    html:        svg,
    iconSize:    [26, 34],
    iconAnchor:  [13, 34],
    popupAnchor: [0, -36]
  });
}

/* ── Rich popup HTML ────────────────────────────────────── */
function buildHotelPopup(h) {
  const meta      = getHotelMeta(h.type);
  const typeLabel = h.type || "Hotel";
  return `
    <div class="hotel-popup">
      <div class="hotel-popup-badge" style="background:${meta.fill}22;border-color:${meta.fill}55;color:${meta.fill}">
        ${typeLabel}
      </div>
      <div class="hotel-popup-name">${h.name}</div>
      <div class="hotel-popup-divider"></div>
      <div class="hotel-popup-dist">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="${meta.fill}" stroke-width="2.5">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          <circle cx="12" cy="9" r="2.5"/>
        </svg>
        <span>${h.distance_km} km away</span>
      </div>
    </div>`;
}

/* ============================================================
   HOTELS MODULE  —  logic completely unchanged
============================================================ */

function loadHotels() {

  if (!context.location || mainLat === null || mainLon === null) {
    alert("Identify a location first");
    return;
  }

  fetch(`/hotels?location=${context.location}&lat=${mainLat}&lon=${mainLon}`)
  .then(r => r.json())
  .then(data => {

    hotelMarkers.forEach(m => map.removeLayer(m));
    hotelMarkers = [];

    data.hotels.forEach(h => {

      if (!h.lat || !h.lon) return;

      const m = L.marker([h.lat, h.lon], {
        icon: getHotelIcon(h.type)
      }).bindPopup(buildHotelPopup(h), {
        className: "hotel-popup-wrap",
        maxWidth:  280,
        minWidth:  220
      });

      /* ⭐⭐⭐ FIX — STORE HOTEL NAME SAFELY */
      m.hotelName = h.name;

      m.addTo(map);
      hotelMarkers.push(m);
    });

    hotelsVisible = true;
  });
}

/* TOGGLE HOTELS */
function toggleHotels() {

  if (hotelMarkers.length === 0) {
    loadHotels();
    return;
  }

  hotelsVisible = !hotelsVisible;

  if (hotelsVisible) {
    hotelMarkers.forEach(m => m.addTo(map));
  } else {
    hotelMarkers.forEach(m => map.removeLayer(m));
  }
}