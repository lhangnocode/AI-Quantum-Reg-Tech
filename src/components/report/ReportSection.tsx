export function ReportSection({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="break-inside-avoid space-y-2">
      <h3 className="border-b pb-1 text-sm font-bold">
        {n}. {title}
      </h3>
      <div className="text-xs leading-relaxed">{children}</div>
    </section>
  );
}
