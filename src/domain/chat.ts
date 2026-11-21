import type { Message } from './types';

export function threadMessages(messages: Message[], trainerId: string, clientId: string): Message[] {
  return messages
    .filter((message) => message.trainerId === trainerId && message.clientId === clientId)
    .slice()
    .sort((a, b) => a.sentAt.localeCompare(b.sentAt));
}

export function isUnread(message: Message, readerId: string): boolean {
  return message.senderId !== readerId && message.readAt == null;
}

export function unreadInThread(messages: Message[], readerId: string, trainerId: string, clientId: string): number {
  return threadMessages(messages, trainerId, clientId).filter((message) => isUnread(message, readerId)).length;
}

export function unreadTotal(messages: Message[], readerId: string): number {
  return messages.filter((message) => (message.trainerId === readerId || message.clientId === readerId) && isUnread(message, readerId)).length;
}

/** Marca com a llegits els missatges de l'altra persona en aquesta conversa. */
export function markThreadRead(messages: Message[], readerId: string, trainerId: string, clientId: string, readAt: string): Message[] {
  return messages.map((message) => {
    if (message.trainerId !== trainerId || message.clientId !== clientId) return message;
    if (!isUnread(message, readerId)) return message;
    return { ...message, readAt, status: 'read' as const, updatedAt: readAt, syncStatus: 'pending' as const };
  });
}

export function lastMessage(messages: Message[], trainerId: string, clientId: string): Message | null {
  const thread = threadMessages(messages, trainerId, clientId);
  return thread[thread.length - 1] ?? null;
}
