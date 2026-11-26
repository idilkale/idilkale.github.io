// The page-wide chrome layer: every flat asterisk (the SVG .asterisk spans and
// the "*" in "Say hi*") becomes a soft, liquid-metal one that ripples, spins
// and turns toward the cursor, drawn exactly where its flat version sits.
// Desktop: one fixed, see-through canvas covers the viewport (one WebGL context,
// stars may poke out of their bands and turn toward the cursor).
// Touch screens: the browser scrolls the page on its own thread, so a fixed layer
// lags behind and the stars jump when you flick. There each star is drawn into a
// small canvas that lives inside the page next to its flat version, so it scrolls
// with the content natively; one hidden WebGL renderer draws them all.
import * as THREE from 'three';
import { makeRenderer, studio, chrome, pinkChrome, loadShape, wobble, cutout } from './chrome3d.js';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const targets = [...document.querySelectorAll('.asterisk, .say-hi span')].filter(el => !el.closest('.hero'));

if (targets.length) init();

async function init() {
    // on the home page the hero goes first; the stars below the fold can wait a moment
    if (document.querySelector('.hero-3d')) {
        await new Promise(r => { addEventListener('hero:live', r, { once: true }); setTimeout(r, 4000); });
    }
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
    const silver = cutout(chrome), pink = cutout(pinkChrome);

    const isPink = el => {
        if (el.matches('.say-hi span')) return true;
        const m = getComputedStyle(el).color.match(/\d+/g);
        if (!m) return false;
        const [r, g, b] = m.map(Number);
        return r - g > 60 && b - g > 10;               // berry / pink, not yellow or white
    };

    if (matchMedia('(hover: none) and (pointer: coarse)').matches) return inlineMode(renderer, canvas, scene, geo, silver, pink, isPink);

    document.documentElement.classList.add('ast-3d');     // hide the flat ones only once these can draw
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

/* ---------- touch screens: stars drawn in place, scrolling with the page ---------- */
function inlineMode(renderer, layer, scene, geo, silver, pink, isPink) {
    layer.remove();                                    // the hidden renderer keeps its own canvas
    const dpr = Math.min(devicePixelRatio, 2);
    const PAD = 1.25;                                  // room around the star for its slow tilt
    const camera = new THREE.OrthographicCamera(-PAD / 2, PAD / 2, PAD / 2, -PAD / 2, -10, 10);
    renderer.setPixelRatio(1);

    const items = targets.map((el, i) => {
        const glyph = el.matches('.say-hi span');
        if (glyph) el.style.position = 'relative';
        const c = document.createElement('canvas');
        c.className = 'ast-2d';
        c.setAttribute('aria-hidden', 'true');
        // out of the flow from the start, so it never changes the size we measure
        Object.assign(c.style, { position: 'absolute', width: '0px', height: '0px', left: '0px', top: '0px' });
        el.appendChild(c);
        const mesh = new THREE.Mesh(geo, isPink(el) ? pink : silver);
        mesh.visible = false;
        scene.add(mesh);
        return { el, c, ctx: c.getContext('2d'), mesh, glyph, phase: i * 1.7, dir: i % 2 ? -1 : 1, visible: false, px: 0 };
    });

    let tex = 0;
    function place() {
        for (const it of items) {
            const r = it.el.getBoundingClientRect();
            const size = (it.glyph ? r.width * 1.05 : Math.min(r.width, r.height)) / 0.75;   // star square, as on desktop
            const css = Math.round(size * PAD);
            it.px = Math.round(css * dpr);
            it.c.width = it.c.height = it.px;
            Object.assign(it.c.style, {
                position: 'absolute', width: css + 'px', height: css + 'px', pointerEvents: 'none',
                left: (r.width - css) / 2 + 'px',
                top: (it.glyph ? r.height * 0.36 : r.height / 2) - css / 2 + 'px',
            });
            tex = Math.max(tex, it.px);
        }
        renderer.setSize(tex, tex, false);
    }

    const io = new IntersectionObserver(es => es.forEach(e => {
        const it = items.find(i => i.el === e.target);
        if (it) it.visible = e.isIntersecting;
    }), { rootMargin: '100px' });
    items.forEach(it => io.observe(it.el));

    const clock = new THREE.Clock();
    let last = 0, running = true;
    function frame(now) {
        if (!running) return;
        requestAnimationFrame(frame);
        if (now - last < 33) return;                   // ~30 fps is plenty for a slow spin
        last = now;
        const t = reduceMotion ? 0 : clock.getElapsedTime();
        const shown = items.filter(it => it.visible && it.px);
        if (!shown.length) return;
        if (!reduceMotion) wobble(geo, t, 0.06);
        for (const it of shown) {
            it.mesh.visible = true;
            it.mesh.rotation.set(Math.sin(t * 0.6 + it.phase) * 0.18, Math.sin(t * 0.45 + it.phase) * 0.3, it.phase + t * 0.35 * it.dir);
            renderer.setViewport(0, 0, it.px, it.px);
            renderer.setScissor(0, 0, it.px, it.px);
            renderer.setScissorTest(true);
            renderer.setClearColor(0x000000, 0);
            renderer.clear();
            renderer.render(scene, camera);
            it.ctx.clearRect(0, 0, it.px, it.px);
            // the WebGL canvas is bottom-left based; copy the square we just drew
            it.ctx.drawImage(renderer.domElement, 0, tex - it.px, it.px, it.px, 0, 0, it.px, it.px);
            it.mesh.visible = false;
        }
    }
    place();
    addEventListener('resize', place);
    document.fonts?.ready.then(place);                 // "Say hi*" changes size once its font arrives
    document.documentElement.classList.add('ast-3d');
    requestAnimationFrame(frame);
    document.addEventListener('visibilitychange', () => {
        running = !document.hidden;
        if (running) requestAnimationFrame(frame);
    });
}
