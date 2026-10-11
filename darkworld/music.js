/* =========================================================
   music.js — Dark World music, looping forever
   ---------------------------------------------------------
   Uses the Web Audio API instead of <audio> because it loops
   with no gap between the end and the start.

   Think of it like this:
     AudioContext = the sound card / mixer
     buffer       = a sound file loaded into memory
     source       = one "play" of a buffer
     gainNode     = the volume knob (0 = muted)
   ========================================================= */

const MUSIC_LOOP = "assets/music/dark-world-loop.ogg";
const MUSIC_VOLUME = 0.5;                  // 0 to 1
const MUTE_KEY = "darkworld-music-muted";  // remembers your mute choice

let audioCtx = null;
let gainNode = null;
let muted = false;

// Load a sound file and turn it into a playable buffer
async function loadBuffer(url) {
    const response = await fetch(url);
    const data = await response.arrayBuffer();
    return await audioCtx.decodeAudioData(data);
}

async function startMusic() {
    const loop = await loadBuffer(MUSIC_LOOP);
    const loopSource = audioCtx.createBufferSource();
    loopSource.buffer = loop;
    loopSource.loop = true;          // repeat forever
    loopSource.connect(gainNode);
    loopSource.start();
}

function loadMuted() {
    try {
        return localStorage.getItem(MUTE_KEY) === "true";
    } catch (error) {
        return false;
    }
}

function saveMuted(value) {
    try {
        localStorage.setItem(MUTE_KEY, String(value));
    } catch (error) {
        // can't save — ignore
    }
}

function updateButton(button) {
    if (muted) {
        button.textContent = "Music: Off";
    } else {
        button.textContent = "Music: On";
    }
    button.setAttribute("aria-pressed", String(muted));
}

// Smoothly move the volume knob (avoids a "click" sound)
function setVolume(value, seconds) {
    const now = audioCtx.currentTime;
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(gainNode.gain.value, now);
    gainNode.gain.linearRampToValueAtTime(value, now + seconds);
}

document.addEventListener("DOMContentLoaded", function () {
    const button = document.getElementById("music-toggle");

    audioCtx = new AudioContext();
    gainNode = audioCtx.createGain();
    gainNode.connect(audioCtx.destination);

    muted = loadMuted();
    if (muted) {
        gainNode.gain.value = 0;
    } else {
        gainNode.gain.value = MUSIC_VOLUME;
    }
    updateButton(button);

    startMusic().catch(function (error) {
        console.warn("Dark World music could not load:", error);
    });

    // Browsers may block sound until you click something on the page.
    // If that happened, the first click/key press starts it.
    function unlockAudio() {
        if (audioCtx.state === "suspended") {
            audioCtx.resume();
        }
    }
    document.addEventListener("click", unlockAudio);
    document.addEventListener("keydown", unlockAudio);
    document.addEventListener("touchstart", unlockAudio);

    button.addEventListener("click", function () {
        // If the sound was still blocked, this click just starts it
        if (audioCtx.state === "suspended") {
            audioCtx.resume();
            return;
        }
        muted = !muted;
        saveMuted(muted);
        if (muted) {
            setVolume(0, 0.2);
        } else {
            setVolume(MUSIC_VOLUME, 0.2);
        }
        updateButton(button);
    });

    // Going back to the Light World: fade the music out with the white flash
    const returnButton = document.getElementById("return-to-light");
    if (returnButton !== null) {
        returnButton.addEventListener("click", function () {
            setVolume(0, 0.45);
        });
    }
});
