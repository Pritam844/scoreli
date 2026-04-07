import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';

export default function About() {
  const navigate = useNavigate();
  const toast = useToast();

  const handleDownload = () => {
    // Replace with actual APK link or Web App link
    window.open('https://github.com/PRITAM04/scoreli/releases', '_blank');
    toast.success('Starting download...');
  };

  const [adminClicks, setAdminClicks] = useState(0);

  const handleWhatsApp = () => {
    window.open('https://wa.me/919830655673?text=Hi Pritam, I would like to request Admin access for Scoreli. My locality is:', '_blank');
  };

  return (
    <div className="page-content" style={{ paddingBottom: 'var(--space-2xl)' }}>
      {/* Header */}
      <div className="flex items-center gap-sm mb-lg">
        <button className="page-back-btn" onClick={() => navigate(-1)}>←</button>
        <h1 className="heading-md">About Scoreli</h1>
      </div>

      {/* Hero Section */}
      <div className="card mb-lg" style={{ background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-primary) 100%)', border: '1px solid var(--accent-green-glow)' }}>
        <div className="card-body text-center py-xl">
          <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>🏏</div>
          <h2 className="heading-lg mb-xs">Scoreli</h2>
          <p className="text-body mb-md">Modern Cricket Scoring Platform</p>
          <div className="badge badge-finished" onClick={() => navigate('/admin')} style={{ cursor: 'text', userSelect: 'none' }}>v1.0.0 Stable</div>
        </div>
      </div>

      {/* About Section */}
      <section className="mb-xl">
        <h3 className="heading-sm mb-md" style={{ color: 'var(--accent-green)' }}>What is Scoreli?</h3>
        <div className="card card-body">
          <p className="text-body mb-sm">
            Scoreli is a professional-grade <strong>local match score management system</strong> designed specifically for community cricket.
          </p>
          <ul className="flex flex-col gap-sm mt-md">
            <li className="flex gap-sm items-start">
              <span style={{ color: 'var(--accent-green)' }}>✓</span>
              <span className="text-small">Perfect for local matches and community games.</span>
            </li>
            <li className="flex gap-sm items-start">
              <span style={{ color: 'var(--accent-green)' }}>✓</span>
              <span className="text-small">Hassle-free live scoring for small tournaments.</span>
            </li>
            <li className="flex gap-sm items-start">
              <span style={{ color: 'var(--accent-green)' }}>✓</span>
              <span className="text-small">Organized player and match history tracking.</span>
            </li>
          </ul>
          <p className="text-body mt-md" style={{ fontStyle: 'italic', borderLeft: '3px solid var(--accent-green)', paddingLeft: 'var(--space-md)' }}>
            "Simple, fast, and accessible scoring system for everyone."
          </p>
        </div>
      </section>

      {/* Download Section */}
      <section className="mb-xl">
        <h3 className="heading-sm mb-md" style={{ color: 'var(--accent-blue)' }}>Download App</h3>
        <div className="card card-body text-center" style={{ border: '2px dashed var(--accent-blue)', background: 'rgba(59, 130, 246, 0.05)' }}>
          <p className="text-small mb-md">Install the Scoreli App to manage matches, update scores, and access the admin panel on the go.</p>
          <button className="btn btn-primary btn-block py-md" onClick={handleDownload} style={{ background: 'var(--accent-blue)', boxShadow: 'var(--shadow-glow-blue)' }}>
            📥 DOWNLOAD APP (APK)
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section className="mb-xl">
        <h3 className="heading-sm mb-md">App Features</h3>
        <div className="grid gap-md" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
          <div className="card card-body">
            <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🎯</div>
            <div className="heading-xs mb-xs" style={{ fontSize: 'var(--text-sm)', fontWeight: 700 }}>Core</div>
            <div className="text-tiny">Live ball-by-ball scoring & tracking.</div>
          </div>
          <div className="card card-body">
            <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🧑‍💼</div>
            <div className="heading-xs mb-xs" style={{ fontSize: 'var(--text-sm)', fontWeight: 700 }}>Admin</div>
            <div className="text-tiny">Secure role-based access control.</div>
          </div>
          <div className="card card-body">
            <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🌐</div>
            <div className="heading-xs mb-xs" style={{ fontSize: 'var(--text-sm)', fontWeight: 700 }}>Web</div>
            <div className="text-tiny">Mobile-friendly live viewing pages.</div>
          </div>
          <div className="card card-body">
            <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🛡️</div>
            <div className="heading-xs mb-xs" style={{ fontSize: 'var(--text-sm)', fontWeight: 700 }}>Security</div>
            <div className="text-tiny">Locality-based data protection.</div>
          </div>
        </div>
      </section>

      {/* Admin Access Section */}
      <section className="mb-xl">
        <h3 className="heading-sm mb-md" style={{ color: 'var(--accent-purple)' }}>Get Admin Access</h3>
        <div className="card card-body">
          <div className="flex flex-col gap-md">
            <div className="flex gap-md items-start">
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent-purple)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>1</div>
              <div className="text-small">Download and Install the Scoreli App.</div>
            </div>
            <div className="flex gap-md items-start">
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent-purple)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>2</div>
              <div className="text-small">Contact developer via WhatsApp or Email.</div>
            </div>
            <div className="flex gap-md items-start">
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent-purple)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>3</div>
              <div className="text-small">Provide your Name and Locality name.</div>
            </div>
            <button className="btn btn-block mt-sm" onClick={handleWhatsApp} style={{ background: 'rgba(139, 92, 246, 0.1)', color: 'var(--accent-purple)', border: '1px solid var(--accent-purple)' }}>
              💬 REQUEST ACCESS
            </button>
          </div>
        </div>
      </section>

      {/* Developer Section */}
      <section className="mb-xl">
        <h3 className="heading-sm mb-md">Developer</h3>
        <div className="card card-body">
          <div className="flex items-center gap-md mb-md">
            <div style={{ width: 60, height: 60, borderRadius: 'var(--radius-lg)', background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', border: '2px solid var(--accent-green)' }}>PC</div>
            <div>
              <div className="heading-xs" style={{ fontWeight: 700 }}>Pritam Chowdhury</div>
              <div className="text-tiny" style={{ color: 'var(--accent-green)' }}>Founder & Lead Developer</div>
            </div>
          </div>
          <div className="flex flex-col gap-sm">
            <a href="mailto:pchowdhury2288@gmail.com" className="text-small flex items-center gap-sm" style={{ color: 'var(--text-secondary)' }}>
              <span>📧</span> pchowdhury2288@gmail.com
            </a>
            <a href="https://wa.me/919830655673" className="text-small flex items-center gap-sm" style={{ color: 'var(--text-secondary)' }}>
              <span>📱</span> +91 9830655673
            </a>
          </div>
        </div>
      </section>

      {/* Support Section */}
      <section className="mb-xl text-center">
        <h3 className="heading-sm mb-sm">Need Help?</h3>
        <p className="text-tiny mb-md">For any issues, bug reports, or suggestions contact the developer.</p>
        <div className="flex gap-sm justify-center">
          <button className="btn btn-outline btn-sm" onClick={() => window.open('mailto:pchowdhury2288@gmail.com')}>Email Support</button>
          <button className="btn btn-outline btn-sm" onClick={handleWhatsApp}>WhatsApp Support</button>
        </div>
      </section>

      <div className="text-center py-lg">
        <div className="text-tiny" style={{ opacity: 0.5 }}>© 2026 Scoreli. Built with ❤️ for Cricket.</div>
      </div>
    </div>
  );
}
