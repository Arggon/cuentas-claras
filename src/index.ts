import path from "node:path";
import { createApp } from "./app.js";
import { FileLedgerRepository } from "./store.js";
import {
  digestAddressesFromEnv,
  digestHourFromEnv,
  SmtpMailer,
  smtpConfigFromEnv,
} from "./mailer.js";
import { previousPeriod, sendDigest } from "./digest.js";
import { scheduleMonthlyDigest } from "./schedule.js";

const port = Number(process.env.PORT ?? 3000);
const ledgerPath = process.env.LEDGER_PATH ?? path.join("data", "ledger.json");
const store = new FileLedgerRepository(ledgerPath);

createApp(store).listen(port, () => {
  console.log(`cuentas-claras listening on http://localhost:${port} (ledger: ${ledgerPath})`);
});

// Monthly digest: disabled unless SMTP is configured (fail closed).
const smtp = smtpConfigFromEnv();
if (smtp) {
  const mailer = new SmtpMailer(smtp);
  const addresses = digestAddressesFromEnv();
  const hour = digestHourFromEnv();
  console.log(
    `digest mensual habilitado: destinatarios ${addresses.to.join(", ")} — día 1 de cada mes a las ${hour}:00 (hora local)`,
  );
  scheduleMonthlyDigest(
    () => {
      store
        .load()
        .then((ledger) => sendDigest(mailer, ledger, previousPeriod(new Date()), addresses))
        .then(() => console.log("digest mensual enviado"))
        .catch((err) => console.error("error enviando el digest mensual:", err));
    },
    { hour },
  );
} else {
  console.log("digest deshabilitado: falta SMTP_HOST");
}
