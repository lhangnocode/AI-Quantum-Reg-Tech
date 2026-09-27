import { expect, test } from "@playwright/test";

test.describe("smoke – mọi trang render không lỗi", () => {
  for (const path of ["/", "/company/VNM", "/company/MCM", "/company/SBT", "/portfolio", "/private", "/report/SBT"]) {
    test(path, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(path);
      await expect(page.getByText("Dữ liệu mẫu – PoC").first()).toBeVisible();
      expect(errors).toEqual([]);
    });
  }
});

test("Dashboard hiển thị số liệu từ api", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("15,96%")).toBeVisible();
  await expect(page.getByText("+4,11 điểm % so với Baseline")).toBeVisible();
  await expect(page.locator(".recharts-pie-sector")).toHaveCount(4);
});

test("Cổng 1 – MCM có bằng chứng tẩy xanh và sự kiện OSINT", async ({ page }) => {
  await page.goto("/company/MCM");
  await expect(page.getByText("Rủi ro tẩy xanh: Cao")).toBeVisible();
  await expect(page.getByText("Báo chí phản ánh nguy cơ ô nhiễm môi trường").first()).toBeVisible();
  await page.getByRole("button", { name: "Thêm vào danh mục" }).click();
  await expect(page.getByText("Đã thêm MCM vào danh mục theo dõi")).toBeVisible();
});

test("ticker không tồn tại → trang 404", async ({ page }) => {
  await page.goto("/company/XYZ");
  await expect(page.getByText("Không tìm thấy trang")).toBeVisible();
});

test("Danh mục – kéo γ, δ về 0 chuyển sang kịch bản Baseline", async ({ page }) => {
  await page.goto("/portfolio");
  await expect(page.getByText("50,9%").first()).toBeVisible();
  for (const name of ["γ – ESG", "δ – Phạt rủi ro"]) {
    const thumb = page.getByRole("slider", { name });
    await thumb.focus();
    await page.keyboard.press("Home");
  }
  await expect(page.getByText("Kịch bản gần nhất: α=1 β=1 γ=0 δ=0")).toBeVisible();
  await expect(page.getByRole("cell", { name: "55,0%" }).first()).toBeVisible();
  await page.getByRole("tab", { name: "Lõi Lượng tử" }).click();
  await expect(page.getByText("Mô phỏng / Vòng 2")).toBeVisible();
});

test.describe("Cổng 2 – Nạp dữ liệu bảo mật", () => {
  const FIX = "tests/fixtures/bctc-mau-qrt-2024";
  const XLSX = { name: "bctc.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: Buffer.from("x") };

  async function upload(page: import("@playwright/test").Page, file: string | typeof XLSX) {
    await page.goto("/private");
    await page.getByLabel("Chọn tệp hồ sơ").setInputFiles(file);
    const start = page.getByRole("button", { name: "Bắt đầu phân tích" });
    await expect(start).toBeDisabled();
    await page.getByRole("checkbox").click();
    await expect(start).toBeEnabled();
    await start.click();
  }

  test("từ chối tệp sai định dạng", async ({ page }) => {
    await page.goto("/private");
    await page.getByLabel("Chọn tệp hồ sơ").setInputFiles({ name: "virus.exe", mimeType: "application/octet-stream", buffer: Buffer.from("x") });
    await expect(page.getByText(/Định dạng \.exe không được hỗ trợ/)).toBeVisible();
  });

  test("PDF có lớp chữ: trích 9 chỉ tiêu → Z' → xoá dữ liệu", async ({ page }) => {
    await upload(page, `${FIX}.pdf`);
    await expect(page.getByText("Chỉ tiêu trích xuất từ báo cáo")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("9/9 chỉ tiêu")).toBeVisible();
    for (const v of ["612.450.318.220", "1.457.563.223.991", "844.465.681.528", "1.986.504.117.390", "31.448.917.006"]) {
      await expect(page.getByRole("cell", { name: v, exact: true })).toBeVisible();
    }
    await expect(page.getByText("CÔNG TY CỔ PHẦN THỰC PHẨM MẪU QRT")).toBeVisible();
    await expect(page.getByText("Grey").first()).toBeVisible(); // Z' ≈ 2,52 → vùng Grey
    await expect(page.getByText("Cần kiểm tra lại")).toHaveCount(0);

    await page.getByRole("button", { name: "Xác nhận xoá dữ liệu gốc" }).click();
    await expect(page.getByText(/Zero-Retention: tệp gốc đã được xoá lúc \d{2}:\d{2}:\d{2}/)).toBeVisible();
    await expect(page.getByText("bctc-mau-qrt-2024.pdf")).toBeVisible();
    await page.getByRole("button", { name: "Phân tích hồ sơ khác" }).click();
    await expect(page.getByText("Kéo thả hồ sơ vào đây")).toBeVisible();
  });

  test("PDF scan: OCR tiếng Việt trích đủ chỉ tiêu", async ({ page }) => {
    test.setTimeout(90_000);
    const outside: string[] = [];
    page.on("request", (r) => !r.url().startsWith("http://localhost") && !/^(data|blob):/.test(r.url()) && outside.push(r.url()));
    await upload(page, `${FIX}-scan.pdf`);
    await expect(page.getByText(/nhận dạng ký tự \(OCR\)/).first()).toBeVisible();
    await expect(page.getByText("Chỉ tiêu trích xuất từ báo cáo")).toBeVisible({ timeout: 75_000 });
    await expect(page.getByText(/OCR trang 1, 2/)).toBeVisible();
    for (const v of ["612.450.318.220", "1.457.563.223.991", "613.097.542.463", "1.986.504.117.390", "142.905.330.218"]) {
      await expect(page.getByRole("cell", { name: v, exact: true })).toBeVisible();
    }
    expect(outside, "tệp và OCR không được gọi ra ngoài").toEqual([]);
  });

  test("PDF hỏng → báo lỗi, quay về bước tải lên", async ({ page }) => {
    await upload(page, { name: "hong.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 không phải pdf") });
    await expect(page.getByText("Tệp PDF bị hỏng hoặc không hợp lệ.")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Kéo thả hồ sơ vào đây")).toBeVisible();
  });

  test("Excel → kết quả mẫu (chưa hỗ trợ trích xuất Excel)", async ({ page }) => {
    await upload(page, XLSX);
    await expect(page.getByText("Kết quả mẫu chưa có số liệu")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("CTCP Chuỗi Sữa TH")).toBeVisible();
  });

  test("huỷ khi đang xử lý quay về bước tải lên", async ({ page }) => {
    await upload(page, XLSX);
    await page.getByRole("button", { name: "Huỷ & xoá tệp" }).click();
    await expect(page.getByText("Kéo thả hồ sơ vào đây")).toBeVisible({ timeout: 5_000 });
  });
});
