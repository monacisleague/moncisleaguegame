// 1. SELEZIONE DEGLI ELEMENTI DAL DOM (HTML)
const mainMenu = document.getElementById('main-menu');
const settingsScreen = document.getElementById('settings-screen');
const teamSelectScreen = document.getElementById('team-select-screen');
const gameScreen = document.getElementById('game-screen');

// Bottoni
const btnStart = document.getElementById('btn-start');
const btnSettings = document.getElementById('btn-settings');
const btnSettingsBack = document.getElementById('btn-settings-back');
const btnLaunchMatch = document.getElementById('btn-launch-match');
const btnTeamBack = document.getElementById('btn-team-back');
const btnNextMatch = document.getElementById('btn-next-match');

// Funzione per mostrare una schermata e nascondere le altre
function showScreen(screenToShow) {
    mainMenu.classList.add('hidden');
    settingsScreen.classList.add('hidden');
    teamSelectScreen.classList.add('hidden');
    gameScreen.classList.add('hidden');

    screenToShow.classList.remove('hidden');
}

// 2. NAVIGAZIONE TRA LE SCHERMATE

// Cliccando "Gioca" nel menu principale, andiamo alla schermata di selezione squadra/difficoltà
btnStart.addEventListener('click', function() {
    showScreen(teamSelectScreen);
});

// Cliccando "Impostazioni"
btnSettings.addEventListener('click', function() {
    showScreen(settingsScreen);
});

// Dalle impostazioni si torna al menu
btnSettingsBack.addEventListener('click', function() {
    showScreen(mainMenu);
});

// Dalla schermata squadra si torna al menu
btnTeamBack.addEventListener('click', function() {
    showScreen(mainMenu);
});

// Cliccando "Inizia Partita" dopo aver scelto squadra e difficoltà
btnLaunchMatch.addEventListener('click', function() {
    // Qui potremmo salvare la squadra scelta in futuro
    let squadraScelta = document.getElementById('team-choice').value;
    let difficoltaScelta = document.getElementById('difficulty-choice').value;
    console.log("Squadra:", squadraScelta, "| Difficoltà:", difficoltaScelta);

    // Passiamo alla schermata della classifica della lega
    showScreen(gameScreen);
});

// Cliccando per giocare il turno successivo (la classifica resta attiva e visibile)
btnNextMatch.addEventListener('click', function() {
    alert("Simulazione prossima partita della Monaci's League in corso...");
    // Qui in seguito aggiorneremo i punti in classifica
});
  
