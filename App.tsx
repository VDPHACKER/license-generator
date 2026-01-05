
import React, { useState, useMemo } from 'react';
import LicenseForm from './components/LicenseForm';
import { LicenseResponse, TabType, User } from './types';

const App: React.FC = () => {
  // Auth & Security State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  
  // Persisted Identity
  const [adminUsername, setAdminUsername] = useState(localStorage.getItem('vdp_admin_username') || 'admin');
  const [adminPassword, setAdminPassword] = useState(localStorage.getItem('vdp_admin_password') || 'admin123');
  
  // Change Identity Forms
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [identityStatus, setIdentityStatus] = useState<{ type: 'success' | 'error', msg: string, target: 'user' | 'pass' } | null>(null);

  // API Key State
  const [apiKey, setApiKey] = useState(localStorage.getItem('vdp_api_key') || '');
  const [isKeySaved, setIsKeySaved] = useState(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);

  // App State
  const [activeTab, setActiveTab] = useState<TabType>('HOME');
  const [history, setHistory] = useState<LicenseResponse[]>([]);
  const [lastResult, setLastResult] = useState<LicenseResponse | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal States
  const [itemIndexToDelete, setItemIndexToDelete] = useState<number | null>(null);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  // Stats computation
  const stats = useMemo(() => {
    const hardwareCount = history.filter(h => !!h.macAddress && h.macAddress !== 'Globale').length;
    return {
      total: history.length,
      hardware: hardwareCount,
      global: history.length - hardwareCount
    };
  }, [history]);

  // Filtered History
  const filteredHistory = useMemo(() => {
    if (!searchQuery) return history;
    const q = searchQuery.toLowerCase();
    return history.filter(h => 
      h.licenseKey.toLowerCase().includes(q) || 
      (h.macAddress && h.macAddress.toLowerCase().includes(q))
    );
  }, [history, searchQuery]);

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginForm.username === adminUsername && loginForm.password === adminPassword) {
      setIsAuthenticated(true);
      setUser({ username: adminUsername, role: 'Super Administrator' });
      showToast("Connexion réussie !", "success");
    } else {
      setLoginError('Identifiants invalides.');
    }
  };

  const executeLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    setActiveTab('HOME');
    setLastResult(null);
    setLoginForm({ username: '', password: '' });
    setIsLogoutModalOpen(false);
    showToast("Déconnexion effectuée");
  };

  const handleUpdateUsername = () => {
    const trimmed = newUsername.trim();
    if (trimmed.length < 3) {
      setIdentityStatus({ type: 'error', msg: 'L\'utilisateur doit faire au moins 3 caractères.', target: 'user' });
      return;
    }
    localStorage.setItem('vdp_admin_username', trimmed);
    setAdminUsername(trimmed);
    if (user) setUser({ ...user, username: trimmed });
    setNewUsername('');
    showToast("Identifiant mis à jour", "success");
    setIdentityStatus({ type: 'success', msg: 'Identifiant mis à jour !', target: 'user' });
    setTimeout(() => setIdentityStatus(null), 3000);
  };

  const handleUpdatePassword = () => {
    // CRITÈRE : Min 8 caractères, au moins 1 lettre, 1 chiffre et 1 symbole
    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
    
    if (!passwordRegex.test(newPassword)) {
      setIdentityStatus({ 
        type: 'error', 
        msg: 'Critères : Min. 8 caractères, incluant lettres, chiffres et symboles.', 
        target: 'pass' 
      });
      return;
    }

    localStorage.setItem('vdp_admin_password', newPassword);
    setAdminPassword(newPassword);
    setNewPassword('');
    showToast("Mot de passe mis à jour", "success");
    setIdentityStatus({ type: 'success', msg: 'Mot de passe sécurisé enregistré !', target: 'pass' });
    setTimeout(() => setIdentityStatus(null), 3000);
  };

  const handleSaveApiKey = () => {
    if (apiKey.length < 32) {
      setApiKeyError("La clé API doit contenir au moins 32 caractères.");
      return;
    }
    localStorage.setItem('vdp_api_key', apiKey);
    setIsKeySaved(true);
    showToast("Clé API enregistrée", "success");
    setTimeout(() => setIsKeySaved(false), 3000);
  };

  const handleSuccess = (data: LicenseResponse) => {
    const enrichedData = {
      ...data,
      timestamp: new Date().toLocaleString(),
    };
    setLastResult(enrichedData);
    setHistory(prev => [enrichedData, ...prev]);
    showToast("Licence générée avec succès !", "success");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast("Copié dans le presse-papier !", "info");
  };

  const confirmDelete = (index: number) => {
    setItemIndexToDelete(index);
  };

  const executeDelete = () => {
    if (itemIndexToDelete !== null) {
      const itemToDelete = filteredHistory[itemIndexToDelete];
      setHistory(prev => prev.filter(h => h !== itemToDelete));
      setItemIndexToDelete(null);
      showToast("Licence supprimée", "error");
    }
  };

  const exportToCSV = () => {
    if (history.length === 0) return;
    const headers = ["Date", "Cle", "MAC", "Expiration"];
    const csvRows = [
      headers.join(";"),
      ...history.map(item => [
        `"${item.timestamp}"`,
        `"${item.licenseKey}"`,
        `"${item.macAddress}"`,
        `"${item.expirationDate}"`
      ].join(";"))
    ];
    const blob = new Blob([csvRows.join("\n")], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `VDP_Licenses_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    showToast("CSV exporté", "success");
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden transform transition-all hover:scale-[1.01]">
          <div className="bg-indigo-600 p-10 text-white text-center relative overflow-hidden">
            <div className="absolute top-[-20px] right-[-20px] w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
            <div className="inline-block p-4 bg-white/20 rounded-2xl mb-4 backdrop-blur-md">
              <i className="fa-solid fa-shield-halved text-3xl"></i>
            </div>
            <h1 className="text-2xl font-black tracking-tight">Connexion Admin </h1>
            <p className="opacity-70 text-sm mt-1 font-medium">Gestionnaire de Licences TNH</p>
          </div>
          
          <form onSubmit={handleLogin} className="p-10 space-y-6">
            {loginError && (
              <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold border border-red-100 flex items-center animate-bounce">
                <i className="fa-solid fa-circle-exclamation mr-2"></i>
                {loginError}
              </div>
            )}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Utilisateur</label>
              <input 
                type="text" required value={loginForm.username}
                onChange={e => setLoginForm({...loginForm, username: e.target.value})}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-50 outline-none transition-all font-medium"
                placeholder="Identifiant"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mot de passe</label>
              <input 
                type="password" required value={loginForm.password}
                onChange={e => setLoginForm({...loginForm, password: e.target.value})}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-50 outline-none transition-all font-medium"
                placeholder="••••••••"
              />
            </div>
            <button 
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-2xl shadow-xl shadow-indigo-100 transition-all active:scale-95"
            >
              Se connectez
            </button>
          </form>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch(activeTab) {
      case 'HISTORY':
        return (
          <div className="space-y-6 pb-24 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Historique</h2>
              {history.length > 0 && (
                <button onClick={exportToCSV} className="text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl font-bold text-xs hover:bg-indigo-100 transition-colors">CSV</button>
              )}
            </div>

            <div className="relative group">
              <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors"></i>
              <input 
                type="text" placeholder="Rechercher une MAC ou une clé..."
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-50 outline-none shadow-sm transition-all font-medium"
              />
            </div>

            <div className="space-y-3">
              {filteredHistory.length === 0 ? (
                <div className="bg-white p-12 text-center rounded-[2rem] border border-slate-100 shadow-sm text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                  <i className="fa-solid fa-ghost text-3xl mb-3 block opacity-20"></i>
                  Aucune licence trouvée
                </div>
              ) : (
                filteredHistory.map((item, index) => (
                  <div key={index} className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm flex flex-col space-y-2 group hover:border-indigo-200 transition-all hover:shadow-md">
                    <div className="flex justify-between items-center">
                      <code className="text-indigo-600 font-black text-sm select-all">{item.licenseKey}</code>
                      <div className="flex space-x-1">
                        <button onClick={() => copyToClipboard(item.licenseKey)} className="text-slate-300 hover:text-indigo-600 p-2 transition-colors"><i className="fa-solid fa-copy"></i></button>
                        <button onClick={() => confirmDelete(index)} className="text-slate-200 hover:text-red-500 p-2 transition-colors"><i className="fa-solid fa-trash-can"></i></button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                      <span className="flex items-center"><i className="fa-solid fa-microchip mr-1 opacity-50"></i> MAC: {item.macAddress}</span>
                      <span className="text-emerald-500 flex items-center"><i className="fa-solid fa-calendar-check mr-1 opacity-50"></i> Expire: {item.expirationDate}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      case 'ADMIN':
        return (
          <div className="space-y-6 pb-24 animate-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Paramètres Admin</h2>
            
            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Identifiant</label>
                  <div className="flex space-x-2">
                    <input 
                      type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)}
                      placeholder="Nouveau nom"
                      className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-50 transition-all"
                    />
                    <button onClick={handleUpdateUsername} className="bg-indigo-600 text-white px-4 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"><i className="fa-solid fa-check"></i></button>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nouveau mot de passe</label>
                    <span className="text-[9px] font-black text-slate-300">Min. 8 car + Mixte</span>
                  </div>
                  <div className="flex space-x-2">
                    <input 
                      type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                      placeholder="L + C + Symboles"
                      className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-50 transition-all"
                    />
                    <button onClick={handleUpdatePassword} className="bg-emerald-600 text-white px-4 rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-100"><i className="fa-solid fa-key"></i></button>
                  </div>
                  {identityStatus && (
                    <p className={`text-[10px] font-bold mt-2 px-1 ${identityStatus.type === 'error' ? 'text-red-500' : 'text-emerald-600'}`}>
                      <i className={`fa-solid ${identityStatus.type === 'error' ? 'fa-triangle-exclamation' : 'fa-circle-check'} mr-1`}></i>
                      {identityStatus.msg}
                    </p>
                  )}
                </div>

                <div className="pt-6 border-t border-slate-50">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Clé API Serveur</label>
                  <input 
                    type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl mt-1 mb-2 font-mono text-sm focus:ring-4 focus:ring-slate-100 outline-none transition-all"
                    placeholder="Clé secrète de 32+ caractères"
                  />
                  <button onClick={handleSaveApiKey} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-black transition-all shadow-xl shadow-slate-100 active:scale-95">Sauvegarder Clé API</button>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setIsLogoutModalOpen(true)}
              className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-black py-5 rounded-[2rem] border border-red-100 flex items-center justify-center transition-all shadow-sm hover:shadow-md"
            >
              <i className="fa-solid fa-power-off mr-3"></i>
              DÉCONNEXION
            </button>
          </div>
        );
      default:
        return (
          <div className="space-y-8 pb-24 animate-in slide-in-from-bottom-4 duration-500">
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Générateur</h2>
              <p className="text-slate-500 font-medium">Configurez et émettez une nouvelle licence.</p>
            </div>

            {lastResult && (
              <div className="bg-emerald-50 border border-emerald-100 p-8 rounded-[2rem] shadow-xl shadow-emerald-50 relative animate-in zoom-in duration-300">
                <button onClick={() => setLastResult(null)} className="absolute top-4 right-4 text-emerald-400 hover:text-emerald-600 transition-transform hover:scale-125"><i className="fa-solid fa-xmark"></i></button>
                <div className="flex items-center mb-6">
                  <div className="bg-emerald-500 text-white w-10 h-10 rounded-2xl flex items-center justify-center mr-4 shadow-lg shadow-emerald-200">
                    <i className="fa-solid fa-bolt"></i>
                  </div>
                  <h3 className="font-black text-emerald-900 text-lg uppercase tracking-tight">Clé Prête</h3>
                </div>
                <div className="space-y-4">
                   <div onClick={() => copyToClipboard(lastResult.licenseKey)} className="group bg-white p-4 rounded-2xl border border-emerald-200 flex items-center justify-between cursor-pointer transition-all hover:ring-4 hover:ring-emerald-100">
                      <code className="text-indigo-600 font-mono font-black text-lg truncate pr-2">{lastResult.licenseKey}</code>
                      <i className="fa-solid fa-copy text-slate-300 group-hover:text-emerald-500 transition-colors"></i>
                   </div>
                   <div className="flex justify-between items-center text-xs font-bold px-1 text-emerald-700">
                      <span className="opacity-60">FIN DE VALIDITÉ :</span>
                      <span>{lastResult.expirationDate}</span>
                   </div>
                </div>
              </div>
            )}

            <LicenseForm onSuccess={handleSuccess} onError={(msg) => showToast(msg, 'error')} />
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Notifications Toast */}
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[200] px-6 py-4 rounded-2xl shadow-2xl flex items-center space-x-3 transition-all duration-300 animate-in slide-in-from-top-4 ${
          toast.type === 'success' ? 'bg-emerald-900 text-white' : 
          toast.type === 'error' ? 'bg-red-900 text-white' : 'bg-slate-900 text-white'
        }`}>
          <i className={`fa-solid ${toast.type === 'success' ? 'fa-circle-check' : toast.type === 'error' ? 'fa-triangle-exclamation' : 'fa-circle-info'}`}></i>
          <span className="font-black text-xs uppercase tracking-wider">{toast.msg}</span>
        </div>
      )}

      {/* Deletion Modal */}
      {itemIndexToDelete !== null && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[150] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-10 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="text-red-500 bg-red-50 w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-3xl shadow-inner">
              <i className="fa-solid fa-trash-can"></i>
            </div>
            <h3 className="text-2xl font-black text-slate-900 text-center mb-3 tracking-tight">Supprimer ?</h3>
            <p className="text-slate-500 font-medium text-center mb-10 leading-relaxed px-4">Cette action effacera définitivement cette licence de l'historique local.</p>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setItemIndexToDelete(null)} className="py-4 rounded-2xl bg-slate-50 text-slate-600 font-black hover:bg-slate-100 transition-all">ANNULER</button>
              <button onClick={executeDelete} className="py-4 rounded-2xl bg-red-600 text-white font-black shadow-lg shadow-red-100 hover:bg-red-700 transition-all active:scale-95">SUPPRIMER</button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[150] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-10 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="text-amber-500 bg-amber-50 w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-3xl shadow-inner">
              <i className="fa-solid fa-power-off"></i>
            </div>
            <h3 className="text-2xl font-black text-slate-900 text-center mb-3 tracking-tight">Déconnexion ?</h3>
            <p className="text-slate-500 font-medium text-center mb-10 leading-relaxed px-4">Êtes-vous sûr de vouloir quitter votre session administrateur ?</p>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setIsLogoutModalOpen(false)} className="py-4 rounded-2xl bg-slate-50 text-slate-600 font-black hover:bg-slate-100 transition-all">RESTER</button>
              <button onClick={executeLogout} className="py-4 rounded-2xl bg-red-600 text-white font-black shadow-lg shadow-red-100 hover:bg-red-700 transition-all active:scale-95">QUITTER</button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-white border-b border-slate-100 sticky top-0 z-[100] px-8 py-5 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="bg-indigo-600 w-12 h-12 rounded-2xl text-white flex items-center justify-center shadow-lg shadow-indigo-100 transition-transform hover:rotate-6">
            <i className="fa-solid fa-shield-halved text-xl"></i>
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">VDP CORE</h1>
            <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mt-1 block">License Manager</span>
          </div>
        </div>
        <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest hidden sm:block">By VDPHACKER</div>
      </header>

      <main className="max-w-xl mx-auto px-8 pt-10">
        {renderContent()}
      </main>

      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-4rem)] max-w-sm bg-white/90 backdrop-blur-xl border border-slate-100 rounded-[2.5rem] p-3 flex justify-between items-center z-[100] shadow-2xl">
        {[
          { id: 'HOME', icon: 'fa-bolt', label: 'Générer' },
          { id: 'HISTORY', icon: 'fa-list-ul', label: 'Liste' },
          { id: 'ADMIN', icon: 'fa-user-gear', label: 'Profil' }
        ].map((tab) => (
          <button 
            key={tab.id} onClick={() => setActiveTab(tab.id as TabType)}
            className={`flex-1 flex flex-col items-center py-3 rounded-[2rem] transition-all duration-300 ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 scale-105' : 'text-slate-400 hover:text-indigo-400'}`}
          >
            <i className={`fa-solid ${tab.icon} ${activeTab === tab.id ? 'text-lg' : 'text-md'}`}></i>
            <span className={`text-[8px] font-black uppercase tracking-tighter mt-1 ${activeTab === tab.id ? 'block' : 'hidden'}`}>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default App;
