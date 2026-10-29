const { test } = require("node:test");
const assert = require("node:assert/strict");
const code = require("../code-lines.js");
const audit = require("../audit-model.js");
test("code/tests are included and dependencies/generated files are excluded", () => {
  for (const p of [
    "app/service.py",
    "lib/screen.dart",
    "test/a_test.dart",
    "src/Component.vue",
    "migrations/a.sql",
    "Dockerfile",
  ])
    assert.equal(code.isSource(p), true, p);
  for (const p of [
    "node_modules/pkg/a.js",
    ".venv/lib/a.py",
    "vendor/a.go",
    "dist/app.js",
    "lib/model.g.dart",
    "src/types.generated.ts",
    "docs/readme.md",
    "package-lock.json",
    "pubspec.lock",
    "image.png",
  ])
    assert.equal(code.isSource(p), false, p);
});
test("deletions preserve negative net and vendor files cannot inflate the metric", () => {
  assert.deepEqual(
    code.measure([
      { path: "app/a.py", additions: 10, deletions: 40 },
      { path: "tests/a.py", additions: 5, deletions: 0 },
      { path: "node_modules/a.js", additions: 100000, deletions: 0 },
    ]),
    {
      additions: 15,
      deletions: 40,
      net: -25,
      changed: 55,
      source_files: 2,
      excluded_files: 1,
      measured_files: 3,
    },
  );
});
test("merged line KPIs deduplicate PRs and preserve missing evidence", () => {
  const r = {
    key: "r#1",
    merged_at: "date",
    code_lines: { status: "complete", additions: 10, deletions: 20 },
  };
  const s = audit.lineStats([
    r,
    r,
    {
      key: "r#2",
      code_lines: { status: "complete", additions: 999, deletions: 0 },
    },
    { key: "r#3", merged_at: "date" },
  ]);
  assert.equal(s.lines_added, 10);
  assert.equal(s.lines_deleted, 20);
  assert.equal(s.lines_net, -10);
  assert.equal(s.lines_missing_prs, 1);
  assert.equal(s.average_lines_changed, 30);
  assert.equal(audit.lineStats([]).average_lines_changed, null);
});
test("live merged data is completely measured and reconciles across responsible people", () => {
  const snapshot = require("../data/github-audit.json"),
    team = require("../data/team.json").team,
    merged = snapshot.records.filter((r) => r.merged_at),
    s = audit.summarize(snapshot.records);
  assert.ok(merged.every((r) => r.code_lines?.status === "complete"));
  assert.equal(s.lines_measured_prs, merged.length);
  assert.equal(
    s.lines_added,
    merged.reduce((n, r) => n + r.code_lines.additions, 0),
  );
  assert.equal(
    s.lines_deleted,
    merged.reduce((n, r) => n + r.code_lines.deletions, 0),
  );
  assert.equal(s.lines_net, s.lines_added - s.lines_deleted);
  assert.equal(
    audit.groups(team, snapshot).reduce((n, m) => n + m.lines_added, 0),
    s.lines_added,
  );
});
test("quincena filtering does not leak line counts across periods", () => {
  const rows = [
    {
      key: "a",
      merged_at: "2026-10-10T18:00:00Z",
      code_lines: { status: "complete", additions: 10, deletions: 0 },
    },
    {
      key: "b",
      merged_at: "2026-10-20T18:00:00Z",
      code_lines: { status: "complete", additions: 5, deletions: 0 },
    },
  ];
  assert.equal(
    audit.summarize(audit.filterQuincena(rows, "2026-10-1")).lines_added,
    10,
  );
  assert.equal(
    audit.summarize(audit.filterQuincena(rows, "2026-10-2")).lines_added,
    5,
  );
});
