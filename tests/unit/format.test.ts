import { describe, expect, it } from "vitest";
import { EMPTY, formatBillion, formatBytes, formatNumber, formatPct } from "@/lib/format";

describe("format (kiểu Việt)", () => {
  it("formatPct dùng dấu phẩy thập phân", () => {
    expect(formatPct(0.0995)).toBe("9,95%");
    expect(formatPct(1.149, 1, true)).toBe("+114,9%");
  });
  it("formatBillion", () => {
    expect(formatBillion(50_900_000_000)).toBe("50,9 tỷ");
  });
  it("giá trị TODO hiển thị —", () => {
    expect(formatNumber("TODO")).toBe(EMPTY);
    expect(formatPct(undefined)).toBe(EMPTY);
  });
  it("formatBytes", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1.5 * 1024 * 1024)).toBe("1,5 MB");
  });
});

describe("formatEventDate", () => {
  it("ngày thiếu tháng", async () => {
    const { formatEventDate } = await import("@/lib/format");
    expect(formatEventDate("2022-TODO")).toBe("2022 (chưa rõ tháng)");
    expect(formatEventDate("2023-7")).toBe("07/2023");
  });
});
