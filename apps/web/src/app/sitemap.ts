import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jagalchi.justn.me';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const indexableRoutes: Array<{
    path: string;
    changeFrequency: 'daily' | 'weekly' | 'yearly';
    priority: number;
  }> = [
    { path: '', changeFrequency: 'weekly', priority: 1 },
    { path: '/community', changeFrequency: 'daily', priority: 0.9 },
    { path: '/login', changeFrequency: 'yearly', priority: 0.3 },
    { path: '/register', changeFrequency: 'yearly', priority: 0.3 },
  ];

  // Random-ID Proof Profiles are intentionally absent: discovery is link-only and noindex.
  return indexableRoutes.map(({ path, changeFrequency, priority }) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));
}
