import { exchangeOAuthCode } from '@/api/auth';
import { capture } from '@/lib/analytics/client';
import { hasNativeBridge, requestNative } from '@/lib/native-bridge';

type NativeOAuthResult = {
  id: string;
  action: 'oauth';
  ok: true;
  callbackUrl: string;
};

async function requestNativeOAuth(authorizationUrl: string): Promise<string> {
  const nativeReturnUrl = 'jagalchi://oauth/callback';
  const startUrl = new URL(authorizationUrl, window.location.origin);
  startUrl.searchParams.set('returnUrl', nativeReturnUrl);
  const result = await requestNative<NativeOAuthResult>('oauth', {
    authorizationUrl: startUrl.toString(),
    callbackUrl: nativeReturnUrl,
  });
  return result.callbackUrl;
}

export async function beginOAuth(
  authorizationUrl: string,
): Promise<Awaited<ReturnType<typeof exchangeOAuthCode>> | null> {
  if (!hasNativeBridge()) {
    window.location.assign(authorizationUrl);
    return null;
  }
  const callbackUrl = new URL(await requestNativeOAuth(authorizationUrl));
  const code = callbackUrl.searchParams.get('code');
  if (!code) throw new Error('OAuth 완료 코드가 누락되었습니다.');
  const result = await exchangeOAuthCode(code);
  capture('oauth_completed', {});
  return result;
}
