# Runbook demo QuantumRegTech

Runbook này giúp người trình bày chạy đúng luồng và tránh mô tả nhầm dữ liệu demo thành dữ liệu live. Luồng chi tiết và tiêu chí kiểm duyệt nằm ở [USER_FLOWS.md](USER_FLOWS.md).

## 1. Trước buổi demo

### Chuẩn bị môi trường

Chạy từ thư mục gốc repo (cùng cấp `package.json`):

```bash
npm run data
backend/.venv/bin/uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload --reload-dir backend/app
```

Lệnh trên chạy FastAPI ở cổng 8000. Nếu chưa cài dependency, tạo môi trường một lần bằng `python3 -m venv backend/.venv && backend/.venv/bin/pip install -r backend/requirements.txt`.

Ở terminal thứ hai chạy `npm run dev`, rồi mở `http://localhost:3000`. Lệnh `predev` tự sinh JSON và chép tài nguyên OCR. Dùng Node.js 22 theo hướng dẫn repo.

`/api/universe` phải trả 200. Nếu trả 503, kiểm tra `http://127.0.0.1:8000/health`, `QUANTUM_API_URL` hoặc `NEXT_PUBLIC_API_URL`, sau đó khởi động lại Next.js nếu vừa sửa `.env.local` (hoặc FastAPI nếu vừa sửa `backend/.env`). Kiểm tra Neo4j tại `http://127.0.0.1:8000/api/v1/graph/status`; `ready_empty` nghĩa là DB kết nối được nhưng chưa có node.

### Chọn chế độ OSINT

- Chỉ dùng Firecrawl Agent API: mỗi lượt quét = 1 job cho 1 mã, với khung chọn 6/12/24/36/60 tháng đến hôm nay. **Thường mất vài phút** – giao diện hiện số giây đã chờ.
- Chạy ở `/portfolio` hoặc `/company/[mã]` → **Theo dõi sự kiện xử phạt**. Sự kiện đã duyệt trong workbook hiện ở mục riêng và đã được tính; sự kiện mới phải mở nguồn rồi bấm "Chấp nhận mức 1/2/3" hoặc "Bỏ".
- Cần `FIRECRAWL_API_KEY` trong `backend/.env`; thiếu key hoặc FastAPI không chạy → chỉ hiện sự kiện đã duyệt trong workbook kèm cảnh báo.
- Chi phí: tới `OSINT_AGENT_MAX_CREDITS` (mặc định 500) mỗi mã mỗi lượt. Kiểm tra credit trước buổi demo; nên chạy sẵn một lượt trước giờ trình bày.
- `OSINT_VERIFY_SOURCES=false` (mặc định): không đọc lại trang nguồn, không gọi LLM. Bật `true` để kiểm quote bằng Firecrawl scrape (1 credit/trang) và cho Groq/Gemini gợi ý mức. Jina giữ trong code nhưng tắt.

## Kiểm chứng AI Agent trong demo

1. Mở `/company/VNM`, chọn khoảng 6/12/24/36/60 tháng rồi bấm **Quét sự kiện**. Một lượt live trả candidate, nguồn và metadata provider; chỉ kết quả có thể đối chiếu mới nên được reviewer chấp nhận.
2. Đọc dòng chẩn đoán ngay dưới nút: số kết quả, số đề xuất LLM và số quote khớp chính xác với excerpt. Mở nguồn từng kết quả để tự đối chiếu. Số đề xuất lớn hơn 0 chứng minh model đã trả structured output; quote khớp bằng 0 vẫn là kết quả hợp lệ nhưng không có căn cứ để preview penalty.
3. Neo4j `đã kết nối, chưa có node công ty` chứng minh kết nối sống nhưng graph chưa có dữ liệu; `chưa kết nối` là cấu hình/kết nối cần xử lý. Không cần ghi dữ liệu demo vào graph để chạy luồng OSINT.
4. Khi backend/provider không khả dụng, UI hiển thị cảnh báo và các sự kiện đã duyệt có trong workbook. Nếu tìm kiếm sống không có bài, không có nguồn để phân loại.
5. Mở Developer Tools → Network, chọn request `POST /api/osint/scan` (HTTP `202` kèm `scan_id`) và các request `GET /api/osint/scan/<id>` (trạng thái `running` → `completed`) để kiểm tra workflow, metadata provider/AI và findings. Không chụp/paste request environment hoặc API key vào log demo.

Luồng Firecrawl-only mới chỉ được kiểm bằng test backend với provider giả lập (`backend/tests/test_osint_graph.py`); chưa có lượt kiểm chứng với key thật. Kết quả tìm kiếm và nội dung LLM thay đổi theo thời điểm.

### Demo AI đọc PDF

1. Vào `/private`, dùng tài liệu giả định `tests/fixtures/bctc-mau-qrt-2024.pdf`.
2. Chọn đồng ý xử lý cục bộ. Tick thêm checkbox AI Agent để cho phép gửi text OCR/trích xuất (không gửi PDF gốc) tới Groq/Gemini.
3. Trong Processing theo dõi `Đọc tài liệu/OCR → Chuẩn hoá → LLM Agent → Z'-Score`. Kết quả phải ghi provider/model, workflow `llm_extract → validate_evidence`, số proposal và số quote đã khớp.
4. Bảng đánh dấu phương pháp theo từng field (`LLM`/`Rules`), trang và quote. Nếu model không trả evidence khớp, field giữ giá trị của parser hoặc để trống; không lấy proposal chưa kiểm chứng để tính Z'. Nếu hai phương pháp lệch nhau, so sánh dòng gốc trước khi trình bày.
5. PDF scan `tests/fixtures/bctc-mau-qrt-2024-scan.pdf` minh hoạ OCR. Không gửi tài liệu thật/mật tới provider nếu chưa được phép.
- Khi không có kết quả live, app chỉ hiển thị sự kiện workbook đã duyệt và nêu cảnh báo kết nối.
- Hồ sơ OSINT hiển thị các bước agent và trạng thái Neo4j. Hiện Aura đã kết nối nhưng graph rỗng; muốn nạp dữ liệu workbook demo thì chạy lệnh seed có cờ ghi chủ động trong [backend README](../backend/README.md).
- Cấu hình MCP cho IDE nằm trong `.vscode/mcp.json`. Bật Tool authentication trong Aura Console, mở VS Code và hoàn tất OAuth trong browser. Chỉ đọc graph khi demo.
- Mẫu: `.env.example` (frontend → `.env.local`) và `backend/.env.example` (FastAPI → `backend/.env`). Chỉ thêm các dòng còn thiếu, không ghi đè key hiện có; sửa xong thì khởi động lại `npm run dev` hoặc uvicorn tương ứng.
- Nếu provider lỗi, giao diện giữ kết quả từ provider khác hoặc báo rõ fallback; không nói rằng app vừa xác minh vi phạm.

### Tệp PDF demo

- `tests/fixtures/bctc-mau-qrt-2024.pdf`: PDF chữ, công ty giả định, dùng để thấy trích xuất và vùng Grey.
- `tests/fixtures/bctc-mau-qrt-2024-scan.pdf`: PDF scan, dùng để minh họa OCR.
- Đáp án: `tests/fixtures/bctc-mau-qrt-2024.expected.json`. Đây cũng là fixture của e2e test – không sửa tay; tạo lại bằng `node scripts/make-sample-pdf.mjs`.

Đóng các tab/file cá nhân trước khi trình chiếu. Không dùng hồ sơ thẩm định thật nếu chưa được phép gửi/hiển thị trong buổi demo.

## 2. Kịch bản nói 5–7 phút

### 0:00–0:40 — Nêu bối cảnh

> “Đây là prototype trên bộ dữ liệu workbook của nhóm. Tôi sẽ đi từ universe cổ phiếu đến hồ sơ rủi ro, thử phân bổ, rồi minh họa OCR trên một BCTC giả định.”

Mở `/stocks`, nêu universe hiện tại có 9 mã analysis-ready: VNM, MCH, MCM, SBT, QNS, KDC, PAN, IDP, SAB. Mã mới đăng ký sẽ ở trạng thái chờ dữ liệu cho tới khi có đầu vào nguồn được kiểm tra.

### 0:40–1:50 — Danh sách và hồ sơ doanh nghiệp

1. Tìm VNM, PAN hoặc MCM trong `/stocks`.
2. Mở hồ sơ và chỉ vào Altman, ESG, OSINT, RFin base/POSINT/RFin total.
3. Nhấn mạnh ô `—` là dữ liệu chưa có, không phải điểm 0.

### 1:50–2:50 — OSINT

1. Ở hồ sơ doanh nghiệp chọn khung thời gian rồi bấm `Quét sự kiện`.
2. Chế độ demo: nêu rõ sự kiện xuất phát từ workbook và có thể đã nằm trong assessment; hệ thống không cộng penalty lần hai.
3. Chế độ live: xem nguồn Firecrawl và nhóm truy vấn của từng kết quả, mở URL, đọc trích đoạn và đề xuất AI; bài viết chưa chứng minh vi phạm, cần reviewer.
4. AI chỉ phân loại excerpt và không ghi POSINT. Chưa có persistence/audit trail.

### 2:50–4:00 — Portfolio

1. Từ `/stocks`, chọn các mã analysis-ready và mở `/portfolio`.
2. Chọn vốn và mức ưu tiên, rồi quan sát tỷ trọng tham chiếu.
3. Nêu rõ đây là phân bổ theo thứ hạng và mức ưu tiên; chưa có covariance thực và chưa chạy QUBO/QAOA.

### 4:00–5:20 — PDF nội bộ

1. Mở `/private` và dùng `tests/fixtures/bctc-mau-qrt-2024.pdf`.
2. Kiểm tra extracted rows, trang/dòng, X1–X5 và Z′ nếu đủ inputs.
3. Nếu còn thời gian, dùng `tests/fixtures/bctc-mau-qrt-2024-scan.pdf` để cho thấy OCR.
4. Nêu rõ đây là BCTC giả định; OCR/parser chạy trong trình duyệt, LLM extraction chỉ bật khi có opt-in; kết quả chưa ghi vào hồ sơ cổ phiếu public và chưa có RAG.

### 5:20–6:00 — Báo cáo

Mở `/report/VNM`, lướt nguồn/phương pháp/data gap và dùng `In / Lưu PDF`.

## 3. Câu trả lời ngắn cho câu hỏi thường gặp

**“Đây có phải dữ liệu thị trường realtime?”**
Không. Bảng hiện tại lấy từ workbook demo (BCTC 2024, price inputs theo tài liệu dữ liệu). Không có feed giá live.

**“OSINT có xác nhận doanh nghiệp vi phạm không?”**
Không. Firecrawl search trả candidate và nguồn để reviewer đánh giá. Bài báo không đồng nghĩa quyết định xử phạt.

**“Thay đổi tham số có chạy optimizer mới không?”**
Slider hiện phân bổ theo mức ưu tiên và dữ liệu năm; đây chưa phải solver Markowitz/QUBO/QAOA và chưa có covariance.

**“PDF có được AI đọc không?”**
OCR/parser chạy trên trình duyệt. Có thể bật LLM extraction riêng bằng checkbox đồng ý gửi text trích xuất; mỗi giá trị AI cần quote/trang nguồn khớp. Chưa có RAG hoặc xử lý chéo nhiều hồ sơ.

**“Có scale thêm cổ phiếu được không?”**
Universe hiện có 9 mã analysis-ready. Có thể đăng ký thêm mã, nhưng cần nhập dữ liệu có nguồn ở các sheet liên quan; mã chưa đủ dữ liệu không được giả làm analysis-ready.

## 4. Nếu gặp sự cố

| Hiện tượng | Cách xử lý demo |
|---|---|
| `/api/universe` trả 503 | Khởi động FastAPI ở cổng 8000 trong cùng workspace, kiểm tra `/health` và URL backend trong `.env.local` (Vercel: biến môi trường của project) |
| Search provider timeout/quota | Nêu rõ dịch vụ không khả dụng; giao diện chỉ hiện các sự kiện workbook đã duyệt kèm cảnh báo |
| Document Agent `RateLimitError` | Chờ quota provider hồi phục hoặc đổi `AI_PROVIDER` sang provider khác đã cấu hình; kết quả Rules vẫn hiển thị. Không gửi lại liên tục vì sẽ tăng rate limit |
| Document Agent báo 413 | Bản hiện tại giới hạn và lọc context trước khi gửi. Nếu provider vẫn từ chối request, dùng PDF ngắn hơn hoặc giảm số trang; parser Rules vẫn là fallback |
| OCR chưa tải worker | Chờ trang nạp tài nguyên hoặc tải lại; dùng PDF chữ làm đường dự phòng |
| Kết quả PDF thiếu một số ô | Dùng PDF chữ `tests/fixtures/bctc-mau-qrt-2024.pdf`; chỉ rõ parser giữ thiếu thay vì đoán |
| Portfolio báo thiếu dữ liệu | Chọn mã có trạng thái analysis-ready; mã pending chưa thể tính chỉ số hoặc phân bổ |
| Sửa workbook mà app vẫn giữ dữ liệu cũ | Dừng server, chạy `npm run data`, sau đó khởi động lại `npm run dev` |
