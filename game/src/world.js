import * as THREE from 'three';

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ROADS = [-150, -100, -50, 0, 50, 100, 150];
const BLOCK_CENTERS = [-125, -75, -25, 25, 75, 125];
const CITY_EDGE = 170;
const BEACH_X = 170;
const SEA_X = 232;
const GROUND_HALF = 240;

function groundTexture(rand) {
  const S = 2048;
  const cv = document.createElement('canvas');
  cv.width = S;
  cv.height = S;
  const g = cv.getContext('2d');
  const px = (x) => ((x + GROUND_HALF) / (GROUND_HALF * 2)) * S;
  const pw = (w) => (w / (GROUND_HALF * 2)) * S;

  g.fillStyle = '#453f52';
  g.fillRect(0, 0, S, S);

  for (let i = 0; i < 900; i++) {
    const x = rand() * S;
    const z = rand() * S;
    g.fillStyle = rand() < 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.04)';
    g.fillRect(x, z, 6 + rand() * 22, 6 + rand() * 22);
  }

  const sand = g.createLinearGradient(px(BEACH_X), 0, px(SEA_X + 8), 0);
  sand.addColorStop(0, '#d9a05f');
  sand.addColorStop(0.75, '#e6bd7f');
  sand.addColorStop(1, '#c98f52');
  g.fillStyle = sand;
  g.fillRect(px(BEACH_X), 0, px(SEA_X + 8) - px(BEACH_X), S);

  for (const [bx, bz] of [[25, 25], [-75, 75]]) {
    g.fillStyle = '#3f6b4a';
    g.fillRect(px(bx - 22), px(bz - 22), pw(44), pw(44));
    g.fillStyle = '#57744f';
    g.fillRect(px(bx - 8), px(bz - 22), pw(16), pw(44));
    g.fillRect(px(bx - 22), px(bz - 8), pw(44), pw(16));
  }

  for (const r of ROADS) {
    g.fillStyle = '#5a5468';
    g.fillRect(px(r - 7.5), 0, pw(15), S);
    g.fillRect(0, px(r - 7.5), S, pw(15));
  }
  for (const r of ROADS) {
    g.fillStyle = '#26222e';
    g.fillRect(px(r - 5), 0, pw(10), S);
    g.fillRect(0, px(r - 5), S, pw(10));
  }

  g.fillStyle = '#e8c25a';
  for (const r of ROADS) {
    for (let d = -GROUND_HALF + 8; d < GROUND_HALF - 8; d += 14) {
      if (Math.abs(d - Math.round(d / 50) * 50) < 8) continue;
      g.fillRect(px(r - 0.4), px(d), pw(0.8), pw(6));
      g.fillRect(px(d), px(r - 0.4), pw(6), pw(0.8));
    }
  }

  g.fillStyle = 'rgba(255,255,255,0.85)';
  for (const rx of ROADS) {
    for (const rz of ROADS) {
      for (let k = -2; k <= 2; k++) {
        g.fillRect(px(rx - 4.6 + k * 1.9), px(rz - 8.6), pw(0.9), pw(3.2));
        g.fillRect(px(rx - 4.6 + k * 1.9), px(rz + 5.4), pw(0.9), pw(3.2));
        g.fillRect(px(rx - 8.6), px(rz - 4.6 + k * 1.9), pw(3.2), pw(0.9));
        g.fillRect(px(rx + 5.4), px(rz - 4.6 + k * 1.9), pw(3.2), pw(0.9));
      }
    }
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function facadeTexture(rand) {
  const cv = document.createElement('canvas');
  cv.width = 128;
  cv.height = 256;
  const g = cv.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#2c2436');
  grad.addColorStop(1, '#3d3040');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 256);
  const lit = ['#ffd28a', '#ffb36b', '#ffe9b0', '#9be7ff'];
  for (let row = 0; row < 14; row++) {
    for (let col = 0; col < 6; col++) {
      const x = 8 + col * 20;
      const y = 10 + row * 17;
      if (rand() < 0.42) {
        g.fillStyle = lit[Math.floor(rand() * lit.length)];
        g.fillRect(x, y, 12, 11);
      } else {
        g.fillStyle = '#17121f';
        g.fillRect(x, y, 12, 11);
      }
    }
  }
  g.fillStyle = 'rgba(0,0,0,0.35)';
  g.fillRect(0, 232, 128, 24);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildWorld(scene) {
  const rand = mulberry32(20261118);
  const colliders = [];
  const minimapBuildings = [];
  const parks = [];

  scene.background = new THREE.Color(0xef8a52);
  scene.fog = new THREE.Fog(0xe8825a, 170, 620);

  const hemi = new THREE.HemisphereLight(0xffb38a, 0x3a2f45, 1.0);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffb37a, 2.4);
  sun.position.set(320, 130, -90);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -230;
  sun.shadow.camera.right = 230;
  sun.shadow.camera.top = 230;
  sun.shadow.camera.bottom = -230;
  sun.shadow.camera.near = 20;
  sun.shadow.camera.far = 800;
  sun.shadow.bias = -0.0006;
  scene.add(sun);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(GROUND_HALF * 2, GROUND_HALF * 2),
    new THREE.MeshLambertMaterial({ map: groundTexture(rand) }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const seaGeo = new THREE.PlaneGeometry(520, 780, 48, 48);
  seaGeo.rotateX(-Math.PI / 2);
  const seaBase = seaGeo.attributes.position.array.slice();
  const sea = new THREE.Mesh(
    seaGeo,
    new THREE.MeshPhongMaterial({
      color: 0x16607f,
      specular: 0xff8c42,
      shininess: 140,
    }),
  );
  sea.position.set(SEA_X + 258, -0.5, 0);
  scene.add(sea);

  const sunDisc = new THREE.Mesh(
    new THREE.CircleGeometry(30, 40),
    new THREE.MeshBasicMaterial({ color: 0xffe08a, fog: false }),
  );
  sunDisc.position.set(470, 62, -60);
  sunDisc.rotation.y = -Math.PI / 2;
  scene.add(sunDisc);
  const sunGlow = new THREE.Mesh(
    new THREE.CircleGeometry(62, 40),
    new THREE.MeshBasicMaterial({
      color: 0xff9e57, transparent: true, opacity: 0.28,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    }),
  );
  sunGlow.position.set(472, 62, -60);
  sunGlow.rotation.y = -Math.PI / 2;
  scene.add(sunGlow);

  const facadeTex = facadeTexture(rand);
  const palette = [0xd8a0a8, 0xc9b8a3, 0xa8b8c9, 0xd9c08a, 0xb89ad1, 0xe8b4a0, 0x9ab8a8, 0xc9a0b8];
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  boxGeo.translate(0, 0.5, 0);

  const buildings = [];
  for (const bx of BLOCK_CENTERS) {
    for (const bz of BLOCK_CENTERS) {
      if ((bx === 25 && bz === 25) || (bx === -75 && bz === 75)) {
        parks.push({ x: bx, z: bz, w: 44, d: 44 });
        continue;
      }
      const count = rand() < 0.32 ? 2 : 1;
      for (let k = 0; k < count; k++) {
        const w = 13 + rand() * 12;
        const d = 13 + rand() * 12;
        const distC = Math.hypot(bx, bz);
        const h = (11 + rand() * 34) * (1.25 - distC / 420);
        let x = bx;
        let z = bz;
        if (count === 2) {
          if (rand() < 0.5) { x += k === 0 ? -11 : 11; } else { z += k === 0 ? -11 : 11; }
        }
        x += (rand() - 0.5) * 4;
        z += (rand() - 0.5) * 4;
        buildings.push({ x, z, w, d, h });
        colliders.push({ minX: x - w / 2 - 0.4, maxX: x + w / 2 + 0.4, minZ: z - d / 2 - 0.4, maxZ: z + d / 2 + 0.4 });
        minimapBuildings.push({ x, z, w, d });
      }
    }
  }

  const buildingMesh = new THREE.InstancedMesh(
    boxGeo,
    new THREE.MeshLambertMaterial({
      map: facadeTex, emissiveMap: facadeTex,
      emissive: 0xff9a4d, emissiveIntensity: 0.45,
    }),
    buildings.length,
  );
  const m4 = new THREE.Matrix4();
  const q0 = new THREE.Quaternion();
  const v3 = new THREE.Vector3();
  const s3 = new THREE.Vector3();
  const col = new THREE.Color();
  buildings.forEach((b, i) => {
    m4.compose(
      v3.set(b.x, 0, b.z), q0,
      s3.set(b.w, b.h, b.d),
    );
    buildingMesh.setMatrixAt(i, m4);
    buildingMesh.setColorAt(i, col.setHex(palette[Math.floor(rand() * palette.length)]));
  });
  buildingMesh.castShadow = true;
  buildingMesh.receiveShadow = true;
  scene.add(buildingMesh);

  const winGeo = new THREE.PlaneGeometry(1.5, 2.0);
  const winMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const winTransforms = [];
  const qx = new THREE.Quaternion();
  const qy = new THREE.Quaternion();
  const eul = new THREE.Euler();
  for (const b of buildings) {
    const rows = Math.max(2, Math.floor(b.h / 3.8));
    const colsF = Math.max(2, Math.floor(b.w / 3.4));
    const colsS = Math.max(2, Math.floor(b.d / 3.4));
    const faces = [
      { n: [0, 0, 1], u: [1, 0, 0], off: b.d / 2 + 0.06, cols: colsF, w: b.w },
      { n: [0, 0, -1], u: [1, 0, 0], off: -b.d / 2 - 0.06, cols: colsF, w: b.w },
      { n: [1, 0, 0], u: [0, 0, 1], off: b.w / 2 + 0.06, cols: colsS, w: b.d },
      { n: [-1, 0, 0], u: [0, 0, 1], off: -b.w / 2 - 0.06, cols: colsS, w: b.d },
    ];
    for (const f of faces) {
      eul.set(0, Math.atan2(f.n[0], f.n[2]), 0);
      qy.setFromEuler(eul);
      for (let r = 0; r < rows; r++) {
        const y = 3.2 + r * 3.8;
        if (y > b.h - 1.6) break;
        for (let c = 0; c < f.cols; c++) {
          if (rand() < 0.18) continue;
          const along = -f.w / 2 + 2.2 + c * ((f.w - 4.4) / Math.max(1, f.cols - 1));
          const pxw = b.x + f.n[0] * f.off + f.u[0] * along;
          const pzw = b.z + f.n[2] * f.off + f.u[2] * along;
          winTransforms.push({
            p: [pxw, y, pzw], q: qy.clone(),
            lit: rand() < 0.55,
            tint: rand(),
          });
        }
      }
    }
  }
  const winMesh = new THREE.InstancedMesh(winGeo, winMat, winTransforms.length);
  winTransforms.forEach((w, i) => {
    m4.compose(v3.set(w.p[0], w.p[1], w.p[2]), w.q, s3.set(1, 1, 1));
    winMesh.setMatrixAt(i, m4);
    if (w.lit) {
      col.setHSL(0.09 + w.tint * 0.04, 0.95, 0.62 + w.tint * 0.12);
    } else {
      col.setHex(0x1c2230);
    }
    winMesh.setColorAt(i, col);
  });
  scene.add(winMesh);

  const roofGeo = new THREE.BoxGeometry(1, 1, 1);
  roofGeo.translate(0, 0.5, 0);
  const roofMesh = new THREE.InstancedMesh(
    roofGeo, new THREE.MeshLambertMaterial({ color: 0x4a4450 }), buildings.length,
  );
  buildings.forEach((b, i) => {
    const rw = 2 + rand() * 3;
    m4.compose(
      v3.set(b.x + (rand() - 0.5) * (b.w - rw - 2), b.h, b.z + (rand() - 0.5) * (b.d - rw - 2)),
      q0, s3.set(rw, 0.9 + rand() * 0.9, rw),
    );
    roofMesh.setMatrixAt(i, m4);
  });
  scene.add(roofMesh);

  const palmSpots = [];
  for (let z = -200; z <= 200; z += 26) {
    palmSpots.push({ x: 178 + rand() * 18, z: z + (rand() - 0.5) * 10 });
  }
  for (let z = -160; z <= 160; z += 40) {
    palmSpots.push({ x: 9 + (rand() - 0.5) * 2, z });
    palmSpots.push({ x: -9 + (rand() - 0.5) * 2, z: z + 20 });
  }
  for (const p of parks) {
    for (let k = 0; k < 4; k++) {
      palmSpots.push({
        x: p.x + (rand() - 0.5) * 34,
        z: p.z + (rand() - 0.5) * 34,
      });
    }
  }
  const trunkGeo = new THREE.CylinderGeometry(0.2, 0.34, 7, 6);
  trunkGeo.translate(0, 3.5, 0);
  const trunkMesh = new THREE.InstancedMesh(
    trunkGeo, new THREE.MeshLambertMaterial({ color: 0x7a5a3c }), palmSpots.length,
  );
  const frondGeo = new THREE.ConeGeometry(2.7, 1.1, 7);
  frondGeo.translate(0, 7.1, 0);
  const frondMesh = new THREE.InstancedMesh(
    frondGeo, new THREE.MeshLambertMaterial({ color: 0x2e7d46 }), palmSpots.length,
  );
  const frond2Geo = new THREE.ConeGeometry(1.9, 0.9, 7);
  frond2Geo.translate(0, 7.9, 0);
  const frond2Mesh = new THREE.InstancedMesh(
    frond2Geo, new THREE.MeshLambertMaterial({ color: 0x35924f }), palmSpots.length,
  );
  palmSpots.forEach((p, i) => {
    eul.set((rand() - 0.5) * 0.16, rand() * Math.PI * 2, (rand() - 0.5) * 0.16);
    qx.setFromEuler(eul);
    m4.compose(v3.set(p.x, 0, p.z), qx, s3.set(1, 1, 1));
    trunkMesh.setMatrixAt(i, m4);
    frondMesh.setMatrixAt(i, m4);
    frond2Mesh.setMatrixAt(i, m4);
  });
  trunkMesh.castShadow = true;
  scene.add(trunkMesh);
  scene.add(frondMesh);
  scene.add(frond2Mesh);

  const lightSpots = [];
  for (const rx of ROADS) {
    for (const rz of ROADS) {
      if ((rx + rz) % 100 === 0 && Math.abs(rx) <= 150 && Math.abs(rz) <= 150) {
        lightSpots.push({ x: rx + 8, z: rz + 8 });
      }
    }
  }
  const poleGeo = new THREE.CylinderGeometry(0.09, 0.13, 5.6, 6);
  poleGeo.translate(0, 2.8, 0);
  const poleMesh = new THREE.InstancedMesh(
    poleGeo, new THREE.MeshLambertMaterial({ color: 0x2c2c34 }), lightSpots.length,
  );
  const lampGeo = new THREE.SphereGeometry(0.34, 8, 6);
  lampGeo.translate(0, 5.7, 0);
  const lampMesh = new THREE.InstancedMesh(
    lampGeo, new THREE.MeshBasicMaterial({ color: 0xffd9a0 }), lightSpots.length,
  );
  lightSpots.forEach((p, i) => {
    m4.compose(v3.set(p.x, 0, p.z), q0, s3.set(1, 1, 1));
    poleMesh.setMatrixAt(i, m4);
    lampMesh.setMatrixAt(i, m4);
  });
  scene.add(poleMesh);
  scene.add(lampMesh);

  const parked = [];
  const carPalette = [0xd94f4f, 0x4f7fd9, 0xe8d44f, 0x7fd94f, 0xd9d9d9, 0x8a5fd9];
  for (let i = 0; i < 10; i++) {
    const road = ROADS[Math.floor(rand() * ROADS.length)];
    const along = -140 + rand() * 280;
    const horiz = rand() < 0.5;
    parked.push({
      x: horiz ? along : road + (rand() < 0.5 ? 2.6 : -2.6),
      z: horiz ? road + (rand() < 0.5 ? 2.6 : -2.6) : along,
      rot: horiz ? (rand() < 0.5 ? 0 : Math.PI) : (rand() < 0.5 ? Math.PI / 2 : -Math.PI / 2),
      color: carPalette[Math.floor(rand() * carPalette.length)],
    });
  }
  const pBodyGeo = new THREE.BoxGeometry(1.9, 0.55, 4.1);
  pBodyGeo.translate(0, 0.55, 0);
  const pBodyMesh = new THREE.InstancedMesh(
    pBodyGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), parked.length,
  );
  const pCabGeo = new THREE.BoxGeometry(1.7, 0.55, 2.1);
  pCabGeo.translate(0, 1.05, -0.2);
  const pCabMesh = new THREE.InstancedMesh(
    pCabGeo, new THREE.MeshLambertMaterial({ color: 0x2a2f3a }), parked.length,
  );
  parked.forEach((c, i) => {
    eul.set(0, c.rot, 0);
    qx.setFromEuler(eul);
    m4.compose(v3.set(c.x, 0, c.z), qx, s3.set(1, 1, 1));
    pBodyMesh.setMatrixAt(i, m4);
    pCabMesh.setMatrixAt(i, m4);
    pBodyMesh.setColorAt(i, col.setHex(c.color));
  });
  pBodyMesh.castShadow = true;
  scene.add(pBodyMesh);
  scene.add(pCabMesh);

  const mountainGeo = new THREE.ConeGeometry(1, 1, 5);
  mountainGeo.translate(0, 0.5, 0);
  const mountainMesh = new THREE.InstancedMesh(
    mountainGeo, new THREE.MeshLambertMaterial({ color: 0x5b4360 }), 12,
  );
  for (let i = 0; i < 12; i++) {
    const ang = (55 + (i / 11) * 250) * Math.PI / 180;
    const r = 380 + rand() * 90;
    const w = 70 + rand() * 60;
    const h = 45 + rand() * 55;
    m4.compose(
      v3.set(Math.cos(ang) * r, -2, Math.sin(ang) * r), q0,
      s3.set(w, h, w),
    );
    mountainMesh.setMatrixAt(i, m4);
    mountainMesh.setColorAt(i, col.setHex([0x5b4360, 0x6e4a63, 0x4a3a58][i % 3]));
  }
  scene.add(mountainMesh);

  const cloudGeo = new THREE.CircleGeometry(1, 24);
  const cloudMesh = new THREE.InstancedMesh(
    cloudGeo,
    new THREE.MeshBasicMaterial({
      color: 0xffc2b0, transparent: true, opacity: 0.38,
      side: THREE.DoubleSide, depthWrite: false,
    }),
    6,
  );
  const clouds = [];
  for (let i = 0; i < 6; i++) {
    clouds.push({
      x: -320 + rand() * 560, y: 95 + rand() * 45, z: -280 + rand() * 420,
      sx: 26 + rand() * 16, sy: 7 + rand() * 4, speed: 1.2 + rand() * 1.6,
    });
  }
  scene.add(cloudMesh);

  const plankGeo = new THREE.BoxGeometry(1.7, 0.28, 3.6);
  const plankMesh = new THREE.InstancedMesh(
    plankGeo, new THREE.MeshLambertMaterial({ color: 0x8a6a44 }), 30,
  );
  for (let i = 0; i < 30; i++) {
    m4.compose(v3.set(SEA_X + 4 + i * 2, 1.1, 40), q0, s3.set(1, 1, 1));
    plankMesh.setMatrixAt(i, m4);
  }
  plankMesh.castShadow = true;
  scene.add(plankMesh);
  const postGeo = new THREE.CylinderGeometry(0.22, 0.22, 2.6, 6);
  postGeo.translate(0, 0.4, 0);
  const postMesh = new THREE.InstancedMesh(
    postGeo, new THREE.MeshLambertMaterial({ color: 0x6b4e30 }), 12,
  );
  let pi = 0;
  for (let i = 0; i < 6; i++) {
    for (const dz of [-1.7, 1.7]) {
      m4.compose(v3.set(SEA_X + 4 + i * 10, 0, 40 + dz), q0, s3.set(1, 1, 1));
      postMesh.setMatrixAt(pi++, m4);
    }
  }
  scene.add(postMesh);
  const hut = new THREE.Group();
  const hutBase = new THREE.Mesh(
    new THREE.BoxGeometry(7, 3.4, 6),
    new THREE.MeshLambertMaterial({ color: 0xd9b48a }),
  );
  hutBase.position.y = 2.9;
  hutBase.castShadow = true;
  hut.add(hutBase);
  const hutRoof = new THREE.Mesh(
    new THREE.ConeGeometry(5.2, 2.6, 4),
    new THREE.MeshLambertMaterial({ color: 0x8a4a3c }),
  );
  hutRoof.position.y = 5.9;
  hutRoof.rotation.y = Math.PI / 4;
  hut.add(hutRoof);
  hut.position.set(SEA_X + 56, 0, 40);
  scene.add(hut);
  colliders.push({ minX: SEA_X + 52, maxX: SEA_X + 60, minZ: 36.5, maxZ: 43.5 });

  const fountain = new THREE.Group();
  const basin = new THREE.Mesh(
    new THREE.CylinderGeometry(5, 5.4, 1.1, 20),
    new THREE.MeshLambertMaterial({ color: 0x9a94a8 }),
  );
  basin.position.y = 0.55;
  basin.castShadow = true;
  fountain.add(basin);
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(4.6, 20),
    new THREE.MeshPhongMaterial({ color: 0x3f9ec9, shininess: 160 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = 1.05;
  fountain.add(water);
  const column = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.7, 2.6, 8),
    new THREE.MeshLambertMaterial({ color: 0xcfc8da }),
  );
  column.position.y = 2.2;
  fountain.add(column);
  fountain.position.set(25, 0, 25);
  scene.add(fountain);
  colliders.push({ minX: 19.4, maxX: 30.6, minZ: 19.4, maxZ: 30.6 });

  const coinSpots = [];
  for (let i = 0; i < 24; i++) {
    const road = ROADS[Math.floor(rand() * ROADS.length)];
    const along = -150 + rand() * 300;
    if (rand() < 0.5) {
      coinSpots.push({ x: road + (rand() - 0.5) * 7, z: along });
    } else {
      coinSpots.push({ x: along, z: road + (rand() - 0.5) * 7 });
    }
  }
  const coinGeo = new THREE.TorusGeometry(0.55, 0.2, 8, 18);
  const coinMesh = new THREE.InstancedMesh(
    coinGeo,
    new THREE.MeshLambertMaterial({ color: 0xffc93c, emissive: 0xa86f00, emissiveIntensity: 0.7 }),
    coinSpots.length,
  );
  scene.add(coinMesh);
  const coinState = coinSpots.map((c) => ({ x: c.x, z: c.z, active: true }));

  const crateSpots = [];
  for (let i = 0; i < 6; i++) {
    const road = ROADS[Math.floor(rand() * ROADS.length)];
    const along = -140 + rand() * 280;
    crateSpots.push({ x: road + (rand() < 0.5 ? 6.5 : -6.5), z: along });
  }
  const crateGeo = new THREE.BoxGeometry(1.3, 1.3, 1.3);
  const crateMesh = new THREE.InstancedMesh(
    crateGeo, new THREE.MeshLambertMaterial({ color: 0xa9743f }), crateSpots.length,
  );
  scene.add(crateMesh);
  const crateState = crateSpots.map((c) => ({ x: c.x, z: c.z, active: true, rot: rand() * Math.PI }));

  const marker = new THREE.Group();
  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(2.4, 2.4, 34, 20, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xffd34d, transparent: true, opacity: 0.26,
      side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
    }),
  );
  beacon.position.y = 17;
  marker.add(beacon);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(2.2, 3.1, 32),
    new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.12;
  marker.add(ring);
  const diamond = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.85),
    new THREE.MeshBasicMaterial({ color: 0xffe9a0 }),
  );
  diamond.position.y = 4.2;
  marker.add(diamond);
  scene.add(marker);

  const missionSpots = [
    { name: 'Dermaga Solmaris', x: SEA_X + 50, z: 40 },
    { name: 'Plaza Merdeka', x: 25, z: 12 },
    { name: 'Menara Marina', x: 125, z: -125 },
    { name: 'Kafe Ombak', x: 165, z: 100 },
    { name: 'Pasar Ikan', x: 150, z: -75 },
    { name: 'Hotel Aurora', x: -125, z: 125 },
    { name: 'Stasiun Solmaris', x: -150, z: 25 },
    { name: 'Taman Palem', x: -75, z: 62 },
    { name: 'Kantor Pos', x: -25, z: -125 },
    { name: 'Pantai Timur', x: 200, z: -120 },
  ];

  const zeroScale = new THREE.Matrix4().makeScale(0, 0, 0);

  function setCoin(i, x, z, active) {
    coinState[i] = { x, z, active };
  }
  function setCrate(i, x, z, active) {
    crateState[i] = { x, z, active, rot: crateState[i] ? crateState[i].rot : rand() * Math.PI };
  }
  function setMarker(x, z) {
    marker.position.set(x, 0, z);
  }

  function update(dt, t) {
    const pos = seaGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const bx = seaBase[i * 3];
      const bz = seaBase[i * 3 + 2];
      pos.setZ(i, 0.5 * Math.sin(bx * 0.06 + t * 1.2) + 0.4 * Math.sin(bz * 0.07 + t * 0.8));
    }
    pos.needsUpdate = true;
    seaGeo.computeVertexNormals();

    for (let i = 0; i < coinState.length; i++) {
      const c = coinState[i];
      if (!c.active) {
        coinMesh.setMatrixAt(i, zeroScale);
        continue;
      }
      eul.set(0, t * 2 + i * 0.7, 0);
      qx.setFromEuler(eul);
      m4.compose(
        v3.set(c.x, 1.15 + Math.sin(t * 2 + i) * 0.15, c.z), qx, s3.set(1, 1, 1),
      );
      coinMesh.setMatrixAt(i, m4);
    }
    coinMesh.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < crateState.length; i++) {
      const c = crateState[i];
      if (!c.active) {
        crateMesh.setMatrixAt(i, zeroScale);
        continue;
      }
      eul.set(0, c.rot, 0);
      qx.setFromEuler(eul);
      m4.compose(v3.set(c.x, 0.65, c.z), qx, s3.set(1, 1, 1));
      crateMesh.setMatrixAt(i, m4);
    }
    crateMesh.instanceMatrix.needsUpdate = true;

    beacon.material.opacity = 0.2 + 0.1 * Math.sin(t * 3);
    const rs = 1 + 0.12 * Math.sin(t * 3);
    ring.scale.set(rs, rs, 1);
    ring.rotation.z = t * 0.4;
    diamond.position.y = 4.2 + Math.sin(t * 2.2) * 0.5;
    diamond.rotation.y = t * 1.5;

    for (let i = 0; i < clouds.length; i++) {
      const c = clouds[i];
      c.x += c.speed * dt;
      if (c.x > 360) c.x = -360;
      m4.compose(v3.set(c.x, c.y, c.z), q0, s3.set(c.sx, c.sy, 1));
      cloudMesh.setMatrixAt(i, m4);
    }
    cloudMesh.instanceMatrix.needsUpdate = true;
  }

  return {
    colliders,
    coinSpots,
    crateSpots,
    missionSpots,
    minimap: { buildings: minimapBuildings, roads: ROADS, parks, beachX: BEACH_X, seaX: SEA_X, bounds: GROUND_HALF },
    coinState,
    crateState,
    setCoin,
    setCrate,
    setMarker,
    update,
    bounds: { min: -GROUND_HALF + 4, max: GROUND_HALF - 4, seaX: 226 },
  };
}
