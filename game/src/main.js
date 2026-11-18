import * as THREE from 'three';
import { buildWorld, mulberry32 } from './world.js';

const params = new URLSearchParams(location.search);
const shot = params.get('shot') || 'start';

const canvas = document.getElementById('scene');
const moneyEl = document.getElementById('money');
const objectiveEl = document.getElementById('objective');
const timerEl = document.getElementById('timer');
const challengeEl = document.getElementById('challenge');
const speedEl = document.getElementById('speed');
const toastEl = document.getElementById('toast');
const startScreen = document.getElementById('startScreen');
const startBtn = document.getElementById('startBtn');
const modeBtn = document.getElementById('modeBtn');
const statusEl = document.getElementById('status');
const mapCanvas = document.getElementById('minimap');
const mapCtx = mapCanvas.getContext('2d');

window.__solmaris = { ready: false, webgl: false, mode: 'foot', money: 250, frames: 0, errors: [] };
window.addEventListener('error', (ev) => {
  window.__solmaris.errors.push(String(ev.message || ev.error || 'error'));
});

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  window.__solmaris.webgl = !!renderer.getContext();
} catch (err) {
  statusEl.textContent = 'WebGL is not available on this device.';
  window.__solmaris.errors.push(String(err && err.message ? err.message : err));
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.06;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1500);

const world = buildWorld(scene);
const colliders = world.colliders;
const spots = world.missionSpots;
const rand = mulberry32(777001);

const player = new THREE.Group();
const legMat = new THREE.MeshLambertMaterial({ color: 0x2a2f3a });
const legL = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.5, 0.17), legMat);
legL.position.set(-0.13, 0.25, 0);
const legR = legL.clone();
legR.position.x = 0.13;
const bodyMesh = new THREE.Mesh(
  new THREE.CylinderGeometry(0.34, 0.38, 0.85, 10),
  new THREE.MeshLambertMaterial({ color: 0x2f8f7a }),
);
bodyMesh.position.y = 0.95;
const headMesh = new THREE.Mesh(
  new THREE.SphereGeometry(0.27, 12, 10),
  new THREE.MeshLambertMaterial({ color: 0xe8b98a }),
);
headMesh.position.y = 1.62;
const capMesh = new THREE.Mesh(
  new THREE.CylinderGeometry(0.29, 0.29, 0.13, 12),
  new THREE.MeshLambertMaterial({ color: 0xe8533f }),
);
capMesh.position.y = 1.83;
const armL = new THREE.Mesh(
  new THREE.BoxGeometry(0.13, 0.55, 0.13),
  new THREE.MeshLambertMaterial({ color: 0x2f8f7a }),
);
armL.position.set(-0.46, 1.0, 0);
const armR = armL.clone();
armR.position.x = 0.46;
player.add(legL, legR, bodyMesh, headMesh, capMesh, armL, armR);
player.traverse((o) => { if (o.isMesh) o.castShadow = true; });
player.position.set(2, 0, 38);
scene.add(player);

const car = new THREE.Group();
const carBody = new THREE.Mesh(
  new THREE.BoxGeometry(1.9, 0.55, 4.2),
  new THREE.MeshLambertMaterial({ color: 0xe8533f }),
);
carBody.position.y = 0.62;
const carCabin = new THREE.Mesh(
  new THREE.BoxGeometry(1.65, 0.5, 2.1),
  new THREE.MeshLambertMaterial({ color: 0x232833 }),
);
carCabin.position.set(0, 1.12, -0.25);
const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12);
wheelGeo.rotateZ(Math.PI / 2);
const wheelMat = new THREE.MeshLambertMaterial({ color: 0x14161a });
const wheels = [];
const steerGroups = [];
for (const [wx, wz, front] of [[-0.95, 1.35, true], [0.95, 1.35, true], [-0.95, -1.35, false], [0.95, -1.35, false]]) {
  const w = new THREE.Mesh(wheelGeo, wheelMat);
  w.position.set(0, 0, 0);
  if (front) {
    const g = new THREE.Group();
    g.position.set(wx, 0.42, wz);
    g.add(w);
    car.add(g);
    steerGroups.push(g);
  } else {
    w.position.set(wx, 0.42, wz);
    car.add(w);
  }
  wheels.push(w);
}
const headMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
for (const hx of [-0.6, 0.6]) {
  const h = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.13, 0.08), headMat);
  h.position.set(hx, 0.62, 2.12);
  car.add(h);
}
const tailMat = new THREE.MeshBasicMaterial({ color: 0xff3b30 });
for (const hx of [-0.6, 0.6]) {
  const t = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.13, 0.08), tailMat);
  t.position.set(hx, 0.62, -2.12);
  car.add(t);
}
car.add(carBody, carCabin);
car.traverse((o) => { if (o.isMesh) o.castShadow = true; });
car.position.set(0, 0, 30);
car.rotation.y = Math.PI;
scene.add(car);

const state = {
  running: false,
  mode: 'foot',
  money: 250,
  heading: Math.PI,
  speed: 0,
  steer: 0,
  mission: null,
  missionTimer: 90,
  rushGot: 0,
  rushTimer: 60,
  walkPhase: 0,
  camYaw: 0,
  camPitch: 0.34,
  camDist: 13,
  camTarget: new THREE.Vector3(0, 4, 20),
  idleYaw: 0.6,
  respawns: [],
};

const keys = new Set();
const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'run', ShiftRight: 'run',
};
window.addEventListener('keydown', (ev) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(ev.code)) ev.preventDefault();
  if (ev.code === 'Enter' && !state.running) { startGame(); return; }
  if (ev.code === 'KeyE' && !ev.repeat && state.running) { toggleMode(); return; }
  const k = KEYMAP[ev.code];
  if (k) keys.add(k);
});
window.addEventListener('keyup', (ev) => {
  const k = KEYMAP[ev.code];
  if (k) keys.delete(k);
});

let dragging = false;
let lastX = 0;
let lastY = 0;
canvas.addEventListener('pointerdown', (ev) => {
  dragging = true;
  lastX = ev.clientX;
  lastY = ev.clientY;
  canvas.setPointerCapture(ev.pointerId);
});
canvas.addEventListener('pointermove', (ev) => {
  if (!dragging) return;
  state.camYaw -= (ev.clientX - lastX) * 0.005;
  state.camPitch += (ev.clientY - lastY) * 0.004;
  state.camPitch = Math.max(0.08, Math.min(1.2, state.camPitch));
  lastX = ev.clientX;
  lastY = ev.clientY;
});
canvas.addEventListener('pointerup', () => { dragging = false; });
canvas.addEventListener('wheel', (ev) => {
  ev.preventDefault();
  state.camDist = Math.max(6, Math.min(34, state.camDist * Math.exp(ev.deltaY * 0.001)));
}, { passive: false });

modeBtn.addEventListener('click', () => { if (state.running) toggleMode(); });
startBtn.addEventListener('click', startGame);

let toastTimer = 0;
function toast(text, ms) {
  toastEl.textContent = text;
  toastEl.classList.add('show');
  statusEl.textContent = text;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), ms || 2600);
}

function clampToWorld(p, radius, allowPier) {
  p.x = Math.max(-235, Math.min(235, p.x));
  p.z = Math.max(-235, Math.min(235, p.z));
  if (p.x > 226) {
    if (allowPier && Math.abs(p.z - 40) <= 1.8) {
      p.x = Math.min(p.x, 294);
    } else {
      p.x = 226;
    }
  }
  for (const c of colliders) {
    const cx = Math.max(c.minX, Math.min(p.x, c.maxX));
    const cz = Math.max(c.minZ, Math.min(p.z, c.maxZ));
    let dx = p.x - cx;
    let dz = p.z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 < radius * radius) {
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2);
        p.x += (dx / d) * (radius - d);
        p.z += (dz / d) * (radius - d);
      } else {
        const pushL = p.x - c.minX;
        const pushR = c.maxX - p.x;
        const pushU = p.z - c.minZ;
        const pushD = c.maxZ - p.z;
        const m = Math.min(pushL, pushR, pushU, pushD);
        if (m === pushL) p.x = c.minX - radius;
        else if (m === pushR) p.x = c.maxX + radius;
        else if (m === pushU) p.z = c.minZ - radius;
        else p.z = c.maxZ + radius;
      }
    }
  }
}

function randomRoadSpot() {
  const roads = world.minimap.roads;
  const road = roads[Math.floor(rand() * roads.length)];
  const along = -150 + rand() * 300;
  if (rand() < 0.5) return { x: road + (rand() - 0.5) * 7, z: along };
  return { x: along, z: road + (rand() - 0.5) * 7 };
}

function pickMission(exclude) {
  let idx;
  do { idx = Math.floor(rand() * spots.length); } while (spots.length > 1 && idx === exclude);
  state.mission = spots[idx];
  state.missionTimer = 90;
  world.setMarker(state.mission.x, state.mission.z);
}

function startGame() {
  if (state.running) return;
  state.running = true;
  startScreen.classList.add('hidden');
  pickMission(-1);
  state.rushGot = 0;
  state.rushTimer = 60;
  toast('Misi pertama: antar ke ' + state.mission.name + '!');
}

function toggleMode() {
  if (state.mode === 'foot') {
    const d = Math.hypot(player.position.x - car.position.x, player.position.z - car.position.z);
    if (d > 5) {
      toast('Mendekatlah ke mobil dulu!');
      return;
    }
    state.mode = 'car';
    player.visible = false;
    modeBtn.textContent = 'Get out (E)';
    window.__solmaris.mode = 'car';
  } else {
    state.mode = 'foot';
    const right = new THREE.Vector3(Math.cos(state.heading), 0, -Math.sin(state.heading));
    player.position.copy(car.position).addScaledVector(right, 2.4);
    player.position.y = 0;
    clampToWorld(player.position, 0.6, true);
    player.visible = true;
    modeBtn.textContent = 'Get in car (E)';
    window.__solmaris.mode = 'foot';
  }
}

function collectables(dt, t) {
  const pos = state.mode === 'car' ? car.position : player.position;
  for (let i = 0; i < world.coinState.length; i++) {
    const c = world.coinState[i];
    if (!c.active) continue;
    const d = Math.hypot(pos.x - c.x, pos.z - c.z);
    if (d < 2.1) {
      world.setCoin(i, c.x, c.z, false);
      state.money += 10;
      state.rushGot += 1;
      toast('Koin +$10');
      state.respawns.push({ type: 'coin', i, at: t + 5 });
      if (state.rushGot >= 5) {
        state.money += 100;
        state.rushGot = 0;
        state.rushTimer = 60;
        toast('Coin Rush selesai! Bonus +$100', 3400);
      }
    }
  }
  for (let i = 0; i < world.crateState.length; i++) {
    const c = world.crateState[i];
    if (!c.active) continue;
    const d = Math.hypot(pos.x - c.x, pos.z - c.z);
    if (d < 2.4) {
      world.setCrate(i, c.x, c.z, false);
      state.money += 25;
      toast('Peti +$25');
      state.respawns.push({ type: 'crate', i, at: t + 8 });
    }
  }
  state.respawns = state.respawns.filter((r) => {
    if (r.at > t) return true;
    const s = randomRoadSpot();
    if (r.type === 'coin') world.setCoin(r.i, s.x, s.z, true);
    else world.setCrate(r.i, s.x, s.z, true);
    return false;
  });
}

function updateFoot(dt) {
  const fwd = new THREE.Vector3(-Math.sin(state.camYaw), 0, -Math.cos(state.camYaw));
  const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
  const move = new THREE.Vector3();
  if (keys.has('up')) move.add(fwd);
  if (keys.has('down')) move.sub(fwd);
  if (keys.has('right')) move.add(right);
  if (keys.has('left')) move.sub(right);
  const moving = move.lengthSq() > 0;
  if (moving) {
    move.normalize();
    const speed = keys.has('run') ? 10 : 6;
    player.position.addScaledVector(move, speed * dt);
    player.rotation.y = Math.atan2(move.x, move.z);
    state.walkPhase += dt * (keys.has('run') ? 13 : 9);
    const sw = Math.sin(state.walkPhase);
    legL.rotation.x = sw * 0.55;
    legR.rotation.x = -sw * 0.55;
    armL.rotation.x = -sw * 0.45;
    armR.rotation.x = sw * 0.45;
    bodyMesh.position.y = 0.95 + Math.abs(Math.cos(state.walkPhase)) * 0.05;
  } else {
    legL.rotation.x = 0;
    legR.rotation.x = 0;
    armL.rotation.x = 0;
    armR.rotation.x = 0;
    bodyMesh.position.y = 0.95;
  }
  clampToWorld(player.position, 0.6, true);
  const onPier = player.position.x > 226 && Math.abs(player.position.z - 40) <= 1.8;
  const targetY = onPier ? 1.24 : 0;
  player.position.y += (targetY - player.position.y) * Math.min(1, dt * 10);
}

function updateCar(dt) {
  const up = keys.has('up');
  const down = keys.has('down');
  if (up) state.speed += 15 * dt;
  if (down) {
    if (state.speed > 0.5) state.speed -= 24 * dt;
    else state.speed -= 9 * dt;
  }
  if (!up && !down) state.speed -= state.speed * 0.7 * dt;
  state.speed = Math.max(-8, Math.min(26, state.speed));
  if (Math.abs(state.speed) < 0.05 && !up && !down) state.speed = 0;
  const steerInput = (keys.has('left') ? 1 : 0) - (keys.has('right') ? 1 : 0);
  state.steer += (steerInput - state.steer) * Math.min(1, dt * 8);
  state.heading += state.steer * dt * 1.5 * Math.min(Math.abs(state.speed) / 10, 1) * Math.sign(state.speed || 1);
  const fwd = new THREE.Vector3(Math.sin(state.heading), 0, Math.cos(state.heading));
  car.position.addScaledVector(fwd, state.speed * dt);
  car.rotation.y = state.heading;
  clampToWorld(car.position, 1.9, false);
  const spin = (state.speed * dt) / 0.42;
  for (const w of wheels) w.rotation.x += spin;
  const frontSteer = state.steer * 0.38;
  for (const g of steerGroups) g.rotation.y = frontSteer;
}

function updateCamera(dt) {
  const target = state.mode === 'car' ? car.position : player.position;
  if (!state.running) {
    state.idleYaw += dt * 0.045;
    state.camTarget.lerp(new THREE.Vector3(10, 6, 0), 1 - Math.exp(-2 * dt));
    const d = 130;
    const p = 0.42;
    camera.position.set(
      state.camTarget.x + Math.sin(state.idleYaw) * Math.cos(p) * d,
      state.camTarget.y + Math.sin(p) * d,
      state.camTarget.z + Math.cos(state.idleYaw) * Math.cos(p) * d,
    );
    camera.lookAt(state.camTarget);
    return;
  }
  const goal = new THREE.Vector3(target.x, target.y + 2, target.z);
  state.camTarget.lerp(goal, 1 - Math.exp(-9 * dt));
  const cp = state.camPitch;
  const cd = state.camDist;
  camera.position.set(
    state.camTarget.x + Math.sin(state.camYaw) * Math.cos(cp) * cd,
    state.camTarget.y + Math.sin(cp) * cd,
    state.camTarget.z + Math.cos(state.camYaw) * Math.cos(cp) * cd,
  );
  camera.lookAt(state.camTarget);
}

function fmtTime(s) {
  const v = Math.max(0, Math.ceil(s));
  return Math.floor(v / 60) + ':' + String(v % 60).padStart(2, '0');
}

function updateHUD() {
  moneyEl.textContent = '$' + state.money;
  window.__solmaris.money = state.money;
  if (!state.running) {
    objectiveEl.innerHTML = 'Objective: <b>press Start</b>';
    timerEl.textContent = '';
    challengeEl.textContent = '';
    speedEl.textContent = '';
    return;
  }
  objectiveEl.innerHTML = 'Objective: antar ke <b>' + state.mission.name + '</b>';
  timerEl.textContent = 'Waktu misi: ' + fmtTime(state.missionTimer);
  timerEl.style.color = state.missionTimer < 15 ? '#ff5d5d' : '#ff9d7a';
  challengeEl.textContent = 'Coin Rush: ' + state.rushGot + '/5 koin — ' + fmtTime(state.rushTimer);
  if (state.mode === 'car') {
    speedEl.textContent = Math.round(Math.abs(state.speed) * 3.6) + ' km/h · mengemudi';
  } else {
    speedEl.textContent = 'Jalan kaki';
  }
}

function drawMinimap(t) {
  const W = 180;
  const mm = world.minimap;
  const toPx = (x) => ((x + mm.bounds) / (mm.bounds * 2)) * W;
  const toPw = (w) => (w / (mm.bounds * 2)) * W;
  mapCtx.fillStyle = '#1d2733';
  mapCtx.fillRect(0, 0, W, W);
  mapCtx.fillStyle = '#155e7d';
  mapCtx.fillRect(toPx(mm.seaX), 0, W - toPx(mm.seaX), W);
  mapCtx.fillStyle = '#8a6a44';
  mapCtx.fillRect(toPx(mm.beachX), 0, toPx(mm.seaX) - toPx(mm.beachX), W);
  mapCtx.fillStyle = '#3f6b4a';
  for (const p of mm.parks) {
    mapCtx.fillRect(toPx(p.x - p.w / 2), toPx(p.z - p.d / 2), toPw(p.w), toPw(p.d));
  }
  mapCtx.strokeStyle = '#4a4f5a';
  mapCtx.lineWidth = 3;
  for (const r of mm.roads) {
    mapCtx.beginPath();
    mapCtx.moveTo(toPx(r), 0);
    mapCtx.lineTo(toPx(r), W);
    mapCtx.stroke();
    mapCtx.beginPath();
    mapCtx.moveTo(0, toPx(r));
    mapCtx.lineTo(W, toPx(r));
    mapCtx.stroke();
  }
  mapCtx.fillStyle = '#9a8fa0';
  for (const b of mm.buildings) {
    mapCtx.fillRect(toPx(b.x - b.w / 2), toPx(b.z - b.d / 2), toPw(b.w), toPw(b.d));
  }
  mapCtx.fillStyle = '#8a6a44';
  mapCtx.fillRect(toPx(232), toPx(38), toPw(62), toPw(4));
  for (let i = 0; i < world.crateState.length; i++) {
    const c = world.crateState[i];
    if (!c.active) continue;
    mapCtx.fillStyle = '#c98a3f';
    mapCtx.fillRect(toPx(c.x) - 2, toPx(c.z) - 2, 4, 4);
  }
  for (let i = 0; i < world.coinState.length; i++) {
    const c = world.coinState[i];
    if (!c.active) continue;
    mapCtx.fillStyle = '#ffd34d';
    mapCtx.beginPath();
    mapCtx.arc(toPx(c.x), toPx(c.z), 2, 0, Math.PI * 2);
    mapCtx.fill();
  }
  if (state.mission) {
    const mx = toPx(state.mission.x);
    const my = toPx(state.mission.z);
    const pulse = 4 + Math.sin(t * 4) * 1.5;
    mapCtx.strokeStyle = '#ffd34d';
    mapCtx.lineWidth = 2;
    mapCtx.beginPath();
    mapCtx.arc(mx, my, pulse + 3, 0, Math.PI * 2);
    mapCtx.stroke();
    mapCtx.fillStyle = '#ffd34d';
    mapCtx.beginPath();
    mapCtx.arc(mx, my, 3.5, 0, Math.PI * 2);
    mapCtx.fill();
  }
  const px = toPx(car.position.x);
  const pz = toPx(car.position.z);
  mapCtx.fillStyle = '#37c8ff';
  mapCtx.beginPath();
  mapCtx.arc(px, pz, 3.5, 0, Math.PI * 2);
  mapCtx.fill();
  if (state.mode === 'foot') {
    mapCtx.fillStyle = '#ffffff';
    mapCtx.beginPath();
    mapCtx.arc(toPx(player.position.x), toPx(player.position.z), 3.5, 0, Math.PI * 2);
    mapCtx.fill();
  }
}

function updateMissions(dt) {
  state.missionTimer -= dt;
  state.rushTimer -= dt;
  if (state.rushTimer <= 0) {
    state.rushGot = 0;
    state.rushTimer = 60;
    toast('Coin Rush habis — mulai lagi!');
  }
  const pos = state.mode === 'car' ? car.position : player.position;
  const d = Math.hypot(pos.x - state.mission.x, pos.z - state.mission.z);
  if (d < 5) {
    state.money += 120;
    toast('Pesanan diantar! +$120', 3000);
    const prev = spots.indexOf(state.mission);
    pickMission(prev);
    return;
  }
  if (state.missionTimer <= 0) {
    toast('Waktu habis — misi baru!');
    const prev = spots.indexOf(state.mission);
    pickMission(prev);
  }
}

if (shot === 'play') {
  state.mode = 'car';
  player.visible = false;
  car.position.set(0, 0, 60);
  car.rotation.y = Math.PI;
  state.heading = Math.PI;
  state.camYaw = 0;
  state.camPitch = 0.32;
  state.camDist = 13;
  startGame();
  state.mission = spots.find((s) => s.name === 'Kantor Pos');
  state.missionTimer = 90;
  world.setMarker(state.mission.x, state.mission.z);
  modeBtn.textContent = 'Get out (E)';
  window.__solmaris.mode = 'car';
} else if (shot === 'city') {
  document.body.classList.add('cinematic');
  state.camYaw = -1.27;
  state.camPitch = 0.5;
  state.camDist = 150;
  state.camTarget.set(60, 8, 0);
  startGame();
  state.mission = spots.find((s) => s.name === 'Dermaga Solmaris');
  state.missionTimer = 90;
  world.setMarker(state.mission.x, state.mission.z);
  state.running = true;
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();
let elapsed = 0;
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt;
  if (state.running) {
    if (state.mode === 'car') updateCar(dt);
    else updateFoot(dt);
    collectables(dt, elapsed);
    updateMissions(dt);
  }
  world.update(dt, elapsed);
  updateCamera(dt);
  updateHUD();
  drawMinimap(elapsed);
  renderer.render(scene, camera);
  window.__solmaris.frames += 1;
  if (window.__solmaris.frames === 2) window.__solmaris.ready = true;
}
loop();
