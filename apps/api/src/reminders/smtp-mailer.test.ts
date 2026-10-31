import { describe, expect, it } from 'vitest';
import { smtpConfigFromEnv } from './smtp-mailer.js';

describe('smtpConfigFromEnv', () => {
  it('is null without SMTP_HOST', () => {
    expect(smtpConfigFromEnv({})).toBeNull();
    expect(smtpConfigFromEnv({ SMTP_HOST: '  ' })).toBeNull();
  });

  it('reads the SMTP variables', () => {
    expect(
      smtpConfigFromEnv({
        SMTP_HOST: 'smtp.example.com',
        SMTP_PORT: '465',
        SMTP_SECURE: 'true',
        SMTP_USER: 'api',
        SMTP_PASSWORD: 'pw',
        SMTP_FROM: 'Accueil <accueil@example.com>',
      }),
    ).toEqual({
      host: 'smtp.example.com',
      port: 465,
      secure: true,
      user: 'api',
      password: 'pw',
      from: 'Accueil <accueil@example.com>',
    });
  });

  it('defaults to port 587, no TLS and no authentication', () => {
    const config = smtpConfigFromEnv({ SMTP_HOST: 'mailpit', SMTP_PORT: '', SMTP_USER: '' });
    expect(config).toMatchObject({ port: 587, secure: false, user: undefined });
  });

  it('rejects an invalid port', () => {
    expect(() => smtpConfigFromEnv({ SMTP_HOST: 'mailpit', SMTP_PORT: 'abc' })).toThrow(/SMTP_PORT/);
  });
});
