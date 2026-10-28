/* =====================================================================
   CONTROLLI: su PC (mouse e tastiera) vengono rimossi joystick e pulsanti
   su schermo; su cellulare e tablet vengono mostrati. Si può forzare in Impostazioni.
   ===================================================================== */
const Controls = (() => {
  const mm = q => { try { return matchMedia(q).matches; } catch (_) { return false; } };
  let sawTouch = mm('(pointer: coarse)') || (navigator.maxTouchPoints > 0 && !mm('(pointer: fine)'));
  const pref = () => { try { return App.settings.controls || 'auto'; } catch (_) { return 'auto'; } };
  const isTouch = () => { const c = pref(); return c === 'tactil' ? true : c === 'teclado' ? false : sawTouch; };
  function apply() {
    document.documentElement.classList.toggle('pc', !isTouch());
    let k = 1; try { k = App.settings.padSize === 'grande' ? 1.15 : App.settings.padSize === 'pequeno' ? 0.88 : 1; } catch (_) {}
    document.documentElement.style.setProperty('--padk', k);
  }
  addEventListener('pointerdown', e => { if (e.pointerType === 'touch' && !sawTouch) { sawTouch = true; apply(); } }, { capture: true });
  apply();
  return { apply, isTouch, pc: () => !isTouch() };
})();

/* ---------- Nessuno zoom indesiderato nel browser ---------- */
(() => {
  const no = e => { e.preventDefault(); };
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(t => document.addEventListener(t, no, { passive: false }));
  document.addEventListener('touchmove', e => { if (e.touches && e.touches.length > 1) e.preventDefault(); }, { passive: false });
  document.addEventListener('dblclick', no, { passive: false });
  addEventListener('wheel', e => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
  addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && ['+', '-', '=', '0'].includes(e.key)) e.preventDefault(); });
})();

/* =====================================================================
   INPUT: tastiera + joystick tattile + pulsanti.
   ===================================================================== */
const Input = (() => {
  const keys = new Set(), pressed = new Set();
  const joy = { x: 0, y: 0, id: null, ox: 0, oy: 0 };
  let shootTouch = null;
  const R = 44, DEAD = 0.16, SPRINT_AT = 1.3, FOLLOW = 1.9;
  const shell = document.getElementById('shell'), touch = document.getElementById('touch');
  const stick = document.getElementById('stick'), knob = document.getElementById('knob');
  
  const COMMON = { KeyZ: 'A', KeyX: 'switch', KeyC: 'B', KeyV: 'dribble', Space: 'tech', KeyQ: 'switch', KeyU: 'techNext', KeyE: 'techNext' };
  const PASS_KEYS = ['KeyJ', 'KeyZ'];
  const STD = { move: { up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'], left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'] },
    sprint: ['ShiftLeft', 'ShiftRight'], pass: PASS_KEYS, pause: ['KeyP', 'Escape'] };
  const SCHEMES = {
    nuevas: Object.assign({ map: Object.assign({}, COMMON, { KeyJ: 'A', KeyK: 'switch', KeyL: 'B', KeyI: 'dribble' }), shoot: ['KeyK', 'KeyX'] }, STD),
    clasicas: Object.assign({ map: Object.assign({}, COMMON, { KeyJ: 'A', KeyK: 'B', KeyI: 'dribble' }), shoot: ['KeyL', 'KeyX'] }, STD),
  };
  
  const CUSTOM_DEF = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', sprint: 'ShiftLeft', pass: 'KeyJ', shoot: 'KeyK', switch: 'KeyK',
    through: 'KeyL', dribble: 'KeyI', tech: 'Space', techNext: 'KeyE', pause: 'KeyP' };
  const customKeys = () => { let m = null; try { m = App.settings.keyMap; } catch (_) {} return Object.assign({}, CUSTOM_DEF, m || {}); };
  let customSig = '', customCache = null;
  function customScheme() {
    const k = customKeys(), sig = JSON.stringify(k);
    if (sig === customSig) return customCache;
    const map = {};
    [['techNext', 'techNext'], ['tech', 'tech'], ['dribble', 'dribble'], ['through', 'B'], ['switch', 'switch'], ['pass', 'A']].forEach(([a, act]) => { if (k[a]) map[k[a]] = act; });
    customSig = sig;
    return (customCache = { map, shoot: [k.shoot], pass: [k.pass], sprint: [k.sprint], pause: [k.pause, 'Escape'], move: { up: [k.up], down: [k.down], left: [k.left], right: [k.right] } });
  }
  const scheme = () => { try { return App.settings.keys === 'custom' ? customScheme() : SCHEMES[App.settings.keys] || SCHEMES.nuevas; } catch (_) { return SCHEMES.nuevas; } };
  const inScheme = (K, c) => !!K.map[c] || K.shoot.includes(c) || K.sprint.includes(c) || Object.values(K.move).some(l => l.includes(c));
  
  function keyName(c) {
    let L = null; try { L = App.settings.keyLabels; } catch (_) {}
    if (!c) return '—';
    if (L && L[c]) return L[c];
    if (c.startsWith('Key')) return c.slice(3);
    if (c.startsWith('Digit')) return c.slice(5);
    if (c.startsWith('Numpad')) return 'Num ' + c.slice(6);
    return { Space: TX('Spazio'), ShiftLeft: 'Shift', ShiftRight: TX('Shift dx'), ControlLeft: 'Ctrl', ControlRight: TX('Ctrl dx'), AltLeft: 'Alt', AltRight: 'AltGr',
      ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Enter: 'Enter', Tab: 'Tab', Backspace: '⌫', CapsLock: TX('Bloc Maiusc') }[c] || c;
  }
  let capture = null;
  let passTouch = null;
  const BLOCK = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'];

  addEventListener('keydown', e => {
    if (capture) { e.preventDefault(); e.stopPropagation(); if (e.repeat) return; const f = capture; capture = null; f(e); return; }
    const K = scheme();
    if (App.inMatch() && (BLOCK.includes(e.code) || inScheme(K, e.code))) e.preventDefault();
    if (e.repeat) return;
    if (App.menuKey && App.menuKey(e)) return;
    keys.add(e.code);
    if (K.map[e.code]) pressed.add(K.map[e.code]);
    if (K.shoot.includes(e.code)) pressed.add('shoot');
    if (K.pause.includes(e.code)) App.togglePause();
  }, true);
  addEventListener('keyup', e => keys.delete(e.code));
  addEventListener('blur', () => { keys.clear(); shootTouch = null; passTouch = null; });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { keys.clear(); shootTouch = null; passTouch = null; } });

  touch.addEventListener('pointerdown', e => {
    if (joy.id !== null) return;
    if (Controls.pc() && e.pointerType === 'mouse') return;
    const r = shell.getBoundingClientRect();
    if (e.clientX - r.left > r.width * 0.6) return;
    joy.id = e.pointerId; joy.ox = e.clientX; joy.oy = e.clientY;
    stick.className = 'live';
    stick.style.left = (e.clientX - r.left) + 'px'; stick.style.top = (e.clientY - r.top) + 'px';
    try { touch.setPointerCapture(e.pointerId); } catch (_) {}
  });
  touch.addEventListener('pointermove', e => {
    if (e.pointerId !== joy.id) return;
    let dx = e.clientX - joy.ox, dy = e.clientY - joy.oy, len = Math.hypot(dx, dy);
    if (len > R * FOLLOW) {
      const k = (len - R * FOLLOW) / len; joy.ox += dx * k; joy.oy += dy * k; dx -= dx * k; dy -= dy * k; len = R * FOLLOW;
      const r = shell.getBoundingClientRect(); stick.style.left = (joy.ox - r.left) + 'px'; stick.style.top = (joy.oy - r.top) + 'px';
    }
    const sprint = len > R * SPRINT_AT, m = len < R * DEAD ? 0 : Math.min(1, (len - R * DEAD) / (R * (1 - DEAD)));
    const out = sprint ? 1 : m * 0.92;
    joy.x = len ? dx / len * out : 0; joy.y = len ? dy / len * out : 0;
    const kl = Math.min(len, R); knob.style.transform = `translate(${len ? dx / len * kl : 0}px,${len ? dy / len * kl : 0}px)`;
    stick.classList.toggle('sprint', sprint);
  });
  const end = e => {
    if (e.pointerId !== joy.id) return;
    joy.id = null; joy.x = joy.y = 0; knob.style.transform = '';
    stick.className = 'rest'; stick.style.left = stick.style.top = '';
  };
  touch.addEventListener('pointerup', end);
  touch.addEventListener('pointercancel', end);
  addEventListener('pointerup', e => { if (shootTouch === e.pointerId) shootTouch = null; if (passTouch === e.pointerId) passTouch = null; });
  addEventListener('pointercancel', e => { if (shootTouch === e.pointerId) shootTouch = null; if (passTouch === e.pointerId) passTouch = null; });

  const GP = { 0: 'A', 1: 'B', 3: 'tech', 5: 'dribble', 4: 'switch', 6: 'techNext' };
  let gpPrev = [], gpState = { x: 0, y: 0, sprint: false, shoot: false, pass: false };
  addEventListener('gamepadconnected', e => { try { UI.toast(TX('🎮 Controller connesso: ') + (e.gamepad.id || '').split('(')[0].trim().slice(0, 30), 2200); } catch (_) {} document.body.classList.add('gamepad'); });
  addEventListener('gamepaddisconnected', () => { try { UI.toast(TX('Controller disconnesso'), 1600); } catch (_) {} if (![...(navigator.getGamepads ? navigator.getGamepads() : [])].some(Boolean)) document.body.classList.remove('gamepad'); });
  function pollPad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const g = [...pads].find(p => p && p.connected);
    gpState = { x: 0, y: 0, sprint: false, shoot: false, pass: false };
    if (!g) return;
    const b = i => !!(g.buttons[i] && (g.buttons[i].pressed || g.buttons[i].value > 0.5));
    let x = g.axes[0] || 0, y = g.axes[1] || 0;
    if (Math.hypot(x, y) < 0.18) x = y = 0;
    if (b(14)) x = -1; if (b(15)) x = 1; if (b(12)) y = -1; if (b(13)) y = 1;
    gpState = { x, y, sprint: b(7), shoot: b(2), pass: b(0) };
    for (const i in GP) if (b(i) && !gpPrev[i]) pressed.add(GP[i]);
    if (b(2) && !gpPrev[2]) pressed.add('shoot');
    if (b(9) && !gpPrev[9]) App.togglePause();
    gpPrev = g.buttons.map((_, i) => b(i));
  }
  function read() {
    pollPad();
    let x = 0, y = 0;
    const K = scheme(), on = l => l.some(k => keys.has(k));
    if (on(K.move.left)) x -= 1;
    if (on(K.move.right)) x += 1;
    if (on(K.move.up)) y -= 1;
    if (on(K.move.down)) y += 1;
    if (x || y) { const l = Math.hypot(x, y); x /= l; y /= l; }
    x += joy.x + gpState.x; y += joy.y + gpState.y;
    const out = { move: { x, y }, sprint: on(K.sprint) || gpState.sprint,
      shootHeld: on(K.shoot) || shootTouch !== null || gpState.shoot, passHeld: on(K.pass) || passTouch !== null || gpState.pass, pressed: new Set(pressed) };
    pressed.clear();
    return out;
  }
  return {
    read,
    CUSTOM_DEF, customKeys, keyName,
    capture: f => { capture = f; },
    press: a => pressed.add(a),
    holdShoot: (on, id) => { if (on) { shootTouch = id; pressed.add('shoot'); } else if (id === undefined || shootTouch === id) shootTouch = null; },
    holdPass: (on, id) => { if (on) passTouch = id; else if (id === undefined || passTouch === id) passTouch = null; },
  };
})();

/* =====================================================================
   PULSANTI TATTILI: cambiano a seconda che la tua squadra abbia o meno la palla.
   ===================================================================== */
const Pad = (() => {
  const SETS = {
    attack: [
      { label: TX('Tiro'), sub: 'tieni', cls: 'big', hold: true },
      { label: TX('Passaggio'), sub: TX('mantieni'), cls: 's2', action: 'A', holdPass: true },
      { label: TX('Tecnica'), cls: 's3 fire', action: 'tech', tech: true },
      { label: '⇄', cls: 's6 tnext', action: 'techNext' },
      { label: TX('Dribbling'), cls: 's5', action: 'dribble' },
    ],
    gk: [
      { label: TX('Rinvio'), sub: 'rilascia', cls: 'big', hold: true },
      { label: TX('Passaggio'), sub: TX('mantieni'), cls: 's2', action: 'A', holdPass: true },
      { label: TX('Rinvio<br>lungo'), cls: 's4', action: 'B' },
    ],
    defense1: [
      { label: TX('Contrasto'), cls: 'big', action: 'A' },
      { label: TX('Tecnica'), cls: 's3 fire', action: 'tech', tech: true },
      { label: '⇄', cls: 's6 tnext', action: 'techNext' },
    ],
    support: [
      { label: TX('Passamela!'), cls: 'big', action: 'A' },
      { label: TX('Tecnica'), cls: 's3 fire', action: 'tech', tech: true },
      { label: '⇄', cls: 's6 tnext', action: 'techNext' },
    ],
    defense: [
      { label: TX('Contrasto'), cls: 'big', action: 'A' },
      { label: TX('Cambia'), cls: 's5', action: 'switch' },
      { label: TX('Tecnica'), cls: 's3 fire', action: 'tech', tech: true },
      { label: '⇄', cls: 's6 tnext', action: 'techNext' },
    ],
  };
  const pad = document.getElementById('pad'), kh = document.getElementById('keyhud');
  const KEYS_CLASICAS = {
    attack: '<b>WASD</b>/<b>' + TX('frecce') + '</b> ' + TX('muovi ·') + ' <b>' + TX('Shift') + '</b> ' + TX('scatto ·') + ' <b>J/Z</b> ' + TX('passaggio (tieni = forte) ·') + ' <b>I/V</b> ' + TX('dribbling ·') + ' <b>L/X</b> ' + TX('tiro (tieni) ·') + ' <b>U</b> ' + TX('cambia tecnica'),
    defense: '<b>WASD</b>/<b>' + TX('frecce') + '</b> ' + TX('muovi ·') + ' <b>' + TX('Shift') + '</b> ' + TX('scatto ·') + ' <b>J/Z</b> ' + TX('contrasto ·') + ' <b>Q/X</b> ' + TX('cambia ·') + ' <b>U</b> ' + TX('cambia tecnica'),
    gk: '<b>' + TX('Portiere') + '</b>: <b>WASD</b>/<b>' + TX('frecce') + '</b> ' + TX('muoviti in area ·') + ' <b>J/Z</b> ' + TX('passaggio (tieni = forte) ·') + ' <b>K/C</b> ' + TX('rinvio lungo ·') + ' <b>L/X</b> ' + TX('rinvio'),
    support: '<b>WASD</b>/<b>' + TX('frecce') + '</b> ' + TX('muovi ·') + ' <b>J/Z</b> ' + TX('Passamela!'),
    defense1: '<b>WASD</b>/<b>' + TX('frecce') + '</b> ' + TX('muovi ·') + ' <b>Shift</b> ' + TX('scatto ·') + ' <b>J/Z</b> ' + TX('contrasto ·') + ' <b>U</b> ' + TX('cambia tecnica'),
  };
  const KEYS = {
    attack: '<b>WASD</b>/<b>' + TX('frecce') + '</b> ' + TX('muovi ·') + ' <b>' + TX('Shift') + '</b> ' + TX('scatto ·') + ' <b>J/Z</b> ' + TX('passaggio (tieni = forte) ·') + ' <b>K/X</b> ' + TX('tiro (tieni) ·') + ' <b>I/V</b> ' + TX('dribbling ·') + ' <b>E</b> ' + TX('cambia tecnica'),
    defense: '<b>WASD</b>/<b>' + TX('frecce') + '</b> ' + TX('muovi ·') + ' <b>' + TX('Shift') + '</b> ' + TX('scatto ·') + ' <b>J/Z</b> ' + TX('contrasto ·') + ' <b>K/X</b> ' + TX('cambia ·') + ' <b>E</b> ' + TX('cambia tecnica'),
    gk: '<b>' + TX('Portiere') + '</b>: <b>WASD</b>/<b>' + TX('frecce') + '</b> ' + TX('muoviti in area ·') + ' <b>J/Z</b> ' + TX('passaggio (tieni = forte) ·') + ' <b>K/X</b> ' + TX('rinvio ·') + ' <b>L/C</b> ' + TX('rinvio lungo'),
    support: '<b>WASD</b>/<b>' + TX('frecce') + '</b> ' + TX('muovi ·') + ' <b>J/Z</b> ' + TX('Passamela!'),
    defense1: '<b>WASD</b>/<b>' + TX('frecce') + '</b> ' + TX('muovi ·') + ' <b>Shift</b> ' + TX('scatto ·') + ' <b>J/Z</b> ' + TX('contrasto ·') + ' <b>E</b> ' + TX('cambia tecnica'),
  };
  function customHud(m) {
    const k = Input.customKeys(), n = c => '<b>' + esc(Input.keyName(c)) + '</b>';
    const mv = [k.up, k.left, k.down, k.right].every(c => /^Key.$/.test(c)) ? '<b>' + [k.up, k.left, k.down, k.right].map(c => c.slice(3)).join('') + '</b>' : [k.up, k.left, k.down, k.right].map(n).join('');
    const sp = ' ' + n(k.sprint) + ' ' + TX('scatto ·') + ' ';
    const parts = {
      attack: mv + ' ' + TX('muovi ·') + sp + n(k.pass) + ' ' + TX('passaggio (tieni = forte) ·') + ' ' + n(k.shoot) + ' ' + TX('tiro (tieni) ·') + ' ' + n(k.dribble) + ' ' + TX('dribbling ·') + ' ' + n(k.techNext) + ' ' + TX('cambia tecnica'),
      defense: mv + ' ' + TX('muovi ·') + sp + n(k.pass) + ' ' + TX('contrasto ·') + ' ' + n(k.switch) + ' ' + TX('cambia ·') + ' ' + n(k.techNext) + ' ' + TX('cambia tecnica'),
      gk: '<b>' + TX('Portiere') + '</b>: ' + mv + ' ' + TX('muoviti in area ·') + ' ' + n(k.pass) + ' ' + TX('passaggio (tieni = forte) ·') + ' ' + n(k.shoot) + ' ' + TX('rinvio ·') + ' ' + n(k.through) + ' ' + TX('rinvio lungo'),
      support: mv + ' ' + TX('muovi ·') + ' ' + n(k.pass) + ' ' + TX('Passamela!'),
      defense1: mv + ' ' + TX('muovi ·') + sp + n(k.pass) + ' ' + TX('contrasto ·') + ' ' + n(k.techNext) + ' ' + TX('cambia tecnica'),
    };
    return (parts[m] || parts.attack) + ' · ' + n(k.pause) + ' ' + TX('pausa');
  }
  let mode = null, techBtn = null, techLbl = null, lastName = null, lastKH = null, dribBtn = null, lastDrib = -1, nextBtn = null;
  const down = new Set();
  function render(m) {
    if (m === mode || down.size) return;
    let sch = 'nuevas'; try { sch = App.settings.keys || 'nuevas'; } catch (_) {}
    kh.querySelector('.kh-keys').innerHTML = sch === 'custom' ? customHud(m) : (sch === 'clasicas' ? KEYS_CLASICAS : KEYS)[m] + ' · <b>P</b> ' + TX('pausa');
    mode = m; pad.innerHTML = ''; techBtn = null; dribBtn = null; nextBtn = null; lastDrib = -1; lastName = null;
    Input.holdShoot(false); Input.holdPass(false);
    SETS[m].forEach(b => {
      const el = document.createElement('button');
      el.className = 'act ' + b.cls;
      applyLayout(el, b.cls.split(' ')[0]);
      el.innerHTML = (b.tech ? `<span class="tt">${b.label}</span>` : b.label) + (b.sub ? `<small>${b.sub}</small>` : '') + (b.tech ? '<small class="tn"></small>' : '');
      el.addEventListener('pointerdown', e => {
        e.preventDefault(); el.classList.add('down'); down.add(e.pointerId);
        if (b.hold) { Input.holdShoot(true, e.pointerId); try { el.setPointerCapture(e.pointerId); } catch (_) {} }
        else { Input.press(b.action); if (b.holdPass) { Input.holdPass(true, e.pointerId); try { el.setPointerCapture(e.pointerId); } catch (_) {} } }
      });
      const up = e => { el.classList.remove('down'); down.delete(e.pointerId); if (b.hold) Input.holdShoot(false, e.pointerId); if (b.holdPass) Input.holdPass(false, e.pointerId); };
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => el.addEventListener(t, up));
      el.addEventListener('pointerleave', () => { if (!b.hold) el.classList.remove('down'); });
      if (b.tech) { techBtn = el; techLbl = el.querySelector('.tn'); }
      if (b.action === 'dribble') dribBtn = el;
      if (b.action === 'techNext') nextBtn = el;
      pad.appendChild(el);
    });
  }
})();
