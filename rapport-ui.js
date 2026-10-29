const rapportPalette = ["#305e51", "#c84324", "#eac64c", "#5865ee", "#8b438e"];
function rapportColor(name) {
  return (
    rapportPalette[
      ["Ever", "América", "Ricardo", "Marco", "Yestzanetli"].indexOf(name)
    ] || rapportPalette[0]
  );
}
function rapportFigure(value, caption, key, positive = false) {
  return `<div class="growth-figure"><strong class="widget-big ${positive ? "positive" : ""}" data-number-key="${key}">${value}</strong><span>${caption}</span></div>`;
}
function rapportArrow(href, label) {
  return `<a class="icon-button card-arrow" href="${href}" aria-label="${label}">${icon("arrow")}</a>`;
}
function rapportBars(groups, total) {
  const percent = state.codeChartMode === "percent",
    max = percent
      ? 100
      : Math.max(
          1,
          Math.ceil(Math.max(...groups.map((g) => g.lines_added), 1) / 40000) *
            40000,
        );
  return `<div class="chart code-chart" role="img" aria-label="Líneas añadidas por integrante${percent ? ", porcentaje del total" : ""}"><div class="chart-grid">${[max, max / 2, 0].map((n) => `<div class="chart-line"><span>${percent ? n + "%" : lineCount(n)}</span></div>`).join("")}</div><div class="chart-bars">${groups.map((g) => `<div class="chart-column" tabindex="0" aria-label="${esc(g.name)}: ${lineCount(g.lines_added)} líneas añadidas"><div class="chart-bar" style="height:${((percent ? (total ? (g.lines_added / total) * 100 : 0) : g.lines_added) / max) * 100}%;--bar-color:${rapportColor(g.name)}"><span>${percent ? (total ? Math.round((g.lines_added / total) * 100) : 0) + "%" : lineCount(g.lines_added)}</span></div></div>`).join("")}</div><div class="chart-x">${groups.map((g) => `<span>${esc(g.name)}</span>`).join("")}</div></div>`;
}
function rapportDonut(groups, total) {
  let offset = 0;
  return `<div class="source-body"><div class="rapport-donut"><svg viewBox="0 0 180 180" role="img" aria-label="Distribución de líneas añadidas por integrante"><circle class="donut-track" cx="90" cy="90" r="66"/>${groups
    .map((g) => {
      const share = total ? (g.lines_added / total) * 100 : 0,
        length = Math.max(0, share - 0.65),
        at = offset;
      offset += share;
      return `<circle class="donut-arc" cx="90" cy="90" r="66" pathLength="100" stroke="${rapportColor(g.name)}" stroke-dasharray="${length} 100" stroke-dashoffset="${-at}" data-owner="${esc(g.name)}"/>`;
    })
    .join(
      "",
    )}</svg><div class="donut-label"><b>${groups.filter((g) => g.lines_added > 0).length}</b><span>integrantes con código</span></div></div><div class="source-legend">${groups.map((g) => `<button data-member="${state.data.team.findIndex((m) => m.name === g.name)}" data-owner="${esc(g.name)}" aria-label="Ver líneas de ${esc(g.name)}"><i style="background:${rapportColor(g.name)}"></i><span>${esc(g.name)}</span><b>${lineCount(g.lines_added)}</b><small>${total ? Math.round((g.lines_added / total) * 100) : 0}%</small></button>`).join("")}</div></div>`;
}
function rapportActivity(buckets) {
  const max = Math.max(1, ...buckets.map((b) => b.lines_added)),
    highest = Math.ceil(max / 40000) * 40000;
  const last = buckets.findLastIndex((b) => b.merged > 0);
  return `<div class="activity-chart"><div class="activity-axis"><span>${lineCount(highest)}</span><span>${lineCount(highest / 2)}</span><span>0</span></div><div class="activity-columns">${buckets.map((b, i) => `<div class="activity-column" tabindex="0" aria-label="Días ${b.label}: ${lineCount(b.lines_added)} líneas añadidas"><div class="activity-track"><i class="activity-fill ${i === last ? "is-latest" : ""}" style="height:${(b.lines_added / highest) * 100}%"></i><span class="chart-tip">${lineCount(b.lines_added)} líneas · ${b.merged} PR</span></div><span>${b.label}</span></div>`).join("")}</div></div>`;
}
function rapportTrend(buckets, summary) {
  const valid = buckets
    .map((b, i) => ({ b, i }))
    .filter(({ b }) => b.coverage !== null);
  if (!valid.length)
    return '<p class="empty-state">Sin entregas para calcular cobertura en esta quincena.</p>';
  const x = (i) => 30 + i * (650 / Math.max(1, buckets.length - 1)),
    y = (value) => 220 - value * 1.9;
  const points = valid.map(({ b, i }) => [x(i), y(b.coverage)]),
    path = RapportMetrics.curve(points);
  const area = path + ` L${points.at(-1)[0]},220 L${points[0][0]},220 Z`;
  return `<div class="review-chart"><svg viewBox="0 0 710 250" preserveAspectRatio="none" role="img" aria-label="Cobertura de aprobación por fecha; promedio de quincena ${summary.coverage}%"><defs><linearGradient id="review-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--pine)" stop-opacity=".3"/><stop offset="100%" stop-color="var(--pine)" stop-opacity="0"/></linearGradient></defs>${[0, 50, 100].map((v) => `<line class="review-grid" x1="30" x2="680" y1="${y(v)}" y2="${y(v)}"/>`).join("")}<path class="review-area" d="${area}" fill="url(#review-area)"/><line class="review-average" x1="30" x2="680" y1="${y(summary.coverage || 0)}" y2="${y(summary.coverage || 0)}"/><path class="review-line" d="${path}" pathLength="1"/>${valid.map(({ b, i }) => `<circle class="review-point" cx="${x(i)}" cy="${y(b.coverage)}" r="4"><title>Días ${b.label}: ${b.coverage}% · ${b.approved}/${b.merged} PR</title></circle>`).join("")}</svg><div class="review-axis" aria-hidden="true"><span>100%</span><span>50%</span><span>0%</span></div><div class="review-labels" aria-hidden="true">${buckets.map((b) => `<span>${b.label}</span>`).join("")}</div></div>`;
}
function rapportWorkTable() {
  return `<section class="panel glass growth-work team-panel"><div class="panel-head"><h2>En qué trabajó cada integrante</h2>${rapportArrow("#/team", "Ver equipo y avances")}</div><p class="card-description">Últimas entregas de la quincena, vinculadas a evidencia real.</p><div class="work-table-head"><span>Integrante</span><span>Resultado ejecutivo</span><span>Líneas + / −</span></div><div class="pane-people-list">${state.data.team
    .map((m, i) => {
      const s = auditMetrics(m),
        qa = m.reporting_mode === "qa-delegated";
      return `<article class="pane-person mini-person"><button class="pane-person-identity member-button" data-member="${i}">${avatar(m, i)}<span><b class="member-name">${esc(m.name)}</b><small class="member-role">${esc(m.role)}</small></span></button>${executiveBrief(m)}<div class="work-count"><strong class="loc-added" data-number-key="${m.name}:added">${qa ? "N/D" : "+" + lineCount(s.lines_added)}</strong><small class="loc-deleted">${qa ? "Sin reporte" : "−" + lineCount(s.lines_deleted)}</small><span class="mini-score">${qa ? "QA" : s.merged + " PR"}</span></div></article>`;
    })
    .join("")}</div></section>`;
}
function rapportPerformance() {
  return `<section class="panel glass growth-performance"><div class="panel-head"><h2>Revisión por integrante</h2>${rapportArrow("#/evidence", "Ver evidencia de revisión")}</div><p class="card-description">Entregas, aprobación externa y cobertura del periodo.</p><div class="performance-row performance-head"><span>Integrante</span><span>PR</span><span>Aprobados</span><span>Cobertura</span></div>${state.data.team
    .map((m, i) => {
      const s = auditMetrics(m),
        qa = m.reporting_mode === "qa-delegated";
      return `<div class="performance-row"><button class="performance-person member-button" data-member="${i}">${avatar(m, i)}<span><b>${esc(m.name)}</b><span class="progress"><i style="width:${s.coverage || 0}%"></i></span><small>${qa ? "Evidencia pendiente" : s.open + " abiertos · " + s.technical_failures + " alertas"}</small></span></button><strong>${qa ? "N/D" : s.merged}</strong><span>${qa ? "N/D" : s.approved}</span><span>${qa ? "N/D" : auditNumber(s.coverage)}</span></div>`;
    })
    .join(
      "",
    )}<div class="performance-note">QA sin reporte no se evalúa como cero.</div></section>`;
}
function rapportOverview() {
  const t = KPIAudit.summarize(state.audit.records),
    groups = KPIAudit.groups(state.data.team, state.audit).sort(
      (a, b) => b.lines_added - a.lines_added,
    ),
    buckets = RapportMetrics.buckets(state.audit.records, state.quincena);
  const metrics = [
    { value: t.merged, label: "PR fusionados en la quincena", ico: "branch" },
    {
      value: lineValue(t, "average_lines_changed"),
      label: "Promedio de líneas cambiadas / PR",
      ico: "code",
    },
    {
      value: auditNumber(t.coverage),
      label: "Cobertura de aprobación externa",
      ico: "shield",
    },
  ];
  return `<header class="growth-head page-header"><div class="growth-title"><h1>Avance<br>del equipo</h1></div><div class="growth-stats">${metrics.map((m, i) => `<div class="growth-stat"><span class="stat-icon">${icon(m.ico)}</span><div><strong class="stat-number" data-number-key="metric:${i}">${m.value}</strong><span>${m.label}</span></div></div>`).join("")}</div><div class="header-actions">${quincenaControl()}<button class="button primary" data-action="export">${icon("download")}Exportar CSV</button></div></header>
  <div class="rapport-grid">
  <section class="panel glass growth-code loc-section"><div class="panel-head"><h2>Líneas de código añadidas</h2><div class="card-tools"><div class="chart-mode" role="group" aria-label="Unidad de la gráfica"><button data-chart-mode="lines" aria-pressed="${state.codeChartMode !== "percent"}">Líneas</button><button data-chart-mode="percent" aria-pressed="${state.codeChartMode === "percent"}">%</button></div>${rapportArrow("#/evidence", "Ver evidencia del código")}</div></div>${rapportFigure(lineValue(t, "lines_added", true), "añadidas · " + state.data.period, "added", true)}<div class="code-chips">${groups.map((g) => `<button data-member="${state.data.team.findIndex((m) => m.name === g.name)}"><i style="background:${rapportColor(g.name)}"></i>${esc(g.name)}<span>${lineCount(g.lines_added)}</span></button>`).join("")}</div>${rapportBars(groups, t.lines_added)}<p class="chart-caption">Código y pruebas en PR fusionados · sin dependencias ni generados</p></section>
  <section class="panel glass growth-source"><div class="panel-head"><h2>Contribución de código</h2>${rapportArrow("#/team", "Ver contribuciones del equipo")}</div><p class="card-description">Distribución de las líneas añadidas en la quincena. Cada PR tiene un responsable.</p>${rapportDonut(groups, t.lines_added)}</section>
  <section class="panel glass growth-activity"><div class="panel-head"><h2>Actividad en la quincena</h2>${rapportArrow("#/evidence", "Ver entregas por fecha")}</div>${rapportFigure(lineValue(t, "lines_added"), "líneas añadidas · agrupadas cada 3 días", "activity")}${rapportActivity(buckets)}</section>
  <section class="panel glass growth-review"><div class="panel-head"><h2>Cobertura de revisión</h2>${rapportArrow("#/criteria", "Ver metodología de revisión")}</div>${rapportFigure(auditNumber(t.coverage), `${t.approved} de ${t.merged} PR con aprobación externa`, "coverage")}<div class="trend-key"><span><i></i>Cobertura por fecha</span><span><i></i>Promedio quincenal</span></div>${rapportTrend(buckets, t)}</section>
  ${rapportWorkTable()}${rapportPerformance()}</div>
  <aside class="validation-strip glass"><div><b>${t.missing_approval}</b><span>Entregas sin aprobación</span></div><div><b>${t.open}</b><span>PR abiertos</span></div><div><b>${t.technical_failures}</b><span>PR con fallos técnicos</span></div><p>Las líneas miden volumen de cambio. La aprobación y los checks se validan por separado.</p><a class="text-link" href="#/evidence">Ver pendientes ${icon("arrow")}</a></aside>`;
}
document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-chart-mode]");
  if (!button) return;
  state.codeChartMode = button.dataset.chartMode;
  route("chart");
  document
    .querySelector(`[data-chart-mode="${state.codeChartMode}"]`)
    ?.focus({ preventScroll: true });
});
