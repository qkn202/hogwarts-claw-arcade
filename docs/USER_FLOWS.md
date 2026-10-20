# Luồng Màn hình & Tối ưu UI/UX Mobile (Portrait & Landscape, iOS 16+)

Cập nhật: 20/10/2026.

## 1. Điều hướng 3 Tab độc lập (`switchView`)

Ứng dụng gồm 3 tab chuyển đổi tức thì trên thanh Header mà không tải lại trang:
1. **`Tiệm Gắp Hẻm Xéo` (`#arcade-view`)**: Màn hình máy gắp Hộp Sô-cô-la Ếch.
2. **`Lều Bác Hagrid` (`#pet-view`)**: Khu bảo tồn, tương tác vuốt ve/nựng má và chăm sóc thú lớn khôn.
3. **`Bộ sưu tập` (`#collection-view`)**: Trang tra cứu toàn màn hình cho 28 Sinh Vật Huyền Bí với 4 bộ lọc (`Tất cả (28)`, `✦ 20 Thú Mới`, `8 Thú Cổ Điển`, `Đã sở hữu`).

Khi rời tab `Tiệm Gắp Hẻm Xéo` lúc lượt gắp đang diễn ra, game tự động tạm dừng (`pauseGame()`) để bảo toàn thời gian còn lại.

## 2. Thiết kế Thích ứng Mobile Nằm Dọc & Nằm Ngang (iOS 16+)

### A. Mobile Nằm Dọc (`@media (max-width: 760px) and (orientation: portrait)`)
- **Header 2 tầng gọn gàng**: Tầng trên hiển thị biểu tượng Hogwarts, túi vàng `🪙 Gals` và nút âm thanh; tầng dưới là thanh chuyển đổi 3 tab dạng segmented pill.
- **Tiệm Gắp vừa khít 1 màn hình (`100dvh`)**: Không bị cuộn dọc ngoài ý muốn khi kéo Joystick; đồng hồ đếm ngược và nút `↻ Xếp lại hộp` thu gọn ở 2 góc trên; Joystick (`84×84px`) và nút `GẮP!` (`84×84px`) đặt ở hai góc dưới chuẩn vùng ngón cái kèm khoảng đệm `env(safe-area-inset-bottom)`.
- **Lều Bác Hagrid**: Phòng nuôi thú hiển thị rộng rãi (`aspect-ratio: 1.36`), ngay bên dưới là lưới 5 nút tương tác (`👋 Vuốt ve`, `🥰 Nựng má`, `🥟 Cho ăn`, `🪽 Bắt Snitch`, `☾ Đi ngủ`) vừa khít trên cùng 1 hàng ngang.

### B. Mobile Nằm Ngang (`@media (max-height: 540px) and (orientation: landscape)`)
- **Header 1 dòng siêu gọn (`44px`)**: Hiển thị đồng thời thương hiệu, 3 tab điều hướng, túi vàng `🪙 Gals` và nút công cụ trên một thanh ngang duy nhất, tôn trọng `env(safe-area-inset-left/right)` cho tai thỏ / Dynamic Island.
- **Tiệm Gắp kiểu Máy Cầm Tay (Handheld Console Layout)**: Tủ máy gắp 3D nằm chính giữa toàn chiều cao màn hình; cần Joystick neo ở cạnh trái và nút `GẮP!` neo ở cạnh phải ngay tầm với hai ngón cái.
- **Lều Bác Hagrid chia 2 cột cuộn độc lập**: Cột trái hiển thị phòng thú và 5 nút tương tác; cột phải hiển thị thanh chỉ số, danh sách thú và nhận nuôi có thể cuộn mượt (`-webkit-overflow-scrolling: touch`).
