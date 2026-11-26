// Shared pieces for the chrome look: the studio the metal reflects, the
// materials, and the asterisk shape (the same outline as the SVG #ast symbol).
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

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
    panel(9, 3, 0xc2557f, 5, [4, -6, 8]);         // berry bounce, low and in front
    panel(3, 7, 0xec7aa6, 4, [-8, 3, -10]);       // pink rim from behind
    panel(16, 5, 0xffffff, 1.3, [2, 4, 15]);      // soft fill behind the camera, so front faces catch light
    panel(5, 3, 0xec7aa6, 2.2, [-7, -3, 13]);     // and a touch of pink on them
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(room, 0.01).texture;
    pmrem.dispose();
    return env;
}

export const chrome = new THREE.MeshPhysicalMaterial({
    color: 0xf4f4f8, metalness: 1, roughness: 0.05, clearcoat: 0.6, clearcoatRoughness: 0.05, envMapIntensity: 1.15,
});
export const pinkChrome = chrome.clone();
pinkChrome.color.set(0xf3b6cd);

const AST = [[35.5,97.7],[10.8,82.6],[32.4,56.8],[0,50.2],[8.1,22.4],[39,35.5],[35.5,2.3],[64.5,2.3],
             [61,35.5],[91.9,22.4],[100,50.2],[67.6,56.8],[89.2,82.6],[64.5,97.7],[49.8,69.1]];

/* Spans -1..1 across, centred on the origin. */
export function asteriskGeometry() {
    const shape = new THREE.Shape(AST.map(([x, y]) => new THREE.Vector2((x - 50) / 50, (50 - y) / 50)).reverse());
    const g = new THREE.ExtrudeGeometry(shape, {
        depth: 0.34, bevelEnabled: true, bevelThickness: 0.16, bevelSize: 0.09, bevelSegments: 10, curveSegments: 1,
    });
    g.center();
    g.computeVertexNormals();
    return g;
}

/* A sphere with its seam welded, so the reflection stays smooth while it wobbles. */
export function blobGeometry(detail = 96) {
    let g = new THREE.SphereGeometry(1, detail, Math.round(detail * 0.75));
    g.deleteAttribute('uv'); g.deleteAttribute('normal');
    g = mergeVertices(g);
    g.computeVertexNormals();
    g.userData.base = g.attributes.position.array.slice();
    return g;
}

/* Liquid-metal wobble: a few slow sine waves pushed through the surface. */
export function wobble(geo, t, amp, seed) {
    const base = geo.userData.base, pos = geo.attributes.position.array;
    for (let i = 0; i < pos.length; i += 3) {
        const x = base[i], y = base[i + 1], z = base[i + 2];
        const n = Math.sin(2.1 * x + t * 1.1 + seed) * Math.sin(2.4 * y + t * 0.9 + seed * 1.3) * Math.sin(2.2 * z + t * 0.7)
                + 0.5 * Math.sin(4.3 * x - t * 1.4 + seed) * Math.sin(3.9 * z + t * 1.2);
        const r = 1 + amp * n;
        pos[i] = x * r; pos[i + 1] = y * r; pos[i + 2] = z * r;
    }
    geo.attributes.position.needsUpdate = true;
    geo.computeVertexNormals();
}
