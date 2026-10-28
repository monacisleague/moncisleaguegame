// Selezione Elementi Schermate
const mainMenu = document.getElementById('main-menu');
const settingsModal = document.getElementById('settings-modal');
const teamSelectScreen = document.getElementById('team-select-screen');
const gameplayScreen = document.getElementById('gameplay-screen');

// Pulsanti Principali Menu
const btnPlay = document.getElementById('btn-play');
const btnSettings = document.getElementById('btn-settings');
const btnCloseSettings = document.getElementById('btn-close-settings');
const btnBackToMenu = document.getElementById('btn-back-to-menu');
const btnStartMatch = document.getElementById('btn-start-match');

// Elementi Carosello Squadre (Fase 2)
const btnPrevTeam = document.getElementById('btn-prev-team');
const btnNextTeam = document.getElementById('btn-next-team');
const currentTeamLogo = document.getElementById('current-team-logo');
const currentTeamName = document.getElementById('current-team-name');
const teamBoxBorder = document.getElementById('team-box-border');
const teamCounter = document.getElementById('team-counter');

// Elementi Carosello Difficoltà (Fase 2)
const btnPrevDiff = document.getElementById('btn-prev-diff');
const btnNextDiff = document.getElementById('btn-next-diff');
const currentDiffName = document.getElementById('current-diff-name');
const diffCounter = document.getElementById('diff-counter');

// Elementi Gameplay (Fase 3)
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const matchInfo = document.getElementById('match-info');
const btnBackToSelect = document.getElementById('btn-back-to-select');

// Controlli Impostazioni
const musicSlider = document.getElementById('music-volume');
const musicValDisplay = document.getElementById('music-val');
const sfxSlider = document.getElementById('sfx-volume');
const sfxValDisplay = document.getElementById('sfx-val');

// --- DATI SQUADRE E DIFFICOLTÀ ---
const teamsList = [
    { name: "FC POLAR", color: "#ffffff", logo: "polar.png" },
    { name: "CALABRONI FC", color: "#0066ff", logo: "calabroni.png" },
    { name: "DARK KNIGHTS", color: "#ffd700", logo: "darkknights.png" },
    { name: "FC BIRRAREAL", color: "#00cc44", logo: "birrareal.png" },
    { name: "KING LIONS FC", color: "#ff2222", logo: "kinglions.png" },
    { name: "GRIZZLY FC", color: "#ffcc00", logo: "grizzly.png" }
];

const difficultiesList = ["FACILE", "MEDIO", "DIFFICILE"];

let currentTeamIndex = 0;
let currentDiffIndex = 1; // Parte da "MEDIO"

// Stato Globale del Gioco
const gameState = {
    selectedTeam: teamsList[0].name,
    difficulty: difficultiesList[1],
    settings: {
        musicVolume: 80,
        sfxVolume: 100,
        touchControls: true,
        touchSize: 'medium'
    }
};

// --- GESTIONE IMMAGINE CAMPO VERTICALE (FASE 3) ---
const pitchImage = new Image();
pitchImage.src = 'pitch.png';
let pitchLoaded = false;

pitchImage.onload = () => {
    pitchLoaded = true;
};

// Funzione di disegno con campo verticale 400x600 e fallback
function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (pitchLoaded) {
        // Disegna l'immagine verticale nativa riempiendo esattamente il canvas 400x600
        ctx.drawImage(pitchImage, 0, 0, canvas.width, canvas.height);
    } else {
        // Fallback di riserva in stile campo verticale retrò
        ctx.fillStyle = '#0a7527';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        
        // Linea di metà campo orizzontale per campo verticale
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();

        // Cerchio di centrocampo
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, 50, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.font = '10px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText("CAMPO VERTICALE PRONTO", canvas.width / 2, canvas.height / 2 + 80);
    }
}

function gameLoop() {
    drawGame();
    if (!gameplayScreen.classList.contains('hidden')) {
        requestAnimationFrame(gameLoop);
    }
}

// --- AGGIORNA VISUALIZZAZIONI CAROSELLI CON SICUREZZA LOGHI ---
function updateTeamDisplay() {
    const team = teamsList[currentTeamIndex];
    currentTeamName.textContent = team.name;
    teamBoxBorder.style.borderColor = team.color;
    teamCounter.textContent = `${currentTeamIndex + 1} / ${teamsList.length}`;
    gameState.selectedTeam = team.name;

    currentTeamLogo.src = team.logo;
    currentTeamLogo.onerror = () => {
        currentTeamLogo.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='50' height='50'><rect width='50' height='50' fill='%23111' stroke='%23ffd700' stroke-width='3'/><text x='25' y='30' font-size='16' text-anchor='middle' fill='%23ffd700' font-family='sans-serif'>⚽</text></svg>";
    };
}

function updateDiffDisplay() {
    const diff = difficultiesList[currentDiffIndex];
    currentDiffName.textContent = diff;
    diffCounter.textContent = `${currentDiffIndex + 1} / ${difficultiesList.length}`;
    gameState.difficulty = diff;
}

// Inizializzazione Caroselli
updateTeamDisplay();
updateDiffDisplay();

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

// --- GESTIONE CAROSELLO SQUADRE ---
btnNextTeam.addEventListener('click', () => {
    currentTeamIndex = (currentTeamIndex + 1) % teamsList.length;
    updateTeamDisplay();
});

btnPrevTeam.addEventListener('click', () => {
    currentTeamIndex = (currentTeamIndex - 1 + teamsList.length) % teamsList.length;
    updateTeamDisplay();
});

// --- GESTIONE CAROSELLO DIFFICOLTÀ ---
btnNextDiff.addEventListener('click', () => {
    currentDiffIndex = (currentDiffIndex + 1) % difficultiesList.length;
    updateDiffDisplay();
});

btnPrevDiff.addEventListener('click', () => {
    currentDiffIndex = (currentDiffIndex - 1 + difficultiesList.length) % difficultiesList.length;
    updateDiffDisplay();
});

// Avvio Partita
btnStartMatch.addEventListener('click', () => {
    teamSelectScreen.classList.add('hidden');
    gameplayScreen.classList.remove('hidden');

    matchInfo.textContent = `${gameState.selectedTeam} | ${gameState.difficulty}`;
    requestAnimationFrame(gameLoop);
});

// --- IMPOSTAZIONI AUDIO LIVE ---
musicSlider.addEventListener('input', (e) => {
    gameState.settings.musicVolume = e.target.value;
    musicValDisplay.textContent = `${e.target.value}%`;
});

sfxSlider.addEventListener('input', (e) => {
    gameState.settings.sfxVolume = e.target.value;
    sfxValDisplay.textContent = `${e.target.value}%`;
});
