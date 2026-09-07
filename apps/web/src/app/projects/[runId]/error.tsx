'use client';

export default function ProjectRunError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <main role="alert" className="mx-auto max-w-xl p-8">
      <h1 className="text-2xl font-bold">프로젝트 실행을 불러오지 못했어요</h1>
      <button className="mt-5 rounded-lg border px-4 py-2 font-semibold" onClick={retry}>
        다시 시도
      </button>
    </main>
  );
}
