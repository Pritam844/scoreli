import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import MatchCard from '../components/MatchCard';
import Loader from '../components/Loader';

export default function Home() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMatches();
  }, []);

  async function fetchMatches() {
    try {
      // Fetch current teams for names/logos fallback
      const teamSnap = await getDocs(collection(db, 'teams'));
      const teamDetails = {};
      teamSnap.docs.forEach(d => { 
        teamDetails[d.id] = d.data(); 
      });

      // Fetch all tournaments for mapping names
      const tournamentSnap = await getDocs(collection(db, 'tournaments'));
      const tournamentNames = {};
      tournamentSnap.docs.forEach(d => { tournamentNames[d.id] = d.data().name; });

      // Fetch matches
      const q = query(
        collection(db, 'matches'),
        orderBy('createdAt', 'desc'),
        limit(20)
      );
      const snap = await getDocs(q);
      const all = snap.docs.map(d => {
        const data = d.data();
        if (data.tournamentId) data.tournamentName = tournamentNames[data.tournamentId] || null;

        if (data.teamA && teamDetails[data.teamA.id]) {
          const oldName = data.teamA.name;
          const newName = teamDetails[data.teamA.id].name;
          if (oldName !== newName && data.result) data.result = data.result.replaceAll(oldName, newName);
          data.teamA.name = newName;
          data.teamA.logo_url = teamDetails[data.teamA.id].logo_url || null;
        }
        if (data.teamB && teamDetails[data.teamB.id]) {
          const oldName = data.teamB.name;
          const newName = teamDetails[data.teamB.id].name;
          if (oldName !== newName && data.result) data.result = data.result.replaceAll(oldName, newName);
          data.teamB.name = newName;
          data.teamB.logo_url = teamDetails[data.teamB.id].logo_url || null;
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
      try {
        const fallbackSnap = await getDocs(collection(db, 'matches'));
        const tournamentSnap = await getDocs(collection(db, 'tournaments'));
        const tn = {}; tournamentSnap.docs.forEach(d => { tn[d.id] = d.data().name; });
        
        const statusPriority = { live: 0, finished: 1, upcoming: 2 };
        const all = fallbackSnap.docs.map(d => {
          const data = d.data();
          if (data.tournamentId) data.tournamentName = tn[data.tournamentId] || null;
          return { id: d.id, ...data };
        }).filter(m => m.published).sort((a, b) => {
          const pA = statusPriority[a.status] ?? 3;
          const pB = statusPriority[b.status] ?? 3;
          if (pA !== pB) return pA - pB;
          return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
        });
        setMatches(all);
      } catch (e2) {
        console.error('Fallback also failed:', e2);
      }
    } finally {
      setLoading(false);
    }
  }

  const liveMatches = matches.filter(m => m.status === 'live');
  const recentMatches = matches;

  if (loading) return <Loader />;

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-lg)', paddingTop: 'var(--space-sm)' }}>
        <h1 className="heading-lg" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '2rem' }}>🏏</span>
          <span style={{ background: 'linear-gradient(135deg, #10b981, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Scoreli
          </span>
        </h1>
        <p className="text-body" style={{ marginTop: 4 }}>Live cricket scores & scorecards</p>
      </div>

      {/* Live Matches */}
      {liveMatches.length > 0 && (
        <section style={{ marginBottom: 'var(--space-xl)' }}>
          <div className="flex items-center gap-sm mb-md">
            <span className="status-dot status-dot-live"></span>
            <h2 className="heading-sm">Live Now</h2>
          </div>
          <div className="flex flex-col gap-md">
            {liveMatches.map(m => <MatchCard key={m.id} match={m} />)}
          </div>
        </section>
      )}

      {/* Recent Matches */}
      <section>
        <h2 className="heading-sm mb-md">
          {liveMatches.length > 0 ? 'Recent Matches' : 'Matches'}
        </h2>
        {recentMatches.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🏏</div>
            <div className="empty-state-title">No matches yet</div>
            <div className="empty-state-text">Matches will appear here once published by admins</div>
          </div>
        ) : (
          <div className="flex flex-col gap-md">
            {recentMatches.map(m => <MatchCard key={m.id} match={m} />)}
          </div>
        )}
      </section>
    </div>
  );
}
