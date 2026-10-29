const { test } = require("node:test");
const assert = require("node:assert/strict");
const code = require("../code-lines.js");
const audit = require("../audit-model.js");
test("code and tests are counted; dependencies, artifacts, docs and data are excluded", () => {
  for (const path of [
    "app/service.py",
    "lib/screen.dart",
    "test/screen_test.dart",
    "src/Component.vue",
    "migrations/schema.sql",
    "Dockerfile",
  ])
    assert.equal(code.isSource(path), true, path);
  for (const path of [
    "node_modules/pkg/index.js",
    ".venv/lib/pkg/file.py",
    "vendor/package/file.go",
    "dist/app.js",
    "lib/model.g.dart",
    "src/types.generated.ts",
    "docs/readme.md",
    "package-lock.json",
    "pubspec.lock",
    "image.png",
  ])
    assert.equal(code.isSource(path), false, path);
});
test("filtered added/deleted counts preserve negative net and exclude vendor inflation", () => {
  const s = code.measure([
    { path: "app/service.py", additions: 10, deletions: 40 },
    { path: "tests/test_service.py", additions: 5, deletions: 0 },
    { path: "node_modules/pkg/index.js", additions: 100000, deletions: 0 },
  ]);
  assert.deepEqual(s, {
    additions: 15,
    deletions: 40,
    net: -25,
    changed: 55,
    source_files: 2,
    excluded_files: 1,
    measured_files: 3,
  });
});
test("line KPIs count merged PRs only, deduplicate PR IDs and distinguish missing evidence", () => {
  const row = {
    key: "repo#1",
    merged_at: "date",
    code_lines: { status: "complete", additions: 10, deletions: 20 },
  };
  const result = audit.lineStats([
    row,
    row,
    {
      key: "repo#2",
      code_lines: { status: "complete", additions: 999, deletions: 0 },
    },
    { key: "repo#3", merged_at: "date" },
  ]);
  assert.equal(result.lines_added, 10);
  assert.equal(result.lines_deleted, 20);
  assert.equal(result.lines_net, -10);
  assert.equal(result.lines_measured_prs, 1);
  assert.equal(result.lines_missing_prs, 1);
  assert.equal(result.average_lines_changed, 30);
  assert.equal(audit.lineStats([]).average_lines_changed, null);
});
test("all 53 shipped PRs have complete metrics reconciled across individual owners", () => {
  const s = require("../data/github-audit.json"),
    team = require("../data/team.json").team;
  const t = audit.summarize(s.records);
  assert.equal(t.lines_measured_prs, 53);
  assert.equal(t.lines_missing_prs, 0);
  assert.equal(t.lines_added, 239013);
  assert.equal(t.lines_deleted, 97633);
  assert.equal(t.lines_net, 141380);
  const groups = audit.groups(team, s);
  assert.equal(
    groups.reduce((n, m) => n + m.lines_added, 0),
    t.lines_added,
  );
  assert.equal(
    groups.reduce((n, m) => n + m.lines_deleted, 0),
    t.lines_deleted,
  );
  assert.equal(groups.find((m) => m.name === "Ever").lines_net, -40826);
});
test("code totals follow quincena filters instead of leaking into another period", () => {
  const s = require("../data/github-audit.json");
  assert.equal(
    audit.summarize(audit.filterQuincena(s.records, "2026-10-2")).lines_added,
    239013,
  );
  assert.equal(
    audit.summarize(audit.filterQuincena(s.records, "2026-10-1"))
      .lines_measured_prs,
    0,
  );
});
