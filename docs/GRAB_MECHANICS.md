# Cơ chế Gắp & Xác suất Mở Hộp Sô-cô-la Ếch

Cập nhật: 20/10/2026. Nguồn hiện hành: [`web/rules.js`](../web/rules.js), [`web/main.js`](../web/main.js), [`web/scene.js`](../web/scene.js).

## 1. Chuỗi trạng thái lượt gắp

`welcome → aim → lower → close → lift → deliver → drop → home → result`

- **Căn móc (`aim`, tối đa 20 giây)**: Di chuyển ngang trong khoảng `[-1.03, 1.03]` bằng bàn phím (`A/D`, `←/→`), cần Joystick cảm ứng hoặc chạm/vuốt trực tiếp trên lồng kính máy gắp.
- **Bắt trúng (`findCatch`)**: Chọn hộp `free` có khoảng cách ngang nhỏ nhất nằm trong vùng bắt `0.92 × radius`.
- **Thử thách trượt hộp trên đường đi (Chỉ trong trình duyệt thực)**:
  - Càng lệch tâm hộp (`centerOffset`), nguy cơ tuột hộp khi nâng (`lift`: `38%–83%`) và khi kéo ngang về hố (`deliver`: `32%–67%`) càng cao.
  - Hộp chỉ được mở khi rơi lọt vào **Hố Nhận Quà** (`inPrizeChute`: `0.62 < x < 1.18` và `y < -0.1`).

## 2. Phân bổ xác suất khi Mở Hộp (`BOX_MYSTERIES`)

Khi hộp Sô-cô-la Ếch rơi vào Hố Nhận Quà, hệ thống quay thưởng theo trọng số (`totalWeight = 100`):

| Nhóm kết quả | Tỷ lệ | Chi tiết phần thưởng |
| --- | --- | --- |
| **1. Hộp Bẫy "Lêu lêu!" (`isZonk: true`)** | **62%** *(Cao nhất)* | 4 loại hộp trêu ngươi (*Ếch nhảy trốn mất*, *Bẫy lò xo Weasley*, *Yêu tinh Peeves tráo hộp*, *Bùa lêu lêu Gilderoy Lockhart*). Không cộng bộ sưu tập. |
| **2. Rương Vàng Gringotts (`isChest: true`)** | **14%** | 3 hạng rương (*Rương Đồng*, *Rương Bạc*, *Rương Đại Gia Bảo*), thưởng ngẫu nhiên từ **10 đến 500 Gals** (`Math.floor(10 + Math.random() * 491)`) vào túi vàng Galleon. |
| **3. Sinh Vật Huyền Bí (28 loài)** | **24%** | Mở ra 1 trong **28 Sinh Vật Huyền Bí** ở hình thái **🐣 Bé Con (Sơ sinh)** (ưu tiên cao hơn cho các loài chưa sở hữu trong Bộ sưu tập). |
