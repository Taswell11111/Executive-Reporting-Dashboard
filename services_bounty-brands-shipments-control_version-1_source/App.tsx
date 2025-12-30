import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { OutboundTracker } from './components/OutboundTracker';
import { InboundTracker } from './components/InboundTracker';
import { OutboundShipment, InboundReturn, ViewType, SortConfig, UploadInfo, AppNotification } from './types';
import { BRANDS, STORE_CREDENTIALS } from './constants';
import { fetchAllOutbounds, fetchAllInbounds, generateMockOutbounds, generateMockInbounds } from './services/apiService';
import { RotateCcw } from 'lucide-react';
import FreshdeskTickets from './components/FreshdeskTickets';

const App: React.FC = () => {
  // State
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [outboundData, setOutboundData] = useState<OutboundShipment[]>([]);
  const [inboundData, setInboundData] = useState<InboundReturn[]>([]);
  
  // Data Status State
  const [dataInfo, setDataInfo] = useState<UploadInfo>({ loaded: false, timestamp: '', loading: false });
  const [isMockMode, setIsMockMode] = useState<boolean>(true); // Start in Mock Mode
  
  // Notifications
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const prevOutboundRef = useRef<Set<string>>(new Set());

  // Intro State
  const [showIntro, setShowIntro] = useState(true);
  const [introFading, setIntroFading] = useState(false);

  // App Lifecycle State
  const [isLoggedOut, setIsLoggedOut] = useState(false);

  // Filters & Sorting
  const [brandFilter, setBrandFilter] = useState<string>('All');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [outboundSearch, setOutboundSearch] = useState('');
  const [inboundSearch, setInboundSearch] = useState('');
  const [outboundSort, setOutboundSort] = useState<SortConfig>({ key: 'date', dir: 'desc' });
  const [inboundSort, setInboundSort] = useState<SortConfig>({ key: 'date', dir: 'desc' });

  // Handle Intro Animation
  useEffect(() => {
    const timer1 = setTimeout(() => setIntroFading(true), 5500); // Start fade out at 5.5s
    const timer2 = setTimeout(() => setShowIntro(false), 6000);  // Remove from DOM at 6s
    return () => { clearTimeout(timer1); clearTimeout(timer2); };
  }, []);

  // --- Notification Helper ---
  const addNotification = (title: string, message: string, type: 'info' | 'success' | 'alert' = 'info') => {
    const newNotif: AppNotification = {
      id: Date.now().toString() + Math.random().toString(),
      title,
      message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type,
      read: false
    };
    setNotifications(prev => [newNotif, ...prev].slice(0, 50));
  };

  // --- API Handlers ---
  const fetchData = async () => {
    setDataInfo(prev => ({ ...prev, loading: true }));
    try {
      let outbounds: OutboundShipment[] = [];
      let inbounds: InboundReturn[] = [];

      if (isMockMode) {
        // Generate Mock Data for all brands
        await new Promise(resolve => setTimeout(resolve, 800)); // Simulate delay
        STORE_CREDENTIALS.forEach(store => {
          outbounds = [...outbounds, ...generateMockOutbounds(store.name)];
          inbounds = [...inbounds, ...generateMockInbounds(store.name)];
        });
        outbounds.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        inbounds.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      } else {
        // Fetch Real API Data
        const [apiOut, apiIn] = await Promise.all([
            fetchAllOutbounds(),
            fetchAllInbounds()
        ]);
        outbounds = apiOut;
        inbounds = apiIn;
      }

      setOutboundData(outbounds);
      setInboundData(inbounds);

      // Notification Logic: Check for new records compared to previous fetch
      let newCount = 0;
      if (prevOutboundRef.current.size > 0) {
        outbounds.forEach(o => {
          if (!prevOutboundRef.current.has(o.id)) newCount++;
        });
      } else {
         // Initial load
         newCount = outbounds.length;
      }
      
      // Update Ref
      const newSet = new Set(outbounds.map(o => o.id));
      prevOutboundRef.current = newSet;

      if (newCount > 0) {
        addNotification(
          'Records Synced', 
          `${newCount} records retrieved or updated successfully.`, 
          'success'
        );
      }

      const now = new Date();
      setDataInfo({
        loaded: true,
        loading: false,
        timestamp: `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`
      });

    } catch (error) {
      console.error("Failed to fetch data", error);
      setDataInfo(prev => ({ ...prev, loading: false }));
      addNotification('Sync Failed', 'Could not retrieve latest data.', 'alert');
    }
  };

  // Initial Fetch & Refetch on Toggle
  useEffect(() => {
    fetchData();
  }, [isMockMode]);

  const handleOutboundSort = (key: string) => {
    setOutboundSort(prev => ({
      key,
      dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleInboundSort = (key: string) => {
    setInboundSort(prev => ({
      key,
      dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleLogout = () => {
      setIsLoggedOut(true);
  };

  const handleReload = () => {
      window.location.reload();
  };

  // --- Helper to check dates ---
  const isWithinDateRange = (dateStr: string) => {
    if (!dateRange.start && !dateRange.end) return true;
    const d = new Date(dateStr);
    const start = dateRange.start ? new Date(dateRange.start) : null;
    const end = dateRange.end ? new Date(dateRange.end) : null;

    if (start && d < start) return false;
    if (end) {
        // Set end date to end of day
        end.setHours(23, 59, 59);
        if (d > end) return false;
    }
    return true;
  };

  // --- Derived State (Filtering & Sorting) ---
  const filteredOutbound = useMemo(() => {
    let result = outboundData;

    if (brandFilter !== 'All') {
      result = result.filter(item => item.brand === brandFilter);
    }

    result = result.filter(item => isWithinDateRange(item.date));

    if (outboundSearch) {
      const lower = outboundSearch.toLowerCase();
      result = result.filter(item => 
        (item.id || '').toLowerCase().includes(lower) || 
        (item.orderId || '').toLowerCase().includes(lower) ||
        (item.sourceStoreOrderId || '').toLowerCase().includes(lower) || 
        (item.tracking || '').toLowerCase().includes(lower) ||
        (item.customer || '').toLowerCase().includes(lower) ||
        (item.channelId || '').toLowerCase().includes(lower)
      );
    }

    return [...result].sort((a, b) => {
      const valA = (a as any)[outboundSort.key] || '';
      const valB = (b as any)[outboundSort.key] || '';
      if (valA < valB) return outboundSort.dir === 'asc' ? -1 : 1;
      if (valA > valB) return outboundSort.dir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [outboundData, brandFilter, dateRange, outboundSearch, outboundSort]);

  const filteredInbound = useMemo(() => {
    let result = inboundData;

    if (brandFilter !== 'All') {
      result = result.filter(item => item.brand === brandFilter);
    }

    result = result.filter(item => isWithinDateRange(item.date));

    if (inboundSearch) {
      const lower = inboundSearch.toLowerCase();
      result = result.filter(item => 
        (item.returnId || '').toLowerCase().includes(lower) ||
        (item.reference || '').toLowerCase().includes(lower) || 
        (item.tracking || '').toLowerCase().includes(lower) ||
        (item.customer || '').toLowerCase().includes(lower)
      );
    }

    return [...result].sort((a, b) => {
      const valA = (a as any)[inboundSort.key] || '';
      const valB = (b as any)[inboundSort.key] || '';
      if (valA < valB) return inboundSort.dir === 'asc' ? -1 : 1;
      if (valA > valB) return inboundSort.dir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [inboundData, brandFilter, dateRange, inboundSearch, inboundSort]);

  if (isLoggedOut) {
      return (
          <div className="fixed inset-0 z-[200] bg-[#003366] flex flex-col items-center justify-center">
              <h1 className="text-6xl font-extrabold text-white mb-8 tracking-tight drop-shadow-lg">Goodbye!</h1>
              <button 
                  onClick={handleReload}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-8 py-3 rounded-full font-bold transition-all border border-white/20 hover:border-white/50"
              >
                  <RotateCcw size={20} />
                  Login again
              </button>
          </div>
      );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-900 relative">
      
      {/* INTRO ANIMATION OVERLAY */}
      {showIntro && (
        <div 
          className={`fixed inset-0 z-[100] bg-[#003366] flex items-center justify-center overflow-hidden transition-opacity duration-1000 ease-in-out ${introFading ? 'opacity-0' : 'opacity-100'}`}
        >
             <style>{`
               @keyframes zoomInText {
                 0% { transform: scale(0.9); opacity: 0; filter: blur(5px); }
                 100% { transform: scale(1.1); opacity: 1; filter: blur(0); }
               }
               @keyframes shootingStar {
                 0% { transform: translateX(0) translateY(0) rotate(-45deg); opacity: 1; }
                 100% { transform: translateX(-1000px) translateY(1000px) rotate(-45deg); opacity: 0; }
               }
               .star {
                 position: absolute;
                 width: 100px;
                 height: 2px;
                 background: linear-gradient(90deg, rgba(255,255,255,0.8), transparent);
                 box-shadow: 0 0 10px rgba(255,255,255,0.5);
               }
             `}</style>
             
             {/* Shooting Stars Effect */}
             <div className="absolute inset-0 pointer-events-none overflow-hidden">
                 {[...Array(10)].map((_, i) => (
                    <div 
                        key={i}
                        className="star"
                        style={{
                            top: `${Math.random() * 50}%`,
                            left: `${50 + Math.random() * 50}%`,
                            animation: `shootingStar ${1 + Math.random() * 2}s linear infinite`,
                            animationDelay: `${Math.random() * 2}s`
                        }}
                    ></div>
                 ))}
             </div>
             
             <div className="relative z-10 text-center">
                 <h1 
                   className="text-4xl md:text-6xl font-extrabold text-white tracking-tight drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                   style={{ animation: 'zoomInText 4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards' }}
                 >
                    Opening Shipments<br/>Control Centre...
                 </h1>
                 <div className="mt-4 flex justify-center gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                 </div>
             </div>
        </div>
      )}

      <Navbar 
        currentView={currentView}
        setView={setCurrentView}
        dataInfo={dataInfo}
        onRefresh={fetchData}
        isMockMode={isMockMode}
        setMockMode={setIsMockMode}
        notifications={notifications}
        clearNotifications={() => setNotifications([])}
        onLogout={handleLogout}
      />

      <main className="flex-1 pb-12">
        {/* Filter Bar */}
        <div className="bg-white shadow-sm border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-800">
                  {currentView === 'dashboard' ? 'Dashboard Overview' : 
                   currentView === 'outbound' ? 'Outbound Tracker' : 'Inbound Tracker'}
                </h1>
                <div className="text-xs text-slate-400 flex gap-3">
                   <span>Outbounds: {filteredOutbound.length} / {outboundData.length}</span>
                   <span className="text-slate-300">|</span>
                   <span>Inbounds: {filteredInbound.length} / {inboundData.length}</span>
                </div>
              </div>

              {/* Filters Row */}
              <div className="flex flex-col lg:flex-row gap-4 lg:items-center">
                
                {/* Brand Filters */}
                <div className="flex overflow-x-auto gap-2 pb-1 lg:pb-0 no-scrollbar">
                  {BRANDS.map(brand => (
                    <button
                      key={brand}
                      onClick={() => setBrandFilter(brand)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all shadow-sm border whitespace-nowrap ${
                        brandFilter === brand 
                          ? 'bg-[#003366] text-white border-transparent shadow-md' 
                          : 'bg-white text-[#003366] border-slate-200 hover:border-[#003366] hover:bg-slate-50'
                      }`}
                    >
                      {brand}
                    </button>
                  ))}
                </div>

                <div className="hidden lg:block w-px h-8 bg-slate-200 mx-2"></div>

                {/* Date Filters */}
                <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide ml-1">Order date range</span>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2 py-1.5 shadow-sm focus-within:ring-2 focus-within:ring-[#003366] focus-within:border-transparent">
                            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">From:</span>
                            <input 
                                type="date" 
                                className="text-sm text-slate-700 bg-white outline-none border-none p-0 focus:ring-0 w-32"
                                style={{ colorScheme: 'light' }}
                                value={dateRange.start}
                                onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                            />
                        </div>
                        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2 py-1.5 shadow-sm focus-within:ring-2 focus-within:ring-[#003366] focus-within:border-transparent">
                            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">To:</span>
                            <input 
                                type="date" 
                                className="text-sm text-slate-700 bg-white outline-none border-none p-0 focus:ring-0 w-32"
                                style={{ colorScheme: 'light' }}
                                value={dateRange.end}
                                onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                            />
                        </div>
                        {(dateRange.start || dateRange.end) && (
                            <button 
                                onClick={() => setDateRange({start: '', end: ''})}
                                className="text-xs text-red-500 hover:underline"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {currentView === 'dashboard' && (
            <Dashboard 
              outboundData={filteredOutbound} 
              inboundData={filteredInbound} 
            />
          )}
          {currentView === 'outbound' && (
            <OutboundTracker 
              data={filteredOutbound}
              onSort={handleOutboundSort}
              sortConfig={outboundSort}
              searchTerm={outboundSearch}
              onSearchChange={setOutboundSearch}
              brandFilter={brandFilter}
            />
          )}
          {currentView === 'inbound' && (
            <InboundTracker 
              data={filteredInbound}
              outboundData={outboundData}
              onSort={handleInboundSort}
              sortConfig={inboundSort}
              searchTerm={inboundSearch}
              onSearchChange={setInboundSearch}
              brandFilter={brandFilter}
            />
          )}
          {currentView === 'freshdesk' && (
            <FreshdeskTickets />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;