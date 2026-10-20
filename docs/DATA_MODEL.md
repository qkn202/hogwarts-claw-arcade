# Dữ liệu và Lưu tiến trình

Cập nhật: 20/10/2026. Game lưu tiến trình hoàn toàn trên `localStorage` của trình duyệt, không yêu cầu backend.

## 1. Bộ sưu tập 28 Sinh Vật Huyền Bí

Key: `momo-claw.collection.v1`

```json
{
  "bear": 2,
  "rabbit": 1,
  "hippogriff": 1,
  "thestral": 0
}
```

- Quản lý bởi `loadCollection(storage)` và `saveCollection(storage, collection)` trong [`web/rules.js`](../web/rules.js).
- Chấp nhận tất cả **28 mã loài** định nghĩa trong `TYPES`. Giá trị thiếu hoặc sai kiểu tự động được chuẩn hóa về `0`.
- Chỉ tăng khi gắp hộp vào Hố Nhận Quà và mở trúng sinh vật huyền bí (không tăng khi mở trúng hộp `"Lêu lêu!"` hoặc `Rương Vàng Gringotts`).

## 2. Túi vàng Galleon Ngân hàng Gringotts

Key: `momo-claw.galleons.v1`

- Lưu tổng số đồng vàng **Galleon (`Gals`)** người chơi nhận được khi mở trúng **Rương Kho Báu Gringotts** (ngẫu nhiên từ **10 đến 500 Gals** mỗi rương).
- Hiển thị trực tiếp trên thanh Header (`#gals-count`).

## 3. Thú cưng trong Lều Bác Hagrid

Key: `momo-pets.v1`

```json
{
  "pets": [
    {
      "id": "bear-1729400000000-abc",
      "kind": "bear",
      "name": "Niffler Đào Vàng",
      "food": 65,
      "joy": 65,
      "energy": 75,
      "care": 0
    }
  ],
  "active": "bear-1729400000000-abc"
}
```

| Trường | Ý nghĩa và xử lý khi tải (`loadPets`) |
| --- | --- |
| `pets` | Mảng các sinh vật trong lều; tự động **khử trùng lặp theo `kind`** (mỗi loài chỉ giữ tối đa 1 cá thể có `care` cao nhất trong lều). |
| `id` | Chuỗi định danh duy nhất. |
| `kind` | Một trong 28 khóa loài trong `TYPES`; loại bỏ loài không hợp lệ hoặc chưa có trong `collection`. |
| `name` | Chuỗi đã `trim()`, giới hạn tối đa 24 ký tự; tự động nâng cấp tên mặc định cũ sang tên sinh vật Hogwarts. |
| `food`, `joy`, `energy` | Chỉ số nhu cầu trong khoảng `0–100`; mặc định `65 / 65 / 75`. |
| `care` | Số lần chăm sóc hoàn tất (`0–100000`). Khi `care < 3`: hiển thị hình thái **🐣 Bé Con**; khi `care >= 3`: tiến hóa thành **🌟 Trưởng Thành**. |
| `active` | ID sinh vật đang xuất hiện trong phòng. |
