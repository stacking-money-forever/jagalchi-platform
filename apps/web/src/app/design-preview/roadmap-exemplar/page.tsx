import RoadmapExemplarPage from '@/design/roadmap-exemplar/map-exemplar';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '실행 로드맵 Map: 디자인 exemplar',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <RoadmapExemplarPage />;
}
