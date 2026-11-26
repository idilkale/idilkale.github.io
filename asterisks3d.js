// The page-wide chrome layer.
// 1. Every flat asterisk (the SVG .asterisk spans and the "*" in "Say hi*")
//    becomes a spinning chrome one, drawn exactly where its flat version sits.
// 2. A few liquid-metal blobs float beside the page headers, sections and the
//    footer, drifting with the scroll and the cursor.
// One fixed, see-through canvas covers the viewport, so the layout never
// changes and the whole page uses a single WebGL context.
import * as THREE from 'three';
import { makeRenderer, studio, chrome, pinkChrome, asteriskGeometry, blobGeometry, wobble } from './chrome3d.js';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const narrowQ = matchMedia('(max-width: 760px)');

const asteriskEls = [...document.querySelectorAll('.asterisk, .say-hi span')].filter(el => !el.closest('.hero'));

/* Where the blobs float: [element, x across it (0..1), y down it (0..1, or px from its top when > 1), size in px, pink?]
   Picked from the page's own structure, so every page gets them without extra markup. */
function blobSpots() {
    const spots = [];
    const main = document.querySelector('main');
    const head = document.querySelector('.cs-hero') || (main && !main.querySelector('.hero') && main.querySelector('section'));
    if (head) spots.push([head, 0.86, 300, 96, false], [head, 0.74, 600, 44, true]);
    const home = document.querySelector('.hero');
    if (home) {
        const short = document.querySelector('[aria-labelledby="shortTitle"]');
        if (short) spots.push([short, 0.88, 0.06, 70, true]);
        const sections = [...document.querySelectorAll('main > .section')];
        const last = sections[sections.length - 1];
        if (last && last !== short) spots.push([last, 0.9, 0.18, 84, false]);
    }
    const alt = document.querySelector('main .section--alt');
    if (alt) spots.push([alt, 0.93, 0.12, 60, true]);
    const footer = document.querySelector('.site-footer');
    if (footer) spots.push([footer, 0.82, 0.3, 110, false], [footer, 0.66, 0.62, 38, true]);
    return spots;
}

const canvas = document.createElement('canvas');
canvas.className = 'ast-layer';
canvas.setAttribute('aria-hidden', 'true');
document.body.appendChild(canvas);

let renderer;
try { renderer = makeRenderer(canvas); } catch (e) { canvas.remove(); throw e; }
document.documentElement.classList.add('ast-3d');
renderer.autoClear = false;

const scene = new THREE.Scene();
scene.environment = studio(renderer);
const camera = new THREE.OrthographicCamera(0, 1, 0, -1, -2000, 2000);
const astGeo = asteriskGeometry();

const isPink = el => {
    if (el.matches('.say-hi span')) return true;
    const m = getComputedStyle(el).color.match(/\d+/g);
    if (!m) return false;
    const [r, g, b] = m.map(Number);
    return r - g > 60 && b - g > 10;               // berry / pink, not yellow or white
};

const asterisks = asteriskEls.map((el, i) => {
    const mesh = new THREE.Mesh(astGeo, isPink(el) ? pinkChrome : chrome);
    mesh.visible = false;
    scene.add(mesh);
    // the box that used to clip the flat version; the chrome one may leave it a little
    let clip = el.parentElement;
    while (clip && clip !== document.body && getComputedStyle(clip).overflow === 'visible') clip = clip.parentElement;
    if (clip === document.body) clip = null;
    return { el, mesh, clip, phase: i * 1.7, dir: i % 2 ? -1 : 1, glyph: el.matches('.say-hi span') };
});

const blobs = blobSpots().map(([el, fx, fy, px, pink], i) => {
    const mesh = new THREE.Mesh(blobGeometry(64), pink ? pinkChrome : chrome);
    mesh.visible = false;
    scene.add(mesh);
    return { el, fx, fy, px, mesh, seed: i * 2.3 + 0.7 };
});

let W = 0, H = 0;
function resize() {
    W = innerWidth; H = innerHeight;
    renderer.setSize(W, H, false);
    camera.left = 0; camera.right = W; camera.top = 0; camera.bottom = -H;
    camera.updateProjectionMatrix();
}

const pointer = { x: innerWidth / 2, y: innerHeight / 2, tx: innerWidth / 2, ty: innerHeight / 2, energy: 0 };
addEventListener('pointermove', e => {
    pointer.energy = Math.min(1, pointer.energy + Math.hypot(e.movementX || 0, e.movementY || 0) / 400);
    pointer.tx = e.clientX; pointer.ty = e.clientY;
}, { passive: true });

// scrolling makes things bob a little, like they are floating in liquid
let lastScroll = scrollY, scrollKick = 0;
addEventListener('scroll', () => { scrollKick += (scrollY - lastScroll) * 0.002; lastScroll = scrollY; }, { passive: true });

const clock = new THREE.Clock();
let running = false;

function draw(mesh, x0, y0, x1, y1) {
    if (x1 <= x0 || y1 <= y0) return;
    mesh.visible = true;
    renderer.setScissor(x0, H - y1, x1 - x0, y1 - y0);
    renderer.render(scene, camera);
    mesh.visible = false;
}

function frame() {
    const t = reduceMotion ? 0 : clock.getElapsedTime();
    pointer.x += (pointer.tx - pointer.x) * 0.08;
    pointer.y += (pointer.ty - pointer.y) * 0.08;
    pointer.energy *= 0.95;
    scrollKick *= 0.9;
    const narrow = narrowQ.matches;

    renderer.setScissorTest(false);
    renderer.clear();
    renderer.setScissorTest(true);
    for (const it of asterisks) it.mesh.visible = false;
    for (const b of blobs) b.mesh.visible = false;

    for (const it of asterisks) {
        const r = it.el.getBoundingClientRect();
        if (!(r.width > 0 && r.bottom > -r.height && r.top < H + r.height && r.right > 0 && r.left < W)) continue;
        // a text "*" sits in the top part of its line box; the SVG fills its box
        const size = it.glyph ? r.width * 1.05 : Math.min(r.width, r.height);
        const cx = r.left + r.width / 2;
        const cy = (it.glyph ? r.top + r.height * 0.36 : r.top + r.height / 2) + Math.sin(t * 0.9 + it.phase) * size * 0.04;
        // free to poke out of its band by about half its size, then cut
        let x0 = 0, y0 = 0, x1 = W, y1 = H;
        if (it.clip) {
            const c = it.clip.getBoundingClientRect(), m = size * 0.5;
            x0 = Math.max(0, c.left - m); y0 = Math.max(0, c.top - m); x1 = Math.min(W, c.right + m); y1 = Math.min(H, c.bottom + m);
        }
        const pad = size;
        x0 = Math.max(x0, cx - pad); x1 = Math.min(x1, cx + pad);
        y0 = Math.max(y0, cy - pad); y1 = Math.min(y1, cy + pad);
        it.mesh.position.set(cx, -cy, 0);
        it.mesh.scale.setScalar(size / 2);
        // each one turns toward the cursor, and keeps slowly spinning
        const dx = THREE.MathUtils.clamp((pointer.x - cx) / W, -1, 1);
        const dy = THREE.MathUtils.clamp((pointer.y - cy) / H, -1, 1);
        it.mesh.rotation.set(dy * 0.9 + Math.sin(t * 0.6 + it.phase) * 0.12 + scrollKick,
                             dx * 1.1 + Math.sin(t * 0.45 + it.phase) * 0.2,
                             it.phase + t * 0.35 * it.dir);
        draw(it.mesh, x0, y0, x1, y1);
    }

    for (const b of blobs) {
        const r = b.el.getBoundingClientRect();
        if (narrow && b.px < 60) continue;          // on phones only the bigger ones, at the edge, clear of the text
        const px = b.px * (narrow ? 0.55 : 1);
        const fx = narrow ? 0.95 : b.fx;
        // drift with the cursor (parallax) and bob slowly
        const cx = r.left + r.width * fx + ((pointer.x / W) - 0.5) * px * 0.5 + Math.sin(t * 0.5 + b.seed) * px * 0.12;
        const cy = r.top + (b.fy > 1 ? b.fy * (narrow ? 0.6 : 1) : r.height * b.fy) + ((pointer.y / H) - 0.5) * px * 0.4 + Math.cos(t * 0.6 + b.seed) * px * 0.15 - scrollKick * px * 2;
        if (cy + px < 0 || cy - px > H) continue;
        b.mesh.position.set(cx, -cy, -200);
        b.mesh.scale.setScalar(px / 2);
        b.mesh.rotation.set(t * 0.12 + b.seed, t * 0.18, 0);
        wobble(b.mesh.geometry, t + b.seed, 0.08 + pointer.energy * 0.14 + Math.min(Math.abs(scrollKick), 0.15), b.seed);
        draw(b.mesh, Math.max(0, cx - px), Math.max(0, cy - px), Math.min(W, cx + px), Math.min(H, cy + px));
    }
    if (running) requestAnimationFrame(frame);
}

resize();
addEventListener('resize', () => { resize(); if (!running) frame(); });
if (reduceMotion) {
    // still keep them in place while scrolling, just without the motion
    addEventListener('scroll', () => requestAnimationFrame(frame), { passive: true });
    frame();
} else {
    running = true;
    requestAnimationFrame(frame);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) running = false;
        else if (!running) { running = true; requestAnimationFrame(frame); }
    });
}
