import { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('match'); // match, player, history
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(localStorage.getItem('scoreli-admin-theme') || 'light');
  
  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('scoreli-admin-theme', theme);
  }, [theme]);

  // Handle Auth State
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'matches'), orderBy('createdAt', 'desc'), limit(10));
    const unsubscribe = onSnapshot(q, (snap) => {
      setMatches(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoginLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError('Invalid email or password');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => signOut(auth);
  
  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  if (authLoading) return <div className="loading-spinner" style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>BOOTING...</div>;

  if (!user) {
    return (
      <div className="app-shell login-page" style={{ padding: '0 24px', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div className="logo-box" style={{ width: '80px', height: '80px', margin: '0 auto 20px', fontSize: '40px' }}>🏏</div>
          <h1 className="brand-name" style={{ fontSize: '32px' }}>SCORELI</h1>
          <p className="brand-tag">ADMIN PRO ACCESS</p>
        </div>

        <div className="action-card" style={{ padding: '32px', cursor: 'default' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 800, textAlign: 'center', marginBottom: '24px' }}>Welcome Admin</h2>
          {error && <div style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', padding: '12px', borderRadius: '12px', fontSize: '12px', marginBottom: '16px', textAlign: 'center', fontWeight: 700 }}>{error}</div>}
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>EMAIL</label>
              <input 
                className="action-card" 
                style={{ width: '100%', padding: '16px', background: 'var(--bg-card-hover)', border: 'none', color: 'var(--text-primary)', outline: 'none' }}
                type="email" placeholder="admin@scoreli.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>PASSWORD</label>
              <input 
                className="action-card" 
                style={{ width: '100%', padding: '16px', background: 'var(--bg-card-hover)', border: 'none', color: 'var(--text-primary)', outline: 'none' }}
                type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <button className="hero-card" disabled={loginLoading} style={{ width: '100%', border: 'none', justifyContent: 'center' }}>
              <span className="hero-title">{loginLoading ? 'SECURING...' : 'SECURE SIGN IN'}</span>
            </button>
          </form>
        </div>
        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>AUTHORIZED USERS ONLY</p>
      </div>
    )
  }
  
  return (
    <div className="app-shell">
      {/* App Bar */}
      <header className="app-bar">
        <div className="brand" onClick={() => setActiveTab('match')}>
          <div className="logo-box">
            <span className="logo-emoji">🏏</span>
          </div>
          <div className="brand-text">
            <h1 className="brand-name">SCORELI</h1>
            <p className="brand-tag">ADMIN PRO</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button className="theme-toggle-btn" onClick={toggleTheme}>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <div className="user-profile" onClick={() => { if(confirm('Logout?')) handleLogout() }} style={{ cursor: 'pointer' }}>
            <span className="user-avatar">👤</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="content-area">
        {activeTab === 'match' && <MatchSection matches={matches} loading={loading} />}
        {activeTab === 'player' && <PlayerSection />}
        {activeTab === 'history' && <HistorySection matches={matches} />}
      </main>

      {/* Navigation */}
      <nav className="bottom-nav-container">
        <div className="bottom-nav">
          <NavButton active={activeTab === 'match'} onClick={() => setActiveTab('match')} icon="🏠" label="Home" />
          <NavButton active={activeTab === 'player'} onClick={() => setActiveTab('player')} icon="👥" label="Players" />
          <NavButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon="📋" label="Matches" />
          <NavButton active={false} onClick={() => alert('Admin settings coming soon')} icon="⚙️" label="Admin" />
        </div>
      </nav>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }) {
  return (
    <button className={`nav-btn ${active ? 'active' : ''}`} onClick={onClick}>
      <span className="nav-icon">{icon}</span>
      <span className="nav-label">{label}</span>
      {active && <div className="nav-indicator" />}
    </button>
  );
}

function MatchSection({ matches, loading }) {
  const liveMatches = matches.filter(m => m.status === 'live');
  
  return (
    <div className="fade-in">
      <div className="section-header">
        <h2 className="title-lg">Dashboard</h2>
        <p className="subtitle">Manage live scoring activities</p>
      </div>
      
      <div className="hero-card" onClick={() => window.location.assign('http://localhost:5173/admin/matches/new')}>
        <div className="hero-content">
           <div className="hero-badge">QUICK ACTION</div>
           <h3 className="hero-title">Start New Match</h3>
           <p className="hero-desc">Initialize a new local game</p>
        </div>
        <div className="hero-action">
          <div className="plus-btn">+</div>
        </div>
      </div>

      <div className="action-grid">
         <div className="action-card blue" onClick={() => window.location.assign('http://localhost:5173/admin/matches')}>
            <span className="card-icon">🏆</span>
            <span className="card-text">Match List</span>
         </div>
         <div className="action-card purple" onClick={() => window.location.assign('http://localhost:5173/admin')}>
            <span className="card-icon">⚙️</span>
            <span className="card-text">Main Admin</span>
         </div>
      </div>

      <div className="match-list-header">
         <h4 className="section-label">LIVE MATCHES</h4>
         {liveMatches.length > 0 && <span className="live-count">{liveMatches.length} LIVE</span>}
      </div>

      {loading ? (
        <div className="loading-spinner">Scoping...</div>
      ) : liveMatches.length === 0 ? (
        <div className="empty-state-lite">
          <span className="empty-icon">🏏</span>
          <p>No matches currently live</p>
        </div>
      ) : (
        <div className="vertical-list">
          {liveMatches.map(m => (
            <div key={m.id} className="match-item" onClick={() => window.location.assign(`http://localhost:5173/admin/scoring/${m.id}`)}>
               <div className="match-teams">
                  <span>{m.teamA?.name}</span>
                  <span className="vs">vs</span>
                  <span>{m.teamB?.name}</span>
               </div>
               <div className="score-summary">
                  {m.teamA?.score}/{m.teamA?.wickets} vs {m.teamB?.score}/{m.teamB?.wickets}
               </div>
               <div className="go-btn">⚡</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PlayerSection() {
  return (
    <div className="fade-in">
      <div className="section-header">
        <h2 className="title-lg">Squads</h2>
        <p className="subtitle">Team and Player Management</p>
      </div>
      
      <div className="menu-item green" onClick={() => window.location.assign('http://localhost:5173/admin/teams')}>
         <div className="menu-icon">⛹️</div>
         <div className="menu-text">
            <h4 className="menu-title">Team Management</h4>
            <p className="menu-desc">Create and edit franchise teams</p>
         </div>
         <div className="arrow">→</div>
      </div>

      <div className="menu-item blue" onClick={() => window.location.assign('http://localhost:5173/admin/players')}>
         <div className="menu-icon">👤</div>
         <div className="menu-text">
            <h4 className="menu-title">Player Database</h4>
            <p className="menu-desc">Individual stats and player registration</p>
         </div>
         <div className="arrow">→</div>
      </div>

      <div className="promo-banner">
         <span className="promo-emoji">⭐</span>
         <div>
            <div className="promo-title">Pro Scouting Tip</div>
            <div className="promo-text">Use the web portal for batch uploads.</div>
         </div>
      </div>
    </div>
  );
}

function HistorySection({ matches }) {
  return (
    <div className="fade-in">
      <div className="section-header">
        <h2 className="title-lg">Match Feed</h2>
        <p className="subtitle">Recent match history</p>
      </div>
      <div className="vertical-list">
        {matches.map(m => (
          <div key={m.id} className="match-item history">
             <div className="item-meta">
                <span className={`status-tag ${m.status}`}>{m.status}</span>
                <span className="date">{new Date(m.createdAt?.seconds * 1000).toLocaleDateString()}</span>
             </div>
             <div className="item-main">
                {m.teamA?.name} vs {m.teamB?.name}
             </div>
             <div className="item-result">{m.result || 'No result yet'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
