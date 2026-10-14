/* =========================================================
   dialogue.js — Deltarune Dark World text box
   ---------------------------------------------------------
   Two things open it:
   1. Undertale Sepia (project card, GameJolt picture): your face
      + "link coming soon" lines, then OK.
   2. The save point star in the Contact footer: narration
      (no face), then choices: Email / Copy / Return.

   Each line types out with a blip per letter. If a line doesn't
   fit in the box, it's split automatically onto the next page.

     OK / click the box / Enter / Z = finish typing, next page, or close
     Left / Right                   = move between choices
     Esc                            = close
   ========================================================= */

const EMAIL = "justin.era73@gmail.com";

// Undertale Sepia
const SEPIA_LINES = [
    "* The GameJolt link for Undertale Sepia is coming soon.",
    "* It'll be published soon! Stay determined."
];

// Save point (contact)
const SAVE_LINES = [
    "* (You reached the end of the portfolio.)",
    "* (The thought of working together fills you with determination.)"
];

const FACE_IMAGE = "assets/portrait.png";
const TEXT_SOUND = "assets/sounds/snd_text.wav";
const SAVE_SOUND = "assets/sounds/snd_save.wav";
const TEXT_VOLUME = 0.5;
const SAVE_VOLUME = 0.6;
const TYPE_SPEED = 35;       // ms per letter

document.addEventListener("DOMContentLoaded", function () {
    // ---- Build the box ----
    // <div class="ut-shade">
    //   <div class="ut-box">  (+ 4 corner sparkles)
    //     <div class="ut-row"> <img class="ut-face"> <p class="ut-text">...</p> </div>
    //     <div class="ut-actions"> OK button, or the save point choices </div>
    //   </div>
    // </div>
    const shade = document.createElement("div");
    shade.className = "ut-shade";

    const box = document.createElement("div");
    box.className = "ut-box";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-live", "polite");

    ["tl", "tr", "bl", "br"].forEach(function (corner) {
        const sparkle = document.createElement("span");
        sparkle.className = "dw-corner " + corner;
        box.appendChild(sparkle);
    });

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
    const okButton = makeButton("OK", "ut-ok");

    row.appendChild(face);
    row.appendChild(text);
    box.appendChild(row);
    box.appendChild(actions);
    shade.appendChild(box);
    document.body.appendChild(shade);

    function makeButton(label, className) {
        const button = document.createElement("button");
        button.className = className + " soul-option";   // soul-option = heart cursor (soul.css)
        button.type = "button";
        button.textContent = label;
        return button;
    }

    // sounds, loaded once through audio.js (load it before this file)
    let blip = null;
    let lastBlip = null;
    let saveSound = null;
    loadSound(TEXT_SOUND).then(function (buffer) {
        blip = buffer;
    }).catch(function () { /* no blip: the text still types, just silently */ });
    loadSound(SAVE_SOUND).then(function (buffer) {
        saveSound = buffer;
    }).catch(function () { /* same */ });

    let pages = [];
    let page = 0;
    let choices = null;       // null = just an OK button at the end
    let choiceButtons = [];
    let isOpen = false;
    let typing = false;
    let timer = null;
    let openedBy = null;

    function playBlip() {
        if (blip === null) return;
        // stop the previous blip and start a new one, like the game does
        if (lastBlip !== null) {
            try { lastBlip.stop(); } catch (error) { /* already finished */ }
        }
        lastBlip = playSound(blip, TEXT_VOLUME);
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

    // Bottom of the box: OK while reading, the choices on the last page
    function showButtons() {
        actions.innerHTML = "";
        actions.classList.remove("choices");
        choiceButtons = [];
        const lastPage = page === pages.length - 1;

        if (choices !== null && lastPage && !typing) {
            actions.classList.add("choices");
            choices.forEach(function (choice) {
                const button = makeButton(choice.label, "ut-choice");
                button.addEventListener("click", function (event) {
                    event.stopPropagation();       // don't also count as "click the box"
                    choice.action();
                });
                actions.appendChild(button);
                choiceButtons.push(button);
            });
            choiceButtons[0].focus();
        } else {
            actions.appendChild(okButton);
            okButton.focus();
        }
    }

    function finishTyping() {
        clearInterval(timer);
        typing = false;
        showLetters(pages[page], pages[page].length);
        showButtons();
    }

    function typePage() {
        const line = pages[page];
        let count = 0;
        typing = true;
        showLetters(line, 0);
        showButtons();

        timer = setInterval(function () {
            count++;
            showLetters(line, count);
            const letter = line.charAt(count - 1);
            if (letter !== " " && letter !== "*") playBlip();
            if (count >= line.length) finishTyping();
        }, TYPE_SPEED);
    }

    // Start (or restart) the box with new lines
    function say(lines, newChoices) {
        clearInterval(timer);
        choices = newChoices;
        pages = [];
        lines.forEach(function (message) {
            pages = pages.concat(splitIntoPages(message));
        });
        page = 0;
        typePage();
    }

    function openDialogue(trigger, lines, showFace, newChoices) {
        if (isOpen) return;
        isOpen = true;
        openedBy = trigger;
        unlockAudio();                    // this tap also lets the blips play
        if (showFace) {
            face.classList.remove("none");
        } else {
            face.classList.add("none");
        }
        shade.classList.add("show");      // must be visible before measuring
        say(lines, newChoices);
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
            finishTyping();
            return;
        }
        if (choiceButtons.length > 0) return;   // waiting for a choice
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

        // Left / Right moves the heart between choices
        const index = choiceButtons.indexOf(document.activeElement);
        if (choiceButtons.length > 0 && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
            event.preventDefault();
            let next = index + 1;
            if (event.key === "ArrowLeft") next = index - 1;
            if (next < 0) next = choiceButtons.length - 1;
            if (next >= choiceButtons.length) next = 0;
            choiceButtons[next].focus();
            return;
        }

        // Enter on a focused button already "clicks" it, so skip it here
        if (event.key === "Enter" && document.activeElement.tagName === "BUTTON") return;
        if (event.key === "z" || event.key === "Z" || event.key === "Enter") {
            event.preventDefault();
            if (index >= 0) {
                choiceButtons[index].click();   // Z picks the highlighted choice
            } else {
                advance();
            }
        }
    });

    // ---- 1. Undertale Sepia ----
    const sepiaTriggers = document.querySelectorAll(".sepia-box, #ch5_trailer img, .sepia-trigger");
    sepiaTriggers.forEach(function (trigger) {
        makeClickable(trigger, function () {
            openDialogue(trigger, SEPIA_LINES, true, null);
        });
    });

    // ---- 2. Save point ----
    const savePoint = document.getElementById("save-point");
    if (savePoint !== null) {
        const saveChoices = [
            {
                label: "Email",
                action: function () {
                    closeDialogue();
                    window.location.href = "mailto:" + EMAIL;
                }
            },
            {
                label: "Copy",
                action: function () {
                    copyEmail();
                }
            },
            {
                label: "Return",
                action: function () {
                    closeDialogue();
                }
            }
        ];
        makeClickable(savePoint, function () {
            openDialogue(savePoint, SAVE_LINES, false, saveChoices);
        });
    }

    // "Copy": put the email on the clipboard, play the save sound
    function copyEmail() {
        function done() {
            if (saveSound !== null) playSound(saveSound, SAVE_VOLUME);
            say(["* (" + EMAIL + " was saved to your clipboard.)"], null);
        }
        function failed() {
            say(["* (Couldn't copy it. The email is " + EMAIL + ")"], null);
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(EMAIL).then(done, failed);
        } else {
            failed();
        }
    }

    // click, or Enter when focused with Tab
    function makeClickable(element, open) {
        if (element.tagName !== "BUTTON") {
            element.setAttribute("role", "button");
            element.setAttribute("tabindex", "0");
        }
        element.addEventListener("click", function (event) {
            event.preventDefault();
            open();
        });
        element.addEventListener("keydown", function (event) {
            if (event.key === "Enter" && !isOpen) {
                event.preventDefault();
                open();
            }
        });
    }
});
