'use client';

import { useState, useSyncExternalStore } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, LockKeyhole, RotateCcw, Smartphone } from 'lucide-react';

import { getTicketPurchaseContext } from '@/api/tickets';
import { Button } from '@/components/ui/button';
import { hasNativeBridge, NativeBridgeError, requestNative } from '@/lib/native-bridge';

import type { TicketPack } from '../types';

type ProductResult = {
  id: string;
  action: 'products';
  ok: true;
  products: Array<{ productId: string; title: string; displayPrice: string }>;
};
type PurchaseResult = {
  id: string;
  action: 'purchase';
  ok: true;
  state: 'fulfilled' | 'already-fulfilled' | 'pending';
  productId: string;
  tickets?: number;
  balance?: number;
};
type RestoreResult = {
  id: string;
  action: 'restore-purchases';
  ok: true;
  state: 'restored';
  items: Array<{
    productId: string;
    state: 'fulfilled' | 'already-fulfilled' | 'pending';
    tickets?: number;
  }>;
  balance?: number;
};

const priceFormatter = new Intl.NumberFormat('ko-KR', {
  style: 'currency',
  currency: 'KRW',
  maximumFractionDigits: 0,
});
const subscribe = () => () => {};

export function TicketCheckout({ pack }: { pack: TicketPack }) {
  // The web session is HttpOnly and must never be forwarded through the native bridge.
  // Native purchase stays disabled until the native shell owns a SecureStore token session.
  const nativeAccessToken: string | null = null;
  const queryClient = useQueryClient();
  const native = useSyncExternalStore(subscribe, hasNativeBridge, () => false);
  const [busy, setBusy] = useState<'purchase' | 'restore' | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const context = useQuery({
    queryKey: ['tickets', 'purchase-context'],
    queryFn: getTicketPurchaseContext,
    enabled: native && Boolean(nativeAccessToken),
  });

  const products = useQuery({
    queryKey: ['tickets', 'store-products'],
    queryFn: () => requestNative<ProductResult>('products'),
    enabled: native,
    staleTime: 5 * 60_000,
  });
  const product = products.data?.products.find(
    (candidate) => candidate.productId === pack.storeProductId,
  );
  const displayPrice = product?.displayPrice ?? priceFormatter.format(pack.priceKrw);
  const productAvailable = Boolean(product);

  const refreshWallet = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['tickets', 'balance'] }),
      queryClient.invalidateQueries({ queryKey: ['tickets', 'ledger'] }),
    ]);
  };

  const purchase = async () => {
    if (!nativeAccessToken || !context.data || !productAvailable) return;
    setBusy('purchase');
    setError(null);
    setNotice(null);
    try {
      const result = await requestNative<PurchaseResult>('purchase', {
        productId: pack.storeProductId,
        accessToken: nativeAccessToken,
        appleAppAccountToken: context.data.appleAppAccountToken,
        googleObfuscatedAccountId: context.data.googleObfuscatedAccountId,
      });
      if (result.state === 'pending') {
        setNotice('결제 승인을 기다리고 있어요. 승인 뒤 구매 복원에서 다시 확인할 수 있습니다.');
      } else {
        await refreshWallet();
        setNotice(
          result.state === 'fulfilled'
            ? `${result.tickets ?? pack.tickets}장이 지급됐어요. 현재 잔액은 ${result.balance ?? 0}장이에요.`
            : '이미 지급된 구매를 확인했어요. 티켓 잔액을 새로고침했습니다.',
        );
      }
    } catch (reason) {
      if (reason instanceof NativeBridgeError && reason.code === 'cancelled') {
        setNotice('결제가 취소되었습니다. 티켓은 차감되거나 지급되지 않았어요.');
      } else {
        setError(reason instanceof Error ? reason.message : '결제를 완료하지 못했습니다.');
      }
    } finally {
      setBusy(null);
    }
  };

  const restore = async () => {
    if (!nativeAccessToken) return;
    setBusy('restore');
    setError(null);
    setNotice(null);
    try {
      const result = await requestNative<RestoreResult>('restore-purchases', {
        accessToken: nativeAccessToken,
      });
      await refreshWallet();
      const recovered = result.items.filter((item) => item.state !== 'pending').length;
      const pending = result.items.length - recovered;
      setNotice(
        recovered || pending
          ? `미완료 구매 ${recovered}건을 복원했고 ${pending}건은 승인 대기 중이에요.`
          : '복원할 미완료 구매가 없어요. 계정의 기존 티켓 잔액은 새로고침했습니다.',
      );
    } catch (reason) {
      if (reason instanceof NativeBridgeError && reason.code === 'recovery-required') {
        const partial = reason.result as {
          items?: Array<{ state?: string }>;
        };
        const restored =
          partial.items?.filter(
            (item) => item.state === 'fulfilled' || item.state === 'already-fulfilled',
          ).length ?? 0;
        await refreshWallet();
        setError(
          restored > 0
            ? `${restored}건은 복원했지만 일부 구매는 완료하지 못했습니다. 다시 시도해 주세요.`
            : reason.message,
        );
      } else {
        setError(reason instanceof Error ? reason.message : '구매 복원을 완료하지 못했습니다.');
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mt-5">
      <div className="border-border flex items-center justify-between border-t pt-5">
        <span className="text-sm font-bold">결제 금액</span>
        <strong className="text-xl font-black">{displayPrice}</strong>
      </div>

      <aside className="border-warning/30 bg-warning-subtle mt-5 rounded-2xl border p-5">
        <div className="flex gap-3">
          {native ? (
            <Smartphone aria-hidden="true" className="text-warning mt-0.5 size-5 shrink-0" />
          ) : (
            <LockKeyhole aria-hidden="true" className="text-warning mt-0.5 size-5 shrink-0" />
          )}
          <div>
            <h2 className="text-sm font-extrabold">
              {native ? 'App Store · Google Play 안전 결제' : '웹 결제 준비 중'}
            </h2>
            <p className="text-muted-foreground mt-1 text-xs leading-5">
              {native
                ? '스토어가 결제를 승인하고 서버가 거래를 검증한 뒤에만 티켓을 지급합니다.'
                : '현재 웹에서는 결제를 처리하지 않습니다. iOS·Android 앱의 스토어 결제를 이용해 주세요.'}
            </p>
          </div>
        </div>
      </aside>

      {notice ? (
        <p
          role="status"
          className="bg-success-subtle text-success mt-4 rounded-xl p-4 text-sm font-bold"
        >
          <CheckCircle2 aria-hidden="true" className="mr-2 inline size-4" />
          {notice}
        </p>
      ) : null}
      {error || context.isError || products.isError || (products.isSuccess && !product) ? (
        <p
          role="alert"
          className="bg-error-subtle text-error mt-4 rounded-xl p-4 text-sm font-bold"
        >
          {error ??
            (products.isError || (products.isSuccess && !product)
              ? '스토어 상품을 불러오지 못했습니다.'
              : '구매용 계정 정보를 불러오지 못했습니다.')}
        </p>
      ) : null}

      <Button
        type="button"
        intent="ticket"
        size="lg"
        className="mt-6 w-full"
        disabled={!native || !nativeAccessToken || !context.data || !productAvailable}
        loading={(native && products.isPending) || busy === 'purchase'}
        loadingLabel={native && products.isPending ? '스토어 상품 확인 중…' : '결제 확인 중…'}
        onClick={() => void purchase()}
      >
        {!native
          ? '모바일 앱에서 구매 가능'
          : !nativeAccessToken
            ? '네이티브 세션 전환 후 구매 가능'
            : `${displayPrice} 결제하기`}
      </Button>
      {native ? (
        <Button
          type="button"
          intent="neutral"
          variant="ghost"
          className="mt-2 w-full"
          loading={busy === 'restore'}
          loadingLabel="구매 복원 중…"
          disabled={!nativeAccessToken || busy !== null}
          onClick={() => void restore()}
        >
          <RotateCcw aria-hidden="true" />
          구매 복원
        </Button>
      ) : null}
    </div>
  );
}
