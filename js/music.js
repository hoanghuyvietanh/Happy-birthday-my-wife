/* Nhạc nền cho cả 3 trang.
   - Trình duyệt thường chặn tự phát có tiếng, nên nếu bị chặn thì nhạc phát ở lần chạm/bấm đầu tiên.
   - Nhớ vị trí đang nghe và việc bạn đã tắt nhạc, để sang trang khác nhạc không bắt đầu lại. */
(function () {
    var audio = document.getElementById("player");
    if (!audio) return;

    var TIME_KEY = "bd-music-time";
    var OFF_KEY = "bd-music-off";
    var events = ["pointerdown", "keydown", "touchend"];
    var userOff = false;

    function read(key) {
        try {
            return sessionStorage.getItem(key);
        } catch (e) {
            return null;
        }
    }
    function write(key, value) {
        try {
            sessionStorage.setItem(key, value);
        } catch (e) {}
    }

    // Nút bật/tắt nhạc
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "music-btn";
    btn.setAttribute("aria-label", "Bật hoặc tắt nhạc");
    btn.title = "Bật hoặc tắt nhạc";
    btn.innerHTML =
        '<svg class="note" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9 3v11.55A4 4 0 1 0 11 18V8h6V3H9z"/></svg>' +
        '<span class="bars" aria-hidden="true"><i></i><i></i><i></i></span>';
    document.body.appendChild(btn);

    audio.addEventListener("play", function () {
        btn.classList.add("on");
    });
    audio.addEventListener("pause", function () {
        btn.classList.remove("on");
    });

    // Nhớ vị trí đang nghe
    var saved = parseFloat(read(TIME_KEY));
    if (saved > 0) {
        audio.addEventListener(
            "loadedmetadata",
            function () {
                if (saved < audio.duration - 1) audio.currentTime = saved;
            },
            { once: true }
        );
    }
    window.addEventListener("pagehide", function () {
        write(TIME_KEY, String(audio.currentTime));
    });

    function cleanup() {
        events.forEach(function (name) {
            window.removeEventListener(name, unlock, true);
        });
    }

    function unlock(e) {
        if (e && btn.contains(e.target)) return; // bấm nút nhạc thì để nút tự xử lý
        var p = audio.play();
        if (p && p.then) p.then(cleanup).catch(function () {});
    }

    btn.addEventListener("click", function () {
        if (audio.paused) {
            userOff = false;
            write(OFF_KEY, "0");
            audio.play().catch(function () {});
        } else {
            userOff = true;
            write(OFF_KEY, "1");
            audio.pause();
        }
    });

    if (read(OFF_KEY) === "1") {
        userOff = true;
        audio.pause();
        return;
    }

    events.forEach(function (name) {
        window.addEventListener(name, unlock, true);
    });
    unlock();
})();
