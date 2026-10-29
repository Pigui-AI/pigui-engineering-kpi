const { test } = require("node:test");
const assert = require("node:assert/strict");
const audit = require("../audit-model.js");
const { buckets, curve } = require("../rapport-model.js");
const snapshot = require("../data/github-audit.json");
test("date chart reconciles exactly with quincena lines and review totals", () => {
  for (const period of ["2026-10-1", "2026-10-2"]) {
    const records = audit.filterQuincena(snapshot.records, period),
      total = audit.summarize(records),
      chart = buckets(records, period);
    assert.equal(
      chart.reduce((n, b) => n + b.lines_added, 0),
      total.lines_added,
    );
    assert.equal(
      chart.reduce((n, b) => n + b.lines_deleted, 0),
      total.lines_deleted,
    );
    assert.equal(
      chart.reduce((n, b) => n + b.merged, 0),
      total.merged,
    );
    assert.equal(
      chart.reduce((n, b) => n + b.approved, 0),
      total.approved,
    );
  }
});
test("date chart uses merge date in Mexico City and does not invent missing review rates", () => {
  const records = [
    {
      merged_at: "2026-10-16T05:59:00Z",
      created_at: "2026-10-02T12:00:00Z",
      changed_files: 1,
      external_approval: true,
      code_lines: { status: "complete", additions: 12, deletions: 3 },
    },
  ];
  const first = buckets(records, "2026-10-1"),
    second = buckets(records, "2026-10-2");
  assert.equal(first.at(-1).lines_added, 12);
  assert.equal(first.at(-1).coverage, 100);
  assert.equal(
    second.reduce((n, b) => n + b.lines_added, 0),
    0,
  );
  assert.ok(second.every((b) => b.coverage === null));
});
test("date buckets respect leap February and half-month boundaries", () => {
  assert.deepEqual(
    buckets([], "2028-02-2").map((b) => b.label),
    ["16–18", "19–21", "22–24", "25–27", "28–29"],
  );
  assert.deepEqual(
    buckets([], "2026-10-2").map((b) => b.label),
    ["16–18", "19–21", "22–24", "25–27", "28–30", "31"],
  );
});
test("review curve has no invalid coordinates and preserves every measured endpoint", () => {
  assert.equal(curve([]), "");
  assert.equal(curve([[10, 20]]), "M10,20");
  const result = curve([
    [0, 220],
    [100, 30],
    [200, 220],
    [300, 30],
  ]);
  assert.ok(!/NaN|Infinity/.test(result));
  assert.ok(result.startsWith("M0,220"));
  assert.ok(result.endsWith("300,30"));
});
