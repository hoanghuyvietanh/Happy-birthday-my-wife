(function(window){

    function random(min, max) {
        return min + Math.floor(Math.random() * (max - min + 1));
    }

    function bezier(cp, t) {  
        var p1 = cp[0].mul((1 - t) * (1 - t));
        var p2 = cp[1].mul(2 * t * (1 - t));
        var p3 = cp[2].mul(t * t); 
        return p1.add(p2).add(p3);
    }  

    function inheart(x, y, r) {
        // x^2+(y-(x^2)^(1/3))^2 = 1
        // http://www.wolframalpha.com/input/?i=x%5E2%2B%28y-%28x%5E2%29%5E%281%2F3%29%29%5E2+%3D+1
        var z = ((x / r) * (x / r) + (y / r) * (y / r) - 1) * ((x / r) * (x / r) + (y / r) * (y / r) - 1) * ((x / r) * (x / r) + (y / r) * (y / r) - 1) - (x / r) * (x / r) * (y / r) * (y / r) * (y / r);
        return z < 0;
    }

    Point = function(x, y) {
        this.x = x || 0;
        this.y = y || 0;
    }
    Point.prototype = {
        clone: function() {
            return new Point(this.x, this.y);
        },
        add: function(o) {
            p = this.clone();
            p.x += o.x;
            p.y += o.y;
            return p;
        },
        sub: function(o) {
            p = this.clone();
            p.x -= o.x;
            p.y -= o.y;
            return p;
        },
        div: function(n) {
            p = this.clone();
            p.x /= n;
            p.y /= n;
            return p;
        },
        mul: function(n) {
            p = this.clone();
            p.x *= n;
            p.y *= n;
            return p;
        }
    }

    Heart = function() {
        // x = 16 sin^3 t
        // y = 13 cos t - 5 cos 2t - 2 cos 3t - cos 4t
        // http://www.wolframalpha.com/input/?i=x+%3D+16+sin%5E3+t%2C+y+%3D+(13+cos+t+-+5+cos+2t+-+2+cos+3t+-+cos+4t)
        var points = [], x, y, t;
        for (var i = 10; i < 30; i += 0.2) {
            t = i / Math.PI;
            x = 16 * Math.pow(Math.sin(t), 3);
            y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
            points.push(new Point(x, y));
        }
        this.points = points;
        this.length = points.length;
    }
    Heart.prototype = {
        get: function(i, scale) {
            return this.points[i].mul(scale || 1);
        }
    }

    // Bảng màu hài hòa cho tim nở và tim rơi: hồng là chính, điểm cam đào, vàng, tím nhạt
    var PALETTE = ['#ff4f87', '#ff4f87', '#ff7aa8', '#ff7aa8', '#ff9ec0', '#ffc2d6', '#ff6b6b',
                   '#ff8a5c', '#ffb066', '#ffd166', '#c9a7ff', '#ff5fb3'];
    function pick(list) {
        return list[Math.floor(Math.random() * list.length)];
    }
    var REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    // Hình trái tim vẽ sẵn một lần, dùng lại cho hàng trăm cánh tim nên rất nhẹ
    var heartPath = null;
    if (typeof Path2D !== 'undefined') {
        heartPath = new Path2D();
        var baseHeart = new Heart();
        for (var hi = 0; hi < baseHeart.length; hi++) {
            var hp = baseHeart.get(hi);
            if (hi) { heartPath.lineTo(hp.x, -hp.y); } else { heartPath.moveTo(hp.x, -hp.y); }
        }
        heartPath.closePath();
    }
    function fillHeart(ctx, figure) {
        if (heartPath) {
            ctx.fill(heartPath);
            return;
        }
        ctx.beginPath();
        for (var i = 0; i < figure.length; i++) {
            var p = figure.get(i);
            if (i) { ctx.lineTo(p.x, -p.y); } else { ctx.moveTo(p.x, -p.y); }
        }
        ctx.closePath();
        ctx.fill();
    }

    Seed = function(tree, point, scale, color) {
        this.tree = tree;

        var scale = scale || 1
        var color = color || '#FF0000';

        this.heart = {
            point  : point,
            scale  : scale,
            color  : color,
            figure : new Heart(),
        }

        this.cirle = {
            point  : point,
            scale  : scale,
            color  : color,
            radius : 5,
        }
    }
    Seed.prototype = {
        draw: function() {
            this.drawHeart();
            this.drawText();
        },
        addPosition: function(x, y) {
            this.cirle.point = this.cirle.point.add(new Point(x, y));
        },
        canMove: function() {
            return this.cirle.point.y < (this.tree.height + 20); 
        },
        move: function(x, y) {
            this.clear();
            this.drawCirle();
            this.addPosition(x, y);
        },
        canScale: function() {
            return this.heart.scale > 0.2;
        },
        setHeartScale: function(scale) {
            this.heart.scale *= scale;
        },
        scale: function(scale) {
            this.clear();
            this.drawCirle();
            this.drawHeart();
            this.setHeartScale(scale);
        },
        drawHeart: function() {
            var ctx = this.tree.ctx, heart = this.heart;
            var point = heart.point, color = heart.color, 
                scale = heart.scale;
            ctx.save();
            ctx.fillStyle = color;
            ctx.shadowColor = color;
            ctx.shadowBlur = 14;
            ctx.translate(point.x, point.y);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            for (var i = 0; i < heart.figure.length; i++) {
                var p = heart.figure.get(i, scale);
                ctx.lineTo(p.x, -p.y);
            }
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        },
        drawCirle: function() {
            var ctx = this.tree.ctx, cirle = this.cirle;
            var point = cirle.point, color = cirle.color, 
                scale = cirle.scale, radius = cirle.radius;
            ctx.save();
            ctx.fillStyle = color;
            ctx.translate(point.x, point.y);
            ctx.scale(scale, scale);
            ctx.beginPath();
            ctx.moveTo(0, 0);
    	    ctx.arc(0, 0, radius, 0, 2 * Math.PI);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        },
        drawText: function() {
            var ctx = this.tree.ctx, heart = this.heart;
            var point = heart.point, color = heart.color, 
                scale = heart.scale;
            ctx.save();
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.fillStyle = color;
            ctx.translate(point.x, point.y);
            ctx.scale(scale, scale);
            ctx.moveTo(0, 0);
    	    ctx.lineTo(15, 15);
    	    ctx.lineTo(78, 15);
            ctx.stroke();

            ctx.moveTo(0, 0);
            ctx.scale(0.75, 0.75);
            ctx.font = "13px Verdana, sans-serif";
            ctx.fillText("Chạm vào em", 23, 10);
            ctx.restore();
        },
        // Trái tim đập nhịp nhẹ khi đang chờ được chạm (chữ giữ nguyên cỡ)
        pulse: function() {
            var ctx = this.tree.ctx, heart = this.heart, p = heart.point;
            this._t = (this._t || 0) + 1;
            var base = heart.scale;
            ctx.clearRect(p.x - 80, p.y - 100, 360, 220);
            heart.scale = base * (1 + 0.09 * Math.sin(this._t / 5));
            this.drawHeart();
            heart.scale = base;
            this.drawText();
        },
        clear: function() {
            var ctx = this.tree.ctx, cirle = this.cirle;
            var point = cirle.point, scale = cirle.scale, radius = 26;
            var w = h = (radius * scale);
            ctx.clearRect(point.x - w - 30, point.y - h - 60, 4 * w + 70, 4 * h + 90);
        },
        hover: function(x, y) {
            var ctx = this.tree.ctx;
            var pixel = ctx.getImageData(x, y, 1, 1);
            return pixel.data[3] == 255
        }
    }

    Footer = function(tree, width, height, speed) {
        this.tree = tree;
        this.point = new Point(tree.seed.heart.point.x, tree.height - height / 2);
        this.width = width;
        this.height = height;
        this.speed = speed || 2;
        this.length = 0;
    }
    Footer.prototype = {
        draw: function() {
            var ctx = this.tree.ctx, point = this.point;
            var len = this.length / 2;

            ctx.save();
            ctx.translate(point.x, point.y);
            // Vạch đặc (được vẽ chồng nhiều khung hình nên không dùng màu trong suốt hay bóng)
            ctx.strokeStyle = 'rgb(122, 52, 78)';
            ctx.lineWidth = this.height;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(0, 0);
    	    ctx.lineTo(len, 0);
    	    ctx.lineTo(-len, 0);
            ctx.stroke();
            ctx.restore();

            if (this.length < this.width) {
                this.length += this.speed;
            }
        }
    }

    Tree = function(canvas, width, height, opt) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = width;
        this.height = height;
        this.opt = opt || {};

        this.record = {};
        
        this.initSeed();
        this.initFooter();
        this.initBranch();
        this.initBloom();
    }
    Tree.prototype = {
        initSeed: function() {
            var seed = this.opt.seed || {};
            var x = seed.x || this.width / 2;
            var y = seed.y || this.height / 2;
            var point = new Point(x, y);
            var color = seed.color || '#FF0000';
            var scale = seed.scale || 1;

            this.seed = new Seed(this, point, scale, color);
        },

        initFooter: function() {
            var footer = this.opt.footer || {};
            var width = footer.width || this.width;
            var height = footer.height || 5;
            var speed = footer.speed || 2;
            this.footer = new Footer(this, width, height, speed);
        },

        initBranch: function() {
            var branchs = this.opt.branch || []
            this.branchs = [];
            this.addBranchs(branchs);
        },

        initBloom: function() {
            var bloom = this.opt.bloom || {};
            var cache = [],
                num = bloom.num || 500, 
                width = bloom.width || this.width,
                height = bloom.height || this.height,
                figure = this.seed.heart.figure;
            var r = 240, x, y;
            for (var i = 0; i < num; i++) {
                cache.push(this.createBloom(width, height, r, figure));
            }
            this.blooms = [];
            this.bloomsCache = cache;
        },

        toDataURL: function(type) {
            return this.canvas.toDataURL(type);
        },

        draw: function(k) {
            var s = this, ctx = s.ctx;
            var rec = s.record[k];
            if (!rec) {
                return ;
            }
            var point = rec.point,
                image = rec.image;

            ctx.save();
            ctx.putImageData(image, point.x, point.y);
        	ctx.restore();
        },

        addBranch: function(branch) {
        	this.branchs.push(branch);
        },

        addBranchs: function(branchs){
            var s = this, b, p1, p2, p3, r, l, c;
        	for (var i = 0; i < branchs.length; i++) {
                b = branchs[i];
                p1 = new Point(b[0], b[1]);
                p2 = new Point(b[2], b[3]);
                p3 = new Point(b[4], b[5]);
                r = b[6];
                l = b[7];
                c = b[8]
                s.addBranch(new Branch(s, p1, p2, p3, r, l, c)); 
            }
        },

        removeBranch: function(branch) {
            var branchs = this.branchs;
        	for (var i = 0; i < branchs.length; i++) {
        		if (branchs[i] === branch) {
        			branchs.splice(i, 1);
                }
            }
        },

        canGrow: function() {
            return !!this.branchs.length;
        },
        grow: function() {
            var branchs = this.branchs;
    	    for (var i = 0; i < branchs.length; i++) {
                var branch = branchs[i];
                if (branch) {
                    branch.grow();
                }
            }
        },

        addBloom: function (bloom) {
            this.blooms.push(bloom);
        },

        removeBloom: function (bloom) {
            var blooms = this.blooms;
            for (var i = 0; i < blooms.length; i++) {
                if (blooms[i] === bloom) {
                    blooms.splice(i, 1);
                }
            }
        },

        createBloom: function(width, height, radius, figure, color, alpha, angle, scale, place, speed) {
            var x, y;
            while (true) {
                x = random(20, width - 20);
                y = random(20, height - 20);
                if (inheart(x - width / 2, height - (height - 40) / 2 - y, radius)) {
                    return new Bloom(this, new Point(x, y), figure, color, alpha, angle, scale, place, speed);
                }
            }
        },
        
        canFlower: function() {
            return !!this.blooms.length;
        }, 
        flower: function(num) {
            var s = this, blooms = s.bloomsCache.splice(0, num);
            for (var i = 0; i < blooms.length; i++) {
                s.addBloom(blooms[i]);
            }
            blooms = s.blooms;
            for (var j = 0; j < blooms.length; j++) {
                blooms[j].flower();
            }
        },

        snapshot: function(k, x, y, width, height) {
            var ctx = this.ctx;
            var image = ctx.getImageData(x, y, width, height); 
            this.record[k] = {
                image: image,
                point: new Point(x, y),
                width: width,
                height: height
            }
        },
        setSpeed: function(k, speed) {
            this.record[k || "move"].speed = speed;
        },
        move: function(k, x, y) {
            var s = this, ctx = s.ctx;
            var rec = s.record[k || "move"];
            var point = rec.point,
                image = rec.image,
                speed = rec.speed || 10,
                width = rec.width,
                height = rec.height; 

            i = point.x + speed < x ? point.x + speed : x;
            j = point.y + speed < y ? point.y + speed : y; 

            ctx.save();
            ctx.clearRect(point.x, point.y, width, height);
            ctx.putImageData(image, i, j);
        	ctx.restore();

            rec.point = new Point(i, j);
            rec.speed = speed * 0.95;

            if (rec.speed < 2) {
                rec.speed = 2;
            }
            return i < x || j < y;
        },

        // Điểm ngẫu nhiên nằm trong tán cây (tán cây sau khi trượt sang phải)
        canopyPoint: function() {
            var x, y;
            while (true) {
                x = random(520, 1080);
                y = random(30, 500);
                if (inheart(x - 800, 345 - y, 240)) {
                    return new Point(x, y);
                }
            }
        },

        initFx: function() {
            var s = this, i, p;
            var fx = { t: 0, petals: [], rest: [], sparkles: [], bokeh: [] };
            for (i = 0; i < 38; i++) {
                p = s.canopyPoint();
                fx.sparkles.push({
                    x: p.x, y: p.y,
                    size: 3 + Math.random() * 6,
                    phase: Math.random() * 6.28,
                    speed: 0.04 + Math.random() * 0.06,
                    color: Math.random() < 0.5 ? '#ffffff' : '#fff1b8'
                });
            }
            for (i = 0; i < 16; i++) {
                fx.bokeh.push({
                    x: Math.random() * s.width,
                    y: Math.random() * s.height,
                    r: 10 + Math.random() * 26,
                    vy: 0.12 + Math.random() * 0.3,
                    alpha: 0.12 + Math.random() * 0.2,
                    color: pick(['255,143,179', '255,176,102', '201,167,255', '255,255,255'])
                });
            }
            s.fx = fx;
            return fx;
        },

        spawnPetal: function(fx) {
            var p = this.canopyPoint();
            fx.petals.push({
                x: p.x, y: p.y,
                vx: -0.25 + Math.random() * 0.7,
                vy: 0.55 + Math.random() * 0.9,
                size: 0.28 + Math.random() * 0.4,
                rot: Math.random() * 6.28,
                vr: (Math.random() - 0.5) * 0.06,
                flip: Math.random() * 6.28,
                vf: 0.04 + Math.random() * 0.06,
                ph: Math.random() * 6.28,
                alpha: 0.65 + Math.random() * 0.35,
                color: pick(PALETTE)
            });
        },

        drawPetal: function(ctx, p, squash, alpha) {
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.scale(p.size * Math.cos(p.flip) * (squash ? 1 : 1), p.size * (squash || 1));
            fillHeart(ctx, this.seed.heart.figure);
            ctx.restore();
        },

        jump: function() {
            var s = this, ctx = s.ctx, fx = s.fx || s.initFx(), i, o;
            fx.t++;
            if (REDUCED) {
                return;
            }
            var ground = s.height - 8;

            // bụi sáng bay lên chậm
            for (i = 0; i < fx.bokeh.length; i++) {
                o = fx.bokeh[i];
                o.y -= o.vy;
                o.x += Math.sin(fx.t * 0.01 + i) * 0.2;
                if (o.y < -o.r * 2) {
                    o.y = s.height + o.r;
                    o.x = Math.random() * s.width;
                }
                var g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
                g.addColorStop(0, 'rgba(' + o.color + ',' + o.alpha + ')');
                g.addColorStop(1, 'rgba(' + o.color + ',0)');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(o.x, o.y, o.r, 0, 6.2832);
                ctx.fill();
            }

            // tim nằm lại trên mặt đất, mờ dần rồi biến mất
            for (i = fx.rest.length - 1; i >= 0; i--) {
                o = fx.rest[i];
                o.life--;
                if (o.life <= 0) {
                    fx.rest.splice(i, 1);
                    continue;
                }
                s.drawPetal(ctx, o, 0.4, o.alpha * Math.min(1, o.life / 90));
            }

            // sinh thêm tim rơi
            if (fx.t % 3 === 0 && fx.petals.length < 70) {
                s.spawnPetal(fx);
            }

            // tim rơi: đung đưa theo gió, xoay lật nhẹ
            for (i = fx.petals.length - 1; i >= 0; i--) {
                o = fx.petals[i];
                o.x += o.vx + Math.sin(fx.t * 0.035 + o.ph) * 0.6;
                o.y += o.vy;
                o.rot += o.vr;
                o.flip += o.vf;
                if (o.y >= ground) {
                    fx.petals.splice(i, 1);
                    o.y = ground - Math.random() * 6;
                    o.life = 240 + Math.floor(Math.random() * 120);
                    o.flip = 0;
                    if (fx.rest.length < 90) {
                        fx.rest.push(o);
                    }
                    continue;
                }
                s.drawPetal(ctx, o, 0, o.alpha);
            }

            // lấp lánh trên tán cây
            ctx.save();
            for (i = 0; i < fx.sparkles.length; i++) {
                o = fx.sparkles[i];
                var a = Math.sin(fx.t * o.speed + o.phase);
                if (a <= 0) {
                    continue;
                }
                var r = o.size * (0.6 + a * 0.6);
                ctx.globalAlpha = a;
                ctx.fillStyle = o.color;
                ctx.shadowColor = '#ff8fb3';
                ctx.shadowBlur = 8;
                ctx.save();
                ctx.translate(o.x, o.y);
                ctx.rotate(Math.PI / 4 * (a > 0.5 ? 0 : 1));
                ctx.beginPath();
                ctx.moveTo(0, -r);
                ctx.lineTo(r * 0.18, 0);
                ctx.lineTo(0, r);
                ctx.lineTo(-r * 0.18, 0);
                ctx.closePath();
                ctx.moveTo(-r, 0);
                ctx.lineTo(0, r * 0.18);
                ctx.lineTo(r, 0);
                ctx.lineTo(0, -r * 0.18);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
            ctx.restore();
        }
    }

    Branch = function(tree, point1, point2, point3, radius, length, branchs) {
        this.tree = tree;
        this.point1 = point1;
        this.point2 = point2;
        this.point3 = point3;
        this.radius = radius;
        this.length = length || 100;    
        this.len = 0;
        this.t = 1 / (this.length - 1);   
        this.branchs = branchs || [];
    }

    Branch.prototype = {
        grow: function() {
            var s = this, p; 
            if (s.len <= s.length) {
                p = bezier([s.point1, s.point2, s.point3], s.len * s.t);
                s.draw(p);
                s.len += 1;
                s.radius *= 0.97;
            } else {
                s.tree.removeBranch(s);
                s.tree.addBranchs(s.branchs);
            }
        },
        draw: function(p) {
            var s = this;
            var ctx = s.tree.ctx;
            ctx.save();
        	ctx.beginPath();
        	ctx.fillStyle = 'rgb(92, 44, 62)';
            ctx.shadowColor = 'rgb(92, 44, 62)';
            ctx.shadowBlur = 2;
        	ctx.moveTo(p.x, p.y);
        	ctx.arc(p.x, p.y, s.radius, 0, 2 * Math.PI);
        	ctx.closePath();
        	ctx.fill();
        	ctx.restore();
        }
    }

    Bloom = function(tree, point, figure, color, alpha, angle, scale, place, speed) {
        this.tree = tree;
        this.point = point;
        this.color = color || pick(PALETTE);
        this.alpha = alpha || (0.55 + Math.random() * 0.45);
        this.max = 0.6 + Math.random() * 0.6;
        this.angle = angle || random(0, 360);
        this.scale = scale || 0.1;
        this.place = place;
        this.speed = speed;

        this.figure = figure;
    }
    Bloom.prototype = {
        setFigure: function(figure) {
            this.figure = figure;
        },
        flower: function() {
            var s = this;
            s.draw();
            s.scale += 0.1;
            if (s.scale > s.max) {
                s.tree.removeBloom(s);
            }
        },
        draw: function() {
            var s = this, ctx = s.tree.ctx, figure = s.figure;

            ctx.save();
            ctx.fillStyle = s.color;
            ctx.globalAlpha = s.alpha;
            ctx.shadowColor = s.color;
            ctx.shadowBlur = 6;
            ctx.translate(s.point.x, s.point.y);
            ctx.scale(s.scale, s.scale);
            ctx.rotate(s.angle);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            for (var i = 0; i < figure.length; i++) {
                var p = figure.get(i);
                ctx.lineTo(p.x, -p.y);
            }
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        },
        jump: function() {
            var s = this, height = s.tree.height;

            if (s.point.x < -20 || s.point.y > height + 20) {
                s.tree.removeBloom(s);
            } else {
                s.draw();
                s.point = s.place.sub(s.point).div(s.speed).add(s.point);
                s.angle += 0.05;
                s.speed -= 1;
            }
        }
    }

    window.random = random;
    window.bezier = bezier;
    window.Point = Point;
    window.Tree = Tree;

})(window);
