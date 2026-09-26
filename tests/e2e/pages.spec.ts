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
  await expect(page.locator(".recharts-pie-sector")).toHaveCount(4);
});

test("Cổng 1 – MCM có bằng chứng tẩy xanh và sự kiện OSINT", async ({ page }) => {
  await page.goto("/company/MCM");
  await expect(page.getByText("Rủi ro tẩy xanh: Cao")).toBeVisible();
  await expect(page.getByText("Phạt xả thải môi trường").first()).toBeVisible();
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
  test("từ chối tệp sai định dạng", async ({ page }) => {
    await page.goto("/private");
    await page.getByLabel("Chọn tệp hồ sơ").setInputFiles({ name: "virus.exe", mimeType: "application/octet-stream", buffer: Buffer.from("x") });
    await expect(page.getByText(/Định dạng \.exe không được hỗ trợ/)).toBeVisible();
  });

  test("luồng đầy đủ: tải lên → xử lý → kết quả → xoá", async ({ page }) => {
    await page.goto("/private");
    const start = page.getByRole("button", { name: "Bắt đầu phân tích" });
    await page.getByLabel("Chọn tệp hồ sơ").setInputFiles({ name: "bctc-2024.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 test") });
    await expect(start).toBeDisabled();
    await page.getByRole("checkbox").click();
    await expect(start).toBeEnabled();
    await start.click();

    await expect(page.getByText("OCR trích xuất")).toBeVisible();
    await expect(page.getByText("Kết quả mẫu chưa có số liệu")).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "Xác nhận xoá dữ liệu gốc" }).click();
    await expect(page.getByText(/Zero-Retention: tệp gốc đã được xoá lúc \d{2}:\d{2}:\d{2}/)).toBeVisible();
    await expect(page.getByText("bctc-2024.pdf")).toBeVisible();

    await page.getByRole("button", { name: "Phân tích hồ sơ khác" }).click();
    await expect(page.getByText("Kéo thả hồ sơ vào đây")).toBeVisible();
  });

  test("huỷ khi đang xử lý quay về bước tải lên", async ({ page }) => {
    await page.goto("/private");
    await page.getByLabel("Chọn tệp hồ sơ").setInputFiles({ name: "bctc.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: Buffer.from("x") });
    await page.getByRole("checkbox").click();
    await page.getByRole("button", { name: "Bắt đầu phân tích" }).click();
    await page.getByRole("button", { name: "Huỷ & xoá tệp" }).click();
    await expect(page.getByText("Kéo thả hồ sơ vào đây")).toBeVisible({ timeout: 5_000 });
  });
});
