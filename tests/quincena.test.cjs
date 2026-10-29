const { test } = require("node:test");
const assert = require("node:assert/strict");
const a = require("../audit-model.js");
test("quincenas follow actual month length and leap years", () => {
  for (const [id, end] of [
    ["2026-10-1", "2026-10-15"],
    ["2026-10-2", "2026-10-31"],
    ["2026-04-2", "2026-04-30"],
    ["2026-02-2", "2026-02-28"],
    ["2028-02-2", "2028-02-29"],
  ])
    assert.equal(a.quincenaRange(id).end, end);
  assert.throws(() => a.quincenaRange("2026-13-1"));
});
test("midnight follows Mexico City instead of UTC", () => {
  assert.equal(a.defaultQuincena("2026-10-16T05:59:59Z"), "2026-10-1");
  assert.equal(a.defaultQuincena("2026-10-16T06:00:00Z"), "2026-10-2");
});
test("delivery belongs to merge quincena rather than creation quincena", () => {
  const r = [
    { created_at: "2026-10-10T15:00:00Z", merged_at: "2026-10-20T15:00:00Z" },
  ];
  assert.equal(a.filterQuincena(r, "2026-10-1").length, 0);
  assert.equal(a.filterQuincena(r, "2026-10-2").length, 1);
});
test("changing period never removes source evidence", () => {
  const snapshot = require("../data/github-audit.json"),
    before = JSON.stringify(snapshot);
  a.filterQuincena(snapshot.records, a.defaultQuincena(snapshot.as_of));
  assert.equal(JSON.stringify(snapshot), before);
});
