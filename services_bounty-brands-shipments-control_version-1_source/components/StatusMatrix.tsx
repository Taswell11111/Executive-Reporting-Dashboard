import React from 'react';
import { BRANDS } from '../constants';

interface StatusMatrixProps {
  data: any[];
  statusList: string[];
  currentBrandFilter: string;
}

export const StatusMatrix: React.FC<StatusMatrixProps> = ({ data, statusList, currentBrandFilter }) => {
  // Determine which brands to show
  const brandsToShow = currentBrandFilter === 'All' 
    ? BRANDS.filter(b => b !== 'All') 
    : [currentBrandFilter];

  // Calculate counts
  const getCount = (brand: string, status: string) => {
    return data.filter(item => item.brand === brand && item.status === status).length;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-3">
        <h3 className="text-sm font-bold text-slate-700 uppercase">Status Breakdown Matrix</h3>
      </div>
      <div className="overflow-x-auto custom-scrollbar">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase sticky left-0 bg-slate-50 z-10 border-r border-slate-200">
                Brand
              </th>
              {statusList.map(status => (
                <th key={status} className="px-4 py-2 text-center text-[10px] font-bold text-slate-500 uppercase whitespace-nowrap">
                  {status.replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {brandsToShow.map(brand => (
              <tr key={brand} className="hover:bg-slate-50">
                <td className="px-4 py-2 text-xs font-bold text-slate-700 sticky left-0 bg-white border-r border-slate-200">
                  {brand}
                </td>
                {statusList.map(status => {
                  const count = getCount(brand, status);
                  return (
                    <td key={status} className={`px-4 py-2 text-center text-xs ${count > 0 ? 'font-bold text-[#003366]' : 'text-slate-300'}`}>
                      {count > 0 ? count : '-'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};