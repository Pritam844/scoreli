import { useState, useEffect, useRef } from 'react';
import { db, storage } from '../../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useToast } from '../../contexts/ToastContext';
import Modal from '../../components/Modal';
import Loader from '../../components/Loader';
import PlayerInfoModal from '../../components/PlayerInfoModal';

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function PlayerManagement() {
  const toast = useToast();
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editPlayer, setEditPlayer] = useState(null);
  const [viewPlayer, setViewPlayer] = useState(null);
  const [form, setForm] = useState({ 
    name: '', role: 'Batsman', team_id: '',
    age: '', height: '', batting_style: 'Right-hand bat', bowling_style: 'Right-arm Medium', career_runs: '', career_wickets: '', bio: ''
  });
  const [photoUrlInput, setPhotoUrlInput] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      const [playerSnap, teamSnap] = await Promise.all([
        getDocs(collection(db, 'players')),
        getDocs(collection(db, 'teams'))
      ]);
      setPlayers(playerSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTeams(teamSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditPlayer(null);
    setForm({ 
      name: '', role: 'Batsman', team_id: 'all',
      age: '', height: '', batting_style: 'Right-hand bat', bowling_style: 'Right-arm Medium', career_runs: '', career_wickets: '', bio: ''
    });
    setPhotoUrlInput('');
    setShowModal(true);
  }

  function openEdit(p) {
    setEditPlayer(p);
    setForm({ 
      name: p.name, role: p.role || 'Batsman', team_id: p.team_id || '',
      age: p.age || '', height: p.height || '', 
      batting_style: p.batting_style || 'Right-hand bat', 
      bowling_style: p.bowling_style || 'Right-arm Medium', 
      career_runs: p.career_runs || '', career_wickets: p.career_wickets || '', bio: p.bio || ''
    });
    setPhotoUrlInput(p.photo_url || '');
    setShowModal(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      setUploading(true);
      let photo_url = photoUrlInput.trim() || null;

      const data = {
        name: form.name.trim(),
        role: form.role,
        team_id: form.team_id || null,
        photo_url,
        age: form.age ? parseInt(form.age) : null,
        height: form.height.trim(),
        batting_style: form.batting_style,
        bowling_style: form.bowling_style,
        career_runs: form.career_runs === '' ? 0 : parseInt(form.career_runs),
        career_wickets: form.career_wickets === '' ? 0 : parseInt(form.career_wickets),
        bio: form.bio.trim()
      };

      if (editPlayer) {
        await updateDoc(doc(db, 'players', editPlayer.id), data);
        toast.success('Player updated');
      } else {
        await addDoc(collection(db, 'players'), { ...data, createdAt: serverTimestamp() });
        toast.success('Player added');
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save player');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(p) {
    if (!confirm(`Delete "${p.name}"?`)) return;
    try {
      await deleteDoc(doc(db, 'players', p.id));
      toast.success('Player deleted');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete');
    }
  }

  const teamMap = {};
  teams.forEach(t => { teamMap[t.id] = t.name; });

  if (loading) return <Loader />;

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-header-title">Players</h1>
        <button className="btn btn-primary btn-sm" onClick={openCreate} id="add-player-btn">+ Add</button>
      </div>

      {players.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👤</div>
          <div className="empty-state-title">No players yet</div>
          <div className="empty-state-text">Add players to your teams</div>
          <button className="btn btn-primary mt-md" onClick={openCreate}>Add Player</button>
        </div>
      ) : (
        <div className="flex flex-col gap-sm">
          {players.map(p => (
            <div key={p.id} className="card">
              <div className="card-body" style={{ padding: 'var(--space-sm) var(--space-md)' }}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-sm" onClick={() => setViewPlayer(p)} style={{ cursor: 'pointer', flex: 1 }}>
                    {p.photo_url ? (
                      <img src={p.photo_url} alt={p.name} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-subtle)' }} />
                    ) : (
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%', background: 'var(--bg-surface)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--accent-green)',
                        fontFamily: 'var(--font-heading)'
                      }}>
                        {getInitials(p.name)}
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{p.name}</div>
                      <div className="flex gap-xs items-center">
                        <span className="badge badge-role" style={{ fontSize: '10px', padding: '1px 6px' }}>{p.role}</span>
                        {p.team_id === 'all' ? (
                          <span className="text-tiny" style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>🌐 All Teams</span>
                        ) : p.team_id && teamMap[p.team_id] ? (
                          <span className="text-tiny">{teamMap[p.team_id]}</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-xs">
                    <button className="btn btn-outline btn-sm" onClick={() => openEdit(p)}>Edit</button>
                    <button className="btn btn-sm" style={{ color: 'var(--accent-red)' }} onClick={() => handleDelete(p)}>✕</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title={editPlayer ? 'Edit Player' : 'Add Player'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSave}>
            
            <div className="form-group" style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
              <div style={{ marginBottom: 'var(--space-sm)' }}>
                 {photoUrlInput ? (
                    <img src={photoUrlInput} alt="Preview" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-green)' }} onError={(e) => { e.target.style.display = 'none'; }} />
                 ) : (
                    <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--bg-surface)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: 'var(--text-muted)' }}>
                      📷
                    </div>
                 )}
              </div>
              <input
                type="url"
                className="form-input"
                placeholder="Paste Image URL (optional)"
                value={photoUrlInput}
                onChange={e => setPhotoUrlInput(e.target.value)}
                style={{ textAlign: 'center', fontSize: 'var(--text-xs)' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Player Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Virat Kohli"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
                autoFocus
                id="player-name-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Role</label>
              <select
                className="form-select"
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                id="player-role-select"
              >
                <option value="Batsman">Batsman</option>
                <option value="Bowler">Bowler</option>
                <option value="All-rounder">All-rounder</option>
                <option value="Wicket-keeper">Wicket-keeper</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Team</label>
              <select className="form-select" value={form.team_id} onChange={e => setForm(f => ({ ...f, team_id: e.target.value }))}>
                <option value="all">🌐 All Teams (Global Player)</option>
                <option value="">No Team</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
              <div className="form-group">
                <label className="form-label">Age</label>
                <input type="number" className="form-input" value={form.age} onChange={e => setForm(f => ({...f, age: e.target.value}))} placeholder="e.g. 25" />
              </div>
              <div className="form-group">
                <label className="form-label">Height</label>
                <input type="text" className="form-input" value={form.height} onChange={e => setForm(f => ({...f, height: e.target.value}))} placeholder="e.g. 5'10&quot;" />
              </div>
              <div className="form-group">
                <label className="form-label">Batting Style</label>
                <select className="form-select" value={form.batting_style} onChange={e => setForm(f => ({...f, batting_style: e.target.value}))}>
                  <option value="Right-hand bat">Right-hand bat</option>
                  <option value="Left-hand bat">Left-hand bat</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Bowling Style</label>
                <select className="form-select" value={form.bowling_style} onChange={e => setForm(f => ({...f, bowling_style: e.target.value}))}>
                  <option value="None">None</option>
                  <option value="Right-arm Fast">Right-arm Fast</option>
                  <option value="Right-arm Medium">Right-arm Medium</option>
                  <option value="Right-arm Off Spin">Right-arm Off Spin</option>
                  <option value="Right-arm Leg Spin">Right-arm Leg Spin</option>
                  <option value="Left-arm Fast">Left-arm Fast</option>
                  <option value="Left-arm Orthodox">Left-arm Orthodox</option>
                  <option value="Left-arm Chinaman">Left-arm Chinaman</option>
                </select>
              </div>
               <div className="form-group">
                <label className="form-label">Career Runs</label>
                <input type="number" className="form-input" value={form.career_runs} onChange={e => setForm(f => ({...f, career_runs: e.target.value}))} placeholder="0" />
              </div>
              <div className="form-group">
                <label className="form-label">Career Wickets</label>
                <input type="number" className="form-input" value={form.career_wickets} onChange={e => setForm(f => ({...f, career_wickets: e.target.value}))} placeholder="0" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Bio / Achievements</label>
              <textarea className="form-input" rows="3" placeholder="Notable performances, centuries, specific skills..." value={form.bio} onChange={e => setForm(f => ({...f, bio: e.target.value}))} />
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={uploading}>
              {uploading ? 'Uploading...' : editPlayer ? 'Update Player' : 'Add Player'}
            </button>
          </form>
        </Modal>
      )}

      {viewPlayer && (
        <PlayerInfoModal player={viewPlayer} onClose={() => setViewPlayer(null)} />
      )}
    </div>
  );
}
