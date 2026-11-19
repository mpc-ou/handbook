/**
 * Chuẩn hóa HTML dán từ Microsoft Word (desktop) trước khi đưa cho BlockNote.
 *
 * Word không xuất <ul>/<ol>: mỗi mục danh sách là một <p> có `mso-list:lX levelN`
 * kèm ký tự đầu dòng giả trong <span style="mso-list:Ignore">. Nếu không xử lý,
 * danh sách sẽ thành các đoạn văn bắt đầu bằng "·". Ảnh trong Word chỉ có đường dẫn
 * file:/// trên máy người dán nên không dùng được; bỏ đi và báo số lượng.
 */

const WORD_MARKERS = /urn:schemas-microsoft-com:office|class="?Mso|mso-list:/i;
const ORDERED_MARKER = /^\(?([0-9]+|[a-zA-Z]|[ivxlcdmIVXLCDM]+)[.)]/;
const BULLET_MARKER = /^[·•▪◦o§\-–]\s*/;

export function isWordHtml(html: string): boolean {
  return WORD_MARKERS.test(html);
}

interface ListParagraph {
  el: HTMLElement;
  level: number;
  ordered: boolean;
}

function readListParagraph(el: Element): ListParagraph | null {
  if (el.tagName !== "P") return null;
  const style = el.getAttribute("style") ?? "";
  const match = /mso-list:\s*l\d+\s+level(\d+)/i.exec(style);
  if (!match) return null;

  let marker = "";
  el.querySelectorAll("span").forEach((span) => {
    if (/mso-list:\s*ignore/i.test(span.getAttribute("style") ?? "")) {
      marker += span.textContent ?? "";
      span.remove();
    }
  });
  marker = marker.replace(/ /g, " ").trim();

  // Một số bản Word không bọc ký tự đầu dòng trong span Ignore
  if (!marker) {
    const first = el.firstChild;
    if (first?.nodeType === Node.TEXT_NODE && first.textContent) {
      const raw = first.textContent.replace(/ /g, " ");
      const ordered = ORDERED_MARKER.exec(raw.trim());
      if (ordered) {
        marker = ordered[0];
        first.textContent = raw.trim().slice(ordered[0].length).trimStart();
      } else if (BULLET_MARKER.test(raw.trim())) {
        marker = "•";
        first.textContent = raw.trim().replace(BULLET_MARKER, "");
      }
    }
  }

  return {
    el: el as HTMLElement,
    level: Math.max(1, Number(match[1])),
    ordered: ORDERED_MARKER.test(marker),
  };
}

function nextElementSkippingWhitespace(node: Element): Element | null {
  let next = node.nextSibling;
  while (next && next.nodeType === Node.TEXT_NODE && !next.textContent?.trim()) {
    next = next.nextSibling;
  }
  return next && next.nodeType === Node.ELEMENT_NODE ? (next as Element) : null;
}

/** Thay một dãy <p> danh sách liền nhau bằng <ul>/<ol> lồng theo level. */
function rebuildLists(doc: Document) {
  const starts = Array.from(doc.body.querySelectorAll("p")).filter((p) =>
    /mso-list:\s*l\d+\s+level/i.test(p.getAttribute("style") ?? "")
  );
  const consumed = new Set<Element>();

  for (const start of starts) {
    if (consumed.has(start)) continue;

    const run: ListParagraph[] = [];
    let cursor: Element | null = start;
    while (cursor) {
      const item = readListParagraph(cursor);
      if (!item) break;
      run.push(item);
      consumed.add(cursor);
      cursor = nextElementSkippingWhitespace(cursor);
    }
    if (run.length === 0) continue;

    const anchor = doc.createElement("div");
    run[0].el.before(anchor);

    const stack: { level: number; list: HTMLElement; lastItem: HTMLElement | null }[] = [];
    const roots: HTMLElement[] = [];

    for (const item of run) {
      while (stack.length && stack[stack.length - 1].level > item.level) stack.pop();
      let top = stack[stack.length - 1];

      if (!top || top.level < item.level) {
        const list = doc.createElement(item.ordered ? "ol" : "ul");
        if (top?.lastItem) top.lastItem.appendChild(list);
        else roots.push(list);
        top = { level: item.level, list, lastItem: null };
        stack.push(top);
      }

      const li = doc.createElement("li");
      li.innerHTML = item.el.innerHTML;
      top.list.appendChild(li);
      top.lastItem = li;
      item.el.remove();
    }

    anchor.replaceWith(...roots);
  }
}

export function cleanWordHtml(html: string): { html: string; droppedImages: number } {
  const doc = new DOMParser().parseFromString(html, "text/html");

  // Thẻ riêng của Office (<o:p>, <v:shape>, …)
  doc.body.querySelectorAll("*").forEach((el) => {
    if (el.tagName.includes(":")) el.replaceWith(...Array.from(el.childNodes));
  });

  let droppedImages = 0;
  doc.body.querySelectorAll("img").forEach((img) => {
    const src = img.getAttribute("src") ?? "";
    if (!/^https?:\/\//i.test(src)) {
      droppedImages++;
      const parent = img.parentElement;
      img.remove();
      if (parent?.tagName === "P" && !parent.textContent?.trim() && !parent.querySelector("img")) {
        parent.remove();
      }
    }
  });

  cleanNumberedHeadings(doc);
  rebuildLists(doc);
  promoteHeadings(doc);

  // Bỏ style/class của Word (màu, font, lề rác); chỉ giữ căn lề
  doc.body.querySelectorAll("*").forEach((el) => {
    const align = readAlignment(el);
    el.removeAttribute("style");
    el.removeAttribute("class");
    el.removeAttribute("lang");
    el.removeAttribute("align");
    if (align) (el as HTMLElement).style.textAlign = align;
  });

  return { html: doc.body.innerHTML, droppedImages };
}

const BLOCK_TAGS = new Set(["P", "H1", "H2", "H3", "H4", "H5", "H6", "LI", "TD", "TH"]);

function readAlignment(el: Element): "center" | "right" | "justify" | null {
  if (!BLOCK_TAGS.has(el.tagName)) return null;
  const fromStyle = /text-align:\s*(center|right|justify)/i.exec(el.getAttribute("style") ?? "")?.[1];
  const value = (fromStyle ?? el.getAttribute("align") ?? "").toLowerCase();
  return value === "center" || value === "right" || value === "justify" ? value : null;
}

/**
 * Tiêu đề đánh số tự động ("I.", "1.1") cũng dùng mso-list: giữ số, bỏ dãy
 * khoảng trắng canh tab của Word.
 */
function cleanNumberedHeadings(doc: Document) {
  doc.body.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((h) => {
    h.querySelectorAll("span").forEach((span) => {
      if (/mso-list:\s*ignore/i.test(span.getAttribute("style") ?? "")) {
        const marker = (span.textContent ?? "").replace(/ /g, " ").trim();
        span.replaceWith(marker ? `${marker} ` : "");
      }
    });
  });
}

/** Cỡ chữ lớn nhất (pt) khai báo trong đoạn, nếu có. */
function maxFontSize(el: Element): number {
  let max = 0;
  [el, ...Array.from(el.querySelectorAll("[style]"))].forEach((node) => {
    const m = /font-size:\s*([\d.]+)pt/i.exec(node.getAttribute("style") ?? "");
    if (m) max = Math.max(max, Number(m[1]));
  });
  return max;
}

function isAllBold(el: Element): boolean {
  const total = (el.textContent ?? "").replace(/\s+/g, "");
  if (!total) return false;
  const bold = Array.from(el.querySelectorAll("b, strong"))
    .filter((b) => !b.parentElement?.closest("b, strong")) // chỉ lấy thẻ đậm ngoài cùng
    .map((b) => b.textContent ?? "")
    .join("")
    .replace(/\s+/g, "");
  return bold.length >= total.length;
}

/**
 * Văn bản Word hay "làm tiêu đề" bằng chữ đậm cỡ lớn thay vì style Heading.
 * Đoạn ngắn, toàn chữ đậm, cỡ ≥ 14pt → tiêu đề (≥ 18pt: H1, còn lại: H2).
 * Kiểu Title/Subtitle của Word → H1/H2.
 */
function promoteHeadings(doc: Document) {
  doc.body.querySelectorAll("p").forEach((p) => {
    let level = 0;
    if (p.classList.contains("MsoTitle")) level = 1;
    else if (p.classList.contains("MsoSubtitle")) level = 2;
    else if ((p.textContent ?? "").trim().length <= 150 && isAllBold(p)) {
      const size = maxFontSize(p);
      level = size >= 18 ? 1 : size >= 14 ? 2 : 0;
    }
    if (!level) return;
    const h = doc.createElement(`h${level}`);
    for (const attr of ["style", "align"]) {
      const v = p.getAttribute(attr);
      if (v) h.setAttribute(attr, v);
    }
    h.innerHTML = p.innerHTML;
    p.replaceWith(h);
  });
}
