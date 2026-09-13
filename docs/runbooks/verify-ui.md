# Runbook: Verify the balances UI manually

1. **When to run it** — after any change to `src/app.ts` (static mount) or
   `public/` (HTML/CSS/JS), and as the manual acceptance pass for UI stories.
   The API endpoints themselves are covered by automated tests; the page is not.

2. **Prerequisites** — Node 22, dependencies installed (`npm install`),
   a free port 3000. No external services; the ledger is a local JSON file.

3. **Steps** — numbered, copy-pasteable commands with expected output.

   1. Start the API in dev mode:

      ```bash
      npm run dev
      # cuentas-claras listening on http://localhost:3000 (ledger: data/ledger.json)
      ```

      To avoid touching the real ledger, use a throwaway file instead:

      ```bash
      LEDGER_PATH=/tmp/cc-demo.json npm run dev
      ```

   2. Open http://localhost:3000/ in a browser. Expect the dark terminal page
      with sections **miembros**, **nuevo gasto**, **balances**, **settlement**,
      and the notice "todavía no hay integrantes: agregá el primero".

   3. Add members first (the group starts empty): type `gonza`, `sol`, `martin`
      in the miembros input and press **agregar** after each. Expect each name
      as a chip under the form and in the "quién pagó" select + checkboxes.

   4. Log an expense: quién pagó `gonza`, fecha (defaults to today), descripción
      `cena`, monto `30.00`, nobody checked (splits among all three). Press
      **agregar gasto**. Expect the info message "gasto agregado".

   5. Check the math: balances should show `gonza / le deben / $20,00`,
      `sol / debe / $10,00`, `martin / debe / $10,00`; settlement should show
      `sol le paga a gonza $10,00` and `martin le paga a gonza $10,00`
      (debtor order may swap). Cross-check with:

      ```bash
      curl -s http://localhost:3000/balances
      curl -s http://localhost:3000/settlement
      ```

   6. Error paths: try monto `12.345` (client-side rejection, no request) and
      monto `abc` (same); add an existing member name again to see the API 400
      message rendered in red.

4. **Verification** — step 5 numbers match the API responses; on a phone-width
   window the layout stays single-column and usable; `/`, `/app.js` and
   `/styles.css` all return 200:

   ```bash
   curl -s -o /dev/null -w "%{http_code} %{content_type}\n" http://localhost:3000/
   # 200 text/html; charset=utf-8
   ```

5. **Rollback** — none needed: the UI is read-only over the same endpoints.
   To undo ledger changes made while testing, delete the ledger file used in
   step 1 (e.g. `rm /tmp/cc-demo.json`); to reset the real ledger, stop the
   process and restore `data/ledger.json` from backup.
