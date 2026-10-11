/* =========================================================
   audio.js — one shared "sound card" for the Dark World page
   ---------------------------------------------------------
   Every sound (music, text blips, the return sound) goes
   through the Web Audio API: each file is loaded ONCE into
   memory, then plays instantly. Phones lag or drop sounds
   when you use lots of <audio> elements instead.

   Phones also block ALL sound until you tap the page, so
   unlockAudio() must be called inside a tap / click / key press.

   Think of it like this:
     audioCtx  = the sound card / mixer
     buffer    = a sound file loaded into memory
     source    = one "play" of a buffer
     gain      = a volume knob (0 = silent, 1 = full)
   ========================================================= */

const AudioContextClass = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContextClass();

// Volume knob for the music (music.js turns it down to mute)
const musicGain = audioCtx.createGain();
musicGain.connect(audioCtx.destination);

// iPhones: keep playing even when the silent switch is on
if (navigator.audioSession) {
    navigator.audioSession.type = "playback";
}

// Can this browser play .ogg? iPhones often can't, so they get the .m4a copy.
const CAN_PLAY_OGG = new Audio().canPlayType('audio/ogg; codecs="vorbis"') !== "";

const loadedSounds = {};

// Load a sound file once; asking again gives back the same result.
function loadSound(url) {
    if (!loadedSounds[url]) {
        loadedSounds[url] = fetch(url)
            .then(function (response) {
                return response.arrayBuffer();
            })
            .then(function (data) {
                // callback style works on old iPhones too
                return new Promise(function (resolve, reject) {
                    audioCtx.decodeAudioData(data, resolve, reject);
                });
            });
    }
    return loadedSounds[url];
}

// Play a loaded sound effect once. Returns it so it can be stopped early.
function playSound(buffer, volume) {
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    const gain = audioCtx.createGain();
    gain.gain.value = volume;
    source.connect(gain);
    gain.connect(audioCtx.destination);
    source.start();
    return source;
}

// true = the browser is still holding the sound back (no tap yet)
function audioIsBlocked() {
    return audioCtx.state !== "running";
}

// Call this inside a tap/click/key press to let sound play
function unlockAudio() {
    if (audioIsBlocked()) {
        audioCtx.resume();
        // older iPhones also need a tiny silent sound played during the tap
        playSound(audioCtx.createBuffer(1, 1, 22050), 0);
    }
}

// Any tap, click or key press on the page unlocks sound
document.addEventListener("pointerup", unlockAudio);
document.addEventListener("touchend", unlockAudio);
document.addEventListener("click", unlockAudio);
document.addEventListener("keydown", unlockAudio);
