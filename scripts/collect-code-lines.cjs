const { execFileSync } = require("node:child_process");
const { measure } = require("../code-lines.js");
const snapshot = require("../data/github-audit.json");
const queue = snapshot.records
  .filter((r) => r.merged_at)
  .map((r) => ({ r, after: null, files: [] }));
const result = {};
function graphql(query) {
  const out = JSON.parse(
    execFileSync("gh", ["api", "graphql", "--input", "-"], {
      input: JSON.stringify({ query }),
      encoding: "utf8",
      maxBuffer: 25 * 1024 * 1024,
    }),
  );
  if (out.errors) throw Error(JSON.stringify(out.errors));
  return out.data;
}
while (queue.length) {
  const batch = queue.splice(0, 12);
  const query = batch
    .map(
      ({ r, after }, i) =>
        `p${i}:repository(owner:${JSON.stringify(r.repo.split("/")[0])},name:${JSON.stringify(r.repo.split("/")[1])}){pullRequest(number:${r.number}){headRefOid files(first:100${after ? `,after:${JSON.stringify(after)}` : ""}){nodes{path additions deletions}pageInfo{hasNextPage endCursor}}}}`,
    )
    .join("\n");
  const data = graphql(`query{${query}}`);
  for (let i = 0; i < batch.length; i++) {
    const item = batch[i],
      pr = data[`p${i}`]?.pullRequest;
    if (!pr) throw Error("PR unavailable " + item.r.key);
    if (pr.headRefOid !== item.r.head_sha)
      throw Error("PR head changed " + item.r.key);
    item.files.push(...pr.files.nodes);
    if (pr.files.pageInfo.hasNextPage) {
      item.after = pr.files.pageInfo.endCursor;
      queue.push(item);
    } else {
      if (item.files.length !== item.r.changed_files)
        throw Error(
          `Incomplete files ${item.r.key}: ${item.files.length}/${item.r.changed_files}`,
        );
      const rawAdd = item.files.reduce((s, f) => s + f.additions, 0),
        rawDel = item.files.reduce((s, f) => s + f.deletions, 0);
      if (rawAdd !== item.r.additions || rawDel !== item.r.deletions)
        throw Error("File totals mismatch " + item.r.key);
      result[item.r.key] = { ...measure(item.files), status: "complete" };
    }
  }
  process.stderr.write(
    `Measured ${Object.keys(result).length}/${snapshot.records.filter((r) => r.merged_at).length} merged PRs\n`,
  );
}
process.stdout.write(JSON.stringify(result));
