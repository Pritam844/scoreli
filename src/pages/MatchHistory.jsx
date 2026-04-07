import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import MatchCard from '../components/MatchCard';
import Loader from '../components/Loader';

export default function MatchHistory() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchMatches();
  }, []);

  async function fetchMatches() {
    try {
      const [matchSnap, tournamentSnap] = await Promise.all([
        getDocs(collection(db, 'matches')),
        getDocs(collection(db, 'tournaments'))
      ]);
      
      const tournamentNames = {};
      tournamentSnap.docs.forEach(d => { tournamentNames[d.id] = d.data().name; });

      const all = matchSnap.docs.map(d => {
        const data = d.data();
        if (data.tournamentId) {
          data.tournamentName = tournamentNames[data.tournamentId] || null;
        }
        return { id: d.id, ...data };
      });

      // Priority sort: live (0), finished (1), upcoming (2)
      const statusPriority = { live: 0, finished: 1, upcoming: 2 };
      const sorted = all.filter(m => m.published).sort((a, b) => {
        const pA = statusPriority[a.status] ?? 3;
        const pB = statusPriority[b.status] ?? 3;
        if (pA !== pB) return pA - pB;
        return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
      });

      setMatches(sorted);
    } catch (err) {
      console.error('Error fetching matches:', err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = matches.filter(m => {
    if (filter !== 'all' && m.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      const aName = (m.teamA?.name || '').toLowerCase();
      const bName = (m.teamB?.name || '').toLowerCase();
      if (!aName.includes(q) && !bName.includes(q)) return false;
    }
    return true;
  });

  if (loading) return <Loader />;

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-header-title">Matches</h1>
      </div>

      <input
        type="text"
        className="form-input mb-md"
        placeholder="🔍 Search by team name..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        id="search-matches"
      />

      <div className="flex gap-sm mb-md" style={{ overflowX: 'auto', scrollbarWidth: 'none' }}>
        {['all', 'live', 'finished', 'upcoming'].map(f => (
          <button
            key={f}
            className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <div className="empty-state-title">No matches found</div>
          <div className="empty-state-text">
            {search ? 'Try a different search term' : 'No matches have been published yet'}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-md">
          {filtered.map(m => <MatchCard key={m.id} match={m} />)}
        </div>
      )}
    </div>
  );
}
