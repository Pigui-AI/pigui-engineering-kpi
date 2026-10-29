const { test } = require("node:test");
const assert = require("node:assert/strict");
const c = require("../scripts/sync-core.cjs");
const config = require("../data/sync-config.json");
const repos = require("../data/team.json").source_repositories;
test("every spelling of SergiorCode always maps to Ever in every connected repository", () => {
  for (const author of ["SergiorCode", "sergiorcode", "SERGIORCODE"])
    for (const repo of repos)
      assert.equal(c.ownerFor(author, repo, config, repos), "Ever");
  assert.equal(c.ownerFor("SergiorCode", "Other/repo", config, repos), null);
});
test("individual owners and backend responsibility remain deterministic", () => {
  assert.equal(
    c.ownerFor(
      "americabalderas-del",
      "Pigui-AI/api-pigui-backend",
      config,
      repos,
    ),
    "Ever",
  );
  assert.equal(
    c.ownerFor("americabalderas-del", "Pigui-AI/front-b2b", config, repos),
    "América",
  );
  assert.equal(c.ownerFor("marcopigui", repos[0], config, repos), "Marco");
  assert.equal(c.ownerFor("piguiai", repos[0], config, repos), null);
});
test("review approval must be external, current and not later dismissed", () => {
  const r = (state, commit = "head", login = "reviewer") => ({
    state,
    commit: { oid: commit },
    author: { login },
  });
  assert.deepEqual(c.externalApprovals([r("APPROVED")], "author", "head"), [
    "reviewer",
  ]);
  assert.deepEqual(
    c.externalApprovals(
      [r("APPROVED"), r("CHANGES_REQUESTED")],
      "author",
      "head",
    ),
    [],
  );
  assert.deepEqual(
    c.externalApprovals([r("APPROVED", "old")], "author", "head"),
    [],
  );
  assert.deepEqual(
    c.externalApprovals([r("APPROVED", "head", "author")], "author", "head"),
    [],
  );
});
test("cached code is reused only for the same immutable PR head and complete file evidence", () => {
  const old = {
      head_sha: "h",
      changed_files: 1,
      additions: 10,
      deletions: 3,
      code_lines: { status: "complete", measured_files: 1, method_version: 1 },
    },
    pr = { headRefOid: "h", changedFiles: 1, additions: 10, deletions: 3 };
  assert.equal(c.canReuseLines(old, pr), true);
  assert.equal(c.canReuseLines(old, { ...pr, headRefOid: "new" }), false);
  assert.equal(c.canReuseLines(old, { ...pr, additions: 11 }), false);
  assert.equal(
    c.canReuseLines(
      { ...old, code_lines: { status: "complete", measured_files: 0 } },
      pr,
    ),
    false,
  );
});
test("line evidence is paginated completely and reconciles before publishing", () => {
  const r = { key: "r#1", changed_files: 2, additions: 1005, deletions: 2 };
  const files = [
    { path: "app/a.py", additions: 5, deletions: 2 },
    { path: "node_modules/a.js", additions: 1000, deletions: 0 },
  ];
  assert.equal(c.checkedLines(files, r).additions, 5);
  assert.throws(() => c.checkedLines(files.slice(0, 1), r));
  assert.throws(() => c.checkedLines(files, { ...r, additions: 9999 }));
});
test("refresh timestamps do not manufacture a new data revision", () => {
  const a = [{ key: "r#1", merged_at: "date", checked_at: "old" }],
    b = [{ ...a[0], checked_at: "new" }];
  assert.equal(c.revisionFor(a), c.revisionFor(b));
  assert.notEqual(
    c.revisionFor(a),
    c.revisionFor([{ ...a[0], merged_at: "other" }]),
  );
});
test("duplicate PRs, wrong account assignment and incomplete merged data are rejected", () => {
  const r = {
    key: "r#1",
    responsible: "Ever",
    author: "SergiorCode",
    merged_at: "date",
    code_lines: { status: "complete" },
  };
  assert.doesNotThrow(() => c.validateSnapshot({ records: [r] }, ["Ever"]));
  assert.throws(() => c.validateSnapshot({ records: [r, r] }, ["Ever"]));
  assert.throws(() =>
    c.validateSnapshot({ records: [{ ...r, responsible: "América" }] }, [
      "Ever",
      "América",
    ]),
  );
  assert.throws(() =>
    c.validateSnapshot({ records: [{ ...r, code_lines: null }] }, ["Ever"]),
  );
});
