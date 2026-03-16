// ==================== Globale Variablen & Konfiguration ====================
let map;
let currentTerm = null;
let currentMode = 'learn'; // 'learn', 'quiz', 'mc'
let currentCategory = 'alle';
let currentDifficulty = 'all';
let currentUser = null;
let userProfile = null;
let allTerms = [];
let markers = [];
let mcMarkers = [];
let mcCorrectIndex = -1;

// Bunny.net Konfiguration (aus config.js)
const BUNNY_ENABLED = typeof BUNNY_CONFIG !== 'undefined' && BUNNY_CONFIG.accessKey;

// ==================== Initialisierung ====================
async function init() {
    // Karte initialisieren
    map = L.map('map').setView([20, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    // Daten laden
    await loadGeoData();

    // Events
    document.getElementById('login-btn').addEventListener('click', login);
    document.getElementById('logout-btn').addEventListener('click', logout);
    document.getElementById('category').addEventListener('change', (e) => {
        currentCategory = e.target.value;
        if (currentUser) refreshView();
    });
    document.getElementById('mode-learn').addEventListener('click', () => setMode('learn'));
    document.getElementById('mode-quiz').addEventListener('click', () => setMode('quiz'));
    document.getElementById('mode-mc').addEventListener('click', () => setMode('mc'));
    document.getElementById('difficulty').addEventListener('change', (e) => {
        currentDifficulty = e.target.value;
        if (currentUser) refreshView();
    });
    document.getElementById('reset-progress').addEventListener('click', resetProgress);
    document.getElementById('next-question').addEventListener('click', nextQuestion);

    // Prüfen, ob ein letzter Benutzer im localStorage gespeichert ist
    const lastUser = localStorage.getItem('lastUser');
    if (lastUser) {
        document.getElementById('username-input').value = lastUser;
        login(); // automatisch anmelden
    }
}

// ==================== Daten laden ====================
async function loadGeoData() {
    try {
        const response = await fetch('data/geodata.json');
        allTerms = await response.json();
        // Jeder Begriff bekommt eine eindeutige ID (den Namen)
        updateProgressSummary();
    } catch (error) {
        console.error('Fehler beim Laden der Geodaten:', error);
    }
}

// ==================== Benutzerverwaltung ====================
async function login() {
    const username = document.getElementById('username-input').value.trim();
    if (!username) return;

    currentUser = username;
    document.getElementById('current-user').textContent = `Angemeldet als ${username}`;
    document.getElementById('login-btn').style.display = 'none';
    document.getElementById('username-input').style.display = 'none';
    document.getElementById('logout-btn').style.display = 'inline-block';
    localStorage.setItem('lastUser', username);

    // Profil laden (von bunny.net oder localStorage)
    await loadUserProfile(username);

    refreshView();
}

function logout() {
    currentUser = null;
    userProfile = null;
    document.getElementById('current-user').textContent = '';
    document.getElementById('login-btn').style.display = 'inline-block';
    document.getElementById('username-input').style.display = 'inline-block';
    document.getElementById('logout-btn').style.display = 'none';
    localStorage.removeItem('lastUser');
    clearMarkers();
    document.getElementById('current-term').textContent = '';
}

async function loadUserProfile(username) {
    // Zuerst versuchen, von bunny.net zu laden (falls konfiguriert)
    let profile = null;
    if (BUNNY_ENABLED) {
        profile = await loadFromBunny(username);
    }
    // Fallback: localStorage
    if (!profile) {
        profile = loadFromLocalStorage(username);
    }
    // Wenn immer noch nichts, neues Profil anlegen
    if (!profile) {
        profile = {
            username: username,
            created: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            stats: {}
        };
    } else {
        profile.lastLogin = new Date().toISOString();
    }
    userProfile = profile;
    // Profil speichern (aktualisiert lastLogin)
    saveUserProfile();
}

function loadFromLocalStorage(username) {
    const key = `profile_${username}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
}

async function loadFromBunny(username) {
    try {
        const url = `${BUNNY_CONFIG.endpoint}/${BUNNY_CONFIG.storageZone}/users/${username}.json`;
        const response = await fetch(url, {
            headers: { 'AccessKey': BUNNY_CONFIG.accessKey }
        });
        if (response.ok) {
            return await response.json();
        }
    } catch (e) {
        console.warn('Bunny.net Fehler, verwende localStorage-Fallback', e);
    }
    return null;
}

async function saveUserProfile() {
    if (!userProfile) return;
    // Zuerst in localStorage speichern (immer)
    const key = `profile_${userProfile.username}`;
    localStorage.setItem(key, JSON.stringify(userProfile));

    // Dann in bunny.net speichern (falls möglich)
    if (BUNNY_ENABLED) {
        await saveToBunny(userProfile);
    }
}

async function saveToBunny(profile) {
    try {
        const filename = `${profile.username}.json`;
        const url = `${BUNNY_CONFIG.endpoint}/${BUNNY_CONFIG.storageZone}/users/${filename}`;
        const blob = new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' });
        await fetch(url, {
            method: 'PUT',
            headers: {
                'AccessKey': BUNNY_CONFIG.accessKey,
                'Content-Type': 'application/json'
            },
            body: blob
        });
    } catch (e) {
        console.warn('Fehler beim Speichern in bunny.net', e);
    }
}

// ==================== Fortschrittslogik ====================
function getTermLevel(termId) {
    if (!userProfile || !userProfile.stats[termId]) return 0;
    const stat = userProfile.stats[termId];
    const total = stat.correct + stat.wrong;
    if (total === 0) return 0;
    const ratio = stat.correct / total;
    if (stat.correct >= 20 && ratio > 0.9) return 5;
    if (stat.correct >= 10 && ratio > 0.8) return 4;
    if (stat.correct >= 6 && ratio > 0.7) return 3;
    if (stat.correct >= 3 && ratio > 0.5) return 2;
    if (stat.correct >= 1) return 1;
    return 0;
}

function updateProgressSummary() {
    if (!userProfile || !allTerms.length) return;
    let total = allTerms.length;
    let learned = 0;
    let secure = 0;
    allTerms.forEach(term => {
        const level = getTermLevel(term.id);
        if (level >= 1) learned++;
        if (level >= 3) secure++;
    });
    document.getElementById('total-terms').textContent = total;
    document.getElementById('learned-terms').textContent = learned;
    document.getElementById('secure-terms').textContent = secure;
}

async function updateProgress(termId, isCorrect) {
    if (!userProfile) return;
    if (!userProfile.stats[termId]) {
        userProfile.stats[termId] = { correct: 0, wrong: 0 };
    }
    const stat = userProfile.stats[termId];
    if (isCorrect) stat.correct++; else stat.wrong++;
    stat.lastAsked = new Date().toISOString();

    await saveUserProfile();
    updateProgressSummary();
}

function resetProgress() {
    if (!userProfile) return;
    if (confirm('Wirklich den gesamten Fortschritt löschen?')) {
        userProfile.stats = {};
        saveUserProfile();
        refreshView();
    }
}

// ==================== Term-Auswahl nach Schwierigkeit ====================
function filterTermsByDifficulty(terms) {
    if (currentDifficulty === 'all' || !userProfile) return terms;
    const [min, max] = currentDifficulty.split('-').map(Number);
    return terms.filter(term => {
        const level = getTermLevel(term.id);
        return level >= min && level <= max;
    });
}

function getRandomTerm() {
    let candidates = allTerms;
    if (currentCategory !== 'alle') {
        candidates = allTerms.filter(t => t.kategorie === currentCategory);
    }
    candidates = filterTermsByDifficulty(candidates);
    if (candidates.length === 0) {
        alert('Keine Begriffe in dieser Kategorie/Schwierigkeit.');
        return null;
    }
    return candidates[Math.floor(Math.random() * candidates.length)];
}

// ==================== Ansichten aktualisieren ====================
function refreshView() {
    clearMarkers();
    if (currentMode === 'learn') {
        showAllMarkers();
    } else if (currentMode === 'quiz' || currentMode === 'mc') {
        nextQuestion();
    }
}

function setMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
    if (mode === 'learn') document.getElementById('mode-learn').classList.add('active');
    if (mode === 'quiz') document.getElementById('mode-quiz').classList.add('active');
    if (mode === 'mc') document.getElementById('mode-mc').classList.add('active');
    refreshView();
}

function clearMarkers() {
    markers.forEach(m => map.removeLayer(m));
    markers = [];
    mcMarkers.forEach(m => map.removeLayer(m));
    mcMarkers = [];
}

function showAllMarkers() {
    clearMarkers();
    let terms = allTerms;
    if (currentCategory !== 'alle') {
        terms = terms.filter(t => t.kategorie === currentCategory);
    }
    terms = filterTermsByDifficulty(terms);
    terms.forEach(term => {
        if (term.lat && term.lon) {
            const level = getTermLevel(term.id);
            const color = level >= 3 ? 'green' : (level >= 1 ? 'orange' : 'red');
            const marker = L.circleMarker([term.lat, term.lon], {
                radius: 6,
                color: color,
                fillOpacity: 0.8
            }).bindPopup(`<b>${term.name}</b><br>Stufe: ${level}`);
            marker.addTo(map);
            markers.push(marker);
        }
    });
}

// ==================== Quiz-Modus (Klick) ====================
function nextQuestion() {
    if (currentMode === 'learn') return;
    clearMarkers();
    const term = getRandomTerm();
    if (!term) return;

    currentTerm = term;
    document.getElementById('current-term').textContent = term.name;
    document.getElementById('feedback').textContent = '';
    document.getElementById('next-question').disabled = true;

    if (currentMode === 'quiz') {
        // Klick-Modus: Nutzer klickt auf Karte
        map.once('click', onMapClick);
    } else if (currentMode === 'mc') {
        // Multiple Choice: 4 Marker setzen, einer ist richtig
        setupMultipleChoice(term);
    }
}

function onMapClick(e) {
    if (!currentTerm) return;
    const clicked = e.latlng;
    const target = L.latLng(currentTerm.lat, currentTerm.lon);
    const distance = clicked.distanceTo(target) / 1000; // in km

    let isCorrect = false;
    let feedbackText = '';
    if (distance < 100) {
        isCorrect = true;
        feedbackText = '✅ Richtig! (Entfernung < 100 km)';
    } else if (distance < 300) {
        feedbackText = '⚠️ Nahe dran (Entfernung ' + distance.toFixed(0) + ' km)';
    } else {
        feedbackText = '❌ Falsch (Entfernung ' + distance.toFixed(0) + ' km)';
    }

    // Marker setzen (Klickposition)
    L.marker(clicked).addTo(map).bindPopup('Deine Auswahl').openPopup();
    // Marker für richtige Position
    L.marker(target).addTo(map).bindPopup(`Richtig: ${currentTerm.name}`);

    document.getElementById('feedback').textContent = feedbackText;
    document.getElementById('next-question').disabled = false;

    // Fortschritt speichern
    if (userProfile) {
        updateProgress(currentTerm.id, isCorrect);
    }
}

function setupMultipleChoice(correctTerm) {
    // Zufällige 3 andere Begriffe aus ähnlicher Kategorie
    let others = allTerms.filter(t => t.kategorie === correctTerm.kategorie && t.id !== correctTerm.id);
    if (others.length < 3) {
        // Falls nicht genug, einfach alle anderen
        others = allTerms.filter(t => t.id !== correctTerm.id);
    }
    // Zufällige Auswahl
    others = shuffleArray(others).slice(0, 3);
    const options = [correctTerm, ...others];
    const shuffled = shuffleArray(options);

    mcCorrectIndex = shuffled.findIndex(t => t.id === correctTerm.id);

    // Marker setzen
    shuffled.forEach((term, idx) => {
        if (term.lat && term.lon) {
            const marker = L.marker([term.lat, term.lon], {
                icon: L.divIcon({ className: 'mc-marker', html: `<div style="background:white; border:2px solid blue; border-radius:50%; width:24px; height:24px; display:flex; align-items:center; justify-content:center; font-weight:bold;">${String.fromCharCode(65 + idx)}</div>` })
            }).addTo(map).bindPopup(term.name);
            marker.on('click', () => onMCAnswer(idx, term.id));
            mcMarkers.push(marker);
        }
    });
}

function onMCAnswer(selectedIdx, termId) {
    if (!currentTerm) return;
    const isCorrect = (selectedIdx === mcCorrectIndex);
    const feedbackText = isCorrect ? '✅ Richtig!' : '❌ Falsch!';
    document.getElementById('feedback').textContent = feedbackText;
    document.getElementById('next-question').disabled = false;
    if (userProfile) {
        updateProgress(currentTerm.id, isCorrect);
    }
    // Antwort-Markierung
    mcMarkers.forEach((m, idx) => {
        if (idx === selectedIdx) {
            m.setIcon(L.divIcon({ className: 'mc-marker', html: `<div style="background:${isCorrect ? 'green' : 'red'}; color:white; border-radius:50%; width:24px; height:24px; display:flex; align-items:center; justify-content:center; font-weight:bold;">${String.fromCharCode(65 + idx)}</div>` }));
        }
        if (idx === mcCorrectIndex) {
            // Richtige Antwort grün umranden
            m.setStyle({ color: 'green' });
        }
    });
}

// Hilfsfunktion zum Mischen
function shuffleArray(arr) {
    return arr.sort(() => Math.random() - 0.5);
}

// ==================== Start ====================
window.addEventListener('load', init);