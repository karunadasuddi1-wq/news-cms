import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import MobileBottomNav from './components/MobileBottomNav';
import Footer from './components/Footer';
import Home from './pages/Home';
import Category from './pages/Category';
import Article from './pages/Article';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/category/:slug" element={<Category />} />
            {/* New SEO-friendly URL: /category-slug/article-slug */}
            <Route path="/:category/:slug" element={<Article />} />
            {/* Legacy redirect support: /article/:slug still works */}
            <Route path="/article/:slug" element={<Article />} />
            <Route path="*" element={
              <div className="max-w-7xl mx-auto px-4 py-20 text-center">
                <h1 className="font-bold text-2xl text-gray-800 mb-3">404 — ಪುಟ ಸಿಗಲಿಲ್ಲ</h1>
                <a href="/" className="text-white px-5 py-2 rounded text-sm inline-block" style={{ background: '#c0392b' }}>ಮುಖಪುಟ</a>
              </div>
            } />
          </Routes>
        </div>
        <Footer />
        <MobileBottomNav />
      </div>
    </BrowserRouter>
  );
}
