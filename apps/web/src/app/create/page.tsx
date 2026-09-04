import Link from 'next/link';

import { ArrowRight, FileCheck2, PencilLine, Target } from 'lucide-react';

import { AppShell } from '@/components/app-shell/app-shell';
import { isEnabled } from '@/lib/feature-flags';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '실행 과제 만들기',
  description: '목표 공고에서 부족한 증거를 찾거나 직접 실행 과제를 구성하세요.',
};

export default function CreatePage() {
  const evidenceEnabled = isEnabled('EVIDENCE_EXECUTION_ENABLED');

  return (
    <AppShell activeTab="create">
      <div className="mx-auto w-full max-w-5xl">
        <header>
          <p className="text-primary text-sm font-bold">결과물에서 시작하기</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
            다음 증거 하나를 실행 과제로 만드세요
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-6 sm:text-base">
            목표 공고에서 부족한 증거를 찾고, PR·테스트·배포로 끝나는 실행 단계를 구성합니다.
          </p>
        </header>

        <section aria-labelledby="creation-method-heading" className="mt-8">
          <h2 id="creation-method-heading" className="sr-only">
            실행 계획 시작 방법
          </h2>
          <div className="grid gap-5 md:grid-cols-2">
            {evidenceEnabled ? (
              <Link
                href="/projects/new"
                className="group border-primary/30 bg-primary-subtle hover:border-primary/60 focus-visible:ring-ring flex min-h-80 flex-col rounded-3xl border p-6 transition-[transform,box-shadow,border-color] outline-none hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-offset-2 sm:p-8"
              >
                <span className="bg-primary text-primary-foreground flex size-12 items-center justify-center rounded-2xl shadow-sm">
                  <Target aria-hidden="true" className="size-6" />
                </span>
                <div className="mt-7">
                  <p className="text-primary text-xs font-extrabold">목표 직무가 있다면</p>
                  <h3 className="mt-2 text-xl font-extrabold tracking-tight sm:text-2xl">
                    목표 공고에서 시작
                  </h3>
                  <p className="text-muted-foreground mt-3 text-sm leading-6">
                    채용공고가 요구하는 역량과 내 GitHub·배포·기술 문서를 비교해 다음에 만들 증거를
                    정합니다.
                  </p>
                </div>
                <span className="bg-primary text-primary-foreground hover:bg-primary-hover mt-auto flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-extrabold">
                  부족한 증거 확인
                  <ArrowRight aria-hidden="true" className="size-4" />
                </span>
              </Link>
            ) : null}

            <Link
              href="/myroadmap"
              className="group border-border bg-card hover:border-primary/40 focus-visible:ring-ring flex min-h-80 flex-col rounded-3xl border p-6 transition-[transform,box-shadow,border-color] outline-none hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-offset-2 sm:p-8"
            >
              <span className="bg-primary-subtle text-primary flex size-12 items-center justify-center rounded-2xl">
                <PencilLine aria-hidden="true" className="size-6" />
              </span>
              <div className="mt-7">
                <p className="text-primary text-xs font-extrabold">진행할 과제가 있다면</p>
                <h3 className="mt-2 text-xl font-extrabold tracking-tight sm:text-2xl">
                  실행 과제 확인·관리
                </h3>
                <p className="text-muted-foreground mt-3 text-sm leading-6">
                  내 실행 과제 화면을 열어 현재 단계와 작업을 확인하고 이어서 관리합니다.
                </p>
              </div>
              <span className="border-border bg-background group-hover:bg-accent mt-auto flex min-h-12 items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-extrabold">
                실행 과제 열기
                <ArrowRight aria-hidden="true" className="size-4" />
              </span>
            </Link>
          </div>
        </section>

        <aside className="border-border bg-muted/40 mt-8 rounded-2xl border p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <FileCheck2 aria-hidden="true" className="text-success mt-0.5 size-5 shrink-0" />
            <div>
              <h2 className="font-extrabold">완료는 결과물로 증명합니다</h2>
              <p className="text-muted-foreground mt-1 text-sm leading-6">
                GitHub PR, 테스트 결과, 배포 URL과 기술 문서를 각 단계의 증거로 연결하세요.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
