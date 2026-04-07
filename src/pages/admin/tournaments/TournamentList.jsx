import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, serverTimestamp, orderBy, query } from 'firebase/firestore';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import Modal from '../../../components/Modal';
import Loader from '../../../components/Loader';
import StatusBadge from '../../../components/StatusBadge';

export default function TournamentList() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editT, setEditT] = useState(null);
  
  const [name, setName] = useState('');
  const [season, setSeason] = useState(new Date().getFullYear().toString());
  const [type, setType] = useState('T20');
  const [status, setStatus] = useState('upcoming');

  useEffect(() => { 
    if (user) fetchTournaments(); 
  }, [user]);

  async function fetchTournaments() {
    try {
      const q = query(collection(db, 'tournaments'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setTournaments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
      toast.error('Failed to load tournaments');
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditT(null);
    setName('');
    setSeason(new Date().getFullYear().toString());
    setType('T20');
    setStatus('upcoming');
    setShowModal(true);
  }

  function openEdit(t, e) {
    e.stopPropagation();
    setEditT(t);
    setName(t.name);
    setSeason(t.season);
    setType(t.type || 'T20');
    setStatus(t.status || 'upcoming');
    setShowModal(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!name.trim()) return;
    
    setLoading(true);
    try {
      const data = {
        name: name.trim(),
        season: season.trim(),
        type: type,
        status: status,
        updatedAt: serverTimestamp()
      };

      if (editT) {
        await updateDoc(doc(db, 'tournaments', editT.id), data);
        toast.success('Tournament updated');
      } else {
        await addDoc(collection(db, 'tournaments'), {
          ...data,
          adminId: user.uid,
          createdAt: serverTimestamp()
        });
        toast.success('Tournament created');
      }
      setShowModal(false);
      fetchTournaments();
    } catch (err) {
      toast.error('Failed to save tournament');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(t, e) {
    e.stopPropagation();
    if (!confirm(`Delete "${t.name}"? All associated matches and teams will be inaccessible from this dashboard.`)) return;
    try {
      await deleteDoc(doc(db, 'tournaments', t.id));
      toast.success('Tournament deleted');
      fetchTournaments();
    } catch (err) {
      toast.error('Failed to delete');
    }
  }

  if (loading && tournaments.length === 0) return <Loader />;

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="flex items-center gap-sm">
          <button className="page-back-btn" onClick={() => navigate('/admin')}>←</button>
          <h1 className="page-header-title">Tournaments</h1>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openCreate}>+ Create</button>
      </div>

      <div className="flex flex-col gap-sm">
        {tournaments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🏆</div>
            <div className="empty-state-title">No tournaments yet</div>
            <p className="text-tiny opacity-60">Create a tournament to organize matches and teams</p>
          </div>
        ) : (
          tournaments.map(t => (
            <div 
              key={t.id} 
              className="card clickable-card" 
              onClick={() => navigate(`/admin/tournaments/${t.id}`)}
              style={{ cursor: 'pointer' }}
            >
              <div className="card-body">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="heading-xs mb-xs">{t.name}</h3>
                    <div className="flex gap-sm items-center">
                      <span className="text-tiny opacity-60">📅 {t.season}</span>
                      <span className="text-tiny opacity-60">🏏 {t.type}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-sm">
                    <StatusBadge status={t.status} />
                    <div className="flex gap-xs">
                      <button className="btn btn-outline btn-xs" onClick={(e) => openEdit(t, e)}>Edit</button>
                      <button className="text-error btn-xs" onClick={(e) => handleDelete(t, e)}>✕</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <Modal title={editT ? 'Edit Tournament' : 'Create Tournament'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSave} className="flex flex-col gap-md">
            <div className="form-group">
              <label className="form-label">Tournament Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Premier League 2024"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="grid grid-2 gap-sm">
              <div className="form-group">
                <label className="form-label">Season / Year</label>
                <input
                  type="text"
                  className="form-input"
                  value={season}
                  onChange={e => setSeason(e.target.value)}
                  placeholder="2024"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Match Type</label>
                <select className="form-input" value={type} onChange={e => setType(e.target.value)}>
                  <option value="T20">T20</option>
                  <option value="ODI">ODI</option>
                  <option value="Test">Test</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-input" value={status} onChange={e => setStatus(e.target.value)}>
                <option value="upcoming">Upcoming</option>
                <option value="live">Live</option>
                <option value="finished">Finished</option>
              </select>
            </div>

            <button type="submit" className="btn btn-primary btn-block mt-sm" disabled={loading}>
              {editT ? 'Update' : 'Create'} Tournament
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
