// Dati della Lega e delle Squadre
const teamsList = [
    { name: "Monaci FC", points: 0 },
    { name: "Lightning Eleven", points: 0 },
    { name: "Fire Strikers", points: 0 },
    { name: "Shadow Dragons", points: 0 },
    { name: "Royal Academy", points: 0 },
    { name: "Neo Japan", points: 0 }
];

let playerTeamName = "Monaci FC";
let opponentTeamName = "Lightning Eleven";
let homeScore = 0;
let awayScore = 0;
let currentMinute = 0;
let isDoubleGoalActive = false;

// Elementi DOM
const mainMenu = document.getElementById('main-menu');
const settingsScreen = document.getElementById('settings-screen');
const teamSelectScreen = document.getElementById('team-select-screen');
const matchScreen = document.getElementById('match-screen');
const standingsScreen = document.getElementById('standings-screen');

const btnStart = document.getElementById('btn-start');
const btnSettings = document.getElementById('btn-settings');
const btnSettingsBack = document.getElementById('btn-settings-back');
const btnLaunchMatch = document.getElementById('btn-launch-match');
const btnTeamBack = document.getElementById('btn-team-back');
const btnPlayAction = document.getElementById('btn-play-action');
const btnSpecialCard = document.getElementById('btn-special-card');
const btnNextRound = document.getElementById('btn-next-round');

const homeTeamLabel = document.getElementById('home-team-label');
const awayTeamLabel = document.getElementById('away-team-label');
const homeScoreEl = document.getElementById('home-score');
const awayScoreEl = document.getElementById('away-score');
const matchMinuteEl = document.getElementById('match-minute');
const matchLog = document.getElementById('match-log');
const standingsBody = document.getElementById('standings-body');

function showScreen(screen) {
    [mainMenu, settingsScreen, teamSelectScreen, matchScreen, standingsScreen].forEach(s => s.classList.add('hidden'));
    screen.classList.remove('hidden');
}

// Navigazione Menu
btnStart.addEventListener('click', () => showScreen(teamSelectScreen));
btnSettings.addEventListener('click', () => showScreen(settingsScreen));
btnSettingsBack.addEventListener('click', () => showScreen(mainMenu));
btnTeamBack.addEventListener('click', () => showScreen(mainMenu));

// Inizio Partita
btnLaunchMatch.addEventListener('click', () => {
    playerTeamName = document.getElementById('team-choice').value;
    // Scegli un avversario diverso dalla squadra del giocatore
    let availableOpponents = teamsList.filter(t => t.name !== playerTeamName);
    let randomOpp = availableOpponents[Math.floor(Math.random() * availableOpponents.length)];
    opponentTeamName = randomOpp.name;

    homeTeamLabel.textContent = playerTeamName;
    awayTeamLabel.textContent = opponentTeamName;
    
    homeScore = 0;
    awayScore = 0;
    currentMinute = 0;
    isDoubleGoalActive = false;
    
    homeScoreEl.textContent = homeScore;
    awayScoreEl.textContent = awayScore;
    matchMinuteEl.textContent = currentMinute;
    matchLog.textContent = "Fischio d'inizio! Primi 4 minuti: Ingresso scalato in corso (1v1, 2v2, 3v3, 4v4).";

    showScreen(matchScreen);
});

// Avanzamento Azione / Tempo nel Match
btnPlayAction.addEventListener('click', () => {
    if (currentMinute >= 36) {
        endMatch();
        return;
    }

    // Avanza il cronometro a blocchi o step di minuti
    if (currentMinute < 4) {
        currentMinute = 4;
        matchLog.textContent = "Ingresso scalato completato! Formazione al completo (4v4). Inizia la battaglia!";
    } else if (currentMinute >= 4 && currentMinute < 17) {
        currentMinute = 17;
        isDoubleGoalActive = true;
        matchLog.textContent = "ATTENZIONE! Raggiunto il minuto 17': Attivata modalità GOL DOPPIO automatica!";
    } else if (currentMinute >= 17 && currentMinute < 20) {
        currentMinute = 20;
        isDoubleGoalActive = false;
        matchLog.textContent = "Ingresso nella fase de LA RUOTA (Minuto 20'-23'): Si alternano Porta a porta e 1v1 Mondialito!";
    } else if (currentMinute >= 20 && currentMinute < 23) {
        currentMinute = 23;
        matchLog.textContent = "Fine della fase de La Ruota. Si torna al normale sviluppo del match!";
    } else {
        currentMinute = 36;
        matchLog.textContent = "Fischio finale del match al 36'!";
    }

    matchMinuteEl.textContent = currentMinute;

    // Simulazione casuale di un gol durante l'azione
    if (currentMinute > 4 && currentMinute !== 20) {
        let scorer = Math.random() < 0.5 ? 'home' : 'away';
        let pointsToAdd = isDoubleGoalActive ? 2 : 1;

        if (scorer === 'home') {
            homeScore += pointsToAdd;
            homeScoreEl.textContent = homeScore;
            matchLog.textContent += ` GOL del ${playerTeamName}! (+${pointsToAdd})`;
        } else {
            awayScore += pointsToAdd;
            awayScoreEl.textContent = awayScore;
            matchLog.textContent += ` GOL dell'avversario (${opponentTeamName})! (+${pointsToAdd})`;
        }
    }

    if (currentMinute === 36) {
        btnPlayAction.textContent = "Vedi Verdetto Finale";
    }
});

// Pulsante Carte Speciali (Esempio rapido)
btnSpecialCard.addEventListener('click', () => {
    if (currentMinute < 4 || currentMinute > 36) {
        alert("Le carte speciali possono essere giocate solo tra il 4° e il 36° minuto!");
        return;
    }
    alert("Carta Speciale attivata dal Presidente! Effetto applicato con successo.");
});

// Fine Partita e Passaggio alla Classifica
function endMatch() {
    // Assegnazione punti in classifica (3 per la vittoria, 1 per il pareggio)
    let playerTeamObj = teamsList.find(t => t.name === playerTeamName);
    let oppTeamObj = teamsList.find(t => t.name === opponentTeamName);

    if (homeScore > awayScore) {
        if(playerTeamObj) playerTeamObj.points += 3;
        matchLog.textContent = `Vittoria per Matchball di ${playerTeamName}!`;
    } else if (homeScore < awayScore) {
        if(oppTeamObj) oppTeamObj.points += 3;
        matchLog.textContent = `Vittoria degli avversari (${opponentTeamName}).`;
    } else {
        matchLog.textContent = `Pareggio al 36'! Si procede agli Shootout di spareggio...`;
        if(playerTeamObj) playerTeamObj.points += 1;
        if(oppTeamObj) oppTeamObj.points += 1;
    }

    // Ordina la classifica per punti
    teamsList.sort((a, b) => b.points - a.points);

    // Popola la tabella HTML della classifica
    standingsBody.innerHTML = "";
    teamsList.forEach((team, index) => {
        let row = document.createElement('tr');
        row.innerHTML = `<td>${index + 1}°</td><td>${team.name}</td><td>${team.points}</td>`;
        standingsBody.appendChild(row);
    });

    btnPlayAction.textContent = "Gioca Azione / Avanza Tempo";
    showScreen(standingsScreen);
}

// Torna al menu o prossimo turno
btnNextRound.addEventListener('click', () => {
    showScreen(mainMenu);
});
            
