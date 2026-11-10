/* Trang chúc mừng sinh nhật: mở quà, cây tình yêu, đồng hồ, nhạc, xem ảnh lớn */
(function () {
    'use strict';

    /* ============================================================
       CÀI ĐẶT: đổi ngày yêu nhau ở đây (năm-tháng-ngày, giờ Việt Nam)
       ============================================================ */
    var START = new Date('2022-02-01T00:00:00+07:00');

    var root = document.documentElement;
    var $ = function (id) { return document.getElementById(id); };
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- Nhạc ---------- */
    var song = $('song');
    var musicBtn = $('music');

    function syncMusic() {
        var on = !song.paused;
        musicBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
        musicBtn.setAttribute('aria-label', on ? 'Tắt nhạc' : 'Bật nhạc');
    }
    function playMusic() {
        var p = song.play();
        if (p && p.catch) p.catch(function () { /* trình duyệt chặn: người xem bấm nút nhạc */ });
    }
    musicBtn.addEventListener('click', function () {
        if (song.paused) playMusic(); else song.pause();
    });
    song.addEventListener('play', syncMusic);
    song.addEventListener('pause', syncMusic);
    syncMusic();

    /* ---------- Màn mở đầu: hạt giống và cây ---------- */
    var stage = $('stage');
    var canvas = $('tree');
    var seed = $('seed');
    var topnav = $('topnav');
    var topbar = $('topbar');
    var opened = false;

    var tree = LoveTree(canvas, {
        ambient: !reduceMotion,
        onBloom: function () { stage.classList.add('is-bloomed'); },
        onDone: function () {
            stage.classList.add('is-done');
            root.classList.remove('is-locked');
            topnav.classList.add('is-on');
        }
    });

    function placeSeed() {
        var b = tree.base();
        var icon = seed.querySelector('svg');
        seed.style.left = b.x + 'px';
        seed.style.top = '0px';
        // đặt tâm trái tim đúng vào gốc cây
        var sr = seed.getBoundingClientRect(), ir = icon.getBoundingClientRect();
        var centre = (ir.top - sr.top) + ir.height / 2;
        seed.style.top = (b.y - centre) + 'px';
    }
    function relayout() { tree.layout(); placeSeed(); }

    relayout();
    window.addEventListener('resize', relayout);
    window.addEventListener('orientationchange', relayout);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeSeed);

    if (reduceMotion) {
        stage.classList.add('is-open');
        tree.showFinal();
    } else {
        root.classList.add('is-locked');
    }

    seed.addEventListener('click', function () {
        if (opened) return;
        opened = true;
        playMusic();
        stage.classList.add('is-sprouting');
        setTimeout(function () {
            stage.classList.add('is-open');
            tree.start();
        }, 650);
    });

    // Chạm khi cây đang mọc: tua nhanh. Chạm sau khi nở xong: thả tim.
    stage.addEventListener('pointerdown', function (e) {
        if (!opened || e.target.closest('a, button')) return;
        if (tree.isGrowing()) tree.speedUp();
        else if (tree.isDone()) {
            var r = canvas.getBoundingClientRect();
            tree.burst(e.clientX - r.left, e.clientY - r.top);
        }
    });

    // Chỉ vẽ khi màn mở đầu còn nhìn thấy
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
            if (entries[0].isIntersecting) tree.resume(); else tree.pause();
        }).observe(stage);
    }

    // Thanh trên cùng đậm lên khi cuộn qua màn mở đầu
    function onScroll() {
        topbar.classList.toggle('is-solid', window.scrollY > stage.offsetHeight * 0.7);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    /* ---------- Đồng hồ ngày yêu nhau ---------- */
    var el = {
        days: $('c-days'), y: $('c-y'), m: $('c-m'), d: $('c-d'),
        h: $('c-h'), i: $('c-i'), s: $('c-s')
    };
    function pad(n) { return n < 10 ? '0' + n : String(n); }
    function groupThousands(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }

    function tick() {
        var now = Date.now();
        var total = Math.max(0, Math.floor((now - START.getTime()) / 86400000));

        // Tính theo lịch giờ Việt Nam (UTC+7) để ai mở cũng thấy cùng một số
        var OFFSET = 7 * 3600000;
        var a = new Date(START.getTime() + OFFSET), b = new Date(Math.max(now, START.getTime()) + OFFSET);
        var Y = b.getUTCFullYear() - a.getUTCFullYear();
        var M = b.getUTCMonth() - a.getUTCMonth();
        var D = b.getUTCDate() - a.getUTCDate();
        var h = b.getUTCHours() - a.getUTCHours();
        var mi = b.getUTCMinutes() - a.getUTCMinutes();
        var se = b.getUTCSeconds() - a.getUTCSeconds();
        if (se < 0) { se += 60; mi--; }
        if (mi < 0) { mi += 60; h--; }
        if (h < 0) { h += 24; D--; }
        if (D < 0) { D += new Date(Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), 0)).getUTCDate(); M--; }
        if (M < 0) { M += 12; Y--; }

        el.days.textContent = groupThousands(total);
        el.y.textContent = Y; el.m.textContent = M; el.d.textContent = D;
        el.h.textContent = pad(h); el.i.textContent = pad(mi); el.s.textContent = pad(se);
    }
    tick();
    setInterval(tick, 1000);

    /* ---------- Xem ảnh lớn ---------- */
    var shots = Array.prototype.slice.call(document.querySelectorAll('.shot'));
    var dlg = $('lightbox');
    var lbImg = $('lb-img');
    var lbCount = $('lb-count');
    var idx = 0;

    function show(i) {
        idx = (i + shots.length) % shots.length;
        var shot = shots[idx];
        var full = shot.getAttribute('data-full');
        var thumb = shot.querySelector('img');
        lbImg.alt = thumb.alt;
        lbImg.src = thumb.currentSrc || thumb.src;         // hiện ảnh nhỏ ngay, rồi thay bằng ảnh lớn
        lbImg.classList.add('is-swap');
        var big = new Image();
        big.onload = function () {
            if (shots[idx] !== shot) return;
            lbImg.src = full;
            lbImg.classList.remove('is-swap');
        };
        big.onerror = function () { lbImg.classList.remove('is-swap'); };
        big.src = full;
        lbCount.textContent = (idx + 1) + ' / ' + shots.length;
        // tải trước ảnh kế bên
        [1, -1].forEach(function (d) {
            var n = shots[(idx + d + shots.length) % shots.length];
            (new Image()).src = n.getAttribute('data-full');
        });
    }
    function openBox(i) {
        show(i);
        if (!dlg.open) dlg.showModal();
        root.classList.add('is-lightbox');
    }
    shots.forEach(function (btn, i) {
        btn.addEventListener('click', function () { openBox(i); });
    });
    $('lb-close').addEventListener('click', function () { dlg.close(); });
    $('lb-prev').addEventListener('click', function () { show(idx - 1); });
    $('lb-next').addEventListener('click', function () { show(idx + 1); });
    dlg.addEventListener('close', function () { root.classList.remove('is-lightbox'); });
    dlg.addEventListener('click', function (e) {
        if (e.target === dlg) dlg.close();               // bấm vào nền tối để đóng
    });
    dlg.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowLeft') show(idx - 1);
        else if (e.key === 'ArrowRight') show(idx + 1);
    });

    // Vuốt trái phải trên điện thoại
    var sx = null, sy = 0;
    dlg.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'mouse') return;
        sx = e.clientX; sy = e.clientY;
    });
    dlg.addEventListener('pointerup', function (e) {
        if (sx === null) return;
        var dx = e.clientX - sx, dy = e.clientY - sy;
        sx = null;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) show(idx + (dx < 0 ? 1 : -1));
    });
    dlg.addEventListener('pointercancel', function () { sx = null; });
})();
