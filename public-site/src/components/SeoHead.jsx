import { useEffect } from 'react';

const SITE_NAME = import.meta.env.VITE_SITE_NAME || 'ಕನ್ನಡ ನ್ಯೂಸ್';
const SITE_URL = (import.meta.env.VITE_SITE_URL || '').replace(/\/$/, '');
const DEFAULT_IMAGE = import.meta.env.VITE_DEFAULT_OG_IMAGE || '';

function setMeta(property, content, isName = false) {
  if (!content) return;
  const attr = isName ? 'name' : 'property';
  let el = document.querySelector(`meta[${attr}="${property}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, property);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function removeMeta(property, isName = false) {
  const attr = isName ? 'name' : 'property';
  const el = document.querySelector(`meta[${attr}="${property}"]`);
  if (el) el.remove();
}

function setLink(rel, href) {
  let el = document.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function setJsonLd(data) {
  let el = document.querySelector('script[type="application/ld+json"]');
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

export default function SeoHead({ article, category, pageTitle }) {
  useEffect(() => {
    if (article) {
      const title = article.seoTitle || article.title;
      const description = article.seoDescription || article.excerpt || '';
      const image = article.ogImage || article.featuredImage || DEFAULT_IMAGE;
      // Use category/slug URL format for better SEO
      const categorySlug = article.category?.slug || 'news';
      const canonical = article.canonicalUrl || `${SITE_URL}/${categorySlug}/${article.slug}`;
      const publishedAt = article.publishedAt ? new Date(article.publishedAt).toISOString() : '';
      const updatedAt = article.updatedAt ? new Date(article.updatedAt).toISOString() : '';

      document.title = `${title} | ${SITE_NAME}`;
      document.documentElement.lang = 'kn';

      if (article.noIndex) setMeta('robots', 'noindex,nofollow', true);
      else removeMeta('robots', true);

      setMeta('description', description, true);
      if (article.focusKeyword) setMeta('keywords', article.focusKeyword, true);
      setMeta('news_keywords', article.focusKeyword || article.title, true);
      setLink('canonical', canonical);

      setMeta('og:type', 'article');
      setMeta('og:title', title);
      setMeta('og:description', description);
      setMeta('og:url', canonical);
      setMeta('og:site_name', SITE_NAME);
      setMeta('og:locale', 'kn_IN');
      if (image) { setMeta('og:image', image); setMeta('og:image:width', '1200'); setMeta('og:image:height', '630'); }
      if (publishedAt) setMeta('article:published_time', publishedAt);
      if (updatedAt) setMeta('article:modified_time', updatedAt);
      if (article.category) setMeta('article:section', article.category.name);
      if (article.focusKeyword) setMeta('article:tag', article.focusKeyword);

      setMeta('twitter:card', image ? 'summary_large_image' : 'summary', true);
      setMeta('twitter:title', title, true);
      setMeta('twitter:description', description, true);
      if (image) setMeta('twitter:image', image, true);

      setJsonLd({
        '@context': 'https://schema.org',
        '@type': 'NewsArticle',
        headline: article.title,
        description,
        image: image ? [image] : undefined,
        datePublished: publishedAt,
        dateModified: updatedAt,
        author: { '@type': 'Person', name: article.author?.name || SITE_NAME },
        publisher: {
          '@type': 'Organization',
          name: SITE_NAME,
          logo: { '@type': 'ImageObject', url: `${SITE_URL}/favicon.svg` },
        },
        mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
        articleSection: article.category?.name || '',
        keywords: article.focusKeyword || '',
        inLanguage: 'kn',
      });
    } else if (category) {
      document.title = `${category.name} ಸುದ್ದಿಗಳು | ${SITE_NAME}`;
      setMeta('description', `${category.name} ವಿಭಾಗದ ಇತ್ತೀಚಿನ ಸುದ್ದಿಗಳು`, true);
      setLink('canonical', `${SITE_URL}/category/${category.slug}`);
      setMeta('og:title', `${category.name} ಸುದ್ದಿ | ${SITE_NAME}`);
      setMeta('og:url', `${SITE_URL}/category/${category.slug}`);
      setMeta('og:site_name', SITE_NAME);
      removeMeta('robots', true);
    } else {
      const title = pageTitle ? `${pageTitle} | ${SITE_NAME}` : `${SITE_NAME} - ಇತ್ತೀಚಿನ ಕನ್ನಡ ಸುದ್ದಿ`;
      document.title = title;
      setMeta('description', 'ಇತ್ತೀಚಿನ ಕನ್ನಡ ಸುದ್ದಿ, ಸ್ಥಳೀಯ ಸುದ್ದಿ, ರಾಷ್ಟ್ರೀಯ ಹಾಗೂ ಅಂತರರಾಷ್ಟ್ರೀಯ ವಿದ್ಯಮಾನಗಳು.', true);
      setLink('canonical', SITE_URL || window.location.origin);
      setMeta('og:type', 'website');
      setMeta('og:title', title);
      setMeta('og:url', SITE_URL || window.location.origin);
      setMeta('og:site_name', SITE_NAME);
      setMeta('og:locale', 'kn_IN');
      removeMeta('robots', true);
      setJsonLd({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: SITE_NAME,
        url: SITE_URL || window.location.origin,
        potentialAction: {
          '@type': 'SearchAction',
          target: `${SITE_URL || window.location.origin}/?search={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
        inLanguage: 'kn',
      });
    }
  }, [article, category, pageTitle]);

  return null;
}
