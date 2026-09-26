import { describe, expect, it } from "vitest";
import { altmanZone, severityZone } from "@/lib/risk";

describe("altmanZone", () => {
  it("ngưỡng Z gốc: Safe > 2,99 · Grey 1,81–2,99 · Distress < 1,81", () => {
    expect(altmanZone(6.18)).toBe("safe");
    expect(altmanZone(2.99)).toBe("grey");
    expect(altmanZone(1.81)).toBe("grey");
    expect(altmanZone(1.8)).toBe("distress");
  });
  it("ngưỡng Z' cho DN chưa niêm yết", () => {
    expect(altmanZone(3, "Z'")).toBe("safe");
    expect(altmanZone(1.2, "Z'")).toBe("distress");
  });
  it("mức OSINT", () => {
    expect(severityZone(1)).toBe("grey");
    expect(severityZone(2)).toBe("distress");
  });
});
