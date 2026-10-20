# Hogwarts · Tiệm Gắp Thú Phép Thuật (Honeydukes & Lều Bác Hagrid)

Game arcade **Tiệm Gắp Hộp Sô-cô-la Ếch Hẻm Xéo** kết hợp **Khu Bảo Tồn Sinh Vật Huyền Bí (Lều Bác Hagrid)** và **Bộ Sưu Tập 28 Sinh Vật Huyền Bí**. Tối ưu hóa hiển thị trên cả **Desktop** lẫn **Mobile (nằm dọc & nằm ngang)**, tương thích đầy đủ từ **iOS 16 trở lên** (`safari16` / `es2020`).

## Chạy dự án

```sh
npm install
npm run dev -- --port 5174
```

Mở URL Vite thông báo (ví dụ `http://127.0.0.1:5174/`).

## 3 Phân khu chính (3 Tabs độc lập)

1. **Tiệm Gắp Hẻm Xéo (`#arcade-view`)**:
   - Lồng kính máy gắp chứa các **Hộp Sô-cô-la Ếch Honeydukes ngũ giác 3D** đóng kín.
   - Căn móc đồng bằng phím `A/D`, `←/→`, cần Joystick cảm ứng hoặc chạm/vuốt ngang trực tiếp trên lồng kính, rồi bấm **GẮP!** (`Space`).
   - Khi hộp rơi vào **Hố Nhận Quà**, sân khấu mở hộp 3D hiển thị kết quả:
     - **Hộp Bẫy "Lêu lêu!" (~62%)**: Hộp lò xo trêu ngươi của Tiệm Phù Thủy Quỷ Quái Weasley / Yêu tinh Peeves.
     - **Rương Vàng Gringotts (~14%)**: Thưởng ngẫu nhiên **10 – 500 Gals** cộng vào túi vàng trên thanh Header (`🪙 Gals`).
     - **28 Sinh Vật Huyền Bí (~24%)**: Mở ra thú ở hình thái **🐣 Bé Con (Sơ sinh)** và lưu vào Bộ sưu tập.
2. **Lều Bác Hagrid (`#pet-view`)**:
   - Nhận nuôi các sinh vật đã gắp (mỗi loài tối đa 1 cá thể trong lều, tự động khử trùng lặp).
   - Thú tự động đi dạo khắp phòng với **8-frame Sprite Sheet bước đi**.
   - **Tương tác trực tiếp lên thú (`#home-pet`)**:
     - Click/chạm vùng **đầu**: **Xoa đầu / Vuốt lưng 👋** (`petted`).
     - Click/chạm vùng **má & cằm** hoặc **vuốt qua lại liên tục** trên người thú: **Nựng má / Gãi cằm 🥰** (`cuddle`).
     - Click/chạm vùng **bụng**: **Cù lét / Ôm ấp ✨** (`tickle`).
     - Hiện bong bóng cảm xúc trên đầu thú và bắn tim/sao lấp lánh (`#pet-fx`).
   - **Chăm sóc & Tiến hóa (`GROW_CARE_THRESHOLD = 3`)**:
     - Cho ăn (`2s`), Bắt Snitch (`3s`), Đi ngủ (`5s`).
     - Đạt **3 lần chăm sóc**: Tiến hóa từ **🐣 Bé Con** lên **🌟 Trưởng Thành** và mở khóa chậu cây. Đạt **7 lần**: Mở khóa dây sao phép thuật.
3. **Bộ Sưu Tập (`#collection-view`)**:
   - Hiển thị toàn bộ **28 Sinh Vật Huyền Bí** (20 thú mới + 8 thú cổ điển) với bộ lọc nhanh (`Tất cả (28)`, `✦ 20 Thú Mới`, `8 Thú Cổ Điển`, `Đã sở hữu`) và khung ảnh đôi so sánh **🐣 Bé Con → 🌟 Trưởng Thành**.

## Tối ưu Mobile (Dọc & Ngang) & iOS 16+

- Viewport `viewport-fit=cover`, hỗ trợ tai thỏ / Dynamic Island qua `env(safe-area-inset-*)` và đơn vị `100dvh`.
- **Mobile Nằm Dọc (Portrait)**: Thanh điều hướng 3 tab dạng pill gọn gàng, tủ máy gắp vừa khít 1 màn hình không cuộn, 5 nút tương tác thú xếp gọn trên 1 hàng lưới.
- **Mobile Nằm Ngang (Landscape)**: Header thu gọn `44px`, cần Joystick neo bên ngón cái trái và nút **GẮP!** neo bên ngón cái phải như máy chơi game cầm tay; Lều Bác Hagrid chia 2 cột cuộn độc lập.
- Chống tự động phóng to (auto-zoom) khi nhập tên thú trên Safari iOS 16+ (`font-size: 16px`), hỗ trợ `webkitAudioContext` và `setPointerCapture` cho thao tác vuốt cảm ứng.

## Kiểm tra & Build

```sh
npm test
npm run check
npm run build
```

## Tài liệu chi tiết

Xem mục lục đầy đủ tại [docs/README.md](docs/README.md):
- [Thiết kế game](docs/GAME_DESIGN.md)
- [Cơ chế gắp & Tỷ lệ mở hộp](docs/GRAB_MECHANICS.md)
- [Cơ chế nuôi thú, tiến hóa & tương tác](docs/PET_MECHANICS.md)
- [Luồng màn hình & Mobile UI/UX](docs/USER_FLOWS.md)
- [Triển khai kỹ thuật](docs/IMPLEMENTATION.md)
- [Dữ liệu & Lưu trữ](docs/DATA_MODEL.md)
- [Kế hoạch kiểm thử](docs/TEST_PLAN.md)
- [Tiến độ](docs/PROGRESS.md)
- [Lộ trình](docs/ROADMAP.md)
