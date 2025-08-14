

import React from 'react';
import { TableProps, TableHeader } from '../types';
import { UI_TEXT } from '../constants';

// Helper to safely access nested properties using a dot-notation string.
const getNestedValue = (obj: any, path: string): any => {
  if (typeof path !== 'string' || !path) {
    return undefined;
  }
  return path.split('.').reduce((acc, part) => acc && acc[part] !== undefined ? acc[part] : undefined, obj);
};

const Table = <T extends object,>(
  { headers, data, itemKey, onRowClick, className = '' }: TableProps<T>
): React.ReactNode => {
  return (
    <div className={`overflow-x-auto bg-white shadow-md rounded-lg ${className}`}>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {headers.map((header) => (
              <th
                key={String(header.key)}
                scope="col"
                className={`px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider ${header.headerClassName || ''}`}
              >
                {header.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="px-6 py-4 text-center text-gray-500">
                {UI_TEXT.NO_DATA_AVAILABLE}
              </td>
            </tr>
          ) : (
            data.map((item, index) => {
              const rowKeyValue = getNestedValue(item, itemKey);
              const uniqueRowKey = rowKeyValue !== undefined ? String(rowKeyValue) : index;
              
              return (
                <tr
                  key={uniqueRowKey}
                  onClick={() => onRowClick && onRowClick(item)}
                  className={`${onRowClick ? 'hover:bg-gray-50 cursor-pointer' : ''} transition-colors`}
                >
                  {headers.map((header) => (
                    <td key={`${uniqueRowKey}-${String(header.key)}`} className={`px-6 py-4 whitespace-nowrap text-sm text-gray-700 ${header.cellClassName || ''}`}>
                      {header.render ? header.render(item, index) : String(getNestedValue(item, header.key as string) ?? '')}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Table;