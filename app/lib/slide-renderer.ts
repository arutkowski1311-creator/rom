// Client-side canvas rendering for carousel slides + story frames.
// Output: PNG blobs the guide can download individually or as a ZIP pack.
// Mirrors the visual language of the branded social card in MarketingTab.

export type SlideFormat = "square" | "portrait"; // 1080x1080 or 1080x1920

export interface SlideInput {
  slideNumber?: number;
  totalSlides?: number;
  role?: string; // hook, context, insight, story, cta — colors the corner badge
  headline: string;
  body?: string;
  visualDirection?: string;
  photoUrl?: string;
}

export interface BrandInfo {
  guideName: string;
  guideLocation: string;
  guideActivity: string;
  primaryColor?: string; // hex
  inkColor?: string;
}

export interface RenderOptions {
  format: SlideFormat;
  brand: BrandInfo;
}

const GOLD = "#c9973a";
const INK = "#0d1117";
const PAPER = "#faf9f6";

export const DIMENSIONS = {
  square: { w: 1080, h: 1080 },
  portrait: { w: 1080, h: 1920 },
} as const;

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let cur = words[0] || "";
  for (let i = 1; i < words.length; i++) {
    const test = cur + " " + words[i];
    if (ctx.measureText(test).width <= maxWidth) cur = test;
    else { lines.push(cur); cur = words[i]; }
  }
  lines.push(cur);
  return lines;
}

async function loadImage(url: string): Promise<HTMLImageElement | null> {
  if (!url) return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number, photo: HTMLImageElement | null, primary: string) {
  // Default gradient bg
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, "#0b1812");
  grad.addColorStop(0.5, "#081018");
  grad.addColorStop(1, "#120e04");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  if (photo) {
    const scale = Math.max(w / photo.width, h / photo.height);
    ctx.drawImage(photo, (w - photo.width * scale) / 2, (h - photo.height * scale) / 2, photo.width * scale, photo.height * scale);
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(0, 0, w, h);
  }

  // Bottom darken gradient for text legibility
  const textGrad = ctx.createLinearGradient(0, h * 0.35, 0, h);
  textGrad.addColorStop(0, "rgba(0,0,0,0)");
  textGrad.addColorStop(1, "rgba(0,0,0,0.85)");
  ctx.fillStyle = textGrad;
  ctx.fillRect(0, 0, w, h);

  // Top vignette for badge legibility
  const topGrad = ctx.createLinearGradient(0, 0, 0, h * 0.25);
  topGrad.addColorStop(0, "rgba(0,0,0,0.5)");
  topGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, w, h * 0.25);
}

function drawSlideBadge(ctx: CanvasRenderingContext2D, w: number, _h: number, slideNum: number | undefined, total: number | undefined, role: string | undefined, primary: string) {
  if (!slideNum) return;
  const text = total ? `${slideNum} / ${total}` : `${slideNum}`;
  ctx.font = `bold 24px -apple-system, "Helvetica Neue", sans-serif`;
  const textWidth = ctx.measureText(text).width;
  const padX = 18;
  const bw = textWidth + padX * 2;
  const bh = 44;
  const bx = w - bw - 50;
  const by = 50;
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  roundRect(ctx, bx, by, bw, bh, 22);
  ctx.fill();
  ctx.fillStyle = primary;
  ctx.fillText(text, bx + padX, by + 30);

  if (role) {
    ctx.font = `bold 14px -apple-system, sans-serif`;
    const roleText = role.toUpperCase();
    const rw = ctx.measureText(roleText).width + 24;
    const rx = w - rw - 50;
    const ry = by + bh + 8;
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    roundRect(ctx, rx, ry, rw, 28, 14);
    ctx.fill();
    ctx.fillStyle = primary;
    ctx.fillText(roleText, rx + 12, ry + 19);
  }
}

function drawActivityBadge(ctx: CanvasRenderingContext2D, _w: number, _h: number, activity: string, primary: string) {
  if (!activity) return;
  ctx.font = `bold 16px -apple-system, sans-serif`;
  const text = activity.toUpperCase();
  const tw = ctx.measureText(text).width + 28;
  const x = 50;
  const y = 50;
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  roundRect(ctx, x, y, tw, 36, 8);
  ctx.fill();
  ctx.fillStyle = primary;
  ctx.fillText(text, x + 14, y + 24);
}

function drawTextStack(ctx: CanvasRenderingContext2D, w: number, h: number, headline: string, body: string | undefined, format: SlideFormat, primary: string) {
  const mx = format === "portrait" ? 80 : 70;
  const headSize = format === "portrait" ? 80 : 64;
  const bodySize = format === "portrait" ? 32 : 28;
  const headLineH = headSize * 1.15;
  const bodyLineH = bodySize * 1.45;

  ctx.fillStyle = "#fff";
  ctx.font = `bold ${headSize}px Georgia, "Times New Roman", serif`;
  const headLines = wrapText(ctx, headline, w - mx * 2);

  ctx.font = `${bodySize}px -apple-system, "Helvetica Neue", sans-serif`;
  const bodyLines = body ? wrapText(ctx, body, w - mx * 2) : [];

  const totalHeight = headLines.length * headLineH + (bodyLines.length ? 36 + bodyLines.length * bodyLineH : 0);
  const barOffset = format === "portrait" ? 180 : 110;
  const startY = h - barOffset - totalHeight;

  // Gold accent bar
  ctx.fillStyle = primary;
  ctx.fillRect(mx, startY - 28, 60, 4);

  // Headline (text shadow for legibility on photos)
  ctx.shadowColor = "rgba(0,0,0,0.85)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = "#fff";
  ctx.font = `bold ${headSize}px Georgia, "Times New Roman", serif`;
  let y = startY + headSize;
  for (const line of headLines) {
    ctx.fillText(line, mx, y);
    y += headLineH;
  }

  if (bodyLines.length) {
    y += 12;
    ctx.font = `${bodySize}px -apple-system, "Helvetica Neue", sans-serif`;
    ctx.fillStyle = "rgba(232,224,208,0.92)";
    for (const line of bodyLines) {
      ctx.fillText(line, mx, y);
      y += bodyLineH;
    }
  }

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}

function drawFooterBar(ctx: CanvasRenderingContext2D, w: number, h: number, brand: BrandInfo, format: SlideFormat, primary: string) {
  const barHeight = format === "portrait" ? 90 : 80;
  const by = h - barHeight;
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillRect(0, by, w, barHeight);
  ctx.fillStyle = primary;
  ctx.fillRect(0, by, w, 3);

  const mx = 50;
  const baseY = by + Math.round(barHeight / 2) + 10;

  ctx.fillStyle = "rgba(232,224,208,0.92)";
  ctx.font = `500 ${format === "portrait" ? 28 : 22}px -apple-system, sans-serif`;
  const label = `${brand.guideName}  ·  ${brand.guideLocation}`;
  ctx.fillText(label, mx, baseY);

  ctx.textAlign = "right";
  ctx.font = `500 ${format === "portrait" ? 50 : 42}px Georgia, serif`;
  ctx.fillStyle = primary;
  ctx.fillText("RŌM", w - mx, baseY + 4);
  ctx.textAlign = "left";
}

export async function renderSlideToBlob(slide: SlideInput, opts: RenderOptions): Promise<Blob> {
  const dims = DIMENSIONS[opts.format];
  const canvas = document.createElement("canvas");
  canvas.width = dims.w;
  canvas.height = dims.h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No canvas context");

  const photo = slide.photoUrl ? await loadImage(slide.photoUrl) : null;
  const primary = opts.brand.primaryColor || GOLD;

  drawBackground(ctx, dims.w, dims.h, photo, primary);
  drawActivityBadge(ctx, dims.w, dims.h, opts.brand.guideActivity, primary);
  drawSlideBadge(ctx, dims.w, dims.h, slide.slideNumber, slide.totalSlides, slide.role, primary);
  drawTextStack(ctx, dims.w, dims.h, slide.headline || "", slide.body, opts.format, primary);
  drawFooterBar(ctx, dims.w, dims.h, opts.brand, opts.format, primary);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) { reject(new Error("Canvas toBlob failed")); return; }
      resolve(blob);
    }, "image/png");
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Render an array of slides and bundle them into a ZIP. Includes a caption.txt
// + hashtags.txt for one-stop posting.
export async function renderPackToZip(
  slides: SlideInput[],
  opts: RenderOptions,
  extras: { caption?: string; hashtags?: string[]; tip?: string; filenamePrefix?: string },
): Promise<Blob> {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const prefix = extras.filenamePrefix || "rom-pack";

  for (let i = 0; i < slides.length; i++) {
    const slide = { ...slides[i], slideNumber: slides[i].slideNumber || i + 1, totalSlides: slides.length };
    const blob = await renderSlideToBlob(slide, opts);
    const num = String(i + 1).padStart(2, "0");
    zip.file(`${prefix}-slide-${num}.png`, blob);
  }

  const lines: string[] = [];
  if (extras.caption) {
    lines.push("CAPTION");
    lines.push("=======");
    lines.push(extras.caption);
    lines.push("");
  }
  if (extras.hashtags?.length) {
    lines.push("HASHTAGS");
    lines.push("========");
    lines.push(extras.hashtags.map((h) => `#${h.replace(/^#+/, "")}`).join(" "));
    lines.push("");
  }
  if (extras.tip) {
    lines.push("FILMING / POSTING TIP");
    lines.push("=====================");
    lines.push(extras.tip);
    lines.push("");
  }
  if (lines.length) zip.file(`${prefix}-caption.txt`, lines.join("\n"));

  return zip.generateAsync({ type: "blob" });
}
