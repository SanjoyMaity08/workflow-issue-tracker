import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import AppLayout from './components/AppLayout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import BoardPage from './pages/BoardPage.jsx';
import IssueDetailPage from './pages/IssueDetailPage.jsx';
import IssueListPage from './pages/IssueListPage.jsx';

const Protected = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="empty empty--full">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const App = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />

      <Route
        element={
          <Protected>
            <AppLayout />
          </Protected>
        }
      >
        <Route path="/" element={<div className="empty">Pick a team from the sidebar.</div>} />
        <Route path="/team/:key" element={<BoardPage />} />
        <Route path="/issue/:identifier" element={<IssueDetailPage />} />
        <Route path="/my-issues" element={<IssueListPage mine />} />
        <Route path="/all-issues" element={<IssueListPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
