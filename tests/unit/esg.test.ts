import { describe, expect, it } from "vitest";
import { getEsgIndicators } from "@/lib/api";
import { peerAverage, pillarDisclosure, rankInPeers } from "@/lib/esg";

const PEERS = ["VNM", "SAB", "MCM", "SBT"];

describe("mức độ công bố ESG (sheet ESG_ChiTieu)", async () => {
  const set = await getEsgIndicators();

  it("đủ 32 chỉ tiêu, 3 trụ cột, có dữ liệu 4 DN + TH", () => {
    expect(set.indicators).toHaveLength(32);
    expect(new Set(set.indicators.map((i) => i.pillar))).toEqual(new Set(["E", "S", "G"]));
    for (const t of [...PEERS, "TH"]) expect(set.values[t]).toBeDefined();
  });

  it("đếm đúng thực hành / số liệu định lượng (bỏ chỉ tiêu use = 0)", () => {
    // E: 6 chỉ tiêu có/không (E_03,04,05,10,11,12), 5 định lượng dùng (E_02,06,07,08,09; E_01 bị loại).
    expect(pillarDisclosure(set, "VNM", "E")).toEqual({ pillar: "E", practicesYes: 6, practicesTotal: 6, quantDisclosed: 5, quantTotal: 5 });
    // MCM: chỉ E_10, E_11 = 1; chỉ E_02 có số.
    expect(pillarDisclosure(set, "MCM", "E")).toEqual({ pillar: "E", practicesYes: 2, practicesTotal: 6, quantDisclosed: 1, quantTotal: 5 });
    expect(pillarDisclosure(set, "SAB", "G")).toEqual({ pillar: "G", practicesYes: 3, practicesTotal: 4, quantDisclosed: 3, quantTotal: 3 });
  });

  it("trung bình nhóm 4 DN", () => {
    // Thực hành G (G_03,05,06,07): VNM 4 · SAB 3 · MCM 1 · SBT 4 → 3.
    expect(peerAverage(set, PEERS, "G").practicesYes).toBe(3);
  });

  it("xếp hạng theo chiều tốt của chỉ tiêu", () => {
    const e09 = set.indicators.find((i) => i.code === "E_09")!; // tỷ lệ năng lượng tái tạo, (+)
    expect(rankInPeers(set, e09, "SBT", PEERS)).toEqual({ rank: 1, of: 3 }); // 91,04% – MCM chưa công bố
    const e02 = set.indicators.find((i) => i.code === "E_02")!; // cường độ phát thải, (-)
    expect(rankInPeers(set, e02, "SAB", PEERS)).toEqual({ rank: 1, of: 4 }); // 2,224 thấp nhất
    expect(rankInPeers(set, e02, "VNM", PEERS)).toEqual({ rank: 4, of: 4 });
    const e07 = set.indicators.find((i) => i.code === "E_07")!;
    expect(rankInPeers(set, e07, "MCM", PEERS)).toBeNull(); // chưa công bố
  });

  it("không xếp hạng số tuyệt đối phụ thuộc quy mô (tránh 'DN nhỏ phát thải ít = tốt')", () => {
    for (const code of ["E_01", "E_06", "E_08", "S_01", "S_09"]) {
      const ind = set.indicators.find((i) => i.code === code)!;
      expect(ind.sizeDependent, code).toBe(true);
      expect(rankInPeers(set, ind, "MCM", PEERS), code).toBeNull();
    }
  });
});
