import React, { useState, useEffect } from 'react';
import { Group, ConnectionMode, TestConnectionStatus, TicketScope } from './types';
import { ECOMPLETE_GROUPS, FALLBACK_API_KEY, DEFAULT_PROXY_URL } from './constants';
import { testConnection } from './services/freshdeskService';
import { Activity, LayoutDashboard, Truck, Undo2, ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import { SettingsModal } from './components/SettingsModal';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ShippingPage } from './pages/ShippingPage';
import { ReturnsPage } from './pages/ReturnsPage';
import { MobileLoginPage } from './pages/MobileLoginPage';
import { MobileDashboardPage } from './pages/MobileDashboardPage';

type Page = 'dashboard' | 'shipping' | 'returns';

const App: React.FC = () => {
  // --- Auth State ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeUser, setActiveUser] = useState<'Adrian Louw' | 'Taswell Solomons' | 'Guest User' | null>(null);
  const [authApiKey, setAuthApiKey] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Core State ---
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const [selectedGroup, setSelectedGroup] = useState<Group>(ECOMPLETE_GROUPS[0]);
  const [ticketScope, setTicketScope] = useState<TicketScope>('25');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Mobile Review Toggle
  const [mobileMode, setMobileMode] = useState<boolean>(() => {
    return window.innerWidth < 768;
  });

  // Connection Settings
  const [apiKey, setApiKey] = useState<string>(() => 
    localStorage.getItem('freshdesk_api_key') || 
    process.env.FRESHDESK_API_KEY || 
    process.env.FRESHDESK_API || 
    FALLBACK_API_KEY
  );
  const [proxyUrl, setProxyUrl] = useState<string>(() => localStorage.getItem('freshdesk_proxy_url') || DEFAULT_PROXY_URL);
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>(() => (localStorage.getItem('freshdesk_connection_mode') as ConnectionMode) || 'direct');
  
  // UI State
  const [testStatus, setTestStatus] = useState<TestConnectionStatus>('idle');
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    if (activeUser === 'Guest User') {
        setAuthApiKey('ZpmwR0SRdLvfXDiIqaf2');
    } else if (activeUser) {
        setAuthApiKey('');
    }
  }, [activeUser]);

  const handleLogin = async () => { 
      if (!activeUser || !authApiKey) return; 
      setIsAuthenticating(true); 
      setError(null); 
      try { 
          const result = await testConnection({ apiKey: authApiKey, connectionMode: 'direct' }); 
          if (result.success) { 
              setApiKey(authApiKey); 
              localStorage.setItem('freshdesk_api_key', authApiKey); 
              setIsAuthenticated(true); 
          } else { 
              setError("Invalid API Key."); 
          } 
      } catch (e: any) { 
          setError("Network Failure."); 
      } finally { 
          setIsAuthenticating(false); 
      } 
  };

  const handleTestConnection = async () => { 
      setTestStatus('testing'); 
      const result = await testConnection({ apiKey, proxyUrl, connectionMode }); 
      setTestStatus(result.success ? 'success' : 'failed'); 
  };

  if (!isAuthenticated) {
    return mobileMode ? (
      <MobileLoginPage 
          activeUser={activeUser}
          setActiveUser={setActiveUser}
          authApiKey={authApiKey}
          setAuthApiKey={setAuthApiKey}
          handleLogin={handleLogin}
          isAuthenticating={isAuthenticating}
          error={error}
          onToggleView={() => setMobileMode(false)}
      />
    ) : (
      <LoginPage 
          activeUser={activeUser}
          setActiveUser={setActiveUser}
          authApiKey={authApiKey}
          setAuthApiKey={setAuthApiKey}
          handleLogin={handleLogin}
          isAuthenticating={isAuthenticating}
          error={error}
          onToggleMobileView={() => setMobileMode(true)}
      />
    );
  }

  const MainDashboard = mobileMode ? (
    <MobileDashboardPage 
        apiKey={apiKey}
        proxyUrl={proxyUrl}
        connectionMode={connectionMode}
        selectedGroup={selectedGroup}
        setSelectedGroup={setSelectedGroup}
        ticketScope={ticketScope}
        setTicketScope={setTicketScope}
    />
  ) : (
    <DashboardPage 
        apiKey={apiKey}
        proxyUrl={proxyUrl}
        connectionMode={connectionMode}
        selectedGroup={selectedGroup}
        setSelectedGroup={setSelectedGroup}
        ticketScope={ticketScope}
        setTicketScope={setTicketScope}
    />
  );

  return (
    <div className={`flex min-h-screen bg-slate-50 font-sans text-slate-900 relative ${isAuthenticated ? 'animate-[fade-in_1s_ease-out_forwards]' : ''}`}>
        
        {/* SIDE NAV MENU */}
        {!mobileMode && (
          <aside 
              className={`fixed left-0 top-0 h-screen bg-slate-900 flex flex-col z-50 shadow-2xl border-r border-slate-800 transition-all duration-300 ease-in-out ${sidebarOpen ? 'w-72' : 'w-20'}`}
          >
              <div className={`p-8 flex flex-col items-center border-b border-slate-800/50 transition-all duration-300 ${!sidebarOpen && 'px-2'}`}>
                  <div className="w-14 h-14 bg-ecomplete-primary rounded-3xl flex items-center justify-center text-white mb-4 shadow-xl shadow-blue-900/40 ring-4 ring-slate-800 shrink-0">
                      <Activity size={32} />
                  </div>
                  {sidebarOpen && (
                      <div className="animate-in fade-in duration-300 flex flex-col items-center">
                          <h2 className="text-white font-black uppercase text-sm tracking-[0.2em] text-center whitespace-nowrap">eComplete</h2>
                          <h1 className="text-ecomplete-accent font-black text-[10px] uppercase tracking-[0.3em] mt-1 opacity-80 whitespace-nowrap">Analytics Center</h1>
                      </div>
                  )}
              </div>
              
              <nav className="flex-1 p-4 space-y-3 mt-4 overflow-y-auto overflow-x-hidden">
                  <button 
                      onClick={() => setActivePage('dashboard')}
                      className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-500 group relative overflow-hidden ${activePage === 'dashboard' ? 'bg-ecomplete-primary text-white shadow-[0_10px_30px_rgba(44,62,80,0.5)]' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'} ${!sidebarOpen && 'justify-center px-0'}`}
                  >
                      {activePage === 'dashboard' && <div className="absolute left-0 top-0 w-1.5 h-full bg-ecomplete-accent"></div>}
                      <LayoutDashboard size={22} className={`shrink-0 ${activePage === 'dashboard' ? 'text-ecomplete-accent' : 'text-slate-600 group-hover:text-slate-300'}`} />
                      {sidebarOpen && <span className="font-black text-xs uppercase tracking-wider text-left leading-tight animate-in fade-in duration-300">Freshdesk Snap Intelligence</span>}
                  </button>

                  <button 
                      onClick={() => setActivePage('shipping')}
                      className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-500 group relative overflow-hidden ${activePage === 'shipping' ? 'bg-ecomplete-primary text-white shadow-[0_10px_30px_rgba(44,62,80,0.5)]' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'} ${!sidebarOpen && 'justify-center px-0'}`}
                  >
                      {activePage === 'shipping' && <div className="absolute left-0 top-0 w-1.5 h-full bg-ecomplete-accent"></div>}
                      <Truck size={22} className={`shrink-0 ${activePage === 'shipping' ? 'text-ecomplete-accent' : 'text-slate-600 group-hover:text-slate-300'}`} />
                      {sidebarOpen && <span className="font-black text-xs uppercase tracking-wider text-left leading-tight animate-in fade-in duration-300">Shipping Analysis</span>}
                  </button>

                  <button 
                      onClick={() => setActivePage('returns')}
                      className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-500 group relative overflow-hidden ${activePage === 'returns' ? 'bg-ecomplete-primary text-white shadow-[0_10px_30px_rgba(44,62,80,0.5)]' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'} ${!sidebarOpen && 'justify-center px-0'}`}
                  >
                      {activePage === 'returns' && <div className="absolute left-0 top-0 w-1.5 h-full bg-ecomplete-accent"></div>}
                      <Undo2 size={22} className={`shrink-0 ${activePage === 'returns' ? 'text-ecomplete-accent' : 'text-slate-600 group-hover:text-slate-300'}`} />
                      {sidebarOpen && <span className="font-black text-xs uppercase tracking-wider text-left leading-tight animate-in fade-in duration-300">Returns Summary</span>}
                  </button>
              </nav>

              <div className={`p-4 pb-6 border-t border-slate-800/50 bg-slate-950/30 transition-all duration-300 ${!sidebarOpen ? 'px-2 flex justify-center' : 'px-4'}`}>
                  <div className={`flex items-center ${!sidebarOpen ? 'justify-center' : 'justify-between'} w-full`}>
                      <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-white font-black text-xs ring-2 ring-slate-700/50 shadow-inner shrink-0">{activeUser?.charAt(0)}</div>
                          {sidebarOpen && (
                              <div className="animate-in fade-in duration-300 overflow-hidden">
                                  <div className="text-white font-black text-[10px] tracking-tight whitespace-nowrap">{activeUser}</div>
                                  <div className="text-slate-500 text-[8px] font-bold uppercase tracking-widest whitespace-nowrap">Admin Access</div>
                              </div>
                          )}
                      </div>
                      {sidebarOpen && (
                          <button 
                              onClick={() => setSettingsOpen(true)}
                              className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                          >
                              <Settings size={16} />
                          </button>
                      )}
                  </div>
              </div>
              
              <button 
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="absolute -right-3 top-20 bg-white border border-slate-200 rounded-full p-1 shadow-md text-slate-500 hover:text-ecomplete-primary transition-colors z-50"
              >
                  {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
              </button>
          </aside>
        )}

        {/* MAIN CONTENT AREA */}
        <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out ${(!mobileMode && sidebarOpen) ? 'ml-72' : !mobileMode ? 'ml-20' : 'ml-0'}`}>
            
            {activePage === 'shipping' && <ShippingPage />}
            {activePage === 'returns' && <ReturnsPage />}
            
            <div className={activePage === 'dashboard' ? 'block' : 'hidden'}>
                {MainDashboard}
            </div>

            <SettingsModal 
                isOpen={settingsOpen} 
                onClose={() => setSettingsOpen(false)} 
                apiKey={apiKey} 
                setApiKey={setApiKey} 
                proxyUrl={proxyUrl} 
                setProxyUrl={setProxyUrl} 
                connectionMode={connectionMode} 
                setConnectionMode={setConnectionMode}
                testStatus={testStatus}
                onTestConnection={handleTestConnection}
                testMode={false}
                setTestMode={() => {}} 
                mobileMode={mobileMode}
                setMobileMode={setMobileMode}
            />
        </div>
    </div>
  );
};

export default App;