import { describe, expect, it } from 'vitest';
import { canAccess, type Actor } from './access';
import { markThreadRead, threadMessages, unreadInThread, unreadTotal } from './chat';
import type { Message } from './types';

const trainer: Actor = { userId: 'trainer-1', role: 'trainer', trainerId: 'trainer-1' };
const client: Actor = { userId: 'client-1', role: 'client', trainerId: 'trainer-1' };
const stranger: Actor = { userId: 'trainer-2', role: 'trainer', trainerId: 'trainer-2' };

function message(partial: Partial<Message> & Pick<Message, 'id' | 'senderId'>): Message {
  return {
    trainerId: 'trainer-1',
    clientId: 'client-1',
    recipientId: partial.senderId === 'trainer-1' ? 'client-1' : 'trainer-1',
    text: 'Hola',
    sentAt: '2026-11-21T10:00:00.000Z',
    readAt: null,
    status: 'sent',
    syncStatus: 'synced',
    updatedAt: '2026-11-21T10:00:00.000Z',
    ...partial,
  };
}

describe('xat', () => {
  const messages = [
    message({ id: 'm1', senderId: 'client-1', sentAt: '2026-11-21T09:00:00.000Z' }),
    message({ id: 'm2', senderId: 'trainer-1', sentAt: '2026-11-21T09:05:00.000Z', readAt: '2026-11-21T09:06:00.000Z', status: 'read' }),
    message({ id: 'm3', senderId: 'client-1', clientId: 'client-2', trainerId: 'trainer-1', sentAt: '2026-11-21T11:00:00.000Z' }),
  ];

  it('només els dos participants llegeixen i escriuen la conversa', () => {
    const row = { trainerId: 'trainer-1', clientId: 'client-1', senderId: 'client-1' };
    expect(canAccess(client, 'select', 'message', row)).toBe(true);
    expect(canAccess(trainer, 'select', 'message', row)).toBe(true);
    expect(canAccess(stranger, 'select', 'message', row)).toBe(false);
    expect(canAccess(client, 'insert', 'message', row)).toBe(true);
    expect(canAccess(trainer, 'insert', 'message', { ...row, senderId: 'trainer-1' })).toBe(true);
    expect(canAccess(client, 'insert', 'message', { ...row, senderId: 'trainer-1' })).toBe(false);
    expect(canAccess(trainer, 'update', 'message', row)).toBe(true);
    expect(canAccess(client, 'update', 'message', row)).toBe(false);
    expect(canAccess(stranger, 'insert', 'message', { trainerId: 'trainer-1', clientId: 'client-1', senderId: 'trainer-2' })).toBe(false);
    expect(canAccess(stranger, 'select', 'message', row)).toBe(false);
  });

  it('compta els no llegits i els marca només per a qui els rep', () => {
    expect(threadMessages(messages, 'trainer-1', 'client-1').map((item) => item.id)).toEqual(['m1', 'm2']);
    expect(unreadInThread(messages, 'trainer-1', 'trainer-1', 'client-1')).toBe(1);
    expect(unreadInThread(messages, 'client-1', 'trainer-1', 'client-1')).toBe(0);
    expect(unreadTotal(messages, 'trainer-1')).toBe(2);
    expect(unreadTotal(messages, 'client-1')).toBe(0);
    expect(unreadTotal(messages, 'client-2')).toBe(1);
    const read = markThreadRead(messages, 'trainer-1', 'trainer-1', 'client-1', '2026-11-21T12:00:00.000Z');
    expect(read.find((item) => item.id === 'm1')?.readAt).toBe('2026-11-21T12:00:00.000Z');
    expect(read.find((item) => item.id === 'm3')?.readAt).toBeNull();
    expect(unreadInThread(read, 'trainer-1', 'trainer-1', 'client-1')).toBe(0);
  });
});
