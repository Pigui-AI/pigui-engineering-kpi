const crypto = require("node:crypto");
const { measure } = require("../code-lines.js");
const CODE_VERSION = 1;
function ownerFor(author, repository, config, repositories) {
  if (!repositories.includes(repository)) return null;
  const login = String(author || "").toLowerCase();
  // This account is always assigned to Ever, before repository-specific rules.
  if (login === "sergiorcode") return "Ever";
  const override = config.repository_overrides.find(
    (r) => r.author.toLowerCase() === login && r.repository === repository,
  );
  return override?.responsible || config.authors[login] || null;
}
function externalApprovals(reviews, author, head) {
  const latest = new Map();
  for (const r of reviews) {
    const login = r.author?.login;
    if (!login || r.author.__typename === "Bot" || login.endsWith("[bot]"))
      continue;
    if (["APPROVED", "CHANGES_REQUESTED", "DISMISSED"].includes(r.state))
      latest.set(login.toLowerCase(), r);
  }
  return [...latest.values()]
    .filter(
      (r) =>
        r.author.login.toLowerCase() !== author.toLowerCase() &&
        r.state === "APPROVED" &&
        r.commit?.oid === head,
    )
    .map((r) => r.author.login);
}
function canReuseLines(previous, pr) {
  return (
    previous?.head_sha === pr.headRefOid &&
    previous.changed_files === pr.changedFiles &&
    previous.additions === pr.additions &&
    previous.deletions === pr.deletions &&
    previous.code_lines?.status === "complete" &&
    (previous.code_lines.method_version || 1) === CODE_VERSION &&
    previous.code_lines.measured_files === pr.changedFiles
  );
}
function checkedLines(files, record) {
  if (
    files.length !== record.changed_files ||
    new Set(files.map((f) => f.path)).size !== files.length
  )
    throw Error(`Incomplete file evidence for ${record.key}`);
  if (
    files.reduce((s, f) => s + f.additions, 0) !== record.additions ||
    files.reduce((s, f) => s + f.deletions, 0) !== record.deletions
  )
    throw Error(`Line evidence mismatch for ${record.key}`);
  return {
    ...measure(files),
    status: "complete",
    method_version: CODE_VERSION,
  };
}
function normalize(pr, repo, responsible, previous, now) {
  const reviewers = externalApprovals(
    pr.reviews.nodes,
    pr.author.login,
    pr.headRefOid,
  );
  const checks = pr.commits.nodes[0]?.commit.statusCheckRollup;
  const record = {
    key: `${repo}#${pr.number}`,
    repo,
    number: pr.number,
    url: pr.url,
    title: pr.title.slice(0, 180),
    author: pr.author.login,
    responsible,
    state: pr.state,
    created_at: pr.createdAt,
    updated_at: pr.updatedAt,
    merged_at: pr.mergedAt,
    closed_at: pr.closedAt,
    head_sha: pr.headRefOid,
    changed_files: pr.changedFiles,
    additions: pr.additions,
    deletions: pr.deletions,
    external_approval: reviewers.length > 0,
    reviewers,
    ci: checks?.state || "MISSING",
    technical_checks: (checks?.contexts.nodes || [])
      .filter((c) => (c.name || c.context) !== "review / review")
      .map((c) => ({
        name: c.name || c.context,
        state: c.conclusion || c.state || c.status,
      })),
    excluded: pr.state === "CLOSED",
    checked_at: now,
  };
  if (pr.mergedAt && canReuseLines(previous, pr))
    record.code_lines = previous.code_lines;
  return record;
}
function revisionFor(records) {
  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify(
        [...records]
          .sort((a, b) => a.key.localeCompare(b.key))
          .map(({ checked_at, ...r }) => r),
      ),
    )
    .digest("hex")
    .slice(0, 20);
}
function validateSnapshot(snapshot, names) {
  if (!Array.isArray(snapshot.records)) throw Error("Invalid snapshot");
  const keys = new Set();
  for (const r of snapshot.records) {
    if (keys.has(r.key)) throw Error("Duplicate PR " + r.key);
    keys.add(r.key);
    if (!names.includes(r.responsible)) throw Error("Unknown responsible");
    if (r.author.toLowerCase() === "sergiorcode" && r.responsible !== "Ever")
      throw Error("Incorrect account assignment");
    if (r.merged_at && (!r.code_lines || r.code_lines.status !== "complete"))
      throw Error("Missing merged code evidence " + r.key);
  }
}
module.exports = {
  CODE_VERSION,
  ownerFor,
  externalApprovals,
  canReuseLines,
  checkedLines,
  normalize,
  revisionFor,
  validateSnapshot,
};
