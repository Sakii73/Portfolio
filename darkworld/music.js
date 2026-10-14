const MUSIC_OGG = "assets/music/dark-world-loop.ogg";
const MUSIC_MP3 = "assets/music/dark-world-loop.mp3";
const MUSIC_LENGTH = 168.959854;
const MUSIC_VOLUME = 0.5;
const MUTE_KEY = "darkworld-music-muted";

let muted = false;

function startMusic() {
    let file = MUSIC_MP3;
    if (CAN_PLAY_OGG) file = MUSIC_OGG;

    return loadSound(file).then(function (buffer) {
        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        let start = 0;
        if (file === MUSIC_MP3) {
            start = findMusicStart(buffer);
            source.loopStart = start;
            source.loopEnd = Math.min(start + MUSIC_LENGTH, buffer.duration);
        }

        source.connect(musicGain);
        source.start(0, start);
    });
}

function findMusicStart(buffer) {
    const samples = buffer.getChannelData(0);
    const limit = Math.min(samples.length, buffer.sampleRate);
    for (let i = 0; i < limit; i++) {
        if (Math.abs(samples[i]) > 0.003) {
            return Math.max(0, i / buffer.sampleRate - 0.00083);
        }
    }
    return 0;
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

function setMusicVolume(value, seconds) {
    const now = audioCtx.currentTime;
    musicGain.gain.cancelScheduledValues(now);
    musicGain.gain.setValueAtTime(musicGain.gain.value, now);
    musicGain.gain.linearRampToValueAtTime(value, now + seconds);
}

function showTapToEnter() {
    const gate = document.createElement("div");
    gate.className = "tap-gate";
    const text = document.createElement("p");
    text.className = "tap-gate-text";
    text.textContent = "* Tap anywhere to enter.";
    gate.appendChild(text);
    document.body.appendChild(gate);

    function enter() {
        unlockAudio();
        gate.removeEventListener("click", enter);
        document.removeEventListener("keydown", enter);
        gate.classList.add("hide");

        if (document.getAnimations) {
            document.getAnimations().forEach(function (animation) {
                if (animation.effect && animation.effect.target !== gate) {
                    animation.currentTime = 0;
                }
            });
        }
        setTimeout(function () {
            gate.remove();
        }, 600);
    }

    gate.addEventListener("click", enter);
    document.addEventListener("keydown", enter);
}

document.addEventListener("DOMContentLoaded", function () {
    const button = document.getElementById("music-toggle");

    muted = loadMuted();
    if (muted) {
        musicGain.gain.value = 0;
    } else {
        musicGain.gain.value = MUSIC_VOLUME;
    }
    updateButton(button);

    startMusic().catch(function (error) {
        console.warn("Dark World music could not load:", error);
    });

    setTimeout(function () {
        if (audioIsBlocked()) showTapToEnter();
    }, 250);

    button.addEventListener("click", function () {
        if (audioIsBlocked()) {
            unlockAudio();
            return;
        }
        muted = !muted;
        saveMuted(muted);
        if (muted) {
            setMusicVolume(0, 0.2);
        } else {
            setMusicVolume(MUSIC_VOLUME, 0.2);
        }
        updateButton(button);
    });

    const returnButton = document.getElementById("return-to-light");
    if (returnButton !== null) {
        returnButton.addEventListener("click", function () {
            setMusicVolume(0, 0.45);
        });
    }
});
