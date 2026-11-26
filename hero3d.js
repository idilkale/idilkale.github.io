// Hero 3D scene: a chrome version of the site's asterisk plus two liquid-metal
// blobs, lit by a small "studio" so the reflections read like a Blender render.
// Everything follows the cursor (or the finger on touch screens).
import * as THREE from 'three';
import { makeRenderer, studio, chrome, pinkChrome, asteriskGeometry, blobGeometry, wobble } from './chrome3d.js';

const hero = document.querySelector('.hero');
const canvas = document.querySelector('.hero-3d');
const figure = document.querySelector('.hero-figure');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

let renderer;
try {
    renderer = makeRenderer(canvas);
} catch (e) {
    canvas.remove();          // no WebGL: the flat SVG asterisk stays
    throw e;
}
hero.classList.add('has-3d');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
camera.position.set(0, 0, 14);

scene.environment = studio(renderer);

const asterisk = new THREE.Mesh(asteriskGeometry(), chrome);
scene.add(asterisk);

/* ---------- liquid metal blobs ---------- */
const blobs = [
    { mesh: new THREE.Mesh(blobGeometry(), chrome), size: 0.55, seed: 0.0, anchor: 'low-left' },
    { mesh: new THREE.Mesh(blobGeometry(), pinkChrome), size: 0.32, seed: 2.7, anchor: 'top' },
];
blobs.forEach(b => scene.add(b.mesh));

/* ---------- layout: place things relative to the page, not the scene ---------- */
const view = { w: 1, h: 1, unitsPerPx: 1 };
const toWorld = (px, py) => new THREE.Vector3((px - view.w / 2) * view.unitsPerPx, (view.h / 2 - py) * view.unitsPerPx, 0);
const homes = {};

function layout() {
    const r = hero.getBoundingClientRect();
    view.w = r.width; view.h = r.height;
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
    const visibleH = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    view.unitsPerPx = visibleH / r.height;

    const f = figure.getBoundingClientRect();
    const fx = f.left - r.left, fy = f.top - r.top;
    const narrow = r.width < 960;
    const astPx = narrow ? Math.min(r.width * 0.3, 140) : Math.min(f.width * 0.3, 190);
    asterisk.scale.setScalar((astPx / 2) * view.unitsPerPx);
    homes.asterisk = narrow ? toWorld(fx + f.width * 0.8, fy + f.height * 0.16) : toWorld(fx + f.width * 0.76, Math.max(r.height * 0.2, 150));

    const b0 = (narrow ? 42 : 78) * view.unitsPerPx, b1 = (narrow ? 26 : 44) * view.unitsPerPx;
    blobs[0].mesh.scale.setScalar(b0);
    blobs[1].mesh.scale.setScalar(b1);
    homes.blob0 = narrow ? toWorld(r.width * 0.1, fy + f.height * 0.3) : toWorld(fx - f.width * 0.02, r.height * 0.74);
    homes.blob1 = narrow ? toWorld(r.width * 0.86, r.height * 0.06) : toWorld(fx + f.width * 0.14, r.height * 0.14);
}

/* ---------- pointer ---------- */
const pointer = { x: 0, y: 0, tx: 0, ty: 0, energy: 0 };
let lastX = 0, lastY = 0;
function onMove(cx, cy) {
    const nx = (cx / innerWidth) * 2 - 1, ny = (cy / innerHeight) * 2 - 1;
    pointer.energy = Math.min(1, pointer.energy + Math.hypot(nx - lastX, ny - lastY) * 2.5);
    lastX = nx; lastY = ny;
    pointer.tx = nx; pointer.ty = ny;
}
addEventListener('pointermove', e => onMove(e.clientX, e.clientY), { passive: true });
addEventListener('deviceorientation', e => {
    if (e.gamma == null) return;
    pointer.tx = THREE.MathUtils.clamp(e.gamma / 30, -1, 1);
    pointer.ty = THREE.MathUtils.clamp((e.beta - 45) / 30, -1, 1);
}, { passive: true });

// a quick spin when the cursor touches the asterisk
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let spin = 0;
hero.addEventListener('pointermove', e => {
    const r = hero.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    if (ray.intersectObject(asterisk).length) spin = Math.min(spin + 0.08, 0.5);
}, { passive: true });

/* ---------- loop ---------- */
const clock = new THREE.Clock();
let running = false, spinAngle = 0;

function frame() {
    const t = clock.getElapsedTime();
    pointer.x += (pointer.tx - pointer.x) * 0.06;
    pointer.y += (pointer.ty - pointer.y) * 0.06;
    pointer.energy *= 0.96;
    spin *= 0.97;
    spinAngle += 0.004 + spin;

    asterisk.position.copy(homes.asterisk).add(new THREE.Vector3(pointer.x * 0.35, -pointer.y * 0.25 + Math.sin(t * 0.8) * 0.08, 0));
    asterisk.rotation.set(-pointer.y * 0.35 + Math.sin(t * 0.5) * 0.08, pointer.x * 0.5 + Math.sin(t * 0.35) * 0.15, spinAngle);

    blobs.forEach((b, i) => {
        const home = i ? homes.blob1 : homes.blob0;
        const k = i ? 0.55 : 0.25;
        b.mesh.position.copy(home).add(new THREE.Vector3(pointer.x * k, -pointer.y * k * 0.8 + Math.sin(t * 0.6 + b.seed) * 0.12, 0));
        b.mesh.rotation.set(t * 0.12 + b.seed, t * 0.18, 0);
        wobble(b.mesh.geometry, t, 0.07 + pointer.energy * 0.16, b.seed);
    });

    renderer.render(scene, camera);
    if (running) requestAnimationFrame(frame);
}

function start() { if (!running && !reduceMotion) { running = true; clock.start(); requestAnimationFrame(frame); } }
function stop() { running = false; }

layout();
frame();                                   // one still frame, also the reduced-motion view
new ResizeObserver(() => { layout(); if (!running) frame(); }).observe(hero);
new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop())).observe(hero);
document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
