import { createTransport, type Transporter } from 'nodemailer';
import type { Email, Mailer } from './mailer.js';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string | undefined;
  password: string | undefined;
  from: string;
}

/** La configuration SMTP des variables d'environnement (voir .env.example) ; null sans SMTP_HOST. */
export function smtpConfigFromEnv(env: NodeJS.ProcessEnv = process.env): SmtpConfig | null {
  const host = env['SMTP_HOST']?.trim();
  if (!host) return null;
  const port = Number(env['SMTP_PORT']?.trim() || 587);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`SMTP_PORT must be a port number, got "${env['SMTP_PORT']}"`);
  }
  return {
    host,
    port,
    secure: env['SMTP_SECURE']?.trim().toLowerCase() === 'true',
    user: env['SMTP_USER']?.trim() || undefined,
    password: env['SMTP_PASSWORD'] || undefined,
    from: env['SMTP_FROM']?.trim() || 'La Verrière <reservations@laverriere.example>',
  };
}

export class SmtpMailer implements Mailer {
  private readonly transport: Transporter;

  constructor(private readonly config: SmtpConfig) {
    this.transport = createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.user ? { user: config.user, pass: config.password ?? '' } : undefined,
    });
  }

  async send(email: Email): Promise<void> {
    await this.transport.sendMail({ from: this.config.from, ...email });
  }
}
