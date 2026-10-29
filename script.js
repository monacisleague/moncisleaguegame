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
    { name: "FC POLAR", color: "#ffffff", logo: "polar.png" },
    { name: "CALABRONI FC", color: "#0066ff", logo: "calabroni.png" },
    { name: "DARK KNIGHTS", color: "#1a1a1a", bordo: "#8a8a8a", logo: "darkknights.png" },
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
// Dimensioni di riferimento; la finestra reale si adatta allo schermo (vedi aggiornaScala)
const BASE_W = 192;
const BASE_H = 426;
let VIEW_W = BASE_W;
let VIEW_H = BASE_H;
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

let palla = { x: centroX, y: centroY, radius: 2, vx: 0, vy: 0, libera: false, blocco: 0 };

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

// --- GIOCATORI: SPRITE E SQUADRE ---
// giocatori.png contiene 24 calciatori (6 squadre x 4 giocatori), nello stesso ordine di teamsList.
// Per ogni giocatore: 3 righe (davanti, dietro, di lato) x 4 frame (fermo, corsa A, corsa B, calcio).
const sprite = new Image();
sprite.src = 'giocatori.png';
const CELLA_W = 16, CELLA_H = 20;
const DIR = { GIU: 0, SU: 1, DESTRA: 2, SINISTRA: 3 };
const SEQ_CORSA = [1, 0, 2, 0];

// Formazione 3+1 (portiere, due difensori, attaccante). I valori y sono la posizione dei piedi.
const FORMAZIONE_CASA = [
    { x: 176, y: 575, ruolo: "POR" },
    { x: 110, y: 505, ruolo: "DIF" },
    { x: 242, y: 505, ruolo: "DIF" },
    { x: 176, y: 405, ruolo: "ATT" }
];
const FORMAZIONE_OSPITE = [
    { x: 176, y: 101, ruolo: "POR" },
    { x: 110, y: 171, ruolo: "DIF" },
    { x: 242, y: 171, ruolo: "DIF" },
    { x: 176, y: 271, ruolo: "ATT" }
];

function creaGiocatori(formazione, dirIniziale) {
    return formazione.map((f, slot) => ({
        x: f.x, y: f.y, ruolo: f.ruolo, slot: slot,
        dir: dirIniziale, inMovimento: false, animT: 0, calcioT: 0
    }));
}

// Prepara una nuova partita: squadre, formazioni e pallone
function preparaPartita() {
    const idxCasa = currentTeamIndex;
    // PROVVISORIO: l'avversario è una squadra a caso diversa dalla tua
    let idxOspite;
    do { idxOspite = Math.floor(Math.random() * teamsList.length); } while (idxOspite === idxCasa);

    squadraCasa.idx = idxCasa;
    squadraCasa.nome = teamsList[idxCasa].name;
    squadraCasa.colore = teamsList[idxCasa].color;
    squadraOspite.idx = idxOspite;
    squadraOspite.nome = teamsList[idxOspite].name;
    squadraOspite.colore = teamsList[idxOspite].color;

    squadraCasa.giocatori = creaGiocatori(FORMAZIONE_CASA, DIR.SU);
    squadraOspite.giocatori = creaGiocatori(FORMAZIONE_OSPITE, DIR.GIU);

    palla.x = centroX;
    palla.y = centroY;
    palla.vx = 0;
    palla.vy = 0;
    palla.libera = false;
    palla.blocco = 0;
    camera.x = clamp(palla.x - VIEW_W / 2, 0, WORLD_W - VIEW_W);
    camera.y = clamp(palla.y - VIEW_H / 2, 0, WORLD_H - VIEW_H);
}

function direzioneVerso(dx, dy) {
    if (Math.abs(dy) > Math.abs(dx)) return dy > 0 ? DIR.GIU : DIR.SU;
    return dx > 0 ? DIR.DESTRA : DIR.SINISTRA;
}

function vettoreDir(dir) {
    return [[0, 1], [0, -1], [1, 0], [-1, 0]][dir];
}

function disegnaGiocatore(g, squadra) {
    const x = Math.round(g.x - camera.x);
    const y = Math.round(g.y - camera.y);
    // ombra
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(x - 5, y - 1, 10, 3);

    if (!(sprite.complete && sprite.naturalWidth > 0)) {
        // se l'immagine non è ancora caricata: segnaposto nel colore della squadra
        ctx.fillStyle = squadra.colore;
        ctx.fillRect(x - 4, y - 14, 8, 13);
        return;
    }
    const indice = squadra.idx * 4 + g.slot;
    const riga = g.dir === DIR.GIU ? 0 : (g.dir === DIR.SU ? 1 : 2);
    let frame = 0;
    if (g.calcioT > 0) frame = 3;
    else if (g.inMovimento) frame = SEQ_CORSA[Math.floor(g.animT / 5) % 4];
    const sx = frame * CELLA_W;
    const sy = indice * CELLA_H * 3 + riga * CELLA_H;

    if (g.dir === DIR.SINISTRA) {
        ctx.save();
        ctx.translate(x, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(sprite, sx, sy, CELLA_W, CELLA_H, -CELLA_W / 2, y - 19, CELLA_W, CELLA_H);
        ctx.restore();
    } else {
        ctx.drawImage(sprite, sx, sy, CELLA_W, CELLA_H, x - CELLA_W / 2, y - 19, CELLA_W, CELLA_H);
    }
}

// --- COMANDI DI PROVA (temporanei): muovi l'attaccante con frecce/WASD, Spazio = tiro, X = passaggio ---
const tasti = {};
window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    tasti[k] = true;
    if (!gameplayScreen.classList.contains('hidden') &&
        ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) {
        e.preventDefault();
    }
});
window.addEventListener('keyup', (e) => { tasti[e.key.toLowerCase()] = false; });

function aggiornaGiocoDiProva() {
    const g = squadraCasa.giocatori[3];
    let dx = 0, dy = 0;
    if (tasti['arrowleft'] || tasti['a']) dx -= 1;
    if (tasti['arrowright'] || tasti['d']) dx += 1;
    if (tasti['arrowup'] || tasti['w']) dy -= 1;
    if (tasti['arrowdown'] || tasti['s']) dy += 1;

    if (dx !== 0 || dy !== 0) {
        const len = Math.hypot(dx, dy);
        g.x += (dx / len) * 1.3;
        g.y += (dy / len) * 1.3;
        g.dir = direzioneVerso(dx, dy);
        g.inMovimento = true;
        g.animT++;
    } else {
        g.inMovimento = false;
    }
    g.x = clamp(g.x, campo.x + 6, campo.x + campo.width - 6);
    g.y = clamp(g.y, campo.y + 2, campo.y + campo.height + 2);

    // calcio
    if (g.calcioT > 0) g.calcioT--;
    const vicino = Math.hypot(palla.x - g.x, palla.y - (g.y - 3)) < 14;
    if ((tasti[' '] || tasti['x']) && g.calcioT === 0) {
        g.calcioT = 10;
        if (vicino) {
            const [vx, vy] = vettoreDir(g.dir);
            const forza = tasti[' '] ? 4.5 : 2.8;
            palla.vx = vx * forza;
            palla.vy = vy * forza;
            palla.libera = true;
            palla.blocco = 25;
        }
    }

    // pallone
    if (!palla.libera) {
        // la palla resta ai piedi del giocatore, davanti a lui
        const [vx, vy] = vettoreDir(g.dir);
        palla.x += (g.x + vx * 7 - palla.x) * 0.35;
        palla.y += (g.y - 3 + vy * 5 - palla.y) * 0.35;
    } else {
        palla.x += palla.vx;
        palla.y += palla.vy;
        palla.vx *= 0.97;
        palla.vy *= 0.97;
        if (palla.x < campo.x + 2 || palla.x > campo.x + campo.width - 2) {
            palla.vx *= -1;
            palla.x = clamp(palla.x, campo.x + 2, campo.x + campo.width - 2);
        }
        if (palla.y < campo.y - 8 || palla.y > campo.y + campo.height + 8) {
            palla.vy *= -1;
            palla.y = clamp(palla.y, campo.y - 8, campo.y + campo.height + 8);
        }
        if (palla.blocco > 0) palla.blocco--;
        else if (Math.hypot(palla.vx, palla.vy) < 0.4 || vicino) {
            if (vicino) { palla.libera = false; }
        }
    }

    // gli altri giocatori guardano il pallone
    [squadraCasa, squadraOspite].forEach(sq => {
        sq.giocatori.forEach(p => {
            if (p === g) return;
            p.dir = direzioneVerso(palla.x - p.x, palla.y - p.y);
        });
    });
}

// --- RENDER ---
function drawGame() {
    ctx.imageSmoothingEnabled = false;
    aggiornaGiocoDiProva();
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
        ...squadraCasa.giocatori.map(g => ({ g, sq: squadraCasa })),
        ...squadraOspite.giocatori.map(g => ({ g, sq: squadraOspite }))
    ].sort((p, q) => p.g.y - q.g.y);
    tutti.forEach(p => disegnaGiocatore(p.g, p.sq));

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

// --- SCALA DELLO SCHERMO: a tutto schermo e con pixel nitidi ---
// La scala è sempre un numero intero di pixel reali dello schermo, così il pixel art resta
// perfetto; la finestra della camera si adatta alle dimensioni dello schermo (telefono o PC).
function aggiornaScala() {
    const dpr = window.devicePixelRatio || 1;
    const fisW = window.innerWidth * dpr;
    const fisH = window.innerHeight * dpr;
    const scala = Math.max(2, Math.round(Math.min(fisW / BASE_W, fisH / BASE_H)));

    VIEW_W = Math.min(WORLD_W, Math.ceil(fisW / scala));
    VIEW_H = Math.min(WORLD_H, Math.ceil(fisH / scala));
    canvas.width = VIEW_W;
    canvas.height = VIEW_H;
    canvas.style.width = (VIEW_W * scala / dpr) + 'px';
    canvas.style.height = (VIEW_H * scala / dpr) + 'px';
    ctx.imageSmoothingEnabled = false;

    // Su schermi larghi (PC) i comandi a schermo restano vicini al campo
    const margine = Math.max(0, (window.innerWidth - VIEW_W * scala / dpr) / 2);
    gameplayScreen.style.setProperty('--margine-hud', margine + 'px');
}
window.addEventListener('resize', aggiornaScala);

// --- GESTIONE SELEZIONE SQUADRA E DIFFICOLTÀ ---
function updateTeamDisplay() {
    const team = teamsList[currentTeamIndex];
    currentTeamName.textContent = team.name;
    teamBoxBorder.style.borderColor = team.bordo || team.color;
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
    preparaPartita();
    matchInfo.textContent = `${gameState.selectedTeam} | ${gameState.difficulty}`;
    avviaLoop();
});

musicSlider.addEventListener('input', (e) => {
    musicValDisplay.textContent = `${e.target.value}%`;
});

sfxSlider.addEventListener('input', (e) => {
    sfxValDisplay.textContent = `${e.target.value}%`;
});
