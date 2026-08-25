<script lang="ts">
	import { createEventDispatcher, onDestroy, onMount, tick } from "svelte";
	import { get } from "svelte/store";
	import { fade } from "svelte/transition";
	import { _, locale } from "svelte-i18n";
	import { Close, Download, Layers, Location, Reset, ZoomIn } from "carbon-icons-svelte";
	import { toJpeg, toPng } from "html-to-image";
	import { jsPDF } from "jspdf";
	import {
		A4_PORTRAIT_LAYOUT,
		DEFAULT_PDF_BRANDING,
		addPdfPageWithHeader,
		drawPdfFooters,
		drawPdfPageHeader,
		getPdfLayoutMetrics,
		loadPdfBrandingAssets
	} from "$lib/components/tools/pdf/pdf-layout";

	import { Button, InlineLoading, OverflowMenu, OverflowMenuItem } from "carbon-components-svelte";
	import type {
		ZoneTable,
		ZonalStatisticsController,
		ZonalStatisticsExportRow
	} from "./zonal-statistics-controller";
	import { createZonalStyler } from "./zonal-style";

	export let controller: ZonalStatisticsController;
	export let title: string;

	const dispatch = createEventDispatcher();

	const settings = controller.settings;
	const columns = settings.columns;

	function columnLabel(index: number): string {
		const column = columns[index];
		return column?.label ?? column?.attribute ?? "";
	}

	// Rows are stable (one per data layer added to the table); zone columns are added/removed incrementally.
	let table: ZoneTable = {
		zones: [],
		rows: controller.getTableLayers().map((dl) => ({
			layerId: dl.layerId,
			title: dl.title,
			values: {},
			tooltips: {}
		}))
	};
	let activeCode: string | undefined;
	let show = true;
	let exportingImage = false;
	let exportingPdf = false;
	let exportingFormat = "";
	let exportError = false;
	let errorTimer: ReturnType<typeof setTimeout> | undefined;
	// Off-screen A4-width sheet captured for PNG/JPEG exports (zones stacked vertically).
	let exportElement: HTMLDivElement | undefined;
	let contentEl: HTMLDivElement | undefined;
	let stickyColWidth = 0;
	let scroll = { top: false, bottom: false, left: false, right: false };
	let scrollbarW = 0;
	let scrollbarH = 0;

	$: exportInProgress = exportingImage || exportingPdf;
	// Recompute the scroll-shadow cues whenever the table content changes.
	$: if (table) tick().then(updateScrollShadows);

	// Toggle the edge shadows that hint at content scrolled out of view.
	function updateScrollShadows(): void {
		const el = contentEl;
		if (!el) {
			scroll = { top: false, bottom: false, left: false, right: false };
			return;
		}
		// Compare against the offset size (which includes the scrollbar) so a
		// vertical scrollbar can't fake horizontal overflow, and vice versa.
		const hasHorizontalOverflow = el.scrollWidth - el.offsetWidth > 1;
		const hasVerticalOverflow = el.scrollHeight - el.offsetHeight > 1;
		// Overlay scrollbars report 0 here, in which case the shadows keep their full extent.
		scrollbarW = el.offsetWidth - el.clientWidth;
		scrollbarH = el.offsetHeight - el.clientHeight;
		scroll = {
			top: hasVerticalOverflow && el.scrollTop > 0,
			bottom: hasVerticalOverflow && el.scrollTop + el.clientHeight < el.scrollHeight - 1,
			left: hasHorizontalOverflow && el.scrollLeft > 0,
			right: hasHorizontalOverflow && el.scrollLeft + el.clientWidth < el.scrollWidth - 1
		};
	}

	// Surface an export failure briefly, then clear it automatically.
	function flagExportError(): void {
		exportError = true;
		if (errorTimer) clearTimeout(errorTimer);
		errorTimer = setTimeout(() => (exportError = false), 5000);
	}

	const unsubscribe = controller.selectedZones.subscribe((zones) => {
		updateTable(zones.map((z) => z.code));
	});

	// The tool can open before the configured layers finish loading, and the user can add/remove a
	// data layer from the panel; rebuild the rows and refill the already-selected zones.
	const unsubscribeLayers = controller.tableLayers.subscribe(() => {
		const codes = table.zones;
		table.rows = controller.getTableLayers().map((dl) => ({
			layerId: dl.layerId,
			title: dl.title,
			values: {},
			tooltips: {}
		}));
		for (const code of codes) fillZoneColumn(code);
		table = table;
	});

	// Fill one zone column across the current rows, matching each row by layer id.
	function fillZoneColumn(code: string): void {
		const slices = new Map(controller.buildZoneSlice(code).map((s) => [s.layerId, s]));
		for (const row of table.rows) {
			const slice = slices.get(row.layerId);
			if (!slice) continue;
			row.values[code] = slice.values;
			row.tooltips[code] = slice.tooltips;
		}
	}

	// Add/remove only the changed zone columns instead of rebuilding the whole table.
	function updateTable(codes: Array<string>): void {
		const next = new Set(codes);
		const current = new Set(table.zones);

		for (const code of table.zones) {
			if (next.has(code)) continue;
			for (const row of table.rows) {
				delete row.values[code];
				delete row.tooltips[code];
			}
		}
		for (const code of codes) {
			if (current.has(code)) continue;
			fillZoneColumn(code);
		}

		table.zones = codes;
		table = table;

		// Drop the active zone if it is no longer selected.
		if (activeCode && !next.has(activeCode)) {
			activeCode = undefined;
		}
	}

	$: controller.setActiveZone(activeCode);

	const styler = createZonalStyler(settings.valueStyles);

	function cellStyle(value: string | undefined, columnIndex: number): string {
		return styler.cellStyle(value, columns[columnIndex]?.styled === true);
	}

	function exportTitle(): string {
		return settings.exportTitle ?? title;
	}

	function fileNamePrefix(): string {
		return (settings.exportFileName ?? title ?? "zonal-statistics").replace(/[^\w.-]+/g, "_");
	}

	function toggleActive(code: string) {
		activeCode = activeCode === code ? undefined : code;
	}

	function clear() {
		controller.clearSelection();
	}

	function formatTimestamp(date: Date): string {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const day = String(date.getDate()).padStart(2, "0");
		const hour = String(date.getHours()).padStart(2, "0");
		const minute = String(date.getMinutes()).padStart(2, "0");
		return `${year}${month}${day}-${hour}${minute}`;
	}

	const layout = A4_PORTRAIT_LAYOUT;
	const metrics = getPdfLayoutMetrics(layout);

	function addPdfHeaderBlock(doc: jsPDF, startY: number): number {
		doc.setFont("helvetica", "bold");
		doc.setFontSize(14);
		doc.text(exportTitle(), layout.margin, startY);

		doc.setFont("helvetica", "normal");
		doc.setFontSize(9);
		const currentLocale = get(locale) ?? undefined;
		doc.text(
			`${$_("tools.zonalStatistics.exportCreatedAt")} ${new Date().toLocaleString(currentLocale)}`,
			layout.margin,
			startY + 6
		);
		return startY + 12;
	}

	interface PdfColumn {
		header: string;
		width: number;
		get: (r: ZonalStatisticsExportRow) => string;
		colored?: boolean;
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

	function buildPdfColumns(doc: jsPDF, rows: Array<ZonalStatisticsExportRow>): Array<PdfColumn> {
		const availableWidth = metrics.contentWidth;
		const minimumWidth = minimumPdfColumnWidth(doc);
		const preferredWidths: Array<number> = [];
		const columns: Array<PdfColumn> = [
			{ header: $_("tools.zonalStatistics.exportZone"), width: 0, get: (r) => r.zoneCode },
			{ header: $_("tools.zonalStatistics.exportLayer"), width: 0, get: (r) => r.layerTitle }
		];

		const zoneHeader = columns[0].header;
		const layerHeader = columns[1].header;
		const zoneHeaderWidth = measurePdfTextWidth(doc, zoneHeader) + 4;
		const zoneContentWidth = rows.reduce(
			(max, row) => Math.max(max, measurePdfTextWidth(doc, row.zoneCode)),
			0
		);
		preferredWidths.push(Math.max(minimumWidth, zoneHeaderWidth, zoneContentWidth + 4));

		const layerHeaderWidth = measurePdfTextWidth(doc, layerHeader) + 4;
		const layerContentWidth = rows.reduce(
			(max, row) => Math.max(max, measurePdfTextWidth(doc, row.layerTitle)),
			0
		);
		preferredWidths.push(Math.max(minimumWidth, layerHeaderWidth, layerContentWidth + 4));

		for (let i = 0; i < settings.columns.length; i++) {
			const column = settings.columns[i];
			const valueHeader = columnLabel(i);
			const valueContentWidth = rows.reduce(
				(max, row) => Math.max(max, measurePdfTextWidth(doc, row.values[i] ?? "")),
				0
			);
			preferredWidths.push(
				Math.max(minimumWidth, measurePdfTextWidth(doc, valueHeader) + 4, valueContentWidth + 4)
			);

			columns.push({
				header: valueHeader,
				width: 0,
				get: (r) => r.values[i] ?? "",
				colored: column.styled
			});

			if (column.tooltipAttribute) {
				const tooltipHeader = `${valueHeader} – ${$_("tools.zonalStatistics.exportDescription")}`;
				const tooltipContentWidth = rows.reduce(
					(max, row) => Math.max(max, measurePdfTextWidth(doc, row.tooltips[i] ?? "")),
					0
				);
				preferredWidths.push(
					Math.max(minimumWidth, measurePdfTextWidth(doc, tooltipHeader) + 4, tooltipContentWidth + 4)
				);
				columns.push({
					header: tooltipHeader,
					width: 0,
					get: (r) => r.tooltips[i] ?? ""
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

	// Columns are built from config: zone + layer, then each configured column
	// (plus a description column when the column has a tooltip attribute).
	function pdfColumns(doc: jsPDF, rows: Array<ZonalStatisticsExportRow>): Array<PdfColumn> {
		return buildPdfColumns(doc, rows);
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

	function drawPdfRow(
		doc: jsPDF,
		row: ZonalStatisticsExportRow,
		x: number,
		y: number,
		columns: Array<PdfColumn>,
		lineHeight: number
	): number {
		const wrapped = columns.map((col) =>
			doc.splitTextToSize(col.get(row) || "", Math.max(1, col.width - 3))
		);
		const rowHeight =
			Math.max(...wrapped.map((lines) => Math.max(1, lines.length))) * lineHeight + 2;

		let cursorX = x;
		columns.forEach((col, i) => {
			const color = col.colored ? styler.pdfColor(col.get(row)) : undefined;
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

	function groupRowsByZone(rows: Array<ZonalStatisticsExportRow>) {
		const groups: Array<{ zoneCode: string; rows: Array<ZonalStatisticsExportRow> }> = [];
		for (const row of rows) {
			const zoneCode = row.zoneCode || "";
			const existingGroup = groups[groups.length - 1];
			if (!existingGroup || existingGroup.zoneCode !== zoneCode) {
				groups.push({ zoneCode, rows: [row] });
			} else {
				existingGroup.rows.push(row);
			}
		}
		return groups;
	}

	async function exportPdf() {
		if (exportInProgress) return;

		const rows = controller.buildExportRows();
		if (rows.length === 0) return;

		try {
			exportError = false;
			exportingFormat = "PDF";
			exportingPdf = true;

			const brandingAssets = await loadPdfBrandingAssets({
				leftLogoPath: settings.pdfLogo ?? DEFAULT_PDF_BRANDING.leftLogoPath,
				footerText: settings.pdfFooterText ?? DEFAULT_PDF_BRANDING.footerText
			});

			const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
			const lineHeight = 4;
			doc.setFont("helvetica", "normal");
			doc.setFontSize(9);
			const columns = pdfColumns(doc, rows);

			drawPdfPageHeader(doc, layout, brandingAssets);
			let y = addPdfHeaderBlock(doc, metrics.contentTop + 4);
			y = drawPdfTableHeader(doc, layout.margin, y, columns);

			const zoneGroups = groupRowsByZone(rows);
			for (let groupIndex = 0; groupIndex < zoneGroups.length; groupIndex++) {
				if (groupIndex > 0) {
					addPdfPageWithHeader(doc, layout, brandingAssets);
					y = addPdfHeaderBlock(doc, metrics.contentTop + 4);
					y = drawPdfTableHeader(doc, layout.margin, y, columns);
				}

				for (const row of zoneGroups[groupIndex].rows) {
					const sampleLines = columns.map((col) =>
						doc.splitTextToSize(col.get(row) || "", col.width - 3)
					);
					const nextRowHeight =
						Math.max(...sampleLines.map((lines) => Math.max(1, lines.length))) * lineHeight + 2;

					if (y + nextRowHeight > metrics.bottomLimit) {
						addPdfPageWithHeader(doc, layout, brandingAssets);
						y = addPdfHeaderBlock(doc, metrics.contentTop + 4);
						y = drawPdfTableHeader(doc, layout.margin, y, columns);
					}

					y = drawPdfRow(doc, row, layout.margin, y, columns, lineHeight);
				}
			}

			drawPdfFooters(doc, layout, brandingAssets, $_("tools.zonalStatistics.exportPage"));

			doc.save(`${fileNamePrefix()}_${formatTimestamp(new Date())}.pdf`);
		} catch (error) {
			console.error("zonalStatistics: failed to export table as PDF", error);
			flagExportError();
		} finally {
			exportingPdf = false;
			exportingFormat = "";
		}
	}

	// Logical export columns (zone + layer, then each configured column and its
	// optional description) shared by the CSV export. Mirrors pdfColumns().
	function csvColumns(): Array<{ header: string; get: (r: ZonalStatisticsExportRow) => string }> {
		const cols: Array<{ header: string; get: (r: ZonalStatisticsExportRow) => string }> = [
			{ header: $_("tools.zonalStatistics.exportZone"), get: (r) => r.zoneCode },
			{ header: $_("tools.zonalStatistics.exportLayer"), get: (r) => r.layerTitle }
		];
		columns.forEach((column, i) => {
			cols.push({ header: columnLabel(i), get: (r) => r.values[i] ?? "" });
			if (column.tooltipAttribute) {
				cols.push({
					header: `${columnLabel(i)} – ${$_("tools.zonalStatistics.exportDescription")}`,
					get: (r) => r.tooltips[i] ?? ""
				});
			}
		});
		return cols;
	}

	function csvCell(value: string): string {
		const v = value ?? "";
		return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
	}

	function exportCsv() {
		if (exportInProgress) return;

		const rows = controller.buildExportRows();
		if (rows.length === 0) return;

		try {
			exportError = false;
			const cols = csvColumns();
			const lines = [cols.map((c) => csvCell(c.header)).join(",")];
			for (const row of rows) {
				lines.push(cols.map((c) => csvCell(c.get(row))).join(","));
			}
			// Prepend a UTF-8 BOM so Excel opens accented characters correctly.
			const blob = new Blob(["\uFEFF" + lines.join("\r\n")], {
				type: "text/csv;charset=utf-8;"
			});
			const link = document.createElement("a");
			link.href = URL.createObjectURL(blob);
			link.download = `${fileNamePrefix()}_${formatTimestamp(new Date())}.csv`;
			link.click();
			URL.revokeObjectURL(link.href);
		} catch (error) {
			console.error("zonalStatistics: failed to export table as CSV", error);
			flagExportError();
		}
	}

	async function exportImage(format: "png" | "jpeg") {
		if (exportInProgress) return;
		if (table.zones.length === 0) return;

		try {
			exportError = false;
			exportingFormat = format.toUpperCase();
			exportingImage = true;
			// Wait for the off-screen export sheet (zones stacked vertically) to render.
			await tick();

			const node = exportElement;
			if (!node) return;

			const width = node.scrollWidth;
			const height = node.scrollHeight;
			const options = {
				cacheBust: true,
				pixelRatio: 2,
				backgroundColor: "#ffffff",
				width,
				height,
				style: {
					width: `${width}px`,
					height: `${height}px`
				}
			};
			const dataUrl =
				format === "jpeg"
					? await toJpeg(node, { ...options, quality: 0.95 })
					: await toPng(node, options);

			const link = document.createElement("a");
			link.href = dataUrl;
			link.download = `${fileNamePrefix()}_${formatTimestamp(new Date())}.${format}`;
			link.click();
		} catch (error) {
			console.error(`zonalStatistics: failed to export table as ${format.toUpperCase()}`, error);
			flagExportError();
		} finally {
			exportingImage = false;
			exportingFormat = "";
			await tick();
		}
	}

	async function exportPng() {
		await exportImage("png");
	}

	async function exportJpeg() {
		await exportImage("jpeg");
	}

	function removeFromView() {
		show = false;
		setTimeout(() => dispatch("remove"), 200);
	}

	onMount(() => {
		updateScrollShadows();
		window.addEventListener("resize", updateScrollShadows);
	});

	onDestroy(() => {
		unsubscribe();
		unsubscribeLayers();
		window.removeEventListener("resize", updateScrollShadows);
		if (errorTimer) clearTimeout(errorTimer);
	});
</script>

{#if show}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<div
		class="zonal-panel"
		in:fade={{ delay: 0, duration: 150 }}
		out:fade={{ delay: 0, duration: 150 }}
		on:click={(e) => {
			e.preventDefault();
			e.stopImmediatePropagation();
		}}
		role="presentation"
	>
		<div class="header">
			<div class="heading-01 title">
				<span class="title-text">{title}</span>
				{#if table.zones.length > 0}
					<span class="count-badge">
						{$_("tools.zonalStatistics.zonesSelected", {
							values: { count: table.zones.length }
						})}
					</span>
				{/if}
			</div>
			<div class="actions">
				{#if exportError}
					<InlineLoading
						class="export-status"
						status="error"
						description={$_("tools.zonalStatistics.exportFailed")}
					/>
				{/if}
				{#if table.zones.length > 0}
					<OverflowMenu
						icon={Download}
						flipped
						size="sm"
						iconDescription={$_("tools.zonalStatistics.exportMenu")}
						disabled={exportInProgress || table.rows.length === 0}
					>
						<OverflowMenuItem text="PNG" on:click={exportPng} />
						<OverflowMenuItem text="JPEG" on:click={exportJpeg} />
						<OverflowMenuItem text="PDF" on:click={exportPdf} />
						<OverflowMenuItem text="CSV" on:click={exportCsv} />
					</OverflowMenu>
					<Button
						kind="ghost"
						icon={Reset}
						size="small"
						iconDescription={$_("tools.zonalStatistics.clearSelection")}
						tooltipPosition="bottom"
						on:click={clear}
					/>
				{/if}
				<Button
					kind="ghost"
					icon={Close}
					size="small"
					iconDescription={$_("tools.zonalStatistics.close")}
					tooltipPosition="bottom"
					on:click={removeFromView}
				/>
			</div>
		</div>

		<div class="content-wrap">
			<div class="content" bind:this={contentEl} on:scroll={updateScrollShadows}>
				{#if table.rows.length === 0}
					<div class="no-selection body-compact-01">
						<Layers size={32} />
						<span>{$_("tools.zonalStatistics.noTableLayers")}</span>
					</div>
				{:else if table.zones.length === 0}
					<div class="no-selection body-compact-01">
						<Location size={32} />
						<span>{$_("tools.zonalStatistics.noSelection")}</span>
					</div>
				{:else}
					<table class="zonal-table">
						<caption class="bx--visually-hidden">{$_("tools.zonalStatistics.tableCaption")}</caption
						>
						<thead>
							<tr>
								<th class="row-head" rowspan="2" bind:offsetWidth={stickyColWidth} />
								{#each table.zones as code (code)}
									<th class="zone-head" class:active={code === activeCode} colspan={columns.length}>
										<div class="zone-head-inner">
											<button
												type="button"
												class="zone-code"
												aria-pressed={code === activeCode}
												aria-label={$_("tools.zonalStatistics.activateZone", {
													values: { code }
												})}
												title={$_("tools.zonalStatistics.activateZoneHint")}
												on:click={() => toggleActive(code)}
											>
												{code}
											</button>
											<button
												type="button"
												class="zone-zoom"
												aria-label={$_("tools.zonalStatistics.zoomToZoneAria", {
													values: { code }
												})}
												title={$_("tools.zonalStatistics.zoomToZone")}
												on:click={() => controller.zoomToZone(code)}
											>
												<ZoomIn size={16} />
											</button>
											<button
												type="button"
												class="zone-remove"
												aria-label={$_("tools.zonalStatistics.removeZoneAria", {
													values: { code }
												})}
												title={$_("tools.zonalStatistics.removeZone")}
												on:click={() => controller.toggleZone(code)}
											>
												<Close size={16} />
											</button>
										</div>
									</th>
								{/each}
							</tr>
							<tr>
								{#each table.zones as code (code)}
									{#each columns as column, i (i)}
										<th
											class="sub-head"
											class:last-col={i === columns.length - 1}
											class:active={code === activeCode}
										>
											{columnLabel(i)}
										</th>
									{/each}
								{/each}
							</tr>
						</thead>
						<tbody>
							{#each table.rows as row (row.layerId)}
								<tr>
									<th class="row-head" scope="row" title={row.title}>{row.title}</th>
									{#each table.zones as code (code)}
										{#each columns as column, i (i)}
											<td
												class="value"
												class:last-col={i === columns.length - 1}
												class:active={code === activeCode}
												style={cellStyle(row.values[code]?.[i], i)}
											>
												{#if row.tooltips[code]?.[i]}
													<!-- Native title tooltip: no abspos layout, so it can't add phantom horizontal scroll. -->
													<span class="cell-tooltip" title={row.tooltips[code][i]}>
														{row.values[code]?.[i] ?? "–"}
													</span>
												{:else}
													{row.values[code]?.[i] ?? "–"}
												{/if}
											</td>
										{/each}
									{/each}
								</tr>
							{/each}
						</tbody>
					</table>
				{/if}
			</div>
			<div class="edge edge-top" class:visible={scroll.top} style="right: {scrollbarW}px"></div>
			<div
				class="edge edge-bottom"
				class:visible={scroll.bottom}
				style="right: {scrollbarW}px; bottom: {scrollbarH}px"
			></div>
			<div
				class="edge edge-left"
				class:visible={scroll.left}
				style="left: {stickyColWidth}px; bottom: {scrollbarH}px"
			></div>
			<div
				class="edge edge-right"
				class:visible={scroll.right}
				style="right: {scrollbarW}px; bottom: {scrollbarH}px"
			></div>
			{#if exportInProgress}
				<div class="busy-overlay" in:fade={{ duration: 100 }} out:fade={{ duration: 100 }}>
					<InlineLoading
						description={$_("tools.zonalStatistics.exporting", {
							values: { format: exportingFormat }
						})}
					/>
				</div>
			{/if}
		</div>

		{#if settings.valueStyles.length > 0}
			<div class="legend">
				<span class="legend-title body-compact-01">{$_("tools.zonalStatistics.legendTitle")}</span>
				{#each settings.valueStyles as style (style.value)}
					<span class="legend-chip" style={styler.swatchStyle(style.color)}>
						{style.label ?? style.value}
					</span>
				{/each}
			</div>
		{/if}

		{#if exportingImage}
			<!-- Off-screen A4-portrait-width sheet: zones stacked vertically so the image fits on A4 pages. -->
			<div class="export-offscreen" aria-hidden="true">
				<div class="export-sheet" bind:this={exportElement}>
					<div class="export-heading">{exportTitle()}</div>
					{#each table.zones as code (code)}
						<section class="export-zone">
							<div class="export-zone-title">{code}</div>
							<table class="export-table">
								<thead>
									<tr>
										<th class="export-corner">{$_("tools.zonalStatistics.exportLayer")}</th>
										{#each columns as column, i (i)}
											<th>{columnLabel(i)}</th>
										{/each}
									</tr>
								</thead>
								<tbody>
									{#each table.rows as row (row.layerId)}
										<tr>
											<th class="export-row-head" scope="row">{row.title}</th>
											{#each columns as column, i (i)}
												<td style={cellStyle(row.values[code]?.[i], i)}>
													{row.values[code]?.[i] ?? "–"}
													{#if row.tooltips[code]?.[i]}
														<span class="cell-tooltip-text">{row.tooltips[code][i]}</span>
													{/if}
												</td>
											{/each}
										</tr>
									{/each}
								</tbody>
							</table>
						</section>
					{/each}
					{#if settings.valueStyles.length > 0}
						<div class="export-legend">
							<span class="export-legend-title">{$_("tools.zonalStatistics.legendTitle")}</span>
							{#each settings.valueStyles as style (style.value)}
								<span class="legend-chip" style={styler.swatchStyle(style.color)}>
									{style.label ?? style.value}
								</span>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>
{/if}

<style>
	.zonal-panel {
		position: absolute;
		top: var(--cds-spacing-05);
		right: var(--cds-spacing-05);
		max-width: calc(50% - (2 * var(--cds-spacing-05)));
		max-height: 60%;
		display: flex;
		flex-direction: column;
		background-color: var(--cds-ui-02);
		border: 1px solid var(--cds-ui-03);
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
		z-index: 5;
	}

	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--cds-spacing-03);
		padding: var(--cds-spacing-03) var(--cds-spacing-05);
		border-bottom: 1px solid var(--cds-ui-03);
	}

	.title {
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-03);
		min-width: 0;
		margin-bottom: 0;
	}

	.title-text {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.count-badge {
		flex: 0 0 auto;
		font-size: 0.75rem;
		font-weight: 400;
		color: var(--cds-text-secondary);
		background-color: var(--cds-ui-01);
		border: 1px solid var(--cds-ui-03);
		border-radius: 999px;
		padding: 0 var(--cds-spacing-03);
		white-space: nowrap;
	}

	.actions {
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-02);
	}

	.actions :global(.export-status) {
		margin-right: var(--cds-spacing-02);
	}

	.content-wrap {
		position: relative;
		display: flex;
		flex: 1 1 auto;
		min-height: 0;
		min-width: 0;
	}

	.content {
		overflow: auto;
		flex: 1 1 auto;
		min-height: 0;
		min-width: 0;
	}

	.edge {
		position: absolute;
		pointer-events: none;
		opacity: 0;
		transition: opacity 120ms ease;
		z-index: 4;
	}

	.edge.visible {
		opacity: 1;
	}

	.edge-top,
	.edge-bottom {
		left: 0;
		right: 0;
		height: 0.75rem;
	}

	.edge-left,
	.edge-right {
		top: 0;
		bottom: 0;
		width: 0.75rem;
	}

	.edge-top {
		top: 0;
		background: linear-gradient(to bottom, rgba(0, 0, 0, 0.18), transparent);
	}

	.edge-bottom {
		bottom: 0;
		background: linear-gradient(to top, rgba(0, 0, 0, 0.18), transparent);
	}

	.edge-left {
		background: linear-gradient(to right, rgba(0, 0, 0, 0.18), transparent);
	}

	.edge-right {
		right: 0;
		background: linear-gradient(to left, rgba(0, 0, 0, 0.18), transparent);
	}

	.busy-overlay {
		position: absolute;
		inset: 0;
		z-index: 6;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: color-mix(in srgb, var(--cds-ui-02) 78%, transparent);
		backdrop-filter: blur(2px);
	}

	.busy-overlay :global(.bx--inline-loading) {
		width: auto;
	}

	.legend {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: var(--cds-spacing-02);
		padding: var(--cds-spacing-03) var(--cds-spacing-05);
		border-top: 1px solid var(--cds-ui-03);
	}

	.legend-title {
		color: var(--cds-text-secondary);
		margin-right: var(--cds-spacing-02);
	}

	.legend-chip {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 1.25rem;
		height: 1.25rem;
		padding: 0 var(--cds-spacing-02);
		border-radius: 2px;
		font-size: 0.75rem;
		font-weight: 600;
	}

	.no-selection {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--cds-spacing-03);
		text-align: center;
		color: var(--cds-text-secondary);
		max-width: 20rem;
		padding: var(--cds-spacing-07) var(--cds-spacing-05);
	}

	.zonal-table {
		border-collapse: collapse;
		width: max-content;
		font-size: 0.875rem;
	}

	.zonal-table th,
	.zonal-table td {
		padding: var(--cds-spacing-03) var(--cds-spacing-05);
		border-bottom: 1px solid var(--cds-ui-03);
		text-align: center;
		white-space: nowrap;
		transition: background-color 120ms ease;
	}

	.zonal-table .row-head {
		text-align: left;
		font-weight: 600;
		position: sticky;
		left: 0;
		background-color: var(--cds-ui-02);
		z-index: 1;
		max-width: 12rem;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.zonal-table tbody tr:hover td:not(.active),
	.zonal-table tbody tr:hover th.row-head {
		background-color: var(--cds-hover-ui, rgba(141, 141, 141, 0.16));
	}

	.zone-head {
		font-weight: 600;
		border-left: 2px solid var(--cds-ui-03);
	}

	.zone-head-inner {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--cds-spacing-02);
	}

	.zone-code {
		background: none;
		border: 0;
		color: inherit;
		cursor: pointer;
		font: inherit;
		font-weight: 600;
		padding: 0;
	}

	.zone-code:hover {
		text-decoration: underline;
	}

	.zone-code[aria-pressed="true"] {
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	.zone-code:focus-visible {
		outline: 2px solid var(--cds-focus, #0f62fe);
		outline-offset: 2px;
		border-radius: 2px;
	}

	.zone-remove {
		background: none;
		border: 0;
		color: var(--cds-text-secondary);
		cursor: pointer;
		display: inline-flex;
		padding: 0;
		transition: color 120ms ease;
	}

	.zone-remove:hover {
		color: var(--cds-text-primary);
	}

	.zone-remove:focus-visible {
		outline: 2px solid var(--cds-focus, #0f62fe);
		outline-offset: 1px;
		border-radius: 2px;
	}

	.zone-zoom {
		background: none;
		border: 0;
		color: var(--cds-text-secondary);
		cursor: pointer;
		display: inline-flex;
		padding: 0;
		transition: color 120ms ease;
	}

	.zone-zoom:hover {
		color: var(--cds-text-primary);
	}

	.zone-zoom:focus-visible {
		outline: 2px solid var(--cds-focus, #0f62fe);
		outline-offset: 1px;
		border-radius: 2px;
	}

	.cell-tooltip {
		cursor: help;
		text-decoration: underline dotted;
		text-underline-offset: 3px;
	}

	/* Inline description shown only while rendering an image export (see template). */
	.cell-tooltip-text {
		display: block;
		margin-top: 2px;
		font-size: 0.6875rem;
		opacity: 0.8;
	}

	/* Off-screen sheet captured for PNG/JPEG exports: A4-portrait width, zones stacked vertically. */
	.export-offscreen {
		position: absolute;
		left: -100000px;
		top: 0;
	}

	/* The captured node stays statically positioned so html-to-image renders it at 0,0 (not off-screen). */
	.export-sheet {
		width: 760px;
		box-sizing: border-box;
		padding: 24px;
		background: #ffffff;
		color: var(--cds-text-primary, #161616);
	}

	.export-heading {
		font-size: 1.25rem;
		font-weight: 600;
		margin-bottom: 16px;
	}

	.export-zone {
		margin-bottom: 20px;
	}

	.export-zone-title {
		font-size: 1rem;
		font-weight: 600;
		margin-bottom: 6px;
		padding-bottom: 4px;
		border-bottom: 2px solid var(--cds-border-strong, #8d8d8d);
	}

	.export-table {
		width: 100%;
		border-collapse: collapse;
		table-layout: fixed;
		font-size: 0.8125rem;
	}

	.export-table th,
	.export-table td {
		border: 1px solid var(--cds-border-subtle, #c6c6c6);
		padding: 6px 8px;
		text-align: left;
		vertical-align: top;
		word-break: break-word;
	}

	.export-table thead th {
		background: var(--cds-layer-accent, #e0e0e0);
		font-weight: 600;
	}

	.export-row-head {
		background: var(--cds-layer, #f4f4f4);
		font-weight: 600;
		width: 34%;
	}

	.export-legend {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
		margin-top: 8px;
	}

	.export-legend-title {
		font-weight: 600;
	}

	.sub-head {
		font-weight: 400;
		color: var(--cds-text-secondary);
	}

	.sub-head.last-col,
	.value.last-col {
		border-right: 1px solid var(--cds-ui-03);
	}

	.zone-head.active,
	.sub-head.active,
	.value.active {
		background-color: var(--cds-highlight, #d0e2ff);
	}

	.value.active {
		outline: 2px solid var(--cds-focus, #0f62fe);
		outline-offset: -2px;
		font-weight: 600;
		transition:
			background-color 120ms ease,
			outline-color 120ms ease;
	}

	@media (prefers-reduced-motion: reduce) {
		.edge,
		.zonal-table th,
		.zonal-table td,
		.zone-remove,
		.zone-zoom,
		.value.active {
			transition: none;
		}
	}
</style>
