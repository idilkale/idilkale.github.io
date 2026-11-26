// Hero 3D scene: a puffy "HELLO", every letter in a different material
// (jelly glass, pink fur, mirror chrome, blue-veined marble, iridescent pearl),
// plus a fluid chrome asterisk. Letters lean toward the cursor and spin when
// touched; the asterisk ripples like liquid metal.
import * as THREE from 'three';
import { makeRenderer, studio, chrome, pinkChrome, loadShape, wobble, cutout } from './chrome3d.js';

const hero = document.querySelector('.hero');
const canvas = document.querySelector('.hero-3d');
const area = document.querySelector('.hero-hello');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const posterMode = new URLSearchParams(location.search).has('poster');   // freeze the first frame
const loader = new THREE.TextureLoader();

// Let the preview image reach the screen first: everything below keeps the main
// thread busy for a while, and a busy thread can't paint the picture it already has.
const nextFrame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
const breathe = () => new Promise(r => setTimeout(r, 0));          // let the browser paint/scroll between chunks
const poster = document.querySelector('.hello-poster');
if (!posterMode && poster) {
    await (poster.complete ? Promise.resolve() : new Promise(r => { poster.onload = poster.onerror = r; }));
    try { await poster.decode(); } catch (e) { /* not decodable: carry on */ }
    await nextFrame();
}

let renderer;
try {
    renderer = makeRenderer(canvas);
} catch (e) {
    canvas.remove();          // no WebGL: the preview image stays
    throw e;
}

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
camera.position.set(0, 0, 14);
scene.environment = studio(renderer);
// a little direct light so the soft materials (fur, plastic) get shape too
const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(-3, 5, 6); scene.add(key);
const rim = new THREE.DirectionalLight(0xf0569a, 1.2); rim.position.set(4, -2, -3); scene.add(rim);
scene.add(new THREE.AmbientLight(0xffffff, 0.25));

/* ---------- materials ---------- */
const M = {
    jelly: new THREE.MeshPhysicalMaterial({
        color: 0xd8ff5c, roughness: 0.05, transmission: 0.55, thickness: 0.6, ior: 1.45,
        attenuationColor: 0xb6f03a, attenuationDistance: 1.2, emissive: 0x4a7a00, emissiveIntensity: 0.55,
        clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.4,
    }),
    furBase: new THREE.MeshStandardMaterial({ color: 0xa0245e, roughness: 1 }),
    chrome,
    marble: new THREE.MeshPhysicalMaterial({ roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.04, sheen: 0.3, sheenColor: 0xc9d4ff }),
    pearl: new THREE.MeshPhysicalMaterial({
        color: 0xf6eef6, roughness: 0.14, metalness: 0.25, iridescence: 1, iridescenceIOR: 1.7,
        iridescenceThicknessRange: [180, 820], clearcoat: 1, clearcoatRoughness: 0.06, sheen: 0.5, sheenColor: 0xffd6ea,
    }),
};

/* Fur: stacked shells pushed out along the surface; each shell keeps only the
   strands long enough to reach it, which reads as soft fur. */
async function furShells(geometry, letter) {
    const strands = await loader.loadAsync('assets/hello/E-fur.png');
    const N = 18, len = 0.036;
    const base = geometry.attributes.position.array, nrm = geometry.attributes.normal.array;
    const dark = new THREE.Color(0xa0245e), light = new THREE.Color(0xff8fc0);
    for (let i = 1; i <= N; i++) {
        const f = i / N;
        const g = geometry.clone();
        const p = g.attributes.position.array;
        for (let k = 0; k < p.length; k++) p[k] = base[k] + nrm[k] * len * f;
        if (i % 6 === 0) await breathe();
        g.attributes.position.needsUpdate = true;
        const m = new THREE.MeshStandardMaterial({
            color: dark.clone().lerp(light, Math.pow(f, 0.7)), roughness: 1,
            alphaMap: strands, alphaTest: 0.08 + 0.88 * f,
        });
        letter.add(new THREE.Mesh(g, m));
    }
}

/* ---------- the word ---------- */
const WORD = [
    { ch: 'H', mat: 'jelly', row: 0, col: 0, tilt: -0.10 },
    { ch: 'E', mat: 'fur', row: 0, col: 1, tilt: 0.06, scale: 0.9 },   // fur adds bulk, so a touch smaller
    { ch: 'L', mat: 'chrome', row: 0, col: 2, tilt: -0.04 },
    { ch: 'L', mat: 'marble', row: 1, col: 0.6, tilt: 0.08 },
    { ch: 'O', mat: 'pearl', row: 1, col: 1.7, tilt: -0.07 },
];
const letters = [];
let star = null, starGeo = null;

async function build() {
    // blue marble (navy and white veins), pre-rendered so nothing is computed here
    const marbleReady = loader.loadAsync('assets/hello/marble.webp').then(t => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(1.3, 1.3);
        M.marble.map = t;
    });
    await Promise.all([marbleReady, ...WORD.map(async (w, i) => {
        const shape = await loadShape(w.ch);
        await breathe();
        const group = new THREE.Group();
        group.add(new THREE.Mesh(shape.geometry, cutout(w.mat === 'fur' ? M.furBase : M[w.mat])));
        if (w.mat === 'fur') await furShells(shape.geometry, group);
        scene.add(group);
        letters[i] = { ...w, group, w: shape.w * (w.scale || 1), angle: 0, target: 0, squish: 0, seed: i * 1.37, size: 1 };
    })]);
    const s = await loadShape('ast');
    starGeo = s.geometry.clone();
    starGeo.userData = { ...s.geometry.userData, baseZ: s.geometry.userData.baseZ.slice() };
    star = new THREE.Mesh(starGeo, cutout(pinkChrome));
    scene.add(star);
    await breathe();
    layout();
    frame();
    await breathe();
    // compile every shader before showing anything, so the first visible frame is
    // the finished one (the preview image stays up until then)
    if (renderer.compileAsync) await renderer.compileAsync(scene, camera);
    frame();
    requestAnimationFrame(() => {
        hero.classList.add('has-3d', 'is-live');
        dispatchEvent(new Event('hero:live'));
    });
}

/* ---------- layout: place things relative to the page ---------- */
const view = { w: 1, h: 1, unitsPerPx: 1 };
const toWorld = (px, py) => new THREE.Vector3((px - view.w / 2) * view.unitsPerPx, (view.h / 2 - py) * view.unitsPerPx, 0);
const homes = [];
let starHome = new THREE.Vector3();

function layout() {
    const r = hero.getBoundingClientRect();
    view.w = r.width; view.h = r.height;
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
    view.unitsPerPx = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z / r.height;
    if (letters.length < WORD.length || !star) return;

    const a = area.getBoundingClientRect();
    const ax = a.left - r.left, ay = a.top - r.top;
    // one row on wide screens, "HEL / LO" on narrow ones. Letters are spaced by
    // their real widths and overlap a little, like they were piled up by hand.
    const oneRow = matchMedia('(min-width: 641px)').matches;   // same breakpoint as the preview images
    const rowsOf = oneRow ? [[0, 1, 2, 3, 4]] : [[0, 1, 2], [3, 4]];
    const overlap = 0.84;                                // < 1: neighbours lean into each other
    const rowWidth = row => row.reduce((sum, i, k) => sum + (k ? (letters[row[k - 1]].w + letters[i].w) / 2 * overlap : 0), 0)
        + (letters[row[0]].w + letters[row[row.length - 1]].w) / 2;      // in letter-square units
    const widest = Math.max(...rowsOf.map(rowWidth));
    const rows = rowsOf.length;
    // Size the word exactly like the preview image is sized (object-fit: contain of
    // the frame it was captured from), so preview and live scene line up at any size.
    const CAP = oneRow ? { w: 1440, h: 489.75 } : { w: 390, h: 320.71875 };   // poster capture frames
    const fitS = (w, h) => Math.min(w / (widest + 0.15), h / (rows * 0.62 + 0.2)) * 0.9;
    const S = fitS(CAP.w, CAP.h) * Math.min(a.width / CAP.w, a.height / CAP.h);
    const rowH = S * 0.58;
    const yMid = ay + a.height / 2 - rowH * (rows - 1) / 2;
    let right = 0, top = 0;
    rowsOf.forEach((row, r) => {
        // the second row sits a little to the right, like the reference pile-up
        let x = ax + (a.width - rowWidth(row) * S) / 2 + letters[row[0]].w / 2 * S + (rows > 1 && r === 1 ? S * 0.12 : 0);
        row.forEach((i, k) => {
            if (k) x += (letters[row[k - 1]].w + letters[i].w) / 2 * overlap * S;
            letters[i].size = S * (letters[i].scale || 1) * view.unitsPerPx;
            homes[i] = toWorld(x, yMid + r * rowH);
            if (r === 0) right = Math.max(right, x + letters[i].w / 2 * S);
        });
        if (r === 0) top = yMid - S * 0.29;
    });
    star.scale.setScalar(S * (oneRow ? 0.36 : 0.42) * view.unitsPerPx);
    starHome = toWorld(right - S * 0.06, top + S * 0.04);
}

/* ---------- pointer ---------- */
const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
addEventListener('pointermove', e => {
    if (posterMode) return;
    // measured from the word itself, so a cursor resting on the text below
    // doesn't make the letters lean back
    const a = area.getBoundingClientRect();
    pointer.tx = THREE.MathUtils.clamp((e.clientX - (a.left + a.width / 2)) / (innerWidth / 2), -1, 1);
    pointer.ty = THREE.MathUtils.clamp((e.clientY - (a.top + a.height / 2)) / (innerHeight / 2), -1, 1);
}, { passive: true });
addEventListener('deviceorientation', e => {
    if (e.gamma == null) return;
    pointer.tx = THREE.MathUtils.clamp(e.gamma / 30, -1, 1);
    pointer.ty = THREE.MathUtils.clamp((e.beta - 45) / 30, -1, 1);
}, { passive: true });

// touching a letter (or the star) gives it a spin and a little squish
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let starSpin = 0, starAngle = 0;
function poke(e) {
    if (letters.length < WORD.length) return;
    const r = hero.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    for (const l of letters) if (ray.intersectObject(l.group.children[0]).length && l.target - l.angle < 1) { l.target += Math.PI * 2; l.squish = 1; }
    if (star && ray.intersectObject(star).length) starSpin = Math.min(starSpin + 0.06, 0.4);
}
hero.addEventListener('pointermove', poke, { passive: true });
hero.addEventListener('pointerdown', poke, { passive: true });

/* ---------- loop ---------- */
const clock = new THREE.Clock();
let running = false;

function frame() {
    const t = posterMode ? 0 : clock.getElapsedTime();
    pointer.x += (pointer.tx - pointer.x) * 0.06;
    pointer.y += (pointer.ty - pointer.y) * 0.06;

    if (homes.length) letters.forEach((l, i) => {
        l.angle += (l.target - l.angle) * 0.06; l.squish *= 0.92;   // one full turn, then back to facing you
        const bob = Math.sin(t * 0.9 + l.seed) * 0.06;
        l.group.position.copy(homes[i]).add(new THREE.Vector3(pointer.x * 0.12, -pointer.y * 0.08 + bob, 0));
        l.group.rotation.set(pointer.y * 0.12 + Math.sin(t * 0.6 + l.seed) * 0.04,
                             pointer.x * 0.32 + Math.sin(t * 0.4 + l.seed) * 0.07 + l.angle,
                             l.tilt + Math.sin(t * 0.5 + l.seed) * 0.03);
        const sq = Math.sin(t * 14) * 0.08 * l.squish;
        l.group.scale.set(l.size * (1 + sq), l.size * (1 - sq), l.size);
    });

    if (star) {
        starSpin *= 0.97; starAngle += 0.004 + starSpin;
        star.position.copy(starHome).add(new THREE.Vector3(pointer.x * 0.3, -pointer.y * 0.2 + Math.sin(t * 0.8) * 0.08, 0.5));
        star.rotation.set(pointer.y * 0.2 + Math.sin(t * 0.5) * 0.1, pointer.x * 0.5 + Math.sin(t * 0.35) * 0.2, starAngle);
        wobble(starGeo, t, 0.07);
    }

    renderer.render(scene, camera);
    if (running) requestAnimationFrame(frame);
}

function start() { if (!running && !reduceMotion && !posterMode) { running = true; clock.start(); requestAnimationFrame(frame); } }
function stop() { running = false; }

layout();
build();
new ResizeObserver(() => { layout(); if (!running) frame(); }).observe(hero);
new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop())).observe(hero);
document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
