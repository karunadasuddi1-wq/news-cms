const API_BASE = import.meta.env.VITE_API_URL || 'https://karunadasuddi-api.onrender.com';

async function apiFetch(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  // Use /api/public/ routes — no auth needed
  getArticles: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiFetch(`/api/public/articles?${q}`);
  },
  getArticle: (slug) => apiFetch(`/api/public/articles/${slug}`),
  getArticlesByCategory: (categorySlug, params = {}) => {
    const q = new URLSearchParams({ category: categorySlug, ...params }).toString();
    return apiFetch(`/api/public/articles?${q}`);
  },
  searchArticles: (query, params = {}) => {
    const q = new URLSearchParams({ search: query, ...params }).toString();
    return apiFetch(`/api/public/articles?${q}`);
  },
  getCategories: () => apiFetch('/api/public/categories'),
  getPage: (slug) => apiFetch(`/api/public/articles/${slug}`),
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
  return formatDate(dateStr);
}
