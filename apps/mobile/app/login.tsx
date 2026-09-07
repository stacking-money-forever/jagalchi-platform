import { useState } from 'react';

import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { nativeLogin } from '../src/auth/native-api';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [runId, setRunId] = useState('');
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  const submit = async () => {
    setPending(true);
    setError(undefined);
    try {
      await nativeLogin(email.trim(), password);
      if (runId.trim()) router.replace({ pathname: '/projects/[runId]', params: { runId: runId.trim() } });
      else router.replace('/');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '로그인하지 못했습니다.');
    } finally {
      setPending(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>로그인</Text>
      <TextInput accessibilityLabel="이메일" autoCapitalize="none" inputMode="email" value={email} onChangeText={setEmail} style={styles.input} />
      <TextInput accessibilityLabel="비밀번호" secureTextEntry value={password} onChangeText={setPassword} style={styles.input} />
      <TextInput accessibilityLabel="프로젝트 실행 ID" autoCapitalize="none" value={runId} onChangeText={setRunId} style={styles.input} />
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <Pressable accessibilityRole="button" disabled={pending || !email || !password} onPress={() => void submit()} style={styles.button}>
        <Text style={styles.buttonText}>{pending ? '로그인 중…' : '로그인'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 14 }, title: { fontSize: 30, fontWeight: '700' },
  input: { borderWidth: 1, borderColor: '#a3a3a3', borderRadius: 10, padding: 14 },
  error: { color: '#b91c1c' }, button: { backgroundColor: '#075985', borderRadius: 10, padding: 15 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
});
