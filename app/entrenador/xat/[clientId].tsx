import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { useApp, useSnapshot } from '../../../src/state/store';
import { ChatThread } from '../../../src/ui/ChatThread';
import { colors } from '../../../src/ui/theme';
import { T } from '../../../src/ui/ui';

export default function TrainerThread() {
  const { clientId } = useLocalSearchParams<{ clientId: string }>();
  const snapshot = useSnapshot();
  const { sendMessage, markConversationRead, syncNow } = useApp();
  const trainerId = snapshot.settings.trainerId ?? snapshot.trainers[0]?.id ?? '';
  const selfId = snapshot.settings.userId ?? trainerId;
  const client = snapshot.clients.find((item) => item.id === clientId);
  useEffect(() => {
    const timer = setInterval(() => {
      syncNow().catch(() => undefined);
    }, 4000);
    return () => clearInterval(timer);
  }, [syncNow]);
  if (!client || !trainerId) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper, padding: 24, gap: 8 }}>
        <T>No s'ha trobat la conversa.</T>
        <Pressable onPress={() => router.push('/entrenador/xat')}><T>← Xat</T></Pressable>
      </View>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <Pressable onPress={() => router.push('/entrenador/xat')} style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <T variant="small">← Converses</T>
      </Pressable>
      <ChatThread
        title={client.name}
        messages={snapshot.messages}
        trainerId={trainerId}
        clientId={client.id}
        selfId={selfId}
        onSend={(text) => sendMessage(client.id, text)}
        onOpen={() => {
          markConversationRead(client.id).catch(() => undefined);
        }}
      />
    </View>
  );
}
