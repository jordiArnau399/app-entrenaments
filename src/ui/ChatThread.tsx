import { useEffect, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { threadMessages } from '../domain/chat';
import type { Message } from '../domain/types';
import { colors, font } from './theme';
import { Button, T } from './ui';

export function ChatThread({
  title,
  messages,
  trainerId,
  clientId,
  selfId,
  onSend,
  onOpen,
}: {
  title: string;
  messages: Message[];
  trainerId: string;
  clientId: string;
  selfId: string;
  onSend: (text: string) => Promise<void>;
  onOpen: () => void;
}) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const thread = threadMessages(messages, trainerId, clientId);
  useEffect(() => {
    onOpen();
  }, [clientId, trainerId, thread.length]);

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <T variant="title">{title}</T>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 8, paddingBottom: 8 }}>
        {thread.length === 0 ? <T color={colors.muted}>Encara no hi ha missatges. Escriu el primer.</T> : null}
        {thread.map((message) => {
          const mine = message.senderId === selfId;
          return (
            <View key={message.id} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '80%', backgroundColor: mine ? colors.accent : colors.surface, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, borderWidth: mine ? 0 : 1, borderColor: colors.line }}>
              <T color={mine ? colors.surface : colors.ink}>{message.text}</T>
              <T variant="small" color={mine ? '#F6D2C4' : colors.muted}>
                {new Date(message.sentAt).toLocaleString('ca-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                {message.readAt && mine ? ' · Llegit' : ''}
              </T>
            </View>
          );
        })}
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Escriu un missatge"
          placeholderTextColor={colors.muted}
          multiline
          style={{ flex: 1, minHeight: 48, maxHeight: 120, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontFamily: font.body, fontSize: 16, backgroundColor: colors.surface, color: colors.ink }}
        />
        <Button
          label={sending ? '…' : 'Envia'}
          disabled={!text.trim() || sending}
          onPress={() => {
            const body = text.trim();
            if (!body) return;
            setSending(true);
            onSend(body)
              .then(() => setText(''))
              .finally(() => setSending(false));
          }}
        />
      </View>
    </View>
  );
}
