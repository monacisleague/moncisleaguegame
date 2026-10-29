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

let palla = { x: centroX, y: centroY, radius: 2, vx: 0, vy: 0, titolare: null, blocco: 0, parata: false, ultimaSq: null, tiroX: centroX, tiroY: centroY };

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

// --- REGOLAMENTO: TEMPO, FASI, GOL, MATCHBALL ---
const SECONDI_REALI_PER_MINUTO = 12;   // 1 minuto di gioco = 12 secondi veri (36' = 7 min e 12 s)
const ORDINE_ENTRATA = [3, 0, 1, 2];   // chi entra per primo: attaccante, portiere, difensore, difensore
const MIN_GOL_DOPPIO = 17;             // dal 17' al 20' i gol valgono doppio
const MIN_RUOTA_INIZIO = 20;           // dal 20' al 23' la Ruota
const MIN_RUOTA_FINE = 23;
const MIN_FINE = 36;                   // al 36' verdetto: shootout se pari, altrimenti Matchball
const PORTA_META = 24;                 // mezza larghezza della porta (px)
const GOL_FESTA_SEC = 1.6;             // pausa dopo un gol

let partita = null;
let bannerAttivo = null;
let ultimoTick = 0;
let hudCache = '';

const hudPunteggio = document.getElementById('scoreboard');
const hudStato = document.createElement('div');
hudStato.className = 'gold-subheading';
document.querySelector('.gameplay-header').appendChild(hudStato);

function abbreviazione(nome) {
    return nome.replace(/\bFC\b/g, '').trim().slice(0, 3);
}

function mostraBanner(testo, durata, grande) {
    bannerAttivo = { testo: testo, t: durata || 1.5, grande: !!grande };
}

function creaGiocatori(formazione, dirIniziale) {
    return formazione.map((f, slot) => ({
        x: f.x, y: f.y, ruolo: f.ruolo, slot: slot,
        dir: dirIniziale, inMovimento: false, animT: 0, calcioT: 0,
        stato: 'fuori', tx: f.x, ty: f.y,
        mx: 0, my: dirIniziale === DIR.SU ? -1 : 1,   // ultima direzione di movimento
        stun: 0, contrT: 0, pensaT: 0, tenutaT: 0
    }));
}

// Quanti giocatori per squadra sono in campo al minuto attuale
function giocatoriPerSquadra() {
    const m = partita.minuto;
    if (!partita.matchball) {
        if (m < 1) return 1;
        if (m < 2) return 2;
        if (m < 3) return 3;
        return 4;
    }
    const d = m - MIN_FINE;    // Matchball: esce un giocatore ogni minuto
    if (d < 1) return 4;
    if (d < 2) return 3;
    if (d < 3) return 2;
    return 1;
}

// Porta in campo (o fa uscire) i giocatori. immediato = senza camminata (inizio e dopo i gol)
function setGiocatoriInCampo(n, immediato) {
    const slotInCampo = ORDINE_ENTRATA.slice(0, n);
    [[squadraCasa, FORMAZIONE_CASA, -12], [squadraOspite, FORMAZIONE_OSPITE, campo.width + 12]].forEach(([sq, form, lato]) => {
        sq.giocatori.forEach(p => {
            const deveEssere = slotInCampo.includes(p.slot);
            const bordoX = campo.x + lato;
            if (immediato) {
                p.stato = deveEssere ? 'dentro' : 'fuori';
                p.x = form[p.slot].x; p.y = form[p.slot].y;
                p.inMovimento = false; p.calcioT = 0;
            } else if (deveEssere && p.stato === 'fuori') {
                p.stato = 'entra';
                p.x = bordoX; p.y = centroY;
                p.tx = form[p.slot].x; p.ty = form[p.slot].y;
            } else if (deveEssere && p.stato === 'esce') {
                p.stato = 'entra';
                p.tx = form[p.slot].x; p.ty = form[p.slot].y;
            } else if (!deveEssere && (p.stato === 'dentro' || p.stato === 'entra')) {
                p.stato = 'esce';
                p.tx = bordoX; p.ty = centroY;
            }
        });
    });
}

// Prepara una nuova partita: squadre, formazioni, pallone e cronometro
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

    partita = {
        minuto: 0, fase: 'gioco',          // fase: gioco | gol | shootout | fine
        golCasa: 0, golOsp: 0,
        golDoppio: false, ruota: false,
        matchball: false, target: 0,
        nIn: 1, celebraT: 0, shootT: 0, fineDopoGol: false,
        shoot: null, risultato: null
    };
    setGiocatoriInCampo(1, true);
    mettiPallaAlCentro();
    camera.x = clamp(palla.x - VIEW_W / 2, 0, WORLD_W - VIEW_W);
    camera.y = clamp(palla.y - VIEW_H / 2, 0, WORLD_H - VIEW_H);
    bannerAttivo = null;
    hudCache = '';
    ultimoTick = performance.now();
    mostraBanner('1 CONTRO 1', 2);
}

function mettiPallaAlCentro() {
    palla.x = centroX;
    palla.y = centroY;
    palla.vx = 0;
    palla.vy = 0;
    palla.titolare = null;        // palla libera al centro
    palla.blocco = 0;
    palla.parata = false;
    palla.ultimaSq = null;
    palla.tiroX = centroX;
    palla.tiroY = centroY;
    [squadraCasa, squadraOspite].forEach(sq => sq.giocatori.forEach(p => {
        p.stun = 0; p.contrT = 0; p.pensaT = 0; p.tenutaT = 0; p.calcioT = 0;
    }));
}

// --- GOL ---
// Regole di validità: 4v4 sempre; 2v2 e 3v3 solo tiri dalla metà campo offensiva;
// 1v1 (Mondialito) solo tiri da dentro l'area avversaria.
function zonaTiroValida(sq, x, y) {
    const n = partita.nIn;
    if (n >= 4) return true;
    const attaccaSu = sq === squadraCasa;   // la tua squadra attacca verso l'alto
    if (n === 1) {
        const inAreaX = Math.abs(x - centroX) <= 72;
        return attaccaSu ? (inAreaX && y < campo.y + 56) : (inAreaX && y > campo.y + campo.height - 56);
    }
    return attaccaSu ? y < centroY : y > centroY;
}

function golValido(perCasa) {
    return zonaTiroValida(perCasa ? squadraCasa : squadraOspite, palla.tiroX, palla.tiroY);
}

function golRilevato(perCasa, forzato) {
    const p = partita;
    if (!forzato && !golValido(perCasa)) {
        mostraBanner('GOL NON VALIDO', 1.8);
        palla.vy = perCasa ? Math.abs(palla.vy) : -Math.abs(palla.vy);
        palla.y = perCasa ? campo.y + 3 : campo.y + campo.height - 3;
        return;
    }
    const punti = p.golDoppio ? 2 : 1;
    if (perCasa) p.golCasa += punti; else p.golOsp += punti;
    mostraBanner(p.golDoppio ? 'GOL x2!' : 'GOL!', GOL_FESTA_SEC, true);
    p.fase = 'gol';
    p.celebraT = GOL_FESTA_SEC;
    p.fineDopoGol = p.matchball && (p.golCasa >= p.target || p.golOsp >= p.target);
    palla.vx = 0; palla.vy = 0;
}

function ripartiDopoGol() {
    if (partita.fineDopoGol) { terminaPartita('V'); return; }
    partita.fase = 'gioco';
    setGiocatoriInCampo(partita.nIn, true);
    mettiPallaAlCentro();
}

// --- FINE TEMPO: SHOOTOUT O MATCHBALL ---
function fineTempo() {
    const p = partita;
    if (p.golCasa === p.golOsp) {
        // PROVVISORIO: gli shootout vengono simulati in automatico (regolamento da completare)
        p.fase = 'shootout';
        p.shoot = simulaShootout();
        p.shootT = 3;
        mostraBanner('SHOOTOUT', 3, true);
    } else {
        p.matchball = true;
        p.target = Math.max(p.golCasa, p.golOsp) + 1;
        p.golDoppio = false;
        mostraBanner('MATCHBALL!', 2.5, true);
    }
}

function simulaShootout() {
    let casa = 0, osp = 0;
    for (let i = 0; i < 4; i++) {
        if (Math.random() < 0.7) casa++;
        if (Math.random() < 0.7) osp++;
    }
    while (casa === osp) {        // ad oltranza, stesso ordine di battuta
        if (Math.random() < 0.7) casa++;
        if (Math.random() < 0.7) osp++;
    }
    return { casa: casa, osp: osp };
}

function terminaPartita(tipo) {
    const p = partita;
    p.fase = 'fine';
    let esito, ptCasa, ptOsp;
    if (tipo === 'V') {
        const vinceCasa = p.golCasa > p.golOsp;
        esito = vinceCasa ? 'V' : 'S';
        ptCasa = vinceCasa ? 3 : 0;
        ptOsp = vinceCasa ? 0 : 3;
    } else {
        const vinceCasa = p.shoot.casa > p.shoot.osp;
        esito = vinceCasa ? 'SV' : 'SS';
        ptCasa = vinceCasa ? 2 : 1;
        ptOsp = vinceCasa ? 1 : 2;
    }
    p.risultato = {
        casa: squadraCasa.nome, ospite: squadraOspite.nome,
        golCasa: p.golCasa, golOspite: p.golOsp,
        esito: esito, puntiCasa: ptCasa, puntiOspite: ptOsp, shootout: p.shoot
    };
    // punto di aggancio per il campionato
    if (typeof window.suFinePartita === 'function') window.suFinePartita(p.risultato);
}

// --- CRONOMETRO E FASI ---
function aggiornaPartita(dt) {
    const p = partita;
    if (bannerAttivo) { bannerAttivo.t -= dt; if (bannerAttivo.t <= 0) bannerAttivo = null; }

    if (p.fase === 'gol') {
        p.celebraT -= dt;
        if (p.celebraT <= 0) ripartiDopoGol();
        return;
    }
    if (p.fase === 'shootout') {
        p.shootT -= dt;
        if (p.shootT <= 0) terminaPartita('S');
        return;
    }
    if (p.fase !== 'gioco') return;

    const prima = p.minuto;
    p.minuto += dt / SECONDI_REALI_PER_MINUTO;
    const m = p.minuto;

    if (!p.matchball) {
        if (prima < MIN_GOL_DOPPIO && m >= MIN_GOL_DOPPIO) { p.golDoppio = true; mostraBanner('GOL DOPPIO!', 2, true); }
        if (prima < MIN_RUOTA_INIZIO && m >= MIN_RUOTA_INIZIO) {
            p.golDoppio = false; p.ruota = true;
            mostraBanner('LA RUOTA', 2.5, true);     // PROVVISORIO: la Ruota è ancora da definire
        }
        if (prima < MIN_RUOTA_FINE && m >= MIN_RUOTA_FINE) { p.ruota = false; mostraBanner('4 CONTRO 4', 1.5); }
        if (m >= MIN_FINE) { p.minuto = MIN_FINE; fineTempo(); return; }
    }

    const n = giocatoriPerSquadra();
    if (n !== p.nIn) {
        p.nIn = n;
        setGiocatoriInCampo(n, false);
        mostraBanner(n + ' CONTRO ' + n, 1.5);
    }
}

function aggiornaHud() {
    const p = partita;
    const abb = abbreviazione(squadraCasa.nome) + ' ' + p.golCasa + ' - ' + p.golOsp + ' ' + abbreviazione(squadraOspite.nome);
    const tempo = p.matchball ? 'MB ' + p.target : Math.min(MIN_FINE, Math.floor(p.minuto)) + "'";
    let stato = p.nIn + 'v' + p.nIn;
    if (p.matchball) stato = 'MATCHBALL ' + stato;
    else if (p.golDoppio) stato += ' - GOL x2';
    else if (p.ruota) stato += ' - RUOTA';
    const chiave = abb + tempo + stato;
    if (chiave === hudCache) return;
    hudCache = chiave;
    hudPunteggio.textContent = abb + '  ' + tempo;
    hudStato.textContent = stato;
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

// --- DIFFICOLTÀ: parametri degli avversari (i tuoi compagni giocano sempre a livello MEDIO) ---
const DIFFICOLTA = {
    FACILE:    { vel: 0.85, press: 75,  parata: 0.30, contrasto: 0.25, errore: 0.30, penso: 30 },
    MEDIO:     { vel: 1.05, press: 110, parata: 0.55, contrasto: 0.45, errore: 0.16, penso: 16 },
    DIFFICILE: { vel: 1.25, press: 150, parata: 0.80, contrasto: 0.65, errore: 0.07, penso: 8 }
};
function parametriIA(sq) {
    if (sq === squadraOspite) return DIFFICOLTA[gameState.difficulty] || DIFFICOLTA.MEDIO;
    return DIFFICOLTA.MEDIO;
}

// --- COMANDI: muovi l'attaccante con frecce/WASD, Spazio = tiro (o contrasto senza palla), X = passaggio ---
// Tasti di test: J = gol per te, K = gol avversario, L = avanza di un minuto
const tasti = {};
window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    tasti[k] = true;
    if (gameplayScreen.classList.contains('hidden') || !partita) return;
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    if (e.repeat || partita.fase !== 'gioco') return;
    if (k === 'j') golRilevato(true, true);
    if (k === 'k') golRilevato(false, true);
    if (k === 'l') partita.minuto = Math.floor(partita.minuto) + 1 - 0.001;
});
window.addEventListener('keyup', (e) => { tasti[e.key.toLowerCase()] = false; });

// Giocatori che entrano o escono camminando dal bordo campo a centrocampo
function muoviComparsa(p) {
    const dx = p.tx - p.x, dy = p.ty - p.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1.5) {
        p.x = p.tx; p.y = p.ty;
        p.inMovimento = false;
        p.stato = p.stato === 'entra' ? 'dentro' : 'fuori';
        return;
    }
    p.x += (dx / dist) * 1.6;
    p.y += (dy / dist) * 1.6;
    p.dir = direzioneVerso(dx, dy);
    p.inMovimento = true;
    p.animT++;
}

// --- UTILITÀ PER L'INTELLIGENZA DEI GIOCATORI ---
function squadraDi(p) {
    return squadraCasa.giocatori.includes(p) ? squadraCasa : squadraOspite;
}
function avversariDi(sq) {
    return sq === squadraCasa ? squadraOspite : squadraCasa;
}
function inCampo(sq) {
    return sq.giocatori.filter(p => p.stato === 'dentro');
}
function portaAvversaria(sq) {
    return { x: centroX, y: sq === squadraCasa ? campo.y : campo.y + campo.height };
}
function formazioneDi(sq) {
    return sq === squadraCasa ? FORMAZIONE_CASA : FORMAZIONE_OSPITE;
}
function limitaInCampo(p) {
    p.x = clamp(p.x, campo.x + 6, campo.x + campo.width - 6);
    p.y = clamp(p.y, campo.y + 2, campo.y + campo.height + 2);
}
function muoviVerso(p, tx, ty, vel) {
    const dx = tx - p.x, dy = ty - p.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1.5) { p.inMovimento = false; return false; }
    p.mx = dx / dist; p.my = dy / dist;
    p.x += p.mx * vel;
    p.y += p.my * vel;
    p.dir = direzioneVerso(dx, dy);
    p.inMovimento = true;
    p.animT++;
    limitaInCampo(p);
    return true;
}

// Calcio: la palla parte dal giocatore con la velocità data
function calcia(p, vx, vy) {
    palla.titolare = null;
    palla.vx = vx;
    palla.vy = vy;
    palla.blocco = 18;
    palla.parata = false;
    palla.tiroX = p.x;
    palla.tiroY = p.y;
    palla.ultimaSq = squadraDi(p);
    p.calcioT = 10;
    p.dir = direzioneVerso(vx, vy);
    p.mx = vx / Math.hypot(vx, vy);
    p.my = vy / Math.hypot(vx, vy);
}

function passaA(p, q, errore) {
    const dx = q.x - p.x, dy = q.y - p.y;
    const dist = Math.hypot(dx, dy);
    const ang = Math.atan2(dy, dx) + (Math.random() - 0.5) * 2 * errore;
    const v = clamp(dist / 30, 2.2, 5);
    calcia(p, Math.cos(ang) * v, Math.sin(ang) * v);
}

function prendiPalla(p) {
    palla.titolare = p;
    palla.vx = 0;
    palla.vy = 0;
    palla.parata = false;
    palla.ultimaSq = squadraDi(p);
    p.pensaT = parametriIA(squadraDi(p)).penso;
}

// Compagno a cui passare: il più avanzato (verso la porta avversaria) entro 190 px
function scegliPassaggio(p, sq) {
    const su = sq === squadraCasa;
    let migliore = null, punteggio = -Infinity;
    inCampo(sq).forEach(q => {
        if (q === p) return;
        const dist = Math.hypot(q.x - p.x, q.y - p.y);
        if (dist < 25 || dist > 190) return;
        const avanzamento = su ? (p.y - q.y) : (q.y - p.y);
        const val = avanzamento - dist * 0.2 + (q.ruolo === 'POR' ? -80 : 0);
        if (val > punteggio) { punteggio = val; migliore = q; }
    });
    return migliore;
}

// --- PORTIERE ---
function aggiornaPortiere(p, sq, par, mio) {
    const linea = formazioneDi(sq)[0].y;
    if (mio) {
        p.inMovimento = false;
        p.tenutaT--;
        if (p.tenutaT <= 0) {
            const dest = scegliPassaggio(p, sq);
            if (dest) passaA(p, dest, par.errore * 0.5);
            else calcia(p, 0, sq === squadraCasa ? -4 : 4);
        }
        return;
    }
    const tx = clamp(palla.x, centroX - 22, centroX + 22);
    if (!muoviVerso(p, tx, linea, par.vel)) {
        p.dir = direzioneVerso(palla.x - p.x, palla.y - p.y);
    }
    // parata: una sola possibilità per ogni tiro
    if (!palla.titolare && !palla.parata) {
        const versoMiaPorta = sq === squadraCasa ? palla.vy > 0.5 : palla.vy < -0.5;
        if (versoMiaPorta && Math.hypot(palla.x - p.x, palla.y - (p.y - 6)) < 13) {
            palla.parata = true;
            if (Math.random() < par.parata) {
                prendiPalla(p);
                p.tenutaT = 60;
                mostraBanner('PARATA!', 0.9, false);
            }
        }
    }
}

// --- GIOCATORI DI MOVIMENTO (avversari e compagni) ---
function aggiornaGiocatoreIA(p, sq, controllato) {
    const par = parametriIA(sq);
    const avv = avversariDi(sq);
    if (p.stun > 0) p.stun--;
    if (p.calcioT > 0) p.calcioT--;
    if (p.contrT > 0) p.contrT--;
    const mio = palla.titolare === p;

    if (p.ruolo === 'POR') { aggiornaPortiere(p, sq, par, mio); return; }

    const porta = portaAvversaria(sq);
    const su = sq === squadraCasa;
    const compagni = inCampo(sq).filter(q => q !== p);
    const form = formazioneDi(sq)[p.slot];

    // 1) HO LA PALLA
    if (mio) {
        p.pensaT--;
        const dxp = porta.x - p.x, dyp = porta.y - p.y;
        const dist = Math.hypot(dxp, dyp);
        const tiroPossibile = dist < 150 && zonaTiroValida(sq, p.x, p.y);
        if (tiroPossibile && p.pensaT <= 0) {
            const bersaglioX = porta.x + (Math.random() - 0.5) * 30;
            const ang = Math.atan2(porta.y - p.y, bersaglioX - p.x) + (Math.random() - 0.5) * 2 * par.errore;
            const v = 4.6;
            calcia(p, Math.cos(ang) * v, Math.sin(ang) * v);
            return;
        }
        const avvicino = inCampo(avv).filter(q => Math.hypot(q.x - p.x, q.y - p.y) < 40 && q.ruolo !== 'POR');
        const dest = scegliPassaggio(p, sq);
        const davantiAlla = su ? p.y < centroY : p.y > centroY;
        if (dest && p.pensaT <= 0 && (p.ruolo === 'DIF' || (avvicino.length > 0 && !davantiAlla))) {
            passaA(p, dest, par.errore * 0.5);
            return;
        }
        // dribbling verso la porta, scartando chi è vicino
        let vx = dxp / dist, vy = dyp / dist;
        if (avvicino.length > 0) {
            const a = avvicino[0];
            const lato = (p.x - a.x) >= 0 ? 1 : -1;
            vx += lato * 0.9;
            const l = Math.hypot(vx, vy);
            vx /= l; vy /= l;
        }
        muoviVerso(p, p.x + vx * 10, p.y + vy * 10, par.vel * 0.95);
        return;
    }

    // 2) UN COMPAGNO HA LA PALLA: mi smarco
    const titolare = palla.titolare;
    if (titolare && squadraDi(titolare) === sq) {
        let tx, ty;
        if (p.ruolo === 'ATT') {
            tx = titolare.x < centroX ? titolare.x + 55 : titolare.x - 55;
            ty = titolare.y + (su ? -70 : 70);
            const limite = su ? campo.y + 45 : campo.y + campo.height - 45;
            ty = su ? Math.max(ty, limite) : Math.min(ty, limite);
        } else {
            tx = form.x;
            ty = form.y + (su ? -25 : 25);
        }
        if (!muoviVerso(p, tx, ty, par.vel * 0.9)) p.dir = direzioneVerso(palla.x - p.x, palla.y - p.y);
        return;
    }

    // 3) LA PALLA È LIBERA O ANDREBBE RECUPERATA
    const rif = titolare || palla;
    const candidati = compagni.concat([p]).filter(q => q.ruolo !== 'POR' && q !== controllato);
    candidati.sort((q1, q2) => Math.hypot(q1.x - rif.x, q1.y - rif.y) - Math.hypot(q2.x - rif.x, q2.y - rif.y));
    const distPalla = Math.hypot(rif.x - p.x, rif.y - p.y);
    if (candidati[0] === p && distPalla < par.press * 1.3) {
        // contrasto
        if (titolare && distPalla < 12 && p.contrT <= 0 && titolare.stun <= 0) {
            p.contrT = 45;
            p.calcioT = 8;
            if (Math.random() < par.contrasto) {
                titolare.stun = 25;
                prendiPalla(p);
            }
        }
        muoviVerso(p, rif.x, rif.y, par.vel);
        return;
    }
    // posizione di difesa
    let tx, ty;
    if (p.ruolo === 'ATT') {
        tx = centroX + (palla.x - centroX) * 0.5;
        ty = form.y + (palla.y - form.y) * 0.35;
    } else {
        tx = form.x + (palla.x - centroX) * 0.35;
        ty = form.y + (palla.y - form.y) * 0.22;
    }
    if (!muoviVerso(p, tx, ty, par.vel * 0.9)) p.dir = direzioneVerso(palla.x - p.x, palla.y - p.y);
}

// --- PALLONE: fisica, gol e raccolta ---
function aggiornaPalla() {
    const t = palla.titolare;
    if (t) {
        if (t.stato !== 'dentro') { palla.titolare = null; return; }
        const lenv = Math.hypot(t.mx, t.my) || 1;
        palla.x += (t.x + (t.mx / lenv) * 7 - palla.x) * 0.35;
        palla.y += (t.y - 3 + (t.my / lenv) * 5 - palla.y) * 0.35;
        return;
    }
    palla.x += palla.vx;
    palla.y += palla.vy;
    palla.vx *= 0.97;
    palla.vy *= 0.97;
    if (palla.x < campo.x + 2 || palla.x > campo.x + campo.width - 2) {
        palla.vx *= -1;
        palla.x = clamp(palla.x, campo.x + 2, campo.x + campo.width - 2);
    }
    const inPorta = Math.abs(palla.x - centroX) <= PORTA_META;
    const lineaAlta = campo.y, lineaBassa = campo.y + campo.height;
    if (palla.y < lineaAlta) {
        if (!inPorta) { palla.vy = Math.abs(palla.vy); palla.y = lineaAlta; }
        else if (palla.y < lineaAlta - 5) { golRilevato(true, false); return; }
    } else if (palla.y > lineaBassa) {
        if (!inPorta) { palla.vy = -Math.abs(palla.vy); palla.y = lineaBassa; }
        else if (palla.y > lineaBassa + 5) { golRilevato(false, false); return; }
    }
    // raccolta: il giocatore più vicino (non stordito) prende la palla
    if (palla.blocco > 0) { palla.blocco--; return; }
    let scelto = null, dmin = 9;
    [squadraCasa, squadraOspite].forEach(sq => {
        inCampo(sq).forEach(p => {
            if (p.stun > 0) return;
            const d = Math.hypot(palla.x - p.x, palla.y - (p.y - 3));
            if (d < dmin) { dmin = d; scelto = p; }
        });
    });
    if (scelto) prendiPalla(scelto);
}

function aggiornaGiocoDiProva() {
    if (partita.fase !== 'gioco') return;
    const g = squadraCasa.giocatori[3];     // il giocatore che controlli: l'attaccante

    // --- il tuo giocatore ---
    let dx = 0, dy = 0;
    if (tasti['arrowleft'] || tasti['a']) dx -= 1;
    if (tasti['arrowright'] || tasti['d']) dx += 1;
    if (tasti['arrowup'] || tasti['w']) dy -= 1;
    if (tasti['arrowdown'] || tasti['s']) dy += 1;
    if (g.stun > 0) { g.stun--; dx = 0; dy = 0; }

    if (dx !== 0 || dy !== 0) {
        const len = Math.hypot(dx, dy);
        g.mx = dx / len; g.my = dy / len;
        g.x += g.mx * 1.3;
        g.y += g.my * 1.3;
        g.dir = direzioneVerso(dx, dy);
        g.inMovimento = true;
        g.animT++;
    } else {
        g.inMovimento = false;
    }
    limitaInCampo(g);

    if (g.calcioT > 0) g.calcioT--;
    const titolare = palla.titolare;
    const palleggio = titolare === g;
    const vicinaLibera = !titolare && Math.hypot(palla.x - g.x, palla.y - (g.y - 3)) < 12;
    if ((tasti[' '] || tasti['x']) && g.calcioT === 0 && g.stun === 0) {
        g.calcioT = 10;
        if (palleggio || vicinaLibera) {
            if (tasti[' ']) {
                calcia(g, g.mx * 4.5, g.my * 4.5);                // tiro
            } else {
                // passaggio: verso il compagno più in linea con la direzione in cui guardi
                let dest = null, migliore = 0.6;
                inCampo(squadraCasa).forEach(q => {
                    if (q === g) return;
                    const ddx = q.x - g.x, ddy = q.y - g.y;
                    const dd = Math.hypot(ddx, ddy);
                    if (dd < 25 || dd > 220) return;
                    const coseno = (ddx * g.mx + ddy * g.my) / dd;
                    if (coseno > migliore) { migliore = coseno; dest = q; }
                });
                if (dest) passaA(g, dest, 0);
                else calcia(g, g.mx * 2.8, g.my * 2.8);
            }
        } else if (tasti[' '] && titolare && squadraDi(titolare) !== squadraCasa &&
                   Math.hypot(titolare.x - g.x, titolare.y - g.y) < 14) {
            // contrasto: senza palla Spazio prova a rubarla
            if (Math.random() < 0.55) {
                titolare.stun = 25;
                prendiPalla(g);
            } else {
                g.stun = 12;
            }
        }
    }

    // --- tutti gli altri ---
    [squadraCasa, squadraOspite].forEach(sq => {
        sq.giocatori.forEach(p => {
            if (p === g || p.stato !== 'dentro') return;
            aggiornaGiocatoreIA(p, sq, g);
        });
    });

    aggiornaPalla();
}

// Giocatori che entrano o escono dal campo
function aggiornaComparse() {
    [squadraCasa, squadraOspite].forEach(sq => {
        sq.giocatori.forEach(p => {
            if (p.stato === 'entra' || p.stato === 'esce') muoviComparsa(p);
        });
    });
}

// --- TESTI SUL CAMPO ---
function testoCentrato(txt, y, size, colore) {
    let dim = size;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = dim + "px 'Press Start 2P', monospace";
    while (ctx.measureText(txt).width > VIEW_W - 8 && dim > 5) {
        dim--;
        ctx.font = dim + "px 'Press Start 2P', monospace";
    }
    const cx = Math.round(VIEW_W / 2);
    ctx.fillStyle = '#000000';
    ctx.fillText(txt, cx + 1, y + 1);
    ctx.fillStyle = colore;
    ctx.fillText(txt, cx, y);
}

function disegnaBanner() {
    if (!bannerAttivo) return;
    const y = Math.round(VIEW_H * 0.3);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, y - 14, VIEW_W, 28);
    testoCentrato(bannerAttivo.testo, y, bannerAttivo.grande ? 14 : 9, '#ffd700');
}

function disegnaFinePartita() {
    const r = partita.risultato;
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const y0 = Math.round(VIEW_H * 0.28);
    testoCentrato('FINE PARTITA', y0, 11, '#ffd700');
    testoCentrato(abbreviazione(r.casa) + ' ' + r.golCasa + ' - ' + r.golOspite + ' ' + abbreviazione(r.ospite), y0 + 26, 10, '#ffffff');
    if (r.shootout) {
        testoCentrato('SHOOTOUT ' + r.shootout.casa + ' - ' + r.shootout.osp, y0 + 46, 8, '#ffffff');
    }
    const nomi = { V: 'VITTORIA', S: 'SCONFITTA', SV: 'VITTORIA SHOOTOUT', SS: 'SCONFITTA SHOOTOUT' };
    testoCentrato(nomi[r.esito] + ' (' + r.esito + ')', y0 + 70, 8, '#ffd700');
    testoCentrato('+' + r.puntiCasa + ' PUNTI', y0 + 90, 8, '#ffffff');
}

// --- RENDER ---
function drawGame() {
    ctx.imageSmoothingEnabled = false;
    const ora = performance.now();
    const dt = Math.min(0.05, (ora - ultimoTick) / 1000);   // se la scheda va in background il tempo non salta
    ultimoTick = ora;

    aggiornaPartita(dt);
    aggiornaGiocoDiProva();
    aggiornaComparse();
    aggiornaCamera();
    aggiornaHud();

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
        ...squadraCasa.giocatori.filter(g => g.stato !== 'fuori').map(g => ({ g, sq: squadraCasa })),
        ...squadraOspite.giocatori.filter(g => g.stato !== 'fuori').map(g => ({ g, sq: squadraOspite }))
    ].sort((p, q) => p.g.y - q.g.y);
    tutti.forEach(p => disegnaGiocatore(p.g, p.sq));

    // Pallone
    const px = Math.round(palla.x - camera.x);
    const py = Math.round(palla.y - camera.y);
    ctx.fillStyle = '#000000';
    ctx.fillRect(px - 3, py - 3, 6, 6);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px - 2, py - 2, 4, 4);

    disegnaBanner();
    if (partita.fase === 'fine') disegnaFinePartita();
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
