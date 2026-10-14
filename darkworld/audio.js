const AudioContextClass = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContextClass();

const musicGain = audioCtx.createGain();
musicGain.connect(audioCtx.destination);

if (navigator.audioSession) {
    navigator.audioSession.type = "playback";
}

const CAN_PLAY_OGG = new Audio().canPlayType('audio/ogg; codecs="vorbis"') !== "";

const loadedSounds = {};

function loadSound(url) {
    if (!loadedSounds[url]) {
        loadedSounds[url] = fetch(url)
            .then(function (response) {
                return response.arrayBuffer();
            })
            .then(function (data) {
                return new Promise(function (resolve, reject) {
                    audioCtx.decodeAudioData(data, resolve, reject);
                });
            });
    }
    return loadedSounds[url];
}

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

function audioIsBlocked() {
    return audioCtx.state !== "running";
}

function unlockAudio() {
    if (audioIsBlocked()) {
        audioCtx.resume();
        playSound(audioCtx.createBuffer(1, 1, 22050), 0);
    }
}

document.addEventListener("pointerup", unlockAudio);
document.addEventListener("touchend", unlockAudio);
document.addEventListener("click", unlockAudio);
document.addEventListener("keydown", unlockAudio);
