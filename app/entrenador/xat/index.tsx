import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { lastMessage, unreadInThread } from '../../../src/domain/chat';
import { useSnapshot } from '../../../src/state/store';
import { PageIntro, Screen } from '../../../src/ui/shell';
import { colors } from '../../../src/ui/theme';
import { Card, Pill, T } from '../../../src/ui/ui';

export default function TrainerChats() {
  const snapshot = useSnapshot();
  const trainerId = snapshot.settings.trainerId ?? snapshot.trainers[0]?.id ?? '';
  const readerId = snapshot.settings.userId ?? trainerId;
  const rows = snapshot.clients
    .map((client) => ({
      client,
      last: lastMessage(snapshot.messages, trainerId, client.id),
      unread: unreadInThread(snapshot.messages, readerId, trainerId, client.id),
    }))
    .sort((a, b) => (b.last?.sentAt ?? '').localeCompare(a.last?.sentAt ?? ''));
  return (
    <Screen>
      <PageIntro eyebrow="Converses" title="Xat" detail="Una conversa amb cada client." />
      <View style={{ gap: 10 }}>
        {rows.length === 0 ? <T color={colors.muted}>Encara no tens clients.</T> : null}
        {rows.map(({ client, last, unread }) => (
          <Pressable key={client.id} accessibilityRole="button" onPress={() => router.push(`/entrenador/xat/${client.id}`)}>
            <Card>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <T style={{ fontWeight: '600' }}>{client.name}</T>
                  <T variant="small">{last?.text ?? 'Sense missatges'}</T>
                </View>
                {unread > 0 ? <Pill label={String(unread)} tone="accent" /> : null}
              </View>
            </Card>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}
