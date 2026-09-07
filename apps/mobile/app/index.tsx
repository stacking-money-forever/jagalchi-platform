import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>자갈치</Text>
      <Text style={styles.description}>프로젝트 실행을 네이티브 화면에서 확인합니다.</Text>
      <Link href="/login" style={styles.link}>로그인</Link>
      <Link href="/register" style={styles.link}>계정 만들기</Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', gap: 12 },
  title: { fontSize: 32, fontWeight: '700' },
  description: { fontSize: 16, color: '#525252' },
  link: { fontSize: 16, fontWeight: '600', color: '#075985', paddingVertical: 12 },
});
