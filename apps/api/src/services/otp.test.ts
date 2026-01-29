/**
 * OTP Service Tests
 */

import { describe, it, expect } from 'vitest';
import {
  generateCode,
  CODE_LIFETIME_MS,
  RESEND_COOLDOWN_MS,
  MAX_ATTEMPTS,
} from '@/services/otp';

describe('OTP Service', () => {
  describe('generateCode()', () => {
    it('should generate a code of correct length (6 chars)', () => {
      const code = generateCode();
      expect(code.length).toBe(6);
    });

    it('should only use alphanumeric characters without confusing ones', () => {
      const code = generateCode();
      expect(code).toMatch(/^[0123456789ABCDEFGHJKLMNPQRSTUVWXYZ]+$/);
    });

    it('should always return uppercase', () => {
      const code = generateCode();
      expect(code).toBe(code.toUpperCase());
    });
  });

  describe('generateCode() - character exclusion', () => {
    it('should not contain confusing characters (I, O, 1, 0)', () => {
      for (let i = 0; i < 100; i++) {
        const code = generateCode();
        expect(code).not.toContain('I');
        expect(code).not.toContain('O');
        expect(code).not.toContain('1');
        expect(code).not.toContain('0');
      }
    });

    it('should not contain lowercase letters', () => {
      for (let i = 0; i < 100; i++) {
        const code = generateCode();
        expect(code).toBe(code.toUpperCase());
      }
    });

    it('should not contain spaces or special characters', () => {
      for (let i = 0; i < 100; i++) {
        const code = generateCode();
        expect(code).toMatch(/^[A-Z0-9]+$/);
      }
    });
  });

  describe('Time Constants', () => {
    it('CODE_LIFETIME_MS should be 5 minutes (300000ms)', () => {
      expect(CODE_LIFETIME_MS).toBe(300000);
    });

    it('RESEND_COOLDOWN_MS should be 60 seconds (60000ms)', () => {
      expect(RESEND_COOLDOWN_MS).toBe(60000);
    });

    it('MAX_ATTEMPTS should be 5', () => {
      expect(MAX_ATTEMPTS).toBe(5);
    });
  });
});
