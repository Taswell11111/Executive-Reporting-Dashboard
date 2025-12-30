import React, { useState } from 'react';
import { ViewType, UploadInfo, AppNotification } from '../types';
import { RefreshCw, CheckCircle, Database, ToggleLeft, ToggleRight, Wifi, WifiOff, Power, Bell } from 'lucide-react';

interface NavbarProps {
  currentView: ViewType;
  setView: (view: ViewType) => void;
  dataInfo: UploadInfo;
  onRefresh: () => void;
  isMockMode: boolean;
  setMockMode: (val: boolean) => void;
  notifications: AppNotification[];
  clearNotifications: () => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  currentView, 
  setView, 
  dataInfo,
  onRefresh,
  isMockMode,
  setMockMode,
  notifications,
  clearNotifications,
  onLogout
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  
  const NavButton = ({ view, label }: { view: ViewType; label: string }) => (
    <button
      onClick={() => setView(view)}
      className={`inline-flex items-center px-1 pt-1 border-b-2 text-base font-medium transition-colors ${
        currentView === view
          ? 'border-white text-white'
          : 'border-transparent text-slate-300 hover:text-white hover:border-slate-400'
      }`}
    >
      {label}
    </button>
  );

  return (
    <nav className="bg-[#003366] border-b border-[#002b55] sticky top-0 z-30 shadow-md">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center gap-2">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center text-white font-bold text-2xl border border-white/20">
                B
              </div>
              <span className="font-bold text-2xl tracking-tight text-white">
                Bounty Brands <span className="text-slate-300 font-normal">Shipments Control</span>
              </span>
            </div>
            <div className="hidden sm:ml-10 sm:flex sm:space-x-8">
              <NavButton view="dashboard" label="Dashboard" />
              <NavButton view="outbound" label="Outbound Tracker" />
              <NavButton view="inbound" label="Inbound Tracker" />
              <NavButton view="freshdesk" label="Freshdesk" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            
            {/* Mode Toggle & Refresh Group */}
            <div className="flex items-center bg-[#002244] rounded-lg p-1 border border-white/10">
                <button
                   onClick={() => setMockMode(!isMockMode)}
                   className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors ${isMockMode ? 'bg-orange-500/20 text-orange-200' : 'bg-green-500/20 text-green-200'}`}
                   title={isMockMode ? "Using Simulated Data" : "Using Live API"}
                >
                   {isMockMode ? <WifiOff size={14}/> : <Wifi size={14}/>}
                   {isMockMode ? "Mock Mode" : "Live API"}
                </button>
                <div className="w-px h-4 bg-white/10 mx-1"></div>
                <button 
                  onClick={onRefresh}
                  disabled={dataInfo.loading}
                  className={`text-slate-300 hover:text-white px-2 py-1.5 transition-colors ${dataInfo.loading ? 'opacity-50' : ''}`}
                >
                    <RefreshCw size={16} className={dataInfo.loading ? 'animate-spin' : ''} />
                </button>
            </div>

            <div className="hidden sm:flex flex-col items-end gap-0.5">
               {dataInfo.timestamp && (
                   <span className="text-[10px] text-slate-400">
                      Updated: {dataInfo.timestamp}
                   </span>
               )}
            </div>
            
            {/* Notification Bell */}
            <div className="relative">
                <button 
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="h-9 w-9 rounded-full bg-yellow-500/20 hover:bg-yellow-500/40 flex items-center justify-center text-yellow-200 hover:text-white border border-yellow-500/30 transition-all relative"
                    title="Notifications"
                >
                   <Bell size={18} />
                   {notifications.length > 0 && (
                       <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border border-[#003366]">
                           {notifications.length > 9 ? '9+' : notifications.length}
                       </span>
                   )}
                </button>

                {/* Dropdown */}
                {showNotifications && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)}></div>
                        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-slate-200 z-50 overflow-hidden animate-[fadeIn_0.2s_ease-in-out]">
                             <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                 <h4 className="text-xs font-bold text-slate-700 uppercase">Notifications</h4>
                                 <button onClick={clearNotifications} className="text-[10px] text-red-500 hover:underline">Clear All</button>
                             </div>
                             <div className="max-h-80 overflow-y-auto custom-scrollbar">
                                {notifications.length === 0 ? (
                                    <div className="p-6 text-center text-slate-400 text-xs italic">No new notifications</div>
                                ) : (
                                    notifications.map(notif => (
                                        <div key={notif.id} className="p-3 border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className={`text-xs font-bold ${notif.type === 'alert' ? 'text-red-600' : 'text-[#003366]'}`}>{notif.title}</span>
                                                <span className="text-[10px] text-slate-400">{notif.time}</span>
                                            </div>
                                            <p className="text-xs text-slate-600 leading-snug">{notif.message}</p>
                                        </div>
                                    ))
                                )}
                             </div>
                        </div>
                    </>
                )}
            </div>

            {/* Shutdown Button */}
            <button 
                onClick={onLogout}
                className="h-9 w-9 rounded-full bg-red-500/20 hover:bg-red-500/40 flex items-center justify-center text-red-200 hover:text-white border border-red-500/30 transition-all"
                title="Shutdown"
            >
              <Power size={18} />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};