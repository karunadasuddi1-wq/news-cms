const { getSetting } = require('../controllers/settingController');

async function generateArticleSchema(article) {
  const siteUrl = (await getSetting('site_url', null)) || '';
  const siteName = (await getSetting('site_name', null)) || '';
  const logoUrl = (await getSetting('site_logo_url', null)) || '';

  const trimmedSiteUrl = siteUrl.endsWith('/') ? siteUrl.slice(0, -1) : siteUrl;
  const canonicalUrl = article.canonicalUrl || (trimmedSiteUrl + '/article/' + article.slug);

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.seoTitle || article.title,
    description: article.seoDescription || article.excerpt || undefined,
    image: article.featuredImage ? [article.featuredImage] : undefined,
    datePublished: article.publishedAt ? new Date(article.publishedAt).toISOString() : undefined,
    dateModified: article.updatedAt ? new Date(article.updatedAt).toISOString() : undefined,
    author: article.author ? { '@type': 'Person', name: article.author.name } : undefined,
    publisher: siteName ? {
      '@type': 'Organization',
      name: siteName,
      logo: logoUrl ? { '@type': 'ImageObject', url: logoUrl } : undefined,
    } : undefined,
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
    keywords: [article.focusKeyword, article.kannadaKeyword].filter(Boolean).join(', ') || undefined,
    articleSection: article.category ? article.category.name : undefined,
  };

  Object.keys(schema).forEach(k => schema[k] === undefined && delete schema[k]);
  if (schema.author) Object.keys(schema.author).forEach(k => schema.author[k] === undefined && delete schema.author[k]);
  if (schema.publisher) {
    Object.keys(schema.publisher).forEach(k => schema.publisher[k] === undefined && delete schema.publisher[k]);
  }

  return schema;
}

module.exports = { generateArticleSchema };
