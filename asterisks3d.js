// The page-wide chrome layer: every flat asterisk (the SVG .asterisk spans and
// the "*" in "Say hi*") becomes a soft, liquid-metal one that ripples, spins
// and turns toward the cursor, drawn exactly where its flat version sits.
// One fixed, see-through canvas covers the viewport, so the layout never
// changes and the whole page uses a single WebGL context.
import * as THREE from 'three';
import { makeRenderer, studio, chrome, pinkChrome, loadShape, wobble, cutout } from './chrome3d.js';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const targets = [...document.querySelectorAll('.asterisk, .say-hi span')].filter(el => !el.closest('.hero'));

if (targets.length) init();

async function init() {
    const canvas = document.createElement('canvas');
    canvas.className = 'ast-layer';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);

    let renderer;
    try { renderer = makeRenderer(canvas); } catch (e) { canvas.remove(); throw e; }
    renderer.autoClear = false;

    const scene = new THREE.Scene();
    scene.environment = studio(renderer);
    const camera = new THREE.OrthographicCamera(0, 1, 0, -1, -2000, 2000);

    const shape = await loadShape('ast');
    const geo = shape.geometry;
    const silver = cutout(chrome, shape.mask), pink = cutout(pinkChrome, shape.mask);
    document.documentElement.classList.add('ast-3d');     // hide the flat ones only once these can draw

    const isPink = el => {
        if (el.matches('.say-hi span')) return true;
        const m = getComputedStyle(el).color.match(/\d+/g);
        if (!m) return false;
        const [r, g, b] = m.map(Number);
        return r - g > 60 && b - g > 10;               // berry / pink, not yellow or white
    };

    const items = targets.map((el, i) => {
        const mesh = new THREE.Mesh(geo, isPink(el) ? pink : silver);
        mesh.visible = false;
        scene.add(mesh);
        // the box that used to clip the flat version; the 3D one may leave it a little
        let clip = el.parentElement;
        while (clip && clip !== document.body && getComputedStyle(clip).overflow === 'visible') clip = clip.parentElement;
        if (clip === document.body) clip = null;
        return { el, mesh, clip, phase: i * 1.7, dir: i % 2 ? -1 : 1, glyph: el.matches('.say-hi span') };
    });

    let W = 0, H = 0;
    function resize() {
        W = innerWidth; H = innerHeight;
        renderer.setSize(W, H, false);
        camera.left = 0; camera.right = W; camera.top = 0; camera.bottom = -H;
        camera.updateProjectionMatrix();
    }

    const pointer = { x: innerWidth / 2, y: innerHeight / 2, tx: innerWidth / 2, ty: innerHeight / 2 };
    addEventListener('pointermove', e => { pointer.tx = e.clientX; pointer.ty = e.clientY; }, { passive: true });

    // scrolling makes them bob a little, like they are floating in liquid
    let lastScroll = scrollY, scrollKick = 0;
    addEventListener('scroll', () => { scrollKick += (scrollY - lastScroll) * 0.002; lastScroll = scrollY; }, { passive: true });

    const clock = new THREE.Clock();
    let running = false;

    function frame() {
        const t = reduceMotion ? 0 : clock.getElapsedTime();
        pointer.x += (pointer.tx - pointer.x) * 0.08;
        pointer.y += (pointer.ty - pointer.y) * 0.08;
        scrollKick *= 0.9;

        renderer.setScissorTest(false);
        renderer.clear();
        renderer.setScissorTest(true);

        let rippled = false;
        for (const it of items) {
            const r = it.el.getBoundingClientRect();
            if (!(r.width > 0 && r.bottom > -r.height && r.top < H + r.height && r.right > 0 && r.left < W)) continue;
            if (!rippled && !reduceMotion) { wobble(geo, t, 0.06 + Math.min(Math.abs(scrollKick) * 1.5, 0.15)); rippled = true; }
            // a text "*" sits in the top part of its line box; the SVG fills its box.
            // The soft star's outline fills ~75% of its square, so scale up to match.
            const size = (it.glyph ? r.width * 1.05 : Math.min(r.width, r.height)) / 0.75;
            const cx = r.left + r.width / 2;
            const cy = (it.glyph ? r.top + r.height * 0.36 : r.top + r.height / 2) + Math.sin(t * 0.9 + it.phase) * size * 0.03;
            // free to poke out of its band by about half its size, then cut
            let x0 = 0, y0 = 0, x1 = W, y1 = H;
            if (it.clip) {
                const c = it.clip.getBoundingClientRect(), m = size * 0.4;
                x0 = Math.max(0, c.left - m); y0 = Math.max(0, c.top - m); x1 = Math.min(W, c.right + m); y1 = Math.min(H, c.bottom + m);
            }
            x0 = Math.max(x0, cx - size); x1 = Math.min(x1, cx + size);
            y0 = Math.max(y0, cy - size); y1 = Math.min(y1, cy + size);
            if (x1 <= x0 || y1 <= y0) continue;
            it.mesh.position.set(cx, -cy, 0);
            it.mesh.scale.setScalar(size);
            // each one turns toward the cursor, and keeps slowly spinning
            const dx = THREE.MathUtils.clamp((pointer.x - cx) / W, -1, 1);
            const dy = THREE.MathUtils.clamp((pointer.y - cy) / H, -1, 1);
            it.mesh.rotation.set(dy * 0.9 + Math.sin(t * 0.6 + it.phase) * 0.12 + scrollKick,
                                 dx * 1.1 + Math.sin(t * 0.45 + it.phase) * 0.2,
                                 it.phase + t * 0.35 * it.dir);
            it.mesh.visible = true;
            renderer.setScissor(x0, H - y1, x1 - x0, y1 - y0);
            renderer.render(scene, camera);
            it.mesh.visible = false;
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
}
