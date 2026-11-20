# Bản nháp: thay đổi từ Vòng 1 sang bản demo hiện tại

Phần này có thể chuyển vào Báo cáo giải pháp. Repo hiện không có file Báo cáo giải pháp mẫu để điền trực tiếp.

## Thay đổi có thể trình bày

| Nội dung | Vòng 1 / nhận xét | Bản demo hiện tại | Cách giải thích |
|---|---|---|---|
| Universe | 4 mã trong bản đầu | 9 mã có dữ liệu: IDP, KDC, MCH, MCM, PAN, QNS, SAB, SBT, VNM | Mở rộng theo workbook `QuantumRegTech_Input_Data_final.xlsx`; mã mới ngoài workbook vẫn ở `pending_data` cho đến khi nhập dữ liệu có nguồn. |
| CAPM | Phụ lục cũ ghi `Rf = 2,77%` | Với dữ liệu 2024 → 2025, workbook dùng `Rf = 3,068%`, `MRP = 8,35%` | `Rf` thay đổi theo năm dữ liệu; workbook hiện ghi dùng lợi suất TPCP Việt Nam 10 năm tại 31/12/2024 và MRP theo Damodaran. Bản cũ 2,77% đã bị bỏ do không khớp input đang dùng. Ri và các chỉ số được tính lại; cần nói rõ đây là cập nhật đầu vào. |
| MCM / OSINT | Nhận xét nêu sự kiện phạt môi trường `+0,10` bị mất | Workbook hiện giữ bài phản ánh năm 2022 ở mức 1 (`+0,05`), chưa có quyết định xử phạt | Không phải quyết định xử phạt đã xác nhận. Mức 2 chỉ dùng nếu tìm được quyết định. Sự kiện năm 2022 tính vào kỳ dự báo 2023, không làm tăng POSINT năm dữ liệu 2024; hiện cũng ngoài cửa sổ timeline 36 tháng. |
| OSINT | Kịch bản cũ mô tả phạm vi năm cố định | Người dùng chọn 6/12/24/36/60 tháng đến hôm nay; candidate cần người duyệt | Không gọi kết quả tìm kiếm là xác nhận vi phạm. Chấp nhận sự kiện chỉ cập nhật rủi ro trong phiên. |
| Phát hiện tẩy xanh | Ý tưởng có NLP/RAG và chỉ số tẩy xanh | Chưa có bộ phát hiện NLP/RAG; ESGi hiện là phân vị mức độ công bố 32 chỉ tiêu | Dữ liệu chưa có cặp tuyên bố và nguồn độc lập được kiểm chứng, nên rủi ro tẩy xanh là “chưa đánh giá”. Không diễn giải ESGi thành chỉ số tẩy xanh. |
| Tối ưu danh mục | Hồ sơ ý tưởng đề cập COBYLA/QUBO/QAOA | Web phân bổ tham chiếu theo thứ hạng và mức ưu tiên; chưa chạy Markowitz, QUBO hoặc QAOA | Chưa có chuỗi giá tháng/ngày để ước lượng covariance và chưa chốt hệ số QUBO. Chưa thể tuyên bố nghiệm tối ưu lượng tử hoặc hiệu quả đầu tư. |
| Xử lý PDF | Hồ sơ cũ có tuyên bố tự xóa/Zero-Retention | OCR/parser chạy trong trình duyệt; có thể gửi text trích xuất tới LLM khi người dùng đồng ý | Trình duyệt bỏ tham chiếu tệp sau xử lý. Điều này không chứng minh dữ liệu bị xóa khỏi memory, log, cache hoặc hạ tầng bên thứ ba; không gọi là Zero-Retention toàn hệ thống. |
| Triển khai | Hồ sơ cũ ghi Streamlit | Repo hiện dùng Next.js cho web và FastAPI cho API | Mô tả stack theo bản đang chạy. Môi trường triển khai cụ thể cần nêu đúng theo cấu hình demo/deploy thực tế. |
| Giá thị trường | Có thể bị hiểu là realtime | Dữ liệu lấy từ workbook theo kỳ; không có feed giá realtime | Lợi suất năm sau là kết quả lịch sử trong workbook, không phải dự báo hoặc lợi nhuận đảm bảo. Một kỳ quan sát không phải kiểm định ngoài mẫu. |

## Các lỗi giao diện đã được xử lý

- Mã trong danh sách mở `/company/{ticker}`.
- Trang không tìm thấy hồ sơ lấy danh sách từ universe hiện tại.
- Mục 7 báo cáo không lặp khối nguồn và dùng thống nhất MRP.
- Sự kiện PAN ghi rõ ngày quyết định 31/01/2024 và tách năm thanh tra 2022.
- Bỏ ghi chú nội bộ “(mock)” khỏi khối tẩy xanh; dùng “chưa đủ nguồn đối chiếu”.
- Thống nhất nhãn rủi ro tẩy xanh chưa đánh giá.
- Hồ sơ doanh nghiệp hiển thị cả vùng Altman và giá trị Z.

## Chỉ số cần đo trước khi điền kết quả nghiên cứu

Không có số đo OCR accuracy, precision/recall OSINT, thời gian xử lý chuẩn hóa theo bộ kiểm thử hoặc kết quả solver QUBO/QAOA đã được tái lập trong repo. Không điền các số này bằng ước lượng. Cần bộ tài liệu gán nhãn, tiêu chí đúng/sai, cấu hình chạy và log đo để lập bảng kết quả.

## Tài liệu cần bổ sung

Để hoàn thiện Báo cáo giải pháp thay vì chỉ cung cấp bản nháp này, cần đặt file mẫu/bản báo cáo vào repo hoặc gửi file đó. Bản nhận xét cho biết mẫu còn các ô `[...]`, nhưng file tương ứng không có trong workspace hiện tại.
