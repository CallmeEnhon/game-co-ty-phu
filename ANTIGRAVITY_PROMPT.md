# PROMPT ĐỂ ĐƯA VÀO ANTIGRAVITY

Bạn đang nhận một project HTML/CSS/JavaScript thuần có tên **Cờ Tỷ Phú Công Ty**.

## Mục tiêu

Giữ nguyên phong cách giao diện hiện tại và phát triển thành game multiplayer online có gameplay tương tự Business Tour, nhưng dùng chủ đề văn phòng và không sao chép tài sản thương hiệu, hình ảnh hoặc code của Business Tour.

## Những gì project hiện có

- Màn hình lobby:
  - Tạo phòng.
  - Vào phòng bằng mã.
  - Danh sách người chơi.
  - Trạng thái sẵn sàng.
- Màn hình bàn cờ:
  - Danh sách người chơi bên trái.
  - Bàn cờ kiểu Monopoly.
  - Xúc xắc có animation.
  - Quân cờ di chuyển từng ô.
  - Popup mua tài sản.
  - Nhật ký trận đấu.
- Màn hình kết quả:
  - Xếp hạng.
  - Tổng tài sản.
  - Thống kê.
  - Confetti animation.

## Yêu cầu phát triển tiếp

### 1. Kiến trúc

- Giữ frontend dễ deploy trên GitHub Pages.
- Dùng Firebase hoặc Supabase cho:
  - Anonymous authentication.
  - Realtime room state.
  - Tạo phòng và vào phòng bằng mã.
  - Đồng bộ lượt chơi.
  - Đồng bộ người chơi, tiền, vị trí và tài sản.
- Tách code thành module:
  - `state.js`
  - `board.js`
  - `rooms.js`
  - `bot.js`
  - `animations.js`
  - `ui.js`

### 2. Gameplay

- 2–4 người chơi.
- Cho phép add bot vào phòng.
- Host có thể chọn độ khó bot.
- Bot có thể:
  - Đổ xúc xắc.
  - Mua hoặc bỏ qua tài sản.
  - Nâng cấp.
  - Sử dụng thẻ cơ hội.
  - Tổ chức lễ hội.
- Mỗi người bắt đầu với $1,500.
- Qua ô Bắt đầu nhận $200.
- Tài sản có thể nâng cấp nhiều cấp.
- Tiền thuê tăng theo cấp công trình.
- Có phá sản và chuyển giao tài sản.

### 3. Cơ chế Lễ hội

- Có ô `Lễ hội công ty`.
- Người chơi đứng vào ô này được chọn một tài sản đang sở hữu.
- Tài sản được chọn tăng mạnh tiền thuê trong một số vòng.
- Hiển thị biểu tượng lễ hội trên ô tài sản.
- Hiển thị đồng hồ đếm số vòng hiệu lực.
- Có animation:
  - Confetti.
  - Glow quanh tài sản.
  - Pop-up thông báo toàn phòng.

### 4. Motion

- Xúc xắc:
  - Shake.
  - Rotate.
  - Bounce khi dừng.
- Quân cờ:
  - Hop từng ô.
  - Camera hoặc board highlight ô đang đến.
- Popup:
  - Scale + fade.
- Tiền:
  - Counter animation.
  - Bay từ người trả sang người nhận.
- Tài sản:
  - Animation dựng công trình khi nâng cấp.
- Lượt:
  - Highlight player HUD.
  - Glow vàng và pulse nhẹ.

### 5. Quy tắc realtime

- Chỉ người đang tới lượt được gửi hành động.
- Mọi hành động cần transaction hoặc optimistic locking.
- Không cho client tự ý sửa tiền hay xúc xắc.
- Host migration nếu chủ phòng thoát.
- Reconnect khi mất mạng.
- Cleanup phòng không hoạt động.

### 6. Responsive

- Desktop ưu tiên.
- Tablet vẫn chơi được.
- Mobile có thể cuộn ngang bàn cờ.
- Không phá layout hiện tại.

### 7. Không thay đổi

- Không đổi phong cách màu chủ đạo.
- Không đổi bố cục lobby, board, popup và result.
- Không thay toàn bộ CSS bằng framework.
- Không dùng canvas cho toàn bộ UI.
- Giữ DOM-based board để dễ chỉnh thiết kế.

## Bắt đầu

1. Đọc toàn bộ `index.html`, `styles.css`, `app.js`.
2. Chạy project và xác nhận giao diện hiện có.
3. Refactor thành module nhưng giữ giao diện giống hiện tại.
4. Xây multiplayer theo từng bước.
5. Sau mỗi bước phải bảo đảm game vẫn chạy.
