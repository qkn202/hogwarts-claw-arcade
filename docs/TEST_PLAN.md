# Kế hoạch Kiểm thử (Test Plan)

Cập nhật: 20/10/2026.

## 1. Kiểm thử Tự động (`npm test && npm run check && npm run build`)

 Toàn bộ **13/13** bài test tự động chạy bằng Node test runner và `jsdom`:

| File | Số test | Phạm vi kiểm tra |
| --- | --- | --- |
| [`tests/rules.test.mjs`](../tests/rules.test.mjs) | 5 | Luật bắt `findCatch`, hố nhận quà `inPrizeChute`, phục hồi `loadCollection` với 28 loài và hàm nội suy `ease`. |
| [`tests/game.test.mjs`](../tests/game.test.mjs) | 6 | Vòng chơi đầy đủ (thắng, hụt, tạm dừng/tiếp tục, hết giờ tự gắp, xếp lại hộp, nhận nuôi & chăm sóc mở khóa chậu cây, chuyển đổi tab SPA). |
| [`tests/pets.test.mjs`](../tests/pets.test.mjs) | 2 | Làm sạch dữ liệu thú, khử trùng lặp loài trong lều và đảm bảo không phạt chỉ số khi offline. |

## 2. Checklist Kiểm thử Trực quan & Thiết bị (Desktop & Mobile iOS 16+)

| Mã | Kịch bản kiểm tra | Kỳ vọng |
| --- | --- | --- |
| **QA-01** | Quan sát lồng kính Tiệm Gắp Hẻm Xéo | Chỉ hiển thị các Hộp Sô-cô-la Ếch ngũ giác đóng kín, không có hình thú hay biểu tượng phụ đè lên nóc hộp. |
| **QA-02** | Gắp hộp rơi vào Hố Nhận Quà | Sân khấu mở hộp 3D hoạt động mượt; tỷ lệ vào hộp "Lêu lêu!" là cao nhất; mở trúng Rương Gringotts cộng đúng `10–500 Gals` lên Header; mở trúng thú nhận dạng **🐣 Bé Con**. |
| **QA-03** | Chuyển sang tab **Bộ sưu tập** | Hiển thị riêng biệt toàn bộ 28 loài kèm ảnh đôi **🐣 Bé Con → 🌟 Trưởng Thành** và 4 nút lọc; không còn 2 nút phụ dưới đáy thẻ. |
| **QA-04** | Tương tác trong **Lều Bác Hagrid** | Không có nhân vật học sinh; click hoặc vuốt trực tiếp lên thú (`#home-pet`) hoặc bấm `👋 Vuốt ve` / `🥰 Nựng má` làm thú nhún nhảy/dụi má, hiện bong bóng cảm xúc và bắn tim bay. |
| **QA-05** | Chăm sóc thú đủ 3 lần | Thú tiến hóa từ **🐣 Bé Con** sang **🌟 Trưởng Thành** và mở khóa chậu cây trong lều. |
| **QA-06** | Mobile Nằm Dọc (Portrait — iOS 16+) | Header 2 tầng gọn, máy gắp vừa khít 1 màn hình `100dvh`, 5 nút tương tác trong lều xếp gọn trên 1 hàng, nhấn ô đổi tên không bị auto-zoom. |
| **QA-07** | Mobile Nằm Ngang (Landscape — iOS 16+) | Header thu gọn `44px`, cần Joystick bên trái và nút `GẮP!` bên phải tủ máy gắp; Lều Bác Hagrid chia 2 cột cuộn độc lập. |
