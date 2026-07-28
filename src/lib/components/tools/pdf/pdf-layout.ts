import type { jsPDF } from "jspdf";

export interface PdfLayoutConfig {
	pageWidth: number;
	pageHeight: number;
	margin: number;
	headerHeight: number;
	footerHeight: number;
	bottomPadding: number;
}

export interface PdfLayoutMetrics {
	contentWidth: number;
	contentTop: number;
	bottomLimit: number;
}

export interface PdfBrandingConfig {
	leftLogoPath: string;
	rightLogoPath: string;
	footerText: string;
}

export interface PdfBrandingAssets {
	leftLogo: HTMLImageElement | null;
	rightLogo: HTMLImageElement | null;
	footerText: string;
}

export const A4_PORTRAIT_LAYOUT: PdfLayoutConfig = {
	pageWidth: 210,
	pageHeight: 297,
	margin: 20,
	headerHeight: 18,
	footerHeight: 20,
	bottomPadding: 10
};

export const DEFAULT_PDF_BRANDING: PdfBrandingConfig = {
	leftLogoPath: "/images/Zeeland_logo.png",
	rightLogoPath: "/images/SOGELINK_Logo_Monogramme_Bleu.png",
	footerText: "Provincie Zeeland"
};

export function getPdfLayoutMetrics(layout: PdfLayoutConfig): PdfLayoutMetrics {
	return {
		contentWidth: layout.pageWidth - layout.margin * 2,
		contentTop: layout.margin + layout.headerHeight,
		bottomLimit: layout.pageHeight - layout.footerHeight - layout.bottomPadding
	};
}

export async function loadPdfBrandingAssets(
	branding: PdfBrandingConfig = DEFAULT_PDF_BRANDING
): Promise<PdfBrandingAssets> {
	const [leftLogo, rightLogo] = await Promise.all([
		preloadImage(branding.leftLogoPath),
		preloadImage(branding.rightLogoPath)
	]);

	return {
		leftLogo,
		rightLogo,
		footerText: branding.footerText
	};
}

export function drawPdfPageHeader(
	doc: jsPDF,
	layout: PdfLayoutConfig,
	assets: PdfBrandingAssets
): void {
	if (assets.leftLogo) {
		try {
			doc.addImage(assets.leftLogo, "PNG", layout.margin, layout.margin - 2, 30, 14);
		} catch {
			// Ignore logo failures and keep generating the PDF.
		}
	}

	if (assets.rightLogo) {
		try {
			doc.addImage(
				assets.rightLogo,
				"PNG",
				layout.pageWidth - layout.margin - 18,
				layout.margin,
				18,
				13
			);
		} catch {
			// Ignore logo failures and keep generating the PDF.
		}
	}

	doc.setDrawColor(200, 200, 200);
	doc.line(layout.margin, layout.margin + 14, layout.pageWidth - layout.margin, layout.margin + 14);
}

export function addPdfPageWithHeader(
	doc: jsPDF,
	layout: PdfLayoutConfig,
	assets: PdfBrandingAssets
): void {
	doc.addPage("a4", "portrait");
	drawPdfPageHeader(doc, layout, assets);
}

export function drawPdfFooters(
	doc: jsPDF,
	layout: PdfLayoutConfig,
	assets: PdfBrandingAssets,
	pageLabelPrefix: string
): void {
	const totalPages = doc.getNumberOfPages();
	for (let page = 1; page <= totalPages; page++) {
		doc.setPage(page);
		doc.setFontSize(8);
		doc.setFont("helvetica", "normal");
		doc.setTextColor(150, 150, 150);
		doc.text(assets.footerText, layout.margin, layout.pageHeight - 12);
		doc.text(
			`${pageLabelPrefix} ${page} / ${totalPages}`,
			layout.pageWidth - layout.margin - 25,
			layout.pageHeight - 12
		);
		doc.setDrawColor(200, 200, 200);
		doc.line(
			layout.margin,
			layout.pageHeight - 16,
			layout.pageWidth - layout.margin,
			layout.pageHeight - 16
		);
		doc.setTextColor(0, 0, 0);
	}
}

export function getPdfLineHeight(doc: jsPDF): number {
	return (doc.getLineHeightFactor() * doc.getFontSize()) / doc.internal.scaleFactor;
}

export function addPdfTextAtY(
	doc: jsPDF,
	text: string,
	x: number,
	y: number,
	maxWidth: number
): number {
	const lines = doc.splitTextToSize(text, maxWidth);
	doc.text(lines, x, y);
	return y + lines.length * getPdfLineHeight(doc);
}

export function addPdfTextSafe(
	doc: jsPDF,
	text: string,
	x: number,
	y: number,
	maxWidth: number,
	layout: PdfLayoutConfig,
	assets: PdfBrandingAssets
): number {
	const metrics = getPdfLayoutMetrics(layout);
	const lines: string[] = doc.splitTextToSize(text, maxWidth);
	const lineHeight = getPdfLineHeight(doc);

	for (const line of lines) {
		if (y + lineHeight > metrics.bottomLimit) {
			addPdfPageWithHeader(doc, layout, assets);
			y = metrics.contentTop;
		}
		doc.text(line, x, y);
		y += lineHeight;
	}

	return y;
}

export function ensurePdfSpace(
	doc: jsPDF,
	y: number,
	neededHeight: number,
	layout: PdfLayoutConfig,
	assets: PdfBrandingAssets
): number {
	const metrics = getPdfLayoutMetrics(layout);
	if (y + neededHeight > metrics.bottomLimit) {
		addPdfPageWithHeader(doc, layout, assets);
		return metrics.contentTop;
	}
	return y;
}

export function addPdfSeparatorLine(doc: jsPDF, y: number, layout: PdfLayoutConfig): number {
	doc.setDrawColor(200, 200, 200);
	doc.line(layout.margin, y, layout.pageWidth - layout.margin, y);
	return y + 5;
}

export function preloadImage(src: string): Promise<HTMLImageElement | null> {
	return new Promise((resolve) => {
		const image = new Image();
		image.onload = () => resolve(image);
		image.onerror = () => resolve(null);
		image.src = src;
	});
}

export function getImageDimensions(src: string): Promise<{ width: number; height: number }> {
	return new Promise((resolve) => {
		const image = new Image();
		image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
		image.onerror = () => resolve({ width: 160, height: 100 });
		image.src = src;
	});
}
