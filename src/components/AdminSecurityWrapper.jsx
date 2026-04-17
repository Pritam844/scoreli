import { useEffect } from 'react';

export default function AdminSecurityWrapper({ children }) {
  useEffect(() => {
    const handleContextMenu = (e) => e.preventDefault();
    const handleCopy = (e) => {
      e.preventDefault();
      // Optional: show a toast or alert
    };
    const handleKeyDown = (e) => {
      // Block Ctrl+C, Ctrl+U, Ctrl+S, Ctrl+P
      if ((e.ctrlKey || e.metaKey) && (['c', 'u', 's', 'p'].includes(e.key.toLowerCase()))) {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div className="admin-security-wrapper no-select">
      {children}
    </div>
  );
}
