import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import AddExpense from './pages/AddExpense';
import Analytics from './pages/Analytics';
import Groups from './pages/Groups';
import Insights from './pages/Insights';
import Settings from './pages/Settings';

function AuthFlow() {
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'reset'>('login');

  if (authMode === 'register') {
    return <Register onToggleMode={() => setAuthMode('login')} />;
  }

  if (authMode === 'reset') {
    return <ResetPassword onBack={() => setAuthMode('login')} />;
  }

  return (
    <Login
      onToggleMode={() => setAuthMode('register')}
      onForgotPassword={() => setAuthMode('reset')}
    />
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthFlow />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'add-expense':
        return <AddExpense />;
      case 'analytics':
        return <Analytics />;
      case 'groups':
        return <Groups />;
      case 'insights':
        return <Insights />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
