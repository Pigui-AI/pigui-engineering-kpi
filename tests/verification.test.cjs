const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  parseReport,
  validateIdentity,
  run,
} = require("../.github/scripts/verify-kpi.cjs");
const reportBody = (member) =>
  `### Integrante\n\n${member}\n\n### Avance verificable (0-100)\n\n40\n\n### URL del PR de código\n\nhttps://github.com/Pigui-AI/api-pigui-backend/pull/635\n\n### Qué cambió\n\nProbé el inicio de sesión, acceso válido y rechazo de credenciales.\nTodos los casos pasaron.`;
test("parses GitHub form headings and multiline QA evidence", () => {
  const report = parseReport(reportBody("Yestzanetli"));
  assert.equal(report.member, "Yestzanetli");
  assert.equal(report.progress, 40);
  assert.match(report.summary, /Todos los casos pasaron/);
  assert.ok(Number.isNaN(parseReport("### Integrante\n\nMarco").progress));
});
test("developers cannot claim another identity or PR", () => {
  const person = { login: "marcopigui" };
  assert.throws(() =>
    validateIdentity(person, "everbecerra0", "everbecerra0", [], "evidence"),
  );
  assert.throws(() =>
    validateIdentity(person, "marcopigui", "everbecerra0", [], "evidence"),
  );
  assert.doesNotThrow(() =>
    validateIdentity(person, "marcopigui", "marcopigui", [], "evidence"),
  );
});
test("shared identity accepts only the two explicitly configured accounts", () => {
  const person = {
    login: "everbecerra0",
    shared_accounts: ["americabalderas-del", "everbecerra0"],
  };
  assert.doesNotThrow(() =>
    validateIdentity(
      person,
      "everbecerra0",
      "americabalderas-del",
      [],
      "evidence",
    ),
  );
  assert.throws(() =>
    validateIdentity(
      person,
      "marcopigui",
      "americabalderas-del",
      [],
      "evidence",
    ),
  );
  assert.throws(() =>
    validateIdentity(person, "everbecerra0", "marcopigui", [], "evidence"),
  );
});
test("QA delegation permits a different PR author but rejects bots, strangers and missing evidence", () => {
  const qa = { reporting_mode: "qa-delegated" },
    delegates = ["SergiorCode"];
  const summary =
    "Probé las rutas de onboarding con usuarios válidos y ajenos.";
  assert.doesNotThrow(() =>
    validateIdentity(qa, "SergiorCode", "everbecerra0", delegates, summary),
  );
  assert.throws(() =>
    validateIdentity(qa, "piguiai", "everbecerra0", delegates, summary),
  );
  assert.throws(() =>
    validateIdentity(qa, "stranger", "everbecerra0", delegates, summary),
  );
  assert.throws(() =>
    validateIdentity(qa, "SergiorCode", "everbecerra0", delegates, "ok"),
  );
});
function fixture({
  accepted = [],
  counted = [],
  review = "APPROVED",
  reviewCommit = "head-sha",
  actor = "SergiorCode",
} = {}) {
  const writes = [],
    errors = [];
  const dashboard = {
    accepted_reports: accepted,
    qa_delegates: ["SergiorCode"],
    team: [
      {
        name: "Yestzanetli",
        login: null,
        reporting_mode: "qa-delegated",
        counted_prs: counted,
        verified_prs: 0,
      },
    ],
  };
  return {
    dashboard,
    writes,
    errors,
    args: {
      context: {
        repo: { owner: "Pigui-AI", repo: "pigui-engineering-kpi" },
        payload: {
          issue: {
            number: 10,
            body: reportBody("Yestzanetli"),
            user: { login: actor },
          },
        },
      },
      core: { setFailed: (m) => errors.push(m) },
      github: {
        rest: {
          repos: {
            getContent: async () => ({
              data: {
                content: Buffer.from(JSON.stringify(dashboard)).toString(
                  "base64",
                ),
                sha: "sha",
              },
            }),
            createOrUpdateFileContents: async (d) =>
              writes.push(JSON.parse(Buffer.from(d.content, "base64"))),
          },
          issues: { setLabels: async () => {}, createComment: async () => {} },
        },
      },
      fetch: async (url) => ({
        ok: true,
        json: async () =>
          url.includes("reviews")
            ? [
                {
                  user: { login: "reviewer" },
                  state: review,
                  commit_id: reviewCommit,
                },
              ]
            : {
                merged_at: "date",
                changed_files: 3,
                user: { login: "everbecerra0" },
                head: { sha: "head-sha" },
              },
      }),
    },
  };
}
process.env.SOURCE_REPOSITORY = "Pigui-AI/api-pigui-backend";
test("approved QA report updates valid JSON exactly once", async () => {
  const f = fixture();
  await run(f.args);
  assert.deepEqual(f.errors, []);
  assert.equal(f.writes.length, 1);
  assert.equal(f.writes[0].team[0].verified_progress, 40);
  assert.deepEqual(f.writes[0].accepted_reports, [10]);
});
test("edited accepted report and reused PR do not increment counters", async () => {
  const edited = fixture({ accepted: [10] });
  await run(edited.args);
  assert.equal(edited.writes.length, 0);
  const dup = fixture({ counted: ["Pigui-AI/api-pigui-backend#635"] });
  await run(dup.args);
  assert.equal(dup.writes.length, 0);
  assert.match(dup.errors[0], /ya fue contabilizado/);
});
test("unapproved QA evidence never writes dashboard metrics", async () => {
  const f = fixture({ review: "CHANGES_REQUESTED" });
  await run(f.args);
  assert.equal(f.writes.length, 0);
  assert.match(f.errors[0], /aprobación externa/);
});
test("approval on an older commit never validates the current PR", async () => {
  const f=fixture({reviewCommit:'old-sha'});await run(f.args);
  assert.equal(f.writes.length,0);assert.match(f.errors[0],/aprobación externa/);
});
test("shared report updates both people but rejects a PR already counted by either", async () => {
  const f=fixture({actor:'everbecerra0'});
  f.dashboard.team=['Ever','América'].map(name=>({name,login:name==='Ever'?'everbecerra0':'americabalderas-del',shared_evidence_group:'america-ever',shared_accounts:['americabalderas-del','everbecerra0'],counted_prs:['Pigui-AI/api-pigui-backend#634'],verified_prs:1}));
  f.args.context.payload.issue.body=reportBody('Ever');
  await run(f.args);assert.deepEqual(f.errors,[]);
  assert.equal(f.writes[0].team[0].verified_prs,2);assert.equal(f.writes[0].team[1].verified_prs,2);
  const duplicate=fixture({actor:'everbecerra0'});
  duplicate.dashboard.team=f.writes[0].team;
  duplicate.args.context.payload.issue.body=reportBody('Ever');
  await run(duplicate.args);assert.equal(duplicate.writes.length,0);assert.match(duplicate.errors[0],/ya fue contabilizado/);
});
