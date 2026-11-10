/* ===== Cấu hình chung (sửa ở đây là đổi cho cả trang chủ lẫn trang cây) ===== */

/* 5. Ngày bắt đầu yêu nhau hoặc ngày sinh của người bạn muốn chúc.
   Thứ tự: năm, tháng (tính từ 0, nên 0 = tháng 1, 1 = tháng 2), ngày. */
var LOVE_START = new Date(2022, 1, 1, 0, 0, 0, 0);

/* Trả về HTML các ô "ngày / giờ / phút / giây" tính từ ngày `from` đến hiện tại */
function loveElapsed(from) {
    var s = Math.max(0, Math.floor((Date.now() - from.getTime()) / 1000));
    var days = Math.floor(s / 86400);
    var hours = Math.floor((s % 86400) / 3600);
    var minutes = Math.floor((s % 3600) / 60);
    var seconds = s % 60;
    function pad(n) {
        return n < 10 ? "0" + n : String(n);
    }
    function unit(value, label) {
        return '<div class="unit"><b>' + value + "</b><span>" + label + "</span></div>";
    }
    return unit(days, "ngày") + unit(pad(hours), "giờ") + unit(pad(minutes), "phút") + unit(pad(seconds), "giây");
}
