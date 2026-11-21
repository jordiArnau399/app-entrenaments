import { useEffect } from 'react';
import { View } from 'react-native';
import { useApp, useSnapshot } from '../../src/state/store';
import { ChatThread } from '../../src/ui/ChatThread';
import { colors } from '../../src/ui/theme';
import { T } from '../../src/ui/ui';

export default function ClientChat() {
  const snapshot = useSnapshot();
  const { sendMessage, markConversationRead, syncNow } = useApp();
  const clientId = snapshot.settings.clientId ?? '';
  const trainerId = snapshot.settings.trainerId ?? snapshot.trainers[0]?.id ?? '';
  const trainer = snapshot.trainers.find((item) => item.id === trainerId);
  useEffect(() => {
    const timer = setInterval(() => {
      syncNow().catch(() => undefined);
    }, 4000);
    return () => clearInterval(timer);
  }, [syncNow]);
  if (!clientId || !trainerId) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper, padding: 24 }}>
        <T>Encara no tens entrenador.</T>
      </View>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ChatThread
        title={trainer ? `Xat amb ${trainer.name}` : 'Xat'}
        messages={snapshot.messages}
        trainerId={trainerId}
        clientId={clientId}
        selfId={clientId}
        onSend={(text) => sendMessage(clientId, text)}
        onOpen={() => {
          markConversationRead(clientId).catch(() => undefined);
        }}
      />
    </View>
  );
}
