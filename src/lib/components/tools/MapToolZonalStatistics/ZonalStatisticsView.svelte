<script lang="ts">
	import { createEventDispatcher, onDestroy } from "svelte";
	import { fade } from "svelte/transition";
	import { _ } from "svelte-i18n";
	import { TooltipDefinition } from "carbon-components-svelte";
	import { Close, GeneratePdf, TrashCan } from "carbon-icons-svelte";
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

	import { Button } from "carbon-components-svelte";
	import type {
		Passport,
		ZonalStatisticsController,
		ZonalStatisticsExportRow
	} from "./zonal-statistics-controller";

	export let controller: ZonalStatisticsController;

	const dispatch = createEventDispatcher();

	let passport: Passport = { zones: [], rows: [] };
	let activeCode: string | undefined;
	let show = true;

	const unsubscribe = controller.selectedZones.subscribe(() => {
		passport = controller.buildPassport();
		// Drop the active zone if it is no longer selected.
		if (activeCode && !passport.zones.includes(activeCode)) {
			activeCode = undefined;
		}
	});

	$: controller.setActiveZone(activeCode);

	function labelClassFor(value: string | undefined): string {
		if (!value) return "";
		const normalized = String(value).trim().toUpperCase();
		switch (normalized) {
			case "A":
				return "label-a";
			case "B":
				return "label-b";
			case "C":
				return "label-c";
			case "D":
				return "label-d";
			case "E":
				return "label-e";
			default:
				return "";
		}
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
	const branding = {
		...DEFAULT_PDF_BRANDING,
		footerText: "Provincie Zeeland - Klimaatlabels"
	};

	function addPdfHeaderBlock(doc: jsPDF, startY: number): number {
		doc.setFont("helvetica", "bold");
		doc.setFontSize(14);
		doc.text($_("tools.zonalStatistics.exportPdfTitle"), layout.margin, startY);

		doc.setFont("helvetica", "normal");
		doc.setFontSize(9);
		doc.text(
			`${$_("tools.zonalStatistics.exportCreatedAt")} ${new Date().toLocaleDateString("nl-NL")} om ${new Date().toLocaleTimeString("nl-NL")}`,
			layout.margin,
			startY + 6
		);
		return startY + 12;
	}

	function drawPdfTableHeader(doc: jsPDF, x: number, y: number, widths: Array<number>): number {
		const headers = [
			$_("tools.zonalStatistics.exportPostcode"),
			$_("tools.zonalStatistics.exportLayer"),
			$_("tools.zonalStatistics.exportCurrentLabel"),
			$_("tools.zonalStatistics.exportCurrentCategory"),
			$_("tools.zonalStatistics.exportTargetLabel"),
			$_("tools.zonalStatistics.exportTargetCategory")
		];

		doc.setFont("helvetica", "bold");
		doc.setFontSize(9);

		let cursorX = x;
		for (let i = 0; i < headers.length; i++) {
			doc.rect(cursorX, y, widths[i], 8);
			doc.text(headers[i], cursorX + 1.5, y + 5.5, { maxWidth: widths[i] - 3 });
			cursorX += widths[i];
		}

		doc.setFont("helvetica", "normal");
		return y + 8;
	}

	function drawPdfRow(
		doc: jsPDF,
		row: ZonalStatisticsExportRow,
		x: number,
		y: number,
		widths: Array<number>,
		lineHeight: number
	): number {
		const values = [
			row.postcode,
			row.layerTitle,
			row.currentLabel,
			row.currentCategoryDescription,
			row.targetLabel,
			row.targetCategoryDescription
		];

		const wrapped = values.map((value, index) =>
			doc.splitTextToSize(value || "", Math.max(1, widths[index] - 3))
		);
		const rowHeight =
			Math.max(...wrapped.map((lines) => Math.max(1, lines.length))) * lineHeight + 2;

		let cursorX = x;
		for (let i = 0; i < values.length; i++) {
			doc.rect(cursorX, y, widths[i], rowHeight);
			doc.text(wrapped[i], cursorX + 1.5, y + 4);
			cursorX += widths[i];
		}

		return y + rowHeight;
	}

	function groupRowsByPostcode(rows: Array<ZonalStatisticsExportRow>) {
		const groups: Array<{ postcode: string; rows: Array<ZonalStatisticsExportRow> }> = [];
		for (const row of rows) {
			const postcode = row.postcode || "";
			const existingGroup = groups[groups.length - 1];
			if (!existingGroup || existingGroup.postcode !== postcode) {
				groups.push({ postcode, rows: [row] });
			} else {
				existingGroup.rows.push(row);
			}
		}
		return groups;
	}

	async function exportPdf() {
		const rows = controller.buildExportRows();
		if (rows.length === 0) return;
		const brandingAssets = await loadPdfBrandingAssets(branding);

		const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
		const lineHeight = 4;
		const widths = [20, 32, 13, 45, 13, 45];

		drawPdfPageHeader(doc, layout, brandingAssets);
		let y = addPdfHeaderBlock(doc, metrics.contentTop + 4);
		y = drawPdfTableHeader(doc, layout.margin, y, widths);

		const postcodeGroups = groupRowsByPostcode(rows);
		for (let groupIndex = 0; groupIndex < postcodeGroups.length; groupIndex++) {
			if (groupIndex > 0) {
				addPdfPageWithHeader(doc, layout, brandingAssets);
				y = addPdfHeaderBlock(doc, metrics.contentTop + 4);
				y = drawPdfTableHeader(doc, layout.margin, y, widths);
			}

			for (const row of postcodeGroups[groupIndex].rows) {
				const sampleLines = [
					doc.splitTextToSize(row.postcode || "", widths[0] - 3),
					doc.splitTextToSize(row.layerTitle || "", widths[1] - 3),
					doc.splitTextToSize(row.currentLabel || "", widths[2] - 3),
					doc.splitTextToSize(row.currentCategoryDescription || "", widths[3] - 3),
					doc.splitTextToSize(row.targetLabel || "", widths[4] - 3),
					doc.splitTextToSize(row.targetCategoryDescription || "", widths[5] - 3)
				];
				const nextRowHeight =
					Math.max(...sampleLines.map((lines) => Math.max(1, lines.length))) * lineHeight + 2;

				if (y + nextRowHeight > metrics.bottomLimit) {
					addPdfPageWithHeader(doc, layout, brandingAssets);
					y = addPdfHeaderBlock(doc, metrics.contentTop + 4);
					y = drawPdfTableHeader(doc, layout.margin, y, widths);
				}

				y = drawPdfRow(doc, row, layout.margin, y, widths, lineHeight);
			}
		}

		drawPdfFooters(doc, layout, brandingAssets, "Pagina");

		const filename = `Klimaatlabels_${formatTimestamp(new Date())}.pdf`;
		doc.save(filename);
	}

	function removeFromView() {
		show = false;
		setTimeout(() => dispatch("remove"), 200);
	}

	onDestroy(() => {
		unsubscribe();
	});
</script>

{#if show}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<div
		class="passport"
		in:fade={{ delay: 0, duration: 150 }}
		out:fade={{ delay: 0, duration: 150 }}
		on:click={(e) => {
			e.preventDefault();
			e.stopImmediatePropagation();
		}}
		role="presentation"
	>
		<div class="header">
			<div class="heading-01">{$_("tools.zonalStatistics.label")}</div>
			<div class="actions">
				{#if passport.zones.length > 0}
					<Button
						kind="ghost"
						icon={GeneratePdf}
						size="small"
						iconDescription={$_("tools.zonalStatistics.exportPdf")}
						tooltipPosition="left"
						on:click={exportPdf}
					/>
					<Button
						kind="ghost"
						icon={TrashCan}
						size="small"
						iconDescription={$_("tools.zonalStatistics.clearSelection")}
						tooltipPosition="left"
						on:click={clear}
					/>
				{/if}
				<Button
					kind="ghost"
					icon={Close}
					size="small"
					iconDescription={$_("tools.zonalStatistics.close")}
					tooltipPosition="left"
					on:click={removeFromView}
				/>
			</div>
		</div>

		<div class="content">
			{#if passport.zones.length === 0}
				<div class="no-selection body-compact-01">
					{$_("tools.zonalStatistics.noSelection")}
				</div>
			{:else}
				<table class="passport-table">
					<thead>
						<tr>
							<th class="row-head" rowspan="2" />
							{#each passport.zones as code (code)}
								<th
									class="zone-head"
									class:active={code === activeCode}
									colspan="2"
									role="button"
									tabindex="0"
									on:click={() => toggleActive(code)}
									on:keydown={(e) => {
										if (e.key === "Enter" || e.key === " ") {
											e.preventDefault();
											toggleActive(code);
										}
									}}
								>
									{code}
								</th>
							{/each}
						</tr>
						<tr>
							{#each passport.zones as code (code)}
								<th class="sub-head" class:active={code === activeCode}>
									{$_("tools.zonalStatistics.currentLabel")}
								</th>
								<th class="sub-head target" class:active={code === activeCode}>
									{$_("tools.zonalStatistics.targetLabel")}
								</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each passport.rows as row (row.layerId)}
							<tr>
								<th class="row-head" scope="row">{row.title}</th>
								{#each passport.zones as code (code)}
									<td
										class={`value ${labelClassFor(row.values[code])}`}
										class:active={code === activeCode}
									>
										{#if row.valueTooltips[code]}
											<TooltipDefinition
												class="cell-tooltip"
												direction="top"
												tooltipText={row.valueTooltips[code]}
											>
												{row.values[code] ?? "–"}
											</TooltipDefinition>
										{:else}
											{row.values[code] ?? "–"}
										{/if}
									</td>
									<td
										class={`value target ${labelClassFor(row.targets[code])}`}
										class:active={code === activeCode}
									>
										{#if row.targetTooltips[code]}
											<TooltipDefinition
												class="cell-tooltip"
												align="end"
												direction="top"
												tooltipText={row.targetTooltips[code]}
											>
												{row.targets[code] ?? "–"}
											</TooltipDefinition>
										{:else}
											{row.targets[code] ?? "–"}
										{/if}
									</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</div>
	</div>
{/if}

<style>
	.passport {
		position: absolute;
		top: var(--cds-spacing-05);
		right: var(--cds-spacing-05);
		max-width: 60%;
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

	.actions {
		display: flex;
	}

	.content {
		overflow: auto;
	}

	.no-selection {
		color: var(--cds-text-secondary);
		padding: var(--cds-spacing-05);
	}

	.passport-table {
		border-collapse: collapse;
		width: 100%;
		font-size: 0.875rem;
	}

	.passport-table th,
	.passport-table td {
		padding: var(--cds-spacing-03) var(--cds-spacing-05);
		border-bottom: 1px solid var(--cds-ui-03);
		text-align: center;
		white-space: nowrap;
	}

	.passport-table .row-head {
		text-align: left;
		font-weight: 600;
		position: sticky;
		left: 0;
		background-color: var(--cds-ui-02);
		z-index: 1;
	}

	.zone-head {
		font-weight: 600;
		cursor: pointer;
		border-left: 2px solid var(--cds-ui-03);
	}

	.zone-tooltip :global(.bx--tooltip__trigger) {
		background: none;
		border: 0;
		color: inherit;
		cursor: help;
		display: inline-flex;
		font: inherit;
		padding: 0;
	}

	.zone-tooltip :global(.bx--tooltip__trigger--definition) {
		white-space: nowrap;
	}

	.cell-tooltip :global(.bx--tooltip__trigger) {
		background: none;
		border: 0;
		color: inherit;
		cursor: help;
		display: inline-flex;
		font: inherit;
		padding: 0;
	}

	.cell-tooltip :global(.bx--tooltip__trigger--definition) {
		white-space: nowrap;
	}

	.sub-head {
		font-weight: 400;
		color: var(--cds-text-secondary);
	}

	.sub-head.target,
	.value.target {
		border-right: 1px solid var(--cds-ui-03);
	}

	.zone-head.active,
	.sub-head.active,
	.value.active {
		background-color: var(--cds-highlight, #d0e2ff);
	}

	.value.label-a {
		background-color: #44ce1b;
		color: #ffffff;
	}

	.value.label-b {
		background-color: #bbdb44;
		color: #161616;
	}

	.value.label-c {
		background-color: #f7e379;
		color: #161616;
	}

	.value.label-d {
		background-color: #f2a134;
		color: #161616;
	}

	.value.label-e {
		background-color: #e51f1f;
		color: #ffffff;
	}

	.value.active {
		outline: 2px solid var(--cds-focus, #0f62fe);
		outline-offset: -2px;
		font-weight: 600;
	}
</style>
