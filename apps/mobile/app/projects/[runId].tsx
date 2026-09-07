import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import {
  ApiResponseError,
  createApiTransport,
  getProjectRun,
  projectRunQueryKey,
} from '@jagalchi/api-client';

import { nativeRefresh } from '../../src/auth/native-api';
import { getNativeAccessToken } from '../../src/auth/session-store';

const apiOrigin = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080/api';

export default function ProjectRunScreen() {
  const { runId } = useLocalSearchParams<{ runId: string }>();
  const query = useQuery({
    queryKey: projectRunQueryKey(runId),
    enabled: Boolean(runId),
    queryFn: async ({ signal }) => {
      const request = (accessToken: string) =>
        getProjectRun(
          createApiTransport(apiOrigin, fetch, {
            headers: { authorization: `Bearer ${accessToken}` },
          }),
          runId,
          signal,
        );
      const accessToken = await getNativeAccessToken();
      if (!accessToken) return request((await nativeRefresh()).accessToken);
      try {
        return await request(accessToken);
      } catch (error) {
        if (!(error instanceof ApiResponseError) || error.status !== 401) throw error;
        return request((await nativeRefresh()).accessToken);
      }
    },
    refetchInterval: 15_000,
  });

  if (query.isPending) return <ActivityIndicator style={styles.center} accessibilityLabel="불러오는 중" />;
  if (query.isError) return <Text style={styles.center}>{query.error.message}</Text>;
  return (
    <View style={styles.container}>
      <Text style={styles.title}>프로젝트 실행 {query.data.id.slice(0, 8)}</Text>
      <Text style={styles.status}>{query.data.state}</Text>
      <FlatList
        data={query.data.tasks}
        keyExtractor={(task) => task.id}
        renderItem={({ item }) => (
          <View style={styles.task}>
            <Text style={styles.taskTitle}>{item.title}</Text>
            <Text>{item.state}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, textAlign: 'center', paddingTop: 48 },
  container: { flex: 1, padding: 20, gap: 8 },
  title: { fontSize: 28, fontWeight: '700' },
  status: { color: '#525252', marginBottom: 12 },
  task: { padding: 16, borderWidth: 1, borderColor: '#d4d4d4', borderRadius: 12, marginBottom: 10 },
  taskTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
});
