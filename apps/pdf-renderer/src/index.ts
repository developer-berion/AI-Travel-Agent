import type { PDFFont } from "pdf-lib";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import type { QuoteExportSnapshot } from "@alana/domain";

const PAGE_SIZE: [number, number] = [595.28, 841.89];
const PAGE_MARGIN = 48;
const BODY_SIZE = 11;
const BODY_LINE_HEIGHT = 15;
const SECTION_GAP = 10;
const TITLE_SIZE = 20;
const TITLE_LINE_HEIGHT = 24;
const MUTED = rgb(0.35, 0.35, 0.35);
const STRONG = rgb(0.08, 0.08, 0.08);

const formatCurrency = (amount: number, currency: string) =>
  new Intl.NumberFormat("en-US", {
    currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(amount);

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("en-US");

const sanitizeFileSegment = (value: string) => {
  const sanitized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return sanitized.length > 0 ? sanitized : "quote";
};

export const buildQuotePdfFileName = (snapshot: QuoteExportSnapshot) =>
  `${sanitizeFileSegment(snapshot.tripLabel || snapshot.title)}-v${snapshot.activeQuoteVersion}.pdf`;

const wrapText = (
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
) => {
  const normalized = text.trim();

  if (normalized.length === 0) {
    return [""];
  }

  const words = normalized.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const nextLine = currentLine.length > 0 ? `${currentLine} ${word}` : word;

    if (font.widthOfTextAtSize(nextLine, size) <= maxWidth) {
      currentLine = nextLine;
      continue;
    }

    if (currentLine.length > 0) {
      lines.push(currentLine);
    }

    currentLine = word;
  }

  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  return lines;
};

const createPageWriter = (
  pdf: PDFDocument,
  regularFont: PDFFont,
  boldFont: PDFFont,
) => {
  let page = pdf.addPage(PAGE_SIZE);
  let y = page.getHeight() - PAGE_MARGIN;
  const maxWidth = page.getWidth() - PAGE_MARGIN * 2;

  const ensureSpace = (height: number) => {
    if (y - height >= PAGE_MARGIN) {
      return;
    }

    page = pdf.addPage(PAGE_SIZE);
    y = page.getHeight() - PAGE_MARGIN;
  };

  const drawTextBlock = (
    text: string,
    options?: {
      color?: ReturnType<typeof rgb>;
      font?: PDFFont;
      lineHeight?: number;
      size?: number;
    },
  ) => {
    const font = options?.font ?? regularFont;
    const size = options?.size ?? BODY_SIZE;
    const lineHeight = options?.lineHeight ?? BODY_LINE_HEIGHT;
    const color = options?.color ?? STRONG;
    const lines = wrapText(text, font, size, maxWidth);

    for (const line of lines) {
      ensureSpace(lineHeight);
      page.drawText(line, {
        color,
        font,
        size,
        x: PAGE_MARGIN,
        y,
      });
      y -= lineHeight;
    }
  };

  const drawSectionTitle = (text: string) => {
    ensureSpace(TITLE_LINE_HEIGHT + SECTION_GAP);
    page.drawText(text, {
      color: STRONG,
      font: boldFont,
      size: 13,
      x: PAGE_MARGIN,
      y,
    });
    y -= TITLE_LINE_HEIGHT;
  };

  const addGap = (height = SECTION_GAP) => {
    ensureSpace(height);
    y -= height;
  };

  return {
    addGap,
    drawSectionTitle,
    drawTextBlock,
  };
};

export const renderQuotePdf = async (
  snapshot: QuoteExportSnapshot,
): Promise<Uint8Array> => {
  const pdf = await PDFDocument.create();
  const regularFont = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const writer = createPageWriter(pdf, regularFont, boldFont);
  const totalLabel = formatCurrency(
    snapshot.bundleReview.totalPrice,
    snapshot.bundleReview.currency,
  );

  writer.drawTextBlock(snapshot.title, {
    font: boldFont,
    lineHeight: TITLE_LINE_HEIGHT,
    size: TITLE_SIZE,
  });
  writer.drawTextBlock(snapshot.summary, {
    color: MUTED,
  });
  writer.addGap();

  writer.drawSectionTitle("Quote Summary");
  writer.drawTextBlock(`Agency: ${snapshot.agencyName}`);
  writer.drawTextBlock(`Trip: ${snapshot.tripLabel}`);
  if (snapshot.tripStartDate) {
    writer.drawTextBlock(`Trip start date: ${snapshot.tripStartDate}`);
  }
  writer.drawTextBlock(`Active quote version: v${snapshot.activeQuoteVersion}`);
  writer.drawTextBlock(`Generated at: ${formatDateTime(snapshot.createdAt)}`);
  writer.drawTextBlock(`Commercial status: ${snapshot.commercialStatus}`);
  writer.drawTextBlock(`Recommendation mode: ${snapshot.recommendationMode}`);
  writer.drawTextBlock(`Total bundle: ${totalLabel}`);
  writer.addGap();

  writer.drawSectionTitle("Operator Summary");
  writer.drawTextBlock(snapshot.confirmedStateSummary);
  writer.addGap();

  writer.drawSectionTitle("Selected Services");
  for (const item of snapshot.selectedItems) {
    writer.drawTextBlock(`${item.serviceLine.toUpperCase()}  ${item.title}`, {
      font: boldFont,
    });
    writer.drawTextBlock(
      `Price: ${formatCurrency(item.headlinePrice, item.currency)}`,
    );
    writer.drawTextBlock(`Why it fits: ${item.whyItFits}`);
    writer.drawTextBlock(`Tradeoff: ${item.tradeoff}`);
    if (item.caveat) {
      writer.drawTextBlock(`Caveat: ${item.caveat}`, {
        color: MUTED,
      });
    }
    writer.addGap();
  }

  if (snapshot.bundleReview.warnings.length > 0) {
    writer.drawSectionTitle("Warnings");
    for (const warning of snapshot.bundleReview.warnings) {
      writer.drawTextBlock(`- ${warning}`, {
        color: MUTED,
      });
    }
    writer.addGap();
  }

  return pdf.save();
};
