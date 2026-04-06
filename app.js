import { scenarios } from './data.js';

// --- State Management ---
let currentScenario = null;
let currentPhraseIndex = 0;
let isRecording = false;

// --- DOM Elements ---
const sections = document.querySelectorAll('.view-section');
const navLinks = document.querySelectorAll('.nav-link');
const scenarioGrid = document.getElementById('scenario-grid');
const practiceView = document.getElementById('practice-view');
const dashView = document.getElementById('dashboard');
const aiView = document.getElementById('ai-view');

// Practice View Elements
const btnBack = document.getElementById('back-to-dashboard');
const phrasePt = document.getElementById('phrase-pt');
const phraseEn = document.getElementById('phrase-en');
const btnListen = document.getElementById('btn-listen');
const btnNext = document.getElementById('btn-next');
const progressInner = document.getElementById('progress-inner');
const practiceIcon = document.getElementById('practice-icon');
const practiceTitle = document.getElementById('practice-title');
const roleplayText = document.getElementById('roleplay-text');
const keywordsList = document.getElementById('keywords-list');
const activeWordLabel = document.querySelector('#active-word-label span');

// Chat Elements
const chatHistory = document.getElementById('chat-history');
const chatInput = document.getElementById('chat-input');
const btnSendChat = document.getElementById('btn-send-chat');
const btnVoiceChat = document.getElementById('btn-voice-chat');

// --- Navigation ---
function showView(viewId) {
    sections.forEach(s => s.classList.remove('active'));
    const el = document.getElementById(viewId + '-view') || document.getElementById(viewId);
    if (el) el.classList.add('active');
    
    // Update nav-link active state
    navLinks.forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === `#${viewId}`);
    });

    // Special case for dashboard
    if (viewId === 'dashboard') {
        dashView.classList.add('active');
        aiView.classList.remove('active');
        practiceView.classList.remove('active');
    }
}

navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const id = link.getAttribute('href').substring(1);
        showView(id);
    });
});

btnBack.addEventListener('click', () => showView('dashboard'));

// --- Scenario Rendering ---
function renderScenarios() {
    scenarioGrid.innerHTML = '';
    scenarios.forEach(s => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <span class="scenario-emoji">${s.icon}</span>
            <h3 class="card-title">${s.portugueseTitle}</h3>
            <p class="card-subtitle">${s.title}</p>
        `;
        card.onclick = () => startPractice(s);
        scenarioGrid.appendChild(card);
    });
}

// --- Practice Logic ---
function startPractice(scenario) {
    currentScenario = scenario;
    currentPhraseIndex = 0;
    showView('practice');
    
    practiceIcon.textContent = scenario.icon;
    practiceTitle.textContent = scenario.portugueseTitle;
    roleplayText.textContent = scenario.roleplay;
    
    renderKeywords();
    selectKeyword(0);
}

function renderKeywords() {
    keywordsList.innerHTML = '';
    currentScenario.keywords.forEach((kw, index) => {
        const li = document.createElement('li');
        li.className = 'keyword-item';
        if (index === currentPhraseIndex) li.classList.add('active');
        li.textContent = kw.word;
        li.onclick = () => selectKeyword(index);
        keywordsList.appendChild(li);
    });
}

function selectKeyword(index) {
    currentPhraseIndex = index;
    const kw = currentScenario.keywords[index];
    
    // Update UI
    activeWordLabel.textContent = kw.word;
    phrasePt.textContent = kw.ex;
    phraseEn.textContent = kw.en;
    
    // Update active state in sidebar
    document.querySelectorAll('.keyword-item').forEach((item, i) => {
        item.classList.toggle('active', i === index);
    });

    // Update progress
    const progress = ((index + 1) / currentScenario.keywords.length) * 100;
    progressInner.style.width = `${progress}%`;

    // Handle button text
    if (index === currentScenario.keywords.length - 1) {
        btnNext.textContent = "Finish & Return";
    } else {
        btnNext.textContent = "Next Word →";
    }

    // Scroll sidebar to active item
    const activeItem = keywordsList.children[index];
    if (activeItem) {
        activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

btnNext.onclick = () => {
    if (currentPhraseIndex < currentScenario.keywords.length - 1) {
        selectKeyword(currentPhraseIndex + 1);
    } else {
        showView('dashboard');
    }
};

// --- Audio & Speech ---

// Text To Speech (TTS)
function speak(text) {
    if (!('speechSynthesis' in window)) {
        alert("Sorry, your browser doesn't support speech synthesis.");
        return;
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-PT';
    
    // Find a European Portuguese voice
    const voices = window.speechSynthesis.getVoices();
    const ptVoice = voices.find(v => v.lang === 'pt-PT' || v.lang === 'pt_PT');
    if (ptVoice) utterance.voice = ptVoice;
    
    window.speechSynthesis.speak(utterance);
}

btnListen.onclick = () => {
    speak(phrasePt.textContent);
};

// Speech Recognition (STT) for Chat/Practice
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;

if (Recognition) {
    recognition = new Recognition();
    recognition.lang = 'pt-PT';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        chatInput.value = transcript;
        addMessage('user', transcript);
        isRecording = false;
        btnVoiceChat.textContent = '🎙️';
        handleAssistantReply(transcript);
    };

    recognition.onerror = () => {
        isRecording = false;
        btnVoiceChat.textContent = '🎙️';
    };
}

btnVoiceChat.onclick = () => {
    if (!recognition) {
        alert("Speech recognition not supported in this browser.");
        return;
    }
    if (isRecording) {
        recognition.stop();
        isRecording = false;
        btnVoiceChat.textContent = '🎙️';
    } else {
        recognition.start();
        isRecording = true;
        btnVoiceChat.textContent = '🛑';
    }
};

// --- AI Chat Logic ---
function addMessage(sender, text) {
    const msg = document.createElement('div');
    msg.className = `message ${sender}`;
    msg.textContent = text;
    chatHistory.appendChild(msg);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

async function handleAssistantReply(userMsg) {
    // Add a "thinking" state
    const thinkingMsg = document.createElement('div');
    thinkingMsg.className = 'message assistant thinking';
    thinkingMsg.textContent = '...A pensar';
    chatHistory.appendChild(thinkingMsg);
    chatHistory.scrollTop = chatHistory.scrollHeight;

    try {
        const response = await fetch('http://localhost:8001/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: userMsg })
        });

        if (!response.ok) throw new Error('Falha na ligação ao tutor.');
        
        const data = await response.json();
        chatHistory.removeChild(thinkingMsg);
        
        addMessage('assistant', data.reply);
        speak(data.reply);
    } catch (error) {
        console.error(error);
        chatHistory.removeChild(thinkingMsg);
        addMessage('assistant', "Desculpa, tive um problema técnico. Podes tentar de novo?");
    }
}

btnSendChat.onclick = () => {
    const msg = chatInput.value.trim();
    if (msg) {
        addMessage('user', msg);
        chatInput.value = '';
        handleAssistantReply(msg);
    }
};

chatInput.onkeypress = (e) => {
    if (e.key === 'Enter') btnSendChat.click();
};

// Initialize
renderScenarios();
showView('dashboard');

// Ensure voices are loaded
window.speechSynthesis.onvoiceschanged = () => {
    // Voices loaded
};
