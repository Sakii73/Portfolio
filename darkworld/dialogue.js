/* =========================================================
   dialogue.js — Undertale-style dialogue box with your face
   ---------------------------------------------------------
   Click the Undertale Sepia box, its GameJolt picture, or its
   project card -> a text box opens with your portrait as the
   face, typing each line with a text blip per letter.

   If a line doesn't fit in the box, it's split automatically:
   the box clears and the rest continues on the next page.

     OK / click the box / Enter / Z = finish typing, next page, or close
     Esc                            = close
   ========================================================= */

// What the box says. Each "* ..." is one message; long ones are
// split into extra pages automatically.
const DIALOGUE = [
    "* The GameJolt link for Undertale Sepia is coming soon.",
    "* It'll be published soon! Stay determined."
];
const FACE_IMAGE = "assets/portrait.png";
const TEXT_SOUND = "assets/sounds/snd_text.wav";
const TEXT_VOLUME = 0.5;
const TYPE_SPEED = 35;       // ms per letter

document.addEventListener("DOMContentLoaded", function () {
    // ---- Build the box ----
    // <div class="ut-shade">
    //   <div class="ut-box">
    //     <div class="ut-row"> <img class="ut-face"> <p class="ut-text">...</p> </div>
    //     <div class="ut-actions"> <button class="ut-ok">OK</button> </div>
    //   </div>
    // </div>
    const shade = document.createElement("div");
    shade.className = "ut-shade";

    const box = document.createElement("div");
    box.className = "ut-box";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-live", "polite");

    const row = document.createElement("div");
    row.className = "ut-row";

    const face = document.createElement("img");
    face.className = "ut-face";
    face.src = FACE_IMAGE;
    face.alt = "";

    const text = document.createElement("p");
    text.className = "ut-text";
    const typedPart = document.createElement("span");
    const hiddenPart = document.createElement("span");
    hiddenPart.className = "ut-hidden";   // invisible rest of the line, so words don't jump while typing
    text.appendChild(typedPart);
    text.appendChild(hiddenPart);

    const actions = document.createElement("div");
    actions.className = "ut-actions";
    const okButton = document.createElement("button");
    okButton.className = "ut-ok";
    okButton.type = "button";
    okButton.textContent = "OK";
    actions.appendChild(okButton);

    row.appendChild(face);
    row.appendChild(text);
    box.appendChild(row);
    box.appendChild(actions);
    shade.appendChild(box);
    document.body.appendChild(shade);

    const blip = new Audio(TEXT_SOUND);
    blip.preload = "auto";
    blip.volume = TEXT_VOLUME;

    let pages = [];
    let page = 0;
    let isOpen = false;
    let typing = false;
    let timer = null;
    let openedBy = null;

    function playBlip() {
        blip.currentTime = 0;          // restart it, like the game does
        blip.play().catch(function () {});
    }

    function showLetters(line, count) {
        typedPart.textContent = line.substring(0, count);
        hiddenPart.textContent = line.substring(count);
    }

    // Split one message into pages that fit inside the text area.
    // Adds words one at a time; when the text would overflow the box,
    // that's the end of the page and a new page starts.
    function splitIntoPages(message) {
        const words = message.split(" ");
        const result = [];
        let current = "";
        for (let i = 0; i < words.length; i++) {
            let attempt = words[i];
            if (current !== "") attempt = current + " " + words[i];
            showLetters(attempt, attempt.length);
            if (text.scrollHeight > text.clientHeight + 1 && current !== "") {
                result.push(current);       // full: this page is done
                current = words[i];         // the word that didn't fit starts the next page
            } else {
                current = attempt;
            }
        }
        if (current !== "") result.push(current);
        return result;
    }

    function typePage() {
        const line = pages[page];
        let count = 0;
        typing = true;
        showLetters(line, 0);

        timer = setInterval(function () {
            count++;
            showLetters(line, count);
            const letter = line.charAt(count - 1);
            if (letter !== " " && letter !== "*") playBlip();
            if (count >= line.length) {
                clearInterval(timer);
                typing = false;
            }
        }, TYPE_SPEED);
    }

    function openDialogue(trigger) {
        if (isOpen) return;
        isOpen = true;
        openedBy = trigger;
        shade.classList.add("show");      // must be visible before measuring

        pages = [];
        DIALOGUE.forEach(function (message) {
            pages = pages.concat(splitIntoPages(message));
        });
        page = 0;
        typePage();
        okButton.focus();
    }

    function closeDialogue() {
        clearInterval(timer);
        typing = false;
        isOpen = false;
        shade.classList.remove("show");
        if (openedBy !== null) openedBy.focus();
    }

    // OK / click / Z / Enter: finish the line, go to the next page, or close
    function advance() {
        if (!isOpen) return;
        if (typing) {
            clearInterval(timer);
            typing = false;
            showLetters(pages[page], pages[page].length);
            return;
        }
        page++;
        if (page < pages.length) {
            typePage();
        } else {
            closeDialogue();
        }
    }

    box.addEventListener("click", advance);   // the OK button is inside the box

    document.addEventListener("keydown", function (event) {
        if (!isOpen) return;
        if (event.key === "Escape") {
            closeDialogue();
            return;
        }
        // Enter on the focused OK button already "clicks" it, so skip it here
        if (event.key === "Enter" && document.activeElement === okButton) return;
        if (event.key === "Enter" || event.key === "z" || event.key === "Z") {
            event.preventDefault();
            advance();
        }
    });

    // ---- Everything that opens the box ----
    const triggers = document.querySelectorAll(".sepia-box, #ch5_trailer img, .sepia-trigger");
    triggers.forEach(function (trigger) {
        trigger.setAttribute("role", "button");
        trigger.setAttribute("tabindex", "0");      // reachable with the Tab key
        trigger.addEventListener("click", function (event) {
            event.preventDefault();
            openDialogue(trigger);
        });
        trigger.addEventListener("keydown", function (event) {
            if (event.key === "Enter" && !isOpen) {
                event.preventDefault();
                openDialogue(trigger);
            }
        });
    });
});
