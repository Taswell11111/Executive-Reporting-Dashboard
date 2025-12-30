import React, { useState, useMemo } from 'react';
import { OutboundShipment, SortConfig } from '../types';
import { SIMULATED_TODAY } from '../constants';
import { ChevronDown, ChevronRight, Search, Flag, Box, Truck, CheckSquare, User, Package, Hash, X, Filter, BarChart2, Download } from 'lucide-react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import Papa from 'papaparse';
import { StatusMatrix } from './StatusMatrix';

interface OutboundTrackerProps {
  data: OutboundShipment[];
  onSort: (key: string) => void;
  sortConfig: SortConfig;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  brandFilter?: string;
}

const getStatusColor = (status: string) => {
  if (status === 'DELIVERED' || status === 'COMPLETED') return 'bg-green-100 text-green-800';
  if (status === 'IN_PICKING_QUEUE' || status === 'AWAITING_ARRIVAL') return 'bg-yellow-100 text-yellow-800';
  if (status === 'AWAITING_STOCK' || status.includes('EXCEPTION')) return 'bg-red-100 text-red-800';
  return 'bg-slate-100 text-slate-800';
};

// Updated Status List per user request
const SHIPMENT_STATUS_TABS = [
    { label: 'Created', value: 'CREATED' },
    { label: 'Exception', value: 'EXCEPTION' },
    { label: 'Awaiting stock', value: 'AWAITING_STOCK' },
    { label: 'In picking queue', value: 'IN_PICKING_QUEUE' },
    { label: 'In packing queue', value: 'IN_PACKING_QUEUE' },
    { label: 'Packed', value: 'PACKED' },
    { label: 'Shipped', value: 'SHIPPED' },
    { label: 'Delivered', value: 'DELIVERED' },
    { label: 'Failed Delivery', value: 'FAILED_DELIVERY_ATTEMPT' },
    { label: 'On Hold', value: 'ON_HOLD' },
    { label: 'Courier Cancelled', value: 'COURIER_CANCELLED' },
    { label: 'In Validation', value: 'IN_VALIDATION' }
];

export const OutboundTracker: React.FC<OutboundTrackerProps> = ({ 
  data, 
  onSort, 
  sortConfig,
  searchTerm,
  onSearchChange,
  brandFilter = 'All'
}) => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [activeStatusTab, setActiveStatusTab] = useState(SHIPMENT_STATUS_TABS[0].value);
  const [showStatusRecords, setShowStatusRecords] = useState(false);

  // Column Filter State
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({});
  const [openFilterMenu, setOpenFilterMenu] = useState<string | null>(null);

  const toggleRow = (id: string) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedRows(newSet);
  };

  // --- Status Data Logic ---
  const statusData = useMemo(() => {
     return data.filter(item => item.status === activeStatusTab);
  }, [data, activeStatusTab]);

  const activeTabLabel = SHIPMENT_STATUS_TABS.find(t => t.value === activeStatusTab)?.label || activeStatusTab;

  const statusGraphData = useMemo(() => {
     // Group by date (Day)
     const grouped: Record<string, number> = {};
     statusData.forEach(item => {
         const d = item.statusDate ? item.statusDate.split(' ')[0] : item.date.split(' ')[0];
         grouped[d] = (grouped[d] || 0) + 1;
     });
     
     return Object.entries(grouped)
        .map(([date, count]) => ({ date, count }))
        .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  }, [statusData]);

  // --- Column Filtering Logic ---
  const filteredData = useMemo(() => {
    return data.filter(item => {
      // Check every active filter
      return Object.entries(columnFilters).every(([key, val]) => {
        const selectedValues = val as string[];
        if (selectedValues.length === 0) return true;
        const itemValue = (item as any)[key] || '';
        return selectedValues.includes(itemValue.toString());
      });
    });
  }, [data, columnFilters]);

  const getUniqueValues = (key: string) => {
    const values = Array.from(new Set(data.map(item => String((item as any)[key] || '-')))).sort();
    return values.slice(0, 50); 
  };

  const toggleFilter = (key: string, value: string) => {
    setColumnFilters(prev => {
      const current = prev[key] || [];
      const updated = current.includes(value) 
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [key]: updated };
    });
  };

  const clearFilter = (key: string) => {
    setColumnFilters(prev => {
        const newState = { ...prev };
        delete newState[key];
        return newState;
    });
    setOpenFilterMenu(null);
  };

  const handleExportCSV = () => {
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `outbound_tracker_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const HeaderCell = ({ label, sortKey, filterKey }: { label: string, sortKey: string, filterKey?: string }) => {
     const isFiltered = filterKey && columnFilters[filterKey] && columnFilters[filterKey].length > 0;
     const uniqueValues: string[] = filterKey ? getUniqueValues(filterKey) : [];

     return (
        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50 relative group">
           <div className="flex items-center gap-2">
              <span 
                className="cursor-pointer hover:text-slate-700" 
                onClick={() => onSort(sortKey)}
              >
                {label}
              </span>
              
              {filterKey && (
                 <div className="relative">
                    <button 
                       onClick={(e) => { e.stopPropagation(); setOpenFilterMenu(openFilterMenu === filterKey ? null : filterKey!); }}
                       className={`p-1 rounded hover:bg-slate-200 ${isFiltered ? 'text-[#003366] bg-blue-50' : 'text-slate-300'}`}
                    >
                       <Filter size={14} fill={isFiltered ? 'currentColor' : 'none'} />
                    </button>

                    {/* Dropdown Menu */}
                    {openFilterMenu === filterKey && (
                        <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 z-50 overflow-hidden">
                           <div className="p-2 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                               <span className="text-xs font-bold text-slate-700">Filter {label}</span>
                               <button onClick={() => clearFilter(filterKey!)} className="text-[10px] text-red-500 hover:underline">Clear</button>
                           </div>
                           <div className="max-h-48 overflow-y-auto custom-scrollbar p-1">
                               {uniqueValues.map(val => (
                                   <label key={val} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 cursor-pointer rounded">
                                       <input 
                                         type="checkbox" 
                                         className="rounded border-slate-300 text-[#003366] focus:ring-[#003366]"
                                         checked={columnFilters[filterKey!]?.includes(val) || false}
                                         onChange={() => toggleFilter(filterKey!, val)}
                                       />
                                       <span className="text-xs text-slate-600 truncate">{val}</span>
                                   </label>
                               ))}
                           </div>
                        </div>
                    )}
                    {/* Click Outside overlay */}
                    {openFilterMenu === filterKey && (
                       <div className="fixed inset-0 z-40" onClick={() => setOpenFilterMenu(null)}></div>
                    )}
                 </div>
              )}
           </div>
        </th>
     );
  };


  return (
    <div className="space-y-6 fade-in animate-[fadeIn_0.3s_ease-in-out]">

      {/* STATUS MATRIX BREAKDOWN */}
      <StatusMatrix 
          data={data}
          statusList={SHIPMENT_STATUS_TABS.map(t => t.value)}
          currentBrandFilter={brandFilter}
      />
      
      {/* Shipment Status Dashboard */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-3">
             <h3 className="text-sm font-bold text-slate-700 uppercase flex items-center gap-2">
                 <Flag className="w-4 h-4 text-red-600 fill-current" />
                 Shipment Status
             </h3>
        </div>
        
        {/* Scrollable Tabs */}
        <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar">
           {SHIPMENT_STATUS_TABS.map(tab => (
               <button 
                 key={tab.value}
                 onClick={() => { setActiveStatusTab(tab.value); setShowStatusRecords(false); }}
                 className={`px-4 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                     activeStatusTab === tab.value 
                     ? 'border-red-600 text-red-700 bg-red-50' 
                     : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                 }`}
               >
                 {tab.label}
               </button>
           ))}
        </div>

        {/* Graph Content */}
        <div className="p-6">
            {statusData.length === 0 ? (
                <div className="h-40 flex items-center justify-center text-slate-400 text-sm">
                    No shipments found with status: {activeTabLabel}
                </div>
            ) : (
                <>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={statusGraphData}>
                                <defs>
                                    <linearGradient id="colorStatus" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0)' }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </>
            )}
        </div>
      </div>