/** CSV for the table export (design §6). RFC 4180 quoting; a UTF-8 BOM so spreadsheets read accents. */
export function toCsv(
  columns: { key: string; header: string }[],
  rows: Record<string, string | number | null | undefined>[]
): string {
  const cell = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [columns.map((c) => cell(c.header)).join(",")];
  for (const r of rows)
    lines.push(columns.map((c) => cell(r[c.key])).join(","));
  return `﻿${lines.join("\r\n")}\r\n`;
}

/** Browser only: hands the CSV to the user as a file. */
export function downloadCsv(name: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name.endsWith(".csv") ? name : `${name}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
