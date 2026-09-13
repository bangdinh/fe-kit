import { Stack } from 'expo-router';
import { configureLogger } from 'fe-kit/logger';

// Mobile: JSON sink cho bản release để log gom được; pretty khi dev.
configureLogger({ level: __DEV__ ? 'debug' : 'info' });

export default function Layout() {
  return <Stack screenOptions={{ headerTitle: 'Example' }} />;
}
