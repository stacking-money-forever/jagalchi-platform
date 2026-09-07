import { useState } from 'react';

import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  nativeRegister,
  requestRegistrationVerification,
  verifyRegistrationCode,
} from '../src/auth/native-api';

function validateAccount(email: string, name: string, password: string): string | undefined {
  const normalizedEmail = email.trim();
  const normalizedName = name.trim();
  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail) || normalizedEmail.length > 254) {
    return '올바른 이메일을 입력해 주세요.';
  }
  if (normalizedName.length < 2 || normalizedName.length > 60) {
    return '이름은 2자 이상 60자 이하로 입력해 주세요.';
  }
  if (password.length < 10 || password.length > 128) {
    return '비밀번호는 10자 이상 128자 이하로 입력해 주세요.';
  }
  return undefined;
}

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationRequested, setVerificationRequested] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  const requestCode = async () => {
    const validationError = validateAccount(email, name, password);
    if (validationError) {
      setError(validationError);
      return;
    }
    setPending(true);
    setError(undefined);
    try {
      await requestRegistrationVerification(email.trim());
      setVerificationRequested(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '인증 코드를 보내지 못했습니다.');
    } finally {
      setPending(false);
    }
  };

  const submit = async () => {
    setPending(true);
    setError(undefined);
    try {
      const { registrationProof } = await verifyRegistrationCode(
        email.trim(),
        verificationCode.trim(),
      );
      try {
        await nativeRegister({
          email: email.trim(),
          name: name.trim(),
          password,
          registrationProof,
        });
      } catch (reason) {
        setVerificationRequested(false);
        setVerificationCode('');
        throw reason;
      }
      router.replace('/');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '가입하지 못했습니다.');
    } finally {
      setPending(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>계정 만들기</Text>
      <TextInput accessibilityLabel="이메일" autoCapitalize="none" inputMode="email" editable={!verificationRequested} value={email} onChangeText={setEmail} style={styles.input} />
      <TextInput accessibilityLabel="이름" editable={!verificationRequested} value={name} onChangeText={setName} style={styles.input} />
      <TextInput accessibilityLabel="비밀번호" editable={!verificationRequested} secureTextEntry value={password} onChangeText={setPassword} style={styles.input} />
      {verificationRequested ? (
        <>
          <TextInput accessibilityLabel="이메일 인증 코드" autoCapitalize="none" value={verificationCode} onChangeText={setVerificationCode} style={styles.input} />
          <Pressable accessibilityRole="button" disabled={pending} onPress={() => { setVerificationRequested(false); setVerificationCode(''); setError(undefined); }}>
            <Text style={styles.editAccount}>계정 정보 수정</Text>
          </Pressable>
        </>
      ) : null}
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <Pressable accessibilityRole="button" disabled={pending || !email || !name || !password || (verificationRequested && !verificationCode)} onPress={() => void (verificationRequested ? submit() : requestCode())} style={styles.button}>
        <Text style={styles.buttonText}>{pending ? '처리 중…' : verificationRequested ? '인증하고 가입' : '인증 코드 받기'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 14 }, title: { fontSize: 30, fontWeight: '700' },
  input: { borderWidth: 1, borderColor: '#a3a3a3', borderRadius: 10, padding: 14 },
  error: { color: '#b91c1c' }, button: { backgroundColor: '#075985', borderRadius: 10, padding: 15 },
  editAccount: { color: '#075985', fontWeight: '600' },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
});
