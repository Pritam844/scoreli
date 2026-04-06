import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import Loader from '../components/Loader';
import StatusBadge from '../components/StatusBadge';

export default function TournamentList() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTournaments();
  }, []);

  async function fetchTournaments() {
    try {
      const q = query(collection(db, 'tournaments'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTournaments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <Loader />;

  return (
    <div className="page-content">
      <div className="page-header" style={{ marginBottom: 'var(--space-lg)' }}>
        <h1 className="heading-md">🏆 Tournaments</h1>
        <p className="text-tiny" style={{ opacity: 0.7 }}>Browse upcoming and live local events</p>
      </div>

      <div className="tournaments-grid flex flex-col gap-md">
        {tournaments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🏆</div>
            <div className="empty-state-title">No tournaments live</div>
          </div>
        ) : (
          tournaments.map((t) => (
            <div 
              key={t.id} 
              className="card tournament-card" 
              onClick={() => navigate(`/tournaments/${t.id}`)}
              style={{ cursor: 'pointer' }}
            >
              <div className="card-body">
                <div className="flex justify-between items-start mb-sm">
                  <h2 className="heading-sm">{t.name}</h2>
                  <StatusBadge status={t.status} />
                </div>
                <div className="flex gap-md items-center">
                  <div className="text-tiny" style={{ opacity: 0.8 }}>📅 {t.season}</div>
                  <div className="text-tiny" style={{ opacity: 0.8 }}>🏏 {t.type}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
