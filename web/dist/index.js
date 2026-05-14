const { jsx: t, jsxs: n, Fragment: Me } = window.__airgate_shared["react/jsx-runtime"];
const { createContext: Ne, useState: x, useRef: N, useCallback: G, useEffect: ke, useContext: Ue } = window.__airgate_shared["react"];
const { useTranslation: P } = window.__airgate_shared["react-i18next"];
const Ke = "airgate-studio";
function qe() {
  return `/api/v1/ext-user/${Ke}`;
}
async function pe(e, o, l) {
  var b;
  const a = `${qe()}${o}`, s = {
    method: e,
    headers: { "Content-Type": "application/json" }
  };
  l !== void 0 && (s.body = JSON.stringify(l));
  const d = await fetch(a, s);
  if (!d.ok) {
    const v = await d.json().catch(() => ({ error: { message: d.statusText } }));
    throw new Error(((b = v == null ? void 0 : v.error) == null ? void 0 : b.message) || `HTTP ${d.status}`);
  }
  return d.json();
}
const se = {
  createGenerationTask(e) {
    return pe("POST", "/generation-tasks", e);
  },
  getGenerationTask(e) {
    return pe("GET", `/generation-tasks/${e}`);
  },
  listGenerationTasks() {
    return pe("GET", "/generation-tasks").then((e) => e.tasks || []);
  },
  listPlatforms() {
    return pe("GET", "/platforms").then((e) => e.platforms || []);
  },
  listModels(e, o) {
    const l = {};
    return e && (l.platform = e), o && (l.capability = o), pe("GET", "/models", l).then((a) => a.models || []);
  }
}, Ye = 2e3, Xe = 120;
function ge() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
function ye(e) {
  const o = /!\[([^\]]*)\]\(([^)\s]+)\)/g, l = [];
  let a;
  for (; (a = o.exec(e)) !== null; )
    l.push({ alt: a[1], url: a[2] });
  return l;
}
function Ze(e) {
  return e.platform ? `${e.platform}::${e.id}` : e.id;
}
function Je(e) {
  const o = e.indexOf("::");
  return o === -1 ? { platform: "", modelId: e } : { platform: e.slice(0, o), modelId: e.slice(o + 2) };
}
function xe(e) {
  return e === "inpaint" ? "inpaint" : e === "edit" ? "img2img" : "text2img";
}
function Qe(e) {
  return e === "inpaint" ? "inpaint" : e === "img2img" ? "edit" : "generate";
}
function Be(e) {
  var l;
  const o = (l = e.parameters) == null ? void 0 : l.size;
  return typeof o == "string" ? o : void 0;
}
async function et(e, o) {
  return new Promise((l, a) => {
    if (o.aborted) {
      a(new DOMException("Aborted", "AbortError"));
      return;
    }
    const s = setTimeout(() => {
      o.removeEventListener("abort", d), l();
    }, e);
    function d() {
      clearTimeout(s), a(new DOMException("Aborted", "AbortError"));
    }
    o.addEventListener("abort", d, { once: !0 });
  });
}
async function tt(e) {
  if (e.startsWith("data:")) return e;
  const l = await (await fetch(e)).blob();
  return new Promise((a, s) => {
    const d = new FileReader();
    d.onloadend = () => a(d.result), d.onerror = s, d.readAsDataURL(l);
  });
}
async function rt(e, o) {
  const l = new window.Image();
  l.src = e, await new Promise((d, b) => {
    l.onload = () => d(), l.onerror = () => b(new Error("Failed to load source image for mask"));
  });
  const a = document.createElement("canvas");
  a.width = l.naturalWidth, a.height = l.naturalHeight;
  const s = a.getContext("2d");
  if (!s) throw new Error("Cannot create canvas context");
  return s.fillStyle = "#000000", s.fillRect(0, 0, a.width, a.height), s.fillStyle = "#ffffff", s.fillRect(o.x, o.y, o.width, o.height), a.toDataURL("image/png");
}
async function Ce(e, o, l = Xe) {
  let a = 0;
  for (let s = 0; s < l; s++) {
    if (o.aborted) throw new DOMException("Aborted", "AbortError");
    let d = null;
    try {
      d = await se.getGenerationTask(e), a = 0;
    } catch (b) {
      if (o.aborted) throw new DOMException("Aborted", "AbortError");
      if (a++, a > 30) throw b;
    }
    if (d) {
      if (d.status === "completed") return d;
      if (d.status === "failed")
        throw new Error(d.error_message || "Image generation task failed");
    }
    await et(Ye, o);
  }
  throw new Error("Image generation timed out after waiting too long");
}
const Ve = Ne(null);
function U() {
  const e = Ue(Ve);
  if (!e) throw new Error("useStudio must be used within StudioProvider");
  return e;
}
function $e({ children: e }) {
  const [o, l] = x("image"), [a, s] = x("text2img"), [d, b] = x([]), [v, g] = x([]), [w, _] = x(""), [k, L] = x("1024x1024"), [F, m] = x(null), [M, C] = x(null), [V, R] = x(!1), [W, $] = x([]), f = N(null), [T, c] = x([]), [O, K] = x(null), oe = N(null), me = N(null), Z = v, { platform: ne, modelId: J } = Je(w), ce = G(async (S) => {
    try {
      const y = await se.listGenerationTasks();
      if (S.aborted) return;
      const Q = y.filter((p) => p.status === "completed" && p.result_content), q = [];
      for (const p of Q) {
        const le = ye(p.result_content || "");
        for (const z of le)
          q.push({
            id: ge(),
            url: z.url,
            alt: z.alt,
            prompt: p.prompt,
            model: p.model,
            mode: xe(p.operation),
            size: Be(p),
            createdAt: p.completed_at || p.updated_at
          });
      }
      c(q);
      const fe = y.filter((p) => p.status === "failed"), ie = y.filter(
        (p) => p.status === "pending" || p.status === "processing"
      );
      if ($([
        ...fe.map((p) => ({
          id: `r-${p.id}`,
          prompt: p.prompt,
          mode: xe(p.operation),
          status: "failed",
          error: p.error_message || "Image generation task failed",
          createdAt: p.created_at
        })),
        ...ie.map((p) => ({
          id: `r-${p.id}`,
          prompt: p.prompt,
          mode: xe(p.operation),
          status: "processing",
          createdAt: p.created_at
        }))
      ]), ie.length === 0) return;
      R(!0), E.current = ie.length;
      for (const p of ie) {
        const le = `r-${p.id}`;
        Ce(p.id, S).then((z) => {
          if (S.aborted) return;
          const he = ye(z.result_content || "");
          c((A) => [
            ...he.map((I) => ({
              id: ge(),
              url: I.url,
              alt: I.alt,
              prompt: p.prompt,
              model: p.model,
              mode: xe(p.operation),
              size: Be(p),
              createdAt: z.completed_at || (/* @__PURE__ */ new Date()).toISOString()
            })),
            ...A
          ]), $(
            (A) => A.map(
              (I) => I.id === le ? { ...I, status: "completed" } : I
            )
          );
        }).catch((z) => {
          if (S.aborted) return;
          const he = z instanceof Error ? z.message : "Recovery failed";
          $(
            (A) => A.map(
              (I) => I.id === le ? { ...I, status: "failed", error: he } : I
            )
          );
        }).finally(() => {
          S.aborted || (E.current -= 1, E.current <= 0 && (E.current = 0, R(!1)));
        });
      }
    } catch {
    }
  }, []);
  ke(() => {
    if (oe.current || (oe.current = se.listPlatforms().then(async (S) => {
      b(S);
      const Q = (await Promise.all(
        S.map((q) => se.listModels(q.name, "image_generation").catch(() => []))
      )).flat();
      g(Q), Q.length > 0 && _(Ze(Q[0]));
    }).catch(() => {
    })), !me.current) {
      const S = new AbortController();
      me.current = ce(S.signal);
    }
  }, [ce]);
  const Se = G(() => {
    var S;
    (S = f.current) == null || S.abort();
  }, []), E = N(0), u = G(
    (S, y) => {
      if (!S.trim()) return;
      const q = new AbortController().signal, fe = ge(), ie = (/* @__PURE__ */ new Date()).toISOString(), p = a, le = {
        id: fe,
        prompt: S,
        mode: p,
        status: "queued",
        createdAt: ie
      };
      $((A) => [le, ...A]), E.current += 1, R(!0);
      const z = (A) => {
        $((I) => I.map((Y) => Y.id === fe ? { ...Y, ...A } : Y));
      };
      (async () => {
        var A;
        try {
          if (z({ status: "processing" }), p === "batch") {
            const Y = ((A = y == null ? void 0 : y.prompts) != null && A.length ? y.prompts : Array.from({ length: (y == null ? void 0 : y.count) ?? 4 }, () => S)).map(async (H) => {
              const D = await se.createGenerationTask({
                kind: "image",
                operation: "generate",
                platform: ne,
                model: J,
                prompt: H,
                parameters: k ? { size: k } : void 0
              }), He = await Ce(D.id, q);
              return ye(He.result_content || "").map((je) => ({ ...je, prompt: H }));
            }), _e = await Promise.allSettled(Y), ue = [];
            for (const H of _e)
              if (H.status === "fulfilled")
                for (const D of H.value)
                  ue.push({
                    id: ge(),
                    url: D.url,
                    alt: D.alt,
                    prompt: D.prompt,
                    model: J,
                    mode: p,
                    size: k,
                    createdAt: (/* @__PURE__ */ new Date()).toISOString()
                  });
            if (ue.length === 0) throw new Error("Batch generation: all tasks failed");
            c((H) => [...ue, ...H]), z({ status: "completed", result: ue });
          } else {
            const I = {
              kind: "image",
              operation: Qe(p),
              platform: ne,
              model: J,
              prompt: S,
              parameters: k ? { size: k } : void 0
            };
            if (p === "img2img" || p === "inpaint") {
              const D = (y == null ? void 0 : y.sourceImage) ?? M ?? "";
              if (!D && p === "inpaint") throw new Error("Inpaint requires a source image");
              D && (I.inputs = [{ type: "image", role: "source", url: await tt(D) }]);
            }
            if (p === "inpaint" && (y != null && y.maskRegion)) {
              const D = (y == null ? void 0 : y.sourceImage) ?? M ?? "";
              I.mask = { type: "image", role: "mask", url: await rt(D, y.maskRegion) };
            }
            const Y = await se.createGenerationTask(I);
            if (q.aborted) throw new DOMException("Aborted", "AbortError");
            const _e = await Ce(Y.id, q), H = ye(_e.result_content || "").map((D) => ({
              id: ge(),
              url: D.url,
              alt: D.alt,
              prompt: S,
              model: J,
              mode: p,
              size: k,
              createdAt: (/* @__PURE__ */ new Date()).toISOString(),
              sourceUrl: p === "img2img" || p === "inpaint" ? (y == null ? void 0 : y.sourceImage) ?? M ?? void 0 : void 0
            }));
            c((D) => [...H, ...D]), z({ status: "completed", result: H });
          }
        } catch (I) {
          if (q.aborted)
            z({ status: "failed", error: "Generation cancelled" });
          else {
            const Y = I instanceof Error ? I.message : "Generation failed";
            z({ status: "failed", error: Y });
          }
        } finally {
          E.current -= 1, E.current <= 0 && (E.current = 0, R(!1));
        }
      })();
    },
    [
      a,
      k,
      M,
      ne,
      J
    ]
  ), h = G((S) => {
    c((y) => y.filter((Q) => Q.id !== S));
  }, []), B = G((S) => {
    C(S.url), s("img2img");
  }, []), ae = {
    mediaType: o,
    setMediaType: l,
    imageMode: a,
    setImageMode: s,
    platforms: d,
    models: v,
    imageModels: Z,
    selectedModel: w,
    setSelectedModel: _,
    selectedPlatform: ne,
    selectedModelId: J,
    imageSize: k,
    setImageSize: L,
    userInfo: F,
    referenceImage: M,
    setReferenceImage: C,
    isGenerating: V,
    tasks: W,
    generate: u,
    cancelGeneration: Se,
    gallery: T,
    previewItem: O,
    setPreviewItem: K,
    deleteGalleryItem: h,
    useAsReference: B
  };
  return /* @__PURE__ */ t(Ve.Provider, { value: ae, children: e });
}
const Ae = {
  primary: "oklch(0.9848 0 0)",
  primaryForeground: "oklch(15% 0.0000 0.00)",
  primaryHover: "color-mix(in oklab, oklch(0.9848 0 0) 88%, oklch(15% 0.0000 0.00) 12%)",
  primarySubtle: "color-mix(in oklab, oklch(0.9848 0 0) 14%, transparent)",
  primaryGlow: "color-mix(in oklab, oklch(0.9848 0 0) 22%, transparent)",
  success: "oklch(73.29% 0.1935 120.35)",
  successForeground: "oklch(21.03% 0.0059 120.35)",
  successSubtle: "color-mix(in oklab, oklch(73.29% 0.1935 120.35) 15%, transparent)",
  warning: "oklch(0.8803 0.1348 86.06)",
  warningForeground: "oklch(15% 0.0404 86.06)",
  warningSubtle: "color-mix(in oklab, oklch(0.8803 0.1348 86.06) 15%, transparent)",
  danger: "oklch(0.7044 0.1872 23.19)",
  dangerForeground: "oklch(15% 0.0500 23.19)",
  dangerSubtle: "color-mix(in oklab, oklch(0.7044 0.1872 23.19) 15%, transparent)",
  info: "oklch(0.9848 0 0)",
  infoSubtle: "color-mix(in oklab, oklch(0.9848 0 0) 14%, transparent)",
  defaultBg: "oklch(27.40% 0.0000 0.00)",
  defaultForeground: "oklch(99.11% 0 0)",
  fieldBackground: "oklch(21.03% 0.0000 0.00)",
  fieldForeground: "oklch(99.11% 0.0000 0.00)",
  fieldPlaceholder: "oklch(70.50% 0.0000 0.00)",
  muted: "oklch(70.50% 0.0000 0.00)",
  overlay: "oklch(21.03% 0.0000 0.00)",
  overlayForeground: "oklch(99.11% 0.0000 0.00)",
  scrollbar: "oklch(70.50% 0.0000 0.00)",
  segment: "oklch(39.64% 0.0000 0.00)",
  segmentForeground: "oklch(99.11% 0.0000 0.00)",
  surface: "oklch(21.03% 0.0000 0.00)",
  surfaceForeground: "oklch(99.11% 0.0000 0.00)",
  surfaceSecondary: "oklch(25.70% 0.0000 0.00)",
  surfaceSecondaryForeground: "oklch(99.11% 0.0000 0.00)",
  surfaceTertiary: "oklch(27.21% 0.0000 0.00)",
  surfaceTertiaryForeground: "oklch(99.11% 0.0000 0.00)",
  bgDeep: "oklch(12.00% 0.0000 0.00)",
  bg: "oklch(12.00% 0.0000 0.00)",
  bgElevated: "oklch(21.03% 0.0000 0.00)",
  bgSurface: "oklch(21.03% 0.0000 0.00)",
  bgHover: "oklch(25.70% 0.0000 0.00)",
  bgActive: "oklch(27.21% 0.0000 0.00)",
  border: "oklch(28.00% 0.0000 0.00)",
  borderSubtle: "oklch(25.00% 0.0000 0.00)",
  borderFocus: "oklch(0.9848 0 0)",
  text: "oklch(99.11% 0.0000 0.00)",
  textSecondary: "oklch(70.50% 0.0000 0.00)",
  textTertiary: "oklch(70.50% 0.0000 0.00)",
  textInverse: "oklch(15% 0.0000 0.00)",
  glass: "color-mix(in oklab, oklch(21.03% 0.0000 0.00) 92%, transparent)",
  glassBorder: "oklch(28.00% 0.0000 0.00)",
  shadowSm: "0 0 0 0 transparent inset",
  shadowMd: "0 0 0 0 transparent inset",
  shadowLg: "0 0 1px 0 #ffffff4d inset",
  shadowGlow: "0 0 0 1px color-mix(in oklab, oklch(0.9848 0 0) 18%, transparent)"
}, ot = {
  radiusSm: "0.25rem",
  radiusMd: "0.25rem",
  radiusLg: "0.25rem",
  radiusXl: "0.25rem",
  fieldRadius: "0.5rem",
  fontSans: "'Geist Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  fontMono: "'Geist Mono', 'SF Mono', 'Cascadia Code', monospace",
  transition: "200ms cubic-bezier(0.4, 0, 0.2, 1)",
  transitionSlow: "400ms cubic-bezier(0.4, 0, 0.2, 1)"
}, nt = {
  sidebarWidth: "260px",
  sidebarCollapsed: "72px",
  topbarHeight: "64px"
}, Re = {
  ...ot,
  ...nt
}, We = {
  dark: Ae
};
function at(e) {
  return e.replace(/[A-Z]/g, (o) => "-" + o.toLowerCase());
}
function Ge(e = "ag") {
  return e.trim() || "ag";
}
function we(e, o) {
  return `--${e}-${at(o)}`;
}
Object.keys(We.dark).reduce((e, o) => (e[o] = we("ag", o), e), {});
Object.keys(Re).reduce((e, o) => (e[o] = we("ag", o), e), {});
function Pe(e = {}) {
  const o = Ge(e.prefix);
  return Object.keys(We.dark).reduce((l, a) => (l[a] = we(o, a), l), {});
}
function Oe(e = {}) {
  const o = Ge(e.prefix);
  return Object.keys(Re).reduce((l, a) => (l[a] = we(o, a), l), {});
}
const it = Pe(), lt = Oe();
function r(e, o = {}) {
  const l = o.prefix ? Pe(o) : it, a = o.prefix ? Oe(o) : lt;
  if (e in l) {
    const d = e;
    return `var(${l[d]}, ${Ae[d]})`;
  }
  const s = e;
  return `var(${a[s]}, ${Re[s]})`;
}
const dt = {
  width: "100%",
  padding: "9px 14px",
  border: `1px solid ${r("borderSubtle")}`,
  borderRadius: 10,
  background: r("bgDeep"),
  color: r("text"),
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 8,
  font: "inherit",
  fontSize: 13,
  transition: "border-color 0.2s, box-shadow 0.2s"
}, st = {
  borderColor: `color-mix(in oklab, ${r("primary")} 30%, transparent)`,
  boxShadow: `0 0 0 3px ${r("primaryGlow")}`
}, ct = {
  position: "absolute",
  top: "calc(100% + 6px)",
  left: 0,
  right: 0,
  zIndex: 50,
  background: r("bgElevated"),
  border: `1px solid ${r("glassBorder")}`,
  borderRadius: 12,
  boxShadow: "0 12px 40px rgba(0, 0, 0, 0.4), 0 4px 12px rgba(0, 0, 0, 0.2)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  maxHeight: 260,
  overflowY: "auto",
  padding: 5,
  animation: "studioFadeIn 0.15s cubic-bezier(0.4, 0, 0.2, 1)"
}, ut = {
  width: "100%",
  padding: "9px 14px",
  border: "none",
  background: "transparent",
  color: r("text"),
  textAlign: "left",
  cursor: "pointer",
  borderRadius: 8,
  fontSize: 13,
  font: "inherit",
  transition: "background 0.12s"
}, pt = {
  background: r("primarySubtle"),
  color: r("text"),
  fontWeight: 600
}, gt = `
  .studio-select-option:hover {
    background: ${r("bgHover")};
  }
  .studio-select-trigger:hover {
    border-color: ${r("border")};
  }
`;
function te({ value: e, options: o, onChange: l, placeholder: a }) {
  const [s, d] = x(!1), b = N(null);
  ke(() => {
    if (!s) return;
    const g = (w) => {
      b.current && !b.current.contains(w.target) && d(!1);
    };
    return document.addEventListener("mousedown", g), () => document.removeEventListener("mousedown", g);
  }, [s]);
  const v = o.find((g) => g.value === e);
  return /* @__PURE__ */ n("div", { ref: b, style: { position: "relative" }, children: [
    /* @__PURE__ */ t("style", { children: gt }),
    /* @__PURE__ */ n(
      "button",
      {
        type: "button",
        onClick: () => d(!s),
        style: { ...dt, ...s ? st : {} },
        className: "studio-select-trigger",
        children: [
          /* @__PURE__ */ t("span", { style: { flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: (v == null ? void 0 : v.label) || a || e }),
          /* @__PURE__ */ t(
            "svg",
            {
              width: "12",
              height: "12",
              viewBox: "0 0 24 24",
              fill: "none",
              stroke: "currentColor",
              strokeWidth: "2.5",
              strokeLinecap: "round",
              strokeLinejoin: "round",
              style: { opacity: 0.4, transition: "transform 0.2s", transform: s ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 },
              children: /* @__PURE__ */ t("path", { d: "M6 9l6 6 6-6" })
            }
          )
        ]
      }
    ),
    s && /* @__PURE__ */ t("div", { style: ct, children: o.map((g) => /* @__PURE__ */ t(
      "button",
      {
        type: "button",
        style: { ...ut, ...g.value === e ? pt : {} },
        className: g.value === e ? "" : "studio-select-option",
        onClick: () => {
          l(g.value), d(!1);
        },
        children: g.label
      },
      g.value
    )) })
  ] });
}
const i = {
  // ── Layout ────────────────────────────────────────────────────────────────
  layout: {
    display: "flex",
    flexDirection: "row",
    width: "100%",
    height: "100%",
    overflow: "hidden",
    background: r("bgDeep"),
    color: r("text"),
    fontFamily: r("fontSans"),
    position: "relative"
  },
  // ── Sidebar ───────────────────────────────────────────────────────────────
  sidebar: {
    width: 320,
    minWidth: 320,
    maxWidth: 320,
    display: "flex",
    flexDirection: "column",
    background: r("glass"),
    backdropFilter: "blur(24px) saturate(1.2)",
    WebkitBackdropFilter: "blur(24px) saturate(1.2)",
    borderLeft: `1px solid ${r("glassBorder")}`,
    overflowY: "auto",
    overflowX: "hidden",
    flexShrink: 0,
    boxShadow: "-1px 0 32px rgba(0, 0, 0, 0.3)"
  },
  sidebarHeader: {
    padding: "20px 20px 6px",
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: r("textTertiary"),
    fontFamily: r("fontMono"),
    userSelect: "none"
  },
  mediaTypeBtn: {
    border: `1px solid ${r("borderSubtle")}`,
    color: r("textSecondary")
  },
  mediaTypeBtnActive: {
    background: r("primarySubtle"),
    borderColor: `color-mix(in oklab, ${r("primary")} 30%, transparent)`,
    color: r("text"),
    boxShadow: `0 0 16px ${r("primaryGlow")}`
  },
  modeTab: {
    color: r("textTertiary")
  },
  modeTabActive: {
    background: r("bgHover"),
    color: r("text")
  },
  // ── Shared form controls ──────────────────────────────────────────────────
  formLabel: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.08em",
    color: r("textTertiary"),
    textTransform: "uppercase",
    fontFamily: r("fontMono"),
    marginBottom: 6,
    display: "block",
    userSelect: "none"
  },
  formRow: {
    display: "flex",
    flexDirection: "column",
    gap: 4
  },
  formTextarea: {
    width: "100%",
    minHeight: 88,
    maxHeight: 200,
    padding: "12px 14px",
    border: `1px solid ${r("borderSubtle")}`,
    borderRadius: 10,
    background: r("bgDeep"),
    color: r("text"),
    fontSize: 13,
    fontFamily: "inherit",
    resize: "vertical",
    outline: "none",
    lineHeight: 1.55,
    boxSizing: "border-box",
    transition: "border-color 0.2s, box-shadow 0.2s"
  },
  formInput: {
    border: `1px solid ${r("borderSubtle")}`,
    background: r("bgDeep"),
    color: r("text")
  },
  formSelect: {
    border: `1px solid ${r("borderSubtle")}`,
    background: r("bgDeep"),
    color: r("text")
  },
  formCountGroup: {
    display: "flex",
    gap: 6
  },
  formCountBtn: {
    flex: 1,
    padding: "7px 0",
    border: `1px solid ${r("borderSubtle")}`,
    borderRadius: 8,
    background: "transparent",
    color: r("textSecondary"),
    cursor: "pointer",
    fontSize: 13,
    fontFamily: "inherit",
    fontVariantNumeric: "tabular-nums",
    transition: "all 0.18s cubic-bezier(0.4, 0, 0.2, 1)"
  },
  formCountBtnActive: {
    flex: 1,
    padding: "7px 0",
    border: `1px solid color-mix(in oklab, ${r("primary")} 40%, transparent)`,
    borderRadius: 8,
    background: r("primarySubtle"),
    color: r("text"),
    cursor: "pointer",
    fontSize: 13,
    fontFamily: "inherit",
    fontWeight: 600,
    fontVariantNumeric: "tabular-nums",
    boxShadow: `0 0 12px ${r("primaryGlow")}`,
    transition: "all 0.18s cubic-bezier(0.4, 0, 0.2, 1)"
  },
  formGenerateBtn: {
    width: "100%",
    padding: "11px 0",
    border: "none",
    borderRadius: 10,
    background: r("primary"),
    color: r("primaryForeground"),
    fontSize: 13,
    fontWeight: 700,
    fontFamily: "inherit",
    cursor: "pointer",
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
    letterSpacing: "0.02em",
    marginTop: 6,
    position: "relative",
    overflow: "hidden"
  },
  formGenerateBtnDisabled: {
    width: "100%",
    padding: "11px 0",
    border: `1px solid ${r("borderSubtle")}`,
    borderRadius: 10,
    background: "transparent",
    color: r("textTertiary"),
    fontSize: 13,
    fontWeight: 700,
    fontFamily: "inherit",
    cursor: "not-allowed",
    opacity: 0.5,
    marginTop: 6,
    letterSpacing: "0.02em"
  },
  formUploadArea: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 100,
    padding: "20px 16px",
    border: `1.5px dashed ${r("borderSubtle")}`,
    borderRadius: 12,
    background: "transparent",
    color: r("textTertiary"),
    fontSize: 12,
    cursor: "pointer",
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
    textAlign: "center",
    userSelect: "none"
  },
  formUploadAreaDragging: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 100,
    padding: "20px 16px",
    border: `1.5px dashed ${r("primary")}`,
    borderRadius: 12,
    background: r("primarySubtle"),
    color: r("text"),
    fontSize: 12,
    cursor: "pointer",
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
    textAlign: "center",
    userSelect: "none"
  },
  formHint: {
    fontSize: 11,
    color: r("textTertiary"),
    marginTop: 2,
    fontFamily: r("fontMono")
  },
  // ── Upload area ───────────────────────────────────────────────────────────
  uploadArea: {
    border: `1.5px dashed ${r("borderSubtle")}`,
    color: r("textTertiary")
  },
  uploadPreview: {
    background: r("bgDeep"),
    border: `1px solid ${r("borderSubtle")}`
  },
  // ── Generate button ───────────────────────────────────────────────────────
  generateBtn: {
    background: r("primary"),
    color: r("primaryForeground")
  },
  sliderLabel: {
    color: r("textSecondary")
  },
  sliderInput: {
    accentColor: r("primary")
  },
  // ── Gallery (left pane) ───────────────────────────────────────────────────
  gallery: {
    flex: 1,
    minWidth: 0,
    overflowY: "auto",
    overflowX: "hidden",
    padding: "20px",
    background: r("bgDeep")
  },
  galleryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: 14,
    alignContent: "start"
  },
  galleryEmpty: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    height: "100%",
    minHeight: 280,
    color: r("textTertiary"),
    fontSize: 13,
    textAlign: "center",
    userSelect: "none"
  },
  galleryCard: {
    position: "relative",
    borderRadius: 14,
    overflow: "hidden",
    background: r("bgElevated"),
    boxShadow: "0 2px 12px rgba(0, 0, 0, 0.3), 0 1px 4px rgba(0, 0, 0, 0.2)",
    cursor: "pointer",
    aspectRatio: "1 / 1",
    transition: "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1)"
  },
  galleryCardImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block"
  },
  galleryCardOverlay: {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(to top, rgba(0, 0, 0, 0.82) 0%, rgba(0, 0, 0, 0.25) 40%, rgba(0, 0, 0, 0) 60%)",
    opacity: 0,
    transition: "opacity 0.22s cubic-bezier(0.4, 0, 0.2, 1)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
    padding: "14px"
  },
  galleryCardPrompt: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.88)",
    lineHeight: 1.45,
    marginBottom: 8,
    overflow: "hidden",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    letterSpacing: "0.01em"
  },
  galleryCardActions: {
    display: "flex",
    gap: 5,
    flexWrap: "wrap"
  },
  galleryCardActionBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    height: 28,
    padding: "0 10px",
    border: "none",
    borderRadius: 7,
    background: "rgba(255, 255, 255, 0.12)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    color: "#fff",
    fontSize: 10,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "background 0.15s",
    whiteSpace: "nowrap",
    letterSpacing: "0.02em"
  },
  // ── Quick input bar (floating) ────────────────────────────────────────────
  quickInput: {
    position: "absolute",
    bottom: 16,
    left: "50%",
    transform: "translateX(-50%)",
    width: "min(680px, calc(100% - 360px))",
    zIndex: 10,
    display: "flex",
    alignItems: "flex-end",
    gap: 10,
    padding: "12px 16px",
    borderRadius: 16,
    background: r("glass"),
    backdropFilter: "blur(24px) saturate(1.2)",
    WebkitBackdropFilter: "blur(24px) saturate(1.2)",
    border: `1px solid ${r("glassBorder")}`,
    boxShadow: "0 8px 40px rgba(0, 0, 0, 0.4), 0 2px 12px rgba(0, 0, 0, 0.2)",
    transition: "box-shadow 0.3s"
  },
  quickInputTextarea: {
    flex: 1,
    minHeight: 24,
    maxHeight: 120,
    padding: 0,
    border: "none",
    background: "transparent",
    color: r("text"),
    fontSize: 13,
    fontFamily: "inherit",
    resize: "none",
    outline: "none",
    lineHeight: 1.5
  },
  quickInputSendBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 36,
    height: 36,
    border: "none",
    borderRadius: 10,
    background: r("primary"),
    color: r("primaryForeground"),
    cursor: "pointer",
    flexShrink: 0,
    padding: 0,
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
    boxShadow: `0 0 16px ${r("primaryGlow")}`
  },
  // ── Section divider ───────────────────────────────────────────────────────
  sectionDivider: {
    height: 1,
    margin: "4px 16px",
    background: `linear-gradient(to right, transparent, ${r("borderSubtle")}, transparent)`,
    flexShrink: 0
  },
  // ── Badge ─────────────────────────────────────────────────────────────────
  badge: {
    background: r("bgHover"),
    color: r("textTertiary"),
    fontFamily: r("fontMono")
  },
  badgeProcessing: {
    background: r("primarySubtle"),
    color: r("primary")
  },
  // ── Fullscreen preview overlay ────────────────────────────────────────────
  previewOverlay: {
    position: "fixed",
    inset: 0,
    zIndex: 1e3,
    background: "rgba(0, 0, 0, 0.85)",
    backdropFilter: "blur(20px) saturate(0.8)",
    WebkitBackdropFilter: "blur(20px) saturate(0.8)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center"
  },
  previewOverlayImg: {
    maxWidth: "min(90vw, 1200px)",
    maxHeight: "78vh",
    borderRadius: 14,
    boxShadow: "0 32px 80px rgba(0, 0, 0, 0.6), 0 8px 24px rgba(0, 0, 0, 0.3)",
    objectFit: "contain"
  },
  previewOverlayMeta: {
    marginTop: 16,
    padding: "12px 20px",
    borderRadius: 12,
    background: "rgba(255, 255, 255, 0.06)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    color: "rgba(255, 255, 255, 0.75)",
    fontSize: 12,
    maxWidth: "min(90vw, 600px)",
    textAlign: "center",
    lineHeight: 1.6
  },
  previewOverlayActions: {
    display: "flex",
    gap: 8,
    marginTop: 14
  },
  previewOverlayBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 38,
    padding: "0 18px",
    border: "none",
    borderRadius: 10,
    background: "rgba(255, 255, 255, 0.1)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    color: "#fff",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "background 0.15s",
    letterSpacing: "0.02em"
  },
  previewOverlayClose: {
    position: "absolute",
    top: 20,
    right: 20,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 40,
    height: 40,
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    background: "rgba(255, 255, 255, 0.06)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    color: "#fff",
    fontSize: 20,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "background 0.15s"
  },
  // ── Advanced workflow link ─────────────────────────────────────────────────
  advancedLink: {
    color: r("textTertiary")
  }
}, De = `
  .studio-gallery-card:hover {
    transform: translateY(-5px) scale(1.01);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5), 0 4px 16px rgba(0, 0, 0, 0.3);
  }
  .studio-gallery-card:hover .studio-gallery-overlay {
    opacity: 1;
  }
  .studio-gallery-card:active {
    transform: translateY(-2px) scale(1.0);
  }

  .studio-gallery-action:hover {
    background: rgba(255, 255, 255, 0.22) !important;
  }

  .studio-gen-btn:hover:not(:disabled) {
    opacity: 0.92;
    box-shadow: 0 0 24px ${r("primaryGlow")};
    transform: translateY(-1px);
  }
  .studio-gen-btn:active:not(:disabled) {
    transform: translateY(0);
    opacity: 1;
  }

  .studio-send-btn:hover:not(:disabled) {
    transform: scale(1.06);
    box-shadow: 0 0 20px ${r("primaryGlow")};
  }

  .studio-quick-input:focus-within {
    border-color: color-mix(in oklab, ${r("primary")} 35%, transparent);
    box-shadow: 0 8px 40px rgba(0, 0, 0, 0.4), 0 2px 12px rgba(0, 0, 0, 0.2), 0 0 0 1px color-mix(in oklab, ${r("primary")} 12%, transparent);
  }

  .studio-textarea:focus {
    border-color: color-mix(in oklab, ${r("primary")} 30%, transparent) !important;
    box-shadow: 0 0 0 3px ${r("primaryGlow")};
  }

  .studio-media-btn:hover:not(:disabled) {
    background: ${r("bgHover")};
    border-color: ${r("border")};
  }

  .studio-mode-tab:hover {
    background: ${r("bgHover")};
    color: ${r("textSecondary")};
  }

  .studio-preview-btn:hover {
    background: rgba(255, 255, 255, 0.16) !important;
  }

  .studio-preview-close:hover {
    background: rgba(255, 255, 255, 0.12) !important;
  }

  .studio-count-btn:hover:not(.studio-count-active) {
    background: ${r("bgHover")};
    border-color: ${r("border")};
    color: ${r("text")};
  }

  .studio-upload-area:hover {
    border-color: ${r("border")};
    background: ${r("bgHover")};
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @keyframes studioFadeIn {
    from { opacity: 0; transform: translateY(8px) scale(0.97); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  @keyframes studioPulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 1; }
  }

  @keyframes studioShimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }

  .studio-gallery-card {
    animation: studioFadeIn 0.35s cubic-bezier(0.4, 0, 0.2, 1) backwards;
  }

  .studio-sidebar::-webkit-scrollbar {
    width: 4px;
  }
  .studio-sidebar::-webkit-scrollbar-track {
    background: transparent;
  }
  .studio-sidebar::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.08);
    border-radius: 4px;
  }
  .studio-sidebar::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.14);
  }

  .studio-gallery::-webkit-scrollbar {
    width: 6px;
  }
  .studio-gallery::-webkit-scrollbar-track {
    background: transparent;
  }
  .studio-gallery::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.06);
    border-radius: 6px;
  }
  .studio-gallery::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.12);
  }
`, bt = [
  { value: "auto", label: "Auto" },
  { value: "1024x1024", label: "1024×1024" },
  { value: "1536x1024", label: "1536×1024" },
  { value: "1024x1536", label: "1024×1536" },
  { value: "2048x2048", label: "2048×2048" },
  { value: "2048x1152", label: "2048×1152" },
  { value: "1152x2048", label: "1152×2048" },
  { value: "3840x2160", label: "3840×2160 (4K)" },
  { value: "2160x3840", label: "2160×3840 (4K)" }
], mt = [1, 2, 3, 4];
function ft() {
  const { t: e } = P(), {
    selectedModel: o,
    setSelectedModel: l,
    imageSize: a,
    setImageSize: s,
    imageModels: d,
    isGenerating: b,
    generate: v
  } = U(), [g, w] = x(""), [_, k] = x(1), L = g.trim().length > 0, F = () => {
    const m = g.trim();
    if (!m || b) return;
    (async () => {
      for (let C = 0; C < _; C++)
        v(m, { count: 1 });
    })();
  };
  return /* @__PURE__ */ n("div", { style: { display: "flex", flexDirection: "column", gap: 14 }, children: [
    /* @__PURE__ */ n("div", { style: i.formRow, children: [
      /* @__PURE__ */ t("label", { style: i.formLabel, children: e("playground.studio_prompt", { defaultValue: "提示词" }) }),
      /* @__PURE__ */ t(
        "textarea",
        {
          style: i.formTextarea,
          className: "studio-textarea",
          value: g,
          onChange: (m) => w(m.target.value),
          placeholder: e("playground.studio_prompt_placeholder", { defaultValue: "描述你想生成的图片..." }),
          rows: 4
        }
      )
    ] }),
    /* @__PURE__ */ n("div", { style: i.formRow, children: [
      /* @__PURE__ */ t("label", { style: i.formLabel, children: e("playground.studio_model", { defaultValue: "模型" }) }),
      /* @__PURE__ */ t(
        te,
        {
          value: o,
          options: d.length === 0 ? [{ value: "", label: e("playground.studio_no_models", { defaultValue: "暂无可用模型" }) }] : d.map((m) => ({ value: m.platform ? `${m.platform}::${m.id}` : m.id, label: m.name || m.id })),
          onChange: l
        }
      )
    ] }),
    /* @__PURE__ */ n("div", { style: i.formRow, children: [
      /* @__PURE__ */ t("label", { style: i.formLabel, children: e("playground.studio_size", { defaultValue: "尺寸" }) }),
      /* @__PURE__ */ t(
        te,
        {
          value: a,
          options: bt,
          onChange: s
        }
      )
    ] }),
    /* @__PURE__ */ n("div", { style: i.formRow, children: [
      /* @__PURE__ */ t("label", { style: i.formLabel, children: e("playground.studio_count", { defaultValue: "数量" }) }),
      /* @__PURE__ */ t("div", { style: i.formCountGroup, children: mt.map((m) => /* @__PURE__ */ t(
        "button",
        {
          type: "button",
          style: _ === m ? i.formCountBtnActive : i.formCountBtn,
          className: _ === m ? "studio-count-active" : "studio-count-btn",
          onClick: () => k(m),
          children: m
        },
        m
      )) })
    ] }),
    /* @__PURE__ */ t(
      "button",
      {
        type: "button",
        style: L ? i.formGenerateBtn : i.formGenerateBtnDisabled,
        className: L ? "studio-gen-btn" : "",
        disabled: !L,
        onClick: F,
        children: b ? e("playground.studio_generating", { defaultValue: "生成中..." }) : e("playground.studio_generate", { defaultValue: "生成" })
      }
    )
  ] });
}
const Ie = {
  previewWrapper: {
    position: "relative",
    display: "inline-flex",
    borderRadius: 10,
    overflow: "hidden",
    border: `1px solid ${r("borderSubtle")}`,
    alignSelf: "flex-start"
  },
  previewImg: {
    width: 120,
    height: 90,
    objectFit: "cover",
    display: "block"
  },
  removeBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    border: "none",
    borderRadius: "50%",
    background: "rgba(0, 0, 0, 0.6)",
    backdropFilter: "blur(4px)",
    WebkitBackdropFilter: "blur(4px)",
    color: "#fff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    lineHeight: 1,
    padding: 0,
    transition: "background 0.15s"
  }
}, ht = [
  { value: "auto", label: "Auto" },
  { value: "1024x1024", label: "1024×1024" },
  { value: "1536x1024", label: "1536×1024" },
  { value: "1024x1536", label: "1024×1536" },
  { value: "2048x2048", label: "2048×2048" },
  { value: "2048x1152", label: "2048×1152" },
  { value: "1152x2048", label: "1152×2048" },
  { value: "3840x2160", label: "3840×2160 (4K)" },
  { value: "2160x3840", label: "2160×3840 (4K)" }
];
function yt(e) {
  return new Promise((o, l) => {
    const a = new FileReader();
    a.onload = () => o(a.result), a.onerror = () => l(a.error), a.readAsDataURL(e);
  });
}
function xt() {
  const { t: e } = P(), {
    selectedModel: o,
    setSelectedModel: l,
    imageSize: a,
    setImageSize: s,
    imageModels: d,
    isGenerating: b,
    generate: v
  } = U(), [g, w] = x(""), [_, k] = x(null), [L, F] = x(!1), m = N(null), M = g.trim().length > 0 && _ !== null, C = async (f) => {
    if (f.type.startsWith("image/"))
      try {
        const T = await yt(f);
        k(T);
      } catch {
      }
  }, V = (f) => {
    var c;
    const T = (c = f.target.files) == null ? void 0 : c[0];
    T && C(T), f.target.value = "";
  }, R = (f) => {
    f.preventDefault(), F(!0);
  }, W = () => F(!1), $ = (f) => {
    var c;
    f.preventDefault(), F(!1);
    const T = (c = f.dataTransfer.files) == null ? void 0 : c[0];
    T && C(T);
  };
  return /* @__PURE__ */ n("div", { style: { display: "flex", flexDirection: "column", gap: 14 }, children: [
    /* @__PURE__ */ n("div", { style: i.formRow, children: [
      /* @__PURE__ */ t("label", { style: i.formLabel, children: e("playground.studio_source_image", { defaultValue: "参考图片" }) }),
      _ ? /* @__PURE__ */ n("div", { style: Ie.previewWrapper, children: [
        /* @__PURE__ */ t("img", { src: _, alt: "source", style: Ie.previewImg }),
        /* @__PURE__ */ t(
          "button",
          {
            type: "button",
            style: Ie.removeBtn,
            onClick: () => k(null),
            title: e("playground.studio_remove_image", { defaultValue: "移除图片" }),
            children: "×"
          }
        )
      ] }) : /* @__PURE__ */ n(
        "div",
        {
          style: L ? i.formUploadAreaDragging : i.formUploadArea,
          className: "studio-upload-area",
          onClick: () => {
            var f;
            return (f = m.current) == null ? void 0 : f.click();
          },
          onDragOver: R,
          onDragLeave: W,
          onDrop: $,
          role: "button",
          tabIndex: 0,
          onKeyDown: (f) => {
            var T;
            (f.key === "Enter" || f.key === " ") && ((T = m.current) == null || T.click());
          },
          children: [
            /* @__PURE__ */ n("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", opacity: 0.35, children: [
              /* @__PURE__ */ t("rect", { x: "3", y: "3", width: "18", height: "18", rx: "2" }),
              /* @__PURE__ */ t("circle", { cx: "8.5", cy: "8.5", r: "1.5" }),
              /* @__PURE__ */ t("path", { d: "M21 15l-5-5L5 21" })
            ] }),
            /* @__PURE__ */ t("span", { children: e("playground.studio_upload_hint", { defaultValue: "点击上传或拖拽图片到此处" }) })
          ]
        }
      ),
      /* @__PURE__ */ t(
        "input",
        {
          ref: m,
          type: "file",
          accept: "image/*",
          style: { display: "none" },
          onChange: V
        }
      )
    ] }),
    /* @__PURE__ */ n("div", { style: i.formRow, children: [
      /* @__PURE__ */ t("label", { style: i.formLabel, children: e("playground.studio_prompt", { defaultValue: "提示词" }) }),
      /* @__PURE__ */ t(
        "textarea",
        {
          style: i.formTextarea,
          className: "studio-textarea",
          value: g,
          onChange: (f) => w(f.target.value),
          placeholder: e("playground.studio_img2img_placeholder", { defaultValue: "描述你想要的变化..." }),
          rows: 3
        }
      )
    ] }),
    /* @__PURE__ */ n("div", { style: i.formRow, children: [
      /* @__PURE__ */ t("label", { style: i.formLabel, children: e("playground.studio_model", { defaultValue: "模型" }) }),
      /* @__PURE__ */ t(
        te,
        {
          value: o,
          options: d.length === 0 ? [{ value: "", label: e("playground.studio_no_models", { defaultValue: "暂无可用模型" }) }] : d.map((f) => ({ value: f.platform ? `${f.platform}::${f.id}` : f.id, label: f.name || f.id })),
          onChange: l
        }
      )
    ] }),
    /* @__PURE__ */ n("div", { style: i.formRow, children: [
      /* @__PURE__ */ t("label", { style: i.formLabel, children: e("playground.studio_size", { defaultValue: "尺寸" }) }),
      /* @__PURE__ */ t(
        te,
        {
          value: a,
          options: ht,
          onChange: s
        }
      )
    ] }),
    /* @__PURE__ */ t(
      "button",
      {
        type: "button",
        style: M ? i.formGenerateBtn : i.formGenerateBtnDisabled,
        className: M ? "studio-gen-btn" : "",
        disabled: !M,
        onClick: () => {
          v(g, { sourceImage: _ ?? void 0 });
        },
        children: b ? e("playground.studio_generating", { defaultValue: "生成中..." }) : e("playground.studio_generate", { defaultValue: "生成" })
      }
    )
  ] });
}
const re = {
  canvasContainer: {
    position: "relative",
    borderRadius: 10,
    overflow: "hidden",
    border: `1px solid ${r("borderSubtle")}`,
    cursor: "crosshair",
    userSelect: "none"
  },
  sourceImg: {
    display: "block",
    width: "100%",
    height: "auto",
    maxHeight: 200,
    objectFit: "contain",
    pointerEvents: "none"
  },
  selectionRect: {
    position: "absolute",
    border: "2px dashed rgba(255, 255, 255, 0.7)",
    background: "rgba(255, 255, 255, 0.08)",
    boxSizing: "border-box",
    pointerEvents: "none",
    borderRadius: 2
  },
  canvasActions: {
    display: "flex",
    gap: 6,
    marginTop: 6
  },
  actionBtn: {
    padding: "6px 12px",
    border: `1px solid ${r("borderSubtle")}`,
    borderRadius: 8,
    background: "transparent",
    color: r("textSecondary"),
    cursor: "pointer",
    fontSize: 11,
    fontFamily: "inherit",
    fontWeight: 500,
    transition: "all 0.15s"
  },
  selectionHint: {
    fontSize: 10,
    color: r("textTertiary"),
    marginTop: 4,
    fontFamily: r("fontMono"),
    letterSpacing: "0.02em"
  }
}, vt = [
  { value: "auto", label: "Auto" },
  { value: "1024x1024", label: "1024×1024" },
  { value: "1536x1024", label: "1536×1024" },
  { value: "1024x1536", label: "1024×1536" },
  { value: "2048x2048", label: "2048×2048" },
  { value: "2048x1152", label: "2048×1152" },
  { value: "1152x2048", label: "1152×2048" },
  { value: "3840x2160", label: "3840×2160 (4K)" },
  { value: "2160x3840", label: "2160×3840 (4K)" }
];
function kt(e) {
  return new Promise((o, l) => {
    const a = new FileReader();
    a.onload = () => o(a.result), a.onerror = () => l(a.error), a.readAsDataURL(e);
  });
}
function wt(e, o, l, a, s, d) {
  const b = Math.min(e, l) / s, v = Math.min(o, a) / d, g = Math.abs(l - e) / s, w = Math.abs(a - o) / d;
  return {
    x: Math.max(0, Math.min(1, b)),
    y: Math.max(0, Math.min(1, v)),
    width: Math.max(0, Math.min(1, g)),
    height: Math.max(0, Math.min(1, w))
  };
}
function St() {
  const { t: e } = P(), {
    selectedModel: o,
    setSelectedModel: l,
    imageSize: a,
    setImageSize: s,
    imageModels: d,
    isGenerating: b,
    generate: v
  } = U(), [g, w] = x(""), [_, k] = x(null), [L, F] = x(!1), [m, M] = x(null), [C, V] = x(null), [R, W] = x(null), $ = N(null), f = N(null), T = g.trim().length > 0 && _ !== null, c = async (u) => {
    if (u.type.startsWith("image/"))
      try {
        const h = await kt(u);
        k(h), M(null);
      } catch {
      }
  }, O = (u) => {
    var B;
    const h = (B = u.target.files) == null ? void 0 : B[0];
    h && c(h), u.target.value = "";
  }, K = (u) => {
    u.preventDefault(), F(!0);
  }, oe = () => F(!1), me = (u) => {
    var B;
    u.preventDefault(), F(!1);
    const h = (B = u.dataTransfer.files) == null ? void 0 : B[0];
    h && c(h);
  }, Z = G((u) => {
    const h = f.current;
    if (!h) return null;
    const B = h.getBoundingClientRect();
    return { x: u.clientX - B.left, y: u.clientY - B.top };
  }, []), ne = G((u) => {
    if (!_) return;
    const h = Z(u);
    h && (u.preventDefault(), V({ startX: h.x, startY: h.y }), W({ x: h.x, y: h.y, w: 0, h: 0 }), M(null));
  }, [_, Z]), J = G((u) => {
    if (!C) return;
    const h = Z(u);
    h && W({
      x: Math.min(C.startX, h.x),
      y: Math.min(C.startY, h.y),
      w: Math.abs(h.x - C.startX),
      h: Math.abs(h.y - C.startY)
    });
  }, [C, Z]), ce = G((u) => {
    if (!C) return;
    const h = Z(u), B = f.current;
    if (!h || !B) {
      V(null), W(null);
      return;
    }
    const { width: ae, height: S } = B.getBoundingClientRect(), y = wt(C.startX, C.startY, h.x, h.y, ae, S);
    y.width > 0.01 && y.height > 0.01 && M(y), V(null), W(null);
  }, [C, Z]), Se = () => {
    const u = R ? { x: R.x, y: R.y, width: R.w, height: R.h } : m ? (() => {
      const h = f.current;
      if (!h) return null;
      const { width: B, height: ae } = h.getBoundingClientRect();
      return {
        x: m.x * B,
        y: m.y * ae,
        width: m.width * B,
        height: m.height * ae
      };
    })() : null;
    return !u || u.width < 2 && u.height < 2 ? null : /* @__PURE__ */ t(
      "div",
      {
        style: {
          ...re.selectionRect,
          left: u.x,
          top: u.y,
          width: u.width,
          height: u.height
        }
      }
    );
  }, E = () => {
    !T || !_ || v(g, {
      sourceImage: _,
      maskRegion: m ?? void 0
    });
  };
  return /* @__PURE__ */ n("div", { style: { display: "flex", flexDirection: "column", gap: 14 }, children: [
    /* @__PURE__ */ n("div", { style: i.formRow, children: [
      /* @__PURE__ */ t("label", { style: i.formLabel, children: e("playground.studio_source_image", { defaultValue: "参考图片" }) }),
      _ ? /* @__PURE__ */ n(Me, { children: [
        /* @__PURE__ */ n(
          "div",
          {
            ref: f,
            style: re.canvasContainer,
            onMouseDown: ne,
            onMouseMove: J,
            onMouseUp: ce,
            onMouseLeave: ce,
            children: [
              /* @__PURE__ */ t("img", { src: _, alt: "source", style: re.sourceImg }),
              Se()
            ]
          }
        ),
        /* @__PURE__ */ n("div", { style: re.canvasActions, children: [
          /* @__PURE__ */ t(
            "button",
            {
              type: "button",
              style: re.actionBtn,
              onClick: () => M(null),
              children: e("playground.studio_clear_selection", { defaultValue: "清除选区" })
            }
          ),
          /* @__PURE__ */ t(
            "button",
            {
              type: "button",
              style: re.actionBtn,
              onClick: () => {
                k(null), M(null);
              },
              children: e("playground.studio_remove_image", { defaultValue: "移除图片" })
            }
          )
        ] }),
        /* @__PURE__ */ t("div", { style: re.selectionHint, children: m ? e("playground.studio_selection_set", { defaultValue: "已选定修改区域，拖拽可重新选择" }) : e("playground.studio_selection_hint", { defaultValue: "在图片上拖拽选择要修改的区域" }) })
      ] }) : /* @__PURE__ */ n(
        "div",
        {
          style: L ? i.formUploadAreaDragging : i.formUploadArea,
          className: "studio-upload-area",
          onClick: () => {
            var u;
            return (u = $.current) == null ? void 0 : u.click();
          },
          onDragOver: K,
          onDragLeave: oe,
          onDrop: me,
          role: "button",
          tabIndex: 0,
          onKeyDown: (u) => {
            var h;
            (u.key === "Enter" || u.key === " ") && ((h = $.current) == null || h.click());
          },
          children: [
            /* @__PURE__ */ n("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", opacity: 0.35, children: [
              /* @__PURE__ */ t("rect", { x: "3", y: "3", width: "18", height: "18", rx: "2" }),
              /* @__PURE__ */ t("circle", { cx: "8.5", cy: "8.5", r: "1.5" }),
              /* @__PURE__ */ t("path", { d: "M21 15l-5-5L5 21" })
            ] }),
            /* @__PURE__ */ t("span", { children: e("playground.studio_upload_hint", { defaultValue: "点击上传或拖拽图片到此处" }) })
          ]
        }
      ),
      /* @__PURE__ */ t(
        "input",
        {
          ref: $,
          type: "file",
          accept: "image/*",
          style: { display: "none" },
          onChange: O
        }
      )
    ] }),
    /* @__PURE__ */ n("div", { style: i.formRow, children: [
      /* @__PURE__ */ t("label", { style: i.formLabel, children: e("playground.studio_prompt", { defaultValue: "提示词" }) }),
      /* @__PURE__ */ t(
        "textarea",
        {
          style: i.formTextarea,
          className: "studio-textarea",
          value: g,
          onChange: (u) => w(u.target.value),
          placeholder: e("playground.studio_inpaint_placeholder", { defaultValue: "描述要修改的区域..." }),
          rows: 3
        }
      )
    ] }),
    /* @__PURE__ */ n("div", { style: i.formRow, children: [
      /* @__PURE__ */ t("label", { style: i.formLabel, children: e("playground.studio_model", { defaultValue: "模型" }) }),
      /* @__PURE__ */ t(
        te,
        {
          value: o,
          options: d.length === 0 ? [{ value: "", label: e("playground.studio_no_models", { defaultValue: "暂无可用模型" }) }] : d.map((u) => ({ value: u.platform ? `${u.platform}::${u.id}` : u.id, label: u.name || u.id })),
          onChange: l
        }
      )
    ] }),
    /* @__PURE__ */ n("div", { style: i.formRow, children: [
      /* @__PURE__ */ t("label", { style: i.formLabel, children: e("playground.studio_size", { defaultValue: "尺寸" }) }),
      /* @__PURE__ */ t(
        te,
        {
          value: a,
          options: vt,
          onChange: s
        }
      )
    ] }),
    /* @__PURE__ */ t(
      "button",
      {
        type: "button",
        style: T ? i.formGenerateBtn : i.formGenerateBtnDisabled,
        className: T ? "studio-gen-btn" : "",
        disabled: !T,
        onClick: E,
        children: b ? e("playground.studio_generating", { defaultValue: "生成中..." }) : e("playground.studio_generate", { defaultValue: "生成" })
      }
    )
  ] });
}
const j = {
  tabRow: {
    display: "flex",
    gap: 0,
    borderRadius: 10,
    overflow: "hidden",
    border: `1px solid ${r("borderSubtle")}`
  },
  tab: {
    flex: 1,
    padding: "8px 0",
    border: "none",
    background: "transparent",
    color: r("textSecondary"),
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "all 0.18s"
  },
  tabActive: {
    flex: 1,
    padding: "8px 0",
    border: "none",
    background: r("bgHover"),
    color: r("text"),
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit"
  },
  uploadArea: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 80,
    padding: 14,
    border: `1.5px dashed ${r("borderSubtle")}`,
    borderRadius: 12,
    cursor: "pointer",
    color: r("textTertiary"),
    fontSize: 12,
    textAlign: "center",
    transition: "all 0.2s"
  },
  thumbGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 6
  },
  thumb: {
    position: "relative",
    aspectRatio: "1",
    borderRadius: 8,
    overflow: "hidden",
    border: `1px solid ${r("borderSubtle")}`
  },
  thumbImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block"
  },
  thumbRemove: {
    position: "absolute",
    top: 3,
    right: 3,
    width: 18,
    height: 18,
    border: "none",
    borderRadius: "50%",
    background: "rgba(0, 0, 0, 0.6)",
    backdropFilter: "blur(4px)",
    WebkitBackdropFilter: "blur(4px)",
    color: "#fff",
    fontSize: 11,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    lineHeight: 1,
    transition: "background 0.15s"
  }
}, _t = [
  { value: "auto", label: "Auto" },
  { value: "1024x1024", label: "1024×1024" },
  { value: "1536x1024", label: "1536×1024" },
  { value: "1024x1536", label: "1024×1536" },
  { value: "2048x2048", label: "2048×2048" },
  { value: "2048x1152", label: "2048×1152" },
  { value: "1152x2048", label: "1152×2048" },
  { value: "3840x2160", label: "3840×2160 (4K)" },
  { value: "2160x3840", label: "2160×3840 (4K)" }
];
function Ct() {
  const { t: e } = P(), { selectedModel: o, setSelectedModel: l, imageSize: a, setImageSize: s, imageModels: d, isGenerating: b, generate: v } = U(), [g, w] = x("multi_prompt"), [_, k] = x(""), [L, F] = x([]), [m, M] = x(""), C = N(null), V = _.split(`
`).map((c) => c.trim()).filter((c) => c.length > 0), R = g === "multi_prompt" ? V.length > 0 : L.length > 0 && m.trim().length > 0, W = G((c) => {
    c && Array.from(c).forEach((O) => {
      if (!O.type.startsWith("image/")) return;
      const K = new FileReader();
      K.onload = () => {
        F((oe) => [...oe, { id: `${O.name}-${Date.now()}`, url: K.result, file: O }]);
      }, K.readAsDataURL(O);
    });
  }, []), $ = G((c) => {
    F((O) => O.filter((K) => K.id !== c));
  }, []), f = async () => {
    if (R)
      if (g === "multi_prompt")
        for (const c of V)
          v(c, { count: 1 });
      else
        for (const c of L)
          v(m.trim(), { sourceImage: c.url });
  }, T = b ? e("playground.studio_generating", { defaultValue: "生成中..." }) : g === "multi_prompt" ? `${e("playground.studio_batch_generate", { defaultValue: "批量生成" })} ${V.length} ${e("playground.studio_batch_unit", { defaultValue: "张" })}` : `${e("playground.studio_batch_process", { defaultValue: "批量处理" })} ${L.length} ${e("playground.studio_batch_images", { defaultValue: "张图片" })}`;
  return /* @__PURE__ */ n("div", { style: { display: "flex", flexDirection: "column", gap: 14 }, children: [
    /* @__PURE__ */ n("div", { style: j.tabRow, children: [
      /* @__PURE__ */ t("button", { type: "button", style: g === "multi_prompt" ? j.tabActive : j.tab, onClick: () => w("multi_prompt"), children: e("playground.studio_batch_multi_prompt", { defaultValue: "多提示词" }) }),
      /* @__PURE__ */ t("button", { type: "button", style: g === "multi_image" ? j.tabActive : j.tab, onClick: () => w("multi_image"), children: e("playground.studio_batch_multi_image", { defaultValue: "多图片" }) })
    ] }),
    g === "multi_prompt" ? /* @__PURE__ */ n("div", { style: i.formRow, children: [
      /* @__PURE__ */ t("label", { style: i.formLabel, children: e("playground.studio_batch_prompts", { defaultValue: "批量提示词" }) }),
      /* @__PURE__ */ t(
        "textarea",
        {
          style: { ...i.formTextarea, minHeight: 96 },
          className: "studio-textarea",
          value: _,
          onChange: (c) => k(c.target.value),
          placeholder: e("playground.studio_batch_placeholder", { defaultValue: "每行一个提示词..." }),
          rows: 5
        }
      ),
      /* @__PURE__ */ t("div", { style: i.formHint, children: V.length > 0 ? `共 ${V.length} 个提示词` : e("playground.studio_batch_empty", { defaultValue: "尚未输入提示词" }) })
    ] }) : /* @__PURE__ */ n(Me, { children: [
      /* @__PURE__ */ n("div", { style: i.formRow, children: [
        /* @__PURE__ */ t("label", { style: i.formLabel, children: e("playground.studio_batch_upload", { defaultValue: "上传图片" }) }),
        /* @__PURE__ */ n(
          "div",
          {
            style: j.uploadArea,
            className: "studio-upload-area",
            onClick: () => {
              var c;
              return (c = C.current) == null ? void 0 : c.click();
            },
            onDragOver: (c) => c.preventDefault(),
            onDrop: (c) => {
              c.preventDefault(), W(c.dataTransfer.files);
            },
            children: [
              /* @__PURE__ */ t("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", opacity: 0.4, children: /* @__PURE__ */ t("path", { d: "M12 5v14M5 12h14" }) }),
              e("playground.studio_batch_add_images", { defaultValue: "点击或拖拽添加图片" })
            ]
          }
        ),
        /* @__PURE__ */ t("input", { ref: C, type: "file", accept: "image/*", multiple: !0, style: { display: "none" }, onChange: (c) => W(c.target.files) })
      ] }),
      L.length > 0 && /* @__PURE__ */ t("div", { style: j.thumbGrid, children: L.map((c) => /* @__PURE__ */ n("div", { style: j.thumb, children: [
        /* @__PURE__ */ t("img", { src: c.url, alt: "", style: j.thumbImg }),
        /* @__PURE__ */ t("button", { type: "button", style: j.thumbRemove, onClick: () => $(c.id), children: "×" })
      ] }, c.id)) }),
      /* @__PURE__ */ n("div", { style: i.formRow, children: [
        /* @__PURE__ */ t("label", { style: i.formLabel, children: e("playground.studio_batch_shared_prompt", { defaultValue: "统一提示词" }) }),
        /* @__PURE__ */ t(
          "textarea",
          {
            style: { ...i.formTextarea, minHeight: 72 },
            className: "studio-textarea",
            value: m,
            onChange: (c) => M(c.target.value),
            placeholder: e("playground.studio_batch_shared_placeholder", { defaultValue: "对所有图片应用相同的描述..." }),
            rows: 3
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ n("div", { style: i.formRow, children: [
      /* @__PURE__ */ t("label", { style: i.formLabel, children: e("playground.studio_model", { defaultValue: "模型" }) }),
      /* @__PURE__ */ t(
        te,
        {
          value: o,
          options: d.length === 0 ? [{ value: "", label: e("playground.studio_no_models", { defaultValue: "暂无可用模型" }) }] : d.map((c) => ({ value: c.platform ? `${c.platform}::${c.id}` : c.id, label: c.name || c.id })),
          onChange: l
        }
      )
    ] }),
    /* @__PURE__ */ n("div", { style: i.formRow, children: [
      /* @__PURE__ */ t("label", { style: i.formLabel, children: e("playground.studio_size", { defaultValue: "尺寸" }) }),
      /* @__PURE__ */ t(te, { value: a, options: _t, onChange: s })
    ] }),
    /* @__PURE__ */ t(
      "button",
      {
        type: "button",
        style: R ? i.formGenerateBtn : i.formGenerateBtnDisabled,
        className: R ? "studio-gen-btn" : "",
        disabled: !R,
        onClick: () => {
          f();
        },
        children: T
      }
    )
  ] });
}
const ve = {
  tabBar: {
    display: "flex",
    gap: 2,
    padding: "3px",
    background: r("bgDeep"),
    borderRadius: 10,
    marginBottom: 14,
    margin: "0 12px 14px"
  },
  tab: {
    flex: "1 1 auto",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "7px 6px",
    border: "none",
    borderRadius: 8,
    background: "transparent",
    color: r("textTertiary"),
    cursor: "pointer",
    fontSize: 12,
    fontFamily: "inherit",
    fontWeight: 500,
    transition: "all 0.18s cubic-bezier(0.4, 0, 0.2, 1)",
    whiteSpace: "nowrap"
  },
  tabActive: {
    flex: "1 1 auto",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "7px 6px",
    border: "none",
    borderRadius: 8,
    background: r("bgHover"),
    color: r("text"),
    cursor: "pointer",
    fontSize: 12,
    fontFamily: "inherit",
    fontWeight: 700,
    transition: "all 0.18s cubic-bezier(0.4, 0, 0.2, 1)",
    whiteSpace: "nowrap",
    boxShadow: "0 1px 4px rgba(0, 0, 0, 0.12)"
  },
  panelWrap: {
    padding: "0 12px"
  }
}, It = [
  { mode: "text2img", labelKey: "playground.studio_mode_text2img", defaultLabel: "文生图" },
  { mode: "img2img", labelKey: "playground.studio_mode_img2img", defaultLabel: "图生图" },
  { mode: "inpaint", labelKey: "playground.studio_mode_inpaint", defaultLabel: "局部绘图" },
  { mode: "batch", labelKey: "playground.studio_mode_batch", defaultLabel: "批量" }
];
function Le() {
  const { t: e } = P(), { imageMode: o, setImageMode: l } = U();
  return /* @__PURE__ */ n(Me, { children: [
    /* @__PURE__ */ t("div", { style: ve.tabBar, children: It.map((a) => /* @__PURE__ */ t(
      "button",
      {
        type: "button",
        style: o === a.mode ? ve.tabActive : ve.tab,
        className: "studio-mode-tab",
        onClick: () => l(a.mode),
        children: e(a.labelKey, { defaultValue: a.defaultLabel })
      },
      a.mode
    )) }),
    /* @__PURE__ */ n("div", { style: ve.panelWrap, children: [
      o === "text2img" && /* @__PURE__ */ t(ft, {}),
      o === "img2img" && /* @__PURE__ */ t(xt, {}),
      o === "inpaint" && /* @__PURE__ */ t(St, {}),
      o === "batch" && /* @__PURE__ */ t(Ct, {})
    ] })
  ] });
}
async function Ee(e, o) {
  try {
    const a = await (await fetch(e)).blob(), s = URL.createObjectURL(a), d = document.createElement("a");
    d.href = s;
    const b = e.includes(".png") ? ".png" : e.includes(".webp") ? ".webp" : ".jpg";
    d.download = (o || "image") + b, document.body.appendChild(d), d.click(), document.body.removeChild(d), URL.revokeObjectURL(s);
  } catch {
    window.open(e, "_blank");
  }
}
const de = {
  card: {
    position: "relative",
    borderRadius: 14,
    overflow: "hidden",
    background: "rgba(255, 255, 255, 0.03)",
    border: "1px solid rgba(255, 255, 255, 0.06)",
    aspectRatio: "1 / 1",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 16,
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)"
  },
  spinner: {
    width: 32,
    height: 32,
    border: "2px solid rgba(255, 255, 255, 0.08)",
    borderTopColor: "rgba(255, 255, 255, 0.6)",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
    flexShrink: 0
  },
  failedIcon: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    border: "2px solid rgba(248, 113, 113, 0.4)",
    color: "#f87171",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 18,
    fontWeight: 700,
    flexShrink: 0
  },
  prompt: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.4)",
    textAlign: "center",
    lineHeight: 1.45,
    overflow: "hidden",
    display: "-webkit-box",
    WebkitLineClamp: 3,
    WebkitBoxOrient: "vertical"
  },
  statusLabel: {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "rgba(255, 255, 255, 0.3)",
    fontFamily: r("fontMono")
  }
};
function Tt({ task: e }) {
  const { t: o } = P(), l = e.status === "queued" ? o("playground.studio_task_queued", { defaultValue: "队列中..." }) : e.status === "failed" ? o("playground.studio_task_failed", { defaultValue: "生成失败" }) : o("playground.studio_task_processing", { defaultValue: "生成中..." });
  return /* @__PURE__ */ n("div", { style: de.card, children: [
    e.status === "failed" ? /* @__PURE__ */ t("div", { style: de.failedIcon, children: "!" }) : /* @__PURE__ */ t("div", { style: de.spinner }),
    /* @__PURE__ */ t("div", { style: de.statusLabel, children: l }),
    e.status === "failed" && e.error && /* @__PURE__ */ t("div", { style: de.prompt, children: e.error }),
    e.prompt && e.status !== "failed" && /* @__PURE__ */ t("div", { style: de.prompt, children: e.prompt })
  ] });
}
function Mt({ item: e, index: o }) {
  const { t: l } = P(), { setPreviewItem: a, deleteGalleryItem: s, useAsReference: d } = U(), b = (w) => {
    w.stopPropagation(), Ee(e.url, e.alt);
  }, v = (w) => {
    w.stopPropagation(), d(e);
  }, g = (w) => {
    w.stopPropagation(), s(e.id);
  };
  return /* @__PURE__ */ n(
    "div",
    {
      style: { ...i.galleryCard, animationDelay: `${Math.min(o * 50, 300)}ms` },
      onClick: () => a(e),
      className: "studio-gallery-card",
      children: [
        /* @__PURE__ */ t(
          "img",
          {
            src: e.url,
            alt: e.alt || e.prompt,
            style: i.galleryCardImg,
            loading: "lazy"
          }
        ),
        /* @__PURE__ */ n("div", { style: i.galleryCardOverlay, className: "studio-gallery-overlay", children: [
          e.prompt && /* @__PURE__ */ t("div", { style: i.galleryCardPrompt, children: e.prompt }),
          /* @__PURE__ */ n("div", { style: i.galleryCardActions, children: [
            /* @__PURE__ */ n(
              "button",
              {
                type: "button",
                style: i.galleryCardActionBtn,
                className: "studio-gallery-action",
                onClick: b,
                title: l("playground.studio_download", { defaultValue: "下载" }),
                children: [
                  /* @__PURE__ */ n("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", style: { marginRight: 3 }, children: [
                    /* @__PURE__ */ t("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }),
                    /* @__PURE__ */ t("polyline", { points: "7 10 12 15 17 10" }),
                    /* @__PURE__ */ t("line", { x1: "12", y1: "15", x2: "12", y2: "3" })
                  ] }),
                  l("playground.studio_download", { defaultValue: "下载" })
                ]
              }
            ),
            /* @__PURE__ */ n(
              "button",
              {
                type: "button",
                style: i.galleryCardActionBtn,
                className: "studio-gallery-action",
                onClick: v,
                title: l("playground.studio_use_as_reference", { defaultValue: "参考图" }),
                children: [
                  /* @__PURE__ */ n("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", style: { marginRight: 3 }, children: [
                    /* @__PURE__ */ t("path", { d: "M16 3h5v5" }),
                    /* @__PURE__ */ t("path", { d: "M21 3l-7 7" }),
                    /* @__PURE__ */ t("path", { d: "M8 21H3v-5" }),
                    /* @__PURE__ */ t("path", { d: "M3 21l7-7" })
                  ] }),
                  l("playground.studio_use_as_reference", { defaultValue: "参考图" })
                ]
              }
            ),
            /* @__PURE__ */ n(
              "button",
              {
                type: "button",
                style: i.galleryCardActionBtn,
                className: "studio-gallery-action",
                onClick: g,
                title: l("playground.studio_delete", { defaultValue: "删除" }),
                children: [
                  /* @__PURE__ */ n("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", style: { marginRight: 3 }, children: [
                    /* @__PURE__ */ t("path", { d: "M3 6h18" }),
                    /* @__PURE__ */ t("path", { d: "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" }),
                    /* @__PURE__ */ t("path", { d: "M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" })
                  ] }),
                  l("playground.studio_delete", { defaultValue: "删除" })
                ]
              }
            )
          ] })
        ] })
      ]
    }
  );
}
function Rt() {
  const { t: e } = P(), { previewItem: o, setPreviewItem: l } = U();
  if (ke(() => {
    if (!o) return;
    const s = (d) => {
      d.key === "Escape" && l(null);
    };
    return window.addEventListener("keydown", s), () => window.removeEventListener("keydown", s);
  }, [o, l]), !o) return null;
  const a = () => {
    Ee(o.url, o.alt);
  };
  return /* @__PURE__ */ n(
    "div",
    {
      style: i.previewOverlay,
      onClick: () => l(null),
      role: "dialog",
      "aria-modal": "true",
      "aria-label": e("playground.studio_preview", { defaultValue: "图片预览" }),
      children: [
        /* @__PURE__ */ t(
          "button",
          {
            type: "button",
            style: i.previewOverlayClose,
            className: "studio-preview-close",
            onClick: () => l(null),
            "aria-label": e("playground.studio_close", { defaultValue: "关闭" }),
            children: "×"
          }
        ),
        /* @__PURE__ */ t(
          "img",
          {
            src: o.url,
            alt: o.alt || o.prompt,
            style: i.previewOverlayImg,
            onClick: (s) => s.stopPropagation()
          }
        ),
        (o.prompt || o.model) && /* @__PURE__ */ n("div", { style: i.previewOverlayMeta, onClick: (s) => s.stopPropagation(), children: [
          o.prompt && /* @__PURE__ */ t("div", { children: o.prompt }),
          o.model && /* @__PURE__ */ t("div", { style: { marginTop: 6, opacity: 0.55, fontSize: 11, fontFamily: r("fontMono"), letterSpacing: "0.02em" }, children: o.model })
        ] }),
        /* @__PURE__ */ n("div", { style: i.previewOverlayActions, onClick: (s) => s.stopPropagation(), children: [
          /* @__PURE__ */ n(
            "button",
            {
              type: "button",
              style: i.previewOverlayBtn,
              className: "studio-preview-btn",
              onClick: a,
              children: [
                /* @__PURE__ */ n("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
                  /* @__PURE__ */ t("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }),
                  /* @__PURE__ */ t("polyline", { points: "7 10 12 15 17 10" }),
                  /* @__PURE__ */ t("line", { x1: "12", y1: "15", x2: "12", y2: "3" })
                ] }),
                e("playground.studio_download", { defaultValue: "下载" })
              ]
            }
          ),
          /* @__PURE__ */ t(
            "button",
            {
              type: "button",
              style: i.previewOverlayBtn,
              className: "studio-preview-btn",
              onClick: () => l(null),
              children: e("playground.studio_close", { defaultValue: "关闭" })
            }
          )
        ] })
      ]
    }
  );
}
const Te = {
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 16,
    background: "rgba(255, 255, 255, 0.03)",
    border: "1px solid rgba(255, 255, 255, 0.06)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4
  },
  title: {
    fontSize: 14,
    fontWeight: 600,
    color: r("textSecondary"),
    letterSpacing: "-0.01em"
  },
  hint: {
    fontSize: 12,
    marginTop: 2,
    color: r("textTertiary"),
    opacity: 0.6,
    fontFamily: r("fontMono"),
    letterSpacing: "0.02em"
  }
};
function Bt() {
  const { t: e } = P();
  return /* @__PURE__ */ n("div", { style: i.galleryEmpty, children: [
    /* @__PURE__ */ t("div", { style: Te.iconWrap, children: /* @__PURE__ */ n("svg", { width: "26", height: "26", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", opacity: 0.35, children: [
      /* @__PURE__ */ t("rect", { x: "3", y: "3", width: "18", height: "18", rx: "2" }),
      /* @__PURE__ */ t("circle", { cx: "8.5", cy: "8.5", r: "1.5" }),
      /* @__PURE__ */ t("path", { d: "M21 15l-5-5L5 21" })
    ] }) }),
    /* @__PURE__ */ t("div", { style: Te.title, children: e("playground.studio_gallery_empty", { defaultValue: "还没有生成的图片" }) }),
    /* @__PURE__ */ t("div", { style: Te.hint, children: e("playground.studio_gallery_empty_hint", { defaultValue: "输入提示词开始创作" }) })
  ] });
}
function Fe() {
  const { gallery: e, tasks: o, previewItem: l } = U(), a = o.filter((d) => d.status !== "completed"), s = e.length === 0 && a.length === 0;
  return /* @__PURE__ */ n("div", { style: i.gallery, className: "studio-gallery", children: [
    l && /* @__PURE__ */ t(Rt, {}),
    s ? /* @__PURE__ */ t(Bt, {}) : /* @__PURE__ */ n("div", { style: i.galleryGrid, children: [
      a.map((d) => /* @__PURE__ */ t(Tt, { task: d }, d.id)),
      e.map((d, b) => /* @__PURE__ */ t(Mt, { item: d, index: b }, d.id))
    ] })
  ] });
}
function ze() {
  const { t: e } = P(), { isGenerating: o, generate: l, selectedModelId: a, imageSize: s } = U(), [d, b] = x(""), v = N(null), g = d.trim().length > 0 && !o, w = () => {
    const k = d.trim();
    !k || o || (l(k), b(""));
  }, _ = (k) => {
    k.key === "Enter" && !k.shiftKey && (k.preventDefault(), w());
  };
  return /* @__PURE__ */ n("div", { style: i.quickInput, className: "studio-quick-input", children: [
    /* @__PURE__ */ n("div", { style: { flex: 1, display: "flex", flexDirection: "column", gap: 6 }, children: [
      /* @__PURE__ */ n("div", { style: be.meta, children: [
        a && /* @__PURE__ */ t("span", { style: be.metaBadge, children: a }),
        s && s !== "auto" && /* @__PURE__ */ t("span", { style: be.metaBadge, children: s }),
        /* @__PURE__ */ t("span", { style: be.metaHint, children: e("playground.studio_quick_hint", { defaultValue: "Enter 发送 · Shift+Enter 换行" }) })
      ] }),
      /* @__PURE__ */ t(
        "textarea",
        {
          ref: v,
          style: i.quickInputTextarea,
          value: d,
          onChange: (k) => b(k.target.value),
          onKeyDown: _,
          placeholder: e("playground.studio_quick_placeholder", { defaultValue: "快速生成一张图片..." }),
          rows: 1,
          disabled: o
        }
      )
    ] }),
    /* @__PURE__ */ t(
      "button",
      {
        type: "button",
        style: {
          ...i.quickInputSendBtn,
          ...g ? {} : be.sendBtnDisabled
        },
        className: g ? "studio-send-btn" : "",
        onClick: w,
        disabled: !g,
        title: e("playground.studio_generate", { defaultValue: "生成" }),
        children: /* @__PURE__ */ n("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round", children: [
          /* @__PURE__ */ t("path", { d: "M12 19V5" }),
          /* @__PURE__ */ t("path", { d: "M5 12l7-7 7 7" })
        ] })
      }
    )
  ] });
}
const be = {
  meta: {
    display: "flex",
    gap: 6,
    alignItems: "center",
    fontSize: 10,
    color: r("textTertiary")
  },
  metaBadge: {
    padding: "2px 7px",
    borderRadius: 5,
    background: r("bgHover"),
    fontSize: 10,
    color: r("textSecondary"),
    fontFamily: r("fontMono"),
    fontWeight: 600,
    letterSpacing: "0.02em"
  },
  metaHint: {
    opacity: 0.6,
    fontFamily: r("fontMono"),
    letterSpacing: "0.02em"
  },
  sendBtnDisabled: {
    background: r("bgHover"),
    color: r("textTertiary"),
    cursor: "not-allowed",
    boxShadow: "none",
    opacity: 0.4
  }
}, X = {
  layout: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    height: "100%",
    overflow: "hidden",
    background: r("bgDeep"),
    color: r("text"),
    fontFamily: r("fontSans")
  },
  topBar: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "10px 14px",
    background: r("glass"),
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderBottom: `1px solid ${r("glassBorder")}`,
    overflowX: "auto",
    flexShrink: 0
  },
  topBarPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "7px 14px",
    border: "none",
    borderRadius: 10,
    background: "transparent",
    color: r("textSecondary"),
    cursor: "pointer",
    fontSize: 12,
    fontFamily: "inherit",
    fontWeight: 500,
    whiteSpace: "nowrap",
    flexShrink: 0,
    transition: "all 0.18s"
  },
  topBarPillActive: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "7px 14px",
    border: "none",
    borderRadius: 10,
    background: r("primarySubtle"),
    color: r("text"),
    cursor: "pointer",
    fontSize: 12,
    fontFamily: "inherit",
    fontWeight: 700,
    whiteSpace: "nowrap",
    flexShrink: 0,
    transition: "all 0.18s"
  },
  topBarPillDisabled: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "7px 14px",
    border: "none",
    borderRadius: 10,
    background: "transparent",
    color: r("textTertiary"),
    cursor: "not-allowed",
    fontSize: 12,
    fontFamily: "inherit",
    whiteSpace: "nowrap",
    flexShrink: 0,
    opacity: 0.35
  },
  panelSection: {
    padding: "14px",
    borderBottom: `1px solid ${r("borderSubtle")}`,
    background: r("glass"),
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    overflowY: "auto",
    maxHeight: 340,
    flexShrink: 0
  },
  panelToggle: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 14px",
    background: r("bg"),
    borderBottom: `1px solid ${r("borderSubtle")}`,
    cursor: "pointer",
    border: "none",
    width: "100%",
    color: r("textSecondary"),
    fontSize: 11,
    fontFamily: r("fontMono"),
    fontWeight: 700,
    flexShrink: 0,
    letterSpacing: "0.06em",
    textTransform: "uppercase"
  },
  galleryArea: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    minHeight: 0,
    overflow: "hidden"
  }
}, ee = {
  mediaTypeGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    padding: "4px 12px 8px"
  },
  mediaTypeBtn: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    width: "100%",
    padding: "9px 12px",
    border: "none",
    borderRadius: 10,
    background: "transparent",
    color: r("textSecondary"),
    cursor: "pointer",
    fontSize: 13,
    fontFamily: "inherit",
    textAlign: "left",
    transition: "all 0.18s cubic-bezier(0.4, 0, 0.2, 1)"
  },
  mediaTypeBtnActive: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    width: "100%",
    padding: "9px 12px",
    border: "none",
    borderRadius: 10,
    background: r("primarySubtle"),
    color: r("text"),
    cursor: "pointer",
    fontSize: 13,
    fontFamily: "inherit",
    fontWeight: 600,
    textAlign: "left",
    transition: "all 0.18s cubic-bezier(0.4, 0, 0.2, 1)",
    boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${r("primary")} 15%, transparent)`
  },
  mediaTypeBtnDisabled: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    width: "100%",
    padding: "9px 12px",
    border: "none",
    borderRadius: 10,
    background: "transparent",
    color: r("textTertiary"),
    cursor: "not-allowed",
    fontSize: 13,
    fontFamily: "inherit",
    textAlign: "left",
    opacity: 0.35
  },
  comingSoonBadge: {
    marginLeft: "auto",
    fontSize: 9,
    fontWeight: 700,
    padding: "2px 7px",
    borderRadius: 5,
    background: r("bgHover"),
    color: r("textTertiary"),
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    fontFamily: r("fontMono")
  },
  sidebarScroll: {
    flex: 1,
    overflowY: "auto",
    padding: "0 4px 20px"
  }
};
function Dt() {
  const { t: e } = P(), { mediaType: o, setMediaType: l } = U(), [a, s] = x(() => typeof window < "u" && window.innerWidth <= 768), [d, b] = x(!0);
  return ke(() => {
    const v = window.matchMedia("(max-width: 768px)"), g = (w) => s(w.matches);
    return v.addEventListener("change", g), () => v.removeEventListener("change", g);
  }, []), a ? /* @__PURE__ */ n("div", { style: X.layout, children: [
    /* @__PURE__ */ t("style", { children: De }),
    /* @__PURE__ */ n("div", { style: X.topBar, children: [
      /* @__PURE__ */ n(
        "button",
        {
          type: "button",
          style: o === "image" ? X.topBarPillActive : X.topBarPill,
          onClick: () => l("image"),
          children: [
            /* @__PURE__ */ n("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
              /* @__PURE__ */ t("rect", { x: "3", y: "3", width: "18", height: "18", rx: "2" }),
              /* @__PURE__ */ t("circle", { cx: "8.5", cy: "8.5", r: "1.5" }),
              /* @__PURE__ */ t("path", { d: "M21 15l-5-5L5 21" })
            ] }),
            e("playground.studio_media_image", { defaultValue: "图片" })
          ]
        }
      ),
      /* @__PURE__ */ n("button", { type: "button", style: X.topBarPillDisabled, disabled: !0, children: [
        /* @__PURE__ */ n("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
          /* @__PURE__ */ t("polygon", { points: "23 7 16 12 23 17 23 7" }),
          /* @__PURE__ */ t("rect", { x: "1", y: "5", width: "15", height: "14", rx: "2" })
        ] }),
        e("playground.studio_media_video", { defaultValue: "视频" })
      ] }),
      /* @__PURE__ */ n("button", { type: "button", style: X.topBarPillDisabled, disabled: !0, children: [
        /* @__PURE__ */ n("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
          /* @__PURE__ */ t("path", { d: "M9 18V5l12-2v13" }),
          /* @__PURE__ */ t("circle", { cx: "6", cy: "18", r: "3" }),
          /* @__PURE__ */ t("circle", { cx: "18", cy: "16", r: "3" })
        ] }),
        e("playground.studio_media_music", { defaultValue: "音乐" })
      ] })
    ] }),
    /* @__PURE__ */ n(
      "button",
      {
        type: "button",
        style: X.panelToggle,
        onClick: () => b(!d),
        children: [
          /* @__PURE__ */ t("span", { children: e("playground.studio_settings", { defaultValue: "设置面板" }) }),
          /* @__PURE__ */ t("span", { style: { fontSize: 10, transition: "transform 0.25s", transform: d ? "rotate(180deg)" : "rotate(0deg)" }, children: "▾" })
        ]
      }
    ),
    d && /* @__PURE__ */ t("div", { style: X.panelSection, children: o === "image" && /* @__PURE__ */ t(Le, {}) }),
    /* @__PURE__ */ n("div", { style: X.galleryArea, children: [
      /* @__PURE__ */ t(Fe, {}),
      /* @__PURE__ */ t(ze, {})
    ] })
  ] }) : /* @__PURE__ */ n("div", { style: i.layout, children: [
    /* @__PURE__ */ t("style", { children: De }),
    /* @__PURE__ */ n("div", { style: { flex: 1, display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0, overflow: "hidden", position: "relative" }, children: [
      /* @__PURE__ */ t(Fe, {}),
      /* @__PURE__ */ t(ze, {})
    ] }),
    /* @__PURE__ */ n("div", { style: i.sidebar, className: "studio-sidebar", children: [
      /* @__PURE__ */ t("div", { style: i.sidebarHeader, children: e("playground.studio_title", { defaultValue: "创作中心" }) }),
      /* @__PURE__ */ n("div", { style: ee.sidebarScroll, className: "studio-sidebar", children: [
        /* @__PURE__ */ n("div", { style: ee.mediaTypeGroup, children: [
          /* @__PURE__ */ n(
            "button",
            {
              type: "button",
              style: o === "image" ? ee.mediaTypeBtnActive : ee.mediaTypeBtn,
              className: "studio-media-btn",
              onClick: () => l("image"),
              children: [
                /* @__PURE__ */ n("svg", { width: "15", height: "15", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
                  /* @__PURE__ */ t("rect", { x: "3", y: "3", width: "18", height: "18", rx: "2" }),
                  /* @__PURE__ */ t("circle", { cx: "8.5", cy: "8.5", r: "1.5" }),
                  /* @__PURE__ */ t("path", { d: "M21 15l-5-5L5 21" })
                ] }),
                e("playground.studio_media_image", { defaultValue: "图片" })
              ]
            }
          ),
          /* @__PURE__ */ n("button", { type: "button", style: ee.mediaTypeBtnDisabled, disabled: !0, children: [
            /* @__PURE__ */ n("svg", { width: "15", height: "15", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
              /* @__PURE__ */ t("polygon", { points: "23 7 16 12 23 17 23 7" }),
              /* @__PURE__ */ t("rect", { x: "1", y: "5", width: "15", height: "14", rx: "2" })
            ] }),
            e("playground.studio_media_video", { defaultValue: "视频" }),
            /* @__PURE__ */ t("span", { style: ee.comingSoonBadge, children: e("playground.studio_coming_soon", { defaultValue: "即将推出" }) })
          ] }),
          /* @__PURE__ */ n("button", { type: "button", style: ee.mediaTypeBtnDisabled, disabled: !0, children: [
            /* @__PURE__ */ n("svg", { width: "15", height: "15", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
              /* @__PURE__ */ t("path", { d: "M9 18V5l12-2v13" }),
              /* @__PURE__ */ t("circle", { cx: "6", cy: "18", r: "3" }),
              /* @__PURE__ */ t("circle", { cx: "18", cy: "16", r: "3" })
            ] }),
            e("playground.studio_media_music", { defaultValue: "音乐" }),
            /* @__PURE__ */ t("span", { style: ee.comingSoonBadge, children: e("playground.studio_coming_soon", { defaultValue: "即将推出" }) })
          ] })
        ] }),
        /* @__PURE__ */ t("div", { style: i.sectionDivider }),
        o === "image" && /* @__PURE__ */ t(Le, {})
      ] })
    ] })
  ] });
}
function Lt() {
  return /* @__PURE__ */ t($e, { children: /* @__PURE__ */ t(Dt, {}) });
}
function Ft() {
  return /* @__PURE__ */ t($e, { children: /* @__PURE__ */ t(Lt, {}) });
}
const At = {
  routes: [
    { path: "/studio", component: Ft }
  ]
};
export {
  At as default
};
