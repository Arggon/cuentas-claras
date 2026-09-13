import { describe, expect, it, vi } from "vitest";
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import {
  digestAddressesFromEnv,
  digestHourFromEnv,
  SmtpMailer,
  smtpConfigFromEnv,
} from "./mailer.js";
import type { MailOptions } from "./mailer.js";

describe("smtpConfigFromEnv", () => {
  it("fails closed without SMTP_HOST", () => {
    expect(smtpConfigFromEnv({})).toBeNull();
    expect(smtpConfigFromEnv({ SMTP_HOST: "   " })).toBeNull();
  });

  it("parses host with the 587 default port", () => {
    expect(smtpConfigFromEnv({ SMTP_HOST: "smtp.example.com" })).toEqual({
      host: "smtp.example.com",
      port: 587,
      user: undefined,
      pass: undefined,
    });
  });

  it("parses port and credentials when present", () => {
    expect(
      smtpConfigFromEnv({
        SMTP_HOST: "smtp.example.com",
        SMTP_PORT: "465",
        SMTP_USER: "user",
        SMTP_PASS: "secret",
      }),
    ).toEqual({ host: "smtp.example.com", port: 465, user: "user", pass: "secret" });
  });

  it("falls back to 587 on a malformed port", () => {
    expect(smtpConfigFromEnv({ SMTP_HOST: "h", SMTP_PORT: "not-a-port" })?.port).toBe(587);
    expect(smtpConfigFromEnv({ SMTP_HOST: "h", SMTP_PORT: "0" })?.port).toBe(587);
  });
});

describe("digestAddressesFromEnv", () => {
  it("defaults both sides when nothing is configured", () => {
    expect(digestAddressesFromEnv({})).toEqual({
      from: "cuentas-claras@localhost",
      to: ["cuentas-claras@localhost"],
    });
  });

  it("falls back DIGEST_TO to SMTP_FROM (members have no modeled emails)", () => {
    expect(digestAddressesFromEnv({ SMTP_FROM: "noreply@example.com" })).toEqual({
      from: "noreply@example.com",
      to: ["noreply@example.com"],
    });
  });

  it("splits DIGEST_TO on commas, trimming whitespace and empties", () => {
    expect(
      digestAddressesFromEnv({ SMTP_FROM: "a@example.com", DIGEST_TO: " b@x.com , c@x.com , ," }),
    ).toEqual({ from: "a@example.com", to: ["b@x.com", "c@x.com"] });
  });

  it("degrades an all-empty DIGEST_TO back to the sender", () => {
    expect(digestAddressesFromEnv({ SMTP_FROM: "a@example.com", DIGEST_TO: ", ," })).toEqual({
      from: "a@example.com",
      to: ["a@example.com"],
    });
  });
});

describe("digestHourFromEnv", () => {
  it("defaults to 9 and accepts 0-23", () => {
    expect(digestHourFromEnv({})).toBe(9);
    expect(digestHourFromEnv({ DIGEST_HOUR: "14" })).toBe(14);
    expect(digestHourFromEnv({ DIGEST_HOUR: "0" })).toBe(0);
  });

  it("rejects out-of-range and malformed hours", () => {
    expect(digestHourFromEnv({ DIGEST_HOUR: "24" })).toBe(9);
    expect(digestHourFromEnv({ DIGEST_HOUR: "-1" })).toBe(9);
    expect(digestHourFromEnv({ DIGEST_HOUR: "nine" })).toBe(9);
  });
});

describe("SmtpMailer", () => {
  it("maps options onto the nodemailer transport and resolves with it", async () => {
    // jsonTransport never touches the network: it serializes the message to
    // info.message — perfect for an offline wrapper test.
    const transport = nodemailer.createTransport({ jsonTransport: true });
    const spy = vi.spyOn(transport, "sendMail");
    const mailer = new SmtpMailer({ host: "smtp.example.com", port: 587 }, transport);

    const options: MailOptions = {
      from: "noreply@cuentas.test",
      to: "gonza@cuentas.test, sol@cuentas.test",
      subject: "Resumen mensual cuentas-claras — enero 2027",
      text: "cuerpo de prueba",
    };
    await expect(mailer.sendMail(options)).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(options);
  });

  it("rejects when the underlying transport rejects", async () => {
    const failing = {
      sendMail: vi.fn(async () => {
        throw new Error("connection refused");
      }),
    } as unknown as Transporter;
    const mailer = new SmtpMailer({ host: "smtp.example.com", port: 587 }, failing);

    await expect(
      mailer.sendMail({ from: "a@b.c", to: "d@e.f", subject: "s", text: "t" }),
    ).rejects.toThrow("connection refused");
  });
});
