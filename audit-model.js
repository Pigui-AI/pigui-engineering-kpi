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
      ...lineStats(merged),
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
  function lineStats(records) {
    const unique = [
      ...new Map(
        records
          .filter((r) => r.merged_at)
          .map((r, i) => [r.key || r.url || i, r]),
      ).values(),
    ];
    const measured = unique.filter((r) => r.code_lines?.status === "complete");
    const added = measured.reduce((n, r) => n + r.code_lines.additions, 0),
      deleted = measured.reduce((n, r) => n + r.code_lines.deletions, 0);
    return {
      lines_added: added,
      lines_deleted: deleted,
      lines_net: added - deleted,
      lines_changed: added + deleted,
      lines_measured_prs: measured.length,
      lines_missing_prs: unique.length - measured.length,
      average_lines_changed: measured.length
        ? Math.round((added + deleted) / measured.length)
        : null,
    };
  }
  function memberRecords(member, snapshot) {
    return snapshot.records.filter((r) => r.responsible === member.name);
  }
  function groups(team, snapshot) {
    return rankMembers(team, snapshot)
      .filter((m) => m.reporting_mode !== "qa-delegated")
      .map((m) => ({
        name: m.name,
        ...summarize(memberRecords(m, snapshot)),
      }));
  }
  function rankMembers(team, snapshot) {
    return [...team].sort(
      (a, b) =>
        summarize(memberRecords(b, snapshot)).merged -
        summarize(memberRecords(a, snapshot)).merged,
    );
  }
  function quincenaRange(id) {
    const m = /^(\d{4})-(0[1-9]|1[0-2])-([12])$/.exec(id);
    if (!m) throw Error("Quincena inválida");
    const year = Number(m[1]),
      month = Number(m[2]),
      half = Number(m[3]);
    const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const prefix = `${m[1]}-${m[2]}-`;
    return {
      id,
      start: prefix + (half === 1 ? "01" : "16"),
      end: prefix + String(half === 1 ? 15 : last),
      label: `${half === 1 ? "1–15" : `16–${last}`} ${["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"][month - 1]} ${year}`,
    };
  }
  function localDate(timestamp) {
    if (!timestamp || !Number.isFinite(new Date(timestamp).getTime()))
      return null;
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Mexico_City",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date(timestamp));
    const get = (type) => parts.find((p) => p.type === type).value;
    return `${get("year")}-${get("month")}-${get("day")}`;
  }
  function defaultQuincena(timestamp) {
    const day = localDate(timestamp);
    return `${day.slice(0, 7)}-${Number(day.slice(8)) <= 15 ? 1 : 2}`;
  }
  function filterQuincena(records, id) {
    const period = quincenaRange(id);
    return records.filter((r) => {
      const day = localDate(r.merged_at || r.closed_at || r.created_at);
      return day && day >= period.start && day <= period.end;
    });
  }
  const api = {
    approved,
    technicalFailure,
    summarize,
    memberRecords,
    groups,
    rankMembers,
    quincenaRange,
    defaultQuincena,
    filterQuincena,
    lineStats,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.KPIAudit = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
