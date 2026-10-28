// Selezione Elementi Schermate
const mainMenu = document.getElementById('main-menu');
const settingsModal = document.getElementById('settings-modal');
const teamSelectScreen = document.getElementById('team-select-screen');
const gameplayScreen = document.getElementById('gameplay-screen');

// Pulsanti Principali
const btnPlay = document.getElementById('btn-play');
const btnSettings = document.getElementById('btn-settings');
const btnCloseSettings = document.getElementById('btn-close-settings');
const btnBackToMenu = document.getElementById('btn-back-to-menu');
const btnStartMatch = document.getElementById('btn-start-match');
const btnBackToSelect = document.getElementById('btn-back-to-select');

// Elementi Selezione FASE 2
const teamCards = document.querySelectorAll('.team-card');
const diffButtons = document.querySelectorAll('.btn-diff');
const selectedSummaryText = document.getElementById('selected-summary-text');

// Controlli Impostazioni
const musicSlider = document.getElementById('music-volume');
const musicValDisplay = document.getElementById('music-val');
const sfxSlider = document.getElementById('sfx-volume');
const sfxValDisplay = document.getElementById('sfx-val');

// Stato Globale del Gioco
const gameState = {
    selectedTeam: null,
    difficulty: 'MEDIO',
    settings: {
        musicVolume: 80,
        sfxVolume: 100,
        touchControls: true,
        touchSize: 'medium'
    }
};

// --- NAVIGAZIONE SCHERMATE ---

btnPlay.addEventListener('click', () => {
    mainMenu.classList.add('hidden');
    teamSelectScreen.classList.remove('hidden');
});

btnSettings.addEventListener('click', () => {
    settingsModal.classList.remove('hidden');
});

btnCloseSettings.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
});

btnBackToMenu.addEventListener('click', () => {
    teamSelectScreen.classList.add('hidden');
    mainMenu.classList.remove('hidden');
});

btnBackToSelect.addEventListener('click', () => {
    gameplayScreen.classList.add('hidden');
    teamSelectScreen.classList.remove('hidden');
});

// --- FASE 2: GESTIONE SQUADRA E DIFFICOLTÀ ---

// Selezione della Squadra
teamCards.forEach(card => {
    card.addEventListener('click', () => {
        teamCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        
        gameState.selectedTeam = card.getAttribute('data-team');
        btnStartMatch.disabled = false; // Abilita il pulsante "AVVIA PARTITA"
    });
});

// Selezione della Difficoltà
diffButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        diffButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        gameState.difficulty = btn.getAttribute('data-diff');
    });
});

// Avvio della Partita -> Passaggio alla FASE 3
btnStartMatch.addEventListener('click', () => {
    if (!gameState.selectedTeam) return;

    teamSelectScreen.classList.add('hidden');
    gameplayScreen.classList.remove('hidden');

    selectedSummaryText.textContent = `Squadra: ${gameState.selectedTeam} | Difficoltà: ${gameState.difficulty}`;
});

// --- AGGIORNAMENTO LIVE IMPOSTAZIONI ---

musicSlider.addEventListener('input', (e) => {
    gameState.settings.musicVolume = e.target.value;
    musicValDisplay.textContent = `${e.target.value}%`;
});

sfxSlider.addEventListener('input', (e) => {
    gameState.settings.sfxVolume = e.target.value;
    sfxValDisplay.textContent = `${e.target.value}%`;
});
