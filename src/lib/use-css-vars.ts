"use client";

import { useEffect, useState } from "react";

/** Đọc giá trị token CSS (vd. "--risk-safe") để truyền cho thư viện vẽ canvas (ECharts). */
export function useCssVars<K extends string>(names: readonly K[]): Record<K, string> | null {
  const [values, setValues] = useState<Record<K, string> | null>(null);
  const key = names.join(",");

  useEffect(() => {
    const read = () => {
      const style = getComputedStyle(document.documentElement);
      setValues(Object.fromEntries(names.map((n) => [n, style.getPropertyValue(n).trim()])) as Record<K, string>);
    };
    read();
    // Theo dõi đổi theme (class "dark" trên <html>).
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return values;
}
