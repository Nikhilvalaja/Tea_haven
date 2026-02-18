const express = require('express');
const { Product } = require('../models');
const { cacheMiddleware } = require('../middleware/cache');

const router = express.Router();

// Dynamic product sitemap - cached for 1 hour
router.get('/sitemap-products.xml', cacheMiddleware('sitemap', 3600), async (req, res) => {
  try {
    const products = await Product.findAll({
      attributes: ['id', 'updatedAt'],
      where: { isActive: true },
      order: [['updatedAt', 'DESC']],
    });

    const urls = products.map(p => `
  <url>
    <loc>https://teahaven.duckdns.org/products/${p.id}</loc>
    <lastmod>${p.updatedAt.toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}
</urlset>`;

    res.set('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err) {
    res.status(500).set('Content-Type', 'application/xml').send(
      '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>'
    );
  }
});

module.exports = router;
