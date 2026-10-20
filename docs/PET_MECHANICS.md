# Cơ chế Lều Bác Hagrid (Nuôi thú, Tiến hóa & Tương tác trực tiếp)

Cập nhật: 20/10/2026. Nguồn hiện hành: [`web/pets.js`](../web/pets.js), [`web/art.js`](../web/art.js).

## 1. Nhận nuôi & Khử trùng lặp

- Mỗi loài trong số **28 Sinh Vật Huyền Bí** đã gắp trúng có thể được nhận nuôi vào **Lều Bác Hagrid** (tối đa **1 cá thể mỗi loài** trong lều; `loadPets` tự động gộp và loại bỏ các bản ghi trùng loài).
- Khi mới gắp trúng và nhận nuôi (`care = 0`), mọi sinh vật đều bắt đầu ở hình thái **🐣 Bé Con (Sơ sinh)**.
- Người chơi có thể bấm nút **`👁 Xem`** ở cột bên phải để xem thử bất kỳ loài nào ở cả hai hình thái **🐣 Bé Con ↔ 🌟 Trưởng Thành** ngay trong lều.

## 2. Tương tác Trực tiếp với Thú (`#home-pet`)

Người chơi tương tác trực tiếp bằng chuột hoặc cảm ứng chạm/vuốt lên thú đang ở trong lều:

| Cách tương tác | Vùng / Thao tác | Phản hồi hoạt ảnh & Cảm xúc | Chỉ số cộng thêm |
| --- | --- | --- | --- |
| **Xoa đầu / Vuốt lưng 👋** | Click vùng **đầu** (`relY <= 0.38`) hoặc nút **`👋 Vuốt ve`** | Hoạt ảnh `petted` nhún nhảy, bong bóng thoại *"Gừm~ xoa đầu êm quá! 💖"*, bắn tim `💖 ✨` | Vui vẻ `+4` |
| **Nựng má / Gãi cằm 🥰** | Click vùng **má/cằm** (`0.38 < relY <= 0.68`), **vuốt qua lại liên tục** trên thú hoặc nút **`🥰 Nựng má`** | Hoạt ảnh `cuddle` lắc lư dụi má, bong bóng thoại *"Nựng má sướng ghê~ 🥰"*, bắn tim `🥰 💕` | Vui vẻ `+4` |
| **Cù lét / Ôm ấp ✨** | Click vùng **bụng** (`relY > 0.68`) | Hoạt ảnh `tickle` bật nảy khúc khích, bong bóng thoại *"Nhột quá hihi! 🐾✨"*, bắn hạt `🐾 💖` | Vui vẻ `+4` |
| **Vẫy gọi trên sàn lều 🐾** | Click bất kỳ vị trí nào trên sàn lều (`.pet-room`) | Thú hiển thị bong bóng *"Đợi mình chạy tới nè! 🐾"* và tự động bước tới vị trí vừa gọi | — |

## 3. Chăm sóc & Tiến hóa (`GROW_CARE_THRESHOLD = 3`)

| Hành động | Thời gian | Hiệu ứng chỉ số khi hoàn tất | Điều kiện |
| --- | --- | --- | --- |
| **🥟 Cho ăn (`feed`)** | 2 giây | No bụng `+28`, `care + 1` | No bụng `≤ 90` |
| **🪽 Bắt Snitch (`play`)** | 3 giây | Vui vẻ `+25`, Năng lượng `-12`, No bụng `-8`, `care + 1` | Vui vẻ `≤ 90` và Năng lượng `≥ 15` |
| **☾ Đi ngủ (`sleep`)** | 5 giây | Năng lượng `+35`, No bụng `-5`, `care + 1` | Năng lượng `≤ 90` |

### Các mốc trưởng thành & trang trí lều:
- **`care < 3`**: Hình thái **🐣 Bé Con (Sơ sinh)** (`/beasts/${kind}_baby.png` + `/beasts/${kind}_baby_walk.png`).
- **`care >= 3`**: **Tiến hóa thành 🌟 Trưởng Thành** (`/beasts/${kind}.png` + `/beasts/${kind}_walk.png`) và mở khóa **Chậu cây phép thuật (`🪴`)**.
- **`care >= 7`**: Mở khóa thêm **Dây sao & Nến bay lung linh (`🕯️ · ✦`)**.
