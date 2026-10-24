/** Bounded data-only charts. No user SVG, JS callbacks, URLs or chart plugins. */
export function chartSpec(text) {
  if (typeof text !== "string" || text.length > 24000)
    throw Error("图表数据超过24000字符");
  const s = JSON.parse(text),
    label = (v) => typeof v === "string" && v.length > 0 && v.length <= 80;
  if (
    !s ||
    !["bar", "line", "pie"].includes(s.type) ||
    !label(s.title) ||
    !Array.isArray(s.labels) ||
    !s.labels.length ||
    s.labels.length > 30 ||
    !s.labels.every(label) ||
    !Array.isArray(s.series) ||
    !s.series.length ||
    s.series.length > 4 ||
    s.series.some(
      (v) =>
        !v ||
        !label(v.name) ||
        !Array.isArray(v.values) ||
        v.values.length !== s.labels.length ||
        v.values.some(
          (n) =>
            typeof n !== "number" || !Number.isFinite(n) || Math.abs(n) > 1e12,
        ),
    )
  )
    throw Error("图表需要标题、1–30个标签与1–4组等长有限数值");
  if (
    s.type === "pie" &&
    (s.series.length !== 1 ||
      s.series[0].values.some((n) => n < 0) ||
      !s.series[0].values.some((n) => n > 0))
  )
    throw Error("饼图需要一组非负且合计大于零的数据");
  return {
    type: s.type,
    title: s.title,
    labels: s.labels,
    series: s.series.map(({ name, values }) => ({ name, values })),
  };
}
export function chartFigure(doc, spec) {
  const colors = ["#0078CB", "#38A3C7", "#425C85", "#D14B50"],
    make = (tag, text) => {
      const e = doc.createElement(tag);
      if (text !== undefined) e.textContent = text;
      return e;
    };
  const fig = make("figure");
  fig.className = "chat-chart";
  fig.append(make("figcaption", spec.title));
  const svg = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 680 340");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", spec.title);
  const draw = (tag, attrs, text) => {
    const e = doc.createElementNS(svg.namespaceURI, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
    if (text !== undefined) e.textContent = text;
    svg.append(e);
    return e;
  };
  draw("title", {}, spec.title);
  if (spec.type === "pie") {
    const values = spec.series[0].values,
      total = values.reduce((a, b) => a + b, 0);
    let angle = -Math.PI / 2;
    values.forEach((n, i) => {
      if (!n) return;
      const end = angle + (n / total) * 2 * Math.PI,
        c = colors[i % 4];
      if (n === total) draw("circle", { cx: 330, cy: 160, r: 125, fill: c });
      else
        draw("path", {
          d: `M330 160 L${330 + 125 * Math.cos(angle)} ${160 + 125 * Math.sin(angle)} A125 125 0 ${end - angle > Math.PI ? 1 : 0} 1 ${330 + 125 * Math.cos(end)} ${160 + 125 * Math.sin(end)} Z`,
          fill: c,
        });
      angle = end;
    });
  } else {
    const all = spec.series.flatMap((s) => s.values),
      min = Math.min(0, ...all),
      max = Math.max(0, ...all),
      span = max - min || 1,
      y = (v) => 280 - ((v - min) / span) * 240,
      x = (i) => 60 + ((i + 0.5) * 580) / spec.labels.length;
    draw("line", { x1: 60, x2: 640, y1: y(0), y2: y(0), stroke: "#9BAFC1" });
    for (let i = 0; i < 5; i++) {
      const v = min + (span * i) / 4;
      draw(
        "text",
        {
          x: 52,
          y: y(v) + 4,
          "text-anchor": "end",
          "font-size": 11,
          fill: "#526173",
        },
        Number(v.toPrecision(4)).toLocaleString(),
      );
    }
    spec.labels.forEach((l, i) => {
      if (i % Math.ceil(spec.labels.length / 8) === 0)
        draw(
          "text",
          {
            x: x(i),
            y: 305,
            "text-anchor": "middle",
            "font-size": 11,
            fill: "#526173",
          },
          l.slice(0, 10),
        );
    });
    spec.series.forEach((s, j) => {
      const color = colors[j];
      if (spec.type === "line") {
        draw("polyline", {
          points: s.values.map((v, i) => `${x(i)},${y(v)}`).join(" "),
          fill: "none",
          stroke: color,
          "stroke-width": 3,
        });
        s.values.forEach((v, i) =>
          draw("circle", { cx: x(i), cy: y(v), r: 3, fill: color }),
        );
      } else {
        const w = ((580 / spec.labels.length) * 0.75) / spec.series.length;
        s.values.forEach((v, i) =>
          draw("rect", {
            x: x(i) - (w * spec.series.length) / 2 + w * j,
            y: Math.min(y(0), y(v)),
            width: Math.max(1, w - 1),
            height: Math.abs(y(v) - y(0)),
            fill: color,
          }),
        );
      }
    });
  }
  fig.append(svg);
  const legend = make("div");
  legend.className = "chart-legend";
  (spec.type === "pie" ? spec.labels : spec.series.map((s) => s.name)).forEach(
    (name, i) => {
      const el = make("span", name);
      el.style.borderLeftColor = colors[i % 4];
      legend.append(el);
    },
  );
  fig.append(legend);
  const details = make("details"),
    table = make("table"),
    head = make("tr");
  details.append(make("summary", "查看图表数据"));
  head.append(
    make("th", "类别"),
    ...spec.series.map((s) => make("th", s.name)),
  );
  table.append(head);
  spec.labels.forEach((l, i) => {
    const row = make("tr");
    row.append(
      make("th", l),
      ...spec.series.map((s) => make("td", String(s.values[i]))),
    );
    table.append(row);
  });
  details.append(table);
  fig.append(details);
  return fig;
}
