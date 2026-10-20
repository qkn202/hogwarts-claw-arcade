# Tiến độ Dự án — Hogwarts · Tiệm Gắp Thú Phép Thuật

Cập nhật: 20/10/2026.

## Đã hoàn thành

1. **Tủ Gắp Hộp Sô-cô-la Ếch Honeydukes**:
   - Lồng kính máy gắp hiển thị thuần 42 Hộp Sô-cô-la Ếch ngũ giác đóng kín, không chồng chéo biểu tượng phụ trên hộp.
   - Nâng độ khó gắp hộp (trượt khi nâng/kéo ngang lệch tâm) và thiết lập tỷ lệ mở hộp: **Hộp bẫy "Lêu lêu!" cao nhất (~62%)**, **Rương Vàng Gringotts 10–500 Gals (~14%)**, **Sinh Vật Huyền Bí (~24%)**.
2. **28 Sinh Vật Huyền Bí (Bé Con 🐣 → Trưởng Thành 🌟)**:
   - Hoàn thiện toàn bộ 112 tệp ảnh PNG tách nền trong suốt (`360×360` chân dung & `2880×360` dải 8-frame bước đi cho cả 2 giai đoạn Sơ sinh và Trưởng thành của 28 loài).
   - Khi mới gắp sẽ là **🐣 Bé Con**, sau 3 lần chăm sóc tại Lều Bác Hagrid sẽ lớn thành **🌟 Trưởng Thành**.
3. **Lều Bác Hagrid & Tương tác Trực tiếp với Thú**:
   - Tự động khử trùng lặp thú cùng loài trong lều (`loadPets`).
   - Thú tự do đi bộ khắp phòng với hoạt ảnh Sprite Sheet 8 khung hình.
   - Hỗ trợ **click/chạm và vuốt trực tiếp lên thú (`#home-pet`)** theo từng vùng (Đầu: *Xoa đầu/Vuốt ve*, Má/Cằm: *Nựng má/Gãi cằm*, Bụng: *Cù lét/Ôm ấp*) kèm bong bóng cảm xúc, tim bay và 2 nút nhanh `👋 Vuốt ve` / `🥰 Nựng má`.
4. **Tab Bộ Sưu Tập Riêng Biệt (`#collection-view`)**:
   - Tách thành tab độc lập thứ 3 với thanh lọc (`Tất cả (28)`, `✦ 20 Thú Mới`, `8 Thú Cổ Điển`, `Đã sở hữu`) và khung ảnh đôi **🐣 Bé Con → 🌟 Trưởng Thành** rõ nét.
5. **Tối ưu hóa UI/UX Mobile (Nằm Dọc & Nằm Ngang) & iOS 16+**:
   - Tương thích từ **iOS 16.0+** (`target: ['es2020', 'safari16']`, `viewport-fit=cover`, `100dvh`, `env(safe-area-inset-*)`, chống auto-zoom input, `webkitAudioContext`, `drawRoundedRect` fallback).
   - Bố cục chuyên biệt cho cả **Portrait** và **Landscape** trên điện thoại.
6. **Backend Realtime Supabase, HPVN Bridge & Vercel**:
   - Kết nối hệ sinh thái Supabase chung (`fxucyrofcsuqtlkukcrx.supabase.co` & `sb_publishable_zEiG2Py5kDmGhkTgw0uWIA_We0rOCGu`) từ các game `7-Potters` và `Hogwarts Monopoly`.
   - **Mạng Floo Realtime & Presence**: Theo dõi số lượng phù thủy đang online cùng tiệm (`claw-arcade-global`).
   - **Bản tin Phép thuật Toàn cầu (Magic Broadcasts)**: Bắn thông báo toast parchment nổi khi có người chơi trong mạng gắp được sinh vật huyền bí hoặc mở Rương Galleons Gringotts.
   - **Cầu nối Định danh HPVN (HPVN Bridge)**: Nhận diện thành viên HPVN, Nhà Hogwarts (Gryffindor, Slytherin, Ravenclaw, Hufflepuff) và fallback guest profile.
   - **Lưu trữ & Đồng bộ Đám mây (Cloud Save)**: Hợp nhất thông minh dữ liệu cục bộ và server không lo mất dữ liệu.
   - **Standalone Node Server (`server/index.mjs`)**: Cung cấp REST APIs (`/api/health`, `/api/save`, `/api/load/:uid`, `/api/leaderboard`) và WebSocket relay.
   - **Cấu hình Vercel**: Thiết lập `vercel.json` SPA rewrite và `.vercel/project.json` sẵn sàng deploy lên Vercel team `hpvn1`.

## Đã xác minh

- `npm test`: **18/18** bài kiểm thử tự động đạt 100% (cả Frontend và Backend).
- `npm run check`: Kiểm tra cú pháp toàn bộ 7 module JS đạt chuẩn.
- `npm run build`: Đóng gói production Vite thành công.

