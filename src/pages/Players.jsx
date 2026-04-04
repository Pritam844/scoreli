import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import Loader from '../components/Loader';
import PlayerInfoModal from '../components/PlayerInfoModal';

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

const roleColors = {
  Batsman: 'var(--accent-blue)',
  Bowler: 'var(--accent-red)',
  'All-rounder': 'var(--accent-purple)',
  'Wicket-keeper': 'var(--accent-yellow)'
};

export default function Players() {
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewPlayer, setViewPlayer] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      // Fetch teams
      const teamSnap = await getDocs(collection(db, 'teams'));
      const teamMap = {};
      teamSnap.docs.forEach(d => { teamMap[d.id] = d.data().name; });
      setTeams(teamMap);

      // Fetch players
      const playerSnap = await getDocs(collection(db, 'players'));
      setPlayers(playerSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Error fetching players:', err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = search
    ? players.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()))
    : players;

  if (loading) return <Loader />;

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-header-title">Players</h1>
      </div>

      <input
        type="text"
        className="form-input mb-md"
        placeholder="🔍 Search players..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        id="search-players"
      />

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👤</div>
          <div className="empty-state-title">No players found</div>
          <div className="empty-state-text">Players will appear here once added by admins</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-sm)' }}>
          {filtered.map(p => (
            <div key={p.id} className="card" onClick={() => setViewPlayer(p)} style={{ transition: 'all 0.2s ease', cursor: 'pointer' }}>
              <div className="card-body" style={{ textAlign: 'center', padding: 'var(--space-md) var(--space-sm)' }}>
                {p.photo_url ? (
                  <img
                    src={p.photo_url}
                    alt={p.name}
                    style={{
                      width: 56, height: 56, borderRadius: '50%', objectFit: 'cover',
                      margin: '0 auto var(--space-sm)', border: '2px solid var(--border-subtle)'
                    }}
                  />
                ) : (
                  <div style={{
                    width: 56, height: 56, borderRadius: '50%', margin: '0 auto var(--space-sm)',
                    background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--accent-green)',
                    fontFamily: 'var(--font-heading)', border: '2px solid var(--border-subtle)'
                  }}>
                    {getInitials(p.name)}
                  </div>
                )}
                <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', marginBottom: 4 }}>{p.name}</div>
                {p.role && (
                  <span className="badge badge-role" style={{ color: roleColors[p.role] || 'var(--text-secondary)' }}>
                    {p.role}
                  </span>
                )}
                {p.team_id && teams[p.team_id] && (
                  <div className="text-tiny" style={{ marginTop: 4 }}>{teams[p.team_id]}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {viewPlayer && <PlayerInfoModal player={viewPlayer} onClose={() => setViewPlayer(null)} />}
    </div>
  );
}
