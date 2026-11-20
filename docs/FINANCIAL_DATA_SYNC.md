# Đồng bộ dữ liệu tài chính

Trang **Danh sách mã** có nút **Cập nhật dữ liệu** để tải dữ liệu mới nhất cho 9 mã đang có dữ liệu phân tích.

## Nguồn và dữ liệu

- Giá đóng cửa đã điều chỉnh và VN-Index: VNDirect Finfo API (`stock_prices`, `vnmarket_prices`). Đồng bộ toàn bộ chuỗi từ 2018-11 để cập nhật file giá tháng dùng cho covariance.
- Báo cáo tài chính: VNDirect Finfo API (`financial_statements`). Giao diện lưu kỳ báo cáo mới nhất và các dòng chỉ tiêu nguồn trả về cho mỗi mã.
- Thời điểm đồng bộ, ngày giá, kỳ báo cáo và lỗi từng mã được lưu trong `data/latest_financial_data.json`.

Các endpoint này đang được dùng như API công khai, không cần API key trong bộ kết nối này; chúng không phải cam kết SLA hay API thương mại có bảo đảm. Hãy xác nhận điều khoản với nhà cung cấp trước khi phân phối sản phẩm thương mại hoặc tải dữ liệu với tần suất lớn. API có thể đổi cấu trúc hoặc giới hạn yêu cầu.

## Cập nhật và lưu trữ

Đồng bộ được người dùng khởi chạy thủ công để tránh gọi nguồn theo mỗi lượt xem trang. Giá chỉ được ghi khi đủ chuỗi của 9 mã và VN-Index; thao tác ghi dùng file tạm rồi thay thế nguyên tử. Nếu báo cáo một mã lỗi, báo cáo lưu thành công trước đó được giữ lại và lỗi được hiển thị riêng.

Mặc định đường dẫn lưu là `data/market_prices_monthly.csv` và `data/latest_financial_data.json`. Khi triển khai trên máy chủ có filesystem tạm, gắn volume bền vững và đặt:

```env
MARKET_PRICE_PATH=/var/data/market_prices_monthly.csv
LATEST_FINANCIAL_DATA_PATH=/var/data/latest_financial_data.json
```

Điểm Altman Z, CAPM và ESG hiện vẫn lấy từ workbook đã kiểm tra. Báo cáo mới tải được hiển thị riêng; hệ thống chưa ghi đè các điểm đó vì cần chuẩn hóa và đối chiếu các dòng VAS trước khi thay đổi công thức đầu vào.
