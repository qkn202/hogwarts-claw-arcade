# Triển khai Kỹ thuật & Tương thích iOS 16+

Cập nhật: 20/10/2026.

## Công nghệ & Cấu hình Build

- **Runtime**: Vanilla JavaScript ES Modules, HTML5 Canvas 2D + SVG + CSS Animations, không phụ thuộc runtime nặng.
- **Bundler**: Vite (`vite.config.ts`) cấu hình `build.target: ['es2020', 'safari16']` đảm bảo tương thích đầy đủ từ **iOS 16.0+ (Safari 16+)** trở lên.
- **Testing**: Node.js built-in test runner (`node --test`) + `jsdom` (13 kịch bản kiểm thử tự động).

## Trách nhiệm từng Module

| File | Trách nhiệm chính |
| --- | --- |
| [`index.html`](../index.html) | Khung HTML 3-tab SPA (`#arcade-view`, `#collection-view`, `#pet-view`), meta `viewport-fit=cover` và hỗ trợ Web App iOS. |
| [`web/rules.js`](../web/rules.js) | Định nghĩa 28 loài thú (`TYPES`, `ORIGINAL_8_KINDS`), luật bắt `findCatch`, hố nhận quà `inPrizeChute` và lưu trữ `localStorage`. |
| [`web/art.js`](../web/art.js) | `toyPortrait(kind, stage, includeStrip)` kết xuất chân dung 3D Realistic-Chibi và dải **8-Frame Walking Sprite Sheet** (`912×114` viewBox `114×114`). |
| [`web/scene.js`](../web/scene.js) | Kết xuất 3D-lit HTML5 Canvas cho Tủ Gắp Hogwarts, 42 Hộp Sô-cô-la Ếch ngũ giác đóng kín, sân khấu mở hộp 3D (Thú, Rương Gringotts, Hộp bẫy Lêu lêu) và hỗ trợ chạm/vuốt trên lồng kính. |
| [`web/pets.js`](../web/pets.js) | Quản lý Lều Bác Hagrid, khử trùng lặp thú, chuyển động tự do trong phòng, tiến hóa Bé Con → Trưởng Thành và tương tác trực tiếp (`Vuốt ve`, `Nựng má`, `Cù lét`, bong bóng thoại, tim bay). |
| [`web/main.js`](../web/main.js) | Vòng lặp `requestAnimationFrame`, điều hướng 3 tab SPA, bảng xác suất `BOX_MYSTERIES`, túi vàng Galleon và âm thanh (`AudioContext` / `webkitAudioContext`). |
| [`web/style.css`](../web/style.css) | Hệ thống giao diện Hogwarts, hoạt ảnh Sprite Sheet `steps(8, end)` và bố cục Responsive chuyên biệt cho Desktop, Mobile Portrait và Mobile Landscape (iOS 16+). |

## Hệ thống Artwork 28 Sinh Vật Huyền Bí (`public/beasts/`)

Mỗi loài `kind` trong 28 loài đều có 4 tệp PNG tách nền trong suốt tại `public/beasts/`:
1. `${kind}_baby.png` (`360×360`): Chân dung 3D Realistic-Chibi lúc **🐣 Bé Con**.
2. `${kind}_baby_walk.png` (`2880×360`): Dải 8 khung hình bước đi lúc **🐣 Bé Con**.
3. `${kind}.png` (`360×360`): Chân dung 3D Realistic-Chibi lúc **🌟 Trưởng Thành**.
4. `${kind}_walk.png` (`2880×360`): Dải 8 khung hình bước đi lúc **🌟 Trưởng Thành**.
- Cùng với `public/beasts/chest.png` cho Rương Kho Báu Ngân Hàng Gringotts.
