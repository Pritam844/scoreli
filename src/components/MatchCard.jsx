import { useNavigate } from 'react-router-dom';
import StatusBadge from './StatusBadge';

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 3);
}

function formatScore(team) {
  if (!team?.score && team?.score !== 0) return '-';
  const w = team.wickets ?? 0;
  const o = team.overs ?? 0;
  return (
    <>
      {team.score}/{w}
      <span> ({o})</span>
    </>
  );
}

export default function MatchCard({ match }) {
  const navigate = useNavigate();
  const { teamA, teamB, status, winner, matchDate, result } = match;
  const isFinished = status === 'finished';

  return (
    <div className="match-card" id={`match-${match.id}`} onClick={() => navigate(`/match/${match.id}`)}>
      <div className="match-card-header">
        <div className="flex items-center gap-xs">
          <StatusBadge status={status} />
          {match.tournamentName && (
            <span className="badge" style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--accent-blue)', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(59,130,246,0.1)' }}>
              🏆 {match.tournamentName}
            </span>
          )}
        </div>
        {(matchDate || match.createdAt) && (
          <span className="text-tiny">
            {new Date((matchDate || match.createdAt)?.seconds ? (matchDate || match.createdAt).seconds * 1000 : (matchDate || match.createdAt)).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'short', year: 'numeric'
            })}
          </span>
        )}
      </div>

      <div className="match-card-teams">
        <div className={`match-team ${isFinished && winner === 'teamA' ? 'winner-team' : ''}`}>
          {teamA?.logo_url ? (
            <img src={teamA.logo_url} alt={teamA.name} className="team-avatar" style={{ objectFit: 'cover' }} />
          ) : (
            <div className="team-avatar">{getInitials(teamA?.name)}</div>
          )}
          <div className="team-name">{teamA?.name || 'Team A'}</div>
          <div className="team-score">{formatScore(teamA)}</div>
        </div>

        <div className="match-vs">VS</div>

        <div className={`match-team ${isFinished && winner === 'teamB' ? 'winner-team' : ''}`}>
          {teamB?.logo_url ? (
            <img src={teamB.logo_url} alt={teamB.name} className="team-avatar" style={{ objectFit: 'cover' }} />
          ) : (
            <div className="team-avatar">{getInitials(teamB?.name)}</div>
          )}
          <div className="team-name">{teamB?.name || 'Team B'}</div>
          <div className="team-score">{formatScore(teamB)}</div>
        </div>
      </div>

      {(result || isFinished) && (
        <div className="match-card-footer">
          <div className="match-result">
            {result ? `🏆 ${result}` : 'Match Complete'}
          </div>
        </div>
      )}
    </div>
  );
}
