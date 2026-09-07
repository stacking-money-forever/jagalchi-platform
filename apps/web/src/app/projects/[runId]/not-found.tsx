import Link from 'next/link';

export default function ProjectRunNotFound() {
  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="text-2xl font-bold">프로젝트 실행을 찾을 수 없어요</h1>
      <Link href="/" className="mt-5 inline-flex rounded-lg border px-4 py-2 font-semibold">
        홈으로
      </Link>
    </main>
  );
}
