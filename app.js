"use strict";
const REPO = "https://github.com/Pigui-AI/pigui-engineering-kpi";
const icons = {
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  grid: '<rect x="4" y="4" width="6" height="6" rx="2"/><rect x="14" y="4" width="6" height="6" rx="2"/><rect x="4" y="14" width="6" height="6" rx="2"/><rect x="14" y="14" width="6" height="6" rx="2"/>',
  users:
    '<circle cx="9" cy="8" r="3.5"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3.5 3.5 0 0 1 0 7M18 15a5 5 0 0 1 3 5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  download: '<path d="M12 3v12m-4-4 4 4 4-4M4 16v4h16v-4"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  shield:
    '<path d="m12 3 8 3v6c0 4-4 7-8 9-4-2-8-5-8-9V6z"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  branch:
    '<circle cx="6" cy="5" r="2"/><circle cx="18" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><path d="M6 7v10m0-3h6a6 6 0 0 0 6-6V7"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  calendar:
    '<rect x="4" y="5" width="16" height="16" rx="3"/><path d="M8 3v4m8-4v4M4 10h16"/>',
  chart: '<path d="M4 4v16h17M8 16l4-6 4 3 5-8"/>',
  code: '<path d="m8 7-5 5 5 5m8-10 5 5-5 5m-3-13-2 16"/>',
  x: '<path d="m6 6 12 12M6 18 18 6"/>',
  file: '<path d="M14 3H6v18h12V7zM14 3v5h4M9 12h6m-6 4h6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>',
};
const icon = (name) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.grid}</svg>`;
const esc = (text) =>
  String(text ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const clamp = (n) => Math.min(100, Math.max(0, Number(n) || 0));
const count = (n) => Math.max(0, Number(n) || 0);
const state = { data: null, filter: "all" };
const colors = ["#8dbaef", "#7cbcab", "#d6b17e", "#bfa1b5", "#92bd97"];
function readDrafts() {
  try {
    const v = JSON.parse(localStorage.getItem("pigui:drafts") || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
function toast(message) {
  const el = document.querySelector("#toast");
  el.textContent = message;
  el.classList.add("visible");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("visible"), 4000);
}
function avatar(m, i) {
  return `<span class="avatar" style="--avatar:${colors[i % colors.length]}">${esc(m.name.slice(0, 2).toUpperCase())}</span>`;
}
function configured(m) {
  return m.login && m.login !== "por-asignar";
}
function status(m) {
  return m.reporting_mode === "qa-delegated"
    ? '<span class="badge neutral">QA · comodín</span>'
    : configured(m)
      ? '<span class="badge"><i class="status-dot"></i> Vinculado</span>'
      : '<span class="badge amber">Por vincular</span>';
}
function totals() {
  const team = state.data.team;
  return {
    average: Math.round(
      team.reduce((s, m) => s + clamp(m.verified_progress), 0) / team.length,
    ),
    prs: team.reduce((s, m) => s + count(m.verified_prs), 0),
    pending: team.reduce((s, m) => s + count(m.open_reports), 0),
    linked: team.filter(configured).length,
  };
}
function heading(title, subtitle) {
  return `<div class="page-header"><div><p class="eyebrow">PIGUI / ESPACIO DE INGENIERÍA</p><h1>${title}</h1><p class="subtitle">${subtitle}</p></div><div class="header-actions"><span class="period">${icon("calendar")}${esc(state.data.period || "Periodo actual")}</span><button class="button primary" data-action="report">${icon("plus")} Reportar avance</button></div></div>`;
}
function teamTable() {
  return `<div class="table-wrap"><table class="data-table"><thead><tr><th>Integrante</th><th>Cuenta de GitHub</th><th>Avance validado</th><th>PR validados</th><th>Estado</th><th></th></tr></thead><tbody>${state.data.team.map((m, i) => `<tr><td><button class="member-button" data-member="${i}">${avatar(m, i)}<span><span class="member-name">${esc(m.name)}</span><span class="member-role">${esc(m.role)}</span></span></button></td><td>${configured(m) ? `<a class="mono" href="https://github.com/${encodeURIComponent(m.login)}" target="_blank" rel="noopener">@${esc(m.login)}</a>` : '<span class="mono">Sin cuenta · QA delegado</span>'}</td><td><span class="progress-cell"><span class="progress"><i style="width:${clamp(m.verified_progress)}%"></i></span><b>${clamp(m.verified_progress)}%</b></span></td><td>${count(m.verified_prs)}</td><td>${status(m)}</td><td><button class="icon-button" data-member="${i}" aria-label="Ver detalle de ${esc(m.name)}">${icon("arrow")}</button></td></tr>`).join("")}</tbody></table></div>`;
}
function rules() {
  return [
    {
      icon: "branch",
      title: "PR de repositorio autorizado",
      note: "La entrega está ligada a un cambio real.",
    },
    {
      icon: "code",
      title: "Cambios fusionados",
      note: "Un PR abierto todavía no cuenta.",
    },
    {
      icon: "shield",
      title: "Aprobación externa",
      note: "Otra persona debe revisar la entrega.",
    },
    {
      icon: "users",
      title: "Identidad verificada",
      note: "Cada reporte tiene un responsable.",
    },
  ];
}
function overview() {
  const t = totals();
  const hasProgress = state.data.team.some(
    (m) => clamp(m.verified_progress) > 0,
  );
  return `${heading("El pulso de ingeniería.", "Las personas, las entregas y la evidencia detrás de cada avance.")}
<section class="stats" aria-label="Indicadores del equipo">${[
    {
      label: "Avance del equipo",
      value: `${t.average}<small>%</small>`,
      note: "Promedio de los 5 integrantes",
      ico: "chart",
      accent: true,
    },
    {
      label: "PR validados",
      value: t.prs,
      note: "Evidencia aprobada y fusionada",
      ico: "branch",
    },
    {
      label: "Por validar",
      value: t.pending,
      note: "Reportes registrados en el resumen",
      ico: "clock",
    },
    {
      label: "Cuentas vinculadas",
      value: `${t.linked}<small>/ 4</small>`,
      note: "QA participa como comodín",
      ico: "users",
    },
  ]
    .map(
      (s) =>
        `<article class="stat glass ${s.accent ? "accent-stat" : ""}"><div class="stat-label">${s.label}${icon(s.ico)}</div><strong class="stat-number">${s.value}</strong><span class="stat-note">${s.note}</span></article>`,
    )
    .join("")}</section>
<div class="overview-grid"><section class="panel glass"><div class="panel-head"><div><h2>Avance por integrante</h2><p>Lo que el equipo ha entregado con evidencia</p></div><span class="badge neutral">Periodo actual</span></div><div class="chart"><div class="chart-grid">${[100, 75, 50, 25, 0].map((n) => `<div class="chart-line"><span>${n}%</span></div>`).join("")}</div>${hasProgress ? `<div class="chart-bars">${state.data.team.map((m) => `<div class="chart-bar" style="height:${clamp(m.verified_progress)}%"><span>${clamp(m.verified_progress)}%</span></div>`).join("")}</div>` : `<div class="chart-empty">${icon("chart")}<strong>Tu primera entrega empieza aquí</strong><p>Los avances aparecerán cuando sus reportes pasen la validación.</p></div>`}<div class="chart-x">${state.data.team.map((m) => `<span>${esc(m.name)}</span>`).join("")}</div></div><div class="chart-foot"><span><i class="status-dot"></i> Sólo evidencia validada</span><a class="text-link" href="#/criteria">Cómo se calcula ${icon("arrow")}</a></div></section>
<section class="panel glass"><div class="panel-head"><div><h2>La calidad tiene candados</h2><p>Criterios para contabilizar una entrega</p></div><span class="badge">4 reglas</span></div><div class="rule-list">${rules()
    .map(
      (r) =>
        `<div class="rule-item"><span class="rule-icon">${icon(r.icon)}</span><div><strong>${r.title}</strong><p>${r.note}</p></div><span class="check">✓</span></div>`,
    )
    .join("")}</div></section></div>
<section class="panel glass team-panel"><div class="panel-head"><div><h2>Tu equipo</h2><p>Cinco especialidades. Un mismo estándar de entrega.</p></div><a class="text-link" href="#/team">Ver equipo ${icon("arrow")}</a></div><div class="mini-team">${state.data.team.map((m, i) => `<article class="mini-person" style="--avatar:${colors[i]}"><div class="mini-top">${avatar(m, i)}<button class="icon-button" data-member="${i}" aria-label="Ver a ${esc(m.name)}">${icon("arrow")}</button></div><span class="member-name">${esc(m.name)}</span><span class="member-role">${esc(m.role)}</span><div class="mini-score">${clamp(m.verified_progress)}%</div><div class="mini-meta">${count(m.verified_prs)} PR validados · ${configured(m) ? "Vinculado" : "QA comodín"}</div><span class="progress"><i style="width:${clamp(m.verified_progress)}%"></i></span></article>`).join("")}</div></section>
<aside class="setup-banner glass"><span>${icon("info")}</span><p><strong>QA también tiene su espacio.</strong> Yestzanetli puede preparar reportes con sus pruebas; una cuenta autorizada los publica para validación.</p><button class="text-link icon-button" data-action="qa-report" aria-label="Preparar reporte QA">${icon("arrow")}</button></aside>`;
}
function teamView() {
  return `${heading("Las personas detrás del código.", "Consulta avances, cuentas vinculadas y el detalle de cada integrante.")}<div class="filters" aria-label="Filtrar equipo">${[
    ["all", "Todo el equipo"],
    ["linked", "Vinculados"],
    ["qa", "QA comodín"],
  ]
    .map(
      ([key, label]) =>
        `<button class="filter ${state.filter === key ? "active" : ""}" data-filter="${key}">${label}</button>`,
    )
    .join("")}</div><section class="team-grid">${state.data.team
    .map((m, i) => ({ m, i }))
    .filter(({ m }) =>
      state.filter === "linked"
        ? configured(m)
        : state.filter === "qa"
          ? m.reporting_mode === "qa-delegated"
          : true,
    )
    .map(
      ({ m, i }) =>
        `<article class="person-card glass"><div class="person-top">${avatar(m, i)}${status(m)}</div><h2>${esc(m.name)}</h2><p>${esc(m.role)}</p><div class="person-score">${clamp(m.verified_progress)}<span class="subtitle"> %</span></div><span class="progress"><i style="width:${clamp(m.verified_progress)}%"></i></span><div class="person-meta"><span>${count(m.verified_prs)} PR validados</span><span>${count(m.open_reports)} pendientes</span></div><button class="button secondary" data-member="${i}">Ver detalle ${icon("arrow")}</button></article>`,
    )
    .join(
      "",
    )}</section><section class="panel glass team-panel"><div class="panel-head"><h2>Directorio de GitHub</h2></div>${teamTable()}</section>`;
}
function evidenceView() {
  const drafts = readDrafts();
  return `${heading("El trabajo deja huella.", "Reportes compartidos en GitHub y borradores guardados en este navegador.")}<section class="panel glass"><div class="panel-head"><div><h2>Evidencias del equipo</h2><p>Consulta el estado real de cada reporte en GitHub.</p></div><span class="badge neutral">Fuente oficial</span></div><div class="empty-state">${icon("branch")}<h2>Del PR al avance validado</h2><p>Abre el registro del equipo para consultar reportes verificados, rechazados y pendientes. Cada reporte conserva su evidencia y resultado de validación.</p><a class="button primary" href="${REPO}/issues?q=is%3Aissue%20label%3Akpi-report" target="_blank" rel="noopener">Ver reportes en GitHub ${icon("arrow")}</a></div></section><section class="panel glass team-panel"><div class="panel-head"><div><h2>Borradores en este dispositivo</h2><p>No son reportes compartidos ni afectan los promedios.</p></div><span class="badge neutral">${drafts.length} guardados</span></div>${drafts.length ? drafts.map((d) => `<article class="draft"><div><h3>${esc(d.member)} · ${esc(d.metric)}</h3><p>${esc(d.summary.slice(0, 110))}</p><span class="badge neutral">Borrador local · ${clamp(d.progress)}%</span></div><div class="draft-actions"><button class="button secondary" data-draft="${esc(d.id)}">Continuar ${icon("arrow")}</button><button class="icon-button" data-delete-draft="${esc(d.id)}" aria-label="Eliminar borrador">${icon("x")}</button></div></article>`).join("") : `<div class="empty-state">${icon("file")}<h2>Espacio para tu siguiente reporte</h2><p>Guarda un borrador, reúne tus pruebas y retómalo cuando esté listo.</p><button class="button secondary" data-action="qa-report">Preparar reporte QA ${icon("plus")}</button></div>`}</section>`;
}
function criteriaView() {
  return `${heading("Reglas claras. Avances confiables.", "Qué verifica el sistema y qué significa cada indicador.")}<div class="info-grid">${rules()
    .map(
      (r, i) =>
        `<article class="info-card glass"><span class="rule-icon">${icon(r.icon)}</span><h2>0${i + 1} · ${r.title}</h2><p>${["La URL debe apuntar a un Pull Request de <code>Pigui-AI/api-pigui-backend</code>. El repositorio permitido se configura en el verificador.", "El PR debe estar fusionado y registrar al menos un archivo modificado. Esta regla acredita evidencia técnica; no evalúa automáticamente su impacto ni la calidad del código.", "El PR debe tener una revisión de aprobación de otra persona. El sistema revisa el último estado de las revisiones por cuenta.", "En desarrollo, el autor del reporte, el autor del PR y la cuenta asignada al integrante deben coincidir. QA usa una delegación autorizada para reportar sobre el PR que verificó."][i]}</p></article>`,
    )
    .join(
      "",
    )}<article class="info-card glass wide"><h2>Cómo leer tus KPIs</h2><p>El avance individual es el porcentaje del último reporte aceptado por el verificador. El avance del equipo es la media de esos porcentajes. Los PR validados corresponden al contador del resumen. El porcentaje lo declara el integrante: enlazar un PR acredita evidencia, pero no demuestra por sí solo el porcentaje declarado.</p><div class="formula">Avance del equipo = suma de avances individuales ÷ 5 integrantes</div><p>La vista muestra el periodo definido en la configuración. Actualmente no existe reinicio semanal automático, histórico de tendencias ni ponderación por complejidad. Usa estos indicadores para conversar sobre entregas, junto con contexto y revisión humana.</p></article><article class="info-card glass wide"><h2>Yestzanetli · QA comodín</h2><p>QA no necesita una cuenta vinculada para preparar y guardar sus pruebas en este sitio. Los borradores permanecen en el navegador. Para compartirlos, una cuenta autorizada envía el reporte a GitHub; el verificador exige un PR fusionado con aprobación externa y evidencia escrita de las pruebas. El bot <code>piguiai</code> no está asignado a ninguna persona.</p></article></div>`;
}
function route() {
  if (!state.data) return;
  let view = location.hash.replace("#/", "") || "overview";
  if (!["overview", "team", "evidence", "criteria"].includes(view))
    view = "overview";
  document.querySelectorAll("[data-route]").forEach((a) => {
    a.classList.toggle("active", a.dataset.route === view);
    if (a.dataset.route === view) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  document.querySelector("#main").innerHTML = {
    overview,
    team: teamView,
    evidence: evidenceView,
    criteria: criteriaView,
  }[view]();
  document.title = `${{ overview: "Resumen", team: "Equipo", evidence: "Evidencias", criteria: "Criterios" }[view]} · Pigui`;
}
function openReport(member = "") {
  if (!state.data) {
    toast("Espera a que carguen los datos del equipo");
    return;
  }
  const form = document.querySelector("#report-form");
  form.reset();
  delete form.dataset.draftId;
  form.elements.member.value = member || state.data.team[0].name;
  updateReportHint();
  document.querySelector("#report-dialog").showModal();
}
function updateReportHint() {
  const qa =
    document.querySelector("#report-form").elements.member.value ===
    "Yestzanetli";
  document.querySelector("#report-hint").textContent = qa
    ? "QA comodín: registra tus casos de prueba y resultados. Guarda el borrador aquí o pide a una cuenta autorizada que lo publique en GitHub."
    : "Publica desde tu cuenta de GitHub. Debe coincidir con la cuenta del PR y estar vinculada a tu nombre.";
}
function openMember(index) {
  const m = state.data.team[index];
  if (!m) return;
  const el = document.querySelector("#member-dialog");
  el.innerHTML = `<div class="dialog-head"><h2>Detalle del integrante</h2><button class="icon-button" data-action="close" aria-label="Cerrar">${icon("x")}</button></div><div class="member-detail">${avatar(m, index)}<h2>${esc(m.name)}</h2><p class="subtitle">${esc(m.role)}</p><strong class="stat-number">${clamp(m.verified_progress)}<small>%</small></strong><p class="subtitle">Último avance validado</p><div class="detail-line"><span>GitHub</span><strong>${configured(m) ? "@" + esc(m.login) : "QA sin cuenta vinculada"}</strong></div><div class="detail-line"><span>PR validados</span><strong>${count(m.verified_prs)}</strong></div><div class="detail-line"><span>Reportes pendientes</span><strong>${count(m.open_reports)}</strong></div><div class="detail-line"><span>Estado</span>${status(m)}</div></div><div class="dialog-actions"><button class="button primary" data-report-member="${index}">Preparar reporte ${icon("plus")}</button></div>`;
  el.showModal();
}
function exportCsv() {
  if (!state.data) return;
  const rows = [
    [
      "Integrante",
      "Rol",
      "GitHub",
      "Avance validado (%)",
      "PR validados",
      "Pendientes",
    ],
    ...state.data.team.map((m) => [
      m.name,
      m.role,
      m.login || "QA comodín",
      clamp(m.verified_progress),
      count(m.verified_prs),
      count(m.open_reports),
    ]),
  ];
  const csv =
    "\ufeff" +
    rows
      .map((row) =>
        row.map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(","),
      )
      .join("\r\n");
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "pigui-kpis.csv";
  a.click();
  URL.revokeObjectURL(url);
  toast("KPIs exportados a CSV");
}
function search() {
  if (!state.data) return;
  const q = document
    .querySelector("#search-input")
    .value.toLocaleLowerCase("es");
  const pages = [
    ["overview", "Resumen"],
    ["team", "Equipo"],
    ["evidence", "Evidencias"],
    ["criteria", "Criterios"],
  ];
  document.querySelector("#search-results").innerHTML =
    pages
      .filter(([, n]) => n.toLowerCase().includes(q))
      .map(
        ([r, n]) =>
          `<a class="search-result" href="#/${r}" data-search-link>${n}<small>Página ↗</small></a>`,
      )
      .join("") +
    state.data.team
      .map((m, i) => ({ m, i }))
      .filter(({ m }) =>
        `${m.name} ${m.role} ${m.login || ""}`
          .toLocaleLowerCase("es")
          .includes(q),
      )
      .map(
        ({ m, i }) =>
          `<button class="search-result member-button" style="width:100%" data-member="${i}">${esc(m.name)}<small>${esc(m.role)}</small></button>`,
      )
      .join("");
  if (!document.querySelector("#search-results").innerHTML)
    document.querySelector("#search-results").innerHTML =
      '<p class="subtitle">No encontramos resultados.</p>';
}
document.addEventListener("click", (e) => {
  const btn = e.target.closest(
    "[data-action],[data-member],[data-filter],[data-report-member],[data-draft],[data-delete-draft],[data-search-link]",
  );
  if (!btn) return;
  if (btn.hasAttribute("data-search-link"))
    document.querySelector("#search-dialog").close();
  if (btn.dataset.member !== undefined) {
    document.querySelector("#search-dialog").close();
    openMember(Number(btn.dataset.member));
  }
  if (btn.dataset.reportMember !== undefined) {
    document.querySelector("#member-dialog").close();
    openReport(state.data.team[Number(btn.dataset.reportMember)].name);
  }
  if (btn.dataset.filter) {
    state.filter = btn.dataset.filter;
    route();
  }
  if (btn.dataset.draft) {
    const d = readDrafts().find((x) => x.id === btn.dataset.draft);
    if (d) {
      openReport(d.member);
      const form = document.querySelector("#report-form");
      for (const key of ["metric", "progress", "pr", "summary"])
        form.elements[key].value = d[key];
      form.dataset.draftId = d.id;
    }
  }
  if (btn.dataset.deleteDraft) {
    try {
      localStorage.setItem(
        "pigui:drafts",
        JSON.stringify(
          readDrafts().filter((d) => d.id !== btn.dataset.deleteDraft),
        ),
      );
      route();
      toast("Borrador eliminado de este navegador");
    } catch {
      toast("No se pudo eliminar el borrador");
    }
  }
  switch (btn.dataset.action) {
    case "report":
      openReport();
      break;
    case "qa-report":
      openReport("Yestzanetli");
      break;
    case "close":
      btn.closest("dialog").close();
      break;
    case "theme": {
      const theme =
        document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = theme;
      try {
        localStorage.setItem("pigui:theme", theme);
      } catch {}
      toast(theme === "dark" ? "Tema oscuro activado" : "Tema claro activado");
      break;
    }
    case "export":
      exportCsv();
      break;
    case "search":
      document.querySelector("#search-dialog").showModal();
      document.querySelector("#search-input").focus();
      search();
      break;
  }
});
document.querySelector("#search-input").addEventListener("input", search);
document
  .querySelector("#report-form")
  .elements.member.addEventListener("change", updateReportHint);
document.querySelector("#save-draft").addEventListener("click", () => {
  const form = document.querySelector("#report-form");
  if (!form.reportValidity()) return;
  const draft = {
    ...Object.fromEntries(new FormData(form)),
    id: form.dataset.draftId || crypto.randomUUID(),
  };
  try {
    const drafts = readDrafts().filter((d) => d.id !== draft.id);
    drafts.push(draft);
    localStorage.setItem("pigui:drafts", JSON.stringify(drafts));
    form.dataset.draftId = draft.id;
    toast("Borrador guardado en este navegador");
    document.querySelector("#report-dialog").close();
    if (location.hash === "#/evidence") route();
  } catch {
    toast("Este navegador no permite guardar borradores");
  }
});
document.querySelector("#report-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(e.currentTarget));
  if (
    !/^https:\/\/github\.com\/Pigui-AI\/api-pigui-backend\/pull\/\d+\/?$/.test(
      d.pr,
    )
  ) {
    toast("Usa un PR de Pigui-AI/api-pigui-backend");
    e.currentTarget.elements.pr.focus();
    return;
  }
  const fields = [
    ["Integrante", d.member],
    ["Métrica", d.metric],
    ["Avance verificable (0-100)", d.progress],
    ["URL del PR de código", d.pr],
    ["Qué cambió", d.summary],
  ];
  const params = new URLSearchParams({
    title: `KPI: ${d.member} · ${d.metric}`,
    labels: "kpi-report,kpi-pending",
    body: fields.map(([key, val]) => `### ${key}\n\n${val}`).join("\n\n"),
  });
  window.open(`${REPO}/issues/new?${params}`, "_blank", "noopener");
  toast("Continúa en GitHub para publicar el reporte");
});
document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "k") {
    e.preventDefault();
    document.querySelector("#search-dialog").showModal();
    document.querySelector("#search-input").focus();
    search();
  }
});
document.querySelectorAll("dialog").forEach((d) =>
  d.addEventListener("click", (e) => {
    if (e.target === d) {
      const r = d.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        d.close();
    }
  }),
);
window.addEventListener("hashchange", () => {
  route();
  window.scrollTo({ top: 0 });
});
document
  .querySelectorAll("[data-icon]")
  .forEach((el) => (el.innerHTML = icon(el.dataset.icon)));
fetch("data/team.json", { cache: "no-store" })
  .then((r) => {
    if (!r.ok) throw Error("Datos no disponibles");
    return r.json();
  })
  .then((data) => {
    if (!Array.isArray(data.team) || !data.team.length)
      throw Error("Equipo no disponible");
    state.data = data;
    document.querySelector("#report-form").elements.member.innerHTML = data.team
      .map((m) => `<option>${esc(m.name)}</option>`)
      .join("");
    document.querySelector("#source-state").textContent = "Resumen disponible";
    route();
  })
  .catch(() => {
    document.querySelector("#source-state").textContent = "Sin conexión";
    document.querySelector("#main").innerHTML =
      '<section class="empty-state panel glass"><h1>No pudimos cargar los KPIs</h1><p>Recarga la página para volver a consultar el resumen del equipo.</p><button class="button primary" onclick="location.reload()">Reintentar</button></section>';
  });
