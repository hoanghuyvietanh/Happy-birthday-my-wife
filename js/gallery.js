/* Trang ảnh: bấm ảnh để xem lớn, chuyển ảnh bằng nút, phím mũi tên hoặc vuốt */
(function () {
    var shots = [].slice.call(document.querySelectorAll(".shot-btn"));
    var lb = document.getElementById("lb");
    var img = lb.querySelector(".lb-img");
    var count = lb.querySelector(".lb-count");
    var closeBtn = lb.querySelector(".lb-x");
    var cur = 0;
    var opener = null;

    function src(i) {
        return shots[i].querySelector("img").getAttribute("src");
    }
    function alt(i) {
        return shots[i].querySelector("img").getAttribute("alt") || "";
    }

    function show(i) {
        cur = (i + shots.length) % shots.length;
        img.src = src(cur);
        img.alt = alt(cur);
        count.textContent = cur + 1 + " / " + shots.length;
        // tải trước ảnh kế bên cho chuyển ảnh mượt
        [cur - 1, cur + 1].forEach(function (n) {
            new Image().src = src((n + shots.length) % shots.length);
        });
    }

    function open(i, from) {
        opener = from || null;
        show(i);
        lb.hidden = false;
        document.body.style.overflow = "hidden";
        closeBtn.focus();
    }

    function close() {
        lb.hidden = true;
        document.body.style.overflow = "";
        if (opener) opener.focus();
    }

    shots.forEach(function (btn, i) {
        btn.addEventListener("click", function () {
            open(i, btn);
        });
    });

    closeBtn.addEventListener("click", close);
    lb.querySelector(".lb-prev").addEventListener("click", function () {
        show(cur - 1);
    });
    lb.querySelector(".lb-next").addEventListener("click", function () {
        show(cur + 1);
    });
    lb.addEventListener("click", function (e) {
        if (e.target === lb) close();
    });

    document.addEventListener("keydown", function (e) {
        if (lb.hidden) return;
        if (e.key === "Escape") close();
        else if (e.key === "ArrowLeft") show(cur - 1);
        else if (e.key === "ArrowRight") show(cur + 1);
    });

    var startX = 0;
    lb.addEventListener(
        "touchstart",
        function (e) {
            startX = e.touches[0].clientX;
        },
        { passive: true }
    );
    lb.addEventListener("touchend", function (e) {
        var dx = e.changedTouches[0].clientX - startX;
        if (Math.abs(dx) > 50) show(cur + (dx < 0 ? 1 : -1));
    });
})();
