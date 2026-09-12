import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jagalchi.justn.me';
const IS_PRODUCTION = process.env.NEXT_PUBLIC_ENV === 'production';
const PRIVATE_PATHS = ['/api/', '/career', '/editor', '/myroadmap', '/profile'];

export default function robots(): MetadataRoute.Robots {
  if (!IS_PRODUCTION) {
    return {
      rules: [{ userAgent: '*', disallow: '/' }],
    };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: PRIVATE_PATHS,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
