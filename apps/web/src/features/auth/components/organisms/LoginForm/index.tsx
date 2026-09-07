'use client';

import { useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { useSetAtom } from 'jotai';
import { useForm } from 'react-hook-form';

import { getAppleOAuthUrl, getGithubOAuthUrl, getGoogleOAuthUrl } from '@/api/auth';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { AUTH_MESSAGES } from '@/constants/messages';
import { capture } from '@/lib/analytics/client';

import { useLogin } from '../../../hooks/use-login';
import { loginSchema, type LoginSchema } from '../../../schemas/auth.schema';
import { loginAtom } from '../../../stores/auth.atoms';
import { beginOAuth } from '../../../utils/oauth';
import { AppleAuthButton } from '../../atoms/AppleAuthButton';
import { GitHubAuthButton } from '../../atoms/GitHubAuthButton';
import { GoogleAuthButton } from '../../atoms/GoogleAuthButton';
import { PasswordInput } from '../../molecules/PasswordInput';

export function LoginForm() {
  const router = useRouter();
  const loginMutation = useLogin();
  const setLogin = useSetAtom(loginAtom);
  const [activeOAuthProvider, setActiveOAuthProvider] = useState<
    'google' | 'github' | 'apple' | null
  >(null);

  const form = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = (data: LoginSchema) => {
    loginMutation.mutate(data, {
      onSuccess: (response) => {
        capture('login_completed', { method: 'email' });
        setLogin(response);
        router.push('/');
      },
      onError: (error) => {
        form.setError('root', { message: error.message });
      },
    });
  };

  const handleOAuth = async (provider: 'google' | 'github' | 'apple', authorizationUrl: string) => {
    setActiveOAuthProvider(provider);
    try {
      const session = await beginOAuth(authorizationUrl);
      if (session) {
        setLogin(session);
        router.replace('/');
      }
    } catch (error) {
      form.setError('root', {
        message: error instanceof Error ? error.message : '소셜 로그인을 완료하지 못했습니다.',
      });
    } finally {
      setActiveOAuthProvider(null);
    }
  };

  const handleGoogleLogin = () => {
    void handleOAuth('google', getGoogleOAuthUrl());
  };

  const handleGitHubLogin = () => {
    void handleOAuth('github', getGithubOAuthUrl());
  };

  const handleAppleLogin = () => {
    void handleOAuth('apple', getAppleOAuthUrl());
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{AUTH_MESSAGES.EMAIL_LABEL}</FormLabel>
              <FormControl>
                <Input type="email" placeholder={AUTH_MESSAGES.EMAIL_PLACEHOLDER} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>{AUTH_MESSAGES.PASSWORD_LABEL}</FormLabel>
                <Link
                  href="/find-password"
                  className="text-muted-foreground hover:text-foreground focus-visible:ring-ring rounded-md text-sm font-semibold underline underline-offset-4 transition-colors outline-none focus-visible:ring-2"
                >
                  {AUTH_MESSAGES.PASSWORD_FORGOT}
                </Link>
              </div>
              <FormControl>
                <PasswordInput placeholder={AUTH_MESSAGES.PASSWORD_PLACEHOLDER} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {form.formState.errors.root && (
          <p className="text-destructive text-sm">{form.formState.errors.root.message}</p>
        )}

        <div className="flex flex-col gap-3">
          <Button
            type="submit"
            className="min-h-12 w-full rounded-xl font-bold"
            loading={loginMutation.isPending}
            loadingLabel={AUTH_MESSAGES.LOGIN_LOADING}
            disabled={activeOAuthProvider !== null}
          >
            {AUTH_MESSAGES.LOGIN_LABEL}
          </Button>
          <Separator className="my-2" />
          <GoogleAuthButton
            variant="login"
            onClick={handleGoogleLogin}
            disabled={activeOAuthProvider !== null}
            loading={activeOAuthProvider === 'google'}
          />
          <GitHubAuthButton
            variant="login"
            onClick={handleGitHubLogin}
            disabled={activeOAuthProvider !== null}
            loading={activeOAuthProvider === 'github'}
          />
          <AppleAuthButton
            variant="login"
            onClick={handleAppleLogin}
            disabled={activeOAuthProvider !== null}
            loading={activeOAuthProvider === 'apple'}
          />
        </div>
      </form>
    </Form>
  );
}
