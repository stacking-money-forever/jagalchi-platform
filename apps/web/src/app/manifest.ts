import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '자갈치, 증거로 준비하는 개발자 커리어',
    short_name: '자갈치',
    description: '목표 직무의 요구 역량과 실제 결과물을 연결해 부족한 커리어 증거를 확인합니다.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    lang: 'ko',
    orientation: 'portrait',
    icons: [
      {
        src: '/jagalchi.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/favicon.ico',
        sizes: '32x32',
        type: 'image/x-icon',
      },
    ],
  };
}
