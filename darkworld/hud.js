/* =========================================================
   hud.js — makes the battle-HUD parts move
   1. Party panels: each LV bar fills up when it scrolls into view.
      The level comes from data-lv="..." on the panel (0 to 10).
   2. TP meter: fills as you scroll down; 100% shows MAX.
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    // ---- 1. LV bars ----
    const members = document.querySelectorAll(".party-member");

    function fillBar(member) {
        let level = Number(member.getAttribute("data-lv"));
        if (level > 10) level = 10;
        if (level < 0) level = 0;
        member.querySelector(".pm-fill").style.width = (level * 10) + "%";   // LV 7 = 70% full
    }

    if ("IntersectionObserver" in window) {
        const watcher = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    fillBar(entry.target);
                    watcher.unobserve(entry.target);   // only once
                }
            });
        }, { threshold: 0.4 });
        members.forEach(function (member) {
            watcher.observe(member);
        });
    } else {
        members.forEach(fillBar);                  // old browsers: just fill them
    }

    // ---- 2. TP meter ----
    const meter = document.getElementById("tp-meter");
    if (meter === null) return;
    const fill = meter.querySelector(".tp-fill");
    const value = meter.querySelector(".tp-value");

    function updateTP() {
        const scrollable = document.documentElement.scrollHeight - window.innerHeight;
        let percent = 0;
        if (scrollable > 0) percent = Math.round(window.scrollY / scrollable * 100);
        if (percent > 100) percent = 100;
        if (percent < 0) percent = 0;

        fill.style.height = percent + "%";
        if (percent >= 100) {
            value.textContent = "MAX";
            meter.classList.add("max");
        } else {
            value.textContent = percent + "%";
            meter.classList.remove("max");
        }
    }

    window.addEventListener("scroll", updateTP, { passive: true });
    window.addEventListener("resize", updateTP);
    updateTP();
});
