(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const previous = new Map();
  let generation = 0;
  function reveal(event) {
    const { reason = "initial", context = location.hash } = event?.detail || {};
    const cards = [
      ...document.querySelectorAll(
        "#main .stat, #main .pane-widget, #main .overview-grid > .panel, #main .team-panel, #main .person-card, #main .info-card",
      ),
    ];
    const numbers = [
      ...document.querySelectorAll(
        "#main .stat-number, #main .widget-big, #main .ring-legend strong, #main .widget-net strong, #main .loc-mini strong, #main .mini-score",
      ),
    ];
    const numberSelector =
      ".stat-number,.widget-big,.ring-legend strong,.widget-net strong,.loc-mini strong,.mini-score";
    const keys = numbers.map((el) => {
      const parent = el.closest(".pane-person,.person-card,.pane-widget,.stat");
      const label =
        parent?.querySelector(".member-name,h2,.stat-label")?.textContent || "";
      return (
        label +
        ":" +
        [...(parent?.querySelectorAll(numberSelector) || [])].indexOf(el)
      );
    });
    const old = previous.get(context) || new Map();
    const values = numbers.map((el) => el.textContent);
    previous.set(context, new Map(keys.map((key, i) => [key, values[i]])));
    const thisGeneration = ++generation;
    if (reduce.matches) return;
    cards.forEach((el, i) =>
      el.animate(
        [
          { opacity: 0, transform: "translateY(20px) scale(.985)" },
          { opacity: 1, transform: "translateY(0) scale(1)" },
        ],
        {
          duration: 650,
          delay: Math.min(i * 65, 450),
          easing: "cubic-bezier(.16,1,.3,1)",
          fill: "backwards",
        },
      ),
    );
    document.querySelectorAll(".chart-bar").forEach((el, i) =>
      el.animate(
        [
          { height: "2px", filter: "brightness(1.6)" },
          { height: el.style.height, filter: "brightness(1)" },
        ],
        {
          duration: 1100,
          delay: 200 + i * 100,
          easing: "cubic-bezier(.22,1,.36,1)",
          fill: "backwards",
        },
      ),
    );
    document.querySelectorAll(".ring-added,.ring-deleted").forEach((el, i) =>
      el.animate(
        [
          { strokeDasharray: "0 100" },
          { strokeDasharray: el.getAttribute("stroke-dasharray") },
        ],
        {
          duration: 1200,
          delay: 150 + i * 130,
          easing: "cubic-bezier(.22,1,.36,1)",
          fill: "backwards",
        },
      ),
    );
    document.querySelectorAll("#main .progress i").forEach((el) =>
      el.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], {
        duration: 900,
        easing: "cubic-bezier(.22,1,.36,1)",
      }),
    );
    if (reason === "live") {
      document.querySelector("#main").classList.remove("live-arrival");
      requestAnimationFrame(() =>
        document.querySelector("#main").classList.add("live-arrival"),
      );
      numbers.forEach((el, i) => {
        const last = old.get(keys[i]);
        if (!last || last === values[i] || el.children.length) return;
        const pattern = /^([+−-]?)([\d,.]+)( PR|%)?$/;
        const from = last.match(pattern),
          to = values[i].match(pattern);
        if (!from || !to || from[1] !== to[1] || from[3] !== to[3]) return;
        const a = Number(from[2].replaceAll(",", "")),
          b = Number(to[2].replaceAll(",", ""));
        const start = performance.now();
        function frame(now) {
          if (thisGeneration !== generation || !el.isConnected) return;
          const p = Math.min(1, (now - start) / 850),
            eased = 1 - (1 - p) ** 3;
          el.textContent =
            p === 1
              ? values[i]
              : to[1] +
                Math.round(a + (b - a) * eased).toLocaleString("es-MX") +
                (to[3] || "");
          if (p < 1) requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
      });
    }
  }
  window.addEventListener("pigui:render", reveal);
  document.addEventListener("pointermove", (e) => {
    if (reduce.matches || e.pointerType !== "mouse") return;
    const card = e.target.closest(".pane-widget");
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty("--glow-x", `${e.clientX - r.left}px`);
    card.style.setProperty("--glow-y", `${e.clientY - r.top}px`);
  });
  document.addEventListener("pointerdown", (e) => {
    if (reduce.matches) return;
    const button = e.target.closest(".button,.icon-button,.sidebar-nav a");
    if (!button) return;
    const r = button.getBoundingClientRect(),
      dot = document.createElement("i");
    dot.className = "tap-wave";
    dot.setAttribute("aria-hidden", "true");
    dot.style.left = `${e.clientX - r.left}px`;
    dot.style.top = `${e.clientY - r.top}px`;
    button.append(dot);
    dot.addEventListener("animationend", () => dot.remove(), { once: true });
  });
})();
