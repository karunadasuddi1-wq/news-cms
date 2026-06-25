import axios from 'axios';

const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace(/\/$/, '');

const client = axios.create({ baseURL: `${BASE}/public` });

export const fetchCategories = () => client.get('/categories').then(r => r.data.categories);
export const fetchArticles = (params = {}) => client.get('/articles', { params }).then(r => r.data);
export const fetchArticle = (slug) => client.get(`/articles/${slug}`).then(r => r.data.article);

export default client;
