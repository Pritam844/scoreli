import { useState } from 'react';
import PlayerInfoModal from './PlayerInfoModal';

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function ScoreTable({ type, data = [] }) {
  const [viewPlayer, setViewPlayer] = useState(null);
  if (!data.length) {
    return <div className="empty-state"><p className="text-small">No data available</p></div>;
  }

  if (type === 'batting') {
    return (
      <>
      <table className="score-table">
        <thead>
          <tr>
            <th>Batting</th>
            <th>R</th>
            <th>B</th>
            <th>4s</th>
            <th>6s</th>
            <th>SR</th>
          </tr>
        </thead>
        <tbody>
          {data.map((b, i) => {
            const sr = b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : '0.0';
            const isTopScorer = i === data.reduce((maxI, cur, ci, arr) => cur.runs > arr[maxI].runs ? ci : maxI, 0) && b.runs > 0;
            return (
              <tr key={i} className={`${b.notOut ? 'not-out' : ''} ${isTopScorer ? 'top-scorer highlight-row' : ''}`}>
                <td>
                  <div className="flex items-center gap-sm" onClick={() => setViewPlayer(b)} style={{ cursor: 'pointer' }}>
                    {b.photo_url ? (
                      <img src={b.photo_url} alt={b.name} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--border-subtle)' }} />
                    ) : (
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: 'var(--accent-green)', flexShrink: 0 }}>
                        {getInitials(b.name)}
                      </div>
                    )}
                    <div>
                      {b.name}
                      {b.howOut && <div className="text-tiny" style={{ marginTop: 2 }}>{b.howOut}</div>}
                      {b.notOut && <div className="text-tiny" style={{ color: 'var(--accent-green)', marginTop: 2 }}>not out</div>}
                    </div>
                  </div>
                </td>
                <td style={{ fontWeight: 700 }}>{b.runs}</td>
                <td>{b.balls}</td>
                <td>{b.fours || 0}</td>
                <td>{b.sixes || 0}</td>
                <td>{sr}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {viewPlayer && <PlayerInfoModal player={viewPlayer} onClose={() => setViewPlayer(null)} />}
      </>
    );
  }

  // Bowling
  return (
    <>
    <table className="score-table">
      <thead>
        <tr>
          <th>Bowling</th>
          <th>O</th>
          <th>R</th>
          <th>W</th>
          <th>Econ</th>
        </tr>
      </thead>
      <tbody>
        {data.map((b, i) => {
          const econ = b.overs > 0 ? (b.runs / b.overs).toFixed(1) : '0.0';
          return (
            <tr key={i}>
              <td>
                <div className="flex items-center gap-sm" onClick={() => setViewPlayer(b)} style={{ cursor: 'pointer' }}>
                  {b.photo_url ? (
                    <img src={b.photo_url} alt={b.name} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--border-subtle)' }} />
                  ) : (
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: 'var(--accent-green)', flexShrink: 0 }}>
                      {getInitials(b.name)}
                    </div>
                  )}
                  <span>{b.name}</span>
                </div>
              </td>
              <td>{b.overs}</td>
              <td>{b.runs}</td>
              <td style={{ fontWeight: 700, color: b.wickets > 0 ? 'var(--accent-green)' : undefined }}>{b.wickets}</td>
              <td>{econ}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
    {viewPlayer && <PlayerInfoModal player={viewPlayer} onClose={() => setViewPlayer(null)} />}
    </>
  );
}
