const { JWT } = require('google-auth-library');

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

// Fetches pageview counts grouped by page title, for pageviews whose path
// starts with DailyHunt's own internal reader path prefix (e.g.
// /KannadaDunia/home/kannada/n7190003517) rather than our real article slug.
//
// This does NOT filter by referral source — DailyHunt's in-app reader/WebView
// typically shows up in GA4 as (direct) traffic with no referrer at all, so a
// sessionSourceMedium filter matches nothing. The reliable signal is the
// distinctive path prefix DailyHunt's own reader uses, confirmed directly
// against real GA4 data.
//
// `pathPrefix` should match what you see in your own GA4 report — check a
// known-syndicated article's path there and adjust if it differs from the
// default below.
async function fetchGA4DailyHuntViewsByTitle(propertyId, serviceAccountJsonRaw, days = 365, pathPrefix = '/KannadaDunia/home/kannada/') {
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
        dimensions: [{ name: 'pageTitle' }, { name: 'pagePath' }],
        metrics: [{ name: 'screenPageViews' }],
        dimensionFilter: {
          filter: {
            fieldName: 'pagePath',
            stringFilter: { matchType: 'BEGINS_WITH', value: pathPrefix },
          },
        },
        limit: 100000,
      },
    });
  } catch (err) {
    const detail = err.response?.data?.error?.message || err.message;
    throw new Error(`Google Analytics API request failed (DailyHunt query): ${detail}`);
  }

  const viewsByTitle = {};
  const rows = res.data?.rows || [];
  for (const row of rows) {
    let title = row.dimensionValues?.[0]?.value || '';
    title = title.replace(/\s*-\s*KannadaDunia\.com\s*$/i, '').trim();
    const views = parseInt(row.metricValues?.[0]?.value, 10) || 0;
    if (!title) continue;
    viewsByTitle[title] = (viewsByTitle[title] || 0) + views;
  }
  return viewsByTitle;
}

module.exports = { fetchGA4ViewsBySlug, fetchGA4DailyHuntViewsByTitle };
