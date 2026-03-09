/* =====================================================
   LOOK-UP MAP + CHAT SCRIPT (FULL FIXED VERSION)
===================================================== */

let map;
let mainMarker=null;
let attractionMarkers=[];
let hotelMarkers=[];
let context={};

let mainLat=null;
let mainLon=null;
let hotelsVisible=false;
let processing=false;

let lastHotelLocation=null;

/* =========================
   MAP INIT
========================= */
map=L.map("map").setView([7.8731,80.7718],7);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

const redIcon=L.icon({
iconUrl:"https://maps.google.com/mapfiles/ms/icons/red-dot.png",
iconSize:[32,32],
iconAnchor:[16,32]
});

const blueIcon=L.icon({
iconUrl:"https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
iconSize:[32,32],
iconAnchor:[16,32]
});

/* =========================
   IMAGE PREVIEW
========================= */
document.getElementById("imageInput").addEventListener("change",e=>{
const img=document.getElementById("previewImage");
img.src=URL.createObjectURL(e.target.files[0]);
img.hidden=false;
});

/* =========================
   ANALYZE IMAGE
========================= */
async function analyzeImage(){

if(processing) return;
processing=true;

const panel=document.getElementById("reviewsPanel");
if(panel) panel.style.display="none";

const file=document.getElementById("imageInput").files[0];
if(!file){
processing=false;
return alert("Choose an image");
}

addBot("📍 Identifying location...");

const fd=new FormData();
fd.append("image",file);

try{

const res=await fetch("/predict",{method:"POST",body:fd});

/* ⭐ LOGIN REDIRECT HANDLER */
if(res.status===401){

alert("❗ Please login first before uploading images.");

processing=false;
context={};
mainLat=null;
mainLon=null;

if(mainMarker){
map.removeLayer(mainMarker);
mainMarker=null;
}

hotelMarkers.forEach(m=>map.removeLayer(m));
attractionMarkers.forEach(m=>map.removeLayer(m));

hotelMarkers=[];
attractionMarkers=[];
lastHotelLocation=null;

window.location.href="/users";
return;
}

const data=await res.json();

/* =========================
   LOW CONFIDENCE DETECTION
========================= */

if(data.confidence < 30){

alert("❌ Unable to confidently identify this location.\n\nTry uploading a clearer image or another landmark photo.");

processing=false;

/* Reset UI */
document.getElementById("locationName").innerText="—";
document.getElementById("confidenceText").innerText="";

/* Remove markers */
if(mainMarker){
map.removeLayer(mainMarker);
mainMarker=null;
}

hotelMarkers.forEach(m=>map.removeLayer(m));
attractionMarkers.forEach(m=>map.removeLayer(m));

hotelMarkers=[];
attractionMarkers=[];
lastHotelLocation=null;

/* Clear chat */
document.getElementById("chatMessages").innerHTML=
`<div class="bot-msg">❌ I could not confidently identify this location. Try another image.</div>`;

return;
}

context=data;

if(lastHotelLocation!==data.location){
hotelMarkers.forEach(m=>map.removeLayer(m));
hotelMarkers=[];
lastHotelLocation=data.location;
}

document.getElementById("locationName").innerText=data.location;
document.getElementById("confidenceText").innerText=`Confidence: ${data.confidence}%`;

showMap(data.location,data.recommendations);

addBot(`📍 I identified this place as <b>${data.location}</b>. How can I help you?`);

}catch(e){
console.error(e);
}

processing=false;
}

/* =========================
   RESET MAP
========================= */
function resetMap(){

attractionMarkers.forEach(m=>map.removeLayer(m));
hotelMarkers.forEach(m=>map.removeLayer(m));

attractionMarkers=[];
hotelMarkers=[];
hotelsVisible=false;
mainLat=null;
mainLon=null;

if(mainMarker){
map.removeLayer(mainMarker);
mainMarker=null;
}

map.setView([7.8731,80.7718],7);
}

/* =========================
   SHOW MAP  ⭐ FINAL FIX
========================= */
/* =========================
   SHOW MAP  ⭐ MAIN LOCATION BUTTON ADDED
========================= */
function showMap(mainPlace,recs){

resetMap();

const list=document.getElementById("recommendationsList");
list.innerHTML="";

/* ⭐ NEW MAIN LOCATION BUTTON */
const mainBtn=document.createElement("li");
mainBtn.innerText="📍 " + mainPlace;
mainBtn.classList.add("main-location-btn");

/* When clicked → same logic as before */
mainBtn.onclick=()=>{
requestAnimationFrame(()=>{
map.whenReady(()=>{

geocode(mainPlace,true,true);

setTimeout(()=>{
map.invalidateSize();
},200);

});
});
};

list.appendChild(mainBtn);

/* ⭐ SIMILAR LOCATIONS (UNCHANGED) */
recs.forEach(place=>{
const li=document.createElement("li");
li.innerText=place;

li.onclick=()=>geocode(place,true,false);

list.appendChild(li);
});

}
/* =====================================================
   ⭐ CLEAN AI LOCATION NAMES
===================================================== */
function cleanPlaceName(name){

    if(!name) return name;

    /* remove dots, commas at end */
    name = name.replace(/[.,]+$/g,"");

    /* fix known aliases */
    const fixes = {
         "Jetavanaramaya":"Jetavanaramaya Stupa Anuradhapura",
        "Abhayagiri Dagoba":"Abhayagiri Stupa Anuradhapura",
        "Polonnaruwa Gal Vihara":"Gal Viharaya Polonnaruwa",
        "Gal Vihara":"Gal Viharaya Polonnaruwa"
    };

    if(fixes[name]) return fixes[name];

    return name;
}

/* =========================
   GEOCODE  ⭐ CLICK TO LOAD HOTELS
========================= */
async function geocode(place,zoom,isMain){

   place = cleanPlaceName(place);

const queries=[
`${place} Sri Lanka`,
`${place} landmark Sri Lanka`,
`${place} historical site Sri Lanka`
];

let result=null;

/* ⭐ MULTI SEARCH FIX */
for(const q of queries){

try{

const r=await fetch(
`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`
);

const data=await r.json();

if(data && data.length>0){
result=data[0];
break;
}

}catch(e){}
}

if(!result){
console.warn("Location not found:",place);
return;
}

const lat=parseFloat(result.lat);
const lon=parseFloat(result.lon);

/* ⭐ MAIN LOCATION */
if(isMain){

mainLat=lat;
mainLon=lon;

if(mainMarker) map.removeLayer(mainMarker);

mainMarker=L.marker([lat,lon],{icon:redIcon})
.addTo(map)
.bindPopup(`📍 ${place}<br><small>Click to load hotels</small>`);

/* ⭐ LOAD HOTELS WHEN CLICKED */
mainMarker.on("click",()=>{
mainLat=lat;
mainLon=lon;
loadHotels();   // ← uses your existing hotels.js
});

mainMarker.openPopup();

}else{

/* ⭐ SIMILAR LOCATION MARKERS */
const m=L.marker([lat,lon],{icon:blueIcon})
.addTo(map)
.bindPopup(`📍 ${place}<br><small>Click to show nearby hotels</small>`);

/* ⭐ NEW — LOAD HOTELS AROUND THIS LOCATION */
m.on("click",()=>{

mainLat=lat;
mainLon=lon;
context.location=place;

loadHotels();   // ← YOUR EXISTING FUNCTION (NO CHANGES)
});

attractionMarkers.push(m);
}

if(zoom){
map.setView([lat,lon],9);
}

setTimeout(()=>map.invalidateSize(),150);
}

/* =========================
   CHAT
========================= */
function addBot(msg){
const chat=document.getElementById("chatMessages");
chat.innerHTML+=`<div class="bot-msg">${msg}</div>`;
chat.scrollTop=chat.scrollHeight;
}

function clearChat(){
document.getElementById("chatMessages").innerHTML=
`<div class="bot-msg">Chat cleared. Ask me anything about this place.</div>`;
}

function sendChat(){

const input=document.getElementById("chatInput");
if(!input.value) return;

document.getElementById("chatMessages").innerHTML+=
`<div class="user-msg">${input.value}</div>`;

fetch("/chat",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({
message:input.value,
location:context.location,
confidence:context.confidence,
similar:context.recommendations
})
})
.then(r=>r.json())
.then(d=>addBot(d.reply));

input.value="";
}

/* =========================
   NAVIGATION SYSTEM
========================= */
window.addEventListener("DOMContentLoaded",()=>{

const navBtns=document.querySelectorAll(".nav-btn");
const indicator=document.getElementById("navIndicator");
const navLinks=document.getElementById("navLinks");

function moveIndicator(el){
if(!el || !indicator) return;
const rect=el.getBoundingClientRect();
const parent=navLinks.getBoundingClientRect();
indicator.style.width=rect.width+"px";
indicator.style.height=rect.height+"px";
indicator.style.transform=`translateX(${rect.left-parent.left}px)`;
}

navBtns.forEach(btn=>{
btn.addEventListener("click",()=>{
const target=btn.dataset.target;
const el=document.getElementById(target);
if(!el) return;
el.scrollIntoView({behavior:"smooth"});
navBtns.forEach(b=>b.classList.remove("active"));
btn.classList.add("active");
moveIndicator(btn);
});
});

moveIndicator(document.querySelector(".nav-btn.active"));
});

/* =========================
   PROFILE MENU
========================= */
function toggleProfileMenu(){
const menu=document.getElementById("profileMenu");
if(!menu) return;
menu.classList.toggle("show");
}

function logoutUser(){
window.location.href="/logout";
}

document.addEventListener("click",(e)=>{
const wrapper=document.querySelector(".profile-wrapper");
const menu=document.getElementById("profileMenu");
if(!wrapper || !menu) return;
if(!wrapper.contains(e.target)){
menu.classList.remove("show");
}
});

/* =========================
   FINAL MAP STABILITY FIXES
========================= */

/* ⭐ DO NOT RESET context HERE ANYMORE */
window.addEventListener("pageshow",()=>{
processing=false;
setTimeout(()=>map.invalidateSize(),200);
});

window.addEventListener("load",()=>{
setTimeout(()=>map.invalidateSize(),400);
});
/* =========================
   LEADERBOARD NAVIGATION
========================= */
function goLeaderboard(){
    window.location.href="/leaderboard";
}