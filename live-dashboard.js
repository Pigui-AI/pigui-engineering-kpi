let dashboardFetchBusy = false;
let dashboardPending = null;
function snapshotRevision(snapshot) {
  return snapshot.sync?.revision || snapshot.as_of;
}
function syncClock(timestamp) {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: "America/Mexico_City",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(timestamp));
}
function updateSyncStatus(error = false) {
  const el = document.querySelector("#source-state");
  const stamp =
    state.auditSource?.sync?.last_success_at || state.auditSource?.as_of;
  if (!stamp) {
    el.textContent = error ? "No se pudo conectar" : "Conectando";
    return;
  }
  const age = Math.max(0, Math.round((Date.now() - Date.parse(stamp)) / 60000));
  el.textContent = error
    ? `Sin conexión · datos ${syncClock(stamp)}`
    : age > 35
      ? `Datos hace ${age} min · esperando sincronización`
      : `Actualizado ${syncClock(stamp)} · automático cada 15 min`;
  el.title =
    new Date(stamp).toLocaleString("es-MX", {
      timeZone: "America/Mexico_City",
    }) + " · GitHub Actions";
  el.closest("span")?.classList.toggle("sync-stale", error || age > 35);
}
async function dashboardJSON(file) {
  const url = new URL(file, document.baseURI);
  url.searchParams.set("_live", String(Date.now()));
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw Error("Dataset unavailable");
  return response.json();
}
function validateLiveData(data, snapshot) {
  if (
    !Array.isArray(data.team) ||
    !data.team.length ||
    !Array.isArray(snapshot.records)
  )
    throw Error("Invalid dataset");
  const keys = new Set(),
    names = new Set(data.team.map((m) => m.name));
  for (const r of snapshot.records) {
    if (keys.has(r.key) || !names.has(r.responsible))
      throw Error("Invalid attribution");
    keys.add(r.key);
    if (r.author?.toLowerCase() === "sergiorcode" && r.responsible !== "Ever")
      throw Error("Invalid attribution");
  }
}
function applyDashboardPayload(payload) {
  const { data, snapshot } = payload;
  const rosterSignature = JSON.stringify(data);
  const changed =
    !state.data ||
    snapshotRevision(state.auditSource || {}) !== snapshotRevision(snapshot) ||
    state.rosterSignature !== rosterSignature;
  const initial = !state.data;
  const selected = state.quincena;
  const oldScroll = window.scrollY;
  state.data = data;
  state.auditSource = snapshot;
  state.rosterSignature = rosterSignature;
  let id = selected || KPIAudit.defaultQuincena(snapshot.as_of);
  if (!selected) {
    try {
      id = localStorage.getItem("pigui:quincena") || id;
    } catch {}
  }
  selectQuincena(id);
  const form = document.querySelector("#report-form"),
    member = form.elements.member.value;
  form.elements.member.innerHTML = data.team
    .map((m) => `<option>${esc(m.name)}</option>`)
    .join("");
  if (data.team.some((m) => m.name === member))
    form.elements.member.value = member;
  if (changed) {
    route(initial ? "initial" : "live");
    if (!initial) window.scrollTo({ top: oldScroll, behavior: "instant" });
  }
  updateSyncStatus();
  return changed;
}
async function refreshDashboard({ force = false } = {}) {
  if (dashboardFetchBusy || (!force && document.hidden)) return;
  dashboardFetchBusy = true;
  document.documentElement.classList.add("is-syncing");
  try {
    const data = await dashboardJSON("data/team.json");
    const snapshot = await dashboardJSON(
      data.audit_file || "data/github-audit.json",
    );
    validateLiveData(data, snapshot);
    if (document.querySelector("dialog[open]")) {
      dashboardPending = { data, snapshot };
      updateSyncStatus();
      return;
    }
    const initial = !state.data;
    const changed = applyDashboardPayload({ data, snapshot });
    if (force && !initial)
      toast(
        changed
          ? "Cifras actualizadas desde GitHub"
          : "Ya tienes las cifras más recientes",
      );
  } catch {
    updateSyncStatus(true);
    if (!state.data)
      document.querySelector("#main").innerHTML =
        '<section class="empty-state panel glass"><h1>No pudimos cargar las cifras</h1><p>Vuelve a intentar para consultar el último dato válido.</p><button class="button primary" data-action="refresh">Reintentar</button></section>';
    else if (force)
      toast("No se pudo actualizar; conservamos las últimas cifras válidas");
  } finally {
    dashboardFetchBusy = false;
    document.documentElement.classList.remove("is-syncing");
  }
}
function startDashboardLive() {
  refreshDashboard({ force: true });
  setInterval(() => refreshDashboard(), 60000);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refreshDashboard();
  });
  document.addEventListener(
    "close",
    () =>
      setTimeout(() => {
        if (dashboardPending && !document.querySelector("dialog[open]")) {
          const payload = dashboardPending;
          dashboardPending = null;
          applyDashboardPayload(payload);
        }
      }, 0),
    true,
  );
}
