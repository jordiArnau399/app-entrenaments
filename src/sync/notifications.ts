import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export async function configureNotifications(): Promise<void> {
  if (Platform.OS === 'web') return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function scheduleDailyReminder(time: string): Promise<'ok' | 'denied' | 'unsupported'> {
  if (Platform.OS === 'web') return 'unsupported';
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return 'denied';
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return 'denied';
  const permission = await Notifications.requestPermissionsAsync();
  if (permission.status !== 'granted') return 'denied';
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Ritme',
      body: 'Avui tens entrenament. Obre l’app i anota com ha anat.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
  return 'ok';
}
