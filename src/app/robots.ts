import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/admin/', '/verificar-edad', '/verificar-edad/'],
      },
    ],
    sitemap: 'https://fun4me.sunstein.cloud/sitemap.xml',
  };
}
