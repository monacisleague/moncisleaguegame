// Funzione globale richiesta dal sistema di controlli per sapere se siamo in partita
window.App = {
    settings: {
        controls: 'auto',
        padSize: 'normal',
        keys: 'nuevas'
    },
    inMatch: function() {
        return !gameplayScreen.classList.contains('hidden');
    },
    togglePause: function() {
        // Gestione pausa di gioco (può essere espansa)
        console.log("Pausa attivata");
    },
    menuKey: function(e) {
        return false;
    }
};

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

// Elementi Carosello Squadre
const btnPrevTeam = document.getElementById('btn-prev-team');
const btnNextTeam = document.getElementById('btn-next-team');
const currentTeamLogo = document.getElementById('current-team-logo');
const currentTeamName = document.getElementById('current-team-name');
const teamBoxBorder = document.getElementById('team-box-border');
const teamCounter = document.getElementById('team-counter');

// Elementi Carosello Difficoltà
const btnPrevDiff = document.getElementById('btn-prev-diff');
const btnNextDiff = document.getElementById('btn-next-diff');
const currentDiffName = document.getElementById('current-diff-name');
const diffCounter = document.getElementById('diff-counter');

// Elementi Gameplay
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
    { name: "FC POLAR", color: "#ffd700", logo: "polar.png" },
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
    difficulty: difficultiesList[1]
};

// --- GESTIONE IMMAGINE CAMPO ---
const pitchImage = new Image();
pitchImage.src = 'pitch.png';
let pitchLoaded = false;
pitchImage.onload = () => { pitchLoaded = true; };

// Entità di gioco di prova (Giocatore controllabile con i tasti / joystick)
const player = {
    x: 170,
    y: 210,
    radius: 12,
    speed: 3
};

// --- LOOP DI GIOCO E INPUT ---
function updateGame() {
    // Leggiamo i comandi dal sistema esterno controls.js (Input)
    if (typeof Input !== 'undefined') {
        const inputState = Input.read();
        
        // Muove il giocatore in base all'input (tastiera, joystick o gamepad)
        if (inputState.move.x !== 0 || inputState.move.y !== 0) {
            let currentSpeed = inputState.sprint ? player.speed * 1.6 : player.speed;
            player.x += inputState.move.x * currentSpeed;
            player.y += inputState.move.y * currentSpeed;

            // Mantieni il giocatore dentro i bordi del campo
            player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x));
            player.y = Math.max(player.radius, Math.min(canvas.height - player.radius, player.y));
        }

        // Gestione aggiornamento pulsanti touch dinamici (attacco/difesa)
        if (typeof Pad !== 'undefined') {
            Pad.render('attack'); // Modalità attacco di esempio
        }
    }
}

function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Disegna l'immagine dello stadio se caricata, altrimenti fallback verde stile arcade
    if (pitchLoaded) {
        ctx.drawImage(pitchImage, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = '#1b5e20';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Linee campo di riserva
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
        ctx.beginPath();
        ctx.moveTo(20, canvas.height / 2);
        ctx.lineTo(canvas.width - 20, canvas.height / 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, 40, 0, Math.PI * 2);
        ctx.stroke();
    }

    // Disegna il giocatore sul campo (Pallino dorato stile Black & Gold)
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000000';
    ctx.stroke();
}

function gameLoop() {
    updateGame();
    drawGame();
    if (!gameplayScreen.classList.contains('hidden')) {
        requestAnimationFrame(gameLoop);
    }
}

// --- AGGIORNA VISUALIZZAZIONI CAROSELLI ---
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

// Carosello Squadre
btnNextTeam.addEventListener('click', () => {
    currentTeamIndex = (currentTeamIndex + 1) % teamsList.length;
    updateTeamDisplay();
});

btnPrevTeam.addEventListener('click', () => {
    currentTeamIndex = (currentTeamIndex - 1 + teamsList.length) % teamsList.length;
    updateTeamDisplay();
});

// Carosello Difficoltà
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

// Impostazioni Audio
musicSlider.addEventListener('input', (e) => {
    musicValDisplay.textContent = `${e.target.value}%`;
});

sfxSlider.addEventListener('input', (e) => {
    sfxValDisplay.textContent = `${e.target.value}%`;
});
