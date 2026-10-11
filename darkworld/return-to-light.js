/* =========================================================
   "Return to the Light World"
   1. Play the revival sound.
   2. A white band grows out from the middle of the screen
      to the left and right edges (see return-to-light.css).
   3. Stay white until the sound has finished, then go back.
   ========================================================= */

const LIGHT_WORLD_URL = "../lightworld/?from=dark";
const RETURN_SOUND = "assets/sounds/snd_revival.ogg";
const RETURN_VOLUME = 0.8;

document.addEventListener("DOMContentLoaded", function () {
    const button = document.getElementById("return-to-light");
    const flash = document.getElementById("light-flash");

    // load the sound now so it plays instantly on click
    const sound = new Audio(RETURN_SOUND);
    sound.preload = "auto";
    sound.volume = RETURN_VOLUME;

    let leaving = false;

    function goToLightWorld() {
        window.location.href = LIGHT_WORLD_URL;
    }

    button.addEventListener("click", function () {
        if (leaving) return;
        leaving = true;
        button.disabled = true;

        flash.classList.add("show");     // the white band starts growing

        // When the sound ends, leave. If the sound can't play for some
        // reason, leave anyway so the page never gets stuck on white.
        sound.addEventListener("ended", goToLightWorld);
        sound.play().catch(function () {
            setTimeout(goToLightWorld, 1500);
        });
        setTimeout(goToLightWorld, 7000);
    });
});
