function lineCount(n) {
  return new Intl.NumberFormat("es-MX").format(n);
}
function lineValue(s, key, signed = false) {
  if (!s.lines_measured_prs) return "N/D";
  const n = s[key];
  return (signed && n > 0 ? "+" : "") + lineCount(n);
}
function codeMini(s) {
  return `<div class="loc-mini" aria-label="Líneas de código"><div><span>Añadidas</span><strong class="loc-added">${s.lines_measured_prs ? "+" + lineValue(s, "lines_added") : "N/D"}</strong></div><div><span>Eliminadas</span><strong class="loc-deleted">${s.lines_measured_prs ? "−" + lineValue(s, "lines_deleted") : "N/D"}</strong></div><div class="loc-net"><span>Cambio neto</span><strong>${lineValue(s, "lines_net", true)}</strong></div></div>`;
}
function codeStats(s) {
  const total = s.lines_changed,
    addedShare = total ? Math.round((s.lines_added / total) * 100) : 0,
    deletedShare = total ? Math.round((s.lines_deleted / total) * 100) : 0;
  return `<section class="loc-section pane-widgets" aria-label="Actividad de código">
 <article class="pane-widget glass"><div class="widget-head"><h2>Distribución del cambio</h2><span class="badge neutral">Código</span></div><p class="widget-kicker">Añadidas y eliminadas en la quincena</p><div class="ring-layout"><div class="code-ring"><svg viewBox="0 0 150 150" role="img" aria-label="${addedShare}% de las líneas cambiadas fueron añadidas"><title>Distribución de líneas añadidas y eliminadas</title><circle class="ring-track" cx="75" cy="75" r="58" pathLength="100"/><circle class="ring-added" cx="75" cy="75" r="58" pathLength="100" stroke-dasharray="${addedShare} 100"/><circle class="ring-track" cx="75" cy="75" r="42" pathLength="100"/><circle class="ring-deleted" cx="75" cy="75" r="42" pathLength="100" stroke-dasharray="${deletedShare} 100"/></svg><div class="code-ring-label"><b>${s.lines_measured_prs ? addedShare + "%" : "N/D"}</b><small>añadidas</small></div></div><div class="ring-legend"><div><span>Añadidas</span><strong>${lineValue(s, "lines_added")}</strong></div><div><span>Eliminadas</span><strong>${lineValue(s, "lines_deleted")}</strong></div></div></div></article>
 <article class="pane-widget glass widget-blue"><div class="widget-head"><h2>Código incorporado</h2><span class="badge neutral">Quincena</span></div><p class="widget-kicker">Líneas añadidas en PR fusionados</p><strong class="widget-big positive">${lineValue(s, "lines_added", true)}</strong><p class="widget-caption">Código y pruebas · sin dependencias ni generados</p><div class="widget-foot widget-footline"><span>Promedio de cambios / PR</span><strong>${lineValue(s, "average_lines_changed")}</strong></div></article>
 <article class="pane-widget glass widget-pink"><div class="widget-head"><h2>Depuración y balance</h2></div><p class="widget-kicker">La limpieza también cuenta</p><strong class="widget-big">${lineValue(s, "lines_deleted")}</strong><p class="widget-caption">Líneas eliminadas, incluidos refactors</p><div class="widget-net"><span>Cambio neto</span><strong>${lineValue(s, "lines_net", true)}</strong></div><p class="widget-caption" style="margin-top:10px">${s.lines_measured_prs} de ${s.merged} entregas con medición completa</p></article>
 </section>`;
}
function quincenaOptions() {
  const base = state.auditSource.as_of.slice(0, 7);
  const [y, m] = base.split("-").map(Number);
  return [0, 1, 2].flatMap((offset) => {
    const date = new Date(Date.UTC(y, m - 1 - offset, 1));
    const prefix = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    return [`${prefix}-2`, `${prefix}-1`];
  });
}
function quincenaControl() {
  return `<label class="period period-filter">${icon("calendar")}<select id="quincena-filter" aria-label="Filtrar por quincena">${quincenaOptions()
    .map(
      (id) =>
        `<option value="${id}" ${id === state.quincena ? "selected" : ""}>${KPIAudit.quincenaRange(id).label}</option>`,
    )
    .join("")}</select></label>`;
}
function selectQuincena(id) {
  if (!quincenaOptions().includes(id))
    id = KPIAudit.defaultQuincena(state.auditSource.as_of);
  state.quincena = id;
  state.data.period = KPIAudit.quincenaRange(id).label;
  state.audit = {
    ...state.auditSource,
    records: KPIAudit.filterQuincena(state.auditSource.records, id),
  };
  state.data.team = KPIAudit.rankMembers(state.data.team, state.audit);
}
function executiveBrief(m, detail = false) {
  const summary = `<div class="executive-work"><span>En qué trabajó</span><p>${esc(m.executive_summary || "Sin resumen atribuible en este corte.")}</p></div>`;
  if (!detail || !m.workstreams?.length) return summary;
  return (
    summary +
    `<ul class="executive-results">${m.workstreams
      .slice(0, 3)
      .map(
        (w) =>
          `<li>${esc(w.text)}<small>${w.prs
            .map((key) => {
              const r = state.audit.records.find((r) => r.key === key);
              return r
                ? `<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.repo.split("/")[1])} #${r.number} ↗</a>`
                : "";
            })
            .join(" · ")}</small></li>`,
      )
      .join("")}</ul>`
  );
}
function auditMetrics(m) {
  return KPIAudit.summarize(KPIAudit.memberRecords(m, state.audit));
}
function auditNumber(n) {
  return n === null ? "N/D" : `${n}%`;
}
function auditBadge(r) {
  return r.excluded
    ? '<span class="badge neutral">Cerrado sin merge</span>'
    : KPIAudit.approved(r)
      ? r.ci === "FAILURE"
        ? '<span class="badge amber">Aprobado · CI alerta</span>'
        : '<span class="badge">Aprobación externa</span>'
      : r.merged_at
        ? '<span class="badge amber">Sin aprobación externa</span>'
        : '<span class="badge neutral">En curso</span>';
}
function auditShare(m) {
  return m.reporting_mode === "qa-delegated"
    ? '<span class="badge neutral">Sin reporte atribuible</span>'
    : status(m);
}
function auditTable(records) {
  return (
    '<div class="table-wrap"><table class="data-table"><thead><tr><th>PR / evidencia</th><th>Responsable</th><th>Entrega y revisión</th><th>Archivos</th><th>Líneas +</th><th>Líneas −</th><th>Neto</th><th>Checks técnicos</th></tr></thead><tbody>' +
    records
      .map(
        (r) =>
          `<tr><td><a class="text-link" href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.repo.split("/")[1])} #${r.number} ↗</a></td><td>${esc(r.responsible)}</td><td>${auditBadge(r)}</td><td>${r.changed_files} archivos</td><td class="loc-added">${r.code_lines?.status === "complete" ? "+" + lineCount(r.code_lines.additions) : "N/D"}</td><td class="loc-deleted">${r.code_lines?.status === "complete" ? "−" + lineCount(r.code_lines.deletions) : "N/D"}</td><td>${r.code_lines?.status === "complete" ? lineCount(r.code_lines.net) : "N/D"}</td><td><span class="badge neutral">${KPIAudit.technicalFailure(r) ? "Con fallos" : r.technical_checks.length ? "Sin fallos reportados" : "Sin señal"}</span></td></tr>`,
      )
      .join("") +
    "</tbody></table></div>"
  );
}
function auditedOverview() {
  const t = KPIAudit.summarize(state.audit.records),
    groups = KPIAudit.groups(state.data.team, state.audit).sort(
      (a, b) => b.lines_added - a.lines_added,
    );
  const rawMax = Math.max(1, ...groups.map((g) => g.lines_added));
  const scale = 10 ** Math.max(0, Math.floor(Math.log10(rawMax)) - 1);
  const max = Math.ceil(rawMax / (scale * 4)) * (scale * 4);
  return `${heading("Así avanza tu equipo.", `Quincena ${state.data.period} · evidencia recopilada del 26 al 29 de octubre.`)}
<section class="stats" aria-label="Indicadores auditados">${[
    {
      label: "Entregas fusionadas",
      value: t.merged,
      note: `${t.inspected} PR revisados en la quincena`,
      ico: "branch",
    },
    {
      label: "Con aprobación externa",
      value: t.approved,
      note: "Merge + cambios + revisión del head",
      ico: "shield",
    },
    {
      label: "Cobertura de aprobación",
      value: `${t.coverage}<small>%</small>`,
      note: `${t.approved} de ${t.merged} entregas · sin duplicados`,
      ico: "chart",
      accent: true,
    },
    {
      label: "Checks técnicos con fallos",
      value: t.technical_failures,
      note: `${t.ci_alerts} alertas CI totales · ${t.no_ci} sin señal`,
      ico: "info",
    },
  ]
    .map(
      (s) =>
        `<article class="stat glass ${s.accent ? "accent-stat" : ""}"><div class="stat-label">${s.label}${icon(s.ico)}</div><strong class="stat-number">${s.value}</strong><span class="stat-note">${s.note}</span></article>`,
    )
    .join("")}</section>
${codeStats(t)}
<div class="overview-grid"><section class="panel glass"><div class="panel-head"><div><h2>Líneas de código añadidas</h2><p>Por integrante · código y pruebas en PR fusionados</p></div><span class="badge neutral">Corte verificado</span></div><div class="chart code-chart"><div class="chart-grid">${[max, Math.round(max * 0.75), Math.round(max * 0.5), Math.round(max * 0.25), 0].map((n) => `<div class="chart-line"><span>${lineCount(n)}</span></div>`).join("")}</div><div class="chart-bars">${groups.map((g) => `<div class="chart-column"><div class="chart-bar" style="height:${(g.lines_added / max) * 100}%"><span>${lineCount(g.lines_added)}</span></div></div>`).join("")}</div><div class="chart-x">${groups.map((g) => `<span>${esc(g.name)}</span>`).join("")}</div></div><div class="chart-foot"><span>QA: sin reporte atribuible, no equivale a 0% de trabajo</span><a href="#/criteria" class="text-link">Ver metodología ${icon("arrow")}</a></div></section>
<section class="panel glass"><div class="panel-head"><div><h2>Lo que falta validar</h2><p>Los bloqueos conservan su motivo.</p></div></div><div class="rule-list">${[
    {
      title: `${t.missing_approval} entregas sin aprobación`,
      note: "Están fusionadas; falta revisión externa.",
      ico: "users",
    },
    {
      title: `${t.open} PR siguen abiertos`,
      note: "No se contabilizan como entregas.",
      ico: "branch",
    },
    {
      title: `${t.technical_failures} PR con fallos técnicos`,
      note: "Las pruebas y los checks se muestran aparte.",
      ico: "code",
    },
    {
      title: "QA pendiente de evidencia",
      note: "No atribuimos a QA los tests de otra cuenta.",
      ico: "file",
    },
  ]
    .map(
      (x) =>
        `<div class="rule-item"><span class="rule-icon">${icon(x.ico)}</span><div><strong>${x.title}</strong><p>${x.note}</p></div></div>`,
    )
    .join("")}</div></section></div>
${panePeople()}\n<aside class="setup-banner glass"><span>${icon("info")}</span><p><strong>Entrega no equivale a calidad aprobada.</strong> Los 11 PR con aprobación tienen alertas de CI. Los checks de revisión automática en rojo y los fallos técnicos son señales distintas. No se ejecutaron nuevamente las suites.</p><a class="text-link" href="#/evidence">Ver evidencia ${icon("arrow")}</a></aside>`;
}
function panePeople() {
  return `<section class="panel glass team-panel"><div class="panel-head"><div><h2>En qué está tu equipo</h2><p>Resultados ejecutivos y evidencia por integrante</p></div><a class="text-link" href="#/team">Ver equipo ${icon("arrow")}</a></div><div class="pane-people-list">${state.data.team
    .map((m, i) => {
      const s = auditMetrics(m),
        qa = m.reporting_mode === "qa-delegated";
      return `<article class="mini-person pane-person ${qa ? "is-qa" : ""}" style="--avatar:${colors[i]}"><div class="pane-person-identity">${avatar(m, i)}<div><span class="member-name">${esc(m.name)}</span><span class="member-role">${esc(m.role)}</span></div></div>${executiveBrief(m)}<div class="pane-person-metrics"><div class="mini-score">${qa ? "Sin reporte" : s.merged + " PR"}</div><div class="mini-meta">${qa ? "Evidencia pendiente" : s.approved + " con aprobación"}</div><span class="progress"><i style="width:${s.coverage || 0}%"></i></span></div>${codeMini(s)}<button class="icon-button" data-member="${i}" aria-label="Ver a ${esc(m.name)}">${icon("arrow")}</button></article>`;
    })
    .join("")}</div></section>`;
}
function auditedTeamView() {
  return `${heading("El avance, con contexto.", "Resultados individuales, con enlaces a los PR de respaldo.")}<section class="team-grid">${state.data.team
    .map((m, i) => {
      const s = auditMetrics(m),
        qa = m.reporting_mode === "qa-delegated";
      return `<article class="person-card glass"><div class="person-top">${avatar(m, i)}</div><h2>${esc(m.name)}</h2><p>${esc(m.role)}</p>${auditShare(m)}${executiveBrief(m)}<div class="person-score audit-score">${qa ? "Sin reporte" : s.merged + " PR"}</div><p>${qa ? "Pendiente de evidencia QA atribuible." : `${s.approved} con aprobación externa · ${s.missing_approval} sin aprobación`}</p><div class="person-meta"><span>Cobertura de aprobación</span><strong>${auditNumber(s.coverage)}</strong></div><span class="progress"><i style="width:${s.coverage || 0}%"></i></span>${codeMini(s)}<div class="person-meta"><span>${s.open} abiertos · ${s.discarded} descartados</span><span>${s.technical_failures} alertas técnicas</span></div><button class="button secondary" data-member="${i}">Ver evidencia ${icon("arrow")}</button></article>`;
    })
    .join(
      "",
    )}</section><aside class="setup-banner glass"><p>Cada PR se asigna a un responsable operativo y se cuenta una sola vez en los totales.</p></aside>`;
}
function auditedEvidenceView() {
  const person = state.auditPerson || "all",
    statusFilter = state.auditStatus || "all";
  let rows = state.audit.records;
  if (person !== "all") {
    const m = state.data.team.find((m) => m.name === person);
    rows = m ? KPIAudit.memberRecords(m, state.audit) : [];
  }
  rows = rows.filter((r) =>
    statusFilter === "approved"
      ? KPIAudit.approved(r)
      : statusFilter === "unapproved"
        ? r.merged_at && !KPIAudit.approved(r)
        : statusFilter === "technical"
          ? KPIAudit.technicalFailure(r)
          : statusFilter === "open"
            ? r.state === "OPEN"
            : true,
  );
  return `${heading("Cada cifra tiene un PR.", "Corte de GitHub del 29 de octubre. Los enlaces respetan los permisos del repositorio.")}<section class="panel glass"><div class="panel-head"><div><h2>Evidencias verificadas</h2><p>${rows.length} PR en esta vista · ${state.audit.records.length} únicos en el corte</p></div><a class="text-link" href="data/github-audit.json" target="_blank" rel="noopener">Ver datos ↗</a></div><div class="audit-filters"><label>Integrante<select id="audit-person"><option value="all">Todos · sin duplicados</option>${state.data.team.map((m) => `<option value="${esc(m.name)}" ${person === m.name ? "selected" : ""}>${esc(m.name)}</option>`).join("")}</select></label><label>Condición<select id="audit-status">${[
    ["all", "Todos los estados"],
    ["approved", "Fusionados con aprobación"],
    ["unapproved", "Fusionados sin aprobación"],
    ["technical", "Fallos técnicos"],
    ["open", "Abiertos"],
  ]
    .map(
      ([key, label]) =>
        `<option value="${key}" ${statusFilter === key ? "selected" : ""}>${label}</option>`,
    )
    .join(
      "",
    )}</select></label></div>${rows.length ? auditTable(rows) : '<div class="empty-state"><h2>Sin evidencia en este corte</h2><p>No hay reportes atribuibles a este integrante o con este filtro. No se interpreta como falta de trabajo.</p><button class="button secondary" data-action="qa-report">Preparar reporte QA</button></div>'}</section>${evidenceView()
    .split('<section class="panel glass team-panel">')
    .slice(1)
    .map((part) => '<section class="panel glass team-panel">' + part)
    .join("")}`;
}
function auditedCriteria() {
  const t = KPIAudit.summarize(state.audit.records);
  return `${heading("Cómo se validaron los avances.", "Resultados por responsable, respaldados por PR de GitHub.")}<div class="info-grid"><article class="info-card glass"><h2>Corte de evidencia</h2><p>${t.inspected} PR observados en ocho repositorios. Se revisaron merge, cambios, aprobaciones del head y checks. No se volvieron a ejecutar las suites.</p></article><article class="info-card glass"><h2>Cobertura de aprobación</h2><div class="formula">${t.approved} con aprobación ÷ ${t.merged} fusionados = ${t.coverage}%</div><p>Es cobertura de revisión, no un porcentaje de cumplimiento de objetivos. QA sin evidencia no se incorpora como cero.</p></article><article class="info-card glass"><h2>Responsabilidad individual</h2><p>Los resultados se presentan por responsable operativo: backend en Ever y producto/móvil en América. Se incorporó a Ever la evidencia adicional indicada por la persona responsable. Cada PR tiene un único responsable; la autoría original se conserva en GitHub y no se modifica.</p></article><article class="info-card glass"><h2>Estado técnico</h2><p>${t.technical_failures} PR tienen fallos técnicos y ${t.no_ci} no tienen señal de CI. La aprobación externa no convierte en exitosos los checks fallidos.</p></article><article class="info-card glass wide"><h2>Cómo se cuentan las líneas</h2><p>Se suman las líneas añadidas y eliminadas de archivos de código y pruebas en PR fusionados de la quincena, según GitHub. Se excluyen dependencias, salidas de compilación, archivos generados, documentación y formatos de datos/configuración. El cambio neto es añadidas menos eliminadas; el promedio usa añadidas más eliminadas por PR medido. Los cambios sucesivos de una misma línea en PR distintos cuentan en cada entrega. Es volumen de cambio, no una calificación de calidad ni el tamaño actual del repositorio.</p></article><article class="info-card glass wide"><h2>QA</h2><p>Yestzanetli conserva su formulario de pruebas. Al corte no hay evidencia atribuible en GitHub; esta ausencia no es una calificación de desempeño.</p></article></div>`;
}
function openAuditedMember(index) {
  const m = state.data.team[index],
    rows = KPIAudit.memberRecords(m, state.audit),
    s = KPIAudit.summarize(rows),
    qa = m.reporting_mode === "qa-delegated";
  const el = document.querySelector("#member-dialog");
  el.innerHTML = `<div class="dialog-head"><h2>${esc(m.name)} · evidencia</h2><button class="icon-button" data-action="close" aria-label="Cerrar">${icon("x")}</button></div><div class="member-detail">${avatar(m, index)}<p class="subtitle">${esc(m.role)}</p>${auditShare(m)}${executiveBrief(m, true)}<strong class="stat-number">${qa ? "N/D" : s.merged + " PR"}</strong><p class="subtitle">Entregas fusionadas del corte</p>${codeMini(s)}<div class="detail-line"><span>Promedio de cambios por PR</span><strong>${lineValue(s, "average_lines_changed")}</strong></div><div class="detail-line"><span>Con aprobación externa</span><strong>${s.approved}</strong></div><div class="detail-line"><span>Cobertura de revisión</span><strong>${auditNumber(s.coverage)}</strong></div><div class="detail-line"><span>Checks técnicos con fallos</span><strong>${s.technical_failures}</strong></div>${
    qa
      ? '<p class="form-hint">No se encontró evidencia QA atribuible. Esto no equivale a 0% de trabajo.</p>'
      : `<p class="form-hint">Los merges sin revisión externa permanecen identificados como pendientes de validación.</p><div class="member-evidence-links">${rows
          .slice(0, 8)
          .map(
            (r) =>
              `<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.repo.split("/")[1])} #${r.number} ↗</a>`,
          )
          .join("")}</div>`
  }</div><div class="dialog-actions"><button class="button primary" data-report-member="${index}">Preparar reporte ${icon("plus")}</button></div>`;
  el.showModal();
}
function auditCsvRows() {
  return [
    [
      "Integrante",
      "Especialidad",
      "PR revisados",
      "PR fusionados",
      "Con aprobación externa",
      "Cobertura de revisión (%)",
      "Fallos técnicos",
      "Avance de objetivos",
      "Líneas añadidas",
      "Líneas eliminadas",
      "Cambio neto",
      "Promedio de cambios por PR",
      "Quincena",
    ],
    ...KPIAudit.groups(state.data.team, state.audit).map((s) => {
      return [
        s.name,
        state.data.team.find((m) => m.name === s.name)?.role || s.name,
        s.inspected,
        s.merged,
        s.approved,
        s.coverage ?? "N/D",
        s.technical_failures,
        "No medible sin metas",
        s.lines_measured_prs ? s.lines_added : "N/D",
        s.lines_measured_prs ? s.lines_deleted : "N/D",
        s.lines_measured_prs ? s.lines_net : "N/D",
        s.average_lines_changed ?? "N/D",
        state.data.period,
      ];
    }),
    [
      "Yestzanetli",
      "QA delegado",
      "Sin evidencia atribuible",
      "N/D",
      "N/D",
      "N/D",
      "N/D",
      "No medible sin metas",
      "N/D",
      "N/D",
      "N/D",
      "N/D",
      state.data.period,
    ],
  ];
}
document.addEventListener("change", (e) => {
  if (e.target.id === "quincena-filter") {
    selectQuincena(e.target.value);
    try {
      localStorage.setItem("pigui:quincena", state.quincena);
    } catch {}
    route();
  }
  if (e.target.id === "audit-person") {
    state.auditPerson = e.target.value;
    route();
  }
  if (e.target.id === "audit-status") {
    state.auditStatus = e.target.value;
    route();
  }
});
