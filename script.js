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

let isPresidentialMode = false;
let isMobile = false;
let difficulty = "media";

let isDoubleGoalActive = false;
let isTheWheelActive = false; 
let matchFormationLevel = 1;

let canvas, ctx;
// Campo proporzionato largo e adatta dimensione
const PITCH_WIDTH = 500;
const PITCH_HEIGHT = 1000;

const stadiumImage = new Image();
stadiumImage.src = 'stadium_sheet.png';

let player = { name: "Axel", x: 250, y: 700, size: 16, speed: 4.0 };
let opponent = { name: "Mark", x: 250, y: 300, size: 16, speed: 2.8 };

let homeGK = { name: "Portiere Tuo", x: 250, y: 935, size: 18, active: false };
let awayGK = { name: "Portiere Rivale", x: 250, y: 65, size: 18, active: false };

let ball = { x: 250, y: 680, vx: 0, vy: 0, size: 7 };
let overlayBanner = { text: "", color: "#FFD700", timer: 0 };
let cameraY = 350;
let keys = {};
let joystickVector = { x: 0, y: 0 };

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    const target = document.getElementById(screenId);
    if (target) target.classList.remove('hidden');
}

// DETERMINA RIGOROSAMENTE SE SIAMO SU PC O SU MOBILE
function detectDevice() {
    const deviceChoice = document.getElementById('control-device')?.value;
    if (deviceChoice === 'pc') {
        isMobile = false;
    } else if (deviceChoice === 'mobile') {
        isMobile = true;
    } else {
        // Se non ci sono 'touchstart' o se lo schermo è ampio, siamo su PC
        isMobile = ('ontouchstart' in window) && (window.innerWidth < 900);
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

// RESIZE DINAMICO DEL CANVAS CORRETTO PER PC
function resizeCanvas() {
    if(!canvas) return;
    
    if (!isMobile) {
        // Larghezza ampia e proporzionata per monitor PC
        canvas.width = 600;
        canvas.height = 750;
    } else {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
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
            btn.style.borderColor = "#ffd700";
        }
    });

    if (pcText) {
        pcText.textContent = isPresidentialMode ? "Rigore Pres." : "Carta Pres.";
        pcText.style.color = isPresidentialMode ? "#ff3d00" : "#ffd700";
    }
}

function useSpecialPower() {
    if (!matchActive) return;

    if (isPresidentialMode) {
        triggerBigBanner("RIGORE PRESIDENZIALE!", "#ff3d00");
        ball.x = PITCH_WIDTH / 2;
        ball.y = 220;
        ball.vx = 0; ball.vy = -14;
    } else {
        triggerBigBanner("CARTA DEL PRESIDENTE!", "#ffd700");
    }
}

function triggerBigBanner(text, color = "#FFD700") {
    overlayBanner.text = text;
    overlayBanner.color = color;
    overlayBanner.timer = 90;
}

function triggerAction(action) {
    if (!matchActive) return;

    if (action === 'shoot' && hasBallPossession) {
        let power = isDoubleGoalActive ? 16 : 13;
        ball.vy = -power;
        ball.vx = (Math.random() - 0.5) * 6;
        hasBallPossession = false;
    } else if (action === 'pass' && hasBallPossession) {
        ball.vy = -8;
        ball.vx = (Math.random() - 0.5) * 3;
        hasBallPossession = false;
    } else if (action === 'dribble') {
        player.y -= 35;
        triggerBigBanner("DRIBBLING!", "#50e3c2");
    } else if (action === 'tackle') {
        let dist = Math.hypot(player.x - opponent.x, player.y - opponent.y);
        if (dist < 35) {
            hasBallPossession = true;
            ball.x = player.x; ball.y = player.y - 10;
            triggerBigBanner("PALLA RECUPERATA!", "#ffcc00");
        } else {
            triggerBigBanner("TACKLE FALLITO", "#ff4444");
        }
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

        if (currentMinute === 2) {
            matchFormationLevel = 2;
            homeGK.active = true; awayGK.active = true;
            triggerBigBanner("INGRESSO PORTIERI!", "#ffd700");
        } else if (currentMinute === 4) {
            matchFormationLevel = 4;
            triggerBigBanner("4v4 COMPLETO!", "#ffb703");
        }

        if (currentMinute === 17) {
            isDoubleGoalActive = true;
            triggerBigBanner("⚡ GOL DOPPIO ATTIVO!", "#ff3d00");
        }

        if (currentMinute === 20) {
            isTheWheelActive = true;
            triggerBigBanner("🎡 LA RUOTA (1v1)", "#ff007f");
        } else if (currentMinute === 23) {
            isTheWheelActive = false;
        }

        if (currentMinute >= 36) {
            clearInterval(timer);
            matchActive = false;
            if (homeScore === awayScore) {
                triggerBigBanner("SHOOTOUT FINALE!", "#ff3d00");
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

    player.x = Math.max(30, Math.min(PITCH_WIDTH - 30, player.x));
    player.y = Math.max(50, Math.min(PITCH_HEIGHT - 50, player.y));

    // Telecamera centrate sul giocatore
    cameraY = player.y - (canvas.height / 2);
    cameraY = Math.max(0, Math.min(PITCH_HEIGHT - canvas.height, cameraY));

    let oppSpeed = opponent.speed;
    if (difficulty === "facile") oppSpeed = 2.2;
    else if (difficulty === "difficile") oppSpeed = 3.5;

    if (opponent.x < ball.x) opponent.x += oppSpeed;
    if (opponent.x > ball.x) opponent.x -= oppSpeed;
    if (opponent.y < ball.y) opponent.y += oppSpeed;
    if (opponent.y > ball.y) opponent.y -= oppSpeed;

    if (awayGK.active) {
        if (ball.y < 450) {
            if (awayGK.x < ball.x - 5) awayGK.x += 3.2;
            else if (awayGK.x > ball.x + 5) awayGK.x -= 3.2;
        } else {
            awayGK.x += (PITCH_WIDTH / 2 - awayGK.x) * 0.08;
        }
        awayGK.x = Math.max(180, Math.min(320, awayGK.x));

        let dAwayGK = Math.hypot(awayGK.x - ball.x, awayGK.y - ball.y);
        if (dAwayGK < awayGK.size + ball.size && ball.vy < 0) {
            ball.vy = 10;
            ball.vx = (Math.random() - 0.5) * 8;
            triggerBigBanner("PARATA!", "#00e5ff");
        }
    }

    if (homeGK.active) {
        if (ball.y > 550) {
            if (homeGK.x < ball.x - 5) homeGK.x += 3.2;
            else if (homeGK.x > ball.x + 5) homeGK.x -= 3.2;
        } else {
            homeGK.x += (PITCH_WIDTH / 2 - homeGK.x) * 0.08;
        }
        homeGK.x = Math.max(180, Math.min(320, homeGK.x));

        let dHomeGK = Math.hypot(homeGK.x - ball.x, homeGK.y - ball.y);
        if (dHomeGK < homeGK.size + ball.size && ball.vy > 0) {
            ball.vy = -10;
            ball.vx = (Math.random() - 0.5) * 8;
            triggerBigBanner("PARATA!", "#00e5ff");
        }
    }

    let dPlayer = Math.hypot(player.x - ball.x, player.y - ball.y);
    let dOpponent = Math.hypot(opponent.x - ball.x, opponent.y - ball.y);

    if (dPlayer < player.size + ball.size) {
        hasBallPossession = true;
        ball.x = player.x; ball.y = player.y - 12;
    } else if (dOpponent < opponent.size + ball.size) {
        hasBallPossession = false;
        ball.x = opponent.x; ball.y = opponent.y + 12;
    }

    const atk = document.getElementById('attack-set');
    const def = document.getElementById('defense-set');
    if (atk && def) {
        if (hasBallPossession) { atk.classList.remove('hidden'); def.classList.add('hidden'); }
        else { atk.classList.add('hidden'); def.classList.remove('hidden'); }
    }

    ball.x += ball.vx; ball.y += ball.vy;
    ball.vx *= 0.93; ball.vy *= 0.93;

    let pointsToAdd = isDoubleGoalActive ? 2 : 1;

    if (ball.y < 50 && ball.x > 170 && ball.x < 330) {
        homeScore += pointsToAdd;
        document.getElementById('home-score').textContent = homeScore;
        triggerBigBanner("GOL!", "#FFD700");
        resetPitch();
    } else if (ball.y > 950 && ball.x > 170 && ball.x < 330) {
        awayScore += pointsToAdd;
        document.getElementById('away-score').textContent = awayScore;
        triggerBigBanner("GOL SUBITO!", "#ff4444");
        resetPitch();
    }
}

function resetPitch() {
    player.x = PITCH_WIDTH / 2; player.y = 700;
    opponent.x = PITCH_WIDTH / 2; opponent.y = 300;
    homeGK.x = PITCH_WIDTH / 2; homeGK.y = 935;
    awayGK.x = PITCH_WIDTH / 2; awayGK.y = 65;
    ball.x = player.x; ball.y = player.y - 10;
    ball.vx = 0; ball.vy = 0;
}

function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    
    // Proporzionamento dinamico della scala del campo
    let scale = canvas.width / PITCH_WIDTH;
    ctx.scale(scale, scale);
    ctx.translate(0, -cameraY);

    // Erba a strisce
    for (let i = 0; i < PITCH_HEIGHT; i += 80) {
        ctx.fillStyle = (i / 80) % 2 === 0 ? '#388e3c' : '#2e7d32';
        ctx.fillRect(0, i, PITCH_WIDTH, 80);
    }

    // Disegno dello Stadio
    if (stadiumImage.complete && stadiumImage.naturalWidth !== 0) {
        ctx.drawImage(stadiumImage, 15, 30, 450, 335, 0, 0, PITCH_WIDTH, PITCH_HEIGHT);
    } else {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 4;
        ctx.strokeRect(20, 40, PITCH_WIDTH - 40, PITCH_HEIGHT - 80);
        ctx.beginPath();
        ctx.arc(PITCH_WIDTH / 2, PITCH_HEIGHT / 2, 60, 0, Math.PI * 2);
        ctx.stroke();
    }

    // Portieri
    if (homeGK.active) {
        if (stadiumImage.complete && stadiumImage.naturalWidth !== 0) {
            ctx.drawImage(stadiumImage, 580, 40, 16, 24, homeGK.x - 10, homeGK.y - 14, 20, 28);
        } else {
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(homeGK.x - 10, homeGK.y - 10, 20, 20);
        }
    }

    if (awayGK.active) {
        if (stadiumImage.complete && stadiumImage.naturalWidth !== 0) {
            ctx.drawImage(stadiumImage, 580, 100, 16, 24, awayGK.x - 10, awayGK.y - 14, 20, 28);
        } else {
            ctx.fillStyle = '#ffea00';
            ctx.fillRect(awayGK.x - 10, awayGK.y - 10, 20, 20);
        }
    }

    // Giocatori
    if (stadiumImage.complete && stadiumImage.naturalWidth !== 0) {
        ctx.drawImage(stadiumImage, 510, 100, 16, 24, opponent.x - 10, opponent.y - 14, 20, 28);
        ctx.drawImage(stadiumImage, 510, 40, 16, 24, player.x - 10, player.y - 14, 20, 28);
    } else {
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(opponent.x - 9, opponent.y - 14, 18, 24);
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(player.x - 9, player.y - 14, 18, 24);
    }

    // Indicatore selezione
    ctx.strokeStyle = '#00ffcc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 20, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(player.name, player.x, player.y + 22);

    // Pallone
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.size, 0, Math.PI * 2);
    ctx.fill();

    // Banner
    if (overlayBanner.timer > 0) {
        overlayBanner.timer--;
        ctx.fillStyle = overlayBanner.color;
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'center';
        ctx.shadowColor = "#000000";
        ctx.shadowBlur = 10;
        ctx.fillText(overlayBanner.text, PITCH_WIDTH / 2, cameraY + (canvas.height / (2 * scale)));
        ctx.shadowBlur = 0;
    }

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
