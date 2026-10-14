const SOUL_TARGETS = "nav ul li a, .soul-option";
const MOVE_SOUND = "assets/sounds/snd_menumove.wav";
const SELECT_SOUND = "assets/sounds/snd_select.wav";
const MENU_VOLUME = 0.5;

let moveBuffer = null;
let selectBuffer = null;
let lastHovered = null;

loadSound(MOVE_SOUND).then(function (buffer) {
    moveBuffer = buffer;
}).catch(function () { });

loadSound(SELECT_SOUND).then(function (buffer) {
    selectBuffer = buffer;
}).catch(function () { });

function playMenuSound(buffer) {
    if (buffer === null || audioIsBlocked()) return;
    playSound(buffer, MENU_VOLUME);
}

document.addEventListener("mouseover", function (event) {
    const target = event.target.closest(SOUL_TARGETS);
    if (target === lastHovered) return;
    lastHovered = target;
    if (target !== null) playMenuSound(moveBuffer);
});

document.addEventListener("focusin", function (event) {
    if (event.target.matches(SOUL_TARGETS) && event.target.matches(":focus-visible")) {
        playMenuSound(moveBuffer);
    }
});

document.addEventListener("click", function (event) {
    if (event.target.closest(SOUL_TARGETS) !== null) {
        playMenuSound(selectBuffer);
    }
});
