// Selezione Elementi DOM
const mainMenu = document.getElementById('main-menu');
const settingsModal = document.getElementById('settings-modal');
const teamSelectScreen = document.getElementById('team-select-screen');

// Pulsanti
const btnPlay = document.getElementById('btn-play');
const btnSettings = document.getElementById('btn-settings');
const btnCloseSettings = document.getElementById('btn-close-settings');
const btnBackToMenu = document.getElementById('btn-back-to-menu');

// Controlli Impostazioni
const musicSlider = document.getElementById('music-volume');
const musicValDisplay = document.getElementById('music-val');
const sfxSlider = document.getElementById('sfx-volume');
const sfxValDisplay = document.getElementById('sfx-val');

// Oggetto Stato Impostazioni (Salvabile in memoria locale)
const gameSettings = {
    musicVolume: 80,
    sfxVolume: 100,
    touchControls: true,
    touchSize: 'medium'
};

// --- EVENT LISTENER (AZIONI) ---

// 1. Click su "GIOCA" -> Passa alla schermata successiva
btnPlay.addEventListener('click', () => {
    mainMenu.classList.add('hidden');
    teamSelectScreen.classList.remove('hidden');
});

// 2. Click su "IMPOSTAZIONI" -> Apre la finestra delle impostazioni
btnSettings.addEventListener('click', () => {
    settingsModal.classList.remove('hidden');
});

// 3. Click su "SALVA E CHIUDI" -> Chiude le impostazioni
btnCloseSettings.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
});

// 4. Click su "INDIETRO" (Dalla selezione squadre)
btnBackToMenu.addEventListener('click', () => {
    teamSelectScreen.classList.add('hidden');
    mainMenu.classList.remove('hidden');
});

// --- AGGIORNAMENTO LIVE IMPOSTAZIONI ---

musicSlider.addEventListener('input', (e) => {
    gameSettings.musicVolume = e.target.value;
    musicValDisplay.textContent = `${e.target.value}%`;
});

sfxSlider.addEventListener('input', (e) => {
    gameSettings.sfxVolume = e.target.value;
    sfxValDisplay.textContent = `${e.target.value}%`;
});
