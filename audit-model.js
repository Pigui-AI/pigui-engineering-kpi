(function (root) {
  function approved(r) {
    return !!r.merged_at && r.changed_files > 0 && r.external_approval === true;
  }
  function technicalFailure(r) {
    return (r.technical_checks || []).some((c) =>
      [
        "FAILURE",
        "ERROR",
        "TIMED_OUT",
        "CANCELLED",
        "ACTION_REQUIRED",
      ].includes(c.state),
    );
  }
  function summarize(records) {
    const merged = records.filter((r) => r.merged_at),
      accepted = records.filter(approved);
    return {
      inspected: records.length,
      merged: merged.length,
      approved: accepted.length,
      open: records.filter((r) => r.state === "OPEN").length,
      discarded: records.filter((r) => r.excluded).length,
      missing_approval: merged.filter((r) => !approved(r)).length,
      technical_failures: records.filter(technicalFailure).length,
      ci_alerts: records.filter((r) => r.ci === "FAILURE").length,
      no_ci: records.filter((r) => r.ci === "MISSING").length,
      coverage: merged.length
        ? Math.round((accepted.length / merged.length) * 1000) / 10
        : null,
    };
  }
  function memberRecords(member, snapshot) {
    return snapshot.records.filter((r) => r.responsible === member.name);
  }
  function groups(team, snapshot) {
    return team
      .filter((m) => m.reporting_mode !== "qa-delegated")
      .map((m) => ({
        name: m.name,
        ...summarize(memberRecords(m, snapshot)),
      }));
  }
  const api = { approved, technicalFailure, summarize, memberRecords, groups };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.KPIAudit = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
