'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  connectRealtime,
  disconnectRealtime,
  subscribeRealtime,
  type RealtimeEvent,
  type RealtimeSubscription,
} from '@/lib/realtime-client';

export function useRealtime({
  isAutoConnect = true,
  roadmapId,
  onBeforeDisconnect,
}: {
  isAutoConnect?: boolean;
  roadmapId?: string;
  onBeforeDisconnect?: () => void;
}) {
  const [isConnected, setIsConnected] = useState(false);
  const subscriptionsRef = useRef<RealtimeSubscription[]>([]);

  const disconnect = useCallback(() => {
    onBeforeDisconnect?.();
    subscriptionsRef.current.forEach((subscription) => subscription.unsubscribe());
    subscriptionsRef.current = [];
    disconnectRealtime();
    setIsConnected(false);
  }, [onBeforeDisconnect]);

  const subscribe = useCallback(<T>(event: RealtimeEvent, callback: (payload: T) => void) => {
    const subscription = subscribeRealtime(event, callback);
    if (subscription) subscriptionsRef.current.push(subscription);
    return subscription;
  }, []);

  useEffect(() => {
    if (!isAutoConnect || !roadmapId) return;
    void connectRealtime({
      roadmapId,
      onConnect: () => setIsConnected(true),
      onDisconnect: () => setIsConnected(false),
      onError: () => setIsConnected(false),
    });
    return disconnect;
  }, [disconnect, isAutoConnect, roadmapId]);

  return { isConnected, subscribe, disconnect };
}
