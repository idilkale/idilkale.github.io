// Shared 3D pieces: the studio the materials reflect, the materials themselves,
// and "inflated" shapes (the HELLO letters and the soft asterisk) built from the
// height maps in assets/hello/ (made from the letter and asterisk outlines).
import * as THREE from 'three';

export function makeRenderer(canvas) {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    return renderer;
}

/* A chrome look comes from contrast in what it reflects: a bright sky, a sharp
   horizon, a dark floor, a few softboxes and one berry panel. */
export function studio(renderer) {
    const room = new THREE.Scene();
    const sky = new THREE.SphereGeometry(20, 64, 32);
    const col = [], c = new THREE.Color();
    const top = new THREE.Color(0xd9d9e2), hor = new THREE.Color(0x6b6b78), floor = new THREE.Color(0x060608);
    const floorTop = new THREE.Color(0x2a2a33), front = new THREE.Color(0x9a96a4);
    for (let i = 0; i < sky.attributes.position.count; i++) {
        const y = sky.attributes.position.getY(i) / 20;          // -1..1
        if (y > -0.05) c.copy(hor).lerp(top, Math.pow(Math.max(y, 0), 0.6));
        else c.copy(floor).lerp(floorTop, Math.max(0, 1 + (y + 0.05) * 4));
        const z = sky.attributes.position.getZ(i) / 20;          // toward the camera
        if (z > 0.2) c.lerp(front, Math.min(1, (z - 0.2) * 1.6) * 0.75);
        col.push(c.r, c.g, c.b);
    }
    sky.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    room.add(new THREE.Mesh(sky, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
    const panel = (w, h, color, strength, pos) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
            new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(strength), side: THREE.DoubleSide }));
        m.position.set(...pos); m.lookAt(0, 0, 0); room.add(m);
    };
    panel(12, 3, 0xffffff, 6, [0, 12, 4]);        // top softbox
    panel(1.6, 10, 0xffffff, 5, [-12, 2, 5]);     // left strip
    panel(1.6, 10, 0xffffff, 3, [12, 1, -2]);     // right strip
    panel(9, 3, 0xd23f86, 5, [4, -6, 8]);         // berry bounce, low and in front
    panel(3, 7, 0xf0569a, 4, [-8, 3, -10]);       // pink rim from behind
    panel(16, 5, 0xffffff, 1.3, [2, 4, 15]);      // soft fill behind the camera, so front faces catch light
    panel(5, 3, 0xf0569a, 2.2, [-7, -3, 13]);     // and a touch of pink on them
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(room, 0.01).texture;
    pmrem.dispose();
    return env;
}

export const chrome = new THREE.MeshPhysicalMaterial({
    color: 0xf4f4f8, metalness: 1, roughness: 0.05, clearcoat: 0.6, clearcoatRoughness: 0.05, envMapIntensity: 1.15,
});
export const pinkChrome = chrome.clone();
pinkChrome.color.set(0xff9cc8);

/* ---------- inflated shapes ---------- */
const cache = {};

/* Loads assets/hello/<name>.bin (made from the outline's distance field) and
   returns { geometry, w, h }: a closed, round-edged solid; w/h are the
   outline's size inside the unit square. */
export function loadShape(name, base = 'assets/hello/') {
    if (!cache[name]) cache[name] = (async () => {
        const buf = await fetch(base + name + '.bin').then(r => r.arrayBuffer());
        const dv = new DataView(buf);
        const G = dv.getUint16(0, true), w = dv.getFloat32(2, true), h = dv.getFloat32(6, true), depth = dv.getFloat32(10, true);
        const n = G * G, o = 14;
        const flag = new Uint8Array(buf, o, n);
        const dx = new Int8Array(buf, o + n, n), dy = new Int8Array(buf, o + 2 * n, n);
        const H = new Uint16Array(buf.slice(o + 3 * n, o + 3 * n + 2 * n));
        return { geometry: solidGeometry(G, flag, dx, dy, H, depth), w, h };
    })();
    return cache[name];
}

/* Front and back halves (z = +/- height) that share their outline vertices,
   so the solid is closed and its edge is smooth all the way round. */
function solidGeometry(G, flag, dx, dy, H, depth) {
    const n = G * G, cell = 1 / (G - 1);
    const front = new Int32Array(n).fill(-1), back = new Int32Array(n).fill(-1);
    const pos = [], hs = [];
    const add = (k, z, h) => {
        const i = k % G, j = (k / G) | 0;
        pos.push(i * cell - 0.5 + (dx[k] / 100) * cell, 0.5 - j * cell - (dy[k] / 100) * cell, z);
        hs.push(h);
        return hs.length - 1;
    };
    for (let k = 0; k < n; k++) {
        if (!flag[k]) continue;
        const h = H[k] / 65535;
        front[k] = add(k, h * depth, h);
        back[k] = flag[k] === 2 ? front[k] : add(k, -h * depth, h);   // the outline is shared
    }
    const idx = [];
    for (let j = 0; j < G - 1; j++) for (let i = 0; i < G - 1; i++) {
        const a = j * G + i, b = a + 1, c = a + G, d = c + 1;
        if (!(flag[a] && flag[b] && flag[c] && flag[d])) continue;
        if (flag[a] === 2 && flag[b] === 2 && flag[c] === 2 && flag[d] === 2) continue;   // all on the edge: nothing to fill
        idx.push(front[a], front[c], front[b], front[b], front[c], front[d]);
        idx.push(back[a], back[b], back[c], back[b], back[d], back[c]);
    }
    const P = new Float32Array(pos);
    const uv = new Float32Array(hs.length * 2);
    for (let v = 0; v < hs.length; v++) { uv[v * 2] = P[v * 3] + 0.5; uv[v * 2 + 1] = P[v * 3 + 1] + 0.5; }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(P, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    g.userData.baseZ = P.filter((_, i) => i % 3 === 2);
    g.userData.h = new Float32Array(hs);
    return g;
}

/* Liquid wobble: ripples run over the surface; the outline (height 0) stays put. */
export function wobble(geo, t, amp) {
    const pos = geo.attributes.position.array, z0 = geo.userData.baseZ, h = geo.userData.h;
    for (let v = 0, n = z0.length; v < n; v++) {
        const x = pos[v * 3], y = pos[v * 3 + 1];
        const ripple = Math.sin(7 * x + t * 1.6) * Math.sin(6 * y - t * 1.3) + 0.6 * Math.sin(11 * (x + y) + t * 2.1);
        pos[v * 3 + 2] = z0[v] * (1 + amp * ripple * (0.4 + h[v]));
    }
    geo.attributes.position.needsUpdate = true;
    geo.computeVertexNormals();
}

/* Shapes are closed solids now, so materials need no cut-out; kept as one
   place to tweak how shape materials are set up. */
export function cutout(material) {
    return material.clone();
}
