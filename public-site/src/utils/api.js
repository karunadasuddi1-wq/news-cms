const API_BASE = import.meta.env.VITE_API_URL || 'https://karunadasuddi-api.onrender.com';

async function apiFetch(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  // Articles
  getArticles: (params = {}) => {
    const q = new URLSearchParams({ status: 'published', ...params }).toString();
    return apiFetch(`/api/articles?${q}`);
  },
  getArticle: (slug) => apiFetch(`/api/articles/${slug}`),
  getArticlesByCategory: (categorySlug, params = {}) => {
    const q = new URLSearchParams({ status: 'published', category: categorySlug, ...params }).toString();
    return apiFetch(`/api/articles?${q}`);
  },
  searchArticles: (query, params = {}) => {
    const q = new URLSearchParams({ status: 'published', search: query, ...params }).toString();
    return apiFetch(`/api/articles?${q}`);
  },
  // Categories
  getCategories: () => apiFetch('/api/categories'),
  // Pages (static content)
  getPage: (slug) => apiFetch(`/api/pages/${slug}`),
};

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('kn-IN', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes} ನಿಮಿಷಗಳ ಹಿಂದೆ`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ಗಂಟೆಗಳ ಹಿಂದೆ`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ದಿನಗಳ ಹಿಂದೆ`;
  return formatDate(dateStr);
}
