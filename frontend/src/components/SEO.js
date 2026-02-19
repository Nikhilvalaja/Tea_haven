import { Helmet } from 'react-helmet-async';

const SITE_URL = 'https://teahaven.learning.interchainlabs.com';
const SITE_NAME = 'TeaHaven';

const SEO = ({ title, description, path = '/', type = 'website', product = null }) => {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} - Premium Imported Tea | Shop Online`;
  const fullUrl = `${SITE_URL}${path}`;
  const defaultDescription = 'Shop premium imported teas from the world\'s finest tea gardens. Free shipping over $50.';

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description || defaultDescription} />
      <link rel="canonical" href={fullUrl} />

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description || defaultDescription} />
      <meta property="og:site_name" content={SITE_NAME} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description || defaultDescription} />

      {/* Product structured data */}
      {product && (
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: product.name,
            description: product.description,
            offers: {
              '@type': 'Offer',
              price: product.price,
              priceCurrency: 'USD',
              availability: product.stock > 0
                ? 'https://schema.org/InStock'
                : 'https://schema.org/OutOfStock',
              url: fullUrl,
            },
          })}
        </script>
      )}
    </Helmet>
  );
};

export default SEO;
