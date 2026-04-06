import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../../firebase';
import { doc, getDoc, collection, query, where, getDocs, addDoc, deleteDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import Loader from '../../../components/Loader';
import StatusBadge from '../../../components/StatusBadge';

export default function TournamentDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isMainAdmin } = useAuth();
  const toast = useToast();

  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('teams');

  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [pointsTable, setPointsTable] = useState([]);

  useEffect(() => {
    if (user) fetchTournamentData();
  }, [id, user]);

  async function fetchTournamentData() {
    try {
      const snap = await getDoc(doc(db, 'tournaments', id));
      if (!snap.exists()) return navigate('/admin/tournaments');
      const data = { id: snap.id, ...snap.data() };
      
      // Access Check
      if (!isMainAdmin && data.adminId !== user.uid) {
        toast.error('Unauthorized access');
        return navigate('/admin/tournaments');
      }

      setTournament(data);

      // Fetch teams
      const teamSnap = await getDocs(query(collection(db, 'tournament_teams'), where('tournamentId', '==', id)));
      const teamData = teamSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setTeams(teamData);

      // Fetch matches
      const matchSnap = await getDocs(query(collection(db, 'matches'), where('tournamentId', '==', id)));
      const matchData = matchSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMatches(matchData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));

      // Calculate points table
      calculatePointsTable(teamData, matchData);
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }

  function calculatePointsTable(teamData, matchData) {
    const table = teamData.map(team => {
      const teamMatches = matchData.filter(m => (m.teamA?.id === team.id || m.teamB?.id === team.id) && m.status === 'finished');
      
      let wins = 0, losses = 0, ties = 0, points = 0;
      let runsScored = 0, oversFaced = 0, runsConceded = 0, oversBowled = 0;

      teamMatches.forEach(m => {
        const isTeamA = m.teamA?.id === team.id;
        const result = m.winner;
        
        if ((isTeamA && result === 'teamA') || (!isTeamA && result === 'teamB')) {
          wins++;
          points += 2;
        } else if (result === 'tie') {
          ties++;
          points += 1;
        } else {
          losses++;
        }

        // NRR Calculation
        if (isTeamA) {
          runsScored += m.teamA?.score || 0;
          oversFaced += Number(m.teamA?.overs || 0);
          runsConceded += m.teamB?.score || 0;
          oversBowled += Number(m.teamB?.overs || 0);
        } else {
          runsScored += m.teamB?.score || 0;
          oversFaced += Number(m.teamB?.overs || 0);
          runsConceded += m.teamA?.score || 0;
          oversBowled += Number(m.teamA?.overs || 0);
        }
      });

      const nrr = (oversFaced > 0 && oversBowled > 0) 
        ? (runsScored / oversFaced) - (runsConceded / oversBowled) 
        : 0;

      return {
        ...team,
        matches: teamMatches.length,
        wins,
        losses,
        ties,
        points,
        nrr: nrr.toFixed(3)
      };
    });

    table.sort((a, b) => b.points - a.points || b.nrr - a.nrr);
    setPointsTable(table);
  }

  async function handleAddTeam(e) {
    e.preventDefault();
    const name = e.target.teamName.value;
    if (!name) return;

    try {
      await addDoc(collection(db, 'tournament_teams'), {
        tournamentId: id,
        name,
        logo_url: null,
        createdAt: serverTimestamp()
      });
      toast.success('Team added');
      e.target.reset();
      fetchTournamentData();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDeleteTeam(teamId) {
    if (!window.confirm('Delete this team?')) return;
    try {
      await deleteDoc(doc(db, 'tournament_teams', teamId));
      toast.success('Team deleted');
      fetchTournamentData();
    } catch (err) {
      console.error(err);
    }
  }

  async function generateMatches() {
    if (teams.length < 2) return toast.error('Add at least 2 teams');
    if (!window.confirm('Generate round robin matches?')) return;

    try {
      setLoading(true);
      const batch = writeBatch(db);
      
      for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
          const matchRef = doc(collection(db, 'matches'));
          batch.set(matchRef, {
            tournamentId: id,
            teamA: { id: teams[i].id, name: teams[i].name, score: 0, wickets: 0, overs: 0 },
            teamB: { id: teams[j].id, name: teams[j].name, score: 0, wickets: 0, overs: 0 },
            status: 'upcoming',
            createdAt: serverTimestamp(),
            published: true,
            winner: null,
            result: null
          });
        }
      }

      await batch.commit();
      toast.success('Matches generated! ⚡');
      fetchTournamentData();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <Loader />;

  return (
    <div className="page-content" style={{ paddingBottom: 'var(--space-2xl)' }}>
      <div className="header mb-lg">
        <button className="page-back-btn" onClick={() => navigate('/admin/tournaments')}>←</button>
        <div style={{ marginTop: 'var(--space-sm)' }}>
          <h1 className="heading-md">{tournament?.name}</h1>
          <div className="flex gap-sm items-center mt-xs">
            <StatusBadge status={tournament?.status} />
            <span className="text-tiny" style={{ opacity: 0.6 }}>Season {tournament?.season}</span>
          </div>
        </div>
      </div>

      <div className="tabs mb-lg">
        {['teams', 'matches', 'table'].map(tab => (
          <button 
            key={tab} 
            className={`tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'teams' && (
        <div>
          <div className="card mb-lg">
            <div className="card-body">
              <h3 className="heading-xs mb-md">Add New Team</h3>
              <form onSubmit={handleAddTeam} className="flex gap-sm">
                <input name="teamName" className="input" placeholder="Team Name" required style={{ flex: 1 }} />
                <button type="submit" className="btn btn-primary">Add</button>
              </form>
            </div>
          </div>

          <div className="teams-list flex flex-col gap-sm">
            {teams.length === 0 ? (
               <div className="empty-state">
                  <div className="empty-state-icon">👥</div>
                  <div className="empty-state-title">No teams yet</div>
               </div>
            ) : (
              teams.map(team => (
                <div key={team.id} className="card">
                  <div className="card-body flex justify-between items-center py-md">
                    <div className="flex items-center gap-md">
                      <div className="team-avatar" style={{ width: 40, height: 40 }}>{team.name[0].toUpperCase()}</div>
                      <span className="heading-xs">{team.name}</span>
                    </div>
                    <button className="text-error" onClick={() => handleDeleteTeam(team.id)}>🗑️</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'matches' && (
        <div className="flex flex-col gap-md">
          <div className="flex justify-between items-center">
            <h3 className="heading-sm">Fixtures</h3>
            {matches.length === 0 && (
              <button className="btn btn-primary" onClick={generateMatches}>⚡ Generate Matches</button>
            )}
          </div>
          
          {matches.map(m => (
            <div 
              key={m.id} 
              className="card" 
              onClick={() => navigate(`/admin/scoring/${m.id}`)}
              style={{ cursor: 'pointer' }}
            >
              <div className="card-body py-md">
                <div className="flex justify-between items-center mb-sm">
                  <StatusBadge status={m.status} />
                  <span className="text-tiny" style={{ opacity: 0.5 }}>#{m.id.slice(-4).toUpperCase()}</span>
                </div>
                <div className="match-card-teams flex items-center justify-between" style={{ gap: 'var(--space-md)' }}>
                  <div className="flex flex-col items-center gap-xs" style={{ width: '40%' }}>
                    <div className="team-avatar" style={{ width: 48, height: 48 }}>{m.teamA.name[0]}</div>
                    <span className="text-tiny text-center font-bold">{m.teamA.name}</span>
                  </div>
                  <div className="text-tiny font-bold opacity-40">VS</div>
                  <div className="flex flex-col items-center gap-xs" style={{ width: '40%' }}>
                    <div className="team-avatar" style={{ width: 48, height: 48 }}>{m.teamB.name[0]}</div>
                    <span className="text-tiny text-center font-bold">{m.teamB.name}</span>
                  </div>
                </div>
                {m.result && (
                  <div className="mt-md pt-md text-center text-tiny font-bold" style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--accent-green)' }}>
                    🏆 {m.result}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'table' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="card-body px-0" style={{ padding: 0 }}>
            <table className="score-table">
              <thead>
                <tr>
                  <th style={{ paddingLeft: 'var(--space-md)' }}>Team</th>
                  <th>M</th>
                  <th>W</th>
                  <th>L</th>
                  <th>NRR</th>
                  <th style={{ paddingRight: 'var(--space-md)' }}>Pts</th>
                </tr>
              </thead>
              <tbody>
                {pointsTable.map((t, idx) => (
                  <tr key={t.id} className={idx < 4 ? 'highlight-row' : ''}>
                    <td style={{ paddingLeft: 'var(--space-md)' }}>
                      <div className="flex items-center gap-sm">
                        <span className="text-tiny opacity-40" style={{ width: 15 }}>{idx + 1}</span>
                        <div className="team-avatar" style={{ width: 24, height: 24, fontSize: 10 }}>{t.name[0]}</div>
                        <span className="font-bold">{t.name}</span>
                      </div>
                    </td>
                    <td>{t.matches}</td>
                    <td>{t.wins}</td>
                    <td>{t.losses}</td>
                    <td style={{ color: Number(t.nrr) >= 0 ? 'var(--accent-green)' : 'var(--text-error)' }}>
                      {Number(t.nrr) > 0 ? '+' : ''}{t.nrr}
                    </td>
                    <td style={{ paddingRight: 'var(--space-md)', fontWeight: 800 }}>{t.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
