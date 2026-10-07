const XHTML_NS = "http://www.w3.org/1999/xhtml";

const SVG_TEXT_PROPS = [
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "letter-spacing",
  "text-anchor",
  "text-decoration",
  "white-space",
];

const stripQuotes = (value: string) => value.trim().replace(/^["']|["']$/g, "");

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

/**
 * Copies the resolved (computed) styles from the live board onto the clone,
 * so the exported file does not depend on page CSS, Tailwind classes or
 * CSS variables. Returns every font family used by the board.
 */
export const inlineComputedStyles = (
  original: SVGGElement,
  clone: SVGGElement,
): Set<string> => {
  const families = new Set<string>();
  const src: Element[] = [
    original,
    ...Array.from(original.querySelectorAll("*")),
  ];
  const dst: Element[] = [clone, ...Array.from(clone.querySelectorAll("*"))];
  const count = Math.min(src.length, dst.length);

  for (let i = 0; i < count; i++) {
    const s = src[i];
    const d = dst[i] as HTMLElement | SVGElement;
    if (!("style" in d)) continue;

    const cs = getComputedStyle(s);

    if (s.namespaceURI === XHTML_NS) {
      for (let j = 0; j < cs.length; j++) {
        const name = cs.item(j);
        d.style.setProperty(
          name,
          cs.getPropertyValue(name),
          cs.getPropertyPriority(name),
        );
      }
    } else {
      for (const name of SVG_TEXT_PROPS) {
        const value = cs.getPropertyValue(name);
        if (value) d.style.setProperty(name, value);
      }
    }

    cs.getPropertyValue("font-family")
      .split(",")
      .map(stripQuotes)
      .filter(Boolean)
      .forEach((family) => families.add(family));
  }

  return families;
};

/**
 * Finds the @font-face rules for the given families, downloads the font
 * files and returns CSS with the fonts embedded as base64 data URLs.
 */
export const buildEmbeddedFontCss = async (
  families: Set<string>,
): Promise<string> => {
  const jobs: Promise<string | null>[] = [];
  const seen = new Set<string>();

  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue; // cross-origin stylesheet, cannot be read
    }

    const base = sheet.href ?? window.location.href;

    for (const rule of Array.from(rules)) {
      if (!(rule instanceof CSSFontFaceRule)) continue;

      const familyRaw = rule.style.getPropertyValue("font-family");
      if (!families.has(stripQuotes(familyRaw))) continue;

      const match = rule.style
        .getPropertyValue("src")
        .match(/url\(["']?([^"')]+)["']?\)/);
      if (!match) continue;

      const url = new URL(match[1], base).href;
      const style = rule.style.getPropertyValue("font-style");
      const weight = rule.style.getPropertyValue("font-weight");
      const range = rule.style.getPropertyValue("unicode-range");
      const key = `${familyRaw}|${weight}|${style}|${url}`;
      if (seen.has(key)) continue;
      seen.add(key);

      jobs.push(
        (async () => {
          try {
            const res = await fetch(url);
            if (!res.ok) return null;
            const dataUrl = await blobToDataUrl(await res.blob());
            const format = url.includes(".woff2") ? ' format("woff2")' : "";
            return `@font-face{font-family:${familyRaw};${
              style ? `font-style:${style};` : ""
            }${weight ? `font-weight:${weight};` : ""}${
              range ? `unicode-range:${range};` : ""
            }src:url(${dataUrl})${format};}`;
          } catch {
            return null;
          }
        })(),
      );
    }
  }

  const results = await Promise.all(jobs);
  return results.filter((css): css is string => Boolean(css)).join("\n");
};
