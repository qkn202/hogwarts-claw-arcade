# Thiết kế Game — Hogwarts · Tiệm Gắp Thú Phép Thuật

Cập nhật: 20/10/2026.

## Tổng quan & Phong cách

Trò chơi lấy cảm hứng từ thế giới phép thuật **Hogwarts / Hẻm Xéo (Diagon Alley)**:
- **Tủ Gắp Hộp Sô-cô-la Ếch Honeydukes**: Tủ gỗ gụ & đồng cổ điển kết xuất trên HTML5 Canvas 3D-lit kết hợp lớp SVG tương thích kiểm thử. Trong lồng kính **chỉ hiển thị thuần các Hộp Sô-cô-la Ếch ngũ giác đóng kín** xếp chồng tự nhiên.
- **28 Sinh Vật Huyền Bí (Realistic-Chibi 3D)**: Gồm 8 loài kinh điển (*Niffler, Hedwig, Crookshanks, Bowtruckle, Demiguise, Occamy, Puffskein, Fawkes*) và 20 loài mới (*Hippogriff, Thestral, Unicorn, Hungarian Horntail, Thunderbird, Zouwu, Kelpie, Swooping Evil, Mooncalf, Augurey, Fwooper, Diricawl, Erumpent, Graphorn, Nundu, Runespoor, Murtlap, Acromantula, Basilisk, Fluffy*).
- **2 Giai đoạn phát triển (Dual-Stage)**: Mỗi loài đều có hình thái **🐣 Bé Con (Sơ sinh)** khi mới mở hộp và lớn lên thành **🌟 Trưởng Thành** sau 3 lần chăm sóc tại Lều Bác Hagrid.

## 3 Phân khu độc lập

1. **Tiệm Gắp Hẻm Xéo (`#arcade-view`)**:
   - Lượt chơi 20 giây: Căn móc → Hạ móc → Kẹp hộp → Đưa về Hố Nhận Quà bên phải → Mở hộp 3D trên sân khấu trung tâm.
   - Độ khó thử thách: Hộp có thể trượt khỏi càng kẹp khi nâng hoặc khi di chuyển ngang; khi vào hố nhận quà, tỷ lệ mở ra **Hộp Bẫy "Lêu lêu!"** luôn chiếm cao nhất (~62%), tiếp theo là **Rương Vàng Gringotts 10–500 Gals** (~14%) và **Sinh Vật Huyền Bí** (~24%).
2. **Lều Bác Hagrid (`#pet-view`)**:
   - Không gian bảo tồn ấm cúng nơi các sinh vật tự do đi dạo bằng hoạt ảnh **8-Frame Walking Sprite Sheet**.
   - Người chơi tương tác trực tiếp bằng cách **click/chạm hoặc vuốt chuột/ngón tay lên thú** để **xoa đầu, vuốt lưng, nựng má, gãi cằm, cù lét** kèm bong bóng thoại và hiệu ứng tim bay.
3. **Bộ Sưu Tập (`#collection-view`)**:
   - Tab riêng biệt trưng bày toàn bộ 28 loài thú với bộ lọc nhanh và khung ảnh đối chiếu **🐣 Bé Con → 🌟 Trưởng Thành**.

## Tương thích Thiết bị & Mobile UI/UX

- Hỗ trợ đầy đủ từ **iOS 16.0 trở lên** (iPhone / iPad Safari & Web App) cũng như Android và Desktop.
- Tối ưu hóa riêng cho cả **Màn hình dọc (Portrait)** và **Màn hình ngang (Landscape)** không bị tràn khung hay che khuất nút điều khiển.
