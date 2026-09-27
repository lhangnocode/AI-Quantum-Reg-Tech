# PDF demo – Cổng 2 (Nạp dữ liệu bảo mật)

BCTC của **doanh nghiệp giả định** (không phải DN thật), sinh bằng `node scripts/make-sample-pdf.mjs --demo`.
Mở http://localhost:3000/private → tải một tệp → tích cam kết → **Bắt đầu phân tích**, rồi so với đáp án dưới đây.

| Dạng tệp | Kiểm tra gì |
|---|---|
| `*.pdf` | PDF có lớp chữ – đọc trực tiếp, không cần OCR (≈ 1–2 giây) |
| `*-scan.pdf` | Bản scan sạch ~200 dpi – buộc OCR (≈ 5–7 giây) |
| `*-scan-xau.pdf` | Bản scan xấu: ~150 dpi, nghiêng 0,5°, nhiễu hạt, nén JPEG mạnh – thử độ bền OCR; có thể thiếu / sai vài chỉ tiêu → app phải báo cảnh báo thay vì đoán |

## 02-mau-qrt-grey – Khá – vùng Grey

**CÔNG TY CỔ PHẦN THỰC PHẨM MẪU QRT** · Z' ≈ **2,52 → Grey** · X1–X5 = 0,147 · 0,129 · 0,120 · 1,377 · 1,363

| Chỉ tiêu | Mã số | Giá trị đúng (VND) |
|---|---|---|
| Tài sản ngắn hạn | 100 | 612.450.318.220 |
| Tổng cộng tài sản | 270 | 1.457.563.223.991 |
| Nợ ngắn hạn | 310 | 398.221.540.118 |
| Nợ phải trả | 300 | 613.097.542.463 |
| Vốn chủ sở hữu | 400 | 844.465.681.528 |
| LNST chưa phân phối | 421 | 187.340.225.614 |
| Doanh thu thuần | 10 | 1.986.504.117.390 |
| Tổng LN kế toán trước thuế | 50 | 142.905.330.218 |
| Chi phí lãi vay | 23 | 31.448.917.006 |

## 01-an-phat-safe – Khoẻ – vùng Safe

**CÔNG TY CỔ PHẦN SỮA VÀ ĐỒ UỐNG AN PHÁT (GIẢ ĐỊNH)** · Z' ≈ **4,22 → Safe** · X1–X5 = 0,463 · 0,325 · 0,195 · 3,000 · 1,751

| Chỉ tiêu | Mã số | Giá trị đúng (VND) |
|---|---|---|
| Tài sản ngắn hạn | 100 | 520.000.000.000 |
| Tổng cộng tài sản | 270 | 800.000.000.000 |
| Nợ ngắn hạn | 310 | 150.000.000.000 |
| Nợ phải trả | 300 | 200.000.000.000 |
| Vốn chủ sở hữu | 400 | 600.000.000.000 |
| LNST chưa phân phối | 421 | 260.118.450.772 |
| Doanh thu thuần | 10 | 1.401.114.182.230 |
| Tổng LN kế toán trước thuế | 50 | 149.420.251.832 |
| Chi phí lãi vay | 23 | 6.902.118.004 |

## 03-binh-minh-distress – Kiệt quệ – vùng Distress (lỗ luỹ kế, lỗ trước thuế)

**CÔNG TY CỔ PHẦN NÔNG SẢN THỰC PHẨM BÌNH MINH (GIẢ ĐỊNH)** · Z' ≈ **0,57 → Distress** · X1–X5 = -0,333 · -0,150 · 0,029 · 0,224 · 0,750

| Chỉ tiêu | Mã số | Giá trị đúng (VND) |
|---|---|---|
| Tài sản ngắn hạn | 100 | 300.000.000.000 |
| Tổng cộng tài sản | 270 | 1.200.000.000.000 |
| Nợ ngắn hạn | 310 | 700.000.000.000 |
| Nợ phải trả | 300 | 980.000.000.000 |
| Vốn chủ sở hữu | 400 | 220.000.000.000 |
| LNST chưa phân phối | 421 | -180.118.402.330 |
| Doanh thu thuần | 10 | 900.283.716.105 |
| Tổng LN kế toán trước thuế | 50 | -60.078.498.780 |
| Chi phí lãi vay | 23 | 95.118.402.330 |
