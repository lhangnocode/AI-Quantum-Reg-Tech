import type { Metadata } from "next";
import { EyeOff, FileLock2, Trash2 } from "lucide-react";
import { UploadStepper } from "@/components/private/UploadStepper";

export const metadata: Metadata = { title: "Cổng 2 – Nạp dữ liệu bảo mật | QuantumRegTech" };

const PRINCIPLES = [
  {
    icon: FileLock2,
    title: "Xử lý trong phiên",
    body: "Bản PoC: tệp không rời khỏi trình duyệt. Vòng 2: truyền qua TLS tới API OCR, không ghi xuống ổ đĩa.",
  },
  {
    icon: Trash2,
    title: "Zero-Retention",
    body: "Tệp gốc bị xoá ngay khi phân tích xong; giao diện ghi lại thời điểm xoá.",
  },
  {
    icon: EyeOff,
    title: "Không chia sẻ",
    body: "Kết quả chỉ hiển thị cho người tải lên, không đưa vào bộ dữ liệu công khai của Cổng 1.",
  },
];

export default function PrivatePage() {
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <section className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm print:hidden">
        <h2 className="text-lg font-semibold">Nạp dữ liệu bảo mật</h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Dành cho ngân hàng / quỹ thẩm định doanh nghiệp <strong className="text-foreground">chưa niêm yết</strong>: tải báo cáo
          tài chính lên, hệ thống trích xuất chỉ tiêu, tính Altman Z&apos;-Score và quét OSINT, trả kết quả cùng định dạng Cổng 1.
        </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {PRINCIPLES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex gap-3 rounded-xl border bg-primary/5 p-3">
              <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
              <div>
                <p className="text-xs font-semibold">{title}</p>
                <p className="text-[11px] leading-relaxed text-muted-foreground">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <UploadStepper />
    </div>
  );
}
