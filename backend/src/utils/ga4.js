const { JWT } = require('google-auth-library');

// Fetches pageview counts per URL path from Google Analytics 4, for the given
// property, over the last `days` days. Returns a map of { slug: viewCount }.
//
// Requires a GA4 service account JSON key (with the service account already
// granted Viewer access on the property in Google Analytics — see the
// onboarding runbook for the full setup steps) and the numeric GA4 Property ID.
async function fetchGA4ViewsBySlug(propertyId, serviceAccountJsonRaw, days = 365) {
  let creds;
  try {
    creds = JSON.parse(serviceAccountJsonRaw);
  } catch (err) {
    throw new Error('Google service account JSON is not valid JSON — check what was pasted into Settings.');
  }

  if (!creds.client_email || !creds.private_key) {
    throw new Error('Service account JSON is missing client_email or private_key.');
  }

  const client = new JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
  });

  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  let res;
  try {
    res = await client.request({
      url: `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      method: 'POST',
      data: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'screenPageViews' }],
        limit: 100000,
      },
    });
  } catch (err) {
    const detail = err.response?.data?.error?.message || err.message;
    throw new Error(`Google Analytics API request failed: ${detail}`);
  }

  const viewsBySlug = {};
  const rows = res.data?.rows || [];

  for (const row of rows) {
    const pagePath = row.dimensionValues?.[0]?.value || '';
    const views = parseInt(row.metricValues?.[0]?.value, 10) || 0;

    const slug = pagePath.split('?')[0].split('#')[0].replace(/^\/|\/$/g, '');
    if (!slug) continue;

    viewsBySlug[slug] = (viewsBySlug[slug] || 0) + views;
  }

  return viewsBySlug;
}

module.exports = { fetchGA4ViewsBySlug };
