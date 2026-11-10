/* Cây tình yêu: vẽ bằng canvas, không cần thư viện nào.
 *
 *   var tree = LoveTree(canvas, { ambient: true, onBloom: fn, onDone: fn });
 *   tree.layout();   // tính lại kích thước khi cửa sổ đổi
 *   tree.start();    // cây mọc lên và nở hoa
 *   tree.showFinal();// hiện luôn cây đã nở (không hiệu ứng)
 */
(function (global) {
    'use strict';

    // Màu trái tim, đổi ở đây nếu muốn hoa có màu khác
    var PALETTE = ['#ff6f91', '#ff8aa5', '#f2547a', '#ffb0c2', '#ff9db3', '#e64572', '#ff5c86'];
    // Màu thân và cành, từ gốc ra ngọn
    var BARK = ['#d9a384', '#dfae90', '#e6baa0', '#ecc6b0', '#f1d1bf'];

    // Cây được vẽ trong "thế giới" riêng rộng ~600, cao ~760; gốc cây ở (350, 740)
    var WORLD = { half: 290, baseX: 350, baseY: 740, topY: 27 };

    var BLOOM_AT = 4.0;     // giây thứ mấy thì bắt đầu nở hoa
    var HEART_POP = 0.75;   // thời gian một trái tim nở ra

    /* ---------- tiện ích ---------- */
    function rng(seed) {
        return function () {
            seed |= 0; seed = seed + 0x6D2B79F5 | 0;
            var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }
    function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
    function lerp(a, b, t) { return a + (b - a) * t; }
    function easeOutBack(t) { var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }

    function mixWhite(hex, amt) {
        var n = parseInt(hex.slice(1), 16);
        var r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255;
        r = Math.round(r + (255 - r) * amt); g = Math.round(g + (255 - g) * amt); b = Math.round(b + (255 - b) * amt);
        return 'rgb(' + r + ',' + g + ',' + b + ')';
    }

    /* ---------- trái tim (vẽ sẵn 1 lần, dùng lại nhiều lần) ---------- */
    function makeSprite(color) {
        var S = 96, k = S / 80;
        var c = document.createElement('canvas');
        c.width = c.height = S;
        var g = c.getContext('2d');
        g.translate(S / 2, S / 2 - k);
        g.scale(k, k);
        g.beginPath();
        g.moveTo(0, 28);
        g.bezierCurveTo(-8, 20, -32, 6, -32, -9);
        g.bezierCurveTo(-32, -24, -13, -30, 0, -15);
        g.bezierCurveTo(13, -30, 32, -24, 32, -9);
        g.bezierCurveTo(32, 6, 8, 20, 0, 28);
        g.closePath();
        var gr = g.createRadialGradient(-11, -13, 2, -2, 0, 44);
        gr.addColorStop(0, mixWhite(color, 0.5));
        gr.addColorStop(0.45, color);
        gr.addColorStop(1, color);
        g.fillStyle = gr;
        g.fill();
        return c;
    }

    /* ---------- cành cây ---------- */
    function pointAt(b, t) {
        var u = 1 - t;
        return {
            x: u * u * b.p0.x + 2 * u * t * b.p1.x + t * t * b.p2.x,
            y: u * u * b.p0.y + 2 * u * t * b.p1.y + t * t * b.p2.y
        };
    }
    function tangentAngle(b, t) {
        var dx = 2 * (1 - t) * (b.p1.x - b.p0.x) + 2 * t * (b.p2.x - b.p1.x);
        var dy = 2 * (1 - t) * (b.p1.y - b.p0.y) + 2 * t * (b.p2.y - b.p1.y);
        return Math.atan2(dx, -dy); // 0 = hướng lên
    }

    // Tâm và độ rộng của vòm hoa hình trái tim (cùng hệ toạ độ với buildHearts)
    var CROWN = { cx: 350, cy: 292, sx: 236, sy: 212 };

    // Điểm (x, y) có nằm trong vòm hoa không? scale > 1 là nới rộng thêm một chút
    function insideCrown(x, y, scale) {
        var nx = (x - CROWN.cx) / (CROWN.sx * scale), ny = (CROWN.cy - y) / (CROWN.sy * scale);
        var a = nx * nx + ny * ny - 1;
        return a * a * a - nx * nx * ny * ny * ny <= 0;
    }

    function buildBranches(r) {
        var list = [];

        function add(p0, ang, len, w0, depth, t0) {
            var bend = (r() - 0.5) * (depth === 0 ? 0.55 : 0.95);
            var a1 = ang + bend * 0.5, a2 = ang - bend * 0.5 + (r() - 0.5) * 0.2;
            var p1, p2;
            // Cành thứ cấp chỉ được mọc trong vòm hoa: ngọn nằm ngoài thì rút ngắn, quá ngắn thì bỏ
            for (var tryN = 0; ; tryN++) {
                var h = len * 0.5;
                p1 = { x: p0.x + Math.sin(a1) * h, y: p0.y - Math.cos(a1) * h };
                p2 = { x: p1.x + Math.sin(a2) * h, y: p1.y - Math.cos(a2) * h };
                if (depth === 0 || insideCrown(p2.x, p2.y, 1.02)) break;
                if (tryN >= 4) return;
                len *= 0.78;
            }
            var b = { p0: p0, p1: p1, p2: p2, w0: w0, w1: w0 * 0.72, depth: depth, t0: t0, dur: 0.4 + len / 360 * 2.1 };
            list.push(b);
            if (depth >= 4) return;

            var spec;
            if (depth === 0) spec = [0.34, 0.47, 0.6, 0.73, 0.86, 1, 1];
            else if (depth === 1) spec = [0.4, 0.6, 0.8, 1];
            else if (depth === 2) spec = [0.45, 0.75, 1];
            else spec = [0.55, 1];

            var side = r() < 0.5 ? -1 : 1;
            for (var i = 0; i < spec.length; i++) {
                var tt = spec[i];
                var from = pointAt(b, tt);
                var base = tangentAngle(b, tt);
                var ca;
                if (tt >= 1) ca = base + (i % 2 ? 1 : -1) * (0.22 + r() * 0.25);
                else { side = -side; ca = base + side * (0.5 + r() * 0.55); }
                ca = clamp(ca, -1.4, 1.4);
                var cl = len * (tt >= 1 ? 0.7 + r() * 0.1 : 0.58 + r() * 0.14);
                var cw = lerp(b.w0, b.w1, tt) * 0.74;
                add(from, ca, cl, Math.max(cw, 0.9), depth + 1, t0 + b.dur * tt);
            }
        }

        add({ x: WORLD.baseX, y: WORLD.baseY }, 0.02, 350, 19, 0, 0);
        return list;
    }

    /* ---------- vòm hoa hình trái tim ---------- */
    function buildHearts(r) {
        var pts = [], d2 = 0.1 * 0.1, tries = 9000;
        while (tries--) {
            var x = r() * 2.5 - 1.25, y = r() * 2.4 - 1.1;
            var a = x * x + y * y - 1;
            if (a * a * a - x * x * y * y * y > 0) continue;
            var ok = true;
            for (var i = 0; i < pts.length; i++) {
                var dx = pts[i].nx - x, dy = pts[i].ny - y;
                if (dx * dx + dy * dy < d2) { ok = false; break; }
            }
            if (ok) pts.push({ nx: x, ny: y });
        }
        return pts.map(function (p) {
            var wx = WORLD.baseX + p.nx * 236 + (r() - 0.5) * 8;
            var wy = 292 - p.ny * 212 + (r() - 0.5) * 8;
            var dist = Math.sqrt(Math.pow(wx - 350, 2) + Math.pow(wy - 470, 2)) / 330;
            return {
                x: wx, y: wy,
                size: 30 + r() * 16,
                rot: (r() - 0.5) * 1.1,
                sp: Math.floor(r() * PALETTE.length),
                t0: dist * 2.2 + r() * 0.5,
                ph: r() * 6.283
            };
        });
    }

    /* ---------- LoveTree ---------- */
    function LoveTree(canvas, opts) {
        opts = opts || {};
        var ambient = opts.ambient !== false;
        var ctx = canvas.getContext('2d');
        var sprites = PALETTE.map(makeSprite);
        var branches = buildBranches(rng(23));
        var hearts = buildHearts(rng(7));

        var branchEnd = 0, heartsEnd = 0;
        branches.forEach(function (b) { branchEnd = Math.max(branchEnd, b.t0 + b.dur); });
        hearts.forEach(function (h) { heartsEnd = Math.max(heartsEnd, BLOOM_AT + h.t0 + HEART_POP); });
        var TOTAL = Math.max(branchEnd, heartsEnd) + 0.2;

        var state = 'idle';           // idle -> growing -> done
        var time = 0, speed = 1, last = 0, raf = 0;
        var bloomFired = false;
        var W = 0, H = 0, dpr = 1, s = 1, ox = 0, oy = 0, groundY = 0;
        var cache = null;
        var petals = [], bursts = [];
        var rnd = Math.random;

        function layout() {
            var rect = canvas.getBoundingClientRect();
            W = rect.width; H = rect.height;
            dpr = Math.min(2, global.devicePixelRatio || 1);
            canvas.width = Math.max(1, Math.round(W * dpr));
            canvas.height = Math.max(1, Math.round(H * dpr));
            groundY = H * 0.885;
            // chừa chỗ phía trên cho dòng chúc (2 dòng trên điện thoại, 1 dòng trên máy tính)
            var topSpace = W < 640 ? Math.max(140, H * 0.3) : Math.max(200, H * 0.235);
            s = Math.min(W / (WORLD.half * 2), (groundY - topSpace) / (WORLD.baseY - WORLD.topY));
            s = Math.max(s, 0.2);
            ox = W / 2 - WORLD.baseX * s;
            oy = groundY - WORLD.baseY * s;
            cache = null;
            if (state !== 'idle' && !raf) render();
        }

        function base() { return { x: W / 2, y: groundY }; }

        function applyTransform(c) { c.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy); }

        function drawBranches(c, t) {
            c.lineCap = 'round';
            for (var i = 0; i < branches.length; i++) {
                var b = branches[i];
                var p = clamp((t - b.t0) / b.dur, 0, 1);
                if (p <= 0) continue;
                c.strokeStyle = BARK[b.depth];
                var n = Math.max(2, Math.ceil(16 * p));
                var prev = b.p0;
                for (var k = 1; k <= n; k++) {
                    var u = p * k / n;
                    var pt = pointAt(b, u);
                    c.lineWidth = lerp(b.w0, b.w1, u);
                    c.beginPath(); c.moveTo(prev.x, prev.y); c.lineTo(pt.x, pt.y); c.stroke();
                    prev = pt;
                }
            }
        }

        function buildCache() {
            cache = document.createElement('canvas');
            cache.width = canvas.width; cache.height = canvas.height;
            var c = cache.getContext('2d');
            applyTransform(c);
            drawBranches(c, 1e9);
        }

        function drawSprite(sp, x, y, size, rot, alpha) {
            var m = dpr * s * size, cs = Math.cos(rot) * m, sn = Math.sin(rot) * m;
            ctx.globalAlpha = alpha;
            ctx.setTransform(cs, sn, -sn, cs, dpr * (ox + x * s), dpr * (oy + y * s));
            ctx.drawImage(sprites[sp], -0.5, -0.5, 1, 1);
        }

        function render() {
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.globalAlpha = 1;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (state === 'idle') return;

            if (state === 'done') {
                if (!cache) buildCache();
                ctx.drawImage(cache, 0, 0);
            } else {
                applyTransform(ctx);
                drawBranches(ctx, time);
            }

            var t = time - BLOOM_AT, i, h;
            if (t > 0) {
                var breathing = state === 'done' && ambient;
                for (i = 0; i < hearts.length; i++) {
                    h = hearts[i];
                    var p = (t - h.t0) / HEART_POP;
                    if (p <= 0) continue;
                    var sc = easeOutBack(Math.min(1, p));
                    if (breathing) sc *= 1 + 0.04 * Math.sin(time * 1.3 + h.ph);
                    drawSprite(h.sp, h.x, h.y, h.size * sc, h.rot, 1);
                }
            }
            for (i = 0; i < petals.length; i++) {
                var q = petals[i];
                if (q.wait > 0) continue;
                var a = clamp((WORLD.baseY - 40 - q.y) / 90, 0, 1) * clamp(q.age / 0.8, 0, 1);
                drawSprite(q.sp, q.x, q.y, q.size, q.rot, a * 0.9);
            }
            for (i = 0; i < bursts.length; i++) {
                var b = bursts[i];
                drawSprite(b.sp, b.x, b.y, b.size, b.rot, clamp(1 - b.age / b.life, 0, 1));
            }
            ctx.globalAlpha = 1;
        }

        function spawnPetal(q, initial) {
            var h = hearts[Math.floor(rnd() * hearts.length)];
            q.x0 = h.x; q.x = h.x; q.y = h.y;
            q.vy = 22 + rnd() * 24;
            q.amp = 10 + rnd() * 22;
            q.freq = 0.6 + rnd() * 0.8;
            q.ph = rnd() * 6.283;
            q.rot = (rnd() - 0.5) * 1.2;
            q.vr = (rnd() - 0.5) * 0.8;
            q.size = 14 + rnd() * 12;
            q.sp = Math.floor(rnd() * PALETTE.length);
            q.age = 0;
            q.wait = initial ? rnd() * 9 : rnd() * 3;
            return q;
        }

        function update(dt) {
            var i;
            if (state === 'growing') {
                time += dt * speed;
                if (!bloomFired && time >= BLOOM_AT) { bloomFired = true; if (opts.onBloom) opts.onBloom(); }
                if (time >= TOTAL) finish();
            } else if (state === 'done') {
                time += dt;
            }
            for (i = 0; i < petals.length; i++) {
                var q = petals[i];
                if (q.wait > 0) { q.wait -= dt; continue; }
                q.age += dt;
                q.y += q.vy * dt;
                q.x = q.x0 + Math.sin(q.age * q.freq + q.ph) * q.amp;
                q.rot += q.vr * dt;
                if (q.y > WORLD.baseY - 10) spawnPetal(q, false);
            }
            for (i = bursts.length - 1; i >= 0; i--) {
                var b = bursts[i];
                b.age += dt;
                b.vy += 260 * dt;
                b.x += b.vx * dt; b.y += b.vy * dt;
                b.rot += b.vr * dt;
                if (b.age >= b.life) bursts.splice(i, 1);
            }
        }

        function finish() {
            state = 'done';
            if (!bloomFired) { bloomFired = true; if (opts.onBloom) opts.onBloom(); }
            if (ambient && !petals.length) {
                for (var i = 0; i < 24; i++) petals.push(spawnPetal({}, true));
            }
            if (opts.onDone) opts.onDone();
            if (!ambient) { stopLoop(); render(); }
        }

        function frame(now) {
            raf = requestAnimationFrame(frame);
            var dt = Math.min(0.05, (now - last) / 1000);
            last = now;
            update(dt);
            render();
        }
        function startLoop() { if (raf) return; last = performance.now(); raf = requestAnimationFrame(frame); }
        function stopLoop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }

        return {
            layout: layout,
            base: base,
            start: function () {
                if (state !== 'idle') return;
                state = 'growing'; time = 0; speed = 1;
                startLoop();
            },
            speedUp: function () { if (state === 'growing') speed = 3.5; },
            isGrowing: function () { return state === 'growing'; },
            isDone: function () { return state === 'done'; },
            showFinal: function () {
                time = TOTAL + 10; bloomFired = true; state = 'done';
                if (opts.onBloom) opts.onBloom();
                if (opts.onDone) opts.onDone();
                if (ambient) { for (var i = 0; i < 24; i++) petals.push(spawnPetal({}, true)); startLoop(); }
                else render();
            },
            burst: function (cssX, cssY) {
                if (state !== 'done' || !ambient) return;
                var wx = (cssX - ox) / s, wy = (cssY - oy) / s;
                for (var i = 0; i < 12; i++) {
                    bursts.push({
                        x: wx, y: wy,
                        vx: (rnd() - 0.5) * 150, vy: -70 - rnd() * 120,
                        rot: (rnd() - 0.5) * 1.5, vr: (rnd() - 0.5) * 3,
                        size: 12 + rnd() * 12, sp: Math.floor(rnd() * PALETTE.length),
                        age: 0, life: 1.3 + rnd() * 0.8
                    });
                }
            },
            pause: stopLoop,
            resume: function () { if (state !== 'idle' && (ambient || state === 'growing')) startLoop(); }
        };
    }

    global.LoveTree = LoveTree;
})(window);
