import { describe, expect, it } from 'vitest';
import { hashPassword, normalizeEmail, normalizePhone, verifyPassword } from './index.js';
describe('core', () => {
  it('normalizes identifiers', () => {
    expect(normalizeEmail(' A@EXAMPLE.COM ')).toBe('a@example.com');
    expect(normalizePhone('+91 999-000')).toBe('+91999000');
  });
  it('hashes passwords', async () => {
    const value = await hashPassword('correct horse battery staple');
    expect(await verifyPassword('correct horse battery staple', value)).toBe(true);
    expect(await verifyPassword('wrong password', value)).toBe(false);
  });
});
