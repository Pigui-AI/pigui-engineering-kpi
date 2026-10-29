(function (root) {
  const audit =
    typeof module !== "undefined" && module.exports
      ? require("./audit-model.js")
      : root.KPIAudit;
  function buckets(records, period) {
    const range = audit.quincenaRange(period),
      start = Number(range.start.slice(-2)),
      last = Number(range.end.slice(-2));
    const result = [];
    const dated = records
      .filter((r) => r.merged_at)
      .map((r) => ({ r, date: audit.localDate(r.merged_at) }));
    for (let day = start; day <= last; day += 3) {
      const end = Math.min(day + 2, last);
      const items = dated
        .filter(({ date }) => {
          return (
            date &&
            date.slice(0, 7) === range.start.slice(0, 7) &&
            Number(date.slice(-2)) >= day &&
            Number(date.slice(-2)) <= end
          );
        })
        .map((item) => item.r);
      const stats = audit.summarize(items);
      result.push({
        label: day === end ? String(day) : `${day}–${end}`,
        ...stats,
      });
    }
    return result;
  }
  // Monotone cubic interpolation keeps the curve inside the real values at adjacent dates.
  function curve(points) {
    if (!points.length) return "";
    if (points.length === 1) return `M${points[0].join(",")}`;
    const slopes = points
      .slice(1)
      .map((p, i) => (p[1] - points[i][1]) / (p[0] - points[i][0]));
    const tangents = points.map((_, i) =>
      i === 0
        ? slopes[0]
        : i === points.length - 1
          ? slopes.at(-1)
          : slopes[i - 1] * slopes[i] <= 0
            ? 0
            : 2 / (1 / slopes[i - 1] + 1 / slopes[i]),
    );
    return points.slice(1).reduce(
      (path, p, i) => {
        const a = points[i],
          dx = (p[0] - a[0]) / 3;
        return (
          path +
          ` C${a[0] + dx},${a[1] + dx * tangents[i]} ${p[0] - dx},${p[1] - dx * tangents[i + 1]} ${p[0]},${p[1]}`
        );
      },
      `M${points[0].join(",")}`,
    );
  }
  const api = { buckets, curve };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.RapportMetrics = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
