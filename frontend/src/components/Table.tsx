import React from 'react';
import './Table.css';

interface TableProps {
  headers: string[];
  data: (string | number | React.ReactNode)[][];
  onSort?: (column: number) => void;
}

const Table: React.FC<TableProps> = ({ headers, data, onSort }) => {
  return (
    <table className="table">
      <thead>
        <tr>
          {headers.map((header, index) => (
            <th key={index} onClick={() => onSort && onSort(index)}>
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, rowIndex) => (
          <tr key={rowIndex}>
            {row.map((cell, cellIndex) => (
              <td key={cellIndex}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default Table;