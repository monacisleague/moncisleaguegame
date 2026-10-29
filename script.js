// --- SELEZIONE ELEMENTI INTERFACCIA ---
const mainMenu = document.getElementById('main-menu');
const settingsModal = document.getElementById('settings-modal');
const teamSelectScreen = document.getElementById('team-select-screen');
const gameplayScreen = document.getElementById('gameplay-screen');

const btnPlay = document.getElementById('btn-play');
const btnSettings = document.getElementById('btn-settings');
const btnCloseSettings = document.getElementById('btn-close-settings');
const btnBackToMenu = document.getElementById('btn-back-to-menu');
const btnStartMatch = document.getElementById('btn-start-match');

const btnPrevTeam = document.getElementById('btn-prev-team');
const btnNextTeam = document.getElementById('btn-next-team');
const currentTeamLogo = document.getElementById('current-team-logo');
const currentTeamName = document.getElementById('current-team-name');
const teamBoxBorder = document.getElementById('team-box-border');
const teamCounter = document.getElementById('team-counter');

const btnPrevDiff = document.getElementById('btn-prev-diff');
const btnNextDiff = document.getElementById('btn-next-diff');
const currentDiffName = document.getElementById('current-diff-name');
const diffCounter = document.getElementById('diff-counter');

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const matchInfo = document.getElementById('match-info');
const btnBackToSelect = document.getElementById('btn-back-to-select');

const musicSlider = document.getElementById('music-volume');
const musicValDisplay = document.getElementById('music-val');
const sfxSlider = document.getElementById('sfx-volume');
const sfxValDisplay = document.getElementById('sfx-val');

// --- DATI SQUADRE MONACI'S LEAGUE ---
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
let currentDiffIndex = 1;

const gameState = {
    selectedTeam: teamsList[0].name,
    selectedColor: teamsList[0].color,
    difficulty: difficultiesList[1]
};

// --- CONFIGURAZIONE STADIO, CAMPO E 4v4 ---
const campo = {
    x: 20,
    y: 20,
    width: 300,
    height: 360
};

// Generazione Tifosi per le tribune esterne
const tifosi = [];
const coloriTifosi = ['#ff4444', '#0066ff', '#ffffff', '#ffd700', '#00cc44'];

// Tribune Superiori e Inferiori
for (let i = 0; i < 15; i++) {
    tifosi.push({ x: 30 + i * 20, y: 8, colore: coloriTifosi[i % coloriTifosi.length] });
    tifosi.push({ x: 30 + i * 20, y: 392, colore: coloriTifosi[(i + 2) % coloriTifosi.length] });
}
// Tribune Laterali
for (let j = 0; j < 16; j++) {
    tifosi.push({ x: 6, y: 30 + j * 22, colore: coloriTifosi[j % coloriTifosi.length] });
    tifosi.push({ x: 334, y: 30 + j * 22, colore: coloriTifosi[(j + 1) % coloriTifosi.length] });
}

// Formazione 4 vs 4
let squadraCasa = {
    nome: "FC POLAR",
    colore: "#ffd700",
    giocatori: [
        { x: 170, y: 340, ruolo: "POR" },
        { x: 110, y: 280, ruolo: "DIF" },
        { x: 230, y: 280, ruolo: "DIF" },
        { x: 170, y: 215, ruolo: "ATT" }
    ]
};

let squadraOspite = {
    nome: "RIVALI FC",
    colore: "#ff4444",
    giocatori: [
        { x: 170, y: 60,  ruolo: "POR" },
        { x: 110, y: 120, ruolo: "DIF" },
        { x: 230, y: 120, ruolo: "DIF" },
        { x: 170, y: 185, ruolo: "ATT" }
    ]
};

let palla = {
    x: 170,
    y: 200,
    radius: 5
};

// --- RENDER DEL CAMPO CON TRIBUNE E GIOCATORI ---
function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Sfondo Stadio / Tribune scure
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Animazione tifosi negli spalti
    tifosi.forEach((t, index) => {
        let offsetOnda = Math.sin(Date.now() / 250 + index) * 1.5;
        ctx.fillStyle = t.colore;
        ctx.fillRect(t.x, t.y + offsetOnda, 6, 6);
    });

    // 2. Campo da Calcio Pixel Art
    ctx.fillStyle = '#1b5e20';
    ctx.fillRect(campo.x, campo.y, campo.width, campo.height);

    // Strisce d'erba verticali retrò
    ctx.fillStyle = '#144c17';
    for (let x = campo.x; x < campo.x + campo.width; x += 40) {
        ctx.fillRect(x, campo.y, 20, campo.height);
    }

    // 3. Linee del Campo (Bianche e nitide)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(campo.x, campo.y, campo.width, campo.height);

    // Centrocampo
    ctx.beginPath();
    ctx.moveTo(campo.x, campo.y + campo.height / 2);
    ctx.lineTo(campo.x + campo.width, campo.y + campo.height / 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(canvas.width / 2, campo.y + campo.height / 2, 35, 0, Math.PI * 2);
    ctx.stroke();

    // Aree di Rigore e Porte
    ctx.strokeRect(canvas.width / 2 - 40, campo.y, 80, 25);
    ctx.strokeRect(canvas.width / 2 - 40, campo.y + campo.height - 25, 80, 25);

    // 4. Giocatori (4 Contro 4)
    squadraCasa.giocatori.forEach(g => {
        ctx.fillStyle = squadraCasa.colore;
        ctx.beginPath();
        ctx.arc(g.x, g.y, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#000000';
        ctx.stroke();
    });

    squadraOspite.giocatori.forEach(g => {
        ctx.fillStyle = squadraOspite.colore;
        ctx.beginPath();
        ctx.arc(g.x, g.y, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#000000';
        ctx.stroke();
    });

    // 5. Pallone da calcio
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(palla.x, palla.y, palla.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.stroke();
}

function gameLoop() {
    drawGame();
    if (!gameplayScreen.classList.contains('hidden')) {
        requestAnimationFrame(gameLoop);
    }
}

// --- GESTIONE SELEZIONE SQUADRA E DIFFICOLTÀ ---
function updateTeamDisplay() {
    const team = teamsList[currentTeamIndex];
    currentTeamName.textContent = team.name;
    teamBoxBorder.style.borderColor = team.color;
    teamCounter.textContent = `${currentTeamIndex + 1} / ${teamsList.length}`;
    
    gameState.selectedTeam = team.name;
    gameState.selectedColor = team.color;
    squadraCasa.nome = team.name;
    squadraCasa.colore = team.color;

    currentTeamLogo.src = team.logo;
    currentTeamLogo.onerror = () => {
        currentTeamLogo.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><rect width='40' height='40' fill='%23111' stroke='%23ffd700' stroke-width='2'/><text x='20' y='25' font-size='14' text-anchor='middle' fill='%23ffd700'>⚽</text></svg>";
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

// --- EVENTI NAVIGAZIONE MENU ---
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

btnNextTeam.addEventListener('click', () => {
    currentTeamIndex = (currentTeamIndex + 1) % teamsList.length;
    updateTeamDisplay();
});

btnPrevTeam.addEventListener('click', () => {
    currentTeamIndex = (currentTeamIndex - 1 + teamsList.length) % teamsList.length;
    updateTeamDisplay();
});

btnNextDiff.addEventListener('click', () => {
    currentDiffIndex = (currentDiffIndex + 1) % difficultiesList.length;
    updateDiffDisplay();
});

btnPrevDiff.addEventListener('click', () => {
    currentDiffIndex = (currentDiffIndex - 1 + difficultiesList.length) % difficultiesList.length;
    updateDiffDisplay();
});

btnStartMatch.addEventListener('click', () => {
    teamSelectScreen.classList.add('hidden');
    gameplayScreen.classList.remove('hidden');
    matchInfo.textContent = `${gameState.selectedTeam} | ${gameState.difficulty}`;
    requestAnimationFrame(gameLoop);
});

musicSlider.addEventListener('input', (e) => {
    musicValDisplay.textContent = `${e.target.value}%`;
});

sfxSlider.addEventListener('input', (e) => {
    sfxValDisplay.textContent = `${e.target.value}%`;
});
