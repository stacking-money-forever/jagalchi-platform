'use client';

export default function GlobalError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="ko">
      <body>
        <main role="alert" style={{ padding: 32 }}>
          <h1>화면을 표시하지 못했습니다</h1>
          <button onClick={retry}>다시 시도</button>
        </main>
      </body>
    </html>
  );
}
