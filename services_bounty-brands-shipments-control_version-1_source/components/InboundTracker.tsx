import React, { useState, useMemo } from 'react';
import { InboundReturn, SortConfig, OutboundShipment } from '../types';
import { SIMULATED_TODAY } from '../constants';
import { ChevronDown, ChevronRight, Search, Flag, BarChart2, User, Hash, X, Filter, Download } from 'lucide-react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import Papa from 'papaparse';
import { StatusMatrix } from './StatusMatrix';

interface InboundTrackerProps {
  data: InboundReturn[];
  outboundData: OutboundShipment[]; // Passed for cross-ref lookup
  onSort: (key: string) => void;
  sortConfig: SortConfig;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  brandFilter?: string;
}

const getStatusColor = (status: string) => {
  if (status === 'COMPLETED' || status === 'DELIVERED') return 'bg-green-100 text-green-800';
  if (status === 'AWAITING_ARRIVAL') return 'bg-yellow-100 text-yellow-800';
  if (status === 'FAILED') return 'bg-red-100 text-red-800';
  return 'bg-slate-100 text-slate-800';
};

// Updated Inbound Tabs list
const INBOUND_STATUS_TABS = [
    { label: 'Initiated', value: 'CREATED' },
    { label: 'Scheduled for pickup', value: 'SCHEDULED_FOR_PICKUP' },
    { label: 'Awaiting arrival', value: 'AWAITING_ARRIVAL' },
    { label: 'Courier en route', value: 'COURIER_EN_ROUTE' },
    { label: 'Processing complete', value: 'PROCESSING_COMPLETE' },
    { label: 'Processing complete (variance)', value: 'PROCESSING_COMPLETE_WITH_VARIANCE' },
    { label: 'Completed', value: 'COMPLETED' }, // Added
    { label: 'Failed', value: 'FAILED' } // Added
];

export const InboundTracker: React.FC<InboundTrackerProps> = ({ 
  data, 
  outboundData,
  onSort, 
  sortConfig,
  searchTerm,
  onSearchChange,
  brandFilter = 'All'
}) => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [activeStatusTab, setActiveStatusTab] = useState(INBOUND_STATUS_TABS[0].value);
  const [showStatusRecords, setShowStatusRecords] = useState(false);
  
  // Column Filter State: key = column key, value = array of selected values
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
     // Handle "Completed" mapping if needed (e.g. if some are DELIVERED but tab is COMPLETED)
     if (activeStatusTab === 'COMPLETED') {
        return data.filter(item => item.status === 'COMPLETED' || item.status === 'DELIVERED');
     }
     return data.filter(item => item.status === activeStatusTab);
  }, [data, activeStatusTab]);

  const activeTabLabel = INBOUND_STATUS_TABS.find(t => t.value === activeStatusTab)?.label || activeStatusTab;

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

  // Get unique values for a column
  const getUniqueValues = (key: string) => {
    const values = Array.from(new Set(data.map(item => String((item as any)[key] || '-')))).sort();
    return values.slice(0, 50); // Limit to 50 for performance
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
    link.setAttribute('download', `inbound_tracker_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const HeaderCell = ({ label, sortKey, filterKey }: { label: string, sortKey: string, filterKey?: string }) => {
     const isFiltered = filterKey && columnFilters[filterKey] && columnFilters[filterKey].length > 0;
     const uniqueValues = filterKey ? getUniqueValues(filterKey) : [];

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
                       onClick={(e) => { e.stopPropagation(); setOpenFilterMenu(openFilterMenu === filterKey ? null : filterKey); }}
                       className={`p-1 rounded hover:bg-slate-200 ${isFiltered ? 'text-[#003366] bg-blue-50' : 'text-slate-300'}`}
                    >
                       <Filter size={14} fill={isFiltered ? 'currentColor' : 'none'} />
                    </button>

                    {/* Dropdown Menu */}
                    {openFilterMenu === filterKey && (
                        <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 z-50 overflow-hidden">
                           <div className="p-2 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                               <span className="text-xs font-bold text-slate-700">Filter {label}</span>
                               <button onClick={() => clearFilter(filterKey)} className="text-[10px] text-red-500 hover:underline">Clear</button>
                           </div>
                           <div className="max-h-48 overflow-y-auto custom-scrollbar p-1">
                               {uniqueValues.map(val => (
                                   <label key={val} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 cursor-pointer rounded">
                                       <input 
                                         type="checkbox" 
                                         className="rounded border-slate-300 text-[#003366] focus:ring-[#003366]"
                                         checked={columnFilters[filterKey]?.includes(val) || false}
                                         onChange={() => toggleFilter(filterKey, val)}
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

  // --- ID Extraction Helper (Same as Dashboard) ---
  const extractCoreRef = (ref: string) => {
      if (!ref) return '';
      const cleanPrefix = ref.replace(/^(RET|RMA|SHP)-/i, '');
      const parts = cleanPrefix.split('-');
      if (parts[0] && parts[0].length > 4 && /^\d+$/.test(parts[0])) {
          return parts[0];
      }
      return cleanPrefix;
  };

  return (
    <div className="space-y-6 fade-in animate-[fadeIn_0.3s_ease-in-out]">

      {/* STATUS MATRIX BREAKDOWN */}
      <StatusMatrix 
          data={data}
          statusList={INBOUND_STATUS_TABS.map(t => t.value)}
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
           {INBOUND_STATUS_TABS.map(tab => (
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
                                    <linearGradient id="colorInboundStatus" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Area type="monotone" dataKey="count" stroke="#ef4444" fillOpacity={1} fill="url(#colorInboundStatus)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    
                    <div className="mt-4 flex justify-center">
                        <button 
                           onClick={() => setShowStatusRecords(!showStatusRecords)}
                           className="flex items-center gap-2 text-sm text-slate-600 hover:text-[#003366] font-medium transition-colors"
                        >
                           <BarChart2 size={16}/>
                           {showStatusRecords ? 'Hide Records' : `Open ${statusData.length} ${activeTabLabel} Records`}
                        </button>
                    </div>

                    {/* Expandable Record List */}
                    {showStatusRecords && (
                        <div className="mt-4 border-t border-slate-100 pt-4 animate-[fadeIn_0.3s_ease-in-out]">
                             <div className="overflow-x-auto max-h-60 custom-scrollbar rounded-lg border border-slate-200">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Return ID</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Brand</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Customer</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Status</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Updated Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-200">
                                        {statusData.map(item => (
                                            <tr key={item.returnId} className="hover:bg-slate-50">
                                                <td className="px-4 py-2 text-xs font-mono text-slate-600">{item.returnId}</td>
                                                <td className="px-4 py-2 text-xs text-slate-700 font-bold">{item.brand}</td>
                                                <td className="px-4 py-2 text-xs text-slate-700">{item.customer}</td>
                                                <td className="px-4 py-2 text-xs text-slate-600 font-medium">{item.status}</td>
                                                <td className="px-4 py-2 text-xs text-slate-500">{item.statusDate}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                             </div>
                        </div>
                    )}
                </>
            )}
        </div>
      </div>


      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 relative">
        <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
        <input 
          type="text" 
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search Returns (RMA, Customer, Tracking)..." 
          style={{ width: '300px' }}
          className="pl-10 pr-10 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-[#003366] focus:border-[#003366] focus:outline-none"
        />
        {searchTerm && (
            <button 
                onClick={() => onSearchChange('')}
                className="absolute left-[310px] top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
                <X className="h-4 w-4" />
            </button>
        )}
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        
        {/* Table Header Area */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-slate-50/50">
             <h2 className="text-lg font-bold text-slate-700">Inbound Tracker Table</h2>
             <button 
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 rounded text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors"
             >
                <Download size={14}/>
                Export CSV
             </button>
        </div>

        <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
          <table className="min-w-full divide-y divide-slate-200 relative">
            <thead className="bg-slate-50 select-none sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="w-8 px-2 bg-slate-50"></th>
                <HeaderCell label="Return ID" sortKey="returnId" />
                <HeaderCell label="Brand" sortKey="brand" filterKey="brand" />
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50">Associated Source Store ID</th>
                <HeaderCell label="Return Date" sortKey="date" />
                <HeaderCell label="Source Ref" sortKey="reference" />
                <HeaderCell label="Tracking" sortKey="tracking" filterKey="courier" />
                {/* NEW ITEMS COLUMN */}
                <HeaderCell label="Items" sortKey="item" />
                <HeaderCell label="Status" sortKey="status" filterKey="status" />
                <HeaderCell label="Updated Date" sortKey="statusDate" />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredData.map((item, idx) => {
                 const uniqueId = `in-${idx}`;
                 const isExpanded = expandedRows.has(uniqueId);
                 
                 // Lookup logic for Associated Source Store ID
                 // We match inbound.reference (core ID) to outbound.sourceStoreOrderId
                 const coreRef = extractCoreRef(item.reference || item.sourceShipmentId);
                 
                 const linkedOutbound = outboundData.find(out => {
                     return out.sourceStoreOrderId && out.sourceStoreOrderId.includes(coreRef);
                 });
                 
                 const associatedStoreId = linkedOutbound ? linkedOutbound.channelId : '-';

                 return (
                  <React.Fragment key={uniqueId}>
                    <tr 
                      className="hover:bg-slate-50 transition-colors border-b border-slate-100 cursor-pointer"
                      onClick={() => toggleRow(uniqueId)}
                    >
                      <td className="px-2 py-4 whitespace-nowrap text-center text-slate-400">
                        {isExpanded ? <ChevronDown className="w-5 h-5 mx-auto" /> : <ChevronRight className="w-5 h-5 mx-auto" />}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-slate-500">{item.returnId}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-700">{item.brand}</td>
                      {/* New Column Data */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-[#003366] font-medium">{associatedStoreId}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{item.date.split(' ')[0]}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#003366]">{item.reference}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{item.tracking || 'Pending'}</td>
                      
                      {/* NEW ITEMS COLUMN CELL (Truncated) */}
                      <td className="px-6 py-4 text-xs text-slate-600 max-w-[200px] truncate" title={item.item}>
                          {item.item}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">{item.statusDate}</td>
                    </tr>
                    
                    {isExpanded && (
                      <tr className="bg-white">
                        <td colSpan={10} className="px-4 py-4">
                           <div className="bg-slate-100 rounded-lg border border-slate-200 shadow-inner p-6 animate-[fadeIn_0.2s_ease-in-out]">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                
                                {/* Col 1: Return Details */}
                                <div>
                                   <div className="flex items-center gap-2 mb-4 text-[#003366]">
                                      <User size={16} />
                                      <h4 className="text-xs font-bold uppercase tracking-wider">Return Details</h4>
                                   </div>
                                   <div className="space-y-3 text-sm">
                                      <div className="flex gap-2">
                                         <span className="w-32 shrink-0 text-xs font-bold text-slate-500 uppercase text-right pt-0.5">Customer:</span>
                                         <span className="text-slate-900 font-medium">{item.customer}</span>
                                      </div>
                                      <div className="flex gap-2">
                                         <span className="w-32 shrink-0 text-xs font-bold text-slate-500 uppercase text-right pt-0.5">Items / Qty:</span>
                                         <span className="text-slate-900 whitespace-pre-wrap">{item.item} (Qty: {item.qty})</span>
                                      </div>
                                      <div className="flex gap-2">
                                         <span className="w-32 shrink-0 text-xs font-bold text-slate-500 uppercase text-right pt-0.5">Original Shipment:</span>
                                         <span className="text-slate-900 font-mono text-xs">{item.sourceShipmentId}</span>
                                      </div>
                                   </div>
                                </div>

                                {/* Col 2: Metadata */}
                                <div>
                                   <div className="flex items-center gap-2 mb-4 text-[#003366]">
                                      <Hash size={16} />
                                      <h4 className="text-xs font-bold uppercase tracking-wider">System Info</h4>
                                   </div>
                                   <div className="space-y-3 text-sm">
                                      <div className="flex justify-between border-b border-slate-200 pb-1">
                                         <span className="text-slate-500 font-medium">Return ID</span>
                                         <span className="text-slate-900 font-mono">{item.returnId}</span>
                                      </div>
                                      <div className="flex justify-between border-b border-slate-200 pb-1">
                                         <span className="text-slate-500 font-medium">Last Update</span>
                                         <span className="text-slate-900 font-mono">{item.statusDate}</span>
                                      </div>
                                   </div>
                                </div>

                              </div>
                           </div>
                        </td>
                      </tr>
                    )}

                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 text-sm text-slate-500">
          Showing {filteredData.length} results
        </div>
      </div>
    </div>
  );
};