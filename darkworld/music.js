/* =========================================================
   music.js — Dark World music (loops forever) + mute button
   ---------------------------------------------------------
   Uses the shared sound card from audio.js (load it first).

   Phones won't play sound until you tap THIS page (a tap on
   the Light World page doesn't count). So if the sound is
   blocked when you arrive, a "Tap anywhere to enter" screen
   shows first; your tap starts the music and replays the
   page's intro from the beginning.
   ========================================================= */

const MUSIC_OGG = "assets/music/dark-world-loop.ogg";
const MUSIC_MP3 = "assets/music/dark-world-loop.mp3";   // copy for iPhones (no .ogg support)
const MUSIC_LENGTH = 168.959854;                       // exact length of the loop, in seconds
const MUSIC_VOLUME = 0.5;                              // 0 to 1
const MUTE_KEY = "darkworld-music-muted";              // remembers your mute choice

let muted = false;

function startMusic() {
    let file = MUSIC_MP3;
    if (CAN_PLAY_OGG) file = MUSIC_OGG;

    return loadSound(file).then(function (buffer) {
        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;            // repeat forever

        // The .ogg loops perfectly as it is. MP3 files get a tiny bit of
        // silence added at the start and end, so for the .mp3 copy, find
        // where the music really starts and loop exactly MUSIC_LENGTH
        // seconds from there (no gap).
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

// Seconds of silence before the first sound in the file.
// (The song itself starts making sound 0.83ms in.)
function findMusicStart(buffer) {
    const samples = buffer.getChannelData(0);
    const limit = Math.min(samples.length, buffer.sampleRate);   // only look at the first second
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

// Smoothly turn the music volume knob (avoids a "click" sound)
function setMusicVolume(value, seconds) {
    const now = audioCtx.currentTime;
    musicGain.gain.cancelScheduledValues(now);
    musicGain.gain.setValueAtTime(musicGain.gain.value, now);
    musicGain.gain.linearRampToValueAtTime(value, now + seconds);
}

// Black "tap to enter" screen, only shown when sound is blocked
function showTapToEnter() {
    const gate = document.createElement("div");
    gate.className = "tap-gate";
    const text = document.createElement("p");
    text.className = "tap-gate-text";
    text.textContent = "* Tap anywhere to enter.";
    gate.appendChild(text);
    document.body.appendChild(gate);

    function enter() {
        unlockAudio();                             // starts the music
        gate.removeEventListener("click", enter);
        document.removeEventListener("keydown", enter);
        gate.classList.add("hide");                // fade the black screen away

        // replay the page's intro (name pop-in, fade-ins) from the start
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

    // Give the browser a moment; if sound is still blocked, ask for a tap
    setTimeout(function () {
        if (audioIsBlocked()) showTapToEnter();
    }, 250);

    button.addEventListener("click", function () {
        // If sound was still blocked, this tap just starts it
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

    // Going back to the Light World: fade the music out with the white light
    const returnButton = document.getElementById("return-to-light");
    if (returnButton !== null) {
        returnButton.addEventListener("click", function () {
            setMusicVolume(0, 0.45);
        });
    }
});
