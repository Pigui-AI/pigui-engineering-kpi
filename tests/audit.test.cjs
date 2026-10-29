const { test } = require("node:test");
const assert = require("node:assert/strict");
const audit = require("../audit-model.js");
const snapshot = require("../data/github-audit.json");
const team = require("../data/team.json").team;
test("live snapshot has unique PRs and exactly one configured responsible per record", () => {
  assert.equal(
    snapshot.records.length,
    new Set(snapshot.records.map((r) => r.key)).size,
  );
  assert.ok(
    snapshot.records.every((r) => team.some((m) => m.name === r.responsible)),
  );
  const merged = snapshot.records.filter((r) => r.merged_at);
  assert.equal(
    audit.groups(team, snapshot).reduce((n, g) => n + g.merged, 0),
    merged.length,
  );
  assert.equal(
    audit.summarize(snapshot.records).approved,
    merged.filter((r) => r.changed_files > 0 && r.external_approval).length,
  );
  const america = audit.memberRecords(
      team.find((m) => m.name === "América"),
      snapshot,
    ),
    ever = audit.memberRecords(
      team.find((m) => m.name === "Ever"),
      snapshot,
    );
  assert.equal(
    america.some((a) => ever.some((e) => e.key === a.key)),
    false,
  );
  assert.ok(
    snapshot.records
      .filter((r) => r.author.toLowerCase() === "sergiorcode")
      .every((r) => r.responsible === "Ever"),
  );
});
test("QA without attributable evidence is not scored as zero", () => {
  const qa = team.find((m) => m.name === "Yestzanetli");
  if (!audit.memberRecords(qa, snapshot).length)
    assert.equal(audit.summarize([]).coverage, null);
});
test("ranking follows evidence rather than an artificially assigned place", () => {
  const roster = [{ name: "América" }, { name: "Ever" }],
    data = {
      records: [
        { responsible: "Ever", merged_at: "date" },
        { responsible: "Ever", merged_at: "date" },
        { responsible: "América", merged_at: "date" },
      ],
    };
  assert.equal(audit.rankMembers(roster, data)[0].name, "Ever");
  data.records.push(
    { responsible: "América", merged_at: "date" },
    { responsible: "América", merged_at: "date" },
  );
  assert.equal(audit.rankMembers(roster, data)[0].name, "América");
});
test("approval never masks a failing technical check", () => {
  const r = {
    merged_at: "date",
    changed_files: 1,
    external_approval: true,
    technical_checks: [{ state: "FAILURE" }],
  };
  assert.equal(audit.approved(r), true);
  assert.equal(audit.technicalFailure(r), true);
});
test("unmerged or unchanged PR is never an approved delivery", () => {
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
