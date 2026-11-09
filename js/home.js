/* Trang chủ: đồng hồ ngày bên nhau + tim bay */
(function () {
    var clock = document.getElementById("clockHome");
    if (clock) {
        var tick = function () {
            clock.innerHTML = loveElapsed(LOVE_START);
        };
        tick();
        setInterval(tick, 1000);
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    var sky = document.getElementById("hearts");
    var colors = ["#ff8fb3", "#e8336f", "#ffb066", "#c9a7ff", "#ff6b9a"];

    function spawn() {
        if (document.hidden) return;
        var h = document.createElement("span");
        h.className = "heart";
        h.textContent = "♥";
        h.style.left = Math.random() * 100 + "vw";
        h.style.fontSize = 14 + Math.random() * 22 + "px";
        h.style.color = colors[(Math.random() * colors.length) | 0];
        h.style.setProperty("--dx", Math.random() * 140 - 70 + "px");
        h.style.setProperty("--rot", Math.random() * 60 - 30 + "deg");
        h.style.animationDuration = 8 + Math.random() * 7 + "s";
        sky.appendChild(h);
        h.addEventListener("animationend", function () {
            h.remove();
        });
    }

    for (var i = 0; i < 6; i++) setTimeout(spawn, i * 250);
    setInterval(spawn, 850);
})();
