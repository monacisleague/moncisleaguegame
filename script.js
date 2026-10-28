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
let matchActive = false;
let hasBallPossession = true;

// Modalità Tasto Speciale
let isPresidentialMode = false;
let isMobile = false;
let difficulty = "media";

// Regolamento Ufficiale
let isDoubleGoalActive = false;
let isTheWheelActive = false; 
let matchFormationLevel = 1; // 1 = 1v1 puro in mezzo, 2 = si aggiunge il portiere dietro, 4 = 4v4 completo

// CANVAS E CAMPO VERTICALE
let canvas, ctx;
const PITCH_WIDTH = 360;
const PITCH_HEIGHT = 1000;

// Giocatore Principale (Axel - In mezzo)
let player = { name: "Axel", x: 180, y: 700, size: 14, speed: 3.2, color: '#ffffff' };
// Avversario Principale (Mark - In mezzo)
let opponent = { name: "Mark", x: 180, y: 300, size: 14, speed: 2.2, color: '#ff4444' };

// Portieri (Entrano in porta scalando dalla manovra quando scatta il minuto)
let homeGK = { name: "Tuon Portiere", x: 180, y: 935, size: 15, color: '#00e5ff', active: false };
let awayGK = { name: "Portiere Rivale", x: 180, y: 65, size: 15, color: '#ffea00', active: false };

let ball = { x: 180, y: 680, vx: 0, vy: 0, size: 6 };

let cameraY = 400;
let keys = {};
let joystickVector = { x: 0, y: 0 };

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    const target = document.getElementById(screenId);
    if (target) target.classList.remove('hidden');
}

function detectDevice() {
    const deviceChoice = document.getElementById('control-device')?.value;
    if (deviceChoice === 'pc') {
        isMobile = false;
    } else if (deviceChoice === 'mobile') {
        isMobile = true;
    } else {
        isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    }

    if (!isMobile) {
        document.body.classList.add('is-pc');
        document.getElementById('pc-mode-indicator')?.classList.remove('hidden');
    } else {
        document.body.classList.remove('is-pc');
        document.getElementById('pc-mode-indicator')?.classList.add('hidden');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('gameCanvas');
    if (canvas) ctx = canvas.getContext('2d');

    detectDevice();

    window.addEventListener('keydown', e => {
        keys[e.code] = true;
        if (e.code === 'Tab') {
            e.preventDefault();
            toggleSpecialButtonMode();
        }
        if (e.code === 'KeyQ') {
            e.preventDefault();
            useSpecialPower();
        }
    });

    window.addEventListener('keyup', e => keys[e.code] = false);

    setupJoystick();
    setupTouchButtons();

    document.getElementById('btn-start').addEventListener('click', () => showScreen('team-select-screen'));
    document.getElementById('btn-settings').addEventListener('click', () => showScreen('settings-screen'));
    document.getElementById('btn-settings-back').addEventListener('click', () => {
        detectDevice();
        showScreen('main-menu');
    });
    document.getElementById('btn-team-back').addEventListener('click', () => showScreen('main-menu'));
    document.getElementById('btn-next-round').addEventListener('click', () => showScreen('main-menu'));
    document.getElementById('btn-pause').addEventListener('click', () => {
        matchActive = !matchActive;
        if(matchActive) requestAnimationFrame(gameLoop);
    });

    document.getElementById('btn-launch-match').addEventListener('click', () => {
        detectDevice();
        playerTeamName = document.getElementById('team-choice').value;
        difficulty = document.getElementById('difficulty-choice')?.value || "media";

        let available = teamsList.filter(t => t.name !== playerTeamName);
        opponentTeamName = available[Math.floor(Math.random() * available.length)].name;

        document.getElementById('home-tag').textContent = playerTeamName.substring(0, 3);
        document.getElementById('away-tag').textContent = opponentTeamName.substring(0, 3);
        
        homeScore = 0; awayScore = 0; currentMinute = 0;
        isDoubleGoalActive = false;
        isTheWheelActive = false;
        matchFormationLevel = 1;
        homeGK.active = false;
        awayGK.active = false;

        document.getElementById('home-score').textContent = homeScore;
        document.getElementById('away-score').textContent = awayScore;

        showScreen('match-screen');
        resizeCanvas();
        startMatchEngine();
    });
});

function resizeCanvas() {
    if(!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);

function setupJoystick() {
    const base = document.getElementById('joystick-base');
    const stick = document.getElementById('joystick-stick');
    if (!base || !stick) return;

    let activeTouchId = null;

    function handleMove(e) {
        if (activeTouchId === null) return;
        let touch = Array.from(e.touches).find(t => t.identifier === activeTouchId);
        if (!touch) return;

        let rect = base.getBoundingClientRect();
        let centerX = rect.left + rect.width / 2;
        let centerY = rect.top + rect.height / 2;

        let dx = touch.clientX - centerX;
        let dy = touch.clientY - centerY;
        let dist = Math.hypot(dx, dy);
        let maxR = rect.width / 2;

        if (dist > maxR) {
            dx = (dx / dist) * maxR;
            dy = (dy / dist) * maxR;
        }

        stick.style.transform = `translate(${dx}px, ${dy}px)`;
        joystickVector.x = dx / maxR;
        joystickVector.y = dy / maxR;
    }

    base.addEventListener('touchstart', (e) => {
        let touch = e.changedTouches[0];
        activeTouchId = touch.identifier;
        handleMove(e);
    });

    window.addEventListener('touchmove', handleMove);

    function resetStick(e) {
        if (activeTouchId === null) return;
        let touch = Array.from(e.touches || []).find(t => t.identifier === activeTouchId);
        if (!touch) {
            activeTouchId = null;
            stick.style.transform = `translate(0px, 0px)`;
            joystickVector = { x: 0, y: 0 };
        }
    }
    window.addEventListener('touchend', resetStick);
}

function setupTouchButtons() {
    document.getElementById('btn-shoot')?.addEventListener('touchstart', (e) => { e.preventDefault(); triggerAction('shoot'); });
    document.getElementById('btn-pass')?.addEventListener('touchstart', (e) => { e.preventDefault(); triggerAction('pass'); });
    document.getElementById('btn-dribble')?.addEventListener('touchstart', (e) => { e.preventDefault(); triggerAction('dribble'); });

    document.getElementById('btn-special')?.addEventListener('touchstart', (e) => { e.preventDefault(); useSpecialPower(); });
    document.getElementById('btn-switch-player')?.addEventListener('touchstart', (e) => { e.preventDefault(); toggleSpecialButtonMode(); });

    document.getElementById('btn-tackle')?.addEventListener('touchstart', (e) => { e.preventDefault(); triggerAction('tackle'); });
    document.getElementById('btn-press')?.addEventListener('touchstart', (e) => { e.preventDefault(); triggerAction('press'); });
}

function toggleSpecialButtonMode() {
    isPresidentialMode = !isPresidentialMode;
    const btnSpecials = document.querySelectorAll('.pos-special');
    const pcText = document.getElementById('pc-mode-text');

    btnSpecials.forEach(btn => {
        const mainTxt = btn.querySelector('.btn-main-txt');
        const subTxt = btn.querySelector('.btn-sub-txt');

        if (isPresidentialMode) {
            if (mainTxt) mainTxt.textContent = "Rigore Pres.";
            if (subTxt) subTxt.textContent = "Dischetto";
            btn.style.borderColor = "#ff3d00";
        } else {
            if (mainTxt) mainTxt.textContent = "Carta Pres.";
            if (subTxt) subTxt.textContent = "Special";
            btn.style.borderColor = "#00e5ff";
        }
    });

    if (pcText) {
        pcText.textContent = isPresidentialMode ? "Rigore Pres." : "Carta Pres.";
        pcText.style.color = isPresidentialMode ? "#ff3d00" : "#00e5ff";
    }
}

function useSpecialPower() {
    if (!matchActive) return;

    if (isPresidentialMode) {
        showMatchNotice("⚠️ RIGORE PRESIDENZIALE ATTIVATO!");
        ball.x = PITCH_WIDTH / 2;
        ball.y = 250;
        ball.vx = 0; ball.vy = -12;
    } else {
        showMatchNotice("🌟 CARTA SPECIALE DEL PRESIDENTE!");
    }
}

function triggerAction(action) {
    if (!matchActive) return;

    if (action === 'shoot' && hasBallPossession) {
        let powerMultiplier = isDoubleGoalActive ? 1.5 : 1.2;
        ball.vy = -12 * powerMultiplier;
        ball.vx = (Math.random() - 0.5) * 4;
    } else if (action === 'pass' && hasBallPossession) {
        ball.vy = -7;
    } else if (action === 'dribble') {
        player.y -= 30;
    } else if (action === 'tackle') {
        player.y = ball.y; player.x = ball.x;
    }
}

function showMatchNotice(text) {
    let hud = document.getElementById('match-clock');
    if (hud) {
        hud.textContent = text;
        hud.style.color = "#ff3d00";
        setTimeout(() => {
            hud.style.color = "#00ffcc";
        }, 3000);
    }
}

function startMatchEngine() {
    matchActive = true;
    player.x = PITCH_WIDTH / 2; player.y = 700;
    opponent.x = PITCH_WIDTH / 2; opponent.y = 300;
    homeGK.x = PITCH_WIDTH / 2; awayGK.x = PITCH_WIDTH / 2;
    ball.x = player.x; ball.y = player.y - 12;

    let timer = setInterval(() => {
        if (!matchActive) { clearInterval(timer); return; }
        currentMinute += 1;
        
        let mStr = Math.floor(currentMinute / 2);
        let sStr = (currentMinute % 2) * 30;
        document.getElementById('match-clock').textContent = `${mStr}:${sStr === 0 ? '00' : sStr} (${currentMinute}')`;

        // Ingresso Scalato: Al minuto 2 entra il portiere (uno scala in porta)
        if (currentMinute === 2) {
            matchFormationLevel = 2;
            homeGK.active = true;
            awayGK.active = true;
            showMatchNotice("🧤 Ingresso Scalato: Un giocatore scala in porta a fare il Portiere!");
        } 
        // Al minuto 4 si completa la formazione 4v4 in mezzo
        else if (currentMinute === 4) {
            matchFormationLevel = 4;
            showMatchNotice("⚡ Ingresso Scalato: Formazione 4v4 COMPLETA in mezzo al campo!");
        }

        if (currentMinute === 17) {
            isDoubleGoalActive = true;
            showMatchNotice("⚡ MINUTO 17': GOL DOPPIO ATTIVO!");
        }

        if (currentMinute === 20) {
            isTheWheelActive = true;
            showMatchNotice("🎡 LA RUOTA: 1v1 Porta a Porta!");
        } else if (currentMinute === 23) {
            isTheWheelActive = false;
            showMatchNotice("🏁 Fine La Ruota: Torna il match regolare!");
        }

        if (currentMinute >= 36) {
            clearInterval(timer);
            matchActive = false;
            if (homeScore === awayScore) {
                showMatchNotice("⚽ PARITÀ! SUPERSHOOTOUT 5 SECONDI!");
                setTimeout(() => endMatchSequence(), 3000);
            } else {
                endMatchSequence();
            }
        }
    }, 2000);

    requestAnimationFrame(gameLoop);
}

function gameLoop() {
    if (!matchActive) return;
    updateGame();
    drawGame();
    requestAnimationFrame(gameLoop);
}

function updateGame() {
    let mx = joystickVector.x;
    let my = joystickVector.y;

    if (keys['KeyW'] || keys['ArrowUp']) my = -1;
    if (keys['KeyS'] || keys['ArrowDown']) my = 1;
    if (keys['KeyA'] || keys['ArrowLeft']) mx = -1;
    if (keys['KeyD'] || keys['ArrowRight']) mx = 1;

    if (keys['Space'] || keys['KeyJ']) {
        if (hasBallPossession) triggerAction('shoot');
        else triggerAction('tackle');
        keys['Space'] = false; keys['KeyJ'] = false;
    }
    if (keys['KeyK']) { triggerAction('pass'); keys['KeyK'] = false; }
    if (keys['KeyL']) { triggerAction('dribble'); keys['KeyL'] = false; }

    player.x += mx * player.speed;
    player.y += my * player.speed;

    player.x = Math.max(20, Math.min(PITCH_WIDTH - 20, player.x));
    player.y = Math.max(50, Math.min(PITCH_HEIGHT - 50, player.y));

    cameraY = player.y - canvas.height / 2;

    // AI Giocatore in mezzo
    let oppSpeed = opponent.speed;
    if (difficulty === "facile") oppSpeed = 1.8;
    else if (difficulty === "difficile") oppSpeed = 3.0;

    if (opponent.x < ball.x) opponent.x += oppSpeed;
    if (opponent.x > ball.x) opponent.x -= oppSpeed;
    if (opponent.y < ball.y) opponent.y += oppSpeed;
    if (opponent.y > ball.y) opponent.y -= oppSpeed;

    // Movimento Portieri (Solo se attivi dal min 2')
    if (awayGK.active) {
        if (ball.y < 450) {
            if (awayGK.x < ball.x - 5) awayGK.x += 2.5;
            else if (awayGK.x > ball.x + 5) awayGK.x -= 2.5;
        } else {
            awayGK.x += (PITCH_WIDTH / 2 - awayGK.x) * 0.05;
        }
        awayGK.x = Math.max(130, Math.min(230, awayGK.x));

        let dAwayGK = Math.hypot(awayGK.x - ball.x, awayGK.y - ball.y);
        if (dAwayGK < awayGK.size + ball.size) {
            ball.vy = 8;
            showMatchNotice("🧤 PARATA DEL PORTIERE RIVALE!");
        }
    }

    if (homeGK.active) {
        if (ball.y > 550) {
            if (homeGK.x < ball.x - 5) homeGK.x += 2.5;
            else if (homeGK.x > ball.x + 5) homeGK.x -= 2.5;
        } else {
            homeGK.x += (PITCH_WIDTH / 2 - homeGK.x) * 0.05;
        }
        homeGK.x = Math.max(130, Math.min(230, homeGK.x));

        let dHomeGK = Math.hypot(homeGK.x - ball.x, homeGK.y - ball.y);
        if (dHomeGK < homeGK.size + ball.size) {
            ball.vy = -8;
            showMatchNotice("🧤 PARATA DEL TUO PORTIERE!");
        }
    }

    let dPlayer = Math.hypot(player.x - ball.x, player.y - ball.y);
    let dOpponent = Math.hypot(opponent.x - ball.x, opponent.y - ball.y);

    if (dPlayer < player.size + ball.size) {
        hasBallPossession = true;
        ball.x = player.x;
        ball.y = player.y - 10;
    } else if (dOpponent < opponent.size + ball.size) {
        hasBallPossession = false;
        ball.x = opponent.x;
        ball.y = opponent.y + 10;
    }

    const atk = document.getElementById('attack-set');
    const def = document.getElementById('defense-set');
    if (atk && def) {
        if (hasBallPossession) { atk.classList.remove('hidden'); def.classList.add('hidden'); }
        else { atk.classList.add('hidden'); def.classList.remove('hidden'); }
    }

    ball.x += ball.vx; ball.y += ball.vy;
    ball.vx *= 0.94; ball.vy *= 0.94;

    let pointsToAdd = isDoubleGoalActive ? 2 : 1;

    if (ball.y < 50 && ball.x > 120 && ball.x < 240) {
        homeScore += pointsToAdd;
        document.getElementById('home-score').textContent = homeScore;
        showMatchNotice(`⚽ GOL! +${pointsToAdd} per ${playerTeamName}`);
        resetPitch();
    } else if (ball.y > 950 && ball.x > 120 && ball.x < 240) {
        awayScore += pointsToAdd;
        document.getElementById('away-score').textContent = awayScore;
        showMatchNotice(`⚽ GOL AVVERSARIO! +${pointsToAdd}`);
        resetPitch();
    }
}

function resetPitch() {
    player.x = PITCH_WIDTH / 2; player.y = 700;
    opponent.x = PITCH_WIDTH / 2; opponent.y = 300;
    homeGK.x = PITCH_WIDTH / 2; awayGK.x = PITCH_WIDTH / 2;
    ball.x = player.x; ball.y = player.y - 10;
    ball.vx = 0; ball.vy = 0;
}

function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    let scale = canvas.width / PITCH_WIDTH;
    ctx.scale(scale, scale);
    ctx.translate(0, -cameraY);

    for (let i = 0; i < PITCH_HEIGHT; i += 80) {
        ctx.fillStyle = (i / 80) % 2 === 0 ? '#388e3c' : '#2e7d32';
        ctx.fillRect(0, i, PITCH_WIDTH, 80);
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 3;
    ctx.strokeRect(15, 50, PITCH_WIDTH - 30, PITCH_HEIGHT - 100);

    ctx.strokeRect(100, 50, 160, 90);
    ctx.strokeRect(100, PITCH_HEIGHT - 140, 160, 90);

    ctx.beginPath();
    ctx.arc(PITCH_WIDTH / 2, PITCH_HEIGHT / 2, 45, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(15, PITCH_HEIGHT / 2);
    ctx.lineTo(PITCH_WIDTH - 15, PITCH_HEIGHT / 2);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(120, 42, 120, 8);
    ctx.fillRect(120, PITCH_HEIGHT - 50, 120, 8);

    // --- PORTIERI (Compaiono solo quando scalano in porta dal min 2') ---
    if (homeGK.active) {
        ctx.fillStyle = homeGK.color;
        ctx.fillRect(homeGK.x - 8, homeGK.y - 8, 16, 16);
        ctx.fillStyle = '#ffffff';
        ctx.font = '6px monospace';
        ctx.fillText("GK", homeGK.x, homeGK.y + 14);
    }

    if (awayGK.active) {
        ctx.fillStyle = awayGK.color;
        ctx.fillRect(awayGK.x - 8, awayGK.y - 8, 16, 16);
        ctx.fillText("GK", awayGK.x, awayGK.y - 10);
    }

    // --- GIOCATORI DI MOVIMENTO IN MEZZO ---
    ctx.fillStyle = opponent.color;
    ctx.fillRect(opponent.x - 7, opponent.y - 12, 14, 20);

    if (matchFormationLevel >= 4) {
        ctx.fillStyle = '#ff8a80';
        ctx.fillRect(opponent.x - 50, opponent.y + 60, 12, 18);
        ctx.fillRect(opponent.x + 50, opponent.y + 60, 12, 18);
    }

    ctx.fillStyle = '#e65100';
    ctx.fillRect(player.x - 7, player.y - 12, 14, 20);

    if (matchFormationLevel >= 4) {
        ctx.fillStyle = '#ffcc00';
        ctx.fillRect(player.x - 50, player.y - 60, 12, 18);
        ctx.fillRect(player.x + 50, player.y - 60, 12, 18);
    }

    ctx.strokeStyle = '#ff6f00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x, player.y + 6, 12, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#ff3d00';
    ctx.beginPath();
    ctx.moveTo(player.x - 4, player.y - 22);
    ctx.lineTo(player.x + 4, player.y - 22);
    ctx.lineTo(player.x, player.y - 16);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '7px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(player.name, player.x, player.y + 24);

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.size, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
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
        
