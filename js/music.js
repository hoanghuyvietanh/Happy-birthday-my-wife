/* Phát nhạc nền cho cả 3 trang.
   - Trình duyệt thường chặn tự phát có tiếng, nên nếu bị chặn thì nhạc sẽ phát ở lần chạm/bấm đầu tiên.
   - Nhớ vị trí đang nghe để sang trang khác nhạc không bắt đầu lại từ đầu. */
(function () {
    var audio = document.getElementById("player");
    if (!audio) return;

    var KEY = "bd-music-time";
    var events = ["pointerdown", "keydown", "touchend"];

    try {
        var saved = parseFloat(sessionStorage.getItem(KEY));
        if (saved > 0) {
            audio.addEventListener(
                "loadedmetadata",
                function () {
                    if (saved < audio.duration - 1) audio.currentTime = saved;
                },
                { once: true }
            );
        }
    } catch (e) {}

    window.addEventListener("pagehide", function () {
        try {
            sessionStorage.setItem(KEY, String(audio.currentTime));
        } catch (e) {}
    });

    function cleanup() {
        events.forEach(function (name) {
            window.removeEventListener(name, unlock, true);
        });
    }

    function unlock() {
        var p = audio.play();
        if (p && p.then) p.then(cleanup).catch(function () {});
    }

    events.forEach(function (name) {
        window.addEventListener(name, unlock, true);
    });
    unlock();
})();
