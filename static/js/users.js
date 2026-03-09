/* =====================================================
   ⭐ LOOK-UP USERS SYSTEM (FULL SAFE VERSION)
===================================================== */

/* =========================
   Utility Messages
========================= */

function showMessage(elementId, message, type, duration = 5000){

    const messageDiv = document.getElementById(elementId);
    if(!messageDiv) return;

    messageDiv.innerHTML = `
        <span>${message}</span>
        <button class="close-btn"
            onclick="this.parentElement.classList.remove('show')">✕</button>
    `;

    /* ⭐ IMPORTANT FIX */
    messageDiv.className = `message ${type}`;
    messageDiv.classList.add("show");

    if(duration > 0){
        setTimeout(()=>{
            messageDiv.classList.remove("show");
        },duration);
    }
}

/* ⭐ FIXED hideMessage (NO inline display:none) */
function hideMessage(elementId){
    const messageDiv = document.getElementById(elementId);
    if(messageDiv){
        messageDiv.classList.remove("show");
    }
}

/* =========================
   Loading Overlay
========================= */

function showLoading(){
    const el=document.getElementById('loadingOverlay');
    if(el) el.classList.add('active');
}

function hideLoading(){
    const el=document.getElementById('loadingOverlay');
    if(el) el.classList.remove('active');
}

/* =========================
   Input Validation Style
========================= */

function validateInput(input,isValid){

    if(!input) return;

    if(isValid){
        input.classList.remove('error');
        input.classList.add('success');
    }else{
        input.classList.remove('success');
        input.classList.add('error');
    }
}

/* =========================
   PASSWORD STRENGTH
========================= */

const registerPasswordInput=document.getElementById('register_password');
const strengthIndicator=document.getElementById('passwordStrength');
const strengthText=document.getElementById('strengthText');

if(registerPasswordInput){

registerPasswordInput.addEventListener('input',function(){

    const password=this.value;

    if(password.length===0){
        if(strengthIndicator) strengthIndicator.style.display='none';
        if(strengthText) strengthText.style.display='none';
        return;
    }

    if(strengthIndicator) strengthIndicator.style.display='block';
    if(strengthText) strengthText.style.display='block';

    let strength=0;

    if(password.length>=6) strength++;
    if(password.length>=10) strength++;
    if(/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if(/[0-9]/.test(password)) strength++;
    if(/[^a-zA-Z0-9]/.test(password)) strength++;

    strengthIndicator.className='password-strength';

    if(strength<=2){
        strengthIndicator.classList.add('weak');
        strengthText.textContent='Weak password';
        strengthText.style.color='#ef4444';
    }
    else if(strength<=3){
        strengthIndicator.classList.add('medium');
        strengthText.textContent='Medium password';
        strengthText.style.color='#facc15';
    }
    else{
        strengthIndicator.classList.add('strong');
        strengthText.textContent='Strong password';
        strengthText.style.color='#22c55e';
    }
});
}

/* =========================
   LOGIN FORM
========================= */

const loginForm=document.getElementById('loginForm');

if(loginForm){

loginForm.addEventListener('submit',async(e)=>{

    e.preventDefault();

    const btn=document.getElementById('loginBtn');
    const btnText=btn?.querySelector('.btn-text');

    const usernameInput=document.getElementById('login_username');
    const passwordInput=document.getElementById('login_password');

    hideMessage('loginMessage');

    if(!usernameInput.value.trim()){
        showMessage('loginMessage','Please enter your username or email','error');
        validateInput(usernameInput,false);
        return;
    }

    if(!passwordInput.value){
        showMessage('loginMessage','Please enter your password','error');
        validateInput(passwordInput,false);
        return;
    }

    btn.disabled=true;
    if(btnText) btnText.textContent='Logging in...';

    showLoading();

    try{

        const response=await fetch('/api/users/login',{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({
                username_or_email:usernameInput.value.trim(),
                password:passwordInput.value
            })
        });

        const data=await response.json();

        hideLoading();

        if(data.success){

            showMessage('loginMessage',
                data.message || '✓ Login successful! Redirecting...',
                'success',
                0
            );

            validateInput(usernameInput,true);
            validateInput(passwordInput,true);

            setTimeout(()=>{
                window.location.href='/';
            },1500);

        }else{

            showMessage('loginMessage',data.error || 'Login failed','error');

            validateInput(usernameInput,false);
            validateInput(passwordInput,false);

            btn.disabled=false;
            if(btnText) btnText.textContent='Login';
        }

    }catch(error){

        hideLoading();

        showMessage('loginMessage',
            '⚠️ Connection error. Please try again.',
            'error'
        );

        btn.disabled=false;
        if(btnText) btnText.textContent='Login';
    }
});
}

/* =========================
   REGISTER FORM
========================= */

const registerForm=document.getElementById('registerForm');

if(registerForm){

registerForm.addEventListener('submit',async(e)=>{

    e.preventDefault();

    const btn=document.getElementById('registerBtn');
    const btnText=btn?.querySelector('.btn-text');

    const usernameInput=document.getElementById('register_username');
    const fullnameInput=document.getElementById('register_fullname');
    const emailInput=document.getElementById('register_email');
    const passwordInput=document.getElementById('register_password');

    hideMessage('registerMessage');

    if(!usernameInput.value.trim() || usernameInput.value.length<3){
        showMessage('registerMessage','Username must be at least 3 characters','error');
        validateInput(usernameInput,false);
        return;
    }

    if(!fullnameInput.value.trim()){
        showMessage('registerMessage','Please enter your full name','error');
        validateInput(fullnameInput,false);
        return;
    }

    const emailRegex=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if(!emailRegex.test(emailInput.value)){
        showMessage('registerMessage','Please enter a valid email address','error');
        validateInput(emailInput,false);
        return;
    }

    if(passwordInput.value.length<6){
        showMessage('registerMessage','Password must be at least 6 characters','error');
        validateInput(passwordInput,false);
        return;
    }

    btn.disabled=true;
    if(btnText) btnText.textContent='Creating Account...';

    showLoading();

    try{

        const response=await fetch('/api/users/register',{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({
                username:usernameInput.value.trim(),
                full_name:fullnameInput.value.trim(),
                email:emailInput.value.trim(),
                password:passwordInput.value
            })
        });

        const data=await response.json();

        hideLoading();

        if(data.success){

            showMessage('registerMessage',
                data.message || '✓ Registration successful!',
                'success',
                8000
            );

            registerForm.reset();

            [usernameInput,fullnameInput,emailInput,passwordInput]
            .forEach(i=>i.classList.remove('error','success'));

            if(strengthIndicator) strengthIndicator.style.display='none';
            if(strengthText) strengthText.style.display='none';

        }else{

            showMessage('registerMessage',data.error || 'Registration failed','error');

            if(data.error.includes('Username')) validateInput(usernameInput,false);
            if(data.error.includes('Email')) validateInput(emailInput,false);
        }

    }catch(error){

        hideLoading();

        showMessage('registerMessage',
            '⚠️ Connection error. Please try again.',
            'error'
        );

    }finally{

        btn.disabled=false;
        if(btnText) btnText.textContent='Register';
    }
});
}

/* =========================
   REALTIME INPUT VALIDATION
========================= */

document.querySelectorAll('input').forEach(input=>{

    input.addEventListener('blur',function(){
        if(this.value.trim()){
            validateInput(this,this.checkValidity());
        }
    });

    input.addEventListener('input',function(){
        this.classList.remove('error','success');
    });
});
