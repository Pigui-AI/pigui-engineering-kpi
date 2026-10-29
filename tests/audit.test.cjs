const { test } = require("node:test");
const assert = require("node:assert/strict");
const audit = require("../audit-model.js");
const snapshot = require("../data/github-audit.json");
const team = require("../data/team.json").team;
test("snapshot totals deduplicate the shared America/Ever evidence", () => {
  const t = audit.summarize(snapshot.records);
  assert.equal(
    snapshot.records.length,
    new Set(snapshot.records.map((r) => r.key)).size,
  );
  assert.deepEqual(
    {
      inspected: t.inspected,
      merged: t.merged,
      approved: t.approved,
      coverage: t.coverage,
      technical: t.technical_failures,
    },
    { inspected: 54, merged: 51, approved: 11, coverage: 21.6, technical: 13 },
  );
  const america = audit.memberRecords(
    team.find((m) => m.name === "América"),
    snapshot,
  );
  const ever = audit.memberRecords(
    team.find((m) => m.name === "Ever"),
    snapshot,
  );
  assert.deepEqual(america, ever);
  assert.equal(america.length, 42);
  assert.equal(audit.groups(team, snapshot).length, 3);
  assert.equal(
    audit.groups(team, snapshot).reduce((n, g) => n + g.merged, 0),
    51,
  );
});
test("QA without attributable evidence is not scored as zero", () => {
  const qa = team.find((m) => m.name === "Yestzanetli");
  const t = audit.summarize(audit.memberRecords(qa, snapshot));
  assert.equal(t.coverage, null);
  assert.equal(qa.verified_progress, null);
});
test("approval evidence cannot silently turn failing CI green", () => {
  const approved = snapshot.records.filter(audit.approved);
  assert.equal(approved.length, 11);
  assert.ok(approved.every(audit.technicalFailure));
  assert.ok(
    snapshot.records.filter((r) => r.excluded).every((r) => !audit.approved(r)),
  );
});
test("unmerged or unchanged PR is never counted as an approved delivery", () => {
  assert.equal(
    audit.approved({ external_approval: true, changed_files: 1 }),
    false,
  );
  assert.equal(
    audit.approved({
      merged_at: "date",
      external_approval: true,
      changed_files: 0,
    }),
    false,
  );
});
