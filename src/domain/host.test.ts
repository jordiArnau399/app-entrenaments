import { describe, expect, it } from 'vitest';
import { isLocalDemoHost } from './host';

describe('amfitrió de la demostració', () => {
  it('només tracta com a locals les adreces de desenvolupament', () => {
    expect(isLocalDemoHost('localhost')).toBe(true);
    expect(isLocalDemoHost('127.0.0.1')).toBe(true);
    expect(isLocalDemoHost('192.168.1.20')).toBe(true);
    expect(isLocalDemoHost('10.0.0.4')).toBe(true);
    expect(isLocalDemoHost('jordiarnau399.github.io')).toBe(false);
    expect(isLocalDemoHost('ritme.pages.dev')).toBe(false);
  });
});
