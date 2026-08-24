// environment.js — builds the ground plane, scenery props, and the car mesh
import * as THREE from 'three';

export function buildGround(scene) {
  const size = 4000;

  // Base ground (asphalt-ish open field)
  const groundTex = makeCheckerTexture('#2b3d2c', '#28392a', 60, size);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshStandardMaterial({ map: groundTex, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // A long looping asphalt strip so there's something to actually drive on
  const road = buildOvalRoad();
  scene.add(road);

  return road;
}

function makeCheckerTexture(colorA, colorB, cell, worldSize) {
  const res = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = res;
  const ctx = canvas.getContext('2d');
  const cellsPerSide = 16;
  const cellPx = res / cellsPerSide;
  for (let y = 0; y < cellsPerSide; y++) {
    for (let x = 0; x < cellsPerSide; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? colorA : colorB;
      ctx.fillRect(x * cellPx, y * cellPx, cellPx, cellPx);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  const repeats = worldSize / (cell * cellsPerSide);
  tex.repeat.set(repeats, repeats);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildOvalRoad() {
  const group = new THREE.Group();
  const rx = 140, rz = 90, width = 14, segments = 128;

  const shape = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    shape.push(new THREE.Vector2(Math.sin(a) * rx, Math.cos(a) * rz));
  }

  const positions = [];
  const uvs = [];
  for (let i = 0; i < shape.length - 1; i++) {
    const p0 = shape[i], p1 = shape[i + 1];
    const dir = new THREE.Vector2(p1.x - p0.x, p1.y - p0.y).normalize();
    const normal = new THREE.Vector2(-dir.y, dir.x).multiplyScalar(width / 2);

    const a = [p0.x - normal.x, p0.y - normal.y];
    const b = [p0.x + normal.x, p0.y + normal.y];
    const c = [p1.x - normal.x, p1.y - normal.y];
    const d = [p1.x + normal.x, p1.y + normal.y];

    positions.push(a[0], 0, a[1], b[0], 0, b[1], c[0], 0, c[1]);
    positions.push(b[0], 0, b[1], d[0], 0, d[1], c[0], 0, c[1]);
    uvs.push(0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.computeVertexNormals();

  const asphaltTex = makeStripeTexture();
  const mat = new THREE.MeshStandardMaterial({ map: asphaltTex, roughness: 0.9 });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.y = 0.02;
  mesh.receiveShadow = true;
  group.add(mesh);
  return group;
}

function makeStripeTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#2a2a2e';
  ctx.fillRect(0, 0, 64, 512);
  ctx.fillStyle = '#e8c94a';
  ctx.fillRect(28, 0, 8, 200);
  ctx.fillRect(28, 280, 8, 232);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 40);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function scatterProps(scene) {
  const group = new THREE.Group();
  const coneGeo = new THREE.ConeGeometry(0.9, 2.4, 8);
  const coneMat = new THREE.MeshStandardMaterial({ color: '#3f6b46' });
  const trunkGeo = new THREE.CylinderGeometry(0.25, 0.3, 1.4, 6);
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#5a4632' });

  for (let i = 0; i < 140; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 210 + Math.random() * 900;
    const x = Math.sin(angle) * radius;
    const z = Math.cos(angle) * radius;

    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 0.7;
    trunk.castShadow = true;
    const top = new THREE.Mesh(coneGeo, coneMat);
    top.position.y = 2.1;
    top.castShadow = true;
    tree.add(trunk, top);
    tree.position.set(x, 0, z);
    const s = 0.7 + Math.random() * 0.9;
    tree.scale.set(s, s, s);
    group.add(tree);
  }
  scene.add(group);
}

export function buildCarMesh() {
  const car = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({ color: '#d1362f', metalness: 0.35, roughness: 0.35 });
  const glassMat = new THREE.MeshStandardMaterial({ color: '#1b2430', metalness: 0.2, roughness: 0.1 });
  const wheelMat = new THREE.MeshStandardMaterial({ color: '#171717', roughness: 0.7 });
  const rimMat = new THREE.MeshStandardMaterial({ color: '#c9c9c9', metalness: 0.8, roughness: 0.3 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.55, 4.2), bodyMat);
  body.position.y = 0.62;
  body.castShadow = true;
  car.add(body);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 2.1), glassMat);
  cabin.position.set(0, 1.0, -0.15);
  cabin.castShadow = true;
  car.add(cabin);

  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.4, 0.6), bodyMat);
  nose.position.set(0, 0.55, 1.95);
  car.add(nose);

  function makeWheel() {
    const wheel = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.28, 16), wheelMat);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.3, 12), rimMat);
    rim.rotation.z = Math.PI / 2;
    wheel.add(tire, rim);
    return wheel;
  }

  const wheelOffsets = [
    { name: 'fl', x: -1.0, z: 1.35, steer: true },
    { name: 'fr', x: 1.0, z: 1.35, steer: true },
    { name: 'rl', x: -1.0, z: -1.35, steer: false },
    { name: 'rr', x: 1.0, z: -1.35, steer: false },
  ];

  const wheels = {};
  for (const w of wheelOffsets) {
    const pivot = new THREE.Group(); // steers
    pivot.position.set(w.x, 0.34, w.z);
    const spin = new THREE.Group(); // spins
    const mesh = makeWheel();
    spin.add(mesh);
    pivot.add(spin);
    car.add(pivot);
    wheels[w.name] = { pivot, spin, steer: w.steer };
  }

  // Simple tail lights for reverse feedback
  const tailGeo = new THREE.BoxGeometry(0.18, 0.12, 0.05);
  const tailMat = new THREE.MeshStandardMaterial({ color: '#550000', emissive: '#ff2222', emissiveIntensity: 0 });
  const tailL = new THREE.Mesh(tailGeo, tailMat.clone());
  tailL.position.set(-0.7, 0.65, -2.08);
  const tailR = new THREE.Mesh(tailGeo, tailMat.clone());
  tailR.position.set(0.7, 0.65, -2.08);
  car.add(tailL, tailR);

  car.userData.wheels = wheels;
  car.userData.tailLights = [tailL, tailR];
  return car;
}
