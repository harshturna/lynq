/** The visually hidden table equivalent of a chart (design rule 8). */
export function HiddenTable({
  caption,
  columns,
  rows,
}: {
  caption: string;
  columns: string[];
  rows: (string | number)[][];
}) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c} scope="col">
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: bucket labels repeat (blank ticks), rows never reorder
          <tr key={`${i}-${String(r[0] ?? "")}`}>
            {r.map((cell, j) =>
              j === 0 ? (
                <th key={String(j)} scope="row">
                  {cell}
                </th>
              ) : (
                <td key={String(j)}>{cell}</td>
              )
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
