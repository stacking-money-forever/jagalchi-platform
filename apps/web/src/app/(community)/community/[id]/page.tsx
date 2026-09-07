import { Suspense } from 'react';

import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function RedirectToViewer({ params }: PageProps) {
  const { id } = await params;
  return redirect(`/viewer/${id}`);
}

export default function RoadmapDetailPage({ params }: PageProps) {
  return (
    <Suspense fallback={null}>
      <RedirectToViewer params={params} />
    </Suspense>
  );
}
