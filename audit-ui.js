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
  return m.shared_evidence_group
    ? '<span class="badge neutral">América / Ever · compartido</span>'
    : m.reporting_mode === "qa-delegated"
      ? '<span class="badge neutral">Sin reporte atribuible</span>'
      : status(m);
}
function auditTable(records) {
  return `<div class="table-wrap"><table class="data-table"><thead><tr><th>PR / evidencia</th><th>Cuenta fuente</th><th>Entrega y revisión</th><th>Cambios</th><th>Checks técnicos</th></tr></thead><tbody>${records.map((r) => `<tr><td><a class="text-link" href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.repo.split("/")[1])} #${r.number} ↗</a><small class="evidence-date">${r.merged_at ? "Fusionado " + new Date(r.merged_at).toLocaleDateString("es-MX", { timeZone: "America/Mexico_City", day: "2-digit", month: "short" }) : "Sin merge"} · ${esc(r.head_sha.slice(0, 7))}</small></td><td><span class="mono">@${esc(r.author)}</span>${r.author === "americabalderas-del" ? '<small class="evidence-date">Grupo América / Ever</small>' : ""}</td><td>${auditBadge(r)}</td><td>${r.changed_files} archivos</td><td><span class="badge ${KPIAudit.technicalFailure(r) ? "amber" : "neutral"}">${KPIAudit.technicalFailure(r) ? "Con fallos" : r.technical_checks.length ? "Sin fallos reportados" : "Sin señal"}</span></td></tr>`).join("")}</tbody></table></div>`;
}
function auditedOverview() {
  const t = KPIAudit.summarize(state.audit.records),
    groups = KPIAudit.groups(state.data.team, state.audit);
  const max = Math.max(1, ...groups.map((g) => g.merged));
  return `${heading("Avances respaldados en GitHub.", "Corte de actividad: 26–29 de octubre · América y Ever comparten la misma evidencia.")}
<section class="stats" aria-label="Indicadores auditados">${[
    {
      label: "Entregas fusionadas",
      value: t.merged,
      note: `${t.inspected} PR revisados · 8 repositorios`,
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
<div class="overview-grid"><section class="panel glass"><div class="panel-head"><div><h2>Entregas por grupo de evidencia</h2><p>PR fusionados · América / Ever cuenta una sola vez</p></div><span class="badge neutral">Corte verificado</span></div><div class="chart"><div class="chart-grid">${[max, Math.round(max * 0.75), Math.round(max * 0.5), Math.round(max * 0.25), 0].map((n) => `<div class="chart-line"><span>${n}</span></div>`).join("")}</div><div class="chart-bars">${groups.map((g) => `<div class="chart-bar" style="height:${(g.merged / max) * 100}%"><span>${g.merged} PR</span></div>`).join("")}</div><div class="chart-x">${groups.map((g) => `<span>${esc(g.name)}</span>`).join("")}</div></div><div class="chart-foot"><span>QA: sin reporte atribuible, no equivale a 0% de trabajo</span><a href="#/criteria" class="text-link">Ver metodología ${icon("arrow")}</a></div></section>
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
<section class="panel glass team-panel"><div class="panel-head"><div><h2>Avances de todos</h2><p>Las fichas compartidas muestran el mismo grupo; los totales se deduplican.</p></div><a class="text-link" href="#/team">Ver detalle ${icon("arrow")}</a></div><div class="mini-team">${state.data.team
    .map((m, i) => {
      const s = auditMetrics(m),
        qa = m.reporting_mode === "qa-delegated";
      return `<article class="mini-person" style="--avatar:${colors[i]}"><div class="mini-top">${avatar(m, i)}<button class="icon-button" data-member="${i}" aria-label="Ver a ${esc(m.name)}">${icon("arrow")}</button></div><span class="member-name">${esc(m.name)}</span><span class="member-role">${esc(m.role)}</span>${executiveBrief(m)}<div class="mini-score">${qa ? "Sin reporte" : s.merged + " PR"}</div><div class="mini-meta">${qa ? "Evidencia aún no atribuible" : s.approved + " con aprobación · " + auditNumber(s.coverage)}</div><span class="progress"><i style="width:${s.coverage || 0}%"></i></span><small class="evidence-date">${m.shared_evidence_group ? "Grupo compartido América / Ever" : qa ? "No es una calificación de desempeño" : "Cobertura de aprobación"}</small></article>`;
    })
    .join("")}</div></section>
<aside class="setup-banner glass"><span>${icon("info")}</span><p><strong>Entrega no equivale a calidad aprobada.</strong> Los 11 PR con aprobación tienen alertas de CI. Los 42 checks de revisión automática en rojo y los fallos técnicos son señales distintas. No se ejecutaron nuevamente las suites.</p><a class="text-link" href="#/evidence">Ver evidencia ${icon("arrow")}</a></aside>`;
}
function auditedTeamView() {
  return `${heading("El avance, con contexto.", "Evidencia individual y compartida, sin inventar porcentajes de objetivos.")}<section class="team-grid">${state.data.team
    .map((m, i) => {
      const s = auditMetrics(m),
        qa = m.reporting_mode === "qa-delegated";
      return `<article class="person-card glass"><div class="person-top">${avatar(m, i)}</div><h2>${esc(m.name)}</h2><p>${esc(m.role)}</p>${auditShare(m)}${executiveBrief(m)}<div class="person-score audit-score">${qa ? "Sin reporte" : s.merged + " PR"}</div><p>${qa ? "Pendiente de evidencia QA atribuible." : `${s.approved} con aprobación externa · ${s.missing_approval} sin aprobación`}</p><div class="person-meta"><span>Cobertura de aprobación</span><strong>${auditNumber(s.coverage)}</strong></div><span class="progress"><i style="width:${s.coverage || 0}%"></i></span><div class="person-meta"><span>${s.open} abiertos · ${s.discarded} descartados</span><span>${s.technical_failures} alertas técnicas</span></div><button class="button secondary" data-member="${i}">Ver evidencia ${icon("arrow")}</button></article>`;
    })
    .join(
      "",
    )}</section><aside class="setup-banner glass"><p>América y Ever comparten 42 PR revisados y 40 fusionados. Esto acredita el grupo confirmado por la persona responsable; GitHub no permite repartir su autoría individual. El bot piguiai queda excluido.</p></aside>`;
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
  return `${heading("Cada cifra tiene un PR.", "Snapshot de GitHub al 29 oct, 12:36 (Ciudad de México). Los enlaces respetan los permisos del repositorio.")}<section class="panel glass"><div class="panel-head"><div><h2>Evidencias verificadas</h2><p>${rows.length} PR en esta vista · ${state.audit.records.length} únicos en el corte</p></div><a class="text-link" href="data/github-audit.json" target="_blank" rel="noopener">Ver datos ↗</a></div><div class="audit-filters"><label>Integrante<select id="audit-person"><option value="all">Todos · sin duplicados</option>${state.data.team.map((m) => `<option value="${esc(m.name)}" ${person === m.name ? "selected" : ""}>${esc(m.name)}</option>`).join("")}</select></label><label>Condición<select id="audit-status">${[
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
  const t = KPIAudit.summarize(state.audit.records),
    gs = KPIAudit.groups(state.data.team, state.audit).filter(
      (g) => g.coverage !== null,
    );
  const mean =
    Math.round((gs.reduce((s, g) => s + g.coverage, 0) / gs.length) * 10) / 10;
  return `${heading("Cómo se validaron los avances.", "Las cifras corresponden a evidencia de GitHub; el porcentaje de objetivos necesita metas acordadas.")}<div class="info-grid"><article class="info-card glass"><h2>Qué se revisó</h2><p>54 PR con actividad entre el 26 de octubre y el corte del 29 de octubre, en ocho repositorios accesibles de Pigui-AI. Se contrastaron autor, estado de merge, SHA, archivos modificados, aprobaciones y checks del commit. Un PR cerrado sin merge se muestra como descartado.</p><p>No se ejecutaron nuevamente las suites ni se hizo una auditoría independiente completa del código. Los checks pueden reflejar incidencias de infraestructura y no deben tratarse como una calificación automática personal.</p></article><article class="info-card glass"><h2>Cobertura, no progreso de objetivos</h2><div class="formula">${t.approved} entregas con aprobación ÷ ${t.merged} fusionadas = ${t.coverage}%</div><p>Media simple por grupo con entregas: ${mean}% (Marco, América/Ever y Ricardo). El indicador principal es la cobertura ponderada por PR, ${t.coverage}%. QA sin evidencia no se incorpora como cero. No existe un denominador de metas para afirmar un porcentaje real de avance del sprint.</p></article><article class="info-card glass"><h2>Trabajo compartido América / Ever</h2><p>La persona responsable confirmó que su trabajo es el mismo. Ambas fichas comparten las 42 evidencias de esa cuenta; cada PR cuenta una sola vez en el equipo. La cuenta autora original se conserva. No se adjudican por separado los 40 merges ni se infiere cómo se repartió el trabajo.</p></article><article class="info-card glass"><h2>Checks técnicos y revisión automática</h2><p>Hay ${t.technical_failures} PR con fallos en checks técnicos y ${t.no_ci} sin señal de CI. Los 42 rollups en rojo incluyen el check de revisión automática. En la muestra backend #635 se confirmó que ese check falla por un secreto de configuración faltante; la suite completa también falla. Esa causa no se generaliza a todos los checks sin revisar sus logs.</p></article><article class="info-card glass wide"><h2>QA y porcentajes declarados</h2><p>No hay reportes de KPI compartidos ni menciones atribuibles a Yestzanetli en los Issues/PR consultados. Los títulos que contienen “QA” son cambios de código de sus autores, no pruebas de autoría de Yestzanetli. Sus borradores locales no están disponibles desde otros dispositivos. Puede registrar pruebas y enviarlas por la delegación ya configurada.</p><p>El porcentaje declarado por una persona en un reporte se almacena aparte. Este corte documental no inventa porcentajes de ejecución ni los usa como evaluación de desempeño.</p></article></div>`;
}
function openAuditedMember(index) {
  const m = state.data.team[index],
    rows = KPIAudit.memberRecords(m, state.audit),
    s = KPIAudit.summarize(rows),
    qa = m.reporting_mode === "qa-delegated";
  const el = document.querySelector("#member-dialog");
  el.innerHTML = `<div class="dialog-head"><h2>${esc(m.name)} · evidencia</h2><button class="icon-button" data-action="close" aria-label="Cerrar">${icon("x")}</button></div><div class="member-detail">${avatar(m, index)}<p class="subtitle">${esc(m.role)} · @${esc(m.login || "QA delegado")}</p>${auditShare(m)}${executiveBrief(m, true)}<strong class="stat-number">${qa ? "N/D" : s.merged + " PR"}</strong><p class="subtitle">Entregas fusionadas del corte${m.shared_evidence_group ? " · grupo América / Ever" : ""}</p><div class="detail-line"><span>Con aprobación externa</span><strong>${s.approved}</strong></div><div class="detail-line"><span>Cobertura de revisión</span><strong>${auditNumber(s.coverage)}</strong></div><div class="detail-line"><span>Checks técnicos con fallos</span><strong>${s.technical_failures}</strong></div>${
    qa
      ? '<p class="form-hint">No se encontró evidencia QA atribuible. Esto no equivale a 0% de trabajo.</p>'
      : `<p class="form-hint">${m.shared_evidence_group ? "Evidencia compartida: se contabiliza una sola vez en el equipo." : "Los merges sin revisión externa permanecen identificados como pendientes de validación."}</p><div class="member-evidence-links">${rows
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
      "Grupo de evidencia",
      "PR revisados",
      "PR fusionados",
      "Con aprobación externa",
      "Cobertura de revisión (%)",
      "Fallos técnicos",
      "Avance de objetivos",
    ],
    ...KPIAudit.groups(state.data.team, state.audit).map((s) => {
      return [
        s.name,
        s.name === "América / Ever" ? "america-ever (contado una vez)" : s.name,
        s.inspected,
        s.merged,
        s.approved,
        s.coverage ?? "N/D",
        s.technical_failures,
        "No medible sin metas",
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
    ],
  ];
}
document.addEventListener("change", (e) => {
  if (e.target.id === "audit-person") {
    state.auditPerson = e.target.value;
    route();
  }
  if (e.target.id === "audit-status") {
    state.auditStatus = e.target.value;
    route();
  }
});
