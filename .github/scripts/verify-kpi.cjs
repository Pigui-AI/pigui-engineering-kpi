// This module runs only from the trusted default branch; report text is data.
function parseReport(body = "") {
  const fields = {};
  for (const match of body.matchAll(
    /^### ([^\r\n]+)\r?\n([\s\S]*?)(?=^### |$(?![\s\S]))/gm,
  ))
    fields[match[1].trim()] = match[2].trim();
  const rawProgress = fields["Avance verificable (0-100)"];
  return {
    member: fields.Integrante,
    progress: rawProgress ? Number(rawProgress) : NaN,
    pr: fields["URL del PR de código"],
    summary: fields["Qué cambió"] || "",
  };
}
function validateIdentity(person, actor, author, delegates, summary) {
  const login = actor.toLowerCase();
  if (person.reporting_mode === "qa-delegated") {
    if (!delegates.some((d) => d.toLowerCase() === login))
      throw Error("QA debe publicarse desde una cuenta delegada autorizada.");
    if (summary.trim().length < 30)
      throw Error(
        "QA debe incluir casos de prueba y resultados (mínimo 30 caracteres).",
      );
  } else {
    if (!person.login || person.login === "por-asignar")
      throw Error("La cuenta del integrante aún no está vinculada.");
    if (person.login.toLowerCase() !== login || author.toLowerCase() !== login)
      throw Error(
        "La cuenta del integrante, el autor del reporte y el autor del PR deben coincidir.",
      );
  }
}
async function run({ github, context, core, fetch: request = global.fetch }) {
  const repo = { owner: context.repo.owner, repo: context.repo.repo };
  const issue = context.payload.issue;
  const report = parseReport(issue.body);
  const fail = async (message) => {
    await github.rest.issues.setLabels({
      ...repo,
      issue_number: issue.number,
      labels: ["kpi-report", "kpi-rejected"],
    });
    await github.rest.issues.createComment({
      ...repo,
      issue_number: issue.number,
      body: `❌ **KPI no validado:** ${message}`,
    });
    core.setFailed(message);
  };
  try {
    if (
      !report.member ||
      !Number.isFinite(report.progress) ||
      report.progress < 0 ||
      report.progress > 100
    )
      throw Error("Indica integrante y avance entre 0 y 100.");
    const match = report.pr?.match(
      /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)\/?$/,
    );
    if (!match || `${match[1]}/${match[2]}` !== process.env.SOURCE_REPOSITORY)
      throw Error("El PR debe pertenecer al repositorio de código autorizado.");
    const file = await github.rest.repos.getContent({
      ...repo,
      path: "data/team.json",
      ref: "main",
    });
    const dashboard = JSON.parse(
      Buffer.from(file.data.content, "base64").toString("utf8"),
    );
    const person = dashboard.team.find((p) => p.name === report.member);
    if (!person) throw Error("Integrante no reconocido.");
    // An accepted report is immutable in the metrics; editing it never adds another delivery.
    if ((dashboard.accepted_reports || []).includes(issue.number)) {
      await github.rest.issues.createComment({
        ...repo,
        issue_number: issue.number,
        body: "ℹ️ Este reporte ya fue contabilizado. Los cambios de texto no modifican el registro aceptado.",
      });
      return;
    }
    const api = async (endpoint) => {
      const response = await request(
        `https://api.github.com/repos/${match[1]}/${match[2]}/${endpoint}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.PIGUI_READ_TOKEN || process.env.GH_TOKEN}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
        },
      );
      if (!response.ok)
        throw Error("No se pudo consultar la evidencia privada en GitHub.");
      return response.json();
    };
    const pr = await api(`pulls/${match[3]}`);
    if (!pr.merged_at || !pr.changed_files)
      throw Error("El PR debe estar fusionado y registrar cambios.");
    validateIdentity(
      person,
      issue.user.login,
      pr.user.login,
      dashboard.qa_delegates || [],
      report.summary,
    );
    const approvals = new Map();
    for (let page = 1; ; page++) {
      const reviews = await api(
        `pulls/${match[3]}/reviews?per_page=100&page=${page}`,
      );
      for (const review of reviews)
        if (
          ["APPROVED", "CHANGES_REQUESTED", "DISMISSED"].includes(review.state)
        )
          approvals.set(review.user.login.toLowerCase(), review.state);
      if (reviews.length < 100) break;
    }
    if (
      ![...approvals].some(
        ([login, status]) =>
          login !== pr.user.login.toLowerCase() && status === "APPROVED",
      )
    )
      throw Error("Falta la aprobación externa del PR.");
    // A PR counts once per person; QA and the developer can provide different evidence for the same PR.
    const key = `${match[1]}/${match[2]}#${match[3]}`;
    if ((person.counted_prs || []).includes(key))
      throw Error("Ese PR ya fue contabilizado para este integrante.");
    person.counted_prs = [...(person.counted_prs || []), key];
    person.verified_progress = report.progress;
    person.verified_prs = (person.verified_prs || 0) + 1;
    person.open_reports = Math.max(0, (person.open_reports || 0) - 1);
    dashboard.accepted_reports = [
      ...(dashboard.accepted_reports || []),
      issue.number,
    ];
    await github.rest.repos.createOrUpdateFileContents({
      ...repo,
      path: "data/team.json",
      sha: file.data.sha,
      message: `chore(kpi): avance verificado de ${person.name}`,
      content: Buffer.from(JSON.stringify(dashboard, null, 2) + "\n").toString(
        "base64",
      ),
      branch: "main",
    });
    await github.rest.issues.setLabels({
      ...repo,
      issue_number: issue.number,
      labels: ["kpi-report", "kpi-verified"],
    });
    await github.rest.issues.createComment({
      ...repo,
      issue_number: issue.number,
      body: `✅ Reporte de **${person.name}** aceptado: PR fusionado con cambios, aprobación externa e identidad${person.reporting_mode === "qa-delegated" ? " delegada" : ""} verificada.`,
    });
  } catch (error) {
    await fail(error.message);
  }
}
module.exports = { parseReport, validateIdentity, run };
