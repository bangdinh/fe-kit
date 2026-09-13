import { StyleSheet, Text, View } from 'react-native';
import { env } from '@example/shared';
import { defaultTokens } from 'fe-kit/tokens';

// ⚠ RN KHÔNG dùng `fe-kit/ui` — subpath đó map token sang antd, thứ React
// Native không có. `fe-kit/tokens` là bảng token THUẦN, chạy trên mọi nền tảng.
const t = defaultTokens('light');

export default function Home() {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Example</Text>
      <Text style={styles.muted}>Môi trường: {env.current()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.color.background },
  title: { fontSize: t.typography.size.xxl, fontWeight: '600', color: t.color.text },
  muted: { marginTop: t.spacing.sm, color: t.color.textMuted },
});
