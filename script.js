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
let gameInterval = null;
let matchActive = false;

// Variabili per il motore grafico (Canvas)
let canvas, ctx;
let player = { x: 150, y: 200, size: 16, speed: 3, color: '#FFD700' };
let opponent = { x: 550, y: 200, size: 16, speed: 2, color: '#ff4444' };
let ball = { x: 350, y: 200, vx: 0, vy: 0, size: 8 };

let keys = {};

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    const target = document.getElementById(screenId);
    if (target) target.classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('gameCanvas');
    if (canvas) ctx = canvas.getContext('2d');

    // Listener tastiera
    window.addEventListener('keydown', e => keys[e.code] = true);
    window.addEventListener('keyup', e => keys[e.code] = false);

    // Navigazione Menu
    document.getElementById('btn-start').addEventListener('click', () => showScreen('team-select-screen'));
    document.getElementById('btn-settings').addEventListener('click', () => showScreen('settings-screen'));
    document.getElementById('btn-settings-back').addEventListener('click', () => showScreen('main-menu'));
    document.getElementById('btn-team-back').addEventListener('click', () => showScreen('main-menu'));
    document.getElementById('btn-quit-match').addEventListener('click', () => {
        stopMatch();
        showScreen('main-menu');
    });
    document.getElementById('btn-next-round').addEventListener('click', () => showScreen('main-menu'));

    // Lancia Partita
    document.getElementById('btn-launch-match').addEventListener('click', () => {
        playerTeamName = document.getElementById('team-choice').value;
        let available = teamsList.filter(t => t.name !== playerTeamName);
        opponentTeamName = available[Math.floor(Math.random() * available.length)].name;

        document.getElementById('home-name').textContent = playerTeamName;
        document.getElementById('away-name').textContent = opponentTeamName;

        homeScore = 0;
        awayScore = 0;
        currentMinute = 0;
        document.getElementById('home-score').textContent = homeScore;
        document.getElementById('away-score').textContent = awayScore;
        document.getElementById('match-clock').textContent = "Min: 0'";

        showScreen('match-screen');
        startMatchEngine();
    });

    document.getElementById('btn-use-card').addEventListener('click', () => {
        alert("Carta Speciale del Presidente attivata! Bonus offensivo applicato.");
    });
});

function startMatchEngine() {
    matchActive = true;
    player.x = 150; player.y = 200;
    opponent.x = 550; opponent.y = 200;
    ball.x = 350; ball.y = 200;
    ball.vx = 0; ball.vy = 0;

    // Timer di avanzamento minuti (ogni 3 secondi reale = 1 minuto di gioco fino al 36')
    let clockTimer = setInterval(() => {
        if (!matchActive) {
            clearInterval(clockTimer);
            return;
        }
        currentMinute += 2;
        if (currentMinute > 36) currentMinute = 36;
        document.getElementById('match-clock').textContent = `Min: ${currentMinute}'`;

        if (currentMinute >= 36) {
            clearInterval(clockTimer);
            stopMatch();
            endMatchSequence();
        }
    }, 3000);

    // Loop grafico del canvas
    function gameLoop() {
        if (!matchActive) return;
        updateGame();
        drawGame();
        requestAnimationFrame(gameLoop);
    }
    requestAnimationFrame(gameLoop);
}

function stopMatch() {
    matchActive = false;
}

function updateGame() {
    // Movimento giocatore (WASD o Frecce)
    if (keys['KeyW'] || keys['ArrowUp']) player.y -= player.speed;
    if (keys['KeyS'] || keys['ArrowDown']) player.y += player.speed;
    if (keys['KeyA'] || keys['ArrowLeft']) player.x -= player.speed;
    if (keys['KeyD'] || keys['ArrowRight']) player.x += player.speed;

    // Delimitazione campo giocatore
    if (player.x < 20) player.x = 20;
    if (player.x > 680) player.x = 680;
    if (player.y < 20) player.y = 20;
    if (player.y > 380) player.y = 380;

    // Semplice IA Avversario che insegue la palla
    if (opponent.x < ball.x) opponent.x += opponent.speed;
    if (opponent.x > ball.x) opponent.x -= opponent.speed;
    if (opponent.y < ball.y) opponent.y += opponent.speed;
    if (opponent.y > ball.y) opponent.y -= opponent.speed;

    // Calcio con Spacebar
    let dist = Math.hypot(player.x - ball.x, player.y - ball.y);
    if (dist < player.size + ball.size) {
        ball.x = player.x;
        ball.y = player.y;
        if (keys['Space']) {
            ball.vx = 8; // Calcia in avanti verso la porta avversaria
            ball.vy = (Math.random() - 0.5) * 4;
        }
    }

    // Movimento palla attrito
    ball.x += ball.vx;
    ball.y += ball.vy;
    ball.vx *= 0.95;
    ball.vy *= 0.95;

    // Controllo Gol
    if (ball.x > 675 && ball.y > 150 && ball.y < 250) {
        homeScore++;
        document.getElementById('home-score').textContent = homeScore;
        resetBall();
    } else if (ball.x < 25 && ball.y > 150 && ball.y < 250) {
        awayScore++;
        document.getElementById('away-score').textContent = awayScore;
        resetBall();
    }

    // Limiti muri palla
    if (ball.y < 10 || ball.y > 390) ball.vy *= -1;
    if (ball.x < 10 || ball.x > 690) ball.vx *= -1;
}

function resetBall() {
    ball.x = 350;
    ball.y = 200;
    ball.vx = 0;
    ball.vy = 0;
}

function drawGame() {
    ctx.fillStyle = '#0a2e12'; // Sfondo prato scuro pixel art
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Linee campo
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 10);
    ctx.lineTo(canvas.width / 2, canvas.height - 10);
    ctx.stroke();

    // Porte
    ctx.strokeRect(0, 150, 10, 100);
    ctx.strokeRect(canvas.width - 10, 150, 10, 100);

    // Giocatore
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x - player.size/2, player.y - player.size/2, player.size, player.size);

    // Avversario
    ctx.fillStyle = opponent.color;
    ctx.fillRect(opponent.x - opponent.size/2, opponent.y - opponent.size/2, opponent.size, opponent.size);

    // Palla
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(ball.x - ball.size/2, ball.y - ball.size/2, ball.size, ball.size);
}

function endMatchSequence() {
    let pObj = teamsList.find(t => t.name === playerTeamName);
    let oObj = teamsList.find(t => t.name === opponentTeamName);

    if (homeScore > awayScore) {
        if (pObj) pObj.points += 3;
    } else if (homeScore < awayScore) {
        if (oObj) oObj.points += 3;
    } else {
        if (pObj) pObj.points += 1;
        if (oObj) oObj.points += 1;
    }

    teamsList.sort((a, b) => b.points - a.points);

    const tbody = document.getElementById('standings-body');
    if (tbody) {
        tbody.innerHTML = "";
        teamsList.forEach((t, i) => {
            let row = document.createElement('tr');
            row.innerHTML = `<td>${i + 1}°</td><td>${t.name}</td><td>${t.points}</td>`;
            tbody.appendChild(row);
        });
    }

    showScreen('standings-screen');
}
