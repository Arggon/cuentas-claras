import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

/** Everything sendDigest needs to arm an email. Amounts are already text. */
export interface MailOptions {
  from: string;
  to: string;
  subject: string;
  text: string;
}

/**
 * Transport boundary for outbound email. Everything app-side depends on this
 * interface, so tests inject fakes and never open an SMTP connection.
 */
export interface Mailer {
  sendMail(options: MailOptions): Promise<void>;
}

export interface SmtpConfig {
  host: string;
  port: number;
  user?: string;
  pass?: string;
}

/**
 * Parses SMTP config from env. Null = feature disabled (fail closed): the
 * digest job must not schedule anything without an explicit SMTP_HOST.
 */
export function smtpConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): SmtpConfig | null {
  const host = env.SMTP_HOST?.trim();
  if (!host) return null;
  const port = Number.parseInt(env.SMTP_PORT ?? "", 10);
  return {
    host,
    port: Number.isInteger(port) && port > 0 ? port : 587,
    user: env.SMTP_USER?.trim() || undefined,
    pass: env.SMTP_PASS || undefined,
  };
}

export interface DigestAddresses {
  from: string;
  to: string[];
}

/**
 * Digest recipients come from env, not from the ledger: members have no
 * modeled emails (docs/data-format.md). DIGEST_TO wins; fallback SMTP_FROM.
 */
export function digestAddressesFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): DigestAddresses {
  const from = env.SMTP_FROM?.trim() || "cuentas-claras@localhost";
  const digestTo = env.DIGEST_TO?.trim();
  const parsed = (digestTo ?? "")
    .split(",")
    .map((address) => address.trim())
    .filter((address) => address.length > 0);
  const to = parsed.length > 0 ? parsed : [from];
  return { from, to };
}

/** Local hour of the day for the monthly run (default 9). */
export function digestHourFromEnv(env: NodeJS.ProcessEnv = process.env): number {
  const hour = Number.parseInt(env.DIGEST_HOUR ?? "", 10);
  return Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : 9;
}

function createTransport(config: SmtpConfig): Transporter {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    // 465 = implicit TLS; any other port starts plain and upgrades via
    // STARTTLS when the server offers it (docs/playbooks/nodemailer.md).
    secure: config.port === 465,
    auth:
      config.user !== undefined && config.pass !== undefined
        ? { user: config.user, pass: config.pass }
        : undefined,
    // Hardening per nodemailer docs: message data must never read files/URLs.
    disableFileAccess: true,
    disableUrlAccess: true,
  });
}

/** The one place that touches nodemailer (docs/playbooks/nodemailer.md). */
export class SmtpMailer implements Mailer {
  private readonly transport: Transporter;

  constructor(config: SmtpConfig, transport: Transporter = createTransport(config)) {
    this.transport = transport;
  }

  async sendMail(options: MailOptions): Promise<void> {
    await this.transport.sendMail({ ...options });
  }
}
