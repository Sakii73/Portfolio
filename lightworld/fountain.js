/* =====================================================================
   fountain.js — Kris makes the Dark Fountain, then we go to the Dark World
   ---------------------------------------------------------------------
   This is a JavaScript port of the GameMaker object you sent
   (Kris making the fountain + obj_fountainball + obj_animation +
   obj_afterimage). Variable names are kept the same as the GML
   (con, alarm[4], ballcon, xballtimer...) so you can compare them
   side by side.

   How it runs, GameMaker-style:
     - ROOM_SPEED steps per second (Deltarune runs at 30).
     - Every step: Alarm -> Step -> built-in motion -> Draw.
     - Everything is drawn on a small canvas (VIEW_H game pixels tall)
       that CSS stretches to fill the screen with sharp pixels.
   ===================================================================== */


// ===== SETTINGS you can change =====
const DARK_WORLD_URL = "../darkworld/";
const ROOM_SPEED = 30;          // game steps per second. 45 = play 1.5x faster
const VIEW_H = 240;             // game view height in pixels (Light World view is 320x240)
const KRIS_Y = 140;             // where Kris stands (top-left of the 40x65 sprite)
const LAND_Y = KRIS_Y + 20;     // GML lands at y >= 120 (20px below where Kris stood)
const FOUNTAIN_STEPS = 165;     // how long the fountain plays before the darkness comes down
const COVER_ACCEL = 0.15;       // how fast the darkness speeds up while covering the page
const SOUND_VOLUME = 0.6;       // 0 = muted, 1 = full

const ASSETS = "assets/";


// ===== GML helpers =====

// random(n): a random number from 0 to n (works with negative n too)
function random(n) {
    return Math.random() * n;
}

// merge_color(c_white, c_black, amount) -> a CSS gray
function mergeWhiteBlack(amount) {
    if (amount < 0) amount = 0;
    if (amount > 1) amount = 1;
    const v = Math.round(255 * (1 - amount));
    return "rgb(" + v + "," + v + "," + v + ")";
}


// ===== Sprites: one PNG strip per GameMaker sprite =====
// xorigin/yorigin = the sprite origin you'd set in GameMaker.
function makeSprite(file, frameW, frameH, frames, xorigin, yorigin) {
    const img = new Image();
    img.src = ASSETS + "fountain/" + file;
    return { img: img, w: frameW, h: frameH, frames: frames, xo: xorigin, yo: yorigin };
}

const spr_kris_make_fountain = makeSprite("spr_kris_make_fountain.png", 40, 65, 26, 0, 0);
const spr_kris_make_fountain_jump = makeSprite("spr_kris_make_fountain_jump.png", 40, 65, 6, 0, 0);
const spr_kris_make_fountain_invert = makeSprite("spr_kris_make_fountain_invert.png", 40, 65, 2, 0, 0);
const spr_kris_make_fountain_flash = makeSprite("spr_kris_make_fountain_flash.png", 9, 9, 2, 4, 4);
const spr_kris_shine = makeSprite("spr_kris_shine.png", 9, 9, 5, 4, 4);
const spr_kris_fountain_ball = makeSprite("spr_kris_fountain_ball.png", 49, 49, 1, 24.5, 24.5);

// image_blend = c_black: canvas can't tint images, so we make a
// black copy of the (white) ball once it has loaded.
let ballBlackCanvas = null;
spr_kris_fountain_ball.img.addEventListener("load", function () {
    const c = document.createElement("canvas");
    c.width = 49;
    c.height = 49;
    const g = c.getContext("2d");
    g.drawImage(spr_kris_fountain_ball.img, 0, 0);
    g.globalCompositeOperation = "source-in";
    g.fillStyle = "#000";
    g.fillRect(0, 0, 49, 49);
    ballBlackCanvas = c;
});


// ===== Sounds =====
function makeSound(file) {
    const a = new Audio(ASSETS + "sounds/" + file);
    a.preload = "auto";
    a.volume = SOUND_VOLUME;
    return a;
}

const snd_fountain_target = makeSound("snd_fountain_target.ogg");
const snd_fountain_make = makeSound("snd_fountain_make.ogg");
const snd_deep_noise = makeSound("snd_deep_noise.ogg");

// snd_play(): play a copy, so the same sound can overlap itself
function snd_play(sound) {
    const copy = sound.cloneNode();
    copy.volume = SOUND_VOLUME;
    copy.play().catch(function () {});
}


// ===== The canvas (our "room") =====
let canvas, ctx, VIEW_W;

// draw_sprite_ext(sprite, subimg, x, y, xscale, yscale, 0, blend, alpha)
// blend: "white" (normal) or "black" (only used for the balls)
function draw_sprite_ext(spr, subimg, x, y, xscale, yscale, blend, alpha) {
    if (alpha <= 0) return;
    if (alpha > 1) alpha = 1;
    let frame = Math.floor(subimg) % spr.frames;
    if (frame < 0) frame += spr.frames;

    let source = spr.img;
    if (blend === "black" && ballBlackCanvas !== null) source = ballBlackCanvas;

    ctx.globalAlpha = alpha;
    ctx.drawImage(
        source,
        frame * spr.w, 0, spr.w, spr.h,                 // which frame in the strip
        x - spr.xo * xscale, y - spr.yo * yscale,       // where (origin-adjusted)
        spr.w * xscale, spr.h * yscale                  // how big
    );
    ctx.globalAlpha = 1;
}

// draw_ellipse(x1, y1, x2, y2, false) — filled
function draw_ellipse(x1, y1, x2, y2, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse((x1 + x2) / 2, (y1 + y2) / 2, Math.abs(x2 - x1) / 2, Math.abs(y2 - y1) / 2, 0, 0, Math.PI * 2);
    ctx.fill();
}


// ===== Instances (like GameMaker instances, kept in arrays) =====
let kris;              // the fountain-making Kris object
let balls = [];        // obj_fountainball (front black + back white)
let animations = [];   // obj_animation  (shine, flashes)
let afterimages = [];  // obj_afterimage (the stretched flash rings)

// GameMaker's built-in movement: friction, then gravity, then move.
function applyMotion(inst) {
    if (inst.friction > 0) {
        const speed = Math.hypot(inst.hspeed, inst.vspeed);
        if (speed > 0) {
            const newSpeed = Math.max(0, speed - inst.friction);
            inst.hspeed *= newSpeed / speed;
            inst.vspeed *= newSpeed / speed;
        }
    }
    if (inst.gravity !== 0) {
        const dir = inst.gravity_direction * Math.PI / 180;   // GM: 90 = up
        inst.hspeed += inst.gravity * Math.cos(dir);
        inst.vspeed -= inst.gravity * Math.sin(dir);
    }
    inst.x += inst.hspeed;
    inst.y += inst.vspeed;
}

// obj_animation: plays once, then instance_destroy() on Animation End
function createAnimation(sprite, x, y, imageSpeed) {
    animations.push({ sprite: sprite, x: x, y: y, image_index: 0, image_speed: imageSpeed });
}

// obj_fountainball — Create event
function createFountainBall(x, y) {
    const ball = {
        x: x,
        y: y,
        size: 0,
        gravity: 0.06 + random(0.02),
        gravity_direction: 85 + random(10),
        friction: 0.05,
        hspeed: -1 + random(2),
        vspeed: -0.5 + random(-1),
        image_xscale: 0.05,
        image_yscale: 0.05,
        back: 0,
        depth: 12,
        image_blend: "black",
        init: 0,
        backball: null,
        dead: false
    };
    balls.push(ball);
    return ball;
}

// obj_fountainball — Draw event
function fountainBallDraw(ball) {
    if (ball.init === 0 && ball.back === 0) {
        const backball = createFountainBall(ball.x, ball.y);
        backball.image_xscale = 0.1;
        backball.image_yscale = 0.1;
        backball.image_blend = "white";
        backball.depth = ball.depth + 1;
        backball.vspeed = ball.vspeed;
        backball.hspeed = ball.hspeed;
        backball.friction = ball.friction;
        backball.gravity = ball.gravity;
        backball.gravity_direction = ball.gravity_direction;
        backball.back = 1;
        ball.backball = backball;
        ball.init = 1;
    }

    ball.size += 0.5;
    ball.image_xscale += 0.01;
    ball.image_yscale += 0.01;
    draw_sprite_ext(spr_kris_fountain_ball, 0, ball.x, ball.y, ball.image_xscale, ball.image_yscale, ball.image_blend, 1);

    if (ball.y <= (-20 - ball.size)) {
        ball.dead = true;
    }
}

// Kris — Create event
function createKris() {
    return {
        x: Math.round(VIEW_W / 2) - 18,   // so cenx (x + 18) is the middle of the screen
        y: KRIS_Y,
        sprite: spr_kris_make_fountain,
        image_index: 0,
        image_speed: 0,
        hspeed: 0,
        vspeed: 0,
        gravity: 0,
        gravity_direction: 270,
        friction: 0,
        depth: 20,          // behind the balls until the jump (GML sets depth = 8 then)
        alarm4: -1,

        con: 50,
        active: 1,
        drawkris: 1,
        balltimer: 0,
        ballcon: 0,
        xballtimer: 0,
        yballtimer: 0,
        inverttimer: 0,
        releasetimer: 0,
        ceilheight: 0,
        ceiltimer: 0,
        blazetimer: 0,
        cenx: 0,
        ceny: 0,
        whitecolor: "#fff",
        fountainStartedAt: -1,  // (website only) step when ballcon 3 began
        covering: false,        // (website only) true = darkness is covering the page
        coverSpeed: 0,
        coveredSteps: 0
    };
}

// Kris — Step event
function krisStep() {
    const k = kris;
    if (k.active !== 1) return;

    if (k.con === 50) {
        k.image_index = 0;
        k.image_speed = 0.1;
        k.con = 51;
        k.alarm4 = 70;
    }
    if (k.con === 52) {
        k.image_speed = 0;
        k.image_index = 7;
        k.con = 53;
        k.alarm4 = 60;
    }
    if (k.con === 53) {
        createAnimation(spr_kris_shine, k.x + 12, k.y + 48, 0.125);
        k.con = 54;
        k.alarm4 = 60;
    }
    if (k.con === 55) {
        k.blazetimer = 0;
        k.image_index = 8;
        k.image_speed = 0.5;
        k.alarm4 = 10;
        k.con = 56;
    }
    if (k.con === 57) {
        k.image_index = 13;
        k.image_speed = 0;
        k.con = 58;
        k.alarm4 = 1;
    }
    if (k.con === 59) {
        k.con = 60;
        k.alarm4 = 10;
    }
    if (k.con === 60 || k.con === 56) {
        snd_play(snd_fountain_target);
        k.blazetimer++;
        createAnimation(spr_kris_make_fountain_flash, (k.x - 40) + (k.blazetimer * 6), k.y + 10 + random(20), 0.5);
    }
    if (k.con === 61) {
        snd_play(snd_fountain_make);
        k.ballcon = 1;
        k.image_index = 14;
        k.image_speed = 0.5;
        k.con = 62;
        k.alarm4 = 6;
    }
    if (k.con === 63) {
        k.image_speed = 0;
        k.image_index += 0.5;
        if (k.image_index >= 19) k.image_index -= 2;
    }
    if (k.con === 64) {
        k.sprite = spr_kris_make_fountain_jump;
        k.image_speed = 0;
        k.image_index = 0;
        k.con = 65;
        k.alarm4 = 90;
    }
    if (k.con === 66) {
        k.depth = 8;
        k.image_index = 1;
        k.vspeed = -8;
        k.hspeed = -1;
        k.gravity = 1;
        k.con = 67;
    }
    if (k.con === 67) {
        // collision_rectangle(bbox...) with obj_fountainball: kick the ball
        const ballcheck = findBallTouchingKris();
        if (ballcheck !== null && ballcheck.back === 0) {
            ballcheck.hspeed += (-4 + random(8));
            ballcheck.vspeed -= random(3);
            ballcheck.backball.hspeed = ballcheck.hspeed;
            ballcheck.backball.vspeed = ballcheck.vspeed;
        }
        if (k.y >= LAND_Y) {
            k.image_index = 2;
            k.vspeed = 0;
            k.hspeed = 0;
            k.gravity = 0;
            k.con = 68;
            k.alarm4 = 60;
        }
    }
    if (k.con === 69) {
        if (k.image_index <= 4) k.image_index += 0.25;
    }
}

// Kris's bounding box (the jump sprite's visible area) vs each ball's box
function findBallTouchingKris() {
    const left = kris.x + 7, top = kris.y + 14, right = kris.x + 34, bottom = kris.y + 56;
    for (let i = 0; i < balls.length; i++) {
        const b = balls[i];
        const r = 24.5 * b.image_xscale;
        if (b.x + r >= left && b.x - r <= right && b.y + r >= top && b.y - r <= bottom) {
            return b;
        }
    }
    return null;
}

// Kris — Draw event (this is where the beam, balls and ceiling happen)
function krisDraw() {
    const k = kris;
    if (k.active !== 1) return;

    if (k.drawkris === 1) {
        draw_sprite_ext(k.sprite, k.image_index, k.x, k.y, 1, 1, "white", 1);
    }

    // --- 1: a thin white line shoots out sideways from Kris's feet ---
    if (k.ballcon === 1) {
        k.xballtimer += (k.xballtimer + 1);
        k.yballtimer++;
        k.balltimer++;
        k.cenx = k.x + 18;
        k.ceny = k.y + 57;
        draw_ellipse(k.cenx - k.xballtimer, k.ceny - 1, k.cenx + k.xballtimer, k.ceny + 1, "#fff");

        if (k.xballtimer >= 80) {
            k.balltimer = 0;
            k.yballtimer = 1;
            k.ballcon = 2;
            k.whitecolor = "#fff";
            setTint("washed");
        }
    }

    // --- 2: the pulsing beam (3s white, then it inverts to black) ---
    if (k.ballcon === 2) {
        k.balltimer++;
        if (k.balltimer > 90) k.inverttimer++;
        if (k.inverttimer >= 90) k.releasetimer++;
        if (k.inverttimer === 1) setTint("night");
        if (k.inverttimer >= 0 && k.inverttimer < 60) {
            k.whitecolor = mergeWhiteBlack(k.inverttimer / 60);
        }

        k.xballtimer *= 0.5;

        if (k.releasetimer <= 0) {
            if (k.xballtimer <= 20) k.xballtimer = 20;
            if (k.xballtimer < (k.yballtimer / 6)) k.xballtimer = k.yballtimer / 6;
            if (k.yballtimer >= 98) k.yballtimer = 99 + random(5);   // the random height = the pulse
            k.yballtimer *= 3;
        } else {
            k.yballtimer *= 3;
            createFountainBall(k.cenx, k.ceny);
            if (k.releasetimer === 1) k.con = 64;
            if (k.releasetimer >= 10) {
                k.ballcon = 3;
                k.fountainStartedAt = stepCount;
                snd_deep_noise.loop = true;
                snd_deep_noise.play().catch(function () {});
            }
        }

        draw_ellipse(k.cenx - k.xballtimer - 2, k.ceny - k.yballtimer, k.cenx + k.xballtimer + 2, k.ceny + 1, "#fff");
        draw_ellipse(k.cenx - k.xballtimer, k.ceny - k.yballtimer, k.cenx + k.xballtimer, k.ceny + 1, k.whitecolor);

        if (k.releasetimer <= 0) {
            if (k.balltimer >= 6) {
                draw_sprite_ext(k.sprite, k.image_index, k.x, k.y, 1, 1, "white", 0.3 - (1 / ((k.balltimer / 2) + 1)));
            }
            if (k.inverttimer >= 1) {
                draw_sprite_ext(spr_kris_make_fountain_invert, k.image_index, k.x, k.y, 1, 1, "white", 1 - (30 / k.inverttimer));
            }
        }

        if (k.releasetimer <= 0) {
            if ((k.balltimer % 5) === 0) {
                afterimages.push({
                    sprite: spr_kris_make_fountain_flash,
                    x: k.cenx - 4,
                    y: k.ceny + 4,
                    image_xscale: 4,
                    image_yscale: 1,      // the GML sets "image_yxscale" (typo), so yscale stays 1
                    image_alpha: 0.8,
                    fadeSpeed: 0.04
                });
            }
        }

        // with (obj_afterimage)
        for (let i = 0; i < afterimages.length; i++) {
            const a = afterimages[i];
            a.image_xscale *= (1.15 + random(0.02));
            a.image_yscale *= (1.05 + random(0.02));
            a.y += 0.4;
            a.x -= 0.4;
        }
    }

    // --- 3: the fountain pours out and darkness gathers at the ceiling ---
    if (k.ballcon === 3) {
        createFountainBall(k.cenx, k.ceny);
        k.ceiltimer++;

        if (k.covering) {
            // (website only) the darkness comes down faster and faster
            // until it has swallowed the whole page
            k.coverSpeed += COVER_ACCEL;
            k.ceilheight += k.coverSpeed;
        } else {
            if (k.ceilheight < 120) k.ceilheight += (Math.sin(k.ceiltimer / 18) + 0.3);
            if (k.ceilheight >= 120) k.ceilheight += 0.5;
        }

        // GML uses 12 balls across a 320px view; this fills any screen width
        const count = Math.ceil((VIEW_W + 80) / 40);
        const span = count * 40;
        const ceilballx = [];
        for (let i = 0; i < count; i++) {
            ceilballx[i] = ((k.ceiltimer + (i * 40)) % span) - 40;
            draw_sprite_ext(spr_kris_fountain_ball, 0, ceilballx[i], (k.ceilheight - 80) + (Math.sin(i + (k.ceiltimer / 8)) * 7), 1.05, 1.05, "white", 1);
        }
        for (let i = 0; i < count; i++) {
            draw_sprite_ext(spr_kris_fountain_ball, 0, ceilballx[i], (k.ceilheight - 80) + (Math.sin(i + (k.ceiltimer / 8)) * 7), 1, 1, "black", 1);
        }

        ctx.fillStyle = "#000";
        ctx.fillRect(-10, -90, VIEW_W + 20, (k.ceilheight - 80) + 90);
    }
}


// ===== One game step: Alarm -> Step -> motion -> Draw =====
let stepCount = 0;
let finished = false;

function gameStep() {
    stepCount++;

    // Alarm[4]: counts down; when it hits 0, con++ (like the GML alarm event)
    if (kris.alarm4 > 0) {
        kris.alarm4--;
        if (kris.alarm4 === 0) {
            kris.alarm4 = -1;
            if (kris.active === 1) kris.con++;
        }
    }

    // Step events
    krisStep();
    for (let i = 0; i < afterimages.length; i++) {
        afterimages[i].image_alpha -= afterimages[i].fadeSpeed;
    }
    afterimages = afterimages.filter(function (a) { return a.image_alpha >= 0; });

    // Built-in motion + image animation
    applyMotion(kris);
    kris.image_index += kris.image_speed;
    for (let i = 0; i < balls.length; i++) applyMotion(balls[i]);
    for (let i = 0; i < animations.length; i++) animations[i].image_index += animations[i].image_speed;
    animations = animations.filter(function (a) { return a.image_index < a.sprite.frames; });   // Animation End

    // Draw events, back to front (higher depth first, like GameMaker)
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    const drawList = [];
    drawList.push({ depth: kris.depth, draw: krisDraw });
    balls.forEach(function (b) {
        drawList.push({ depth: b.depth, draw: function () { fountainBallDraw(b); } });
    });
    drawList.sort(function (a, b) { return b.depth - a.depth; });
    drawList.forEach(function (item) { item.draw(); });
    balls = balls.filter(function (b) { return !b.dead; });

    afterimages.forEach(function (a) {
        draw_sprite_ext(a.sprite, 0, a.x, a.y, a.image_xscale, a.image_yscale, "white", a.image_alpha);
    });
    animations.forEach(function (a) {
        draw_sprite_ext(a.sprite, a.image_index, a.x, a.y, 1, 1, "white", 1);
    });

    // (website only) after the fountain has played a while, the darkness
    // comes down until the whole page is black, then we go to the Dark World
    if (kris.fountainStartedAt > 0 && stepCount - kris.fountainStartedAt > FOUNTAIN_STEPS) {
        kris.covering = true;
    }
    // the ceiling balls hang from (ceilheight - 80); once even the tops of
    // the puffs are below the screen, everything is black
    if (kris.covering && (kris.ceilheight - 80 - 30) > VIEW_H) {
        kris.coveredSteps++;
        if (kris.coveredSteps >= 10) goToDarkWorld();   // hold the black for 1/3 second
    }
}


// ===== Running it =====
let tint;
let lastTime = 0;
let leftover = 0;

function setTint(mode) {
    tint.classList.remove("night", "washed", "black");
    tint.classList.add(mode);
}

// requestAnimationFrame runs ~60 times a second; we only do a game
// step every 1/ROOM_SPEED seconds, so the speed matches the game.
function loop(time) {
    if (finished) return;
    if (lastTime === 0) lastTime = time;
    leftover += time - lastTime;
    lastTime = time;

    const stepMs = 1000 / ROOM_SPEED;
    let steps = 0;
    while (leftover >= stepMs && steps < 5) {
        gameStep();
        leftover -= stepMs;
        steps++;
    }
    requestAnimationFrame(loop);
}

function goToDarkWorld() {
    if (finished) return;
    finished = true;
    window.location.href = DARK_WORLD_URL;
}

function startFountainCutscene() {
    // People who turned off animations in their OS: just go.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        goToDarkWorld();
        return;
    }

    // Size the room: VIEW_H tall, as wide as the screen's shape allows
    VIEW_W = Math.round(VIEW_H * window.innerWidth / window.innerHeight);
    canvas.width = VIEW_W;
    canvas.height = VIEW_H;
    ctx.imageSmoothingEnabled = false;

    kris = createKris();
    balls = [];
    animations = [];
    afterimages = [];
    stepCount = 0;

    document.body.classList.add("cutscene-playing");
    setTint("night");
    requestAnimationFrame(loop);
}


// ===== Setup =====
document.addEventListener("DOMContentLoaded", function () {
    canvas = document.getElementById("fountain-canvas");
    tint = document.getElementById("fountain-tint");
    ctx = canvas.getContext("2d");

    const button = document.getElementById("enter-dark-world");
    button.addEventListener("click", function () {
        button.disabled = true;
        startFountainCutscene();
    });

    // Click anywhere during the cutscene to skip it
    canvas.addEventListener("click", goToDarkWorld);

    // Coming back from the Dark World? Fade in from white.
    if (window.location.search.indexOf("from=dark") !== -1) {
        document.body.classList.add("from-dark");
    }
});
