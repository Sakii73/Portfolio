/* =========================================================
   "Return to the Light World"
   1. Play the revival sound (through audio.js — load it first).
   2. A pixel-art beam of light opens from the middle of the
      screen: a thin glowing line that spreads left and right,
      with stepped glowing edges, shimmer and light specks,
      until the whole screen is white.
   3. Stay white until the sound has finished, then go back.
   ========================================================= */

const LIGHT_WORLD_URL = "../lightworld/?from=dark";
const RETURN_SOUND = "assets/sounds/snd_revival.mp3";
const RETURN_VOLUME = 0.8;

const LIGHT_VIEW_H = 160;     // canvas height in "pixels" (smaller = chunkier pixels)
const GROW_TIME = 1.8;        // seconds for the light to cover the screen
// The soft edge of the light: a few bands, each a bit fainter (pixel-art style
// glow = steps instead of a smooth gradient). 1 = solid white.
const GLOW_STEPS = [0.75, 0.5, 0.3, 0.15];
const GLOW_STEP_WIDTH = 3;    // how wide each band is, in canvas pixels

document.addEventListener("DOMContentLoaded", function () {
    const button = document.getElementById("return-to-light");
    const flash = document.getElementById("light-flash");

    const canvas = document.createElement("canvas");
    flash.appendChild(canvas);
    const ctx = canvas.getContext("2d");

    // load the sound now so it plays instantly on click
    let revival = null;
    loadSound(RETURN_SOUND).then(function (buffer) {
        revival = buffer;
    }).catch(function () {
        // no sound: the return still works, just silently
    });

    let leaving = false;
    let startTime = 0;

    // -1 = left side of the beam, 1 = right side (picked at random)
    function randomSide() {
        if (Math.random() < 0.5) return -1;
        return 1;
    }
    let specks = [];          // little light particles

    function goToLightWorld() {
        window.location.href = LIGHT_WORLD_URL;
    }

    // a white rectangle with some see-through-ness (alpha 0..1)
    function lightRect(x, y, w, h, alpha) {
        ctx.fillStyle = "rgba(255, 255, 255, " + alpha + ")";
        ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    }

    function drawLight(now) {
        const t = (now - startTime) / 1000;           // seconds since the click
        const W = canvas.width;
        const H = canvas.height;
        const centerX = W / 2;
        ctx.clearRect(0, 0, W, H);

        // how open the light is: 0 = a thin line, 1 = whole screen
        let open = t / GROW_TIME;
        if (open > 1) open = 1;
        open = open * open;                           // starts slow, then rushes out

        if (open >= 1) {
            lightRect(0, 0, W, H, 1);                 // fully white: hold it
            if (leaving) requestAnimationFrame(drawLight);
            return;
        }

        const coreHalf = 1 + open * (W / 2 + 20);     // half-width of the solid white part

        // Draw the beam in rows of 4 pixels. Each row's edge wiggles by a
        // pixel or so every frame, which makes the light shimmer.
        for (let y = 0; y < H; y += 4) {
            const wobble = Math.round(Math.random() * 2 - 1);
            // glow bands, faintest/widest first, then the solid core on top
            for (let i = GLOW_STEPS.length - 1; i >= 0; i--) {
                const half = coreHalf + (i + 1) * GLOW_STEP_WIDTH + wobble;
                lightRect(centerX - half, y, half * 2, 4, GLOW_STEPS[i]);
            }
            lightRect(centerX - coreHalf, y, coreHalf * 2, 4, 1);
        }

        // a few bright vertical "rays" flickering just outside the beam
        for (let r = 0; r < 3; r++) {
            const side = randomSide();
            const x = centerX + side * (coreHalf + 2 + Math.random() * GLOW_STEPS.length * GLOW_STEP_WIDTH * 2);
            lightRect(x, 0, 1, H, 0.35);
        }

        // light specks: spawn at the beam's edges, drift outward and up, fade
        for (let s = 0; s < 3; s++) {
            const side = randomSide();
            specks.push({
                x: centerX + side * coreHalf,
                y: Math.random() * H,
                dx: side * (0.3 + Math.random() * 0.8),
                dy: -(0.2 + Math.random() * 0.6),
                life: 1
            });
        }
        specks = specks.filter(function (p) { return p.life > 0; });
        specks.forEach(function (p) {
            p.x += p.dx;
            p.y += p.dy;
            p.life -= 0.03;
            lightRect(p.x, p.y, 1, 1, p.life);
        });

        requestAnimationFrame(drawLight);
    }

    button.addEventListener("click", function () {
        if (leaving) return;
        leaving = true;
        button.disabled = true;
        unlockAudio();

        // size the canvas: LIGHT_VIEW_H pixels tall, same shape as the screen
        canvas.height = LIGHT_VIEW_H;
        canvas.width = Math.round(LIGHT_VIEW_H * window.innerWidth / window.innerHeight);
        flash.classList.add("show");
        startTime = performance.now();
        requestAnimationFrame(drawLight);

        // stay until the sound has finished (at least until the light is full)
        let waitSeconds = GROW_TIME + 0.5;
        if (revival !== null) {
            playSound(revival, RETURN_VOLUME);
            waitSeconds = Math.max(revival.duration, waitSeconds);
        }
        setTimeout(goToLightWorld, waitSeconds * 1000);
    });
});
