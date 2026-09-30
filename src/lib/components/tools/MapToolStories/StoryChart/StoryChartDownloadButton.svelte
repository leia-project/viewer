<script lang="ts">
	import { _ } from "svelte-i18n";
	import { get } from "svelte/store";
	import { Button } from "carbon-components-svelte";
	import { GeneratePdf } from "carbon-icons-svelte";
	import { jsPDF } from "jspdf";
	import {
		A4_PORTRAIT_LAYOUT,
		DEFAULT_PDF_BRANDING,
		addPdfPageWithHeader,
		addPdfSeparatorLine,
		addPdfTextAtY,
		addPdfTextSafe,
		drawPdfFooters,
		drawPdfPageHeader,
		ensurePdfSpace,
		getImageDimensions,
		getPdfLayoutMetrics,
		loadPdfBrandingAssets
	} from "$lib/components/tools/pdf/pdf-layout";

	import type { Map } from "$lib/map-cesium/map";
	import type { Story } from "../Story";
	import type { StoryStep } from "../StoryStep";
	import type { StoryChapter } from "../StoryChapter";
	import type { LegendItem, LegendOptions } from "../LegendOptions";
	import { exportDataPages } from "./StoryChartExportDataPages";

	export let data: Array<{ group: string; value: number }[]>;
	export let story: Story;
	export let layerLegends: Array<LegendOptions>;
	export let map: Map;

	let doc: jsPDF;

	let flattenedSteps: Array<{ step: StoryStep; chapter: StoryChapter }> = [];
	story.storyChapters.forEach((chapter) => {
		chapter.steps.forEach((step) => {
			flattenedSteps.push({ step, chapter });
		});
	});
	const storyLength = flattenedSteps.length;

	$: disableDownloadButton =
		$exportDataPages.pages.length < storyLength ||
		$exportDataPages.pages.some((page) => page.image === undefined);

	const layout = A4_PORTRAIT_LAYOUT;
	const metrics = getPdfLayoutMetrics(layout);
	const branding = {
		...DEFAULT_PDF_BRANDING,
		footerText: "Provincie Zeeland - Signaalkaarten"
	};

	async function formatContent(data: Array<{ group: string; value: number }[]>) {
		if (!data) return undefined;

		const brandingAssets = await loadPdfBrandingAssets(branding);

		doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

		// === FRONT PAGE ===
		drawPdfPageHeader(doc, layout, brandingAssets);
		let y = metrics.contentTop + 5;

		// Title
		doc.setFontSize(22);
		doc.setFont("helvetica", "bold");
		y = addPdfTextAtY(doc, story.name, layout.margin, y, metrics.contentWidth);
		y += 2;

		// Subtitle
		doc.setFontSize(12);
		doc.setFont("helvetica", "normal");
		doc.setTextColor(100, 100, 100);
		y = addPdfTextAtY(doc, story.description, layout.margin, y, metrics.contentWidth);
		doc.setTextColor(0, 0, 0);
		y += 3;

		// Date
		doc.setFontSize(9);
		doc.setTextColor(130, 130, 130);
		const now = new Date();
		y = addPdfTextAtY(
			doc,
			`gecreëerd op ${now.toLocaleDateString("nl-NL")} om ${now.toLocaleTimeString("nl-NL")}`,
			layout.margin,
			y,
			metrics.contentWidth
		);
		doc.setTextColor(0, 0, 0);
		y += 3;

		y = addPdfSeparatorLine(doc, y, layout);
		y += 3;

		// Map screenshot
		try {
			const canvas = map.viewer.canvas;
			const mapImage = canvas.toDataURL("image/jpeg", 0.9);
			const aspectRatio = canvas.width / canvas.height;
			const imgWidth = metrics.contentWidth;
			const imgHeight = Math.min(imgWidth / aspectRatio, 120);
			doc.addImage(mapImage, "JPEG", layout.margin, y, imgWidth, imgHeight);
		} catch {}

		// === STEP PAGES ===
		for (let index = 0; index < flattenedSteps.length; index++) {
			const { step, chapter } = flattenedSteps[index];
			addPdfPageWithHeader(doc, layout, brandingAssets);
			y = metrics.contentTop;

			// Step header with accent bar
			doc.setFillColor(33, 65, 112);
			doc.rect(layout.margin, y, 3, 12, "F");

			doc.setFontSize(16);
			doc.setFont("helvetica", "bold");
			y = addPdfTextAtY(doc, chapter.title, layout.margin + 7, y + 4, metrics.contentWidth - 10);

			doc.setFontSize(13);
			doc.setFont("helvetica", "normal");
			y = addPdfTextAtY(doc, step.title, layout.margin + 7, y + 1, metrics.contentWidth - 10);
			y += 5;

			y = addPdfSeparatorLine(doc, y, layout);
			y += 2;

			// Description
			const stepDescription = step.html || "";
			if (stepDescription) {
				const cleaned = stepDescription.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]*>/g, "");
				doc.setFontSize(10);
				doc.setFont("helvetica", "normal");
				y = addPdfTextSafe(
					doc,
					cleaned,
					layout.margin,
					y,
					metrics.contentWidth,
					layout,
					brandingAssets
				);
				y += 4;
			}

			// General legend text
			const generalLegendText = (layerLegends[index]?.generalLegendText || "").replace(
				/<[^>]*>/g,
				""
			);
			if (generalLegendText) {
				doc.setFontSize(10);
				doc.setFont("helvetica", "italic");
				y = addPdfTextSafe(
					doc,
					generalLegendText,
					layout.margin,
					y,
					metrics.contentWidth,
					layout,
					brandingAssets
				);
				y += 4;
				doc.setFont("helvetica", "normal");
			}

			// Legend items + general legend text grouped under heading
			const legendItems = layerLegends[index]?.legendOptions;
			const generalLegendText2 = (layerLegends[index]?.generalLegendText || "").replace(
				/<[^>]*>/g,
				""
			);

			if (legendItems || generalLegendText2) {
				doc.setFontSize(11);
				doc.setFont("helvetica", "bold");
				y = ensurePdfSpace(doc, y, 8, layout, brandingAssets);
				y = addPdfTextAtY(doc, "Handelingsperspectief", layout.margin, y, metrics.contentWidth);
				y += 2;

				// General legend text directly under the heading
				if (generalLegendText2) {
					doc.setFontSize(10);
					doc.setFont("helvetica", "italic");
					y = addPdfTextSafe(
						doc,
						generalLegendText2,
						layout.margin,
						y,
						metrics.contentWidth,
						layout,
						brandingAssets
					);
					y += 4;
					doc.setFont("helvetica", "normal");
				}

				if (legendItems) {
					legendItems.forEach((item: LegendItem) => {
						doc.setFontSize(10);
						doc.setFont("helvetica", "bold");
						const labels = item.labels || "";
						const formattedLabels = labels.length > 1 ? labels.split("").join(", ") : labels;
						y = ensurePdfSpace(doc, y, 12, layout, brandingAssets);
						y = addPdfTextSafe(
							doc,
							`Label${labels.length > 1 ? "s" : ""}: ${formattedLabels}`,
							layout.margin + 3,
							y,
							metrics.contentWidth - 5,
							layout,
							brandingAssets
						);

						doc.setFont("helvetica", "normal");
						y = addPdfTextSafe(
							doc,
							item.text || "",
							layout.margin + 3,
							y,
							metrics.contentWidth - 5,
							layout,
							brandingAssets
						);
						y += 2;

						if (item.subLabels && typeof item.subLabels === "object") {
							Object.entries(item.subLabels).forEach(([key, value]) => {
								y = ensurePdfSpace(doc, y, 8, layout, brandingAssets);
								y = addPdfTextSafe(
									doc,
									`  ${key}: ${value.text}`,
									layout.margin + 8,
									y,
									metrics.contentWidth - 12,
									layout,
									brandingAssets
								);
								y += 1;
							});
						}
						y += 2;
					});
				}
			}

			// === CHART + PERCENTAGES ===
			const image = get(exportDataPages).pages.find((page) => page.index === index)?.image;

			if (image) {
				const dims = await getImageDimensions(image);
				const aspectRatio = dims.width / dims.height;

				const chartW = Math.min(metrics.contentWidth * 0.55, 90);
				const chartH = chartW / aspectRatio;

				y = ensurePdfSpace(doc, y, chartH + 10, layout, brandingAssets);
				y += 3;
				y = addPdfSeparatorLine(doc, y, layout);
				y += 2;

				doc.addImage(image, "PNG", layout.margin, y, chartW, chartH);

				// Percentages beside the chart
				if (data[index]) {
					const percX = layout.margin + chartW + 10;
					const percMaxW = metrics.contentWidth - chartW - 15;
					let percY = y + 5;
					doc.setFontSize(11);
					doc.setFont("helvetica", "bold");
					percY = addPdfTextAtY(doc, "Verdeling per klasse:", percX, percY, percMaxW);
					percY += 2;

					const total = data[index].reduce((sum, item) => sum + item.value, 0);
					const colors: Record<string, [number, number, number]> = {
						A: [51, 153, 102],
						B: [153, 255, 204],
						C: [255, 255, 153],
						D: [255, 204, 102],
						E: [156, 65, 16]
					};

					doc.setFontSize(10);
					doc.setFont("helvetica", "normal");
					data[index].forEach((item) => {
						if (item.value > 0) {
							const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : "0.0";
							const c = colors[item.group] ?? [128, 128, 128];
							doc.setFillColor(c[0], c[1], c[2]);
							doc.roundedRect(percX, percY - 3, 6, 3.5, 1, 1, "F");
							percY = addPdfTextAtY(doc, `${item.group}: ${pct}%`, percX + 8, percY, percMaxW);
							percY += 1;
						}
					});
				}

				y += chartH + 5;
			}
		}

		// Footer on all pages (last, so page count is correct)
		drawPdfFooters(doc, layout, brandingAssets, "Pagina");

		return story.name + "_rapport_" + randomFilenameToken();
	}

	function downloadData(fileName: string) {
		doc.save(fileName + ".pdf");
		cleanupMemory();
	}

	function cleanupMemory() {
		if (doc) {
			doc = null as any;
		}
		exportDataPages.update((state) => ({
			...state,
			pages: state.pages.map((page) => ({ ...page, image: undefined }))
		}));
	}

	function randomFilenameToken(length: number = 8) {
		const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
		const bytes = new Uint8Array(length);
		crypto.getRandomValues(bytes);
		return Array.from(bytes, (b) => chars[b % chars.length]).join("");
	}
</script>

<Button
	kind={"tertiary"}
	icon={GeneratePdf}
	iconDescription={$_("tools.stories.downloadPDF")}
	tooltipPosition="bottom"
	disabled={disableDownloadButton}
	on:click={async () => {
		const fileName = await formatContent(data);
		if (fileName) downloadData(fileName);
	}}
/>
