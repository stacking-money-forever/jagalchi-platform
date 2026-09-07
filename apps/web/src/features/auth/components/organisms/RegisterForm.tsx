'use client';

import { useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useSetAtom } from 'jotai';

import { getAppleOAuthUrl, getGithubOAuthUrl, getGoogleOAuthUrl } from '@/api/auth';
import { AUTH_MESSAGES } from '@/constants/messages';
import { capture } from '@/lib/analytics/client';

import { useRegister } from '../../hooks/use-register';
import { useUpdateProfileLinks } from '../../hooks/use-update-profile-links';
import { useVerifyCode } from '../../hooks/use-verify-code';
import { loginAtom } from '../../stores/auth.atoms';
import { beginOAuth } from '../../utils/oauth';

import { RegisterStep1Form } from './register-steps/RegisterStep1Form';
import { RegisterStep2Form } from './register-steps/RegisterStep2Form';
import { RegisterStep3Form } from './register-steps/RegisterStep3Form';

import type {
  RegisterStep1Schema,
  RegisterStep2Schema,
  RegisterStep3Schema,
} from '../../schemas/auth.schema';
import type { RegisterStep } from '../../types/auth.types';

interface RegisterFormProps {
  onStepChange?: (step: RegisterStep, title: string, description: string) => void;
}

function getLinksCountBucket(count: number): '0' | '1' | '2' | '3' | null {
  switch (count) {
    case 0:
      return '0';
    case 1:
      return '1';
    case 2:
      return '2';
    case 3:
      return '3';
    default:
      return null;
  }
}

export function RegisterForm({ onStepChange }: RegisterFormProps) {
  const router = useRouter();
  const setLogin = useSetAtom(loginAtom);
  const [step, setStep] = useState<RegisterStep>(1);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [activeOAuthProvider, setActiveOAuthProvider] = useState<
    'google' | 'github' | 'apple' | null
  >(null);
  const step1DataRef = useRef<RegisterStep1Schema | null>(null);
  const step2DataRef = useRef<RegisterStep2Schema | null>(null);
  const registrationProofRef = useRef<string | null>(null);

  const verifyCodeMutation = useVerifyCode();
  const registerMutation = useRegister();
  const updateLinksMutation = useUpdateProfileLinks();

  const handleStep1Submit = (data: RegisterStep1Schema) => {
    verifyCodeMutation.mutate(
      { email: data.email, code: data.verificationCode },
      {
        onSuccess: (response) => {
          step1DataRef.current = data;
          registrationProofRef.current = response.registrationProof;
          setStep(2);
          onStepChange?.(2, AUTH_MESSAGES.STEP2_TITLE, AUTH_MESSAGES.STEP2_DESCRIPTION);
        },
      },
    );
  };

  const handleStep2Submit = (data: RegisterStep2Schema) => {
    step2DataRef.current = data;
    setStep(3);
    onStepChange?.(3, AUTH_MESSAGES.STEP3_TITLE, AUTH_MESSAGES.STEP3_DESCRIPTION);
  };

  const completeRegistration = (links?: { name: string; url: string }[]) => {
    if (!step1DataRef.current || !step2DataRef.current || !registrationProofRef.current) return;

    registerMutation.mutate(
      {
        email: step1DataRef.current.email,
        name: step2DataRef.current.username,
        password: step1DataRef.current.password,
        registrationProof: registrationProofRef.current,
      },
      {
        onSuccess: async () => {
          const linksCountBucket = getLinksCountBucket(links?.length ?? 0);
          if (linksCountBucket) {
            capture('signup_completed', { method: 'email', links_count_bucket: linksCountBucket });
          }
          if (links && links.length > 0) {
            // 링크 반영 실패해도 회원가입 자체는 성공이라 흡수.
            // 사용자는 프로필 설정에서 추후 재입력 가능.
            try {
              await updateLinksMutation.mutateAsync(links);
            } catch {
              /* ignore — surface via profile settings later */
            }
          }
          router.push('/login');
        },
      },
    );
  };

  const handleStep3Submit = (data: RegisterStep3Schema) => {
    const links = [
      { name: data.link1Name ?? '', url: data.link1Url ?? '' },
      { name: data.link2Name ?? '', url: data.link2Url ?? '' },
      { name: data.link3Name ?? '', url: data.link3Url ?? '' },
    ].filter((link) => link.name && link.url);

    completeRegistration(links.length > 0 ? links : undefined);
  };

  const handleSkip = () => {
    completeRegistration();
  };

  const handleOAuth = async (provider: 'google' | 'github' | 'apple', authorizationUrl: string) => {
    setOauthError(null);
    setActiveOAuthProvider(provider);
    try {
      const session = await beginOAuth(authorizationUrl);
      if (session) {
        setLogin(session);
        router.replace('/');
      }
    } catch (error) {
      setOauthError(
        error instanceof Error ? error.message : '소셜 회원가입을 완료하지 못했습니다.',
      );
    } finally {
      setActiveOAuthProvider(null);
    }
  };

  const handleGoogleRegister = () => {
    void handleOAuth('google', getGoogleOAuthUrl());
  };

  const handleGitHubRegister = () => {
    void handleOAuth('github', getGithubOAuthUrl());
  };

  const handleAppleRegister = () => {
    void handleOAuth('apple', getAppleOAuthUrl());
  };

  if (step === 3) {
    return (
      <RegisterStep3Form
        onSubmit={handleStep3Submit}
        onSkip={handleSkip}
        isSubmitting={registerMutation.isPending}
        submitError={registerMutation.error?.message ?? null}
      />
    );
  }

  if (step === 2) {
    return <RegisterStep2Form onSubmit={handleStep2Submit} />;
  }

  return (
    <>
      <RegisterStep1Form
        onSubmit={handleStep1Submit}
        onSignupStart={() => capture('signup_started', { method: 'email' })}
        onGoogleRegister={handleGoogleRegister}
        onGitHubRegister={handleGitHubRegister}
        onAppleRegister={handleAppleRegister}
        isVerifying={verifyCodeMutation.isPending}
        verificationError={verifyCodeMutation.error?.message ?? null}
        activeOAuthProvider={activeOAuthProvider}
      />
      {oauthError ? (
        <p role="alert" className="text-destructive mt-4 text-sm">
          {oauthError}
        </p>
      ) : null}
    </>
  );
}
