import { cache } from 'react';

import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  getPublicProofProfile,
  PublicProofProfileUnavailableError,
  type PublicProofCriterionType,
} from '@/api/proof-profile';
import { isEnabled } from '@/lib/feature-flags';

import type { Metadata } from 'next';

export const instant = false;

interface ProofProfilePageProps {
  params: Promise<{ publicId: string }>;
}

const CRITERION_LABELS: Record<PublicProofCriterionType, string> = {
  MERGED_PR: '병합 완료',
  BASE_BRANCH: '기준 브랜치',
  CHANGED_PATH: '변경 범위',
  NAMED_CHECK: '자동 검사',
  HUMAN_CHECK: '사람 검토',
};

const loadPublicProfile = cache(getPublicProofProfile);

function safeDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '검증 완료';
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

async function loadOrNotFound(publicId: string) {
  try {
    return await loadPublicProfile(publicId);
  } catch (error) {
    if (error instanceof PublicProofProfileUnavailableError) notFound();
    throw new Error('공개 프로필을 불러오지 못했습니다.');
  }
}

export async function generateMetadata({ params }: ProofProfilePageProps): Promise<Metadata> {
  if (!isEnabled('PROOF_PROFILE_ENABLED')) {
    return {
      title: 'Proof Profile',
      description: '검증된 실행 증거를 확인하세요.',
      icons: { icon: '/favicon.ico' },
      robots: { index: false, follow: false },
    };
  }

  const { publicId } = await params;
  try {
    const { profile } = await loadPublicProfile(publicId);
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jagalchi.dev').replace(/\/$/, '');
    return {
      title: `${profile.displayName} — Proof Profile`,
      description: profile.summary ?? '검증된 실행 증거를 확인하세요.',
      alternates: {
        canonical: `${siteUrl}/proof/${encodeURIComponent(profile.publicId)}`,
      },
      icons: { icon: '/favicon.ico' },
      robots: { index: false, follow: false },
    };
  } catch {
    return {
      title: 'Proof Profile',
      description: '검증된 실행 증거를 확인하세요.',
      icons: { icon: '/favicon.ico' },
      robots: { index: false, follow: false },
    };
  }
}

export default async function ProofProfilePage({ params }: ProofProfilePageProps) {
  if (!isEnabled('PROOF_PROFILE_ENABLED')) notFound();

  const { publicId } = await params;
  const profile = await loadOrNotFound(publicId);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col px-5 py-8 sm:px-8 sm:py-12 lg:px-10">
        <header className="flex items-center justify-between border-b border-white/10 pb-6">
          <Link href="/" className="text-sm font-semibold tracking-[0.18em] text-sky-300">
            JAGALCHI
          </Link>
          <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200">
            검증된 Proof Profile
          </span>
        </header>

        <section className="py-12 sm:py-16">
          <p className="mb-3 text-sm font-medium text-sky-300">실행으로 증명한 커리어</p>
          <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-white sm:text-5xl">
            {profile.profile.displayName}
          </h1>
          {profile.profile.summary ? (
            <p className="mt-5 max-w-2xl text-base leading-7 whitespace-pre-wrap text-slate-300 sm:text-lg">
              {profile.profile.summary}
            </p>
          ) : null}
        </section>

        <section aria-labelledby="proofs-heading" className="pb-16">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm text-slate-400">공개된 증거</p>
              <h2 id="proofs-heading" className="mt-1 text-2xl font-semibold text-white">
                검증된 실행 기록
              </h2>
            </div>
            <span className="text-sm text-slate-400 tabular-nums">{profile.proofs.length}개</span>
          </div>

          {profile.proofs.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-2">
              {profile.proofs.map((proof) => (
                <article
                  key={proof.publicProofId}
                  className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-xl shadow-black/10 sm:p-7"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-sky-400/10 px-3 py-1 text-xs font-semibold text-sky-200">
                      {proof.competencyLabel}
                    </span>
                    <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                      검증 완료
                    </span>
                  </div>

                  <h3 className="mt-5 text-xl leading-8 font-semibold text-white">{proof.title}</h3>
                  {proof.summary ? (
                    <p className="mt-3 text-sm leading-6 whitespace-pre-wrap text-slate-300">
                      {proof.summary}
                    </p>
                  ) : null}

                  <div className="mt-6 border-t border-white/10 pt-5">
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span className="text-slate-400">검증 기준</span>
                      <strong className="font-semibold text-slate-100 tabular-nums">
                        {proof.criteria.passedCount}/{proof.criteria.totalCount} 통과
                      </strong>
                    </div>
                    <ul aria-label="검증 기준 유형" className="mt-3 flex flex-wrap gap-2">
                      {proof.criteria.types.map((type) => (
                        <li
                          key={type}
                          className="rounded-md border border-white/10 bg-slate-900/70 px-2.5 py-1 text-xs text-slate-300"
                        >
                          {CRITERION_LABELS[type]}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <p className="mt-auto pt-6 text-xs text-slate-500">
                    <time dateTime={proof.verification.verifiedAt}>
                      {safeDate(proof.verification.verifiedAt)} 검증
                    </time>
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-6 py-12 text-center text-sm text-slate-400">
              현재 공개된 실행 증거가 없습니다.
            </div>
          )}
        </section>

        <footer className="border-t border-white/10 py-6 text-xs leading-5 text-slate-500">
          이 프로필은 소유자가 공개를 선택한 일반 정보와 검증 결과만 보여줍니다.
        </footer>
      </div>
    </main>
  );
}
