import { jsPDF } from "jspdf";
import {
	A4_PORTRAIT_LAYOUT,
	DEFAULT_PDF_BRANDING,
	addPdfPageWithHeader,
	addPdfTextAtY,
	drawPdfFooters,
	drawPdfPageHeader,
	ensurePdfSpace,
	getPdfLayoutMetrics,
	loadPdfBrandingAssets
} from "$lib/components/tools/pdf/pdf-layout";

import type { ZonalStatisticsSettings } from "./zonal-config";
import { columnHasTooltip } from "./zonal-config";
import type { Rgb } from "./zonal-style";
import type { ZonalStatisticsExportRow } from "./zonal-statistics-controller";

interface PdfColumn {
	header: string;
	width: number;
	get: (r: ZonalStatisticsExportRow) => string;
	colored?: boolean;
}

interface ZonalPdfLabels {
	exportCreatedAt: string;
	exportLayer: string;
	exportDescription: string;
	exportZone: string;
	exportVisibleLayerLabel: string;
	exportPage: string;
}

export interface ExportZonalPdfOptions {
	rows: Array<ZonalStatisticsExportRow>;
	settings: ZonalStatisticsSettings;
	title: string;
	fileNamePrefix: string;
	timestamp: string;
	currentLocale?: string;
	mapCanvas?: HTMLCanvasElement;
	visibleLayerTitle?: string;
	labels: ZonalPdfLabels;
	columnLabel: (index: number) => string;
	pdfColor: (value: string) => { fill: Rgb; text: Rgb } | undefined;
}

const layout = A4_PORTRAIT_LAYOUT;
const metrics = getPdfLayoutMetrics(layout);
const PDF_COVER_IMAGE_MAX_HEIGHT = 200;
const MISSING_VALUE_PLACEHOLDER = "–";
const EMPTY_BRANDING_ASSETS = { leftLogo: null, footerText: "" };

function displayPdfValue(value: string | undefined): string {
	if (value === undefined) return MISSING_VALUE_PLACEHOLDER;
	return value.trim().length > 0 ? value : MISSING_VALUE_PLACEHOLDER;
}

function addPdfHeaderBlock(
	doc: jsPDF,
	startY: number,
	title: string,
	labels: ZonalPdfLabels,
	currentLocale?: string
): number {
	doc.setFont("helvetica", "bold");
	doc.setFontSize(14);
	doc.text(title, layout.margin, startY);

	doc.setFont("helvetica", "normal");
	doc.setFontSize(9);
	doc.text(
		`${labels.exportCreatedAt} ${new Date().toLocaleString(currentLocale)}`,
		layout.margin,
		startY + 6
	);
	return startY + 12;
}

function measurePdfTextWidth(doc: jsPDF, text: string): number {
	return text ? doc.getTextWidth(text) : 0;
}

function minimumPdfColumnWidth(doc: jsPDF): number {
	return measurePdfTextWidth(doc, "0000000") + 4;
}

function fitPdfColumnWidths(
	preferredWidths: Array<number>,
	availableWidth: number,
	minimumWidth: number
): Array<number> {
	const floorWidths = preferredWidths.map((width) => Math.max(width, minimumWidth));
	const totalFloor = floorWidths.reduce((sum, width) => sum + width, 0);
	if (totalFloor <= availableWidth) return floorWidths;

	const minimumTotal = minimumWidth * floorWidths.length;
	if (availableWidth <= minimumTotal) return floorWidths;

	const flexibleWidths = floorWidths.map((width) => width - minimumWidth);
	const flexibleTotal = flexibleWidths.reduce((sum, width) => sum + width, 0);
	if (flexibleTotal <= 0) return floorWidths;

	const remainingWidth = availableWidth - minimumTotal;
	const scale = remainingWidth / flexibleTotal;
	return floorWidths.map((width) => minimumWidth + (width - minimumWidth) * scale);
}

function buildPdfColumns(
	doc: jsPDF,
	rows: Array<ZonalStatisticsExportRow>,
	settings: ZonalStatisticsSettings,
	labels: ZonalPdfLabels,
	columnLabel: (index: number) => string
): Array<PdfColumn> {
	const availableWidth = metrics.contentWidth;
	const minimumWidth = minimumPdfColumnWidth(doc);
	const preferredWidths: Array<number> = [];
	const columns: Array<PdfColumn> = [
		{ header: labels.exportLayer, width: 0, get: (r) => r.layerTitle }
	];

	const layerHeaderWidth = measurePdfTextWidth(doc, labels.exportLayer) + 4;
	const layerContentWidth = rows.reduce(
		(max, row) => Math.max(max, measurePdfTextWidth(doc, row.layerTitle)),
		0
	);
	preferredWidths.push(Math.max(minimumWidth, layerHeaderWidth, layerContentWidth + 4));

	for (let i = 0; i < settings.columns.length; i++) {
		const column = settings.columns[i];
		const valueHeader = columnLabel(i);
		const valueContentWidth = rows.reduce(
			(max, row) => Math.max(max, measurePdfTextWidth(doc, displayPdfValue(row.values[i]))),
			0
		);
		preferredWidths.push(
			Math.max(minimumWidth, measurePdfTextWidth(doc, valueHeader) + 4, valueContentWidth + 4)
		);

		columns.push({
			header: valueHeader,
			width: 0,
			get: (r) => displayPdfValue(r.values[i]),
			colored: column.styled
		});

		if (columnHasTooltip(settings, column)) {
			const tooltipHeader = `${valueHeader} - ${labels.exportDescription}`;
			const tooltipContentWidth = rows.reduce(
				(max, row) => Math.max(max, measurePdfTextWidth(doc, displayPdfValue(row.tooltips[i]))),
				0
			);
			preferredWidths.push(
				Math.max(minimumWidth, measurePdfTextWidth(doc, tooltipHeader) + 4, tooltipContentWidth + 4)
			);
			columns.push({
				header: tooltipHeader,
				width: 0,
				get: (r) => displayPdfValue(r.tooltips[i])
			});
		}
	}

	const fittedWidths = fitPdfColumnWidths(preferredWidths, availableWidth, minimumWidth);
	let widthIndex = 0;
	for (const column of columns) {
		column.width = fittedWidths[widthIndex++] ?? column.width;
	}

	return columns;
}

function drawPdfTableHeader(doc: jsPDF, x: number, y: number, columns: Array<PdfColumn>): number {
	const headerLineHeight = 4;
	const headerHeight =
		Math.max(
			...columns.map((col) =>
				Math.max(1, doc.splitTextToSize(col.header, Math.max(1, col.width - 3)).length)
			)
		) *
			headerLineHeight +
		2;

	doc.setFont("helvetica", "bold");
	doc.setFontSize(9);

	let cursorX = x;
	for (const col of columns) {
		doc.rect(cursorX, y, col.width, headerHeight);
		doc.text(doc.splitTextToSize(col.header, Math.max(1, col.width - 3)), cursorX + 1.5, y + 4);
		cursorX += col.width;
	}

	doc.setFont("helvetica", "normal");
	return y + headerHeight;
}

function drawPdfZoneHeader(
	doc: jsPDF,
	zoneCode: string,
	y: number,
	labels: ZonalPdfLabels
): number {
	const height = 8;
	doc.setFillColor(240, 244, 248);
	doc.rect(layout.margin, y, metrics.contentWidth, height, "F");
	doc.setDrawColor(200, 200, 200);
	doc.rect(layout.margin, y, metrics.contentWidth, height);
	doc.setFont("helvetica", "bold");
	doc.setFontSize(10);
	doc.text(`${labels.exportZone}: ${zoneCode}`, layout.margin + 2, y + 5.25);
	doc.setFont("helvetica", "normal");
	doc.setFontSize(9);
	return y + height;
}

function drawPdfRow(
	doc: jsPDF,
	row: ZonalStatisticsExportRow,
	x: number,
	y: number,
	columns: Array<PdfColumn>,
	lineHeight: number,
	pdfColor: (value: string) => { fill: Rgb; text: Rgb } | undefined
): number {
	const wrapped = columns.map((col) =>
		doc.splitTextToSize(col.get(row) || "", Math.max(1, col.width - 3))
	);
	const rowHeight = Math.max(...wrapped.map((lines) => Math.max(1, lines.length))) * lineHeight + 2;

	let cursorX = x;
	columns.forEach((col, i) => {
		const color = col.colored ? pdfColor(col.get(row)) : undefined;
		if (color) {
			doc.setFillColor(color.fill[0], color.fill[1], color.fill[2]);
			doc.rect(cursorX, y, col.width, rowHeight, "FD");
			doc.setTextColor(color.text[0], color.text[1], color.text[2]);
		} else {
			doc.rect(cursorX, y, col.width, rowHeight);
		}
		doc.text(wrapped[i], cursorX + 1.5, y + 4);
		if (color) doc.setTextColor(0, 0, 0);
		cursorX += col.width;
	});

	return y + rowHeight;
}

function addMapImageToCover(
	doc: jsPDF,
	mapCanvas: HTMLCanvasElement,
	y: number,
	labels: ZonalPdfLabels
): number {
	if (mapCanvas.width <= 0 || mapCanvas.height <= 0) return y;

	try {
		const mapImage = mapCanvas.toDataURL("image/jpeg", 0.9);
		const fullWidth = metrics.contentWidth;
		const fullWidthHeight = (mapCanvas.height / mapCanvas.width) * fullWidth;
		const availableHeight = Math.min(metrics.bottomLimit - y, PDF_COVER_IMAGE_MAX_HEIGHT);

		if (availableHeight <= 0) return y;

		const scaleToFitFirstPage = Math.min(1, availableHeight / fullWidthHeight);
		const imageWidth = fullWidth * scaleToFitFirstPage;
		const imageHeight = fullWidthHeight * scaleToFitFirstPage;
		y = ensurePdfSpace(doc, y, imageHeight + 5, layout, EMPTY_BRANDING_ASSETS);
		doc.addImage(mapImage, "JPEG", layout.margin, y, imageWidth, imageHeight);
		y += imageHeight + 5;

		if (labels.exportVisibleLayerLabel) {
			doc.setFontSize(11);
			y = addPdfTextAtY(
				doc,
				labels.exportVisibleLayerLabel,
				layout.margin,
				y,
				metrics.contentWidth
			);
			y += 3;
		}
	} catch (error) {
		console.warn("zonalStatistics: failed to capture map screenshot for PDF export", error);
	}
	return y;
}

function processRowWithZoneHandling(
	doc: jsPDF,
	row: ZonalStatisticsExportRow,
	columns: PdfColumn[],
	lineHeight: number,
	pdfColor: (value: string) => { fill: Rgb; text: Rgb } | undefined,
	currentZone: { code?: string; y: number },
	labels: ZonalPdfLabels
): number {
	let y = currentZone.y;
	const sampleLines = columns.map((col) => doc.splitTextToSize(col.get(row) || "", col.width - 3));
	const nextRowHeight =
		Math.max(...sampleLines.map((lines) => Math.max(1, lines.length))) * lineHeight + 2;

	if (row.zoneCode !== currentZone.code) {
		const extraSpacing = currentZone.code ? 3 : 0;
		const zoneHeaderHeight = 8;
		if (y + extraSpacing + zoneHeaderHeight + nextRowHeight > metrics.bottomLimit) {
			addPdfPageWithHeader(doc, layout, EMPTY_BRANDING_ASSETS);
			y = metrics.contentTop;
			y = drawPdfTableHeader(doc, layout.margin, y, columns);
		}
		y += extraSpacing;
		y = drawPdfZoneHeader(doc, row.zoneCode, y, labels);
		currentZone.code = row.zoneCode;
	}

	if (y + nextRowHeight > metrics.bottomLimit) {
		addPdfPageWithHeader(doc, layout, EMPTY_BRANDING_ASSETS);
		y = metrics.contentTop;
		y = drawPdfTableHeader(doc, layout.margin, y, columns);
		if (currentZone.code) {
			y = drawPdfZoneHeader(doc, currentZone.code, y, labels);
		}
	}

	y = drawPdfRow(doc, row, layout.margin, y, columns, lineHeight, pdfColor);
	currentZone.y = y;
	return y;
}

export async function exportZonalPdf(options: ExportZonalPdfOptions): Promise<void> {
	const {
		rows,
		settings,
		title,
		fileNamePrefix,
		timestamp,
		currentLocale,
		mapCanvas,
		visibleLayerTitle,
		labels,
		columnLabel,
		pdfColor
	} = options;

	const brandingAssets = await loadPdfBrandingAssets({
		leftLogoPath: settings.pdfLogo ?? DEFAULT_PDF_BRANDING.leftLogoPath,
		footerText: settings.pdfFooterText ?? DEFAULT_PDF_BRANDING.footerText
	});

	const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
	const lineHeight = 4;
	doc.setFont("helvetica", "normal");
	doc.setFontSize(9);
	const columns = buildPdfColumns(doc, rows, settings, labels, columnLabel);

	drawPdfPageHeader(doc, layout, brandingAssets);
	let y = addPdfHeaderBlock(doc, metrics.contentTop + 4, title, labels, currentLocale);
	y += 3;

	if (mapCanvas && visibleLayerTitle) {
		const newVisibleLayerLabel = `${labels.exportVisibleLayerLabel}: ${visibleLayerTitle}`;
		const labelsWithLayer = { ...labels, exportVisibleLayerLabel: newVisibleLayerLabel };
		y = addMapImageToCover(doc, mapCanvas, y, labelsWithLayer);
	}

	addPdfPageWithHeader(doc, layout, brandingAssets);
	y = metrics.contentTop;
	y = drawPdfTableHeader(doc, layout.margin, y, columns);

	const currentZone = { code: undefined as string | undefined, y };
	for (const row of rows) {
		processRowWithZoneHandling(doc, row, columns, lineHeight, pdfColor, currentZone, labels);
	}

	drawPdfFooters(doc, layout, brandingAssets, labels.exportPage);
	doc.save(`${fileNamePrefix}_${timestamp}.pdf`);
}
