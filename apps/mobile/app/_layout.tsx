import { useState } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 15_000, retry: 1 } } }),
  );
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <Stack>
          <Stack.Screen name="index" options={{ title: '자갈치' }} />
          <Stack.Screen name="login" options={{ title: '로그인' }} />
          <Stack.Screen name="register" options={{ title: '계정 만들기' }} />
          <Stack.Screen name="projects/[runId]" options={{ title: '프로젝트 실행' }} />
        </Stack>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
