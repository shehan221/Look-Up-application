/* =====================================================
   ⭐ COMMUNITY REVIEWS MODULE (UPGRADED VERSION)
===================================================== */

let reviewsActive=false;
let reviewsVersion=0;
const selectedRatings={};   // ⭐ rating state per hotel


/* =====================================================
   ⭐ REVIEW TOAST MESSAGE
===================================================== */
function showReviewToast(msg){

    const toast=document.getElementById("reviewToast");

    if(!toast){
        console.warn("Toast element not found");
        alert(msg); // fallback
        return;
    }

    toast.innerText=msg;

    toast.classList.remove("show");  // reset animation
    void toast.offsetWidth;          // force reflow

    toast.classList.add("show");

    setTimeout(()=>{
        toast.classList.remove("show");
    },2500);
}


/* =====================================================
   OPEN REVIEWS PANEL
===================================================== */
function openReviews(){

  const panel=document.getElementById("reviewsPanel");

  if(panel.style.display==="block"){
    panel.style.display="none";
    reviewsActive=false;
    return;
  }

  panel.style.display="block";
  reviewsActive=true;
  reviewsVersion++;

  renderReviewList();
}


/* =====================================================
   RENDER NEARBY HOTELS
===================================================== */
function renderReviewList(){

  const box=document.getElementById("reviewsList");
  box.innerHTML="";

  if(!hotelMarkers || hotelMarkers.length===0){
    box.innerHTML="<div class='reviews-empty'>No nearby hotels loaded yet.</div>";
    return;
  }

  hotelMarkers.forEach(marker=>{

    const name = marker.hotelName || "Unknown Hotel";
    const safeId = name.replace(/\s/g,'_');

    const div=document.createElement("div");
    div.className="review-card";

    div.innerHTML=`
      <h4>${name}</h4>

      <!-- ⭐ STAR SELECTOR -->
      <div class="star-select" id="stars-${safeId}">
        ${renderSelectableStars(name)}
      </div>

      <!-- EXISTING REVIEWS -->
      <div id="rev-${safeId}" class="review-list">
        Hover to load reviews...
      </div>

      <div class="review-input-row">
        <input placeholder="Your review..." id="input-${safeId}">
        <button onclick="submitReview('${name}')">Add Review</button>
      </div>
    `;

    /* ⭐ LOAD REVIEWS ON HOVER */
    div.addEventListener("mouseenter",()=>{
      loadHotelReviews(name);
    });

    box.appendChild(div);
  });
}


/* =====================================================
   ⭐ STAR SELECTOR HTML (TOGGLE ENABLED)
===================================================== */
function renderSelectableStars(hotel){

  const safeId=hotel.replace(/\s/g,'_');

  let html="";

  for(let i=1;i<=5;i++){
    html+=`
      <span class="select-star"
        onclick="setRating('${hotel}',${i})"
        id="star-${safeId}-${i}">
        ☆
      </span>
    `;
  }

  selectedRatings[hotel]=0;   // ⭐ default NONE selected

  return html;
}


/* =====================================================
   ⭐ STAR CLICK (NOW TOGGLEABLE)
===================================================== */
function setRating(hotel,value){

  const safeId=hotel.replace(/\s/g,'_');

  /* ⭐ CLICK SAME STAR AGAIN = REMOVE RATING */
  if(selectedRatings[hotel] === value){
      selectedRatings[hotel]=0;
  }else{
      selectedRatings[hotel]=value;
  }

  for(let i=1;i<=5;i++){

    const star=document.getElementById(`star-${safeId}-${i}`);
    if(!star) continue;

    star.innerHTML = i<=selectedRatings[hotel] ? "⭐" : "☆";
  }
}


/* =====================================================
   LOAD REVIEWS FROM DB
===================================================== */
function loadHotelReviews(hotel){

  fetch("/community/"+encodeURIComponent(hotel))
  .then(r=>r.json())
  .then(list=>{

    const id="rev-"+hotel.replace(/\s/g,'_');
    const box=document.getElementById(id);

    if(!box) return;

    if(!list || list.length===0){
      box.innerHTML="<div class='reviews-empty'>No reviews yet.</div>";
      return;
    }

    box.innerHTML=list.map(r=>{

      const stars="⭐".repeat(r.rating);

      return `
        <div class="review-item">

          <span class="review-delete"
            onclick="deleteReview(this)">✕</span>

          <div class="review-stars">${stars}</div>
          <div class="review-text">${r.review}</div>

        </div>
      `;
    }).join("");

  });
}


/* =====================================================
   ⭐ DELETE REVIEW (FRONTEND ONLY VISUAL)
===================================================== */
function deleteReview(el){

    const item=el.closest(".review-item");
    if(!item) return;

    item.style.opacity="0";
    item.style.transform="translateX(20px)";

    setTimeout(()=>{
        item.remove();
    },200);
}


function submitReview(hotel){

  const safeId = hotel.replace(/\s/g,'_');
  const inputId = "input-" + safeId;

  const input = document.getElementById(inputId);
  if(!input){
      showReviewToast("⚠ Review input not found.");
      return;
  }

  const text = input.value.trim();
  const rating = selectedRatings[hotel] ?? 0;

  /* =========================
     VALIDATION
  ========================= */

  if(text === "" && rating === 0){
      showReviewToast("⚠ Please write a review and select a rating.");
      return;
  }

  if(text === ""){
      showReviewToast("⚠ Please write a review before submitting.");
      return;
  }

  if(rating === 0){
      showReviewToast("⚠ Please select a star rating.");
      return;
  }

  /* =========================
     SUBMIT REVIEW
  ========================= */

  fetch("/community/add",{
    method:"POST",
    headers:{
      "Content-Type":"application/json"
    },
    body:JSON.stringify({
      hotel:hotel,
      rating:rating,
      review:text
    })
  })
  .then(()=>{

    input.value="";
    selectedRatings[hotel]=0;

    setRating(hotel,0);

    showReviewToast("⭐ Review added successfully!");

    loadHotelReviews(hotel);
  })
  .catch(()=>{
      showReviewToast("⚠ Failed to submit review.");
  });
}