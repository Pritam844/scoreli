import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import Loader from '../../components/Loader';

export default function MatchManagement() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMatch, setEditingMatch] = useState(null);
  const now = new Date();
  const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  const [form, setForm] = useState({
    teamA_id: '',
    teamB_id: '',
    status: 'upcoming',
    overs: 20,
    batterMode: 2, // 1 or 2
    matchDate: localNow,
    battingFirst: 'teamA'
  });

  useEffect(() => { 
    fetchData(); 
    if (window.location.pathname.endsWith('/new')) {
      // Small delay to ensure teams are fetched, but wait we need teams for openCreate.
      // Better to just open it after teams load.
    }
  }, []);

  async function fetchData() {
    try {
      const [matchSnap, teamSnap] = await Promise.all([
        getDocs(collection(db, 'matches')),
        getDocs(collection(db, 'teams'))
      ]);
      setMatches(matchSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
      const fetchedTeams = teamSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setTeams(fetchedTeams);
      
      if (window.location.pathname.endsWith('/new')) {
        setForm({
          teamA_id: fetchedTeams[0]?.id || '',
          teamB_id: fetchedTeams[1]?.id || '',
          status: 'upcoming',
          overs: 20,
          batterMode: 2,
          matchDate: localNow,
          battingFirst: 'teamA'
        });
        setShowModal(true);
        window.history.replaceState(null, '', '/admin/matches');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingMatch(null);
    setForm({
      teamA_id: teams[0]?.id || '',
      teamB_id: teams[1]?.id || '',
      status: 'upcoming',
      overs: 20,
      batterMode: 2,
      matchDate: localNow,
      battingFirst: 'teamA'
    });
    setShowModal(true);
  }

  function openEdit(match) {
    setEditingMatch(match);
    const mDate = new Date(match.matchDate?.seconds ? match.matchDate.seconds * 1000 : match.matchDate);
    const localFormDate = new Date(mDate.getTime() - mDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    
    setForm({
      teamA_id: match.teamA?.id || '',
      teamB_id: match.teamB?.id || '',
      status: match.status || 'upcoming',
      overs: match.overs || 20,
      batterMode: match.batterMode || 2,
      matchDate: localFormDate,
      battingFirst: match.battingFirst || 'teamA'
    });
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.teamA_id || !form.teamB_id) { toast.error('Select both teams'); return; }
    if (form.teamA_id === form.teamB_id) { toast.error('Select different teams'); return; }

    const teamA = teams.find(t => t.id === form.teamA_id);
    const teamB = teams.find(t => t.id === form.teamB_id);

    const matchData = {
      teamA: { ...teamA, score: editingMatch ? (editingMatch.teamA?.score ?? 0) : 0, wickets: editingMatch ? (editingMatch.teamA?.wickets ?? 0) : 0, overs: editingMatch ? (editingMatch.teamA?.overs ?? 0) : 0 },
      teamB: { ...teamB, score: editingMatch ? (editingMatch.teamB?.score ?? 0) : 0, wickets: editingMatch ? (editingMatch.teamB?.wickets ?? 0) : 0, overs: editingMatch ? (editingMatch.teamB?.overs ?? 0) : 0 },
      status: form.status,
      overs: parseInt(form.overs) || 20,
      batterMode: parseInt(form.batterMode) || 2,
      matchDate: new Date(form.matchDate).getTime(),
      battingFirst: form.battingFirst,
    };

    try {
      if (editingMatch) {
        await updateDoc(doc(db, 'matches', editingMatch.id), matchData);
        toast.success('Match updated!');
      } else {
        await addDoc(collection(db, 'matches'), {
          ...matchData,
          published: false,
          winner: null,
          result: null,
          admin_id: user.uid,
          createdAt: serverTimestamp()
        });
        toast.success('Match created!');
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      toast.error(editingMatch ? 'Failed to update' : 'Failed to create');
      console.error(err);
    }
  }

  async function togglePublish(match) {
    try {
      await updateDoc(doc(db, 'matches', match.id), { published: !match.published });
      toast.success(match.published ? 'Unpublished' : 'Published!');
      fetchData();
    } catch (err) {
      toast.error('Failed to update');
    }
  }

  async function updateStatus(match, newStatus) {
    try {
      await updateDoc(doc(db, 'matches', match.id), { status: newStatus });
      toast.success(`Status: ${newStatus}`);
      fetchData();
    } catch (err) {
      toast.error('Failed to update');
    }
  }

  async function toggleBatterMode(match) {
    const newMode = match.batterMode === 1 ? 2 : 1;
    try {
      await updateDoc(doc(db, 'matches', match.id), { batterMode: newMode });
      toast.success(newMode === 1 ? 'Switched to 1 Batter Mode' : 'Switched to 2 Batter Mode');
      fetchData();
    } catch (err) {
      toast.error('Failed to update mode');
    }
  }

  async function handleAutoFix(match) {
    const sA = match.teamA?.score || 0;
    const sB = match.teamB?.score || 0;
    const wB = match.teamB?.wickets || 0;
    const maxWk = (match.batterMode === 1) ? 99 : 10;
    
    let result = '';
    let winner = null;
    
    if (sB > sA) {
      winner = 'teamB';
      result = `${match.teamB?.name} won by ${sB - sA} runs`;
    } else if (sA > sB) {
      winner = 'teamA';
      result = `${match.teamA?.name} won by ${sA - sB} runs`;
    } else {
      result = 'Match Tied!';
      winner = null;
    }

    try {
      await updateDoc(doc(db, 'matches', match.id), { status: 'finished', result, winner });
      toast.success('Result fixed!');
      fetchData();
    } catch (err) {
      toast.error('Failed to fix');
    }
  }

  async function handleDelete(match) {
    if (!confirm('🛑 Delete this match? This cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'matches', match.id));
      toast.success('Match deleted!');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete');
    }
  }

  if (loading) return <Loader />;

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-header-title">Matches</h1>
        <button className="btn btn-primary btn-sm" onClick={openCreate} id="create-match-btn">+ New</button>
      </div>

      {matches.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🏏</div>
          <div className="empty-state-title">No matches</div>
          <div className="empty-state-text">Create your first match</div>
          <button className="btn btn-primary mt-md" onClick={openCreate}>Create Match</button>
        </div>
      ) : (
        <div className="flex flex-col gap-sm">
          {matches.map(m => (
            <div key={m.id} className="card">
              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div className="flex gap-xs items-center">
                    <StatusBadge status={m.status} />
                    {m.overs && <span className="badge" style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', fontSize: '10px', padding: '1px 6px' }}>{m.overs} ov</span>}
                    {m.batterMode === 1 && <span className="badge" style={{ background: 'rgba(139,92,246,0.15)', color: 'var(--accent-purple)', fontSize: '10px', padding: '1px 6px' }}>1 Bat</span>}
                  </div>
                  <div className="text-tiny opacity-60">
                    {new Date((m.matchDate || m.createdAt)?.seconds ? (m.matchDate || m.createdAt).seconds * 1000 : (m.matchDate || m.createdAt)).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                </div>

                <div className="flex justify-between items-center mb-sm">
                  <div style={{ fontWeight: 600, fontSize: 'var(--text-base)' }}>
                    {m.teamA?.name || 'TBA'} vs {m.teamB?.name || 'TBA'}
                  </div>
                  <div className="flex gap-xs items-center">
                    {m.published ? (
                      <span className="badge badge-finished">Published</span>
                    ) : (
                      <span className="badge badge-draft">Draft</span>
                    )}
                  </div>
                </div>
                <div className="text-small mb-sm">
                  {m.teamA?.score ?? 0}/{m.teamA?.wickets ?? 0} ({m.teamA?.overs ?? 0}) •{' '}
                  {m.teamB?.score ?? 0}/{m.teamB?.wickets ?? 0} ({m.teamB?.overs ?? 0})
                </div>
                {m.battingFirst && (
                  <div className="text-tiny mb-sm opacity-80" style={{ fontStyle: 'italic' }}>
                    🏏 {m[m.battingFirst]?.name} batting first
                  </div>
                )}
                {m.result && (
                  <div className="text-small mb-sm" style={{ color: 'var(--accent-green)', fontWeight: 600 }}>
                    🏆 {m.result}
                  </div>
                )}

                <div className="flex gap-xs" style={{ flexWrap: 'wrap' }}>
                  <button className="btn btn-primary btn-sm" onClick={() => navigate(`/admin/scoring/${m.id}`)}>
                    🏏 Score
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={() => togglePublish(m)}>
                    {m.published ? '📤 Unpublish' : '📢 Publish'}
                  </button>
                  {m.status !== 'live' && (
                    <button className="btn btn-outline btn-sm" onClick={() => updateStatus(m, 'live')}>
                      ▶ Live
                    </button>
                  )}
                  {m.status === 'live' && (
                    <button className="btn btn-outline btn-sm" onClick={() => updateStatus(m, 'finished')}>
                      ✅ End
                    </button>
                  )}
                  {m.status === 'finished' && (
                    <button className="btn btn-sm" onClick={() => handleAutoFix(m)} style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--accent-green)', border: '1px solid rgba(16,185,129,0.2)' }}>
                      🔧 Fix Result
                    </button>
                  )}
                  <button 
                    className="btn btn-sm" 
                    title={m.batterMode === 1 ? 'Switch to 2 Batters' : 'Switch to 1 Batter'} 
                    onClick={() => toggleBatterMode(m)}
                    style={{ background: 'rgba(139,92,246,0.1)', color: 'var(--accent-purple)', border: '1px solid rgba(139,92,246,0.2)' }}
                  >
                    {m.batterMode === 1 ? '🧍🧍' : '🧍'}
                  </button>
                  <button className="btn btn-sm" title="Edit Match" onClick={() => openEdit(m)} style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}>
                    ✏️
                  </button>
                  <button className="btn btn-sm" style={{ color: 'var(--accent-red)' }} onClick={() => handleDelete(m)}>
                    🗑
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title={editingMatch ? "Update Match" : "Create Match"} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Team A</label>
              <select
                className="form-select"
                value={form.teamA_id}
                onChange={e => setForm(f => ({ ...f, teamA_id: e.target.value }))}
                required
                id="match-teamA-select"
              >
                <option value="">Select Team</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Team B</label>
              <select
                className="form-select"
                value={form.teamB_id}
                onChange={e => setForm(f => ({ ...f, teamB_id: e.target.value }))}
                required
                id="match-teamB-select"
              >
                <option value="">Select Team</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            {/* Overs Selection */}
            <div className="form-group">
              <label className="form-label">Overs</label>
              <div className="flex gap-xs" style={{ flexWrap: 'wrap' }}>
                {[5, 10, 15, 20, 50].map(o => (
                  <button
                    key={o}
                    type="button"
                    className={`btn btn-sm ${form.overs === o ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setForm(f => ({ ...f, overs: o }))}
                    style={{ minWidth: 48 }}
                  >
                    {o}
                  </button>
                ))}
                <input
                  type="number"
                  className="form-input"
                  value={form.overs}
                  onChange={e => setForm(f => ({ ...f, overs: parseInt(e.target.value) || 1 }))}
                  min="1"
                  max="100"
                  style={{ width: 72, textAlign: 'center' }}
                  id="match-overs-input"
                />
              </div>
            </div>

            {/* Batter Mode */}
            <div className="form-group">
              <label className="form-label">Batter Mode</label>
              <div className="flex gap-sm">
                <button
                  type="button"
                  className={`btn btn-block ${form.batterMode === 1 ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setForm(f => ({ ...f, batterMode: 1 }))}
                  style={{ flex: 1 }}
                >
                  <div style={{ fontSize: 'var(--text-lg)' }}>🧍</div>
                  <div style={{ fontSize: 'var(--text-xs)', marginTop: 2 }}>1 Batter</div>
                </button>
                <button
                  type="button"
                  className={`btn btn-block ${form.batterMode === 2 ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setForm(f => ({ ...f, batterMode: 2 }))}
                  style={{ flex: 1 }}
                >
                  <div style={{ fontSize: 'var(--text-lg)' }}>🧍🧍</div>
                  <div style={{ fontSize: 'var(--text-xs)', marginTop: 2 }}>2 Batters</div>
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Who bats first?</label>
              <select
                className="form-select"
                value={form.battingFirst}
                onChange={e => setForm(f => ({ ...f, battingFirst: e.target.value }))}
                required
              >
                <option value="teamA">{teams.find(t => t.id === form.teamA_id)?.name || 'Team A'}</option>
                <option value="teamB">{teams.find(t => t.id === form.teamB_id)?.name || 'Team B'}</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Match Date & Time</label>
              <input
                type="datetime-local"
                className="form-input"
                value={form.matchDate}
                onChange={e => setForm(f => ({ ...f, matchDate: e.target.value }))}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Initial Status</label>
              <select
                className="form-select"
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                id="match-status-select"
              >
                <option value="upcoming">Upcoming</option>
                <option value="live">Live</option>
              </select>
            </div>

            <button type="submit" className="btn btn-primary btn-block" id="save-match-btn">
              {editingMatch ? 'Update Match' : 'Create Match'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
