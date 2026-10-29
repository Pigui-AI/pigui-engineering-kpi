(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)"),
    fine = matchMedia("(hover:hover) and (pointer:fine)");
  const previous = new Map(),
    ambient = [];
  let generation = 0,
    pillPosition = null;
  const ease = "cubic-bezier(.2,.8,.2,1)",
    spring = "cubic-bezier(.34,1.4,.64,1)";
  function animate(el, frames, options = {}) {
    if (!el || reduce.matches) return;
    return el.animate(frames, { duration: 700, easing: ease, ...options });
  }
  function positionPill(transition = true) {
    const nav = document.querySelector(".top-tabs"),
      active = nav?.querySelector("a.active"),
      pill = nav?.querySelector(".nav-indicator");
    if (!active || !pill) return;
    const left = active.offsetLeft,
      width = active.offsetWidth;
    pill.style.left = left + "px";
    pill.style.width = width + "px";
    if (transition && pillPosition)
      animate(
        pill,
        [
          { left: pillPosition.left + "px", width: pillPosition.width + "px" },
          { left: left + "px", width: width + "px" },
        ],
        { duration: 500, easing: "cubic-bezier(.65,0,.2,1)" },
      );
    pillPosition = { left, width };
  }
  function titleEntrance() {
    const title = document.querySelector("#main h1");
    if (!title || reduce.matches) return;
    const nodes = [...title.childNodes].filter(
      (n) => n.nodeType === Node.TEXT_NODE,
    );
    for (const node of nodes) {
      const fragment = document.createDocumentFragment();
      for (const word of node.textContent.split(/(\s+)/)) {
        if (!word.trim()) {
          fragment.append(document.createTextNode(word));
          continue;
        }
        const span = document.createElement("span");
        span.className = "title-word";
        for (const char of word) {
          const ch = document.createElement("span");
          ch.className = "title-character";
          ch.textContent = char;
          span.append(ch);
        }
        fragment.append(span);
      }
      node.replaceWith(fragment);
    }
    title.querySelectorAll(".title-character").forEach((el, i) =>
      animate(
        el,
        [
          { transform: "translateY(105%) rotate(5deg)", opacity: 0 },
          { transform: "translateY(0) rotate(0)", opacity: 1 },
        ],
        { duration: 750, delay: i * 18, easing: spring, fill: "backwards" },
      ),
    );
  }
  function reveal(event) {
    const { reason = "initial", context = location.hash } = event?.detail || {};
    const current = ++generation;
    positionPill(reason !== "live" && reason !== "chart");
    const numbers = [
        ...document.querySelectorAll(
          "[data-number-key],#main .loc-mini strong",
        ),
      ],
      old = previous.get(context) || new Map();
    const values = numbers.map((el) => el.textContent),
      keys = numbers.map(
        (el, i) =>
          el.dataset.numberKey ||
          el.closest(".person-card")?.querySelector("h2")?.textContent +
            ":" +
            i,
      );
    previous.set(context, new Map(keys.map((key, i) => [key, values[i]])));
    if (reduce.matches) return;
    if (reason !== "chart") {
      titleEntrance();
      document
        .querySelectorAll(".growth-stat,.header-actions")
        .forEach((el, i) =>
          animate(
            el,
            [
              { opacity: 0, transform: "translateY(14px)" },
              { opacity: 1, transform: "translateY(0)" },
            ],
            { delay: 120 + i * 80, duration: 650, fill: "backwards" },
          ),
        );
      document
        .querySelectorAll(
          "#main .rapport-grid>.panel,#main .person-card,#main .info-card,#main>.panel",
        )
        .forEach((el, i) =>
          animate(
            el,
            [
              {
                opacity: 0,
              transform: `translateY(24px) rotate(${el.matches('.rapport-grid>.panel') ? (i % 2 ? 0.6 : -0.6) : 0}deg) scale(.98)`,
              },
              { opacity: 1, transform: "translateY(0) rotate(0) scale(1)" },
            ],
            {
              duration: 800,
              delay: 120 + i * 65,
              easing: spring,
              fill: "backwards",
            },
          ),
        );
    }
    document
      .querySelectorAll(".chart-bar,.activity-fill")
      .forEach((el, i) =>
        animate(el, [{ height: "0%" }, { height: el.style.height }], {
          duration: 1000,
          delay: 180 + i * 60,
          fill: "backwards",
        }),
      );
    document
      .querySelectorAll(".donut-arc")
      .forEach((el, i) =>
        animate(
          el,
          [
            { strokeDasharray: "0 100" },
            { strokeDasharray: el.getAttribute("stroke-dasharray") },
          ],
          { duration: 1150, delay: 180 + i * 90, fill: "backwards" },
        ),
      );
    document.querySelectorAll(".review-line").forEach((el) =>
      animate(
        el,
        [
          { strokeDasharray: "1", strokeDashoffset: 1 },
          { strokeDasharray: "1", strokeDashoffset: 0 },
        ],
        { duration: 1250, delay: 300, fill: "backwards" },
      ),
    );
    document
      .querySelectorAll(".review-area")
      .forEach((el) =>
        animate(el, [{ opacity: 0 }, { opacity: 1 }], {
          duration: 1000,
          delay: 400,
          fill: "backwards",
        }),
      );
    document
      .querySelectorAll("#main .progress i")
      .forEach((el, i) =>
        animate(el, [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], {
          duration: 850,
          delay: 250 + i * 70,
          fill: "backwards",
        }),
      );
    if (reason === "live")
      numbers.forEach((el, i) => {
        const last = old.get(keys[i]),
          match = /^([+−-]?)([\d,.]+)( PR|%)?$/;
        if (!last || last === values[i] || el.children.length) return;
        const from = last.match(match),
          to = values[i].match(match);
        if (!from || !to || from[1] !== to[1] || from[3] !== to[3]) return;
        const a = Number(from[2].replaceAll(",", "")),
          b = Number(to[2].replaceAll(",", "")),
          start = performance.now();
        const decimal = to[2].includes(".");
        function frame(now) {
          if (generation !== current || !el.isConnected) return;
          const p = Math.min(1, (now - start) / 850),
            n = a + (b - a) * (1 - (1 - p) ** 3);
          el.textContent =
            p === 1
              ? values[i]
              : to[1] +
                (decimal
                  ? n.toFixed(1)
                  : Math.round(n).toLocaleString("es-MX")) +
                (to[3] || "");
          if (p < 1) requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
        animate(
          el,
          [
            { color: "var(--tomato)", translate: "0 -3px" },
            { color: getComputedStyle(el).color, translate: "0 0" },
          ],
          { duration: 900 },
        );
      });
  }
  function atmosphere() {
    ambient.splice(0).forEach((a) => a?.cancel());
    if (reduce.matches) return;
    document
      .querySelectorAll(".wall i")
      .forEach((el, i) =>
        ambient.push(
          animate(
            el,
            [
              { transform: "translate(0,0) scale(1)" },
              {
                transform: `translate(${[60, -50, 40][i]}px,${[40, -60, 50][i]}px) scale(${[1.08, 0.94, 1.1][i]})`,
              },
            ],
            {
              duration: 14000 + i * 4000,
              easing: "ease-in-out",
              iterations: Infinity,
              direction: "alternate",
            },
          ),
        ),
      );
  }
  window.addEventListener("pigui:render", reveal);
  const nav = document.querySelector(".top-tabs");
  if (nav) new ResizeObserver(() => positionPill(false)).observe(nav);
  document.fonts.ready.then(() => positionPill(false));
  document
    .querySelectorAll(".brand,.top-tabs,.toolbar-tools>*")
    .forEach((el, i) =>
      animate(
        el,
        [
          { opacity: 0, translate: "0 -14px" },
          { opacity: 1, translate: "0 0" },
        ],
        { duration: 700, delay: 50 + i * 60, fill: "backwards" },
      ),
    );
  animate(
    document.querySelector(".rapport-dock"),
    [
      { opacity: 0, translate: "-90px 0" },
      { opacity: 1, translate: "0 0" },
    ],
    { duration: 900, delay: 100, fill: "backwards" },
  );
  document.querySelectorAll(".rapport-dock .icon-button").forEach((el, i) =>
    animate(
      el,
      [
        { opacity: 0, translate: "0 10px" },
        { opacity: 0.74, translate: "0 0" },
      ],
      { duration: 600, delay: 300 + i * 35, fill: "backwards" },
    ),
  );
  atmosphere();
  reduce.addEventListener("change", () => {
    atmosphere();
    if (reduce.matches) document.getAnimations().forEach((a) => a.cancel());
  });
  document.addEventListener("pointermove", (event) => {
    if (reduce.matches || !fine.matches) return;
    const button = event.target.closest(
      ".button,.card-arrow,.toolbar-tools .icon-button",
    );
    if (!button) return;
    const r = button.getBoundingClientRect();
    button.style.translate = `${(event.clientX - r.left - r.width / 2) * 0.16}px ${(event.clientY - r.top - r.height / 2) * 0.16}px`;
  });
  document.addEventListener("pointerout", (event) => {
    const button = event.target.closest(
      ".button,.card-arrow,.toolbar-tools .icon-button",
    );
    if (button && !button.contains(event.relatedTarget))
      button.style.translate = "0 0";
    if (
      !event.target.closest("[data-owner]") ||
      event.relatedTarget?.closest?.("[data-owner]")
    )
      return;
    document
      .querySelectorAll(".donut-arc")
      .forEach((el) => (el.style.opacity = ""));
  });
  document.addEventListener("pointerover", (event) => {
    const owner = event.target.closest(".source-legend [data-owner]")?.dataset
      .owner;
    if (!owner) return;
    document
      .querySelectorAll(".donut-arc")
      .forEach(
        (el) => (el.style.opacity = el.dataset.owner === owner ? "1" : ".25"),
      );
  });
  document.addEventListener("pointerdown", (event) => {
    if (reduce.matches) return;
    const button = event.target.closest(
      ".button,.icon-button,.code-chips button,.chart-mode button",
    );
    if (!button) return;
    animate(button, [{ scale: "1" }, { scale: ".94" }, { scale: "1" }], {
      duration: 350,
      easing: spring,
    });
  });
})();
