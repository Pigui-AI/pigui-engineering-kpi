const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const core = require("./sync-core.cjs");
const Audit = require("../audit-model.js");
const root = path.resolve(__dirname, "..");
const config = JSON.parse(
  fs.readFileSync(path.join(root, "data/sync-config.json"), "utf8"),
);
const team = JSON.parse(
  fs.readFileSync(path.join(root, "data/team.json"), "utf8"),
);
const previous = JSON.parse(
  fs.readFileSync(path.join(root, "data/github-audit.json"), "utf8"),
);
const repositories = team.source_repositories;
const now = new Date().toISOString();
const outputIndex = process.argv.indexOf("--output");
const output =
  outputIndex >= 0
    ? path.resolve(process.argv[outputIndex + 1])
    : path.join(root, "data/github-audit.json");
let token = process.env.PIGUI_READ_TOKEN;
if (!token && process.argv.includes("--local-auth"))
  token = execFileSync("gh", ["auth", "token"], { encoding: "utf8" }).trim();
if (!token)
  throw Error("PIGUI_READ_TOKEN is required to read connected repositories.");
const base = "https://api.github.com";
async function api(endpoint, body) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await fetch(base + endpoint, {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(60000),
    });
    if (!r.ok) {
      if (r.status >= 500 && attempt < 2) {
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * (attempt + 1)),
        );
        continue;
      }
      throw Error(`GitHub HTTP ${r.status} at ${endpoint.split("?")[0]}`);
    }
    let data;
    try {
      data = JSON.parse(await r.text());
    } catch {
      if (attempt < 2) {
        await new Promise((resolve) =>
          setTimeout(resolve, 1500 * (attempt + 1)),
        );
        continue;
      }
      throw Error("GitHub returned an incomplete JSON response.");
    }
    if (data.errors) throw Error("GitHub GraphQL rejected evidence query");
    return data;
  }
}
async function gql(query) {
  return (await api("/graphql", { query })).data;
}
const pick = new Map(previous.records.map((r) => [r.key, r]));
const candidates = new Map();
function addCandidate(repo, number) {
  if (repositories.includes(repo))
    candidates.set(`${repo}#${number}`, { repo, number });
}
function repoQuery(repo) {
  const [owner, name] = repo.split("/");
  return `repository(owner:${JSON.stringify(owner)},name:${JSON.stringify(name)})`;
}
async function searchAuthor(author, since) {
  for (let page = 1; ; page++) {
    const query = `org:${config.organization} is:pr author:${author} updated:>=${since}`;
    const data = await api(
      `/search/issues?${new URLSearchParams({ q: query, per_page: "100", page: String(page), sort: "updated", order: "desc" })}`,
    );
    if (data.incomplete_results || data.total_count > 1000)
      throw Error("Incomplete search; refusing to publish partial evidence.");
    for (const item of data.items) {
      const parts = item.repository_url.split("/");
      addCandidate(parts.slice(-2).join("/"), item.number);
    }
    if (page * 100 >= data.total_count) break;
  }
}
const contextFields =
  "number url title author{login} createdAt updatedAt mergedAt closedAt state changedFiles additions deletions headRefOid reviews(first:100){nodes{state author{login __typename}commit{oid}}pageInfo{hasNextPage endCursor}} commits(last:1){nodes{commit{statusCheckRollup{state contexts(first:100){nodes{__typename ... on CheckRun{name conclusion status} ... on StatusContext{context state}}pageInfo{hasNextPage}}}}}}";
async function completeReviews(pr, repo) {
  while (pr.reviews.pageInfo.hasNextPage) {
    const data = await gql(
      `query{r:${repoQuery(repo)}{pullRequest(number:${pr.number}){reviews(first:100,after:${JSON.stringify(pr.reviews.pageInfo.endCursor)}){nodes{state author{login __typename}commit{oid}}pageInfo{hasNextPage endCursor}}}}}`,
    );
    const page = data.r.pullRequest.reviews;
    pr.reviews.nodes.push(...page.nodes);
    pr.reviews.pageInfo = page.pageInfo;
  }
}
async function measureMissing(records) {
  const queue = records
    .filter((r) => r.merged_at && !r.code_lines)
    .map((r) => ({ r, after: null, files: [] }));
  const total = queue.length;
  let measured = 0;
  while (queue.length) {
    const batch = queue.splice(0, 12);
    const query = batch
      .map(
        ({ r, after }, i) =>
          `p${i}:${repoQuery(r.repo)}{pullRequest(number:${r.number}){headRefOid files(first:100${after ? `,after:${JSON.stringify(after)}` : ""}){nodes{path additions deletions}pageInfo{hasNextPage endCursor}}}}`,
      )
      .join("\n");
    const data = await gql(`query{${query}}`);
    for (let i = 0; i < batch.length; i++) {
      const item = batch[i],
        pr = data[`p${i}`]?.pullRequest;
      if (!pr || pr.headRefOid !== item.r.head_sha)
        throw Error("PR changed while collecting line evidence");
      item.files.push(...pr.files.nodes);
      if (pr.files.pageInfo.hasNextPage) {
        item.after = pr.files.pageInfo.endCursor;
        queue.push(item);
      } else {
        item.r.code_lines = core.checkedLines(item.files, item.r);
        measured++;
      }
    }
    console.log(`Measured new code evidence: ${measured}/${total}`);
  }
}
async function main() {
  // A lost permission must fail the sync rather than silently erase private activity.
  for (const repo of repositories) await api(`/repos/${repo}`);
  const since = previous.sync?.last_success_at
    ? new Date(Date.parse(previous.sync.last_success_at) - 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10)
    : config.bootstrap_from.slice(0, 10);
  console.log(
    `Reading ${repositories.length} repositories; discovery from ${since}`,
  );
  for (const author of Object.keys(config.authors))
    await searchAuthor(author, since);
  const activePeriod = Audit.defaultQuincena(now);
  for (const r of previous.records)
    if (r.state === "OPEN" || Audit.filterQuincena([r], activePeriod).length)
      addCandidate(r.repo, r.number);
  if (process.env.GITHUB_EVENT_PATH) {
    const event = JSON.parse(
      fs.readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"),
    );
    const payload = event.client_payload;
    if (
      payload?.repository &&
      Number.isSafeInteger(payload.pr_number) &&
      payload.pr_number > 0
    )
      addCandidate(payload.repository, payload.pr_number);
  }
  const list = [...candidates.values()];
  for (let offset = 0; offset < list.length; offset += 12) {
    const batch = list.slice(offset, offset + 12);
    const data = await gql(
      `query{${batch.map((r, i) => `p${i}:${repoQuery(r.repo)}{pullRequest(number:${r.number}){${contextFields}}}`).join("\n")}}`,
    );
    for (let i = 0; i < batch.length; i++) {
      const ref = batch[i],
        pr = data[`p${i}`]?.pullRequest;
      if (!pr) throw Error("A connected PR could not be read.");
      const owner = core.ownerFor(
        pr.author?.login,
        ref.repo,
        config,
        repositories,
      );
      if (!owner) continue;
      await completeReviews(pr, ref.repo);
      if (
        pr.commits.nodes[0]?.commit.statusCheckRollup?.contexts.pageInfo
          .hasNextPage
      )
        throw Error("Too many checks; refusing to truncate evidence.");
      const key = `${ref.repo}#${pr.number}`;
      pick.set(key, core.normalize(pr, ref.repo, owner, pick.get(key), now));
    }
    console.log(
      `Updated PR metadata: ${Math.min(offset + 12, list.length)}/${list.length}`,
    );
  }
  const records = [...pick.values()]
    .filter((r) => core.ownerFor(r.author, r.repo, config, repositories))
    .map((r) => ({
      ...r,
      responsible: core.ownerFor(r.author, r.repo, config, repositories),
    }));
  await measureMissing(records);
  records.sort(
    (a, b) =>
      (b.merged_at || b.updated_at).localeCompare(
        a.merged_at || a.updated_at,
      ) || a.key.localeCompare(b.key),
  );
  const next = {
    ...previous,
    schema_version: 2,
    as_of: now,
    since: config.bootstrap_from,
    until: now,
    period_label: Audit.quincenaRange(activePeriod).label,
    records,
    scope:
      "Actividad de los repositorios conectados, con descubrimiento automático y métricas por PR.",
    sync: {
      mode: "github-actions",
      interval_minutes: config.interval_minutes,
      frontend_poll_seconds: config.frontend_poll_seconds,
      last_success_at: now,
      coverage_since: config.bootstrap_from,
      revision: core.revisionFor(records),
      repositories_checked: repositories.length,
      records_checked: list.length,
    },
    code_lines_method: {
      ...previous.code_lines_method,
      checked_at: now,
      source:
        "GitHub file metadata; cached only when the PR head and file count match.",
    },
  };
  core.validateSnapshot(
    next,
    team.team.map((m) => m.name),
  );
  const tmp = output + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(next, null, 2) + "\n");
  fs.renameSync(tmp, output);
  const stats = Audit.summarize(records);
  console.log(
    `Snapshot complete: ${records.length} PRs, ${stats.merged} merged, ${stats.lines_added} code lines added. No duplicate PRs.`,
  );
}
main().catch((error) => {
  console.error(`Sync failed; previous snapshot preserved. ${error.message}`);
  process.exitCode = 1;
});
