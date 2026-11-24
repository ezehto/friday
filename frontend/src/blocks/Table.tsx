import type { TableBlock as TableBlockData } from "../generated/types";
import { Empty } from "./Empty";

export function TableBlock({ block }: { block: TableBlockData }) {
  return (
    <div className="block block-table" data-block-kind="table">
      {block.rows.length === 0 ? (
        <Empty />
      ) : (
        <table>
          <thead>
            <tr>
              {block.columns.map((c, i) => (
                <th key={i} scope="col" className="label">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => (
                  <td key={c}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
