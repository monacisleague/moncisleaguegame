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
const PANNELLO_TOUCH = 252;           // altezza (px) della zona occupata dai comandi sul telefono, con tasti di dimensione media
const WORLD_W = 352;
const WORLD_H = 676;

// Versione delle immagini: se sostituisci giocatori.png o gli stadio_frame, aumenta questo numero (2, 3, 4...)
// così il browser scarica subito i file nuovi invece di usare quelli vecchi salvati in memoria.
const VERSIONE_IMMAGINI = '2';

// Due immagini = due frame dell'animazione della folla
const stadioFrames = [new Image(), new Image()];
stadioFrames[0].src = 'stadio_frame0.png?v=' + VERSIONE_IMMAGINI;
stadioFrames[1].src = 'stadio_frame1.png?v=' + VERSIONE_IMMAGINI;

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
    // l'azione si centra nella parte di schermo libera dai comandi (sopra la zona dei joystick)
    const targetY = clamp(palla.y - (VIEW_H - margineComandi) / 2, 0, WORLD_H - VIEW_H + margineComandi);
    camera.x += (targetX - camera.x) * 0.15;
    camera.y += (targetY - camera.y) * 0.15;
}

// --- GIOCATORI: SPRITE E SQUADRE ---
// giocatori_nuovi.png contiene 24 calciatori (6 squadre x 4 giocatori), nello stesso ordine di teamsList.
// Per ogni giocatore: 3 righe (davanti, dietro, di lato) x 4 frame (fermo, corsa A, corsa B, calcio).
const sprite = new Image();
sprite.src = 'giocatori_nuovi.png?v=' + VERSIONE_IMMAGINI;      // file nuovo, con un nome diverso dal vecchio giocatori.png
const CELLA_W = 20, CELLA_H = 26;       // dimensione di ogni sprite in giocatori_nuovi.png
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
let giocatoreUtente = null;     // il giocatore della tua squadra che stai controllando
let bloccoCambioT = 0;
let fiatoUtente = 100;          // resistenza per lo scatto (0-100)
let affaticato = false;
let jInizio = 0;                // da quando tieni premuto J (passaggio)
const azioniCoda = [];          // azioni premute, eseguite al prossimo aggiornamento
let inPausa = false;             // partita in pausa (menu aperto)
let modalitaGioco = 'amichevole';   // 'amichevole' oppure 'campionato'
let configPartita = null;       // nel campionato: { casa, ospite, diff } della partita da giocare
let difficoltaInUso = null;     // difficoltà della partita in corso
let kInizio = 0;                // da quando tieni premuto TIRO sul telefono (serve per la potenza)
const joy = { attivo: false, x: 0, y: 0 };          // joystick analogico, valori da -1 a 1
let modoSpeciale = 'carta';     // il tasto speciale può essere 'carta' o 'rigore'
let touchVisibile = false;
let margineComandi = 0;          // quanto schermo (in pixel del gioco) occupano i comandi in basso; la camera può scorrere oltre il fondo per quella misura
// Preferenze del giocatore (si salvano nel browser)
const impostazioni = { cambio: 'automatico', touch: true, touchSize: 'medium' };
let bannerAttivo = null;
let ultimoTick = 0;
let hudCache = '';

const hudPunteggio = document.getElementById('scoreboard');
const hudStato = document.createElement('div');
hudStato.className = 'gold-subheading';
document.querySelector('.gameplay-header').appendChild(hudStato);
const hudSO = document.createElement('div');          // risultati dei tiri dello shootout
hudSO.className = 'gold-subheading';
hudSO.style.whiteSpace = 'pre';
hudSO.style.lineHeight = '1.7';
document.querySelector('.gameplay-header').appendChild(hudSO);

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
        stun: 0, contrT: 0, pensaT: 0, tenutaT: 0, dribT: 0, dribCd: 0
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
    const idxCasa = (configPartita && configPartita.casa !== undefined) ? configPartita.casa : currentTeamIndex;
    difficoltaInUso = (configPartita && configPartita.diff) || gameState.difficulty;
    let idxOspite;
    if (configPartita && configPartita.ospite !== undefined) {
        idxOspite = configPartita.ospite;                  // campionato: l'avversario è quello del calendario
    } else {
        // amichevole: l'avversario è una squadra a caso diversa dalla tua
        do { idxOspite = Math.floor(Math.random() * teamsList.length); } while (idxOspite === idxCasa);
    }

    squadraCasa.idx = idxCasa;
    squadraCasa.nome = teamsList[idxCasa].name;
    squadraCasa.colore = teamsList[idxCasa].color;
    squadraOspite.idx = idxOspite;
    squadraOspite.nome = teamsList[idxOspite].name;
    squadraOspite.colore = teamsList[idxOspite].color;

    squadraCasa.giocatori = creaGiocatori(FORMAZIONE_CASA, DIR.SU);
    squadraOspite.giocatori = creaGiocatori(FORMAZIONE_OSPITE, DIR.GIU);
    giocatoreUtente = squadraCasa.giocatori[3];
    bloccoCambioT = 0;
    fiatoUtente = 100;
    affaticato = false;
    jInizio = 0;
    kInizio = 0;
    joy.attivo = false; joy.x = 0; joy.y = 0;
    impostaPausa(false);
    azioniCoda.length = 0;

    partita = {
        minuto: 0, fase: 'gioco',          // fase: gioco | gol | shootout | fine
        golCasa: 0, golOsp: 0,
        golDoppio: false, ruota: false,
        matchball: false, target: 0,
        nIn: 1, celebraT: 0, shootT: 0, fineDopoGol: false,
        shoot: null, risultato: null, ripresa: null,
        so: null, ripartenza: null, inCorsa: false, subisce: null
    };
    setGiocatoriInCampo(1, true);
    avviaCorsa();               // 1 contro 1: partono dalle aree di rigore e corrono verso la palla al centro
    hudSO.textContent = '';
    camera.x = clamp(palla.x - VIEW_W / 2, 0, WORLD_W - VIEW_W);
    camera.y = clamp(palla.y - (VIEW_H - margineComandi) / 2, 0, WORLD_H - VIEW_H + margineComandi);
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
    if (p.so && p.so.attivo) { golShootout(perCasa); return; }
    if (!forzato && !golValido(perCasa)) {
        mostraBanner('GOL NON VALIDO', 1.8);
        palla.vy = perCasa ? Math.abs(palla.vy) : -Math.abs(palla.vy);
        palla.y = perCasa ? campo.y + 3 : campo.y + campo.height - 3;
        return;
    }
    const punti = p.golDoppio ? 2 : 1;
    if (perCasa) p.golCasa += punti; else p.golOsp += punti;
    p.subisce = perCasa ? squadraOspite : squadraCasa;        // chi ha subito il gol riparte
    mostraBanner(p.golDoppio ? 'GOL x2!' : 'GOL!', GOL_FESTA_SEC, true);
    p.fase = 'gol';
    p.celebraT = GOL_FESTA_SEC;
    p.fineDopoGol = p.matchball && (p.golCasa >= p.target || p.golOsp >= p.target);
    palla.vx = 0; palla.vy = 0;
}

function ripartiDopoGol() {
    if (partita.fineDopoGol) { terminaPartita('V'); return; }
    partita.fase = 'gioco';
    partita.ripresa = null;
    setGiocatoriInCampo(partita.nIn, true);
    mettiPallaAlCentro();
    // 1 contro 1: rimessa dal fondo per chi ha subito il gol; da 2 contro 2 in su si riparte dal centrocampo
    if (partita.nIn === 1) ripartenzaDalFondo(partita.subisce);
    else ripartenzaDalCentro(partita.subisce);
}

// --- FINE TEMPO: SHOOTOUT O MATCHBALL ---
function fineTempo() {
    const p = partita;
    if (p.golCasa === p.golOsp) {
        avviaShootout();
    } else {
        p.matchball = true;
        p.target = Math.max(p.golCasa, p.golOsp) + 1;
        p.golDoppio = false;
        mostraBanner('MATCHBALL!', 2.5, true);
    }
}

// simulazione veloce di uno shootout: serve solo per le partite del campionato che non giochi tu
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
    if (p.fase !== 'gioco') return;
    if (p.so && p.so.attivo) { aggiornaShootout(dt); return; }
    if (p.ripartenza) {
        // conto alla rovescia prima della corsa verso la palla: il cronometro è fermo
        p.ripartenza.t -= dt;
        if (p.ripartenza.t <= 0) { p.ripartenza = null; mostraBanner('VIA!', 0.8, true); }
        return;
    }

    const prima = p.minuto;
    p.minuto += dt / SECONDI_REALI_PER_MINUTO;
    const m = p.minuto;

    if (!p.matchball) {
        if (prima < MIN_GOL_DOPPIO && m >= MIN_GOL_DOPPIO) { p.golDoppio = true; mostraBanner('GOL DOPPIO!', 2, true); }
        if (prima < MIN_RUOTA_INIZIO && m >= MIN_RUOTA_INIZIO) {
            p.golDoppio = false; p.ruota = true;
            mostraBanner('LA RUOTA', 2.5, true);     // PROVVISORIO: la Ruota è ancora da definire
        }
        if (prima < MIN_RUOTA_FINE && m >= MIN_RUOTA_FINE) {
            p.ruota = false;
            mostraBanner('4 CONTRO 4', 1.5);
            // si riparte in 4 contro 4: in parità tutti corrono verso la palla dalle aree, altrimenti batte la squadra che sta perdendo
            if (p.golCasa === p.golOsp) avviaCorsa();
            else {
                setGiocatoriInCampo(p.nIn, true);
                mettiPallaAlCentro();
                ripartenzaDalCentro(p.golCasa < p.golOsp ? squadraCasa : squadraOspite);
            }
        }
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
    if (p.so && p.so.attivo) { aggiornaHudShootout(); return; }
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
    ctx.fillRect(x - 7, y - 1, 14, 3);
    const evidenzia = (g === giocatoreUtente && squadra === squadraCasa);
    if (evidenzia) {
        ctx.fillStyle = '#ff9a1f';
        ctx.fillRect(x - 5, y - 2, 11, 1);
        ctx.fillRect(x - 7, y - 1, 2, 1); ctx.fillRect(x + 6, y - 1, 2, 1);
        ctx.fillRect(x - 8, y, 1, 1);     ctx.fillRect(x + 8, y, 1, 1);
        ctx.fillRect(x - 7, y + 1, 2, 1); ctx.fillRect(x + 6, y + 1, 2, 1);
        ctx.fillRect(x - 5, y + 2, 11, 1);
    }

    if (!(sprite.complete && sprite.naturalWidth > 0)) {
        // se l'immagine non è ancora caricata: segnaposto nel colore della squadra
        ctx.fillStyle = squadra.colore;
        ctx.fillRect(x - 5, y - 20, 10, 19);
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
        ctx.drawImage(sprite, sx, sy, CELLA_W, CELLA_H, -CELLA_W / 2, y - (CELLA_H - 1), CELLA_W, CELLA_H);
        ctx.restore();
    } else {
        ctx.drawImage(sprite, sx, sy, CELLA_W, CELLA_H, x - CELLA_W / 2, y - (CELLA_H - 1), CELLA_W, CELLA_H);
    }

    if (evidenzia) {
        // freccia arancione sopra la testa
        ctx.fillStyle = '#ff9a1f';
        ctx.fillRect(x - 3, y - 34, 7, 1);
        ctx.fillRect(x - 2, y - 33, 5, 1);
        ctx.fillRect(x - 1, y - 32, 3, 1);
        ctx.fillRect(x, y - 31, 1, 1);
        // barra del fiato (si vede solo quando non è piena)
        if (fiatoUtente < 100) {
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(x - 7, y + 4, 14, 3);
            ctx.fillStyle = affaticato ? '#e03030' : '#ffd700';
            ctx.fillRect(x - 6, y + 5, Math.round(12 * fiatoUtente / 100), 1);
        }
        // carica del tiro (sul telefono) mentre tieni premuto TIRO
        if (kInizio > 0) {
            const caricaT = Math.min(1, (performance.now() - kInizio) / TEMPO_POTENZA_TIRO);
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(x - 7, y - 43, 14, 3);
            ctx.fillStyle = caricaT >= 1 ? '#ff4040' : '#ff9a1f';
            ctx.fillRect(x - 6, y - 42, Math.round(12 * caricaT), 1);
        }
        // carica del passaggio lungo mentre tieni premuto J
        if (jInizio > 0) {
            const carica = Math.min(1, (performance.now() - jInizio) / TEMPO_PASSAGGIO_LUNGO);
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(x - 7, y - 39, 14, 3);
            ctx.fillStyle = carica >= 1 ? '#ffd700' : '#ffffff';
            ctx.fillRect(x - 6, y - 38, Math.round(12 * carica), 1);
        }
    }
}

// --- DIFFICOLTÀ: parametri degli avversari (i tuoi compagni giocano sempre a livello MEDIO) ---
// Portiere: esce = quanto può uscire dalla linea di porta (px; l'area piccola arriva a 20),
// raggio = quanto lontano arriva a parare, velP = velocità, uscita = probabilità di togliere la palla all'attaccante,
// reazione = frame che il portiere impiega a muoversi dopo che parte un tiro
const DIFFICOLTA = {
    FACILE:    { vel: 0.85, press: 75,  parata: 0.30, contrasto: 0.25, errore: 0.30, penso: 30, esce: 20, raggio: 10, velP: 0.95, uscita: 0.08, reazione: 16 },
    MEDIO:     { vel: 1.05, press: 110, parata: 0.55, contrasto: 0.45, errore: 0.16, penso: 16, esce: 26, raggio: 12, velP: 1.10, uscita: 0.16, reazione: 10 },
    DIFFICILE: { vel: 1.25, press: 150, parata: 0.80, contrasto: 0.65, errore: 0.07, penso: 8,  esce: 34, raggio: 14, velP: 1.30, uscita: 0.26, reazione: 5 }
};
function parametriIA(sq) {
    if (sq === squadraOspite) return DIFFICOLTA[difficoltaInUso || gameState.difficulty] || DIFFICOLTA.MEDIO;
    return DIFFICOLTA.MEDIO;
}

// --- COMANDI DA TASTIERA ---
// WASD / frecce = muovi | Shift = scatto | J = passaggio (tieni premuto = passaggio lungo)
// Spazio = contrasto | K = tiro | L = rinvio lungo del portiere | I = dribbling | Q = cambia giocatore
// Tasti di prova (da togliere): 7 = gol per te, 8 = gol avversario, 9 = avanza di un minuto
const tasti = {};
const TEMPO_PASSAGGIO_LUNGO = 300;     // ms di pressione di J per il passaggio lungo
const TEMPO_POTENZA_TIRO = 700;        // ms di pressione di TIRO per la potenza massima (telefono)
window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    tasti[k] = true;
    if (gameplayScreen.classList.contains('hidden') || !partita) return;
    if ((k === 'escape' || k === 'p') && !e.repeat) { impostaPausa(!inPausa); return; }
    if (inPausa) return;
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    if (e.repeat || partita.fase !== 'gioco') return;
    if (k === 'j') iniziaPassaggio();
    if (k === 'k') azioniCoda.push({ a: 'tiro' });
    if (k === 'l') azioniCoda.push({ a: 'rinvio' });
    if (k === 'i') azioniCoda.push({ a: 'dribbling' });
    if (k === ' ') azioniCoda.push({ a: 'contrasto' });
    if (k === 'q') cambiaGiocatore();
    if (k === '7') golRilevato(true, true);
    if (k === '8') golRilevato(false, true);
    if (k === '9') partita.minuto = Math.floor(partita.minuto) + 1 - 0.001;
    if (azioniCoda.length > 6) azioniCoda.shift();
});
window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    tasti[k] = false;
    if (k === 'j') rilasciaPassaggio();
});

// Passaggio: si decide quando rilasci il tasto (J o pulsante a schermo); se tieni premuto è lungo
function iniziaPassaggio() {
    if (!partita || partita.fase !== 'gioco') return;
    if (jInizio === 0) jInizio = performance.now();
}
function rilasciaPassaggio() {
    if (jInizio > 0) {
        if (partita && partita.fase === 'gioco') {
            azioniCoda.push({ a: 'passaggio', lungo: performance.now() - jInizio >= TEMPO_PASSAGGIO_LUNGO });
        }
        jInizio = 0;
    }
}

// Movimento: joystick (analogico) oppure tastiera (digitale)
function leggiMovimento() {
    if (joy.attivo) {
        const m = Math.hypot(joy.x, joy.y);
        if (m < 0.18) return { x: 0, y: 0, mag: 0 };
        return { x: joy.x / m, y: joy.y / m, mag: Math.min(1, m) };
    }
    let dx = 0, dy = 0;
    if (tasti['arrowleft'] || tasti['a']) dx -= 1;
    if (tasti['arrowright'] || tasti['d']) dx += 1;
    if (tasti['arrowup'] || tasti['w']) dy -= 1;
    if (tasti['arrowdown'] || tasti['s']) dy += 1;
    if (dx === 0 && dy === 0) return { x: 0, y: 0, mag: 0 };
    const len = Math.hypot(dx, dy);
    return { x: dx / len, y: dy / len, mag: 1 };
}

// Hai la palla (o sei vicino a una palla libera)?
function inPossesso() {
    const g = giocatoreUtente;
    const t = palla.titolare;
    if (t) return t === g;
    return !!g && Math.hypot(palla.x - g.x, palla.y - (g.y - 3)) < 12;
}

// Elenco dei comandi nelle impostazioni (così non serve modificare index.html)
(function aggiornaElencoComandi() {
    const griglia = document.querySelector('.controls-grid');
    if (!griglia) return;
    const comandi = [
        ['Movimento', 'WASD / Frecce'],
        ['Scatto', 'Shift'],
        ['Passaggio', 'J (tieni premuto: lungo)'],
        ['Tiro', 'K'],
        ['Contrasto', 'Spazio'],
        ['Dribbling', 'I'],
        ['Rinvio lungo portiere', 'L'],
        ['Cambia giocatore', 'Q']
    ];
    griglia.innerHTML = '';
    comandi.forEach(([nome, tasto]) => {
        const riga = document.createElement('div');
        const sp = document.createElement('span');
        sp.textContent = nome + ': ';
        const st = document.createElement('strong');
        st.textContent = tasto;
        riga.appendChild(sp);
        riga.appendChild(st);
        griglia.appendChild(riga);
    });
})();

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
    // shootout: il tiro è partito
    if (partita && partita.so && partita.so.attivo && partita.so.fase === 'tiro' && p === partita.so.tiratore && !partita.so.tiroFatto) {
        partita.so.tiroFatto = true;
        partita.so.esitoT = 3.5;
    }
}

function passaA(p, q, errore, vMax) {
    const dx = q.x - p.x, dy = q.y - p.y;
    const dist = Math.hypot(dx, dy);
    const ang = Math.atan2(dy, dx) + (Math.random() - 0.5) * 2 * errore;
    const v = clamp(dist / 30, 2.2, vMax || 5);
    calcia(p, Math.cos(ang) * v, Math.sin(ang) * v);
    palla.passatoDa = p;
    palla.passaT = performance.now();
}

function prendiPalla(p) {
    palla.titolare = p;
    palla.vx = 0;
    palla.vy = 0;
    palla.parata = false;
    palla.ultimaSq = squadraDi(p);
    p.pensaT = parametriIA(squadraDi(p)).penso;
    if (partita) partita.inCorsa = false;       // qualcuno ha preso la palla: la corsa è finita
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

// Compagno a cui passare per far avanzare l'azione: deve essere più avanti di me di almeno minAvanz px
// (valori negativi = accetto anche passaggi laterali). Mai a chi mi ha appena passato la palla.
function scegliPassaggioAvanti(p, sq, minAvanz) {
    const su = sq === squadraCasa;
    const recente = palla.passatoDa && (performance.now() - palla.passaT) < 3000 ? palla.passatoDa : null;
    let migliore = null, punteggio = -Infinity;
    inCampo(sq).forEach(q => {
        if (q === p || q === recente || q.ruolo === 'POR') return;
        const dist = Math.hypot(q.x - p.x, q.y - p.y);
        if (dist < 25 || dist > 190) return;
        const avanzamento = su ? (p.y - q.y) : (q.y - p.y);
        if (avanzamento < minAvanz) return;
        // il compagno deve essere libero: nessun avversario a meno di 30 px
        if (inCampo(avversariDi(sq)).some(o => o.ruolo !== 'POR' && Math.hypot(o.x - q.x, o.y - q.y) < 30)) return;
        const val = avanzamento - dist * 0.2;
        if (val > punteggio) { punteggio = val; migliore = q; }
    });
    return migliore;
}

// --- PORTIERE ---
function aggiornaPortiere(p, sq, par, mio) {
    if (p.contrT > 0) p.contrT--;
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
    const casa = sq === squadraCasa;                              // la tua squadra difende la porta in basso
    const lineaPorta = casa ? campo.y + campo.height : campo.y;
    const titolare = palla.titolare;
    const attaccante = titolare && squadraDi(titolare) !== sq ? titolare : null;
    const dPalla = Math.hypot(palla.x - centroX, palla.y - lineaPorta);
    const velPalla = Math.hypot(palla.vx, palla.vy);
    let tx, ty, vel = par.velP;

    const maxD = par.esce + 6;                       // oltre questa distanza dalla linea di porta non esce mai
    if (!titolare && dPalla < par.esce + 10 && velPalla < 2.2) {
        // palla libera e lenta vicino alla porta: esco a prenderla
        tx = palla.x; ty = palla.y; vel = par.velP * 1.25;
    } else if (attaccante && dPalla < 85 && Math.hypot(attaccante.x - p.x, attaccante.y - p.y) < par.esce + 28) {
        // un attaccante con la palla è in area: esco a chiudergli lo spazio e provo a togliergli la palla
        const dx = centroX - attaccante.x, dy = lineaPorta - attaccante.y;
        const l = Math.hypot(dx, dy) || 1;
        tx = attaccante.x + (dx / l) * 10; ty = attaccante.y + (dy / l) * 10;
        vel = par.velP * 1.2;
        if (Math.hypot(attaccante.x - p.x, attaccante.y - p.y) < 13 && p.contrT <= 0 && attaccante.stun <= 0) {
            p.contrT = 55;
            p.calcioT = 8;
            if (Math.random() < par.uscita && !(attaccante.dribT > 0)) {
                attaccante.stun = 25;
                prendiPalla(p);
                p.tenutaT = casa ? 300 : 60;
                mostraBanner('USCITA!', 0.8, false);
                return;
            }
        }
    } else {
        // copertura: sulla linea tra il centro della porta e la palla, più avanti quanto più la palla è vicina
        const ux = (palla.x - centroX) / (dPalla || 1), uy = (palla.y - lineaPorta) / (dPalla || 1);
        const base = 17;
        const D = base + (par.esce - base) * clamp(1 - dPalla / 260, 0, 1);
        tx = clamp(centroX + ux * D, centroX - (PORTA_META + 10), centroX + (PORTA_META + 10));
        ty = lineaPorta + uy * D;
    }
    // il portiere resta dentro la sua area
    tx = clamp(tx, centroX - 60, centroX + 60);
    ty = casa ? clamp(ty, lineaPorta - maxD, lineaPorta - 6) : clamp(ty, lineaPorta + 6, lineaPorta + maxD);
    // reazione: appena parte un tiro verso la sua porta, il portiere impiega un attimo a muoversi
    const tiroVersoPorta = !palla.titolare && (casa ? palla.vy > 2.4 : palla.vy < -2.4);
    if (tiroVersoPorta) {
        if (p.reazT === undefined || p.reazT < 0) p.reazT = par.reazione + (partita.so && partita.so.attivo ? 5 : 0);       // nuovo tiro (nello shootout reagisce un po' più tardi)
        if (p.reazT > 0) { p.reazT--; p.inMovimento = false; vel = 0; }
    } else {
        p.reazT = -1;
    }
    if (vel === 0 || !muoviVerso(p, tx, ty, vel)) {
        if (vel !== 0) p.dir = direzioneVerso(palla.x - p.x, palla.y - p.y);
    }

    // parata: una sola possibilità per ogni tiro; se la manca, a volte lo devia
    if (!palla.titolare && !palla.parata) {
        const versoMiaPorta = casa ? palla.vy > 0.5 : palla.vy < -0.5;
        // punto di riferimento al centro dei piedi: così i due portieri (alto e basso) si comportano allo stesso modo
        if (versoMiaPorta && Math.hypot(palla.x - p.x, palla.y - p.y) < par.raggio) {
            palla.parata = true;
            if (Math.random() < par.parata * (partita.so && partita.so.attivo ? 0.8 : 1)) {
                prendiPalla(p);
                p.tenutaT = casa ? 300 : 60;   // se è il tuo, hai ~5 secondi per decidere
                mostraBanner('PARATA!', 0.9, false);
            } else if (Math.random() < 0.35) {
                palla.vx += (palla.x < centroX ? -1 : 1) * 0.9;     // deviazione: può finire in calcio d'angolo
                palla.ultimaSq = sq;
            }
        }
    }
}

// --- GIOCATORI DI MOVIMENTO (avversari e compagni non controllati) ---
function aggiornaGiocatoreIA(p, sq) {
    const par = parametriIA(sq);
    const avv = avversariDi(sq);
    if (p.stun > 0) p.stun--;
    if (p.calcioT > 0) p.calcioT--;
    if (p.contrT > 0) p.contrT--;
    const mio = palla.titolare === p;

    const tiraloShootout = partita.so && partita.so.attivo && partita.so.tiratore === p;
    if (p.ruolo === 'POR' && !tiraloShootout) { aggiornaPortiere(p, sq, par, mio); return; }

    const porta = portaAvversaria(sq);
    const su = sq === squadraCasa;
    const propria = { x: centroX, y: su ? campo.y + campo.height : campo.y };
    const fuori = inCampo(sq).filter(q => q.ruolo !== 'POR');   // giocatori di movimento della mia squadra
    const tempo = performance.now() / 1000;
    const respiro = (fase) => Math.sin(tempo * 1.3 + p.slot * 2.1 + fase) * 4;   // piccoli movimenti naturali

    // 1) HO LA PALLA
    if (mio) {
        p.pensaT--;
        const dxp = porta.x - p.x, dyp = porta.y - p.y;
        const dist = Math.hypot(dxp, dyp);
        if (tiraloShootout && partita.so.fase === 'tiro') {
            const gk = partita.so.portiere;
            const urgente = partita.so.t < 1.4;
            if ((dist < 80 && p.pensaT <= 0) || urgente) {
                const lato = gk.x <= porta.x ? 1 : -1;                     // angolo opposto a dove sta il portiere
                const bersaglioX = porta.x + lato * (10 + Math.random() * 9);
                const ang = Math.atan2(porta.y - p.y, bersaglioX - p.x) + (Math.random() - 0.5) * 2 * par.errore * 0.4;   // nello shootout tira più preciso
                calcia(p, Math.cos(ang) * 4.8, Math.sin(ang) * 4.8);
                return;
            }
            muoviVerso(p, porta.x, porta.y, par.vel * 0.95);               // avanza verso la porta
            return;
        }
        const compagniVicini = fuori.filter(q => q !== p && Math.hypot(q.x - p.x, q.y - p.y) < 85).length;
        const compagniNecessari = Math.min(2, fuori.length - 1);
        const soloAvanti = compagniVicini < compagniNecessari;             // la squadra non è ancora salita: aspetto
        const tiroPossibile = dist < 150 && zonaTiroValida(sq, p.x, p.y);
        const haAspettato = p.pensaT < -150;                                // dopo ~2,5 s tira comunque
        // shootout: se il tempo sta per finire tira comunque
        const urgenza = partita.so && partita.so.attivo && partita.so.fase === 'tiro' && partita.so.t < 1.4;
        if ((tiroPossibile && p.pensaT <= 0 && (!soloAvanti || dist < 125 || haAspettato)) || urgenza) {
            const bersaglioX = porta.x + (Math.random() - 0.5) * 30;
            const ang = Math.atan2(porta.y - p.y, bersaglioX - p.x) + (Math.random() - 0.5) * 2 * par.errore;
            const v = 4.6;
            calcia(p, Math.cos(ang) * v, Math.sin(ang) * v);
            return;
        }
        const avvicino = inCampo(avv).filter(q => Math.hypot(q.x - p.x, q.y - p.y) < 40 && q.ruolo !== 'POR');
        const stretto = avvicino.some(q => Math.hypot(q.x - p.x, q.y - p.y) < 26);
        const inPropriaMeta = su ? p.y > centroY : p.y < centroY;
        // passaggio utile: solo se fa avanzare l'azione (sono pressato, oppure sono arretrato e un compagno è molto più avanti)
        const destAvanti = scegliPassaggioAvanti(p, sq, 30);
        const avanzDest = destAvanti ? (su ? p.y - destAvanti.y : destAvanti.y - p.y) : 0;
        if (destAvanti && p.pensaT <= 0 && (avvicino.length > 0 || (inPropriaMeta && avanzDest >= 45))) {
            passaA(p, destAvanti, par.errore * 0.5);
            return;
        }
        // via di fuga: marcato stretto da un po', scarico lateralmente (mai indietro, mai a chi mi ha passato la palla)
        if (stretto && p.pensaT < -90) {
            const laterale = scegliPassaggioAvanti(p, sq, -5);
            if (laterale) { passaA(p, laterale, par.errore * 0.5); return; }
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
        // se i compagni sono lontani rallento, così la squadra sale insieme
        const velDribbling = par.vel * ((soloAvanti && dist > 95 && !haAspettato) ? 0.45 : 0.95);
        muoviVerso(p, p.x + vx * 10, p.y + vy * 10, velDribbling);
        return;
    }

    const titolare = palla.titolare;

    // 2) LA MIA SQUADRA HA LA PALLA: mi smarco (uno più avanti, uno più largo)
    if (titolare && squadraDi(titolare) === sq) {
        const altri = fuori.filter(q => q !== titolare).sort((q1, q2) => q1.x - q2.x);
        const idx = altri.indexOf(p);
        const lato = altri.length <= 1 ? (titolare.x < centroX ? 1 : -1) : (idx === 0 ? -1 : 1);
        const ordinePerAvanzamento = altri.slice().sort((q1, q2) => su ? q1.y - q2.y : q2.y - q1.y);
        const avanti = ordinePerAvanzamento[0] === p;
        let tx = clamp(titolare.x + lato * 60, campo.x + 25, campo.x + campo.width - 25);
        let ty = titolare.y + (su ? -1 : 1) * (avanti ? 55 : 20);
        if (titolare.ruolo === 'POR') {
            // palla al portiere: la squadra si apre a centrocampo
            ty = centroY + (su ? 1 : -1) * (avanti ? 10 : 70);
        }
        const limite = su ? campo.y + 45 : campo.y + campo.height - 45;
        ty = su ? Math.max(ty, limite) : Math.min(ty, limite);
        // scatto: i compagni sono più veloci di chi porta palla, così lo raggiungono
        if (!muoviVerso(p, tx + respiro(0), ty + respiro(1), par.vel * 1.2)) p.dir = direzioneVerso(palla.x - p.x, palla.y - p.y);
        return;
    }

    // 3) NON HO LA PALLA: uno la pressa, uno marca, uno copre
    const rif = titolare || palla;
    const ordinati = fuori.slice().sort((q1, q2) =>
        Math.hypot(q1.x - rif.x, q1.y - rif.y) - Math.hypot(q2.x - rif.x, q2.y - rif.y));
    const rango = ordinati.indexOf(p);
    const distPalla = Math.hypot(rif.x - p.x, rif.y - p.y);

    if (rango === 0 && (distPalla < par.press * 1.3 || partita.inCorsa)) {
        // pressing e contrasto
        if (titolare && titolare.ruolo !== 'POR' && distPalla < 12 && p.contrT <= 0 && titolare.stun <= 0) {
            p.contrT = 45;
            p.calcioT = 8;
            if (Math.random() < par.contrasto && !(titolare.dribT > 0)) {
                titolare.stun = 25;
                prendiPalla(p);
            }
        }
        muoviVerso(p, rif.x, rif.y, par.vel);
        return;
    }
    let tx, ty;
    const pericolosi = inCampo(avv)
        .filter(q => q.ruolo !== 'POR' && q !== titolare)
        .sort((q1, q2) => Math.abs(q1.y - propria.y) - Math.abs(q2.y - propria.y));
    if (rango <= 1 && pericolosi.length > 0) {
        // marcatura: mi metto tra l'avversario e la mia porta
        const o = pericolosi[0];
        tx = o.x + (propria.x - o.x) * 0.2;
        ty = o.y + (propria.y - o.y) * 0.15;
    } else {
        // copertura: resto indietro, tra la palla e la mia porta
        tx = centroX + (palla.x - centroX) * 0.35 + (p.x < centroX ? -30 : 30);
        ty = propria.y + (rif.y - propria.y) * 0.5;
        ty = su ? clamp(ty, centroY + 30, propria.y - 45) : clamp(ty, propria.y + 45, centroY - 30);
    }
    if (!muoviVerso(p, tx + respiro(2), ty + respiro(3), par.vel * 1.05)) p.dir = direzioneVerso(palla.x - p.x, palla.y - p.y);
}

// --- SCELTA DEL GIOCATORE CHE CONTROLLI ---
function distDallaPalla(q) {
    const rif = palla.titolare || palla;
    return Math.hypot(q.x - rif.x, q.y - rif.y);
}

function giocatoriDiMovimentoCasa() {
    return inCampo(squadraCasa).filter(q => q.ruolo !== 'POR').sort((a, b) => distDallaPalla(a) - distDallaPalla(b));
}

// Controlli sempre chi ha la palla (portiere compreso). Senza palla dipende dall'impostazione:
// - automatico: passi al tuo giocatore più vicino al pallone
// - manuale: resti sullo stesso giocatore finché non premi Cambia
function sceltaGiocatoreUtente() {
    if (partita.so && partita.so.attivo) {
        // shootout: controlli solo chi tira per la tua squadra; quando tirano gli avversari non controlli nessuno
        giocatoreUtente = (partita.so.sq === squadraCasa && partita.so.tiratore) ? partita.so.tiratore : fantasma;
        return;
    }
    const t = palla.titolare;
    if (t && squadraDi(t) === squadraCasa) { giocatoreUtente = t; return; }
    const valido = giocatoreUtente && giocatoreUtente.stato === 'dentro' && giocatoreUtente.ruolo !== 'POR';
    const lista = giocatoriDiMovimentoCasa();
    if (lista.length === 0) return;
    if (!valido) { giocatoreUtente = lista[0]; return; }          // il giocatore è uscito o era il portiere
    if (impostazioni.cambio === 'manuale') return;               // niente cambi automatici
    if (bloccoCambioT > 0) { bloccoCambioT--; return; }
    if (distDallaPalla(lista[0]) + 14 < distDallaPalla(giocatoreUtente)) giocatoreUtente = lista[0];
}

// Manuale (tasto Q): passa al giocatore successivo in un ordine fisso (difensore, difensore, attaccante)
function cambiaGiocatore() {
    if (palla.titolare && squadraDi(palla.titolare) === squadraCasa) return;   // con la palla non si cambia
    const lista = inCampo(squadraCasa).filter(q => q.ruolo !== 'POR').sort((a, b) => a.slot - b.slot);
    if (lista.length < 2) return;
    const i = lista.indexOf(giocatoreUtente);
    giocatoreUtente = i === -1 ? giocatoriDiMovimentoCasa()[0] : lista[(i + 1) % lista.length];
    bloccoCambioT = 90;
}

// --- PALLONE FUORI: RIMESSA LATERALE, RIMESSA DAL FONDO, CALCIO D'ANGOLO ---
// Rimessa laterale: palla fuori dai lati, la batte la squadra che non l'ha toccata per ultima.
// Linea di fondo fuori dai pali: se l'ultimo tocco è dell'attaccante è rimessa dal fondo (la batte il portiere),
// se è stata deviata dalla squadra che difende è calcio d'angolo per gli attaccanti.
function avviaRipresa(tipo, bx, by) {
    if (partita.so && partita.so.attivo) { chiudiTiro(false, 'FUORI!'); return; }
    const ultimo = palla.ultimaSq;
    let sq, nome, x, y, px, py;
    if (tipo === 'laterale') {
        sq = ultimo ? avversariDi(ultimo) : (Math.random() < 0.5 ? squadraCasa : squadraOspite);
        nome = 'RIMESSA LATERALE';
        const sinistra = bx < centroX;
        x = sinistra ? campo.x : campo.x + campo.width;
        y = clamp(by, campo.y + 14, campo.y + campo.height - 14);
        px = x + (sinistra ? 8 : -8); py = y;
    } else {
        const alta = by < centroY;                                  // linea di fondo in alto = porta degli ospiti
        const difende = alta ? squadraOspite : squadraCasa;
        if (ultimo === difende) {
            sq = avversariDi(difende);
            nome = "CALCIO D'ANGOLO";
            const sinistra = bx < centroX;
            x = sinistra ? campo.x + 3 : campo.x + campo.width - 3;
            y = alta ? campo.y + 3 : campo.y + campo.height - 3;
            px = x + (sinistra ? 7 : -7); py = y + (alta ? 5 : -5);
        } else {
            sq = difende;
            nome = 'RIMESSA DAL FONDO';
            const yPorta = formazioneDi(difende)[0].y;
            x = centroX; y = yPorta + (alta ? 7 : -7);
            px = centroX; py = yPorta;
        }
    }
    partita.ripresa = { tipo: (tipo === 'laterale' ? 'laterale' : (nome === "CALCIO D'ANGOLO" ? 'angolo' : 'fondo')), sq: sq, bx: x, by: y, px: px, py: py, t: 55 };
    palla.titolare = null;
    palla.vx = 0; palla.vy = 0;
    palla.x = x; palla.y = y;
    azioniCoda.length = 0;
    mostraBanner(nome, 1.2, false);
}

function eseguiRipresa() {
    const r = partita.ripresa;
    partita.ripresa = null;
    const giocatori = inCampo(r.sq);
    let tiratore = r.tipo === 'fondo' ? giocatori.find(p => p.ruolo === 'POR') : null;
    if (!tiratore) {
        const altri = giocatori.filter(p => p.ruolo !== 'POR');
        const lista = altri.length ? altri : giocatori;
        lista.sort((a, b) => Math.hypot(a.x - r.bx, a.y - r.by) - Math.hypot(b.x - r.bx, b.y - r.by));
        tiratore = lista[0];
    }
    if (!tiratore) { mettiPallaAlCentro(); return; }
    tiratore.x = r.px; tiratore.y = r.py;
    // guarda verso il campo
    const dx = centroX - tiratore.x, dy = centroY - tiratore.y;
    const l = Math.hypot(dx, dy) || 1;
    tiratore.mx = dx / l; tiratore.my = dy / l;
    tiratore.dir = direzioneVerso(dx, dy);
    tiratore.inMovimento = false;
    tiratore.stun = 0;
    palla.x = r.bx; palla.y = r.by;
    prendiPalla(tiratore);
    palla.blocco = 0;
    palla.tiroX = tiratore.x; palla.tiroY = tiratore.y;
    palla.ultimaSq = r.sq;
    if (tiratore.ruolo === 'POR') tiratore.tenutaT = r.sq === squadraCasa ? 300 : 60;
}

// --- PALLONE: fisica, gol e raccolta ---
function aggiornaPalla() {
    const t = palla.titolare;
    if (t) {
        if (t.stato !== 'dentro') { palla.titolare = null; return; }
        const lenv = Math.hypot(t.mx, t.my) || 1;
        palla.x += (t.x + (t.mx / lenv) * 7 - palla.x) * 0.35;
        palla.y += (t.y - 3 + (t.my / lenv) * 5 - palla.y) * 0.35;
        palla.x = clamp(palla.x, campo.x + 1, campo.x + campo.width - 1);     // portando palla non si esce dal campo
        return;
    }
    palla.x += palla.vx;
    palla.y += palla.vy;
    palla.vx *= 0.97;
    palla.vy *= 0.97;
    // fuori dai lati del campo: rimessa laterale
    if (palla.x < campo.x || palla.x > campo.x + campo.width) { avviaRipresa('laterale', palla.x, palla.y); return; }
    const inPorta = Math.abs(palla.x - centroX) <= PORTA_META;
    const lineaAlta = campo.y, lineaBassa = campo.y + campo.height;
    if (palla.y < lineaAlta) {
        if (inPorta) { if (palla.y < lineaAlta - 5) { golRilevato(true, false); return; } }
        else { avviaRipresa('fondo', palla.x, palla.y); return; }       // fuori dalla linea di fondo
    } else if (palla.y > lineaBassa) {
        if (inPorta) { if (palla.y > lineaBassa + 5) { golRilevato(false, false); return; } }
        else { avviaRipresa('fondo', palla.x, palla.y); return; }
    }
    // raccolta: il giocatore più vicino (non stordito) prende la palla
    if (palla.blocco > 0) { palla.blocco--; return; }
    let scelto = null, dmin = 9;
    [squadraCasa, squadraOspite].forEach(sq => {
        inCampo(sq).forEach(p => {
            if (p.stun > 0) return;
            if (p.ruolo === 'POR' && Math.hypot(palla.vx, palla.vy) > 2.4 && !(partita.so && partita.so.tiratore === p)) return;   // i tiri li para solo con la parata
            const d = Math.hypot(palla.x - p.x, palla.y - (p.y - 3));
            if (d < dmin) { dmin = d; scelto = p; }
        });
    });
    if (scelto) prendiPalla(scelto);
}

function aggiornaGiocoDiProva() {
    if (partita.fase !== 'gioco') return;
    if (partita.so && partita.so.attivo && partita.so.fase !== 'tiro') { azioniCoda.length = 0; return; }
    if (partita.ripartenza) { azioniCoda.length = 0; return; }
    if (partita.ripresa) {
        // breve pausa prima della ripresa (il cronometro continua)
        azioniCoda.length = 0;
        partita.ripresa.t--;
        if (partita.ripresa.t <= 0) eseguiRipresa();
        return;
    }
    sceltaGiocatoreUtente();
    const g = giocatoreUtente;     // il giocatore che controlli in questo momento
    const portiereVero = g.ruolo === 'POR' && !(partita.so && partita.so.attivo);

    // --- il tuo giocatore ---
    const inp = leggiMovimento();
    let dx = inp.x, dy = inp.y;
    if (g.stun > 0) { g.stun--; dx = 0; dy = 0; inp.mag = 0; }
    if (g.dribT > 0) g.dribT--;
    if (g.dribCd > 0) g.dribCd--;

    const inMov = (dx !== 0 || dy !== 0) && inp.mag > 0;
    // velocità: normale, scatto (Shift, consuma fiato) o dribbling (breve accelerazione)
    let velocita = 1.2;
    let scattando = false;
    if (inMov && tasti['shift'] && fiatoUtente > 0 && !affaticato && !portiereVero) {
        velocita = 1.65;
        scattando = true;
        fiatoUtente = Math.max(0, fiatoUtente - 0.7);
        if (fiatoUtente <= 0) affaticato = true;
    } else {
        fiatoUtente = Math.min(100, fiatoUtente + 0.4);
        if (affaticato && fiatoUtente >= 25) affaticato = false;
    }
    // joystick analogico: più lo spingi, più corri
    if (joy.attivo) velocita *= 0.45 + 0.55 * Math.min(1, Math.max(0, inp.mag - 0.18) / 0.55);
    if (g.dribT > 0) velocita = 2.1;

    if (inMov) {
        const len = Math.hypot(dx, dy);
        g.mx = dx / len; g.my = dy / len;
        g.x += g.mx * velocita;
        g.y += g.my * velocita;
        g.dir = direzioneVerso(dx, dy);
        g.inMovimento = true;
        g.animT += (scattando || g.dribT > 0) ? 1.6 : 1;
    } else {
        g.inMovimento = false;
    }
    limitaInCampo(g);
    if (portiereVero) {
        // il portiere si muove solo dentro la sua area
        g.x = clamp(g.x, centroX - 60, centroX + 60);
        g.y = clamp(g.y, campo.y + campo.height - 50, campo.y + campo.height + 2);
    }

    if (g.calcioT > 0) g.calcioT--;
    if (g.contrT > 0) g.contrT--;
    const titolare = palla.titolare;
    const palleggio = titolare === g;
    const vicinaLibera = !titolare && Math.hypot(palla.x - g.x, palla.y - (g.y - 3)) < 12;
    const hoLaPalla = palleggio || vicinaLibera;

    // il portiere che tieni in mano la palla deve rilanciare entro qualche secondo
    if (portiereVero && palleggio) {
        g.tenutaT--;
        if (g.tenutaT <= 0) {
            const dest = scegliPassaggio(g, squadraCasa);
            if (dest) passaA(g, dest, 0.05); else calcia(g, 0, -4);
        }
    }

    // azioni premute dall'ultimo aggiornamento
    while (azioniCoda.length > 0) {
        const az = azioniCoda.shift();
        if (g.stun > 0) continue;
        if (az.a === 'tiro' && hoLaPalla && g.calcioT === 0) {
            g.calcioT = 10;
            const vTiro = az.forza !== undefined ? 3.6 + 2.6 * az.forza : 4.8;   // sul telefono la potenza dipende da quanto tieni premuto
            if (portiereVero) calcia(g, g.mx * 7, g.my * 7);      // il portiere rinvia lungo
            else calcia(g, g.mx * vTiro, g.my * vTiro);
        } else if (az.a === 'rinvio' && hoLaPalla && portiereVero && g.calcioT === 0) {
            g.calcioT = 10;
            calcia(g, g.mx * 7, g.my * 7);
        } else if (az.a === 'passaggio' && hoLaPalla && g.calcioT === 0) {
            g.calcioT = 10;
            // verso il compagno più in linea con la direzione in cui guardi (più lontano se lungo)
            const lungo = !!az.lungo;
            const dMin = lungo ? 100 : 25, dMax = lungo ? 380 : 220;
            let dest = null, migliore = lungo ? 0.45 : 0.6;
            inCampo(squadraCasa).forEach(q => {
                if (q === g) return;
                const ddx = q.x - g.x, ddy = q.y - g.y;
                const dd = Math.hypot(ddx, ddy);
                if (dd < dMin || dd > dMax) return;
                const coseno = (ddx * g.mx + ddy * g.my) / dd;
                if (coseno > migliore) { migliore = coseno; dest = q; }
            });
            if (dest) passaA(g, dest, 0, lungo ? 8 : 5);
            else calcia(g, g.mx * (lungo ? 7 : 2.8), g.my * (lungo ? 7 : 2.8));
        } else if (az.a === 'dribbling' && palleggio && g.dribCd === 0 && !portiereVero) {
            g.dribT = 16;       // breve scatto: in questo tempo non ti rubano la palla
            g.dribCd = 50;
        } else if (az.a === 'contrasto' && g.contrT === 0) {
            g.contrT = 30;
            if (titolare && squadraDi(titolare) !== squadraCasa && titolare.ruolo !== 'POR' &&
                Math.hypot(titolare.x - g.x, titolare.y - g.y) < 14) {
                g.calcioT = 8;
                if (Math.random() < 0.55 && !(titolare.dribT > 0)) {
                    titolare.stun = 25;
                    prendiPalla(g);
                } else {
                    g.stun = 12;
                }
            }
        }
    }

    // --- tutti gli altri giocatori in campo ---
    [squadraCasa, squadraOspite].forEach(sq => {
        sq.giocatori.forEach(p => {
            if (p === g || p.stato !== 'dentro') return;
            aggiornaGiocatoreIA(p, sq);
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

    if (!inPausa) {
        aggiornaPartita(dt);
        aggiornaGiocoDiProva();
        aggiornaComparse();
        aggiornaCamera();
    }
    aggiornaHud();
    aggiornaTouchUi();
    aggiornaBottoneFine();

    // Frame della folla: cambia ogni 450 ms
    const frame = Math.floor(Date.now() / 450) % 2;
    const img = stadioFrames[frame];

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    if (img.complete && img.naturalWidth > 0) {
        // coordinate camera arrotondate per evitare sfarfallii dei pixel
        const sy = Math.round(camera.y);
        const alt = Math.min(VIEW_H, WORLD_H - sy);        // oltre il fondo non c'è immagine: resta lo sfondo scuro
        if (alt > 0) ctx.drawImage(img, Math.round(camera.x), sy, VIEW_W, alt, 0, 0, VIEW_W, alt);
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

    if (!inPausa) { disegnaBanner(); disegnaTempi(); }
    if (partita.fase === 'fine') disegnaFinePartita();
    if (inPausa) {
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);
        testoCentrato('PAUSA', Math.round(VIEW_H * 0.3), 14, '#ffd700');
    }
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
    // zona occupata dai comandi sul telefono, convertita in pixel del gioco
    const tsComandi = { small: 0.8, medium: 1, large: 1.2 }[impostazioni.touchSize] || 1;
    margineComandi = touchVisibile ? Math.round(PANNELLO_TOUCH * tsComandi * dpr / scala) : 0;
    margineComandi = Math.min(margineComandi, Math.round(VIEW_H * 0.45));
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
    modalitaGioco = 'amichevole';
    configPartita = null;
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


// =====================================================================
// CONTROLLI TOUCH (TELEFONO) E IMPOSTAZIONI DI GIOCO
// =====================================================================

// --- carte e rigore presidenziale: per ora solo segnaposto, li colleghiamo quando arrivano le regole ---
function azionaCarta() {
    mostraBanner('CARTA: IN ARRIVO', 1.4, false);
}
function azionaRigorePresidenziale() {
    mostraBanner('RIGORE PRES.: IN ARRIVO', 1.4, false);
}

// --- salvataggio delle preferenze nel browser ---
function caricaImpostazioni() {
    try {
        const salvate = JSON.parse(localStorage.getItem('monaci_impostazioni') || '{}');
        if (salvate.cambio === 'automatico' || salvate.cambio === 'manuale') impostazioni.cambio = salvate.cambio;
        if (typeof salvate.touch === 'boolean') impostazioni.touch = salvate.touch;
        if (['small', 'medium', 'large'].includes(salvate.touchSize)) impostazioni.touchSize = salvate.touchSize;
    } catch (e) { /* se il browser non permette il salvataggio, si usano i valori di default */ }
}
function salvaImpostazioni() {
    try { localStorage.setItem('monaci_impostazioni', JSON.stringify(impostazioni)); } catch (e) { /* ignora */ }
}

// --- costruzione dei pulsanti a schermo ---
const touchUi = document.createElement('div');
touchUi.id = 'touch-ui';
touchUi.className = 'hidden medium';
touchUi.innerHTML =
    '<div id="joy-base"><div id="joy-stick"></div></div>' +
    '<button type="button" id="tbtn-tiro" class="tbtn tbtn-grande">TIRO</button>' +
    '<button type="button" id="tbtn-passaggio" class="tbtn tbtn-medio">PASSAGGIO</button>' +
    '<button type="button" id="tbtn-dribbling" class="tbtn tbtn-medio">DRIBBLING</button>' +
    '<button type="button" id="tbtn-cambia" class="tbtn tbtn-piccolo">CAMBIA</button>' +
    '<button type="button" id="tbtn-speciale" class="tbtn tbtn-piccolo">CARTA</button>' +
    '<button type="button" id="tbtn-scambia" class="tbtn tbtn-micro">&#9664;&#9654;</button>';
gameplayScreen.appendChild(touchUi);
touchUi.addEventListener('contextmenu', (e) => e.preventDefault());

const tbTiro = document.getElementById('tbtn-tiro');
const tbPassaggio = document.getElementById('tbtn-passaggio');
const tbDribbling = document.getElementById('tbtn-dribbling');
const tbCambia = document.getElementById('tbtn-cambia');
const tbSpeciale = document.getElementById('tbtn-speciale');
const tbScambia = document.getElementById('tbtn-scambia');
const joyBase = document.getElementById('joy-base');
const joyStick = document.getElementById('joy-stick');

// Collega un pulsante: giu() alla pressione, su() al rilascio (funziona anche con più dita insieme)
function collegaPulsante(el, giu, su) {
    el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        try { el.setPointerCapture(e.pointerId); } catch (err) { /* ok */ }
        el.classList.add('premuto');
        if (partita && partita.fase === 'gioco' && !inPausa) giu();
    });
    const rilascia = () => {
        if (!el.classList.contains('premuto')) return;
        el.classList.remove('premuto');
        if (su) su();
    };
    el.addEventListener('pointerup', rilascia);
    el.addEventListener('pointercancel', rilascia);
    el.addEventListener('lostpointercapture', rilascia);
}

// TIRO: con la palla, tieni premuto per scegliere la potenza; senza palla diventa CONTRASTO
let tiroComeContrasto = false;
collegaPulsante(tbTiro,
    () => {
        if (inPossesso()) { tiroComeContrasto = false; kInizio = performance.now(); }
        else { tiroComeContrasto = true; azioniCoda.push({ a: 'contrasto' }); }
    },
    () => {
        if (!tiroComeContrasto && kInizio > 0 && partita && partita.fase === 'gioco') {
            const forza = Math.min(1, (performance.now() - kInizio) / TEMPO_POTENZA_TIRO);
            azioniCoda.push({ a: 'tiro', forza: forza });
        }
        kInizio = 0;
    });

// PASSAGGIO: un tocco = passaggio al compagno; tieni premuto = passaggio più lungo e forte
collegaPulsante(tbPassaggio, iniziaPassaggio, rilasciaPassaggio);

// DRIBBLING: scatto che fa superare l'avversario
collegaPulsante(tbDribbling, () => azioniCoda.push({ a: 'dribbling' }), null);

// CAMBIA: passa al giocatore successivo
collegaPulsante(tbCambia, () => cambiaGiocatore(), null);

// CARTA / RIGORE PRESIDENZIALE: il pulsante usa la funzione attiva, le frecce cambiano funzione
collegaPulsante(tbSpeciale, () => {
    if (modoSpeciale === 'carta') azionaCarta(); else azionaRigorePresidenziale();
}, null);
collegaPulsante(tbScambia, () => { modoSpeciale = modoSpeciale === 'carta' ? 'rigore' : 'carta'; }, null);

// JOYSTICK analogico
let joyPointerId = null;
function joyAggiorna(e) {
    const r = joyBase.getBoundingClientRect();
    const raggio = r.width / 2 * 0.75;
    let x = (e.clientX - (r.left + r.width / 2)) / raggio;
    let y = (e.clientY - (r.top + r.height / 2)) / raggio;
    const m = Math.hypot(x, y);
    if (m > 1) { x /= m; y /= m; }
    joy.x = x; joy.y = y; joy.attivo = true;
    joyStick.style.transform = 'translate(-50%, -50%) translate(' + (x * raggio) + 'px, ' + (y * raggio) + 'px)';
}
function joyRilascia() {
    joyPointerId = null;
    joy.attivo = false; joy.x = 0; joy.y = 0;
    joyStick.style.transform = 'translate(-50%, -50%)';
}
joyBase.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (inPausa) return;
    joyPointerId = e.pointerId;
    try { joyBase.setPointerCapture(e.pointerId); } catch (err) { /* ok */ }
    joyAggiorna(e);
});
joyBase.addEventListener('pointermove', (e) => { if (e.pointerId === joyPointerId) joyAggiorna(e); });
joyBase.addEventListener('pointerup', (e) => { if (e.pointerId === joyPointerId) joyRilascia(); });
joyBase.addEventListener('pointercancel', (e) => { if (e.pointerId === joyPointerId) joyRilascia(); });

// Aggiorna scritte e carica dei pulsanti (chiamata a ogni frame)
let touchCache = '';
function aggiornaTouchUi() {
    if (!touchVisibile) return;
    const ora = performance.now();
    const g = giocatoreUtente;
    const possesso = inPossesso();
    const portiereConPalla = !!g && g.ruolo === 'POR' && palla.titolare === g;
    const etichettaTiro = portiereConPalla ? 'RINVIO' : (possesso ? 'TIRO' : 'CONTRASTO');
    const squadraHaPalla = !!palla.titolare && squadraDi(palla.titolare) === squadraCasa;
    const chiave = etichettaTiro + '|' + modoSpeciale + '|' + squadraHaPalla;
    if (chiave !== touchCache) {
        touchCache = chiave;
        tbTiro.textContent = etichettaTiro;
        tbTiro.classList.toggle('lungo', etichettaTiro.length > 5);
        tbSpeciale.innerHTML = modoSpeciale === 'carta' ? 'CARTA' : 'RIGORE<br>PRES.';
        tbCambia.classList.toggle('spento', squadraHaPalla);     // con la palla non si cambia
    }
    const caricaTiro = kInizio > 0 ? Math.min(1, (ora - kInizio) / TEMPO_POTENZA_TIRO) : 0;
    const caricaPass = jInizio > 0 ? Math.min(1, (ora - jInizio) / TEMPO_PASSAGGIO_LUNGO) : 0;
    tbTiro.style.setProperty('--carica', (caricaTiro * 100) + '%');
    tbPassaggio.style.setProperty('--carica', (caricaPass * 100) + '%');
    tbTiro.classList.toggle('pronto', caricaTiro >= 1);
    tbPassaggio.classList.toggle('pronto', caricaPass >= 1);
}

// Mostra i pulsanti solo su schermi touch (o con ?touch=1 nell'indirizzo, per provarli dal PC)
function haSchermoTouch() {
    return navigator.maxTouchPoints > 0 || 'ontouchstart' in window ||
        new URLSearchParams(location.search).get('touch') === '1';
}
function applicaTouch() {
    touchVisibile = impostazioni.touch && haSchermoTouch();
    touchUi.classList.toggle('hidden', !touchVisibile);
    ['small', 'medium', 'large'].forEach(c => touchUi.classList.toggle(c, c === impostazioni.touchSize));
    if (!touchVisibile) { joyRilascia(); kInizio = 0; }
    touchCache = '';
    aggiornaScala();
}

// --- impostazioni: cambio giocatore, joypad touch, dimensione tasti ---
(function inizializzaImpostazioni() {
    caricaImpostazioni();

    // nuova sezione "CAMBIO GIOCATORE" (aggiunta qui, non serve modificare index.html)
    const contenitore = document.querySelector('#settings-modal .modal-content');
    const toggleTouch = document.getElementById('touch-toggle');
    const gruppoTouch = toggleTouch ? toggleTouch.closest('.settings-group') : null;
    if (contenitore && !document.getElementById('cambio-giocatore')) {
        const sezione = document.createElement('section');
        sezione.className = 'settings-group';
        sezione.innerHTML =
            '<h3 class="gold-text">CAMBIO GIOCATORE</h3>' +
            '<div class="setting-item">' +
            '<label for="cambio-giocatore">Modalità:</label>' +
            '<select id="cambio-giocatore">' +
            '<option value="automatico">Automatico</option>' +
            '<option value="manuale">Manuale</option>' +
            '</select></div>' +
            '<p style="font-size:8px;line-height:1.7;color:#bbb;">Automatico: passi al giocatore più vicino al pallone. ' +
            'Manuale: cambi solo tu (tasto Q o pulsante CAMBIA).</p>';
        contenitore.insertBefore(sezione, gruppoTouch || document.getElementById('btn-close-settings'));
    }

    const selCambio = document.getElementById('cambio-giocatore');
    if (selCambio) {
        selCambio.value = impostazioni.cambio;
        selCambio.addEventListener('change', () => { impostazioni.cambio = selCambio.value; salvaImpostazioni(); });
    }
    if (toggleTouch) {
        toggleTouch.checked = impostazioni.touch;
        toggleTouch.addEventListener('change', () => { impostazioni.touch = toggleTouch.checked; salvaImpostazioni(); applicaTouch(); });
    }
    const selDim = document.getElementById('touch-size');
    if (selDim) {
        selDim.value = impostazioni.touchSize;
        selDim.addEventListener('change', () => { impostazioni.touchSize = selDim.value; salvaImpostazioni(); applicaTouch(); });
    }
    applicaTouch();
})();


// =====================================================================
// PAUSA E MENU DI PAUSA (telefono e PC)
// =====================================================================
const btnPausa = document.createElement('button');
btnPausa.type = 'button';
btnPausa.id = 'btn-pausa';
btnPausa.className = 'btn-gold';
btnPausa.textContent = 'II';
gameplayScreen.appendChild(btnPausa);

const menuPausa = document.createElement('div');
menuPausa.id = 'menu-pausa';
menuPausa.className = 'hidden';
menuPausa.innerHTML =
    '<button type="button" id="btn-pausa-impostazioni" class="btn-gold">IMPOSTAZIONI</button>' +
    '<button type="button" id="btn-pausa-abbandona" class="btn-gold">ABBANDONA PARTITA</button>';
gameplayScreen.appendChild(menuPausa);

function impostaPausa(valore) {
    inPausa = !!valore;
    menuPausa.classList.toggle('hidden', !inPausa);
    btnPausa.textContent = inPausa ? '\u25B6' : 'II';      // II = metti in pausa, ▶ = riprendi
    if (inPausa) {
        joyRilascia();
        kInizio = 0;
        jInizio = 0;
        azioniCoda.length = 0;
    }
    ultimoTick = performance.now();
}

btnPausa.addEventListener('click', () => { if (partita) impostaPausa(!inPausa); });
document.getElementById('btn-pausa-impostazioni').addEventListener('click', () => {
    settingsModal.classList.remove('hidden');
});
document.getElementById('btn-pausa-abbandona').addEventListener('click', () => {
    impostaPausa(false);
    if (modalitaGioco === 'campionato') tornaAlCampionato();    // la partita non viene registrata
    else btnBackToSelect.click();   // torna alla scelta della squadra
});


// =====================================================================
// CAMPIONATO
// 5 giornate (ogni squadra affronta le altre 5), poi quarti, semifinali e finale.
// Punti: vittoria 3, sconfitta 0, vittoria agli shootout (SV) 2, sconfitta agli shootout (SS) 1.
// Le partite delle altre squadre sono simulate a caso. Tutto si salva nel browser.
// =====================================================================
const CHIAVE_CAMPIONATO = 'monaci_campionato';
const NUMERO_GIORNATE = 5;
let campionato = null;
let partitaCampionato = null;       // la partita del campionato che stai giocando: { m, registrata }

// --- partite: m = { a, b, gA, gB, sh }  (gA/gB = null finché non è giocata; sh = shootout se è finita in parità) ---
function nuovaPartitaCamp(a, b) { return { a: a, b: b, gA: null, gB: null, sh: null }; }
function giocata(m) { return m.gA !== null; }
function coinvolge(m, t) { return m.a === t || m.b === t; }
function vincitore(m) {
    if (m.gA > m.gB) return m.a;
    if (m.gB > m.gA) return m.b;
    return m.sh.a > m.sh.b ? m.a : m.b;       // parità: decidono gli shootout
}
function golCasuali() {
    let g = 0;
    for (let i = 0; i < 8; i++) if (Math.random() < 0.3) g++;    // in media circa 2,4 gol a squadra
    return g;
}
function simulaPartita(m) {
    m.gA = golCasuali();
    m.gB = golCasuali();
    if (m.gA === m.gB) {
        const s = simulaShootout();
        m.sh = { a: s.casa, b: s.osp };
    }
}

// --- creazione del campionato ---
function creaCampionato(utente, diff) {
    // ordine casuale e calendario a gironi (metodo del cerchio: 5 giornate da 3 partite)
    const ordine = teamsList.map((_, i) => i);
    for (let i = ordine.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ordine[i], ordine[j]] = [ordine[j], ordine[i]];
    }
    let arr = ordine.slice();
    const girone = [];
    for (let r = 0; r < NUMERO_GIORNATE; r++) {
        girone.push([nuovaPartitaCamp(arr[0], arr[5]), nuovaPartitaCamp(arr[1], arr[4]), nuovaPartitaCamp(arr[2], arr[3])]);
        arr = [arr[0], arr[5], arr[1], arr[2], arr[3], arr[4]];
    }
    const c = {
        v: 1, utente: utente, diff: diff,
        fase: 'girone', giornata: 0,
        girone: girone, quarti: [], semifinali: [], finale: [],
        posGirone: [], campione: null, eliminatoIn: null
    };
    preparaFase(c);
    return c;
}

function partiteFase(c) {
    if (c.fase === 'girone') return c.girone[c.giornata];
    if (c.fase === 'quarti') return c.quarti;
    if (c.fase === 'semifinali') return c.semifinali;
    if (c.fase === 'finale') return c.finale;
    return [];
}
// all'inizio di ogni turno si simulano subito le partite a cui non partecipi
function preparaFase(c) {
    partiteFase(c).forEach(m => { if (!giocata(m) && !coinvolge(m, c.utente)) simulaPartita(m); });
}

// --- classifica del girone ---
function scontroDiretto(c, x, y) {
    const m = c.girone.flat().find(p => giocata(p) && ((p.a === x && p.b === y) || (p.a === y && p.b === x)));
    if (!m) return 0;
    return vincitore(m) === x ? -1 : 1;        // negativo = x sta sopra
}
function classificaGirone(c) {
    const righe = teamsList.map((_, i) => ({ id: i, g: 0, v: 0, sv: 0, ss: 0, s: 0, gf: 0, gs: 0, dr: 0, pt: 0 }));
    c.girone.flat().forEach(m => {
        if (!giocata(m)) return;
        const A = righe[m.a], B = righe[m.b];
        A.g++; B.g++;
        A.gf += m.gA; A.gs += m.gB; B.gf += m.gB; B.gs += m.gA;
        if (m.gA > m.gB) { A.v++; B.s++; }
        else if (m.gB > m.gA) { B.v++; A.s++; }
        else if (m.sh.a > m.sh.b) { A.sv++; B.ss++; }
        else { B.sv++; A.ss++; }
    });
    righe.forEach(r => { r.dr = r.gf - r.gs; r.pt = 3 * r.v + 2 * r.sv + r.ss; });
    // parità di punti: differenza reti, gol fatti, scontro diretto
    righe.sort((x, y) => (y.pt - x.pt) || (y.dr - x.dr) || (y.gf - x.gf) || scontroDiretto(c, x.id, y.id) || (x.id - y.id));
    return righe;
}

// --- avanzamento tra le fasi ---
function avanzaFase(c) {
    const p = c.posGirone;
    if (c.fase === 'girone') {
        if (c.giornata < NUMERO_GIORNATE - 1) {
            c.giornata++;
        } else {
            c.posGirone = classificaGirone(c).map(r => r.id);
            const q = c.posGirone;
            c.quarti = [nuovaPartitaCamp(q[2], q[5]), nuovaPartitaCamp(q[3], q[4])];    // 3ª-6ª e 4ª-5ª
            c.fase = 'quarti';
        }
    } else if (c.fase === 'quarti') {
        c.semifinali = [nuovaPartitaCamp(p[0], vincitore(c.quarti[1])), nuovaPartitaCamp(p[1], vincitore(c.quarti[0]))];
        c.fase = 'semifinali';
    } else if (c.fase === 'semifinali') {
        c.finale = [nuovaPartitaCamp(vincitore(c.semifinali[0]), vincitore(c.semifinali[1]))];
        c.fase = 'finale';
    } else if (c.fase === 'finale') {
        c.campione = vincitore(c.finale[0]);
        c.fase = 'finito';
    }
    preparaFase(c);
}
// se esci, il torneo prosegue da solo fino alla fine e si vede chi vince
function completaTorneo(c) {
    while (c.fase !== 'finito') {
        partiteFase(c).forEach(m => { if (!giocata(m)) simulaPartita(m); });
        avanzaFase(c);
    }
}

// --- salvataggio ---
function salvaCampionato() {
    try { localStorage.setItem(CHIAVE_CAMPIONATO, JSON.stringify(campionato)); } catch (e) { /* ignora */ }
}
function leggiCampionatoSalvato() {
    try {
        const c = JSON.parse(localStorage.getItem(CHIAVE_CAMPIONATO));
        if (c && c.v === 1 && Array.isArray(c.girone) && c.girone.length === NUMERO_GIORNATE) return c;
    } catch (e) { /* nessun salvataggio valido */ }
    return null;
}
function cancellaCampionatoSalvato() {
    try { localStorage.removeItem(CHIAVE_CAMPIONATO); } catch (e) { /* ignora */ }
}

// --- partita del campionato ---
function etichettaFase(c) {
    if (c.fase === 'girone') return 'GIORNATA ' + (c.giornata + 1) + '/' + NUMERO_GIORNATE;
    return { quarti: 'QUARTI', semifinali: 'SEMIFINALE', finale: 'FINALE' }[c.fase] || '';
}
function avviaPartitaCampionato(m) {
    const c = campionato;
    modalitaGioco = 'campionato';
    configPartita = { casa: c.utente, ospite: (m.a === c.utente ? m.b : m.a), diff: c.diff };
    partitaCampionato = { m: m, registrata: false };
    campScreen.classList.add('hidden');
    gameplayScreen.classList.remove('hidden');
    preparaPartita();
    matchInfo.textContent = etichettaFase(c) + ' | ' + c.diff;
    avviaLoop();
}

// il risultato della tua partita si registra appena finisce (così non si perde se chiudi la pagina)
window.suFinePartita = function (r) {
    if (modalitaGioco !== 'campionato' || !campionato || !partitaCampionato || partitaCampionato.registrata) return;
    partitaCampionato.registrata = true;
    const c = campionato, m = partitaCampionato.m;
    const utenteEA = m.a === c.utente;
    m.gA = utenteEA ? r.golCasa : r.golOspite;
    m.gB = utenteEA ? r.golOspite : r.golCasa;
    m.sh = r.shootout ? (utenteEA ? { a: r.shootout.casa, b: r.shootout.osp } : { a: r.shootout.osp, b: r.shootout.casa }) : null;
    if (c.fase !== 'girone' && vincitore(m) !== c.utente) {
        c.eliminatoIn = c.fase;           // eliminato: il resto del torneo si simula e si vede chi vince
        completaTorneo(c);
    }
    salvaCampionato();
};

// --- schermata del campionato ---
const campScreen = document.getElementById('campionato-screen');
const campTitolo = document.getElementById('camp-titolo');
const campSottotitolo = document.getElementById('camp-sottotitolo');
const campContenuto = document.getElementById('camp-contenuto');
const btnCampAzione = document.getElementById('btn-camp-azione');
const btnCampEsci = document.getElementById('btn-camp-esci');

function el(tag, classe, testo) {
    const e = document.createElement(tag);
    if (classe) e.className = classe;
    if (testo !== undefined) e.textContent = testo;
    return e;
}
function nomeBreve(i) { return teamsList[i].name.replace(/\s*FC$/, '').replace(/^FC\s*/, ''); }
function siglaSq(i) { return abbreviazione(teamsList[i].name); }

function sezioneCamp(titolo) {
    const sez = el('div', 'camp-sezione');
    sez.appendChild(el('h2', 'gold-subheading', titolo));
    return sez;
}
function rigaPartitaCamp(m, c) {
    const riga = el('div', 'partita-riga' + (coinvolge(m, c.utente) ? ' mia' : ''));
    riga.appendChild(el('span', 'sq', nomeBreve(m.a)));
    riga.appendChild(el('span', 'ris', giocata(m) ? (m.gA + ' - ' + m.gB) : 'VS'));
    riga.appendChild(el('span', 'sq dx', nomeBreve(m.b)));
    if (giocata(m) && m.sh) riga.appendChild(el('span', 'sh', 'SHOOTOUT ' + m.sh.a + ' - ' + m.sh.b));
    return riga;
}
function tabellaClassifica(c) {
    const t = el('table', 'tabella-classifica');
    const intest = el('tr');
    ['#', 'SQ', 'G', 'V', 'SV', 'SS', 'S', 'GF', 'GS', 'DR', 'PT'].forEach(h => intest.appendChild(el('th', null, h)));
    const thead = el('thead'); thead.appendChild(intest); t.appendChild(thead);
    const tbody = el('tbody');
    classificaGirone(c).forEach((r, i) => {
        const tr = el('tr', (r.id === c.utente ? 'mia ' : '') + (i < 2 ? 'zona-semi' : 'zona-quarti'));
        [i + 1, siglaSq(r.id), r.g, r.v, r.sv, r.ss, r.s, r.gf, r.gs, (r.dr > 0 ? '+' : '') + r.dr, r.pt].forEach((v, k) => {
            tr.appendChild(el('td', k === 1 ? 'nome' : (k === 10 ? 'pt' : null), String(v)));
        });
        tbody.appendChild(tr);
    });
    t.appendChild(tbody);
    return t;
}
function sezioneClassifica(c) {
    const sez = sezioneCamp('CLASSIFICA');
    sez.appendChild(tabellaClassifica(c));
    sez.appendChild(el('p', 'camp-nota', 'V=3 PT  SV=2 PT  SS=1 PT. LE PRIME 2 VANNO IN SEMIFINALE, DALLA 3ª ALLA 6ª AI QUARTI.'));
    return sez;
}

function renderCampionato() {
    const c = campionato;
    if (!c) return;
    campTitolo.textContent = c.fase === 'girone' ? 'GIORNATA ' + (c.giornata + 1) + ' / ' + NUMERO_GIORNATE
        : ({ quarti: 'QUARTI DI FINALE', semifinali: 'SEMIFINALI', finale: 'FINALE', finito: 'TORNEO CONCLUSO' }[c.fase]);
    campSottotitolo.textContent = nomeBreve(c.utente) + ' - ' + c.diff;
    campContenuto.innerHTML = '';

    if (c.fase === 'finito') {
        const banner = sezioneCamp(c.campione === c.utente ? 'SEI IL CAMPIONE!' : 'CAMPIONE: ' + nomeBreve(c.campione));
        if (c.eliminatoIn) {
            const dove = { quarti: 'AI QUARTI', semifinali: 'IN SEMIFINALE', finale: 'IN FINALE' }[c.eliminatoIn];
            banner.appendChild(el('p', 'camp-nota', 'SEI STATO ELIMINATO ' + dove + '.'));
        }
        campContenuto.appendChild(banner);
    }
    if (c.fase === 'girone') {
        const sez = sezioneCamp('PARTITE DELLA GIORNATA');
        c.girone[c.giornata].forEach(m => sez.appendChild(rigaPartitaCamp(m, c)));
        campContenuto.appendChild(sez);
        campContenuto.appendChild(sezioneClassifica(c));
    } else {
        // tabellone, dalla fase più recente alla più vecchia
        [['FINALE', c.finale], ['SEMIFINALI', c.semifinali], ['QUARTI DI FINALE', c.quarti]].forEach(([titolo, partite]) => {
            if (!partite.length) return;
            const sez = sezioneCamp(titolo);
            partite.forEach(m => sez.appendChild(rigaPartitaCamp(m, c)));
            if (titolo === 'QUARTI DI FINALE') {
                sez.appendChild(el('p', 'camp-nota', '1ª E 2ª DEL GIRONE GIÀ IN SEMIFINALE: ' + nomeBreve(c.posGirone[0]) + ' E ' + nomeBreve(c.posGirone[1]) + '.'));
            }
            campContenuto.appendChild(sez);
        });
        campContenuto.appendChild(sezioneClassifica(c));
    }

    // pulsante principale
    const daGiocare = partiteFase(c).find(m => coinvolge(m, c.utente) && !giocata(m));
    if (c.fase === 'finito') {
        btnCampAzione.textContent = 'NUOVO CAMPIONATO';
    } else if (daGiocare) {
        btnCampAzione.textContent = c.fase === 'girone' ? 'GIOCA GIORNATA ' + (c.giornata + 1)
            : { quarti: 'GIOCA IL QUARTO', semifinali: 'GIOCA LA SEMIFINALE', finale: 'GIOCA LA FINALE' }[c.fase];
    } else {
        btnCampAzione.textContent = 'CONTINUA';
    }
    window.scrollTo(0, 0);
}

function mostraCampionato() {
    mainMenu.classList.add('hidden');
    teamSelectScreen.classList.add('hidden');
    gameplayScreen.classList.add('hidden');
    campScreen.classList.remove('hidden');
    renderCampionato();
}
function tornaAlCampionato() {
    impostaPausa(false);
    mostraCampionato();
}

btnCampAzione.addEventListener('click', () => {
    const c = campionato;
    if (!c) return;
    if (c.fase === 'finito') {
        campionato = creaCampionato(c.utente, c.diff);       // nuovo campionato con la stessa squadra e difficoltà
        salvaCampionato();
        renderCampionato();
        return;
    }
    const daGiocare = partiteFase(c).find(m => coinvolge(m, c.utente) && !giocata(m));
    if (daGiocare) { avviaPartitaCampionato(daGiocare); return; }
    avanzaFase(c);
    salvaCampionato();
    renderCampionato();
});
btnCampEsci.addEventListener('click', () => {
    campScreen.classList.add('hidden');
    teamSelectScreen.classList.remove('hidden');
});

// --- pulsante CAMPIONATO nella scelta squadra: continua o nuovo ---
const btnCampionato = document.getElementById('btn-campionato');
const campSceltaModal = document.getElementById('camp-scelta-modal');
const campSceltaInfo = document.getElementById('camp-scelta-info');

function iniziaNuovoCampionato() {
    campionato = creaCampionato(currentTeamIndex, difficultiesList[currentDiffIndex]);
    salvaCampionato();
    mostraCampionato();
}
if (btnCampionato) {
    btnCampionato.addEventListener('click', () => {
        const salvato = leggiCampionatoSalvato();
        if (salvato && salvato.fase !== 'finito') {
            const quando = salvato.fase === 'girone' ? 'GIORNATA ' + (salvato.giornata + 1) + '/' + NUMERO_GIORNATE
                : { quarti: 'QUARTI', semifinali: 'SEMIFINALI', finale: 'FINALE' }[salvato.fase];
            campSceltaInfo.textContent = 'HAI UN CAMPIONATO IN CORSO: ' + nomeBreve(salvato.utente) + ' - ' + salvato.diff + ' - ' + quando + '.';
            campSceltaModal.classList.remove('hidden');
        } else {
            iniziaNuovoCampionato();
        }
    });
    document.getElementById('btn-camp-continua').addEventListener('click', () => {
        campSceltaModal.classList.add('hidden');
        campionato = leggiCampionatoSalvato();
        if (campionato) mostraCampionato();
    });
    document.getElementById('btn-camp-nuovo').addEventListener('click', () => {
        campSceltaModal.classList.add('hidden');
        iniziaNuovoCampionato();       // sovrascrive il salvataggio
    });
    document.getElementById('btn-camp-annulla').addEventListener('click', () => campSceltaModal.classList.add('hidden'));
}

// --- pulsante di fine partita: CONTINUA (campionato) oppure ESCI (amichevole) ---
const btnFinePartita = document.createElement('button');
btnFinePartita.type = 'button';
btnFinePartita.id = 'btn-fine-partita';
btnFinePartita.className = 'btn-gold hidden';
gameplayScreen.appendChild(btnFinePartita);
let finePartitaVisibile = false;
function aggiornaBottoneFine() {
    const visibile = !!partita && partita.fase === 'fine';
    if (visibile === finePartitaVisibile) return;
    finePartitaVisibile = visibile;
    btnFinePartita.classList.toggle('hidden', !visibile);
    btnFinePartita.textContent = modalitaGioco === 'campionato' ? 'CONTINUA' : 'ESCI';
}
btnFinePartita.addEventListener('click', () => {
    if (modalitaGioco === 'campionato') tornaAlCampionato();
    else { impostaPausa(false); btnBackToSelect.click(); }
});


// =====================================================================
// RIPARTENZE: dal centro, dal fondo (1 contro 1) e corsa alla palla
// =====================================================================
// Un giocatore "fantasma": serve quando non controlli nessuno (ad esempio quando gli avversari tirano lo shootout)
const fantasma = { x: 0, y: 0, ruolo: 'ATT', slot: 9, stato: 'fuori', stun: 0, calcioT: 0, contrT: 0,
    mx: 0, my: -1, dir: 1, pensaT: 0, tenutaT: 0, dribT: 0, dribCd: 0, animT: 0, inMovimento: false };

function mettiGiocatore(p, x, y, versoY) {
    p.x = x; p.y = y;
    p.mx = 0; p.my = versoY;
    p.dir = versoY < 0 ? DIR.SU : DIR.GIU;
    p.inMovimento = false; p.stun = 0; p.calcioT = 0; p.contrT = 0;
}

// Dopo un gol (da 2 contro 2 in su): batte dal centrocampo la squadra che ha subito, gli altri restano al loro posto
function ripartenzaDalCentro(sq) {
    const su = sq === squadraCasa;
    const lista = inCampo(sq).filter(q => q.ruolo !== 'POR');
    const candidati = lista.length ? lista : inCampo(sq);
    if (!candidati.length) { mettiPallaAlCentro(); return; }
    candidati.sort((a, b) => Math.abs(a.y - centroY) - Math.abs(b.y - centroY));
    const t = candidati[0];
    mettiGiocatore(t, centroX, centroY + (su ? 7 : -7), su ? -1 : 1);
    palla.x = centroX; palla.y = centroY; palla.vx = 0; palla.vy = 0; palla.blocco = 0;
    prendiPalla(t);
    palla.tiroX = t.x; palla.tiroY = t.y; palla.ultimaSq = sq;
}

// 1 contro 1, dopo un gol: rimessa dal fondo per chi ha subito
function ripartenzaDalFondo(sq) {
    const su = sq === squadraCasa;
    const t = inCampo(sq)[0];
    if (!t) { mettiPallaAlCentro(); return; }
    const linea = su ? campo.y + campo.height : campo.y;
    mettiGiocatore(t, centroX, linea + (su ? -14 : 14), su ? -1 : 1);
    palla.x = centroX; palla.y = linea + (su ? -20 : 20); palla.vx = 0; palla.vy = 0; palla.blocco = 0;
    prendiPalla(t);
    palla.tiroX = t.x; palla.tiroY = t.y; palla.ultimaSq = sq;
}

// Corsa alla palla: partita in 1 contro 1 e ripresa dopo la Ruota in parità.
// Tutti partono dalla propria area di rigore (il portiere resta in porta), la palla è al centro,
// 3 secondi per prepararsi con il cronometro fermo, poi chi arriva prima la prende.
function avviaCorsa() {
    const p = partita;
    setGiocatoriInCampo(p.nIn, true);
    mettiPallaAlCentro();
    [squadraCasa, squadraOspite].forEach(sq => {
        const su = sq === squadraCasa;
        const linea = su ? campo.y + campo.height : campo.y;
        const fronte = linea + (su ? -50 : 50);                       // bordo anteriore dell'area di rigore
        const fuori = inCampo(sq).filter(q => q.ruolo !== 'POR');
        const xs = fuori.length === 1 ? [centroX]
            : (fuori.length === 2 ? [centroX - 42, centroX + 42] : [centroX - 56, centroX, centroX + 56]);
        fuori.forEach((q, i) => mettiGiocatore(q, xs[i], fronte, su ? -1 : 1));
    });
    p.inCorsa = true;
    p.ripartenza = { t: 3 };
}

// =====================================================================
// SHOOTOUT
// Si parte dal dischetto del centrocampo, 5 secondi per tirare, 4 tiri a squadra,
// poi ad oltranza con lo stesso ordine di battuta. Pensato per essere riusato anche per lo shootout delle carte.
// =====================================================================
const SHOOTOUT_TIRI = 4;                    // tiri a squadra nella serie iniziale
const SHOOTOUT_TEMPO = 5;                   // secondi per tirare
const ORDINE_SHOOTOUT = [3, 1, 2, 0];       // chi tira: attaccante, difensore, difensore, portiere

function avviaShootout() {
    const p = partita;
    p.nIn = 4;                              // nello shootout i tiri valgono da qualsiasi punto
    p.ripresa = null;
    p.ripartenza = null;
    p.golDoppio = false;
    p.ruota = false;
    p.so = {
        attivo: true,
        primo: Math.random() < 0.5 ? squadraCasa : squadraOspite,   // chi batte per primo
        tiri: { casa: [], ospite: [] },
        turno: 0, fase: 'attesa', t: 2,
        sq: null, tiratore: null, portiere: null, tiroFatto: false, esitoT: 0, vincitore: null
    };
    preparaTiroShootout();
    mostraBanner('SHOOTOUT', 2, true);
}

function squadraDelTurno(so) {
    return so.turno % 2 === 0 ? so.primo : avversariDi(so.primo);
}

function preparaTiroShootout() {
    const so = partita.so;
    so.sq = squadraDelTurno(so);
    const avv = avversariDi(so.sq);
    const slot = ORDINE_SHOOTOUT[Math.floor(so.turno / 2) % ORDINE_SHOOTOUT.length];
    so.tiratore = so.sq.giocatori.find(q => q.slot === slot);
    so.portiere = avv.giocatori.find(q => q.slot === 0);
    [squadraCasa, squadraOspite].forEach(sq => sq.giocatori.forEach(q => { q.stato = 'fuori'; }));
    mettiPallaAlCentro();                   // azzera anche gli stati dei giocatori
    const su = so.sq === squadraCasa;
    so.tiratore.stato = 'dentro';
    mettiGiocatore(so.tiratore, centroX, centroY + (su ? 7 : -7), su ? -1 : 1);
    const f = formazioneDi(avv)[0];
    so.portiere.stato = 'dentro';
    mettiGiocatore(so.portiere, f.x, f.y, su ? 1 : -1);
    palla.x = centroX; palla.y = centroY;
    prendiPalla(so.tiratore);
    palla.tiroX = so.tiratore.x; palla.tiroY = so.tiratore.y;
    so.fase = 'attesa'; so.t = 1.8; so.tiroFatto = false; so.esitoT = 0;
    giocatoreUtente = su ? so.tiratore : fantasma;
    camera.x = clamp(palla.x - VIEW_W / 2, 0, WORLD_W - VIEW_W);
    camera.y = clamp(palla.y - (VIEW_H - margineComandi) / 2, 0, WORLD_H - VIEW_H + margineComandi);
    const numero = Math.floor(so.turno / 2) + 1;
    mostraBanner('TIRA ' + abbreviazione(so.sq.nome) + ' ' + (numero <= SHOOTOUT_TIRI ? numero + '/' + SHOOTOUT_TIRI : 'AD OLTRANZA'), 1.6, true);
}

function conteggioShootout(so) {
    return {
        gc: so.tiri.casa.filter(Boolean).length, go: so.tiri.ospite.filter(Boolean).length,
        nc: so.tiri.casa.length, no: so.tiri.ospite.length
    };
}

function golShootout(perCasa) {
    const so = partita.so;
    if (so.fase !== 'tiro') return;
    if ((so.sq === squadraCasa) !== perCasa) return;       // il gol deve entrare nella porta giusta
    chiudiTiro(true, 'GOL!');
}

function chiudiTiro(gol, testo) {
    const so = partita.so;
    if (!so || so.fase !== 'tiro') return;
    so.tiri[so.sq === squadraCasa ? 'casa' : 'ospite'].push(!!gol);
    so.fase = 'esito';
    so.t = 1.8;
    palla.vx = 0; palla.vy = 0;
    mostraBanner(testo, 1.6, true);
}

function prossimoTiro() {
    const so = partita.so;
    const { gc, go, nc, no } = conteggioShootout(so);
    let vincente = null;
    if (nc < SHOOTOUT_TIRI || no < SHOOTOUT_TIRI) {
        // serie iniziale: finisce prima se una squadra non può più recuperare
        if (gc > go + (SHOOTOUT_TIRI - no)) vincente = squadraCasa;
        else if (go > gc + (SHOOTOUT_TIRI - nc)) vincente = squadraOspite;
    } else if (nc === no && gc !== go) {
        vincente = gc > go ? squadraCasa : squadraOspite;      // ad oltranza: decide chi è avanti dopo che entrambe hanno tirato
    }
    if (vincente) {
        partita.shoot = { casa: gc, osp: go };
        so.vincitore = vincente;
        so.fase = 'fine';
        so.t = 2.4;
        mostraBanner('VINCE ' + abbreviazione(vincente.nome), 2.2, true);
        return;
    }
    so.turno++;
    if (so.turno >= 60) {                                   // sicurezza: non può durare per sempre
        const vinceCasa = Math.random() < 0.5;
        partita.shoot = { casa: gc + (vinceCasa ? 1 : 0), osp: go + (vinceCasa ? 0 : 1) };
        so.vincitore = vinceCasa ? squadraCasa : squadraOspite;
        so.fase = 'fine'; so.t = 2.4;
        mostraBanner('VINCE ' + abbreviazione(so.vincitore.nome), 2.2, true);
        return;
    }
    preparaTiroShootout();
}

function aggiornaShootout(dt) {
    const so = partita.so;
    if (so.fase === 'attesa') {
        so.t -= dt;
        if (so.t <= 0) { so.fase = 'tiro'; so.t = SHOOTOUT_TEMPO; so.tiroFatto = false; mostraBanner('VIA!', 0.8, true); }
        return;
    }
    if (so.fase === 'tiro') {
        const titolare = palla.titolare;
        if (titolare && titolare !== so.tiratore) { chiudiTiro(false, 'PARATA!'); return; }       // il portiere ha preso la palla
        if (!so.tiroFatto) {
            so.t -= dt;
            if (so.t <= 0) { so.t = 0; chiudiTiro(false, 'TEMPO SCADUTO'); }
        } else {
            so.esitoT -= dt;
            if (so.esitoT <= 0) chiudiTiro(false, 'FALLITO');
        }
        return;
    }
    if (so.fase === 'esito') {
        so.t -= dt;
        if (so.t <= 0) prossimoTiro();
        return;
    }
    if (so.fase === 'fine') {
        so.t -= dt;
        if (so.t <= 0) {
            so.attivo = false;
            hudSO.textContent = '';
            terminaPartita('S');
        }
    }
}

let hudSOCache = '';
function aggiornaHudShootout() {
    const so = partita.so;
    const { gc, go } = conteggioShootout(so);
    const riga = (tiri, sq) => abbreviazione(sq.nome) + ' ' + tiri.map(x => (x ? '\u25CF' : '\u25CB')).join('') +
        '\u00B7'.repeat(Math.max(0, SHOOTOUT_TIRI - tiri.length));
    const testo = riga(so.tiri.casa, squadraCasa) + '\n' + riga(so.tiri.ospite, squadraOspite);
    const chiave = gc + '-' + go + testo;
    if (chiave === hudSOCache) return;
    hudSOCache = chiave;
    hudPunteggio.textContent = abbreviazione(squadraCasa.nome) + ' ' + gc + ' - ' + go + ' ' + abbreviazione(squadraOspite.nome) + '  SO';
    hudStato.textContent = 'SHOOTOUT';
    hudSO.textContent = testo;
}

// conto alla rovescia (corsa alla palla) e tempo per tirare (shootout)
function disegnaTempi() {
    if (partita.ripartenza) {
        testoCentrato(String(Math.max(1, Math.ceil(partita.ripartenza.t))), Math.round(VIEW_H * 0.45), 28, '#ffffff');
        return;
    }
    const so = partita.so;
    if (so && so.attivo && so.fase === 'tiro' && !so.tiroFatto) {
        testoCentrato(Math.max(0, so.t).toFixed(1), Math.round(VIEW_H * 0.16), 18, so.t < 1.5 ? '#ff4040' : '#ffffff');
    }
}
