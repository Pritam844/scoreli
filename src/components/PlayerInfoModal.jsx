import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import Modal from './Modal';
import Loader from './Loader';

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function PlayerInfoModal({ player: initialPlayer, onClose }) {
  const [player, setPlayer] = useState(initialPlayer);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If the player object is missing bio fields, try to fetch fresh data from the global players collection
    if (initialPlayer && !initialPlayer.bio && !initialPlayer.age && !initialPlayer.batting_style) {
      fetchFullProfile();
    } else {
      setPlayer(initialPlayer);
    }
  }, [initialPlayer]);

  async function fetchFullProfile() {
    try {
      setLoading(true);
      const q = query(collection(db, 'players'), where('name', '==', initialPlayer.name));
      const snap = await getDocs(q);
      if (!snap.empty) {
        // Merge the fresh data with the match-specific stats (like runs in this match)
        setPlayer({ ...initialPlayer, ...snap.docs[0].data() });
      }
    } catch (err) {
      console.error("Error fetching player profile:", err);
    } finally {
      setLoading(false);
    }
  }

  if (!player) return null;

  return (
    <Modal title="Player Profile" onClose={onClose}>
      {loading ? (
        <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
           <Loader />
        </div>
      ) : (
        <>
        <div className="flex flex-col items-center mb-lg">
        {player.photo_url ? (
          <img 
            src={player.photo_url} 
            alt={player.name} 
            style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--accent-green)', marginBottom: 'var(--space-sm)' }} 
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        ) : (
          <div style={{
            width: 100, height: 100, borderRadius: '50%', background: 'var(--bg-surface)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '32px', fontWeight: 700, color: 'var(--accent-green)',
            fontFamily: 'var(--font-heading)', border: '3px solid var(--border-default)', marginBottom: 'var(--space-sm)'
          }}>
            {getInitials(player.name)}
          </div>
        )}
        <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>{player.name}</h2>
        <div className="badge badge-role">{player.role || 'Batsman'}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
        <div className="card" style={{ padding: 'var(--space-sm)', textAlign: 'center', background: 'var(--bg-surface)', border: 'none' }}>
           <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Age</div>
           <div style={{ fontSize: 'var(--text-base)', fontWeight: 700 }}>{player.age || '-'}</div>
        </div>
        <div className="card" style={{ padding: 'var(--space-sm)', textAlign: 'center', background: 'var(--bg-surface)', border: 'none' }}>
           <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Height</div>
           <div style={{ fontSize: 'var(--text-base)', fontWeight: 700 }}>{player.height || '-'}</div>
        </div>
        <div className="card" style={{ padding: 'var(--space-sm)', textAlign: 'center', background: 'var(--bg-surface)', border: 'none' }}>
           <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Batting</div>
           <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{player.batting_style || '-'}</div>
        </div>
        <div className="card" style={{ padding: 'var(--space-sm)', textAlign: 'center', background: 'var(--bg-surface)', border: 'none' }}>
           <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Bowling</div>
           <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{player.bowling_style || '-'}</div>
        </div>
        <div className="card" style={{ padding: 'var(--space-sm)', textAlign: 'center', background: 'var(--bg-surface)', border: 'none' }}>
           <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Career Runs</div>
           <div style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--accent-blue)' }}>{player.career_runs || 0}</div>
        </div>
        <div className="card" style={{ padding: 'var(--space-sm)', textAlign: 'center', background: 'var(--bg-surface)', border: 'none' }}>
           <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Career Wickets</div>
           <div style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--accent-red)' }}>{player.career_wickets || 0}</div>
        </div>
      </div>

      {player.bio && (
        <div style={{ background: 'var(--bg-surface)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)' }}>
           <h3 style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-xs)', textTransform: 'uppercase', fontWeight: 600 }}>Bio & Achievements</h3>
           <p style={{ fontSize: 'var(--text-sm)', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
             {player.bio}
           </p>
        </div>
      )}
      
      <button className="btn btn-outline btn-block mt-md" onClick={onClose}>Close Profile</button>
      </>
      )}
    </Modal>
  );
}
