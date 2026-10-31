import type { ReactNode } from "react";

// 表の幅は本文に収め、小さい画面では表だけを横スクロールさせます。
export default function ReferenceTable({ headings, rows }: {
  headings: string[];
  rows: ReactNode[][];
}) {
  return (
    <div className="my-6 overflow-x-auto">
      <table className="table table-sm">
        <thead><tr>{headings.map(heading => <th key={heading} scope="col">{heading}</th>)}</tr></thead>
        <tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, column) => <td key={column} style={column === 0 ? { whiteSpace: "nowrap" } : undefined}>{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
