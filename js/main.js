import * as THREE from 'three';
import { Car } from './car.js';
import { Controls } from './controls.js';
import { buildGround, scatterProps, buildCarMesh } from './environment.js';
import { EngineAudio } from './audio.js';

function showFatalError(err) {
  console.error(err);
  let banner = document.getElementById('fatal-error');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'fatal-error';
    banner.style.cssText =
      'position:fixed;inset:0;z-index:9999;background:#1a0000;color:#ff8a8a;' +
      'font-family:monospace;font-size:13px;padding:24px;white-space:pre-wrap;' +
      'overflow:auto;';
    document.body.appendChild(banner);
  }
  banner.textContent =
    'Something went wrong starting the simulator:\n\n' +
    (err && err.stack ? err.stack : String(err)) +
    '\n\nOpen your browser\'s DevTools console for more detail.';
}

try {
  init();
} catch (err) {
  showFatalError(err);
}

function init() {

// ---------- Renderer / Scene / Camera ----------
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#8fc7e8');
scene.fog = new THREE.Fog('#8fc7e8', 220, 1400);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 3000);

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// ---------- Lighting ----------
const hemi = new THREE.HemisphereLight('#bcdcff', '#3a4a2f', 0.9);
scene.add(hemi);

const sun = new THREE.DirectionalLight('#fff3d6', 1.4);
sun.position.set(180, 260, 120);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -260;
sun.shadow.camera.right = 260;
sun.shadow.camera.top = 260;
sun.shadow.camera.bottom = -260;
sun.shadow.camera.far = 700;
scene.add(sun);

// ---------- World ----------
buildGround(scene);
scatterProps(scene);

// ---------- Car ----------
const car = new Car();
const carMesh = buildCarMesh();
scene.add(carMesh);

// ---------- HUD ----------
const speedEl = document.getElementById('speed-value');
const gearEl = document.getElementById('gear-value');
const rpmFill = document.getElementById('rpm-fill');
const rpmRedlineFlag = document.getElementById('rpm-warning');
const shiftFlash = document.getElementById('shift-flash');

const GEAR_LABELS = { R: 'R', N: 'N', 1: '1', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6' };

// ---------- Controls + audio ----------
const engineAudio = new EngineAudio();
let audioArmed = false;
function armAudioOnce() {
  if (!audioArmed) {
    audioArmed = true;
    engineAudio.start();
  }
  window.removeEventListener('keydown', armAudioOnce);
}
window.addEventListener('keydown', armAudioOnce);

const controls = new Controls(car, (gear, ok) => {
  if (!ok) {
    shiftFlash.classList.add('shift-flash--active');
    setTimeout(() => shiftFlash.classList.remove('shift-flash--active'), 350);
  }
});

// ---------- Camera chase rig ----------
const chaseOffset = new THREE.Vector3(0, 4.2, -8.5);
const camTarget = new THREE.Vector3();
const camPos = new THREE.Vector3(0, 5, -10);

function updateCamera(dt) {
  const heading = carMesh.rotation.y;
  const rotatedOffset = chaseOffset.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), heading);
  const desired = new THREE.Vector3(
    carMesh.position.x + rotatedOffset.x,
    carMesh.position.y + rotatedOffset.y,
    carMesh.position.z + rotatedOffset.z
  );
  const lerpFactor = 1 - Math.pow(0.0015, dt);
  camPos.lerp(desired, lerpFactor);
  camera.position.copy(camPos);

  camTarget.lerp(
    new THREE.Vector3(carMesh.position.x, carMesh.position.y + 1.1, carMesh.position.z),
    1 - Math.pow(0.001, dt)
  );
  camera.lookAt(camTarget);
}

// ---------- Main loop ----------
let last = performance.now();
function step() {
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  const input = controls.readInput();
  car.update(dt, input);

  // sync mesh to physics state
  carMesh.position.set(car.position.x, 0, car.position.z);
  carMesh.rotation.y = car.heading;

  const wheels = carMesh.userData.wheels;
  for (const key of Object.keys(wheels)) {
    const w = wheels[key];
    w.spin.rotation.x = car.wheelSpin;
    if (w.steer) w.pivot.rotation.y = car.steerAngle;
  }
  const braking = input.brake > 0 || input.handbrake;
  for (const light of carMesh.userData.tailLights) {
    light.material.emissiveIntensity = braking ? 1.4 : car.gear === 'R' ? 0.4 : 0;
  }

  updateCamera(dt);
  engineAudio.update(car.rpm, input.throttle, 900, 7200);

  // ---- HUD ----
  speedEl.textContent = Math.max(0, Math.round(Math.abs(car.speedKmh)));
  gearEl.textContent = GEAR_LABELS[car.gear] ?? car.gear;
  gearEl.classList.toggle('gear--reverse', car.gear === 'R');
  rpmFill.style.width = `${Math.min(100, car.rpmFraction * 100)}%`;
  rpmRedlineFlag.classList.toggle('rpm-warning--active', car.isRedline);

  renderer.render(scene, camera);
}

function animate() {
  requestAnimationFrame(animate);
  try {
    step();
  } catch (err) {
    showFatalError(err);
    throw err;
  }
}
requestAnimationFrame(animate);

} // end init()
