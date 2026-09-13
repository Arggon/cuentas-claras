"use strict";

// cuentas-claras UI — vanilla JS, sin frameworks ni estado propio:
// después de cada mutación se vuelve a consultar al servidor.

const $ = (id) => document.getElementById(id);

let members = [];
let statusTimer;

// --- helpers ----------------------------------------------------------------

/**
 * Fetch JSON del API. Si la respuesta no es 2xx tira un Error con el
 * `error` del body (los 400 del server traen un mensaje legible).
 */
async function api(path, options) {
  let res;
  try {
    res = await fetch(path, options);
  } catch {
    throw new Error("no se pudo contactar al servidor");
  }
  if (!res.ok) {
    let message = `error ${res.status}`;
    try {
      const body = await res.json();
      if (body && typeof body.error === "string") message = body.error;
    } catch {
      // body no era JSON: queda el mensaje genérico
    }
    throw new Error(message);
  }
  return res.json();
}

const postJson = (path, body) =>
  api(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

/**
 * Decimal en pantalla -> centavos enteros, EXACTO (ADR 0003: nunca floats
 * en el dominio). Acepta punto o coma: "12.34" -> 1234, "12,34" -> 1234,
 * "0.05" -> 5. Devuelve null si no parsea exacto (vacío, no numérico,
 * más de dos decimales). Aritmética 100% entera sobre los dígitos.
 */
function parseAmountToCents(raw) {
  const normalized = String(raw).trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const [pesos, frac = ""] = normalized.split(".");
  const cents = (frac + "00").slice(0, 2); // "5" -> "50", "" -> "00"
  return Number(pesos) * 100 + Number(cents);
}

/** Centavos -> moneda, solo acá en el borde (aritmética entera). */
function formatCents(value) {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  const cents = abs % 100;
  const pesos = (abs - cents) / 100;
  return `${sign}$${pesos},${String(cents).padStart(2, "0")}`;
}

/** Fecha de hoy en zona local, como YYYY-MM-DD. */
function todayISO() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

/** Nodo de texto seguro: los nombres vienen de usuarios, nada de innerHTML. */
function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined && text !== null) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function showStatus(message, kind) {
  const node = $("status");
  clearTimeout(statusTimer);
  node.textContent = message;
  node.hidden = message === "";
  node.className = `status ${kind}`;
  if (kind === "info" && message !== "") {
    statusTimer = setTimeout(() => {
      node.textContent = "";
      node.hidden = true;
    }, 4000);
  }
}

const showInfo = (message) => showStatus(message, "info");
const showError = (message) => showStatus(message, "error");

// --- render -----------------------------------------------------------------

function renderMembers() {
  const list = $("members-list");
  list.textContent = "";
  if (members.length === 0) {
    list.append(el("span", "todavía no hay integrantes: agregá el primero", "empty"));
  } else {
    for (const member of members) list.append(el("span", member, "chip"));
  }

  const select = $("paid-by");
  select.textContent = "";
  if (members.length === 0) {
    const option = el("option", "agregá un integrante primero");
    option.value = "";
    select.append(option);
  } else {
    for (const member of members) {
      const option = el("option", member);
      option.value = member;
      select.append(option);
    }
  }

  const participants = $("participants");
  participants.textContent = "";
  for (const member of members) {
    const label = el("label", null, "participant");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = "participant";
    checkbox.value = member;
    label.append(checkbox, ` ${member}`);
    participants.append(label);
  }

  $("add-expense").disabled = members.length === 0;
}

function renderBalances(balances) {
  const hasRows = balances.length > 0;
  $("balances-table").hidden = !hasRows;
  $("balances-empty").hidden = hasRows;

  const body = $("balances-body");
  body.textContent = "";
  for (const row of balances) {
    const state =
      row.netCents > 0 ? "le deben" : row.netCents < 0 ? "debe" : "en paz";
    const tone =
      row.netCents > 0 ? "pos" : row.netCents < 0 ? "neg" : "zero";
    const tr = document.createElement("tr");
    tr.append(
      el("td", row.member),
      el("td", state, tone),
      el("td", formatCents(row.netCents), `num ${tone}`),
    );
    body.append(tr);
  }
}

function renderSettlement(transfers) {
  const hasTransfers = transfers.length > 0;
  $("settlement-list").hidden = !hasTransfers;
  $("settlement-empty").hidden = hasTransfers;

  const list = $("settlement-list");
  list.textContent = "";
  for (const transfer of transfers) {
    const li = document.createElement("li");
    li.append(`${transfer.from} le paga a ${transfer.to} `);
    li.append(el("strong", formatCents(transfer.amountCents)));
    list.append(li);
  }
}

async function refresh() {
  const [fetchedMembers, balances, settlement] = await Promise.all([
    api("/members"),
    api("/balances"),
    api("/settlement"),
  ]);
  members = fetchedMembers;
  renderMembers();
  renderBalances(balances);
  renderSettlement(settlement);
}

// --- eventos ----------------------------------------------------------------

function wire() {
  $("member-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = $("member-name");
    const name = input.value.trim();
    try {
      await postJson("/members", { name });
      input.value = "";
      showInfo(`integrante "${name}" agregado`);
      await refresh();
    } catch (err) {
      showError(err.message);
    }
  });

  $("expense-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const paidBy = $("paid-by").value;
    if (paidBy === "") {
      showError("agregá al menos un integrante antes de cargar un gasto");
      return;
    }
    const amountCents = parseAmountToCents($("amount").value);
    if (amountCents === null) {
      showError("monto inválido: usá un número con hasta dos decimales, ej. 12.34");
      return;
    }
    const description = $("description").value.trim();
    const participants = [...document.querySelectorAll("#participants input:checked")].map(
      (checkbox) => checkbox.value,
    );
    try {
      await postJson("/expenses", {
        date: $("date").value,
        description,
        amountCents,
        paidBy,
        participants,
      });
      showInfo(`gasto "${description}" (${formatCents(amountCents)}) agregado`);
      $("amount").value = "";
      $("description").value = "";
      for (const checkbox of document.querySelectorAll("#participants input")) {
        checkbox.checked = false;
      }
      await refresh();
    } catch (err) {
      showError(err.message);
    }
  });
}

$("date").value = todayISO();
wire();
refresh().catch((err) => showError(err.message));
