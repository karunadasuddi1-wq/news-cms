const { JWT } = require('google-auth-library');

function resolveDateRange({ days, startDate, endDate } = {}) {
  if (startDate && endDate) return { startDate, endDate };
  const resolvedDays = days || 365;
  const end = new Date().toISOString().slice(0, 10);
  const start = new Date(Date.now() - resolvedDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return { startDate: start, endDate: end };
}

function buildClient(serviceAccountJsonRaw) {
  let creds;
  try {
    creds = JSON.parse(serviceAccountJsonRaw);
  } catch (err) {
    throw new Error('Google service account JSON is not valid JSON — check what was pasted into Settings.');
  }
  if (!creds.client_email || !creds.private_key) {
    throw new Error('Service account JSON is missing client_email or private_key.');
  }
  return new JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
  });
}

async function fetchGA4ViewsBySlug(propertyId, serviceAccountJsonRaw, dateOptions = {}) {
  const client = buildClient(serviceAccountJsonRaw);
  const { startDate, endDate } = resolveDateRange(dateOptions);

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

async function fetchGA4DailyHuntViewsByTitle(propertyId, serviceAccountJsonRaw, dateOptions = {}, pathPrefix = '/KannadaDunia/home/kannada/') {
  const client = buildClient(serviceAccountJsonRaw);
  const { startDate, endDate } = resolveDateRange(dateOptions);

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

module.exports = { fetchGA4ViewsBySlug, fetchGA4DailyHuntViewsByTitle, resolveDateRange };
