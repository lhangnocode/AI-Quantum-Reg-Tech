# Kết nối Figma với Claude Code (CLI)

Mục tiêu: trong terminal, dán link frame Figma → Claude đọc được thiết kế (layout, màu, chữ, ảnh chụp frame) → sinh component React/Tailwind đúng thiết kế.

Bạn đã cài plugin `figma@claude-plugins-official`. Plugin này đã đi kèm cấu hình **Figma MCP server (remote, `https://mcp.figma.com/mcp`)** và các skill cho luồng Figma → code. Việc còn lại là **đăng nhập Figma** và **dùng link frame**.

## 1. Đăng nhập (xác thực OAuth)

```bash
claude            # mở Claude Code trong thư mục dự án
```
Trong phiên Claude Code:
```
/mcp
```
- Chọn server **figma** → **Authenticate**.
- Trình duyệt mở trang Figma → bấm **Allow access**.
- Quay lại terminal, gõ `/mcp` lần nữa: `figma` phải hiện **✔ connected**.

Nếu không thấy server `figma` trong `/mcp`:
```bash
claude plugin list                  # kiểm tra plugin đang enabled
# hoặc thêm thủ công (không cần nếu plugin hoạt động):
claude mcp add --transport http --scope user figma https://mcp.figma.com/mcp
```
> Không cài **cùng lúc** cả server remote và server desktop (`figma-desktop`, `http://127.0.0.1:3845/mcp`) – dễ xung đột. Dùng remote là đủ.

## 2. Lấy link frame

Trong Figma trên web: chọn **frame** (vd. `/company/[ticker]`) → chuột phải → **Copy link to selection** (hoặc `Ctrl/⌘ + L`).
Link có dạng:
```
https://www.figma.com/design/<fileKey>/QuantumRegTech?node-id=12-345
```
`node-id` là thứ giúp Claude đọc đúng frame thay vì cả file.

Tài khoản của bạn cần **quyền xem** file đó (file của thành viên khác → nhờ họ share cho email Figma của bạn).

## 3. Câu lệnh mẫu trong Claude Code

**Xem thiết kế (chỉ đọc):**
```
Xem frame này và mô tả layout, các component, màu và font đang dùng:
https://www.figma.com/design/<fileKey>/QuantumRegTech?node-id=12-345
```

**Dựng thành code:**
```
Dựng frame này thành trang src/app/company/[ticker]/page.tsx.
Dùng shadcn/ui + Tailwind, biểu đồ theo docs/UI_DESIGN.md mục 4.2,
dữ liệu qua src/lib/api.ts, token màu trong globals.css.
<link frame>
```

**Lấy design tokens:**
```
Đọc Variables trong file Figma này và cập nhật token màu/spacing vào
src/app/globals.css và tailwind config, giữ đúng tên token ở docs/UI_DESIGN.md.
<link file>
```

**So khớp sau khi code:**
```
So sánh trang đang chạy ở localhost:3000/portfolio với frame này,
liệt kê sai lệch về spacing, màu, cỡ chữ và sửa.
<link frame>
```

## 4. Mẹo để Claude đọc thiết kế chính xác

- Dùng **Auto Layout** cho mọi frame – Claude chuyển thành flex/grid chính xác hơn.
- **Đặt tên layer** theo component (`ZScoreGauge`, `CompanyCard`), không để `Frame 123`.
- Khai báo màu/spacing bằng **Figma Variables**, trùng tên token trong `UI_DESIGN.md`.
- Gửi **từng frame một**, không gửi cả page lớn – nhanh hơn và ít tốn lượt gọi.
- Ghi chú (annotation) nguồn dữ liệu & tương tác ngay trên frame.
- Kết hợp plugin `frontend-design` bạn đã cài để Claude làm UI đẹp hơn khi frame còn sơ sài.

## 5. Giới hạn cần biết

- **Rate limit:** Figma giới hạn số lượt đọc qua MCP theo gói và loại seat. Seat View/Collab (gói Free/Starter) bị giới hạn khá thấp; seat Dev/Full ở gói Professional trở lên được nhiều hơn. Hết lượt → đợi hoặc dùng seat của thành viên có gói cao hơn. Sinh viên có thể xin **Figma Education** miễn phí (xác minh email trường).
- Claude Code **đọc** thiết kế tốt; việc **ghi/vẽ ngược** lên Figma bị giới hạn theo client và yêu cầu Full seat → coi Figma là nguồn thiết kế, code là nơi sửa.
- Font Be Vietnam Pro cần có trong file Figma/Google Fonts để hiển thị đúng.

## 6. Xử lý lỗi thường gặp

| Triệu chứng | Cách xử lý |
|---|---|
| `/mcp` báo figma **failed / needs auth** | Chọn figma → Authenticate lại; thử `claude mcp remove figma` rồi thêm lại |
| Claude nói không truy cập được file | Kiểm tra tài khoản Figma đăng nhập có quyền xem file |
| Kết quả không đúng frame | Link thiếu `node-id` → dùng *Copy link to selection* |
| Báo vượt giới hạn (rate limit) | Đợi reset, gửi frame nhỏ hơn, hoặc dùng seat cao hơn |
| Có 2 server figma xung đột | Giữ lại remote, xoá `figma-desktop` |
