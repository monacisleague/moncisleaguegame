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

// Funzione principale per cambiare schermata in modo sicuro
function showScreen(screenId) {
    // Nasconde tutte le schermate
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => {
        screen.classList.add('hidden');
    });

    // Mostra solo la schermata richiesta
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.remove('hidden');
    }
}

// Configurazione degli eventi quando la pagina è pronta
document.addEventListener('DOMContentLoaded', function() {

    // 1. MENU PRINCIPALE -> SCEGLI SQUADRA
    const btnStart = document.getElementById('btn-start');
    if (btnStart) {
        btnStart.addEventListener('click', function() {
            showScreen('team-select-screen');
        });
    }

    // 2. MENU PRINCIPALE -> IMPOSTAZIONI
    const btnSettings = document.getElementById('btn-settings');
    if (btnSettings) {
        btnSettings.addEventListener('click', function() {
            showScreen('settings-screen');
        });
    }

    // 3. IMPOSTAZIONI -> TORNA AL MENU
    const btnSettingsBack = document.getElementById('btn-settings-back');
    if (btnSettingsBack) {
        btnSettingsBack.addEventListener('click', function() {
            showScreen('main-menu');
        });
    }

    // 4. SELEZIONE SQUADRA -> TORNA AL MENU
    const btnTeamBack = document.getElementById('btn-team-back');
    if (btnTeamBack) {
        btnTeamBack.addEventListener('click', function() {
            showScreen('main-menu');
        });
    }

    // 5. INIZIA LA PARTITA
    const btnLaunchMatch = document.getElementById('btn-launch-match');
    if (btnLaunchMatch) {
        btnLaunchMatch.addEventListener('click', function() {
            // Prende la squadra scelta dall'utente
            const teamChoiceEl = document.getElementById('team-choice');
            if (teamChoiceEl) {
                playerTeamName = teamChoiceEl.value;
            }

            // Sceglie un avversario casuale diverso dalla squadra del giocatore
            let availableOpponents = teamsList.filter(t => t.name !== playerTeamName);
            let randomOpp = availableOpponents[Math.floor(Math.random() * availableOpponents.length)];
            opponentTeamName = randomOpp.name;

            // Inizializza i dati del match
            homeScore = 0;
            awayScore = 0;
            currentMinute = 0;
            isDoubleGoalActive = false;

            // Aggiorna le etichette nell'HTML del match
            document.getElementById('home-team-label').textContent = playerTeamName;
            document.getElementById('away-team-label').textContent = opponentTeamName;
            document.getElementById('home-score').textContent = homeScore;
            document.getElementById('away-score').textContent = awayScore;
            document.getElementById('match-minute').textContent = currentMinute;
            document.getElementById('match-log').textContent = "Fischio d'inizio! Primi 4 minuti: Ingresso scalato in corso (1v1 -> 4v4).";
            document.getElementById('btn-play-action').textContent = "Gioca Azione / Avanza Tempo";

            // Mostra la schermata del match
            showScreen('match-screen');
        });
    }

    // 6. AVANZAMENTO DEL TEMPO DURANTE LA PARTITA
    const btnPlayAction = document.getElementById('btn-play-action');
    if (btnPlayAction) {
        btnPlayAction.addEventListener('click', function() {
            if (currentMinute >= 36) {
                endMatch();
                return;
            }

            // Regolazione dei minuti di gioco in base al regolamento
            if (currentMinute < 4) {
                currentMinute = 4;
                document.getElementById('match-log').textContent = "Ingresso scalato completato! Formazione al completo (4v4). In battaglia!";
            } else if (currentMinute >= 4 && currentMinute < 17) {
                currentMinute = 17;
                isDoubleGoalActive = true;
                document.getElementById('match-log').textContent = "ATTENZIONE! Minuto 17': Attivata la modalità GOL DOPPIO!";
            } else if (currentMinute >= 17 && currentMinute < 20) {
                currentMinute = 20;
                isDoubleGoalActive = false;
                document.getElementById('match-log').textContent = "Fase de LA RUOTA (Minuto 20'-23'): Si alternano Porta a porta e 1v1!";
            } else if (currentMinute >= 20 && currentMinute < 23) {
                currentMinute = 23;
                document.getElementById('match-log').textContent = "Fine della fase de La Ruota. Si torna al match regolare!";
            } else {
                currentMinute = 36;
                document.getElementById('match-log').textContent = "Fischio finale del match al 36'!";
                btnPlayAction.textContent = "Vedi Classifica Finale";
            }

            document.getElementById('match-minute').textContent = currentMinute;

            // Eventuale gol casuale durante l'azione
            if (currentMinute > 4 && currentMinute !== 20) {
                let scorer = Math.random() < 0.5 ? 'home' : 'away';
                let pointsToAdd = isDoubleGoalActive ? 2 : 1;

                if (scorer === 'home') {
                    homeScore += pointsToAdd;
                    document.getElementById('home-score').textContent = homeScore;
                    document.getElementById('match-log').textContent += ` GOL di ${playerTeamName}! (+${pointsToAdd})`;
                } else {
                    awayScore += pointsToAdd;
                    document.getElementById('away-score').textContent = awayScore;
                    document.getElementById('match-log').textContent += ` GOL di ${opponentTeamName}! (+${pointsToAdd})`;
                }
            }
        });
    }

    // 7. CARTE SPECIALI
    const btnSpecialCard = document.getElementById('btn-special-card');
    if (btnSpecialCard) {
        btnSpecialCard.addEventListener('click', function() {
            if (currentMinute < 4 || currentMinute > 36) {
                alert("Le carte speciali possono essere giocate solo tra il 4° e il 36° minuto!");
                return;
            }
            alert("Carta Speciale del Presidente attivata con successo!");
        });
    }

    // 8. PROSSIMO TURNO DALLA CLASSIFICA
    const btnNextRound = document.getElementById('btn-next-round');
    if (btnNextRound) {
        btnNextRound.addEventListener('click', function() {
            showScreen('main-menu');
        });
    }

});

// Funzione di fine partita e calcolo classifica
function endMatch() {
    let playerTeamObj = teamsList.find(t => t.name === playerTeamName);
    let oppTeamObj = teamsList.find(t => t.name === opponentTeamName);

    if (homeScore > awayScore) {
        if (playerTeamObj) playerTeamObj.points += 3;
    } else if (homeScore < awayScore) {
        if (oppTeamObj) oppTeamObj.points += 3;
    } else {
        if (playerTeamObj) playerTeamObj.points += 1;
        if (oppTeamObj) oppTeamObj.points += 1;
    }

    // Ordina la classifica per punti
    teamsList.sort((a, b) => b.points - a.points);

    // Riempie la tabella HTML della classifica
    const standingsBody = document.getElementById('standings-body');
    if (standingsBody) {
        standingsBody.innerHTML = "";
        teamsList.forEach((team, index) => {
            let row = document.createElement('tr');
            row.innerHTML = `<td>${index + 1}°</td><td>${team.name}</td><td>${team.points}</td>`;
            standingsBody.appendChild(row);
        });
    }

    // Mostra la schermata della classifica
    showScreen('standings-screen');
}
