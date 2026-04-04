import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import Modal from '../../components/Modal';
import Loader from '../../components/Loader';

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 3);
}

export default function TeamManagement() {
  const { user } = useAuth();
  const toast = useToast();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTeam, setEditTeam] = useState(null);
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => { fetchTeams(); }, []);

  async function fetchTeams() {
    try {
      const snap = await getDocs(collection(db, 'teams'));
      setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditTeam(null);
    setName('');
    setLogoUrl('');
    setShowModal(true);
  }

  function openEdit(team) {
    setEditTeam(team);
    setName(team.name);
    setLogoUrl(team.logo_url || '');
    setShowModal(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const data = {
        name: name.trim(),
        logo_url: logoUrl.trim() || null
      };

      if (editTeam) {
        await updateDoc(doc(db, 'teams', editTeam.id), data);
        toast.success('Team updated');
      } else {
        await addDoc(collection(db, 'teams'), {
          ...data,
          admin_id: user.uid,
          createdAt: serverTimestamp()
        });
        toast.success('Team created');
      }
      setShowModal(false);
      fetchTeams();
    } catch (err) {
      toast.error('Failed to save team');
      console.error(err);
    }
  }

  async function handleDelete(team) {
    if (!confirm(`Delete "${team.name}"?`)) return;
    try {
      await deleteDoc(doc(db, 'teams', team.id));
      toast.success('Team deleted');
      fetchTeams();
    } catch (err) {
      toast.error('Failed to delete');
    }
  }

  if (loading) return <Loader />;

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-header-title">Teams</h1>
        <button className="btn btn-primary btn-sm" onClick={openCreate} id="create-team-btn">+ Add</button>
      </div>

      {teams.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👥</div>
          <div className="empty-state-title">No teams yet</div>
          <div className="empty-state-text">Create your first team to get started</div>
          <button className="btn btn-primary mt-md" onClick={openCreate}>Create Team</button>
        </div>
      ) : (
        <div className="flex flex-col gap-sm">
          {teams.map(t => (
            <div key={t.id} className="card">
              <div className="card-body" style={{ padding: 'var(--space-sm) var(--space-md)' }}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-sm">
                    {t.logo_url ? (
                      <img src={t.logo_url} alt={t.name} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-subtle)' }} />
                    ) : (
                      <div className="team-avatar" style={{ width: 40, height: 40, fontSize: 'var(--text-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {getInitials(t.name)}
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{t.name}</div>
                    </div>
                  </div>
                  <div className="flex gap-xs">
                    <button className="btn btn-outline btn-sm" onClick={() => openEdit(t)}>Edit</button>
                    <button className="btn btn-sm" style={{ color: 'var(--accent-red)' }} onClick={() => handleDelete(t)}>✕</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title={editTeam ? 'Edit Team' : 'Create Team'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSave}>
            
            <div className="form-group" style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
              <div style={{ marginBottom: 'var(--space-sm)' }}>
                 {logoUrl ? (
                    <img src={logoUrl} alt="Preview" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-blue)' }} onError={(e) => { e.target.style.display = 'none'; }} />
                 ) : (
                    <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--bg-surface)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: 'var(--text-muted)' }}>
                      🛡️
                    </div>
                 )}
              </div>
              <input
                type="url"
                className="form-input"
                placeholder="Paste Logo URL (optional)"
                value={logoUrl}
                onChange={e => setLogoUrl(e.target.value)}
                style={{ textAlign: 'center', fontSize: 'var(--text-xs)' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Team Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Mumbai Indians"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                autoFocus
                id="team-name-input"
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block" id="save-team-btn">
              {editTeam ? 'Update' : 'Create'} Team
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
