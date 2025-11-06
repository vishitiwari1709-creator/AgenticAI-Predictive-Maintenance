/* ========== STATE ========== */
let currentRole = '';
const chatbox = document.getElementById('chatbox-container');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const mainContainer = document.getElementById('main-container') || document.getElementById('tech-container') || document.getElementById('mgr-container');
const defaultAIWelcome = 'Hello! I am your AI Assistant. Ask me about services, faults, DTCs, or KPIs.';

/* ========== VIEW MANAGEMENT ========== */
function setView(viewId){
    document.getElementById('login-view').style.display = 'none';
    document.getElementById('owner-view').style.display = 'none';
    document.getElementById('technician-view').style.display = 'none';
    document.getElementById('manager-view').style.display = 'none';
    document.getElementById(viewId).style.display = (viewId==='login-view') ? 'flex' : 'block';

    if(viewId !== 'login-view'){
        chatbox.style.display = 'flex';
        document.body.classList.add('with-chat'); // add body-level spacing
        // ensure container(s) leave space
        document.querySelectorAll('.container').forEach(c=>c.classList.add('with-chat'));
        chatMessages.innerHTML = `<div class="message-ai">${escapeHtml(defaultAIWelcome)}</div>`;
    } else {
        chatbox.style.display = 'none';
        document.body.classList.remove('with-chat');
        document.querySelectorAll('.container').forEach(c=>c.classList.remove('with-chat'));
    }
}

function showLoginForm(role){
    currentRole = role;
    document.getElementById('form-title').textContent = `${role} Login`;
    document.getElementById('role-login-form').style.display = 'block';
    // prefill example emails
    const e = document.getElementById('email');
    if(role==='Owner') e.value='owner@example.com';
    if(role==='Technician') e.value='technician@company.com';
    if(role==='Manager') e.value='manager@company.com';
}

function hideLoginForm(){ document.getElementById('role-login-form').style.display='none'; currentRole=''; }

function simulateLogin(){
    const pw = document.getElementById('password').value || '';
    if(pw === 'password'){
        if(currentRole === 'Owner') setView('owner-view');
        else if(currentRole === 'Technician') setView('technician-view');
        else if(currentRole === 'Manager') setView('manager-view');
    } else { alert('Invalid Credentials. Hint: password'); }
}

function logout(){
    currentRole='';
    hideLoginForm();
    setView('login-view');
}

/* ========== MODALS ========== */
function openFaultModal(){ document.getElementById('faultModal').style.display='flex'; }
function closeFaultModal(){ document.getElementById('faultModal').style.display='none'; }
function openServiceModal(){ document.getElementById('serviceModal').style.display='flex'; }
function closeServiceModal(){ document.getElementById('serviceModal').style.display='none'; }

/* ========== CHAT UI ========== */
function toggleChatbox(){
    chatbox.classList.toggle('minimized');
    document.getElementById('chatbox-toggle').textContent = chatbox.classList.contains('minimized') ? '⬆' : '–';
}
function appendUserMessage(text){
    const d = document.createElement('div'); d.className='message-user'; d.textContent = text; chatMessages.appendChild(d); chatMessages.scrollTop = chatMessages.scrollHeight;
}
function appendAIMessage(text){
    const d = document.createElement('div'); d.className='message-ai'; d.innerHTML = escapeHtml(text).replace(/\n/g,'<br/>'); chatMessages.appendChild(d); chatMessages.scrollTop = chatMessages.scrollHeight;
}

function sendMessage(){
    const txt = chatInput.value.trim();
    if(!txt) return;
    appendUserMessage(txt);
    chatInput.value = '';
    // emulate quick processing
    setTimeout(()=>{
        const reply = getAIResponse(txt);
        appendAIMessage(reply);
        speakText(reply);
    }, 350);
}

/* ========== SIMPLE RULE-BASED AI RESPONSES (local) ========== */
function getAIResponse(query){
    const q = query.toLowerCase();
    if(!currentRole) return "Please login to access role-specific tools.";
    if(currentRole === 'Owner'){
        if(q.includes('oil')) return "Your next oil change is due in 2,850 km. Use 'Book Service' to schedule.";
        if(q.includes('check engine') || q.includes('check-engine') || q.includes('checkengine')) return "Check Engine Light requires professional diagnosis. Use 'Report a Fault'.";
        return "I am checking your owner's manual. For urgent issues use 'Report a Fault'.";
    } else if(currentRole === 'Technician'){
        if(q.includes('p0a08') || q.includes('p0 a08')) return "DTC P0A08 (DC/DC Converter) — STOP. Ensure HV safety disconnect and 5 minute discharge per SOP V2.2.";
        if(q.includes('torque')) return "Standard wheel lug nut torque: 120 Nm. Verify vehicle-specific spec before final tightening.";
        return "Searching technical documentation. Which part number or DTC do you want details for?";
    } else if(currentRole === 'Manager'){
        if(q.includes('safety')) return "Safety compliance is at 98%. Focus on clearing the 7 overdue EV certifications to reach 100%.";
        if(q.includes('kpi')) return "Which KPI? You can ask about 'training', 'alerts', or 'avg resolution time'.";
        return "Filtering KPI data — specify metric (training, alerts, faults).";
    }
    return "I couldn't understand that — ask again using simpler terms.";
}

/* ========== TEXT-TO-SPEECH ========== */
function speakText(text){
    if(!('speechSynthesis' in window)) return;
    // cancel any existing speech
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    // optional voice selection: pick first English voice if available
    const voices = window.speechSynthesis.getVoices();
    if(voices && voices.length){
        const en = voices.find(v => /en/i.test(v.lang)) || voices[0];
        if(en) utter.voice = en;
    }
    utter.rate = 1;
    utter.pitch = 1;
    window.speechSynthesis.speak(utter);
}

/* ========== SPEECH-TO-TEXT (SpeechRecognition) ========== */
let recognition = null;
let recognizing = false;
const micBtn = document.getElementById('mic-btn');

function initSpeechRecognition(){
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition || null;
    if(!SpeechRecognition) {
        micBtn.title = 'Speech Recognition not supported in this browser';
        micBtn.disabled = true;
        micBtn.style.opacity = 0.5;
        return;
    }
    recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = ()=>{ recognizing = true; micBtn.textContent = '🎤●'; micBtn.setAttribute('aria-pressed','true'); }
    recognition.onend = ()=>{ recognizing = false; micBtn.textContent = '🎤'; micBtn.setAttribute('aria-pressed','false'); }
    recognition.onerror = (e)=>{ console.warn('SpeechRecognition error', e); recognizing=false; micBtn.textContent='🎤'; micBtn.setAttribute('aria-pressed','false'); }
    recognition.onresult = (event)=>{
        const spoken = event.results[0][0].transcript;
        // place into chat and trigger send
        chatInput.value = spoken;
        appendUserMessage(spoken);
        // small delay then reply (so it looks natural)
        setTimeout(()=>{ const reply = getAIResponse(spoken); appendAIMessage(reply); speakText(reply); }, 300);
    };
}

function toggleMic(){
    if(!recognition) initSpeechRecognition();
    if(!recognition) { alert('SpeechRecognition not supported in this browser.'); return; }
    if(recognizing){
        recognition.stop();
    } else {
        recognition.start();
    }
}

/* ========== HELPERS ========== */
function escapeHtml(unsafe){
    return (unsafe+'').replace(/[&<>"'`]/g, function(m){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;',"`":'&#096;'}[m]; });
}

/* ========== Init ========== */
document.addEventListener('DOMContentLoaded', ()=>{
    setView('login-view');
    initSpeechRecognition();
    // ensure voices load (some browsers populate asynchronously)
    window.speechSynthesis.getVoices();
    // make chat accessible via keyboard: open when logged in
});

/* ========== Accessibility: keyboard toggle for chat via Ctrl+M ==========
document.addEventListener('keydown',(e)=>{
    if(e.ctrlKey && e.key.toLowerCase()==='m'){
        if(chatbox.style.display==='flex') toggleChatbox();
    }
});
========== */
