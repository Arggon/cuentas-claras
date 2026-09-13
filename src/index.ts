import path from "node:path";
import { createApp } from "./app.js";
import { FileLedgerRepository } from "./store.js";

const port = Number(process.env.PORT ?? 3000);
const ledgerPath = process.env.LEDGER_PATH ?? path.join("data", "ledger.json");
const store = new FileLedgerRepository(ledgerPath);

createApp(store).listen(port, () => {
  console.log(`cuentas-claras listening on http://localhost:${port} (ledger: ${ledgerPath})`);
});
