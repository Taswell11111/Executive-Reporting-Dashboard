import React, { useState, useMemo } from 'react';
import { OutboundShipment, InboundReturn } from '../types';
import { KpiCard } from './KpiCard';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { AlertCircle, Clock, CheckSquare, PauseCircle, FileWarning, Package, Truck, XCircle, Ban, Layers, Search, ArrowRight, ArrowDown, Siren } from 'lucide-react';
import { SIMULATED_TODAY } from '../constants';
import { findOutboundByRef, findInboundByRef } from '../services/apiService';

interface DashboardProps {
  outboundData: OutboundShipment[];
  inboundData: InboundReturn[];
}

export const Dashboard: React.FC<DashboardProps> = ({ outboundData, inboundData }) => {
  // --- PROCESSING MODAL STATE ---
  const [isModalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalFilterType, setModalFilterType] = useState('');

  // --- MISSING WAYBILL FILTER STATE ---
  const [mwFilterBrand, setMwFilterBrand] = useState<string | null>(null);

  // --- QUICK SEARCH STATE ---
  const [quickSearchTerm, setQuickSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState('');
  const [qsOutbound, setQsOutbound] = useState<OutboundShipment | null>(null);
  const [qsInbound, setQsInbound] = useState<InboundReturn | null | 'NA'>(null);
  const [qsError, setQsError] = useState('');

  // --- Outbound Metrics Logic ---
  const totalOrders = outboundData.filter(i => i.status !== 'CANCELLED').length;
  const delivered = outboundData.filter(i => i.status === 'DELIVERED' || i.status === 'COMPLETED').length;
  
  // Operational Buckets
  const awaitingStock = outboundData.filter(i => i.status === 'AWAITING_STOCK').length;
  const onHold = outboundData.filter(i => i.status === 'ON_HOLD').length;
  const inValidation = outboundData.filter(i => i.status === 'IN_VALIDATION').length;
  const exceptions = outboundData.filter(i => i.status.includes('EXCEPTION')).length;
  
  // Specific Error Counts
  const courierCancelled = outboundData.filter(i => i.status === 'COURIER_CANCELLED').length;
  const failedDelivery = outboundData.filter(i => i.status === 'FAILED_DELIVERY_ATTEMPT' || i.status === 'UNABLE_TO_DELIVER').length;
  const failedIn = inboundData.filter(i => i.status === 'FAILED').length;

  const getProcessingCount = () => {
    return outboundData.filter(i => {
       const s = i.status;
       return s.includes('PICKING') || s.includes('PACKING') || s === 'SHIPPED' || s === 'PICKED' || s === 'PACKED' || s === 'RETURN_TO_ORIGIN' || s === 'FAILED_DELIVERY_ATTEMPT' || s === 'COURIER_CANCELLED';
    }).length;
  };
  const processingCount = getProcessingCount();

  // --- Created Today Graph Data ---
  const todayData = useMemo(() => {
    const targetDateStr = SIMULATED_TODAY.toISOString().split('T')[0]; 
    const createdToday = outboundData.filter(i => i.date.startsWith(targetDateStr));
    const hours = Array(24).fill(0);
    createdToday.forEach(item => {
      const timePart = item.date.split(' ')[1]; // "HH:mm:ss"
      if (timePart) {
        const h = parseInt(timePart.split(':')[0], 10);
        if (!isNaN(h) && h >= 0 && h < 24) {
          hours[h]++;
        }
      }
    });
    return hours.map((count, hour) => ({
      hour: `${hour.toString().padStart(2, '0')}:00`,
      orders: count
    }));
  }, [outboundData]);

  const createdTodayCount = todayData.reduce((acc, curr) => acc + curr.orders, 0);

  // --- Inbound Metrics ---
  const totalIn = inboundData.length;
  const completedIn = inboundData.filter(i => i.status === 'COMPLETED' || i.status === 'DELIVERED').length;
  const pendingIn = inboundData.filter(i => i.status === 'AWAITING_ARRIVAL').length;
  const missingWaybillAll = useMemo(() => inboundData.filter(i => !i.tracking || i.tracking.trim() === ''), [inboundData]);
  
  // Filtered Missing Waybill for Table
  const missingWaybillDisplayed = useMemo(() => {
      if (!mwFilterBrand) return missingWaybillAll;
      return missingWaybillAll.filter(i => i.brand === mwFilterBrand);
  }, [missingWaybillAll, mwFilterBrand]);

  // Missing Waybill Brand Summary
  const mwBrandSummary = useMemo(() => {
      const counts: Record<string, number> = {};
      missingWaybillAll.forEach(i => {
          counts[i.brand] = (counts[i.brand] || 0) + 1;
      });
      return Object.entries(counts).sort((a,b) => b[1] - a[1]);
  }, [missingWaybillAll]);


  // --- Open Modal Handler ---
  const openModal = (type: string, title: string) => {
      setModalFilterType(type);
      setModalTitle(title);
      setModalOpen(true);
  };

  const getModalData = () => {
    switch (modalFilterType) {
        // Outbound Filters
        case 'TOTAL_ORDERS': return outboundData.filter(i => i.status !== 'CANCELLED');
        case 'DELIVERED': return outboundData.filter(i => i.status === 'DELIVERED' || i.status === 'COMPLETED');
        case 'CREATED_TODAY': 
            const targetDateStr = SIMULATED_TODAY.toISOString().split('T')[0];
            return outboundData.filter(i => i.date.startsWith(targetDateStr));
        case 'PROCESSING': 
            return outboundData.filter(i => {
                const s = i.status;
                return s.includes('PICKING') || s.includes('PACKING') || s === 'SHIPPED' || s === 'PICKED' || s === 'PACKED' || s === 'RETURN_TO_ORIGIN' || s === 'FAILED_DELIVERY_ATTEMPT' || s === 'COURIER_CANCELLED';
            });
        case 'ON_HOLD': return outboundData.filter(i => i.status === 'ON_HOLD');
        case 'IN_VALIDATION': return outboundData.filter(i => i.status === 'IN_VALIDATION');
        case 'AWAITING_STOCK': return outboundData.filter(i => i.status === 'AWAITING_STOCK');
        case 'EXCEPTIONS': return outboundData.filter(i => i.status.includes('EXCEPTION'));

        // Re-added to Outbound section logic
        case 'COURIER_CANCELLED': return outboundData.filter(i => i.status === 'COURIER_CANCELLED');
        case 'FAILED_DELIVERY': return outboundData.filter(i => i.status === 'FAILED_DELIVERY_ATTEMPT' || i.status === 'UNABLE_TO_DELIVER');
        case 'FAILED_IN': return inboundData.filter(i => i.status === 'FAILED'); 

        default: return [];
    }
  };

  const getInboundModalData = () => {
      switch (modalFilterType) {
          case 'TOTAL_IN': return inboundData;
          case 'COMPLETED_IN': return inboundData.filter(i => i.status === 'COMPLETED' || i.status === 'DELIVERED');
          case 'PENDING_IN': return inboundData.filter(i => i.status === 'AWAITING_ARRIVAL');
          case 'FAILED_IN': return inboundData.filter(i => i.status === 'FAILED');
          default: return [];
      }
  }

  const isInboundModal = modalFilterType.endsWith('_IN');
  const modalRecords = isInboundModal ? getInboundModalData() : getModalData();


  const OperationalCard = ({ label, count, icon: Icon, color, onClick }: any) => (
    <div 
      onClick={onClick}
      className={`p-4 rounded-lg border ${color} bg-white flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow`}
    >
      <div className="flex items-center gap-3">
        <Icon className={`h-5 w-5 ${color.replace('border-', 'text-').replace('-200', '-600')}`} />
        <span className="text-sm font-medium text-slate-600">{label}</span>
      </div>
      <span className="text-xl font-bold text-slate-800">{count}</span>
    </div>
  );

  // --- ID Extraction Helper ---
  // Example: RET-10000498834-1 -> 10000498834
  const extractCoreRef = (ref: string) => {
      if (!ref) return '';
      // Remove prefixes like RET-, RMA-, SHP-
      const cleanPrefix = ref.replace(/^(RET|RMA|SHP)-/i, '');
      // Split by hyphen and take the first segment if it's numeric and long enough (e.g. > 4 digits)
      const parts = cleanPrefix.split('-');
      if (parts[0] && parts[0].length > 4 && /^\d+$/.test(parts[0])) {
          return parts[0];
      }
      return cleanPrefix;
  };

  // --- Quick Search Handler ---
  const handleQuickSearch = async () => {
    if (!quickSearchTerm.trim()) return;
    
    setIsSearching(true);
    setSearchStatus('Checking local records...');
    setQsError('');
    setQsOutbound(null);
    setQsInbound(null);

    // Wait briefly to show status change
    await new Promise(r => setTimeout(r, 500));

    // 1. Check Local State (Case Insensitive)
    const term = quickSearchTerm.trim().toLowerCase();
    
    const localOut = outboundData.find(i => 
       i.id.toLowerCase() === term || 
       i.orderId.toLowerCase() === term || 
       (i.sourceStoreOrderId || '').toLowerCase() === term ||
       (i.tracking || '').toLowerCase() === term ||
       (i.channelId || '').toLowerCase() === term
    );
    
    const localIn = inboundData.find(i => 
       i.returnId.toLowerCase() === term || 
       (i.reference || '').toLowerCase() === term || 
       (i.tracking || '').toLowerCase() === term
    );

    if (localOut) {
        setQsOutbound(localOut);
        setSearchStatus('');
        setIsSearching(false);
        
        // Forward Lookup: Outbound -> Inbound
        // Try to find Inbound where reference contains core ID of outbound source ref
        const coreId = extractCoreRef(localOut.sourceStoreOrderId || '');
        if (coreId) {
             const linkedIn = inboundData.find(i => (i.reference && i.reference.includes(coreId)) || (i.sourceShipmentId && i.sourceShipmentId.includes(coreId)));
             setQsInbound(linkedIn || 'NA');
        } else {
             setQsInbound('NA');
        }
        return;
    }

    if (localIn) {
        setQsInbound(localIn);
        setSearchStatus('');
        setIsSearching(false);
        
        // Reverse Lookup: Inbound -> Outbound
        // Use Inbound's Reference (RET-...) to find Outbound by checking middle digits
        const coreId = extractCoreRef(localIn.reference);
        const linkedOut = outboundData.find(i => 
            (i.sourceStoreOrderId && i.sourceStoreOrderId.includes(coreId))
        );
        
        if (linkedOut) {
            setQsOutbound(linkedOut);
        } else {
             // Try to find outbound via API if not local using core ID
             try {
                const outRes = await findOutboundByRef(coreId);
                setQsOutbound(outRes);
             } catch(e) {
                 setQsOutbound(null);
             }
        }
        return;
    }

    // 2. Not found locally, hit API
    setSearchStatus('Searching API network...');
    
    try {
        const outRes = await findOutboundByRef(quickSearchTerm);
        if (outRes) {
            setQsOutbound(outRes);
            const coreId = extractCoreRef(outRes.sourceStoreOrderId || '');
            if (coreId) {
                const inRes = await findInboundByRef(coreId); // Search using core ID
                setQsInbound(inRes || 'NA');
            } else {
                setQsInbound('NA');
            }
        } else {
             // Check Inbound API
             const inRes = await findInboundByRef(quickSearchTerm);
             if (inRes) {
                setQsInbound(inRes);
                // Reverse API Lookup
                const coreId = extractCoreRef(inRes.reference);
                if(coreId) {
                     const linkedOutRes = await findOutboundByRef(coreId);
                     setQsOutbound(linkedOutRes);
                } else {
                     setQsOutbound(null);
                }

             } else {
                setQsError('No records found.');
             }
        }

    } catch (e) {
        setQsError('Search failed.');
    } finally {
        setSearchStatus('');
        setIsSearching(false);
    }
  };

  return (
    <div className="space-y-8 fade-in animate-[fadeIn_0.3s_ease-in-out]">
      
      {/* 2-Column Main Analysis with Divider */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative">
        
        {/* Transparent Divider Line */}
        <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px bg-slate-200/60 -ml-px"></div>

        {/* LEFT COL: OUTBOUND */}
        <div className="space-y-6 lg:pr-8">
           <div className="flex justify-between items-center border-b pb-2 border-slate-200">
             <h2 className="text-lg font-bold text-slate-700 uppercase tracking-wide">Outbound Analysis</h2>
             <span className="text-xs text-slate-400">Last 60 Days</span>
           </div>
           
           <div className="grid grid-cols-2 gap-4">
              <KpiCard title="Total Orders" value={totalOrders} color="blue" onClick={() => openModal('TOTAL_ORDERS', 'Total Orders')} />
              <KpiCard title="Delivered" value={delivered} color="green" onClick={() => openModal('DELIVERED', 'Delivered Orders')} />
              <KpiCard title="Courier Cancelled" value={courierCancelled} color="red" onClick={() => openModal('COURIER_CANCELLED', 'Courier Cancelled')} />
              <KpiCard title="Failed Delivery" value={failedDelivery} color="yellow" onClick={() => openModal('FAILED_DELIVERY', 'Failed Deliveries')} />
           </div>

           {/* Created Today Graph */}
           <div 
             className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 cursor-pointer hover:shadow-md transition-shadow"
             onClick={() => openModal('CREATED_TODAY', 'Created Today')}
           >
              <div className="flex items-baseline gap-2 mb-4">
                 <h3 className="text-2xl font-bold text-slate-800">{createdTodayCount}</h3>
                 <span className="text-sm font-medium text-slate-500 uppercase">Created Today</span>
              </div>
              <div className="h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={todayData}>
                    <defs>
                      <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#003366" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#003366" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="hour" fontSize={10} tickLine={false} axisLine={false} interval={3}/>
                    <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}/>
                    <Area type="monotone" dataKey="orders" stroke="#003366" fillOpacity={1} fill="url(#colorOrders)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
           </div>

           {/* Operational Area */}
           <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-600 uppercase">Operational Status</h3>
              <div className="grid grid-cols-2 gap-4">
                  <OperationalCard 
                    label="Processing" 
                    count={processingCount} 
                    icon={Layers} 
                    color="border-blue-200" 
                    onClick={() => openModal('PROCESSING', 'Processing Orders')}
                  />
                  <OperationalCard 
                    label="On Hold" 
                    count={onHold} 
                    icon={PauseCircle} 
                    color="border-yellow-200" 
                    onClick={() => openModal('ON_HOLD', 'Orders On Hold')}
                  />
                  <OperationalCard 
                    label="In Validation" 
                    count={inValidation} 
                    icon={CheckSquare} 
                    color="border-slate-200" 
                    onClick={() => openModal('IN_VALIDATION', 'Orders In Validation')}
                  />
                  <OperationalCard 
                    label="Awaiting Stock" 
                    count={awaitingStock} 
                    icon={Package} 
                    color="border-red-200" 
                    onClick={() => openModal('AWAITING_STOCK', 'Awaiting Stock')}
                  />
                  <OperationalCard 
                    label="Exceptions" 
                    count={exceptions} 
                    icon={AlertCircle} 
                    color="border-orange-200" 
                    onClick={() => openModal('EXCEPTIONS', 'Order Exceptions')}
                  />
              </div>
           </div>
        </div>

        {/* RIGHT COL: INBOUND & INTERNAL */}
        <div className="space-y-6 lg:pl-8">
           <h2 className="text-lg font-bold text-slate-700 uppercase tracking-wide border-b pb-2 border-slate-200">Inbound Analysis</h2>

           <div className="grid grid-cols-2 gap-4">
              <KpiCard title="Total Returns" value={totalIn} color="blue" onClick={() => openModal('TOTAL_IN', 'Total Returns')} />
              <KpiCard title="Completed" value={completedIn} color="green" onClick={() => openModal('COMPLETED_IN', 'Completed Returns')} />
              <KpiCard title="Pending Arrival" value={pendingIn} color="yellow" onClick={() => openModal('PENDING_IN', 'Pending Arrival')} />
              <KpiCard title="Failed" value={failedIn} color="red" onClick={() => openModal('FAILED_IN', 'Failed Returns')} />
           </div>

           {/* Missing Tracking Box */}
            <div className="bg-white rounded-xl shadow-sm border border-orange-200 overflow-hidden">
                <div className="bg-orange-50 px-4 py-3 border-b border-orange-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                         <FileWarning className="w-4 h-4 text-orange-600" />
                         <h3 className="text-sm font-bold text-orange-800 uppercase">Missing Waybills</h3>
                    </div>
                    {mwFilterBrand && (
                        <button 
                            onClick={() => setMwFilterBrand(null)}
                            className="text-[10px] text-orange-600 font-medium hover:underline"
                        >
                            Clear Filter
                        </button>
                    )}
                </div>
                
                {/* Brand Summary for Missing Waybills - Clickable */}
                {mwBrandSummary.length > 0 && (
                    <div className="bg-orange-50/50 px-4 py-2 flex flex-wrap gap-2 border-b border-orange-100">
                        {mwBrandSummary.map(([brand, count]) => (
                            <button 
                                key={brand}
                                onClick={() => setMwFilterBrand(brand === mwFilterBrand ? null : brand)}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-sm transition-colors ${
                                    mwFilterBrand === brand 
                                    ? 'bg-orange-500 text-white border-orange-600'
                                    : 'bg-white text-orange-700 border-orange-200 hover:bg-orange-100'
                                }`}
                            >
                                {brand}: {count}
                            </button>
                        ))}
                    </div>
                )}

                <div className="p-0">
                    {missingWaybillDisplayed.length === 0 ? (
                        <div className="p-4 text-sm text-slate-500 text-center">
                            {missingWaybillAll.length > 0 
                              ? `No missing waybills for ${mwFilterBrand}.` 
                              : "All returns have tracking numbers."}
                        </div>
                    ) : (
                        <div className="max-h-64 overflow-y-auto custom-scrollbar">
                             <table className="min-w-full divide-y divide-orange-100">
                                <thead className="bg-orange-50/50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-orange-600">Return ID</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-orange-600">Brand</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-orange-600">Status</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-orange-600">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-orange-50">
                                    {missingWaybillDisplayed.map(item => (
                                        <tr key={item.returnId} className="hover:bg-orange-50/30">
                                            <td className="px-4 py-2 text-xs font-mono text-slate-600">{item.returnId}</td>
                                            <td className="px-4 py-2 text-xs text-slate-600">{item.brand}</td>
                                            <td className="px-4 py-2 text-xs text-orange-700 font-bold">{item.status}</td>
                                            <td className="px-4 py-2 text-xs text-slate-500">{item.statusDate}</td>
                                        </tr>
                                    ))}
                                </tbody>
                             </table>
                        </div>
                    )}
                </div>
            </div>

        </div>
      </div>

      {/* --- QUICK REF SEARCH SECTION --- */}
      <div className="mt-12 pt-8 border-t border-slate-200">
        <h2 className="text-lg font-bold text-slate-700 uppercase tracking-wide mb-1">Quick Reference Cross-Search</h2>
        <span className="text-sm text-slate-400 mb-6 block">(Searches local records first, then API)</span>
        
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            
            {/* Search Input */}
            <div className="flex items-center gap-4 mb-8">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5"/>
                    <input 
                        type="text" 
                        value={quickSearchTerm}
                        onChange={(e) => setQuickSearchTerm(e.target.value)}
                        placeholder="Search Ref..." 
                        style={{ width: '300px' }}
                        className="pl-10 pr-4 py-2 bg-[#004488] text-white placeholder-slate-300 border border-transparent rounded-lg focus:ring-2 focus:ring-[#003366] focus:border-transparent outline-none transition-all duration-200"
                    />
                </div>
                <button 
                    onClick={handleQuickSearch}
                    disabled={isSearching}
                    className="bg-[#003366] text-white px-6 py-2 rounded-lg font-medium hover:bg-[#002244] transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                    {isSearching ? (
                        <span className="flex items-center gap-2">
                            <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                            Running...
                        </span>
                    ) : 'Search Network'}
                </button>
                
                {searchStatus && (
                    <span className="text-sm text-[#003366] font-medium animate-pulse">
                        {searchStatus}
                    </span>
                )}
            </div>
            
            {qsError && <div className="text-red-500 mb-4 text-sm font-medium">{qsError}</div>}

            {/* Results Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 relative">
                <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px bg-slate-100 -ml-px"></div>

                {/* Outbound Result */}
                <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
                        <ArrowRight size={14}/> Outbound Match
                    </h3>
                    
                    {qsOutbound ? (
                        <div className="bg-slate-50 rounded-lg border border-slate-200 p-6 space-y-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-bold text-lg text-slate-800">{qsOutbound.brand}</h4>
                                    <span className="text-xs text-slate-500 font-mono">{qsOutbound.id}</span>
                                </div>
                                <span className="bg-[#003366] text-white text-xs px-2 py-1 rounded font-bold">
                                    {qsOutbound.status}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                                <div>
                                    <span className="block text-xs font-bold text-slate-400 uppercase">Customer</span>
                                    <span className="text-slate-800">{qsOutbound.customer}</span>
                                </div>
                                <div>
                                    <span className="block text-xs font-bold text-slate-400 uppercase">Source Ref</span>
                                    <span className="text-slate-800 font-mono">{qsOutbound.sourceStoreOrderId || '-'}</span>
                                </div>
                                <div className="col-span-2">
                                    <span className="block text-xs font-bold text-slate-400 uppercase">Items</span>
                                    <span className="text-slate-800">{qsOutbound.item}</span>
                                </div>
                                 <div className="col-span-2">
                                    <span className="block text-xs font-bold text-slate-400 uppercase">Address</span>
                                    <span className="text-slate-800">{qsOutbound.address}</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-32 flex items-center justify-center text-slate-400 text-sm italic border-2 border-dashed border-slate-100 rounded-lg">
                            {isSearching ? 'Scanning...' : 'No outbound record loaded'}
                        </div>
                    )}
                </div>

                {/* Inbound Result */}
                 <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
                        <ArrowDown size={14} className="rotate-0 lg:-rotate-90"/> Inbound Match
                    </h3>

                    {qsInbound === 'NA' ? (
                         <div className="h-full bg-slate-50 rounded-lg border border-slate-200 flex flex-col items-center justify-center p-6 text-center">
                            <Ban className="w-8 h-8 text-slate-300 mb-2"/>
                            <p className="text-slate-500 font-medium">No linked return found</p>
                            <p className="text-xs text-slate-400 mt-1">
                                {qsOutbound?.sourceStoreOrderId?.includes('SHP-') 
                                    ? `Searched for Ref: ${qsOutbound.sourceStoreOrderId.split('SHP-')[1]}` 
                                    : 'Source Ref did not contain "SHP-" pattern'}
                            </p>
                         </div>
                    ) : qsInbound ? (
                        <div className="bg-orange-50 rounded-lg border border-orange-200 p-6 space-y-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-bold text-lg text-slate-800">{qsInbound.brand}</h4>
                                    <span className="text-xs text-slate-500 font-mono">{qsInbound.returnId}</span>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded font-bold ${qsInbound.status === 'FAILED' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
                                    {qsInbound.status}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                                <div>
                                    <span className="block text-xs font-bold text-orange-400 uppercase">Customer</span>
                                    <span className="text-slate-800">{qsInbound.customer}</span>
                                </div>
                                <div>
                                    <span className="block text-xs font-bold text-orange-400 uppercase">Ref Match</span>
                                    <span className="text-slate-800 font-mono">{qsInbound.sourceShipmentId}</span>
                                </div>
                                <div className="col-span-2">
                                    <span className="block text-xs font-bold text-orange-400 uppercase">Items Returned</span>
                                    <span className="text-slate-800">{qsInbound.item} (Qty: {qsInbound.qty})</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                         <div className="h-32 flex items-center justify-center text-slate-400 text-sm italic border-2 border-dashed border-slate-100 rounded-lg">
                             Waiting for selection...
                        </div>
                    )}
                 </div>

            </div>

        </div>
      </div>

      {/* RECORD MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
             
             {/* Header */}
             <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center gap-3">
                   <div className="bg-[#003366]/10 p-2 rounded-lg text-[#003366]">
                      <Layers size={20}/>
                   </div>
                   <h2 className="text-lg font-bold text-slate-800">{modalTitle}</h2>
                </div>
                <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                   <XCircle size={24} />
                </button>
             </div>

             {/* Content */}
             <div className="flex-1 overflow-auto p-6 bg-slate-50">
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                   <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                         <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Brand</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                         </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                         {modalRecords.map((item: any, idx: number) => (
                            <tr key={item.id || item.returnId || idx} className="hover:bg-slate-50">
                               <td className="px-6 py-3 text-sm font-mono text-slate-600">{item.id || item.returnId}</td>
                               <td className="px-6 py-3 text-sm text-slate-700 font-bold">{item.brand}</td>
                               <td className="px-6 py-3 text-sm text-slate-500">{item.date}</td>
                               <td className="px-6 py-3">
                                  <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                                     {item.status}
                                  </span>
                               </td>
                            </tr>
                         ))}
                         {modalRecords.length === 0 && (
                            <tr>
                               <td colSpan={4} className="px-6 py-8 text-center text-slate-400 italic">
                                  No records found.
                               </td>
                            </tr>
                         )}
                      </tbody>
                   </table>
                </div>
             </div>

          </div>
        </div>
      )}

    </div>
  );
};