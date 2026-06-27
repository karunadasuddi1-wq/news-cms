// ONE-TIME date fix endpoint — delete after use
router.post('/fix-dates', async (req, res) => {
  const https = require('https');
  const { Article } = require('../models');
  
  // Fetch one page of WP posts
  const page = req.body.page || 1;
  const url = `https://karunadasuddi.in/wp-json/wp/v2/posts?per_page=50&page=${page}&status=publish&_fields=slug,date_gmt`;
  
  https.get(url, (wpRes) => {
    let data = '';
    wpRes.on('data', chunk => data += chunk);
    wpRes.on('end', async () => {
      const posts = JSON.parse(data);
      let fixed = 0;
      for (const post of posts) {
        const updated = await Article.update(
          { publishedAt: new Date(post.date_gmt + 'Z') },
          { where: { slug: post.slug } }
        );
        if (updated[0] > 0) fixed++;
      }
      res.json({ 
        page, 
        fixed, 
        total: posts.length,
        hasMore: posts.length === 50 
      });
    });
  }).on('error', err => res.status(500).json({ error: err.message }));
});
