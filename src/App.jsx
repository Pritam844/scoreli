import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import ThemeToggle from './components/ThemeToggle';

// Public Pages
import Home from './pages/Home';
import MatchDetails from './pages/MatchDetails';
import MatchHistory from './pages/MatchHistory';
import Players from './pages/Players';
import About from './pages/About';
import TournamentListPublic from './pages/TournamentList';
import TournamentDetailsPublic from './pages/TournamentDetails';

// Admin Pages
import Login from './pages/admin/Login';
import Dashboard from './pages/admin/Dashboard';
import TeamManagement from './pages/admin/TeamManagement';
import PlayerManagement from './pages/admin/PlayerManagement';
import MatchManagement from './pages/admin/MatchManagement';
import LiveScoring from './pages/admin/LiveScoring';
import TournamentList from './pages/admin/tournaments/TournamentList';
import TournamentDashboard from './pages/admin/tournaments/TournamentDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <ToastProvider>
            <div className="app-container">
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Home />} />
                <Route path="/match/:id" element={<MatchDetails />} />
                <Route path="/matches" element={<MatchHistory />} />
                {/* <Route path="/players" element={<Players />} /> */}
                <Route path="/tournaments" element={<TournamentListPublic />} />
                <Route path="/tournaments/:id" element={<TournamentDetailsPublic />} />
                <Route path="/about" element={<About />} />

                {/* Admin Routes */}
                <Route path="/admin/login" element={<Login />} />
                <Route path="/admin" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/admin/teams" element={<ProtectedRoute><TeamManagement /></ProtectedRoute>} />
                <Route path="/admin/players" element={<ProtectedRoute><PlayerManagement /></ProtectedRoute>} />
                <Route path="/admin/matches" element={<ProtectedRoute><MatchManagement /></ProtectedRoute>} />
                <Route path="/admin/matches/new" element={<ProtectedRoute><MatchManagement /></ProtectedRoute>} />
                <Route path="/admin/tournaments" element={<ProtectedRoute><TournamentList /></ProtectedRoute>} />
                <Route path="/admin/tournaments/:id" element={<ProtectedRoute><TournamentDashboard /></ProtectedRoute>} />
                <Route path="/admin/scoring/:id" element={<ProtectedRoute><LiveScoring /></ProtectedRoute>} />
              </Routes>
              <Navbar />
              <ThemeToggle />
            </div>
          </ToastProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
