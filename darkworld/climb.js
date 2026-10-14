const CLIMB_SCALE = 2;
const CLIMB_FPS = 30;
const SPIN_SECONDS = 40;
const TILE = 180;
const FLOWER_GAP = 22;
const LEAF_GAP = 40;
const PETAL_COUNT = 16;
const LEAF_ROOM = 9;
const BAND_EDGE = 0.66;

const CENTER_PALETTE = [[30, 36, 10], [38, 45, 13], [46, 54, 16], [54, 63, 21], [64, 74, 26]];
const BAND_PALETTE = [[86, 66, 22], [98, 77, 25], [108, 85, 33], [122, 92, 34], [134, 100, 40]];
const GAP_COLOR = [20, 26, 6];
const RIM_LIGHT = [205, 138, 32];
const RIM_DARK = [140, 72, 4];

document.addEventListener("DOMContentLoaded", function () {
    const scene = document.querySelector(".about-scene");
    if (scene === null) return;
    const canvas = scene.querySelector(".climb-canvas");
    const slot = scene.querySelector(".climb-slot");
    const ctx = canvas.getContext("2d");

    const pillar = document.createElement("canvas");
    const pctx = pillar.getContext("2d");

    function loadImage(src) {
        return new Promise(function (resolve, reject) {
            const img = new Image();
            img.onload = function () { resolve(img); };
            img.onerror = reject;
            img.src = src;
        });
    }

    function shadeIndex(r, g, b, a) {
        if (a === 0) return -1;
        if (r + g + b < 30) return -2;
        const lum = r + g;
        if (lum < 240) return 0;
        if (lum < 257) return 1;
        if (lum < 280) return 2;
        if (lum < 320) return 3;
        return 4;
    }

    function indexesOf(img) {
        const c = document.createElement("canvas");
        c.width = img.width;
        c.height = img.height;
        const cc = c.getContext("2d");
        cc.drawImage(img, 0, 0);
        const data = cc.getImageData(0, 0, img.width, img.height).data;
        const out = new Int8Array(img.width * img.height);
        for (let i = 0; i < out.length; i++) {
            out[i] = shadeIndex(data[i * 4], data[i * 4 + 1], data[i * 4 + 2], data[i * 4 + 3]);
        }
        return out;
    }

    Promise.all([
        loadImage("assets/climb-vines.png"),
        loadImage("assets/climb-depth.png"),
        loadImage("assets/climb-leaves-big.png"),
        loadImage("assets/climb-flower.png"),
        loadImage("assets/climb-leaf.png"),
        loadImage("assets/climb-petal.png")
    ]).then(function (images) {
        start(indexesOf(images[0]), indexesOf(images[1]), indexesOf(images[2]), images[3], images[4], images[5]);
    }).catch(function () { });

    function start(bandTex, depthTex, leafTex, flowerImg, leafImg, petalImg) {
        let W = 0;
        let H = 0;
        let R = 0;
        let D = 0;
        let cx = 0;
        let rot = 0;
        let image = null;
        let angles = [];
        let flowers = [];
        let leaves = [];
        let petals = [];
        const rim = [];
        const seam = [];

        for (let y = 0; y < TILE; y++) {
            let bump = 1.6 + Math.sin(y * 0.11) * 1.2 + Math.sin(y * 0.37 + 1.3) * 0.8;
            if (bandTex[y * TILE] > 2) bump += 1;
            rim.push(Math.max(0, Math.round(bump)));
            seam.push(BAND_EDGE + Math.sin(y * 0.07) * 0.035 + (bandTex[y * TILE + 40] - 2) * 0.012);
        }

        function layout() {
            const sceneBox = scene.getBoundingClientRect();
            const slotBox = slot.getBoundingClientRect();
            W = Math.ceil(sceneBox.width / CLIMB_SCALE);
            H = Math.ceil(sceneBox.height / CLIMB_SCALE);
            canvas.width = W;
            canvas.height = H;
            cx = Math.round((slotBox.left - sceneBox.left + slotBox.width / 2) / CLIMB_SCALE);
            R = Math.floor(slotBox.width / CLIMB_SCALE / 2) - LEAF_ROOM;
            if (R < 20) R = 20;
            D = R * 2;
            pillar.width = D;
            pillar.height = H;
            image = pctx.createImageData(D, H);

            angles = [];
            for (let x = 0; x < D; x++) {
                angles.push(Math.asin((x + 0.5 - R) / R));
            }

            flowers = [];
            for (let i = 0; i * FLOWER_GAP < H; i++) {
                flowers.push({ a: i * 2.39996, y: i * FLOWER_GAP + (i * 7) % 11 });
            }
            leaves = [];
            for (let i = 0; i * LEAF_GAP < H; i++) {
                leaves.push({ a: i * 1.7 + 0.8, y: i * LEAF_GAP + 13 });
            }
            petals = [];
            for (let i = 0; i < PETAL_COUNT; i++) {
                petals.push(newPetal(true));
            }
        }

        function newPetal(anywhere) {
            const p = {
                x: Math.random() * W,
                y: Math.random() * H,
                vx: -(0.25 + Math.random() * 0.45),
                vy: 0.18 + Math.random() * 0.3,
                frame: Math.floor(Math.random() * 5),
                tick: 0,
                speed: 4 + Math.floor(Math.random() * 5)
            };
            if (!anywhere) {
                if (Math.random() < 0.5) {
                    p.x = W + 10;
                } else {
                    p.y = -10;
                }
            }
            return p;
        }

        function mod(n, m) {
            return ((n % m) + m) % m;
        }

        function put(out, o, color) {
            out[o] = color[0];
            out[o + 1] = color[1];
            out[o + 2] = color[2];
            out[o + 3] = 255;
        }

        function drawPillar() {
            const out = image.data;
            const turn = rot * R;
            for (let y = 0; y < H; y++) {
                const ty = y % TILE;
                const edge = rim[ty];
                const bandStart = seam[ty] * R;
                for (let x = 0; x < D; x++) {
                    const o = (y * D + x) * 4;
                    const dist = Math.abs(x + 0.5 - R);
                    if (dist > R - edge) {
                        out[o + 3] = 0;
                        continue;
                    }
                    if (dist > R - edge - 1) {
                        put(out, o, RIM_LIGHT);
                        continue;
                    }
                    if (dist > R - edge - 2) {
                        put(out, o, RIM_DARK);
                        continue;
                    }

                    const u = Math.floor(angles[x] * R + turn);
                    const col = mod(u, TILE);
                    let inBand = dist > bandStart;
                    if (Math.abs(dist - bandStart) < 1.5 && (x + y) % 2 === 0) inBand = !inBand;

                    if (inBand) {
                        const k = bandTex[ty * TILE + col];
                        put(out, o, BAND_PALETTE[Math.max(0, k)]);
                        continue;
                    }

                    const leafK = leafTex[mod(y + 50, TILE) * TILE + mod(u + 70, TILE)];
                    if (leafK >= 0) {
                        put(out, o, CENTER_PALETTE[Math.min(4, leafK + 1)]);
                        continue;
                    }
                    const k = depthTex[ty * TILE + col];
                    if (k === -2) {
                        put(out, o, GAP_COLOR);
                    } else {
                        put(out, o, CENTER_PALETTE[Math.max(0, k - 1)]);
                    }
                }
            }
            pctx.putImageData(image, 0, 0);
        }

        function frameFor(angle, frames) {
            return mod(Math.round(angle / (Math.PI * 2) * frames), frames);
        }

        function drawDecor(back) {
            leaves.forEach(function (leaf) {
                const a = leaf.a - rot;
                const front = Math.cos(a);
                if (back !== (front < 0)) return;
                if (front < -0.3) return;
                const x = Math.round(cx + Math.sin(a) * (R + 2)) - 11;
                ctx.drawImage(leafImg, frameFor(a, 24) * 22, 0, 22, 20, x, leaf.y - 10, 22, 20);
            });
            flowers.forEach(function (flower) {
                const a = flower.a - rot;
                const front = Math.cos(a);
                if (back !== (front < 0)) return;
                if (front < -0.3) return;
                const x = Math.round(cx + Math.sin(a) * R) - 10;
                ctx.drawImage(flowerImg, frameFor(a, 24) * 20, 0, 20, 20, x, flower.y - 10, 20, 20);
            });
        }

        function drawPetals(move) {
            petals.forEach(function (p, i) {
                if (move) {
                    p.x += p.vx;
                    p.y += p.vy;
                    p.tick++;
                    if (p.tick >= p.speed) {
                        p.tick = 0;
                        p.frame = (p.frame + 1) % 5;
                    }
                    if (p.x < -20 || p.y > H + 20) petals[i] = newPetal(false);
                }
                ctx.drawImage(petalImg, p.frame * 20, 0, 20, 20, Math.round(p.x), Math.round(p.y), 20, 20);
            });
        }

        function render(move) {
            ctx.clearRect(0, 0, W, H);
            drawDecor(true);
            drawPillar();
            ctx.drawImage(pillar, cx - R, 0);
            drawDecor(false);
            drawPetals(move);
        }

        layout();
        render(false);

        const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        let visible = true;
        let last = 0;

        function loop(now) {
            requestAnimationFrame(loop);
            if (!visible || now - last < 1000 / CLIMB_FPS) return;
            const step = Math.min(now - last, 100) / 1000;
            last = now;
            rot += (Math.PI * 2 / SPIN_SECONDS) * step;
            render(true);
        }

        if (!still) {
            requestAnimationFrame(loop);
            if ("IntersectionObserver" in window) {
                new IntersectionObserver(function (entries) {
                    visible = entries[0].isIntersecting;
                }).observe(scene);
            }
        }

        let resizeTimer = null;
        function relayout() {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function () {
                layout();
                render(false);
            }, 120);
        }
        if ("ResizeObserver" in window) {
            new ResizeObserver(relayout).observe(scene);
        } else {
            window.addEventListener("resize", relayout);
        }
    }
});
