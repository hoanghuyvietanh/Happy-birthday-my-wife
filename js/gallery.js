var gallery = document.querySelector('#gallery');

var getVal = function (elem, style) {
    return parseInt(window.getComputedStyle(elem).getPropertyValue(style));
};
var getHeight = function (item) {
    return item.querySelector('.content').getBoundingClientRect().height;
};

// Tính số hàng mà mỗi ảnh chiếm trong lưới
var resizeItem = function (item) {
    var altura = getVal(gallery, 'grid-auto-rows');
    var gap = getVal(gallery, 'grid-row-gap');
    item.style.gridRowEnd = 'span ' + Math.ceil((getHeight(item) + gap) / (altura + gap));
};
var resizeAll = function () {
    gallery.querySelectorAll('.gallery-item').forEach(resizeItem);
};

// Ảnh đã có width/height nên tính được chiều cao ngay, không cần chờ tải xong
resizeAll();

gallery.querySelectorAll('img').forEach(function (img) {
    var item = img.parentElement.parentElement;
    if (img.complete) {
        resizeItem(item);
        return;
    }
    img.classList.add('byebye'); // mờ đi cho tới khi ảnh tải xong
    img.addEventListener('load', function () {
        resizeItem(item);
        img.classList.remove('byebye');
    });
});

var resizeTimer;
window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resizeAll, 100);
});

// Bấm vào ảnh để phóng to, bấm lại hoặc nhấn Esc để thu nhỏ
gallery.querySelectorAll('.gallery-item').forEach(function (item) {
    item.addEventListener('click', function () {
        item.classList.toggle('full');
    });
});
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        var open = gallery.querySelector('.full');
        if (open) open.classList.remove('full');
    }
});
