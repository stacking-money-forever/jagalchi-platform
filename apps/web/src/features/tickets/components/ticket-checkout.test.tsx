import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const bridge = vi.hoisted(() => ({
  requestNative: vi.fn(),
  hasNativeBridge: vi.fn(() => true),
}));
const api = vi.hoisted(() => ({
  getTicketPurchaseContext: vi.fn(async () => ({
    appleAppAccountToken: '00000000-0000-4000-8000-000000000001',
    googleObfuscatedAccountId: 'a'.repeat(64),
  })),
}));

vi.mock('@/api/tickets', () => api);
vi.mock('@/lib/native-bridge', async () => {
  const actual = await vi.importActual<typeof import('@/lib/native-bridge')>('@/lib/native-bridge');
  return { ...actual, ...bridge };
});

import { TICKET_PACKS } from '../ticket-policy';
import { TicketCheckout } from './ticket-checkout';

function renderCheckout() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <TicketCheckout pack={TICKET_PACKS[0]} />
    </QueryClientProvider>,
  );
}

describe('TicketCheckout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bridge.hasNativeBridge.mockReturnValue(true);
    bridge.requestNative.mockImplementation(async (action: string) => {
      if (action === 'products') {
        return {
          id: 'products-1',
          action,
          ok: true,
          products: [
            {
              productId: TICKET_PACKS[0].storeProductId,
              title: '20 tickets',
              displayPrice: '₩3,900',
            },
          ],
        };
      }
      if (action === 'purchase') {
        return {
          id: 'purchase-1',
          action,
          ok: true,
          state: 'pending',
          productId: TICKET_PACKS[0].storeProductId,
        };
      }
      return { id: 'restore-1', action, ok: true, state: 'restored', items: [] };
    });
  });

  it('uses the localized store price but never forwards the web session to native', async () => {
    renderCheckout();
    expect(await screen.findByText('₩3,900')).toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: '네이티브 세션 전환 후 구매 가능' }),
    ).toBeDisabled();
    expect(bridge.requestNative).not.toHaveBeenCalledWith('purchase', expect.anything());
  });

  it('keeps restore disabled until the native shell owns a SecureStore session', async () => {
    renderCheckout();
    expect(await screen.findByRole('button', { name: '구매 복원' })).toBeDisabled();
    expect(bridge.requestNative).not.toHaveBeenCalledWith('restore-purchases', expect.anything());
  });

  it('disables purchase when the approved SKU is unavailable', async () => {
    bridge.requestNative.mockResolvedValueOnce({
      id: 'products-1',
      action: 'products',
      ok: true,
      products: [],
    });
    renderCheckout();
    expect(await screen.findByText('스토어 상품을 불러오지 못했습니다.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '네이티브 세션 전환 후 구매 가능' })).toBeDisabled();
  });
});
