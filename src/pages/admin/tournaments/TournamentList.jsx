import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../../firebase';
import { collection, query, orderBy, getDocs, addDoc, serverTimestamp, where } from 'firebase/firestore';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import Loader from '../../../components/Loader';
import StatusBadge from '../../../components/StatusBadge';

export default function TournamentList() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTournament, setNewTournament] = useState({
    name: '',
    season: new Date().getFullYear().toString(),
    type: 'league',
    status: 'upcoming'
  });

  const navigate = useNavigate();
  const { user, userRole, isMainAdmin } = useAuth();
  const toast = useToast();

  useEffect(() => {
    if (user) fetchTournaments();
  }, [user]);

  async function fetchTournaments() {
    if (!user) return;
    try {
      let q;
      if (isMainAdmin) {
        q = query(collection(db, 'tournaments'), orderBy('createdAt', 'desc'));
      } else {
        // This query requires a composite index: tournaments (adminId ASC, createdAt DESC)
        q = query(
          collection(db, 'tournaments'),
          where('adminId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
      }
      
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTournaments(data);
    } catch (err) {
      console.error('Error fetching tournaments:', err);
      if (err.message?.includes('index')) {
        toast.error('Firestore Index required. Check browser console for the link.');
      } else {
        toast.error('Failed to fetch tournaments');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTournament(e) {
    e.preventDefault();
    if (!newTournament.name) return toast.error('Enter tournament name');

    try {
      const docRef = await addDoc(collection(db, 'tournaments'), {
        ...newTournament,
        adminId: user?.uid,
        createdAt: serverTimestamp()
      });
      toast.success('Tournament created successfully');
      setShowCreateModal(false);
      navigate(`/admin/tournaments/${docRef.id}`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to create tournament');
    }
  }

  if (loading) return <Loader />;

  return (
    <div className="page-content">
      <div className="page-header" style={{ marginBottom: 'var(--space-lg)' }}>
        <div>
          <h1 className="heading-md">Tournaments</h1>
          <p className="text-tiny" style={{ opacity: 0.7 }}>Organize and manage cricket events</p>
        </div>
      </div>

      <div className="tournaments-grid flex flex-col gap-md">
        {tournaments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🏆</div>
            <div className="empty-state-title">No tournaments yet</div>
            <div className="empty-state-text">Start by creating your first tournament</div>
          </div>
        ) : (
          tournaments.map((t) => (
            <div 
              key={t.id} 
              className="card tournament-card" 
              onClick={() => navigate(`/admin/tournaments/${t.id}`)}
              style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
            >
              <div className="card-body">
                <div className="flex justify-between items-start mb-sm">
                  <h2 className="heading-sm">{t.name}</h2>
                  <StatusBadge status={t.status} />
                </div>
                <div className="flex gap-md items-center">
                  <div className="text-tiny" style={{ opacity: 0.8 }}>
                    📅 {t.season}
                  </div>
                  <div className="text-tiny" style={{ opacity: 0.8 }}>
                    🏏 {t.type.charAt(0).toUpperCase() + t.type.slice(1)}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Floating Action Button */}
      <button 
        className="fab" 
        onClick={() => setShowCreateModal(true)}
        style={{
          position: 'fixed',
          bottom: '100px',
          right: '25px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'var(--accent-green)',
          color: 'white',
          border: 'none',
          boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          zIndex: 100
        }}
      >
        +
      </button>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content card" style={{ maxWidth: '400px', width: '90%' }}>
            <div className="card-body">
              <h2 className="heading-sm mb-lg">Create Tournament</h2>
              <form onSubmit={handleCreateTournament} className="flex flex-col gap-md">
                <div className="form-group">
                  <label className="label">Tournament Name</label>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="e.g. Winter Cup 2026"
                    value={newTournament.name}
                    onChange={e => setNewTournament({...newTournament, name: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="label">Season</label>
                  <input 
                    type="text" 
                    className="input" 
                    value={newTournament.season}
                    onChange={e => setNewTournament({...newTournament, season: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="label">Type</label>
                  <select 
                    className="input"
                    value={newTournament.type}
                    onChange={e => setNewTournament({...newTournament, type: e.target.value})}
                  >
                    <option value="league">League (Round Robin)</option>
                    <option value="knockout">Knockout</option>
                  </select>
                </div>
                <div className="flex gap-md mt-md">
                  <button type="button" className="btn btn-outline btn-block" onClick={() => setShowCreateModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary btn-block">Create ✅</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
