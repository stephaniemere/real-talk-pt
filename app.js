import { scenarios } from './data.js';

// --- Configuration ---
// When developing locally, it uses localhost. In production, you must update the URL below.
const BACKEND_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8001'
    : 'https://YOUR_BACKEND_SERVICE_URL_HERE'; 

// --- State Management ---
let currentScenario = null;
let currentPhraseIndex = 0;
let isRecording = false;

// --- Global Audio Logic ---
const speak = (text) => {
    if (!('speechSynthesis' in window)) return;
    
    // Cancel any current speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-PT';
    
    // Find a European Portuguese voice
    const voices = window.speechSynthesis.getVoices();
    const ptVoice = voices.find(v => v.lang === 'pt-PT' || v.lang === 'pt_PT');
    
    if (ptVoice) {
        utterance.voice = ptVoice;
    }

    // Set some defaults for clearer pronunciation
    utterance.rate = 0.9; 
    utterance.pitch = 1.0;

    window.speechSynthesis.speak(utterance);
};

// Expose immediately for HTML onclicks
window.speak = speak;

// --- DOM Elements ---
const sections = document.querySelectorAll('.view-section');
const navLinks = document.querySelectorAll('.nav-link');
const categoryGrid = document.getElementById('category-grid');
const topicGrid = document.getElementById('topic-grid');
const practiceView = document.getElementById('practice-view');
const dashView = document.getElementById('dashboard');
const aiView = document.getElementById('ai-view');

// Practice View Elements
const btnBackToCategory = document.getElementById('back-to-dashboard');
const practiceIcon = document.getElementById('practice-icon');
const practiceTitle = document.getElementById('practice-title');
const roleplayText = document.getElementById('roleplay-text');
const keywordsList = document.getElementById('keywords-list');

// Chat Elements
const chatHistory = document.getElementById('chat-history');
const chatInput = document.getElementById('chat-input');
const btnSendChat = document.getElementById('btn-send-chat');
const btnVoiceChat = document.getElementById('btn-voice-chat');

// Vocab View Elements
const vocabList = document.getElementById('vocab-list');
const vocabSearch = document.getElementById('vocab-search');
let allKeywords = [];

// Lesson State
let currentStepIndex = 1; // 1 to 6
const cardContentArea = document.getElementById('card-content-area');
const stepIndicator = document.getElementById('step-indicator');
const stepFill = document.getElementById('lesson-step-fill');
const btnNextStep = document.getElementById('btn-next-step');
const btnPrevStep = document.getElementById('btn-prev-step');

// Global Helper for Home CTA
window.startBeginnerLesson = function() {
    showCategoryDetail('beginners');
};

// --- Navigation ---
function showView(viewId) {
    sections.forEach(s => s.classList.remove('active'));
    
    // Hide all view sub-sections
    document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));

    const el = document.getElementById(viewId + '-view') || document.getElementById(viewId);
    if (el) el.classList.add('active');
    
    // Update nav-link active state
    navLinks.forEach(link => {
        const href = link.getAttribute('href').substring(1);
        link.classList.toggle('active', href === viewId);
    });

    if (viewId === 'dashboard') {
        renderCategories();
    }
    
    if (viewId === 'vocab') {
        renderMasterVocab();
    }

    window.scrollTo(0, 0);
}

navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const id = link.getAttribute('href').substring(1);
        showView(id);
    });
});

// --- Topic & Category Management ---

function renderCategories() {
    categoryGrid.innerHTML = '';

    const cats = [
        { id: 'beginners', title: 'Beginners Portuguese', icon: '🚀', desc: 'No grammar, just speak. Essential greetings, connectors, and questions.' },
        { id: 'everyday', title: 'Every Day Conversation', icon: '💬', desc: 'Survival phrases for weather, family, hobbies, and directions.' },
        { id: 'reallife', title: 'Real-Life Situations', icon: '🛒', desc: 'Practical context for shopping, dining, and navigating Portuguese stores.' }
    ];

    cats.forEach(c => {
        const div = document.createElement('div');
        div.className = 'category-box';
        div.innerHTML = `
            <div class="category-icon">${c.icon}</div>
            <h3>${c.title}</h3>
            <p>${c.desc}</p>
        `;
        div.onclick = () => showCategoryDetail(c.id);
        categoryGrid.appendChild(div);
    });
}

function showCategoryDetail(catId) {
    const detailTitle = document.getElementById('category-view-title');
    
    // Set Title
    const titles = {
        'beginners': 'Beginners Portuguese',
        'everyday': 'Every Day Conversation',
        'reallife': 'Real-Life Situations'
    };
    if (detailTitle) detailTitle.textContent = titles[catId];

    topicGrid.innerHTML = '';
    const catScenarios = scenarios.filter(s => s.category === catId);
    
    catScenarios.forEach(s => {
        const card = document.createElement('div');
        card.className = 'card topic-card';
        card.innerHTML = `
            <span class="scenario-emoji">${s.icon}</span>
            <h3>${s.portugueseTitle}</h3>
            <p>${s.title}</p>
        `;
        card.onclick = () => startPractice(s);
        topicGrid.appendChild(card);
    });

    showView('category-detail');
}

// Global Help Click Events
document.addEventListener('click', (e) => {
    if (e.target.id === 'back-to-categories') {
        showView('dashboard');
    }
    if (e.target.id === 'back-to-dashboard') {
        // From Lesson back to Category Detail
        showCategoryDetail(currentScenario.category);
    }
});

// --- Lesson Engine ---

function startPractice(scenario) {
    currentScenario = scenario;
    currentPhraseIndex = 0;
    currentStepIndex = 1;
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
    currentStepIndex = 1; // Reset to card 1
    
    const kw = currentScenario.keywords[index];
    
    // Update active state in sidebar
    document.querySelectorAll('.keyword-item').forEach((item, i) => {
        item.classList.toggle('active', i === index);
    });

    // Scroll sidebar to active item
    const activeItem = keywordsList.children[index];
    if (activeItem) {
        activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    updateLessonUI();
}

function updateLessonUI() {
    const kw = currentScenario.keywords[currentPhraseIndex];
    
    // Step Progress
    const progress = (currentStepIndex / 6) * 100;
    if (stepFill) stepFill.style.width = `${progress}%`;
    if (stepIndicator) stepIndicator.textContent = `Step ${currentStepIndex} of 6`;

    // Button states
    btnPrevStep.disabled = (currentStepIndex === 1);
    btnNextStep.textContent = (currentStepIndex === 6) ? "Next Word →" : "Next Step →";

    // Clear and Render Card
    cardContentArea.innerHTML = '';
    
    switch(currentStepIndex) {
        case 1: renderStep1(kw); break;
        case 2: renderStep2(kw); break;
        case 3: renderStep3(kw); break;
        case 4: renderStep4(kw); break;
        case 5: renderStep5(kw); break;
        case 6: renderStep6(kw); break;
    }
}

function renderStep1(kw) {
    cardContentArea.innerHTML = `
        <span class="card-type-label">Card 1: Listen & Repeat</span>
        <h2 class="lesson-word">${kw.word}</h2>
        <p class="lesson-translation">${kw.en_word || kw.en || '...'}</p>
        <button class="btn btn-primary btn-lg" onclick="speak('${kw.word.replace(/'/g, "\\'")}')">🔊 Listen</button>
    `;
    speak(kw.word);
}

function renderStep2(kw) {
    const sentences = kw.lessons?.[1]?.items || (kw.ex ? [{ pt: kw.ex, en: kw.en }] : []);
    let html = `<span class="card-type-label">Card 2: In a Sentence</span>
                <p class="text-muted mb-4">Click to hear the sentence</p>
                <div class="sentence-list">`;
    
    if (sentences.length === 0) {
        html += `<div class="sentence-item">More example sentences coming soon!</div>`;
    }

    sentences.forEach(s => {
        html += `
            <div class="sentence-item" onclick="speak('${s.pt.replace(/'/g, "\\'")}')">
                <div class="portuguese"><strong>${s.pt}</strong></div>
                <div class="english">${s.en}</div>
            </div>
        `;
    });
    html += `</div>`;
    cardContentArea.innerHTML = html;
}

function renderStep3(kw) {
    const breakdown = kw.lessons?.[2]?.items || [];
    let html = `<span class="card-type-label">Card 3: Breakdown</span>
                <p class="text-muted mb-4">Focus on the components</p>
                <div class="breakdown-grid">`;
    
    if (breakdown.length === 0) {
        html += `<div class="sentence-item" style="width:100%">Detailed breakdown coming soon!</div>`;
    }

    breakdown.forEach(item => {
        html += `
            <div class="breakdown-box" onclick="speak('${item.pt.replace(/'/g, "\\'")}')">
                <span class="portuguese">${item.pt}</span>
                <span class="english">${item.en}</span>
            </div>
        `;
    });
    html += `</div>`;
    cardContentArea.innerHTML = html;
}

function renderStep4(kw) {
    const variety = kw.lessons?.[3]?.items || [];
    let html = `<span class="card-type-label">Card 4: Variety & Variations</span>
                <div class="sentence-list">`;
    
    if (variety.length === 0) {
        html += `<div class="sentence-item">More variations coming soon!</div>`;
    }

    variety.forEach(v => {
        html += `<div class="sentence-item" onclick="speak('${v.pt.replace(/'/g, "\\'")}')">
                    <strong>${v.pt}</strong><br><small>${v.en}</small>
                 </div>`;
    });
    html += `</div>`;
    cardContentArea.innerHTML = html;
}

function renderStep5(kw) {
    const game = kw.lessons?.[4] || (kw.ex ? { 
        sentence: kw.ex.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,""), 
        words: kw.ex.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"").split(' ').filter(w => w.length > 0)
    } : null);

    if (!game) {
        cardContentArea.innerHTML = `<span class="card-type-label">Card 5: Build a Sentence</span>
                                    <div class="sentence-item">Game coming soon for this word!</div>`;
        return;
    }

    let html = `<span class="card-type-label">Card 5: Build a Sentence</span>
                <div id="game-solution" class="game-solution-area"></div>
                <div id="game-pool" class="game-word-pool"></div>`;
    
    cardContentArea.innerHTML = html;
    initGame(game);
}

let gameUserWords = [];
function initGame(game) {
    const pool = document.getElementById('game-pool');
    const solution = document.getElementById('game-solution');
    gameUserWords = [];
    
    const shuffled = [...game.words].sort(() => Math.random() - 0.5);
    
    shuffled.forEach(word => {
        const btn = document.createElement('button');
        btn.className = 'word-bubble';
        btn.textContent = word;
        btn.onclick = () => {
            btn.classList.add('used');
            gameUserWords.push(word);
            const span = document.createElement('span');
            span.className = 'solution-word';
            span.textContent = word + ' ';
            solution.appendChild(span);
            
            if (gameUserWords.length === game.words.length) {
                if (gameUserWords.join(' ') === game.sentence) {
                    solution.style.color = '#10B981';
                    speak(game.sentence);
                } else {
                    solution.style.color = '#EF4444';
                    setTimeout(() => {
                        solution.innerHTML = '';
                        solution.style.color = 'inherit';
                        gameUserWords = [];
                        document.querySelectorAll('.word-bubble').forEach(b => b.classList.remove('used'));
                    }, 1500);
                }
            }
        };
        pool.appendChild(btn);
    });
}

function renderStep6(kw) {
    const tip = kw.lessons?.[5]?.content || "Listen and repeat until it feels natural!";
    cardContentArea.innerHTML = `
        <span class="card-type-label">Card 6: Quick Tip</span>
        <div class="tip-box">
            <p>${tip}</p>
        </div>
        <p class="mt-4 text-muted">Lesson finished! Ready for the next word?</p>
    `;
}

btnNextStep.onclick = () => {
    if (currentStepIndex < 6) {
        currentStepIndex++;
        updateLessonUI();
    } else {
        if (currentPhraseIndex < currentScenario.keywords.length - 1) {
            selectKeyword(currentPhraseIndex + 1);
        } else {
            showCategoryDetail(currentScenario.category);
        }
    }
};

btnPrevStep.onclick = () => {
    if (currentStepIndex > 1) {
        currentStepIndex--;
        updateLessonUI();
    }
};

// --- Chat & AI Tutor ---

function addMessage(role, text) {
    const msg = document.createElement('div');
    msg.className = `message ${role}`;
    msg.textContent = text;
    chatHistory.appendChild(msg);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

async function handleAssistantReply(userMsg) {
    const thinkingMsg = document.createElement('div');
    thinkingMsg.className = 'message assistant thinking';
    thinkingMsg.textContent = '...A pensar';
    chatHistory.appendChild(thinkingMsg);
    chatHistory.scrollTop = chatHistory.scrollHeight;

    try {
        const response = await fetch(`${BACKEND_URL}/chat`, {
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
        
        // Fallback for static demo
        const fallbacks = [
            "Olá! Falas muito bem. Queres praticar mais?",
            "Com certeza! Podes repetir essa frase?",
            "Interessante! Como se diz isso na tua língua?",
            "Fantástico! Estás a fazer um excelente progresso."
        ];
        const randomReply = fallbacks[Math.floor(Math.random() * fallbacks.length)];
        
        setTimeout(() => {
            addMessage('assistant', randomReply);
            speak(randomReply);
        }, 1000);
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

// --- Vocab List ---

function initMasterVocab() {
    allKeywords = [];
    scenarios.forEach(s => {
        s.keywords.forEach(kw => {
            allKeywords.push({
                ...kw,
                category: s.portugueseTitle,
                catId: s.id
            });
        });
    });

    allKeywords.sort((a, b) => a.word.localeCompare(b.word, 'pt'));
}

function renderMasterVocab(filter = '') {
    vocabList.innerHTML = '';
    const filtered = allKeywords.filter(kw => 
        kw.word.toLowerCase().includes(filter.toLowerCase()) || 
        (kw.en && kw.en.toLowerCase().includes(filter.toLowerCase()))
    );

    filtered.forEach(kw => {
        const card = document.createElement('div');
        card.className = 'vocab-card';
        card.innerHTML = `
            <div class="vocab-row">
                <span class="vocab-pt">${kw.word}</span>
                <button class="btn-speaker" onclick="speak('${kw.word.replace(/'/g, "\\'")}')">🔊</button>
            </div>
            <span class="vocab-en">${kw.en || ''}</span>
            <span class="vocab-cat">${kw.category}</span>
        `;
        vocabList.appendChild(card);
    });
}

vocabSearch.oninput = (e) => {
    renderMasterVocab(e.target.value);
};

// --- Initialization ---
initMasterVocab();
renderCategories();
showView('home');

// Ensure voices are loaded
window.speechSynthesis.onvoiceschanged = () => {
    // Voices loaded
};
