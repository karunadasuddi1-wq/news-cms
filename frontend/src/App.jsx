import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Articles from './pages/Articles';
import ArticleEditor from './pages/ArticleEditor';
import Categories from './pages/Categories';
import Users from './pages/Users';
import Analytics from './pages/Analytics';
import Pages from './pages/Pages';
import AiWriter from './pages/AiWriter';
import Newsroom from './pages/Newsroom';
import Settings from './pages/Settings';
import UsageDashboard from './pages/UsageDashboard';
import Layout from './components/Layout';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
          <Route path="/articles" element={<ProtectedRoute><Layout><Articles /></Layout></ProtectedRoute>} />
          <Route path="/articles/:id" element={<ProtectedRoute><Layout><ArticleEditor /></Layout></ProtectedRoute>} />
          <Route path="/categories" element={<ProtectedRoute><Layout><Categories /></Layout></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><Layout><Analytics /></Layout></ProtectedRoute>} />
          <Route path="/pages" element={<ProtectedRoute><Layout><Pages /></Layout></ProtectedRoute>} />
          <Route path="/ai-writer" element={<ProtectedRoute><Layout><AiWriter /></Layout></ProtectedRoute>} />
          <Route path="/newsroom" element={<ProtectedRoute><Layout><Newsroom /></Layout></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />
          <Route path="/usage" element={<ProtectedRoute><Layout><UsageDashboard /></Layout></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute adminOnly><Layout><Users /></Layout></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
