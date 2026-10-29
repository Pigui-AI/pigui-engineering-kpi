const { test } = require("node:test");
const assert = require("node:assert/strict");
const a = require("../audit-model.js");
test("quincenas respect calendar month lengths including leap years", () => {
  assert.equal(a.quincenaRange("2026-10-1").end, "2026-10-15");
  assert.equal(a.quincenaRange("2026-10-2").end, "2026-10-31");
  assert.equal(a.quincenaRange("2026-04-2").end, "2026-04-30");
  assert.equal(a.quincenaRange("2026-02-2").end, "2026-02-28");
  assert.equal(a.quincenaRange("2028-02-2").end, "2028-02-29");
  assert.throws(() => a.quincenaRange("2026-13-1"));
});
test("midnight boundary follows Mexico City rather than UTC", () => {
  assert.equal(a.defaultQuincena("2026-10-16T05:59:59Z"), "2026-10-1");
  assert.equal(a.defaultQuincena("2026-10-16T06:00:00Z"), "2026-10-2");
});
test("delivery belongs to merge quincena even when created earlier", () => {
  const rows = [
    { created_at: "2026-10-10T15:00:00Z", merged_at: "2026-10-20T15:00:00Z" },
  ];
  assert.equal(a.filterQuincena(rows, "2026-10-1").length, 0);
  assert.equal(a.filterQuincena(rows, "2026-10-2").length, 1);
});
test("changing periods does not remove records from the source snapshot", () => {
  const snapshot = require("../data/github-audit.json");
  const before = snapshot.records.length;
  const current = a.filterQuincena(snapshot.records, "2026-10-2");
  assert.equal(a.summarize(current).merged, 53);
  assert.equal(snapshot.records.length, before);
});
