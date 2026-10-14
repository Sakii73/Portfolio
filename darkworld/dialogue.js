const EMAIL = "justin.era73@gmail.com";

const SEPIA_LINES = [
    "* The GameJolt link for Undertale Sepia is coming soon.",
    "* It'll be published soon! Stay determined."
];

const SAVE_LINES = [
    "* (You reached the end of the portfolio.)",
    "* (The thought of working together fills you with determination.)"
];

const FACE_IMAGE = "assets/portrait.png";
const TEXT_SOUND = "assets/sounds/snd_text.wav";
const SAVE_SOUND = "assets/sounds/snd_save.wav";
const TEXT_VOLUME = 0.5;
const SAVE_VOLUME = 0.6;
const TYPE_SPEED = 35;

document.addEventListener("DOMContentLoaded", function () {
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
    hiddenPart.className = "ut-hidden";
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
        button.className = className + " soul-option";
        button.type = "button";
        button.textContent = label;
        return button;
    }

    let blip = null;
    let lastBlip = null;
    let saveSound = null;
    loadSound(TEXT_SOUND).then(function (buffer) {
        blip = buffer;
    }).catch(function () { });
    loadSound(SAVE_SOUND).then(function (buffer) {
        saveSound = buffer;
    }).catch(function () { });

    let pages = [];
    let page = 0;
    let choices = null;
    let choiceButtons = [];
    let isOpen = false;
    let typing = false;
    let timer = null;
    let openedBy = null;

    function playBlip() {
        if (blip === null) return;
        if (lastBlip !== null) {
            try { lastBlip.stop(); } catch (error) { }
        }
        lastBlip = playSound(blip, TEXT_VOLUME);
    }

    function showLetters(line, count) {
        typedPart.textContent = line.substring(0, count);
        hiddenPart.textContent = line.substring(count);
    }

    function splitIntoPages(message) {
        const words = message.split(" ");
        const result = [];
        let current = "";
        for (let i = 0; i < words.length; i++) {
            let attempt = words[i];
            if (current !== "") attempt = current + " " + words[i];
            showLetters(attempt, attempt.length);
            if (text.scrollHeight > text.clientHeight + 1 && current !== "") {
                result.push(current);
                current = words[i];
            } else {
                current = attempt;
            }
        }
        if (current !== "") result.push(current);
        return result;
    }

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
                    event.stopPropagation();
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
        unlockAudio();
        if (showFace) {
            face.classList.remove("none");
        } else {
            face.classList.add("none");
        }
        shade.classList.add("show");
        say(lines, newChoices);
    }

    function closeDialogue() {
        clearInterval(timer);
        typing = false;
        isOpen = false;
        shade.classList.remove("show");
        if (openedBy !== null) openedBy.focus();
    }

    function advance() {
        if (!isOpen) return;
        if (typing) {
            finishTyping();
            return;
        }
        if (choiceButtons.length > 0) return;
        page++;
        if (page < pages.length) {
            typePage();
        } else {
            closeDialogue();
        }
    }

    box.addEventListener("click", advance);

    document.addEventListener("keydown", function (event) {
        if (!isOpen) return;
        if (event.key === "Escape") {
            closeDialogue();
            return;
        }

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

        if (event.key === "Enter" && document.activeElement.tagName === "BUTTON") return;
        if (event.key === "z" || event.key === "Z" || event.key === "Enter") {
            event.preventDefault();
            if (index >= 0) {
                choiceButtons[index].click();
            } else {
                advance();
            }
        }
    });

    const sepiaTriggers = document.querySelectorAll(".sepia-box, #ch5_trailer img, .sepia-trigger");
    sepiaTriggers.forEach(function (trigger) {
        makeClickable(trigger, function () {
            openDialogue(trigger, SEPIA_LINES, true, null);
        });
    });

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
