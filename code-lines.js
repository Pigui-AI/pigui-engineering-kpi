(function (root) {
  const SOURCE =
    /\.(?:py|pyi|js|jsx|mjs|cjs|ts|tsx|vue|svelte|dart|kt|kts|java|swift|m|mm|h|c|cc|cpp|cs|go|rs|rb|php|scala|sql|sh|bash|zsh|ps1|html|htm|css|scss|sass|less|ex|exs|erl|clj|lua|r|jl|pl|proto|graphql|gql)$/i;
  const VENDOR =
    /(^|\/)(node_modules|vendor|vendors|third_party|third-party|thirdparty|\.venv|venv|env|site-packages|__pycache__|\.dart_tool|\.next|dist|build|coverage|pods|generated|\.git)(\/|$)/i;
  const GENERATED =
    /(?:\.g\.dart|\.freezed\.dart|\.min\.(?:js|css)|\.d\.ts|\.generated\.[^/]+|\.gen\.[^/]+)$/i;
  function isSource(path) {
    const base = path.split("/").pop();
    return (
      !VENDOR.test(path) &&
      !GENERATED.test(path) &&
      (SOURCE.test(path) ||
        /^(Dockerfile(?:\..+)?|Makefile|Jenkinsfile)$/i.test(base))
    );
  }
  function measure(files) {
    let additions = 0,
      deletions = 0,
      source_files = 0;
    for (const f of files) {
      if (!isSource(f.path)) continue;
      source_files++;
      additions += f.additions;
      deletions += f.deletions;
    }
    return {
      additions,
      deletions,
      net: additions - deletions,
      changed: additions + deletions,
      source_files,
      excluded_files: files.length - source_files,
      measured_files: files.length,
    };
  }
  const api = { isSource, measure };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.KPICodeLines = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
