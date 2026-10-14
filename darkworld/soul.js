/* =========================================================
   soul.js — menu sounds for the SOUL heart cursor
   ---------------------------------------------------------
   Moving onto a nav link / menu option  -> "move" blip
   Clicking it                            -> "select" sound
   Uses the shared sound card in audio.js (load that first).

   Sounds: snd_menumove.wav and snd_select.wav from your
   exported sound folder.
   ========================================================= */

const SOUL_TARGETS = "nav ul li a, .soul-option";
const MOVE_SOUND = "assets/sounds/snd_menumove.wav";
const SELECT_SOUND = "assets/sounds/snd_select.wav";
const MENU_VOLUME = 0.5;

let moveBuffer = null;
let selectBuffer = null;
let lastHovered = null;

loadSound(MOVE_SOUND).then(function (buffer) {
    moveBuffer = buffer;
}).catch(function () { /* no sound file: menus still work, silently */ });

loadSound(SELECT_SOUND).then(function (buffer) {
    selectBuffer = buffer;
}).catch(function () { /* same */ });

function playMenuSound(buffer) {
    // before the first tap/click, the browser blocks sound — just skip it
    if (buffer === null || audioIsBlocked()) return;
    playSound(buffer, MENU_VOLUME);
}

// Mouse moves onto a new option -> move blip (once, not for every pixel)
document.addEventListener("mouseover", function (event) {
    const target = event.target.closest(SOUL_TARGETS);
    if (target === lastHovered) return;
    lastHovered = target;
    if (target !== null) playMenuSound(moveBuffer);
});

// Tab key moves onto an option -> move blip
document.addEventListener("focusin", function (event) {
    if (event.target.matches(SOUL_TARGETS) && event.target.matches(":focus-visible")) {
        playMenuSound(moveBuffer);
    }
});

// Click / tap / Enter on an option -> select sound
document.addEventListener("click", function (event) {
    if (event.target.closest(SOUL_TARGETS) !== null) {
        playMenuSound(selectBuffer);
    }
});
