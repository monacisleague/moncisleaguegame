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
 
// --- STADIO: CAMPO GRANDE + TRIBUNE (mondo 352x676 px) ---
// La camera mostra solo una finestra VIEW_W x VIEW_H del mondo e segue il pallone.
const VIEW_W = 192;
const VIEW_H = 426;
const WORLD_W = 352;
const WORLD_H = 676;
 
// Due immagini = due frame dell'animazione della folla
const stadioFrames = [new Image(), new Image()];
stadioFrames[0].src = 'stadio_frame0.png';
stadioFrames[1].src = 'stadio_frame1.png';
 
// Area di gioco dentro le linee (coordinate del mondo)
const campo = { x: 32, y: 82, width: 288, height: 512 };
const centroX = 176;
const centroY = 338;
 
// Formazione 4 vs 4 (porta in basso = casa, porta in alto = ospiti)
let squadraCasa = {
    nome: "FC POLAR",
    colore: "#ffd700",
    giocatori: [
        { x: 176, y: 565, ruolo: "POR" },
        { x: 110, y: 500, ruolo: "DIF" },
        { x: 242, y: 500, ruolo: "DIF" },
        { x: 176, y: 400, ruolo: "ATT" }
    ]
};
 
let squadraOspite = {
    nome: "RIVALI FC",
    colore: "#ff4444",
    giocatori: [
        { x: 176, y: 111, ruolo: "POR" },
        { x: 110, y: 176, ruolo: "DIF" },
        { x: 242, y: 176, ruolo: "DIF" },
        { x: 176, y: 276, ruolo: "ATT" }
    ]
};
 
let palla = { x: centroX, y: centroY, radius: 2 };
 
// Camera
const camera = { x: centroX - VIEW_W / 2, y: centroY - VIEW_H / 2 };
 
function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}
 
function aggiornaCamera() {
    const targetX = clamp(palla.x - VIEW_W / 2, 0, WORLD_W - VIEW_W);
    const targetY = clamp(palla.y - VIEW_H / 2, 0, WORLD_H - VIEW_H);
    camera.x += (targetX - camera.x) * 0.15;
    camera.y += (targetY - camera.y) * 0.15;
}
 
// Giocatore provvisorio (da sostituire con gli sprite veri)
function disegnaGiocatore(g, colore) {
    const x = Math.round(g.x - camera.x);
    const y = Math.round(g.y - camera.y);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(x - 5, y + 7, 10, 3);          // ombra
    ctx.fillStyle = '#2a1c14';
    ctx.fillRect(x - 3, y - 9, 6, 2);           // capelli
    ctx.fillStyle = '#f0be8c';
    ctx.fillRect(x - 3, y - 7, 6, 4);           // testa
    ctx.fillStyle = colore;
    ctx.fillRect(x - 4, y - 3, 8, 7);           // maglia
    ctx.fillStyle = '#222';
    ctx.fillRect(x - 3, y + 4, 2, 3);           // gambe
    ctx.fillRect(x + 1, y + 4, 2, 3);
}
 
// --- MOVIMENTO PALLONE DI PROVA (temporaneo, per testare camera e tribune) ---
const tasti = {};
window.addEventListener('keydown', (e) => { tasti[e.key.toLowerCase()] = true; });
window.addEventListener('keyup', (e) => { tasti[e.key.toLowerCase()] = false; });
 
function muoviPalla() {
    const v = 2;
    if (tasti['arrowleft'] || tasti['a']) palla.x -= v;
    if (tasti['arrowright'] || tasti['d']) palla.x += v;
    if (tasti['arrowup'] || tasti['w']) palla.y -= v;
    if (tasti['arrowdown'] || tasti['s']) palla.y += v;
    palla.x = clamp(palla.x, campo.x, campo.x + campo.width);
    palla.y = clamp(palla.y, campo.y - 10, campo.y + campo.height + 10);
}
 
// --- RENDER ---
function drawGame() {
    ctx.imageSmoothingEnabled = false;
    muoviPalla();
    aggiornaCamera();
 
    // Frame della folla: cambia ogni 450 ms
    const frame = Math.floor(Date.now() / 450) % 2;
    const img = stadioFrames[frame];
 
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
 
    if (img.complete && img.naturalWidth > 0) {
        // coordinate camera arrotondate per evitare sfarfallii dei pixel
        ctx.drawImage(img, Math.round(camera.x), Math.round(camera.y), VIEW_W, VIEW_H, 0, 0, VIEW_W, VIEW_H);
    } else {
        ctx.fillStyle = '#1b5e20';
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
 
    // Giocatori ordinati per y, così quelli più in basso stanno davanti
    const tutti = [
        ...squadraCasa.giocatori.map(g => ({ g, c: squadraCasa.colore })),
        ...squadraOspite.giocatori.map(g => ({ g, c: squadraOspite.colore }))
    ].sort((p, q) => p.g.y - q.g.y);
    tutti.forEach(p => disegnaGiocatore(p.g, p.c));
 
    // Pallone
    const px = Math.round(palla.x - camera.x);
    const py = Math.round(palla.y - camera.y);
    ctx.fillStyle = '#000000';
    ctx.fillRect(px - 3, py - 3, 6, 6);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px - 2, py - 2, 4, 4);
}
 
let loopAttivo = false;
function gameLoop() {
    if (gameplayScreen.classList.contains('hidden')) {
        loopAttivo = false;
        return;
    }
    drawGame();
    requestAnimationFrame(gameLoop);
}
 
function avviaLoop() {
    aggiornaScala();
    if (!loopAttivo) {
        loopAttivo = true;
        requestAnimationFrame(gameLoop);
    }
}
 
// --- SCALA DELLO SCHERMO: nitida su telefono e PC ---
function aggiornaScala() {
    const dispW = Math.min(window.innerWidth - 40, 650);
    const dispH = window.innerHeight - 170; // spazio per intestazione e pulsante
    const raw = Math.min(dispW / VIEW_W, dispH / VIEW_H);
    // da 2x in su usa scale intere (pixel perfetti); sotto usa la scala che entra
    const scala = raw >= 2 ? Math.floor(raw) : Math.max(raw, 0.5);
    canvas.style.width = Math.round(VIEW_W * scala) + 'px';
    canvas.style.height = Math.round(VIEW_H * scala) + 'px';
}
window.addEventListener('resize', aggiornaScala);
 
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
    avviaLoop();
});
 
musicSlider.addEventListener('input', (e) => {
    musicValDisplay.textContent = `${e.target.value}%`;
});
 
sfxSlider.addEventListener('input', (e) => {
    sfxValDisplay.textContent = `${e.target.value}%`;
});

        
