<script lang="ts">
    import { _ } from "svelte-i18n";
    import { Button } from "carbon-components-svelte";
    import GeneratePdf from "carbon-icons-svelte/lib/GeneratePdf.svelte";
    import type { StoryStep } from "../StoryStep";
    import type { StoryChapter } from "../StoryChapter";
    import type { Story } from "../Story";
    import { jsPDF } from "jspdf";
    import { exportDataPages } from "./StoryChartExportDataPages";
    import { get } from "svelte/store";
    import type { LegendItem, LegendOptions } from "../LegendOptions";
    import type { Map } from "../../module/map";

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

    $: disableDownloadButton = $exportDataPages.pages.length < storyLength || $exportDataPages.pages.some(page => page.image === undefined);

    const PAGE_WIDTH = 210;
    const PAGE_HEIGHT = 297;
    const MARGIN = 20;
    const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
    const HEADER_HEIGHT = 18; // space reserved for logos at top
    const FOOTER_HEIGHT = 20;
    const BOTTOM_LIMIT = PAGE_HEIGHT - FOOTER_HEIGHT - 10;
    const CONTENT_TOP = MARGIN + HEADER_HEIGHT; // where content starts below logos
    const CHART_SIZE = 55; // square so donut isn't squeezed

    // Preloaded logo elements
    let zeelandLogo: HTMLImageElement | null = null;
    let sogelinkLogo: HTMLImageElement | null = null;

    function preloadImage(src: string): Promise<HTMLImageElement | null> {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = src;
        });
    }

    function getLineHeight(): number {
        return doc.getLineHeightFactor() * doc.getFontSize() / doc.internal.scaleFactor;
    }

    function getTextHeight(text: string, maxWidth: number): number {
        const lines = doc.splitTextToSize(text, maxWidth);
        return lines.length * getLineHeight();
    }

    /** Write text at y, returning the new y. Does NOT handle page breaks — use addTextSafe for long text. */
    function addTextAtY(text: string, x: number, y: number, maxWidth: number): number {
        const lines = doc.splitTextToSize(text, maxWidth);
        doc.text(lines, x, y);
        return y + lines.length * getLineHeight();
    }

    /** Write text that may span multiple pages. Splits line-by-line and breaks when needed. */
    function addTextSafe(text: string, x: number, y: number, maxWidth: number): number {
        const lines: string[] = doc.splitTextToSize(text, maxWidth);
        const lh = getLineHeight();
        for (const line of lines) {
            if (y + lh > BOTTOM_LIMIT) {
                doc.addPage();
                addPageHeader();
                y = CONTENT_TOP;
            }
            doc.text(line, x, y);
            y += lh;
        }
        return y;
    }

    function ensureSpace(needed: number, y: number): number {
        if (y + needed > BOTTOM_LIMIT) {
            doc.addPage();
            addPageHeader();
            return CONTENT_TOP;
        }
        return y;
    }

    function addPageHeader() {
        // Zeeland logo top-left
        if (zeelandLogo) {
            try { doc.addImage(zeelandLogo, 'PNG', MARGIN, MARGIN - 2, 30, 14); } catch {}
        }
        // Sogelink logo top-right
        if (sogelinkLogo) {
            try { doc.addImage(sogelinkLogo, 'PNG', PAGE_WIDTH - MARGIN - 14, MARGIN - 2, 14, 14); } catch {}
        }
        // Thin line below header
        doc.setDrawColor(200, 200, 200);
        doc.line(MARGIN, MARGIN + 14, PAGE_WIDTH - MARGIN, MARGIN + 14);
    }

    function addAllPageFooters() {
        const totalPages = doc.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(150, 150, 150);
            doc.text('Provincie Zeeland — Klimaatonderlegger', MARGIN, PAGE_HEIGHT - 12);
            doc.text(`Pagina ${i} / ${totalPages}`, PAGE_WIDTH - MARGIN - 25, PAGE_HEIGHT - 12);
            doc.setDrawColor(200, 200, 200);
            doc.line(MARGIN, PAGE_HEIGHT - 16, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 16);
            doc.setTextColor(0, 0, 0);
        }
    }

    function addSeparatorLine(y: number): number {
        doc.setDrawColor(200, 200, 200);
        doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
        return y + 5;
    }

    async function formatContent(data: Array<{ group: string; value: number }[]>) {
        if (!data) return undefined;

        // Preload logos
        [zeelandLogo, sogelinkLogo] = await Promise.all([
            preloadImage('/images/Zeeland_logo.png'),
            preloadImage('/images/SOGELINK_Logo_Monogramme_Bleu.png')
        ]);

        doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

        // === FRONT PAGE ===
        addPageHeader();
        let y = CONTENT_TOP + 5;

        // Title
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        y = addTextAtY(story.name, MARGIN, y, CONTENT_WIDTH);
        y += 2;

        // Subtitle
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        y = addTextAtY(story.description, MARGIN, y, CONTENT_WIDTH);
        doc.setTextColor(0, 0, 0);
        y += 3;

        // Date
        doc.setFontSize(9);
        doc.setTextColor(130, 130, 130);
        const now = new Date();
        y = addTextAtY(`gecreëerd op ${now.toLocaleDateString('nl-NL')} om ${now.toLocaleTimeString('nl-NL')}`, MARGIN, y, CONTENT_WIDTH);
        doc.setTextColor(0, 0, 0);
        y += 3;

        y = addSeparatorLine(y);
        y += 3;

        // Map screenshot
        try {
            const canvas = map.viewer.canvas;
            const mapImage = canvas.toDataURL('image/jpeg', 0.9);
            const aspectRatio = canvas.width / canvas.height;
            const imgWidth = CONTENT_WIDTH;
            const imgHeight = Math.min(imgWidth / aspectRatio, 120);
            doc.addImage(mapImage, 'JPEG', MARGIN, y, imgWidth, imgHeight);
        } catch {}

        // === STEP PAGES ===
        for (let index = 0; index < flattenedSteps.length; index++) {
            const { step, chapter } = flattenedSteps[index];
            doc.addPage();
            addPageHeader();
            y = CONTENT_TOP;

            // Step header with accent bar
            doc.setFillColor(33, 65, 112);
            doc.rect(MARGIN, y, 3, 12, 'F');

            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            y = addTextAtY(chapter.title, MARGIN + 7, y + 4, CONTENT_WIDTH - 10);

            doc.setFontSize(13);
            doc.setFont('helvetica', 'normal');
            y = addTextAtY(step.title, MARGIN + 7, y + 1, CONTENT_WIDTH - 10);
            y += 5;

            y = addSeparatorLine(y);
            y += 2;

            // Description
            const stepDescription = step.html || '';
            if (stepDescription) {
                const cleaned = stepDescription.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '');
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                y = addTextSafe(cleaned, MARGIN, y, CONTENT_WIDTH);
                y += 4;
            }

            // General legend text
            const generalLegendText = (layerLegends[index]?.generalLegendText || '').replace(/<[^>]*>/g, '');
            if (generalLegendText) {
                doc.setFontSize(10);
                doc.setFont('helvetica', 'italic');
                y = addTextSafe(generalLegendText, MARGIN, y, CONTENT_WIDTH);
                y += 4;
                doc.setFont('helvetica', 'normal');
            }

            // Legend items
            const legendItems = layerLegends[index]?.legendOptions;
            if (legendItems) {
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                y = ensureSpace(8, y);
                y = addTextAtY('Handelingsperspectief', MARGIN, y, CONTENT_WIDTH);
                y += 2;

                legendItems.forEach((item: LegendItem) => {
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'bold');
                    const labels = item.labels || '';
                    const formattedLabels = labels.length > 1 ? labels.split('').join(', ') : labels;
                    y = ensureSpace(12, y);
                    y = addTextSafe(`Label${labels.length > 1 ? 's' : ''}: ${formattedLabels}`, MARGIN + 3, y, CONTENT_WIDTH - 5);

                    doc.setFont('helvetica', 'normal');
                    y = addTextSafe(item.text || '', MARGIN + 3, y, CONTENT_WIDTH - 5);
                    y += 2;

                    if (item.subLabels && typeof item.subLabels === 'object') {
                        Object.entries(item.subLabels).forEach(([key, value]) => {
                            y = ensureSpace(8, y);
                            y = addTextSafe(`  ${key}: ${value.text}`, MARGIN + 8, y, CONTENT_WIDTH - 12);
                            y += 1;
                        });
                    }
                    y += 2;
                });
            }

            // === CHART + PERCENTAGES ===
            const image = get(exportDataPages).pages.find(page => page.index === index)?.image;

            if (image) {
                const dims = await getImageDimensions(image);
                const aspectRatio = dims.width / dims.height;

                const chartW = Math.min(CONTENT_WIDTH * 0.55, 90);
                const chartH = chartW / aspectRatio;

                y = ensureSpace(chartH + 10, y);
                y += 3;
                y = addSeparatorLine(y);
                y += 2;

                doc.addImage(image, 'PNG', MARGIN, y, chartW, chartH);

                // Percentages beside the chart
                if (data[index]) {
                    const percX = MARGIN + chartW + 10;
                    const percMaxW = CONTENT_WIDTH - chartW - 15;
                    let percY = y + 5;
                    doc.setFontSize(11);
                    doc.setFont('helvetica', 'bold');
                    percY = addTextAtY('Verdeling per klasse:', percX, percY, percMaxW);
                    percY += 2;

                    const total = data[index].reduce((sum, item) => sum + item.value, 0);
                    const colors: Record<string, [number, number, number]> = {
                        A: [51, 153, 102], B: [153, 255, 204],
                        C: [255, 255, 153], D: [255, 204, 102], E: [156, 65, 16]
                    };

                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'normal');
                    data[index].forEach(item => {
                        if (item.value > 0) {
                            const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0.0';
                            const c = colors[item.group] ?? [128, 128, 128];
                            doc.setFillColor(c[0], c[1], c[2]);
                            doc.circle(percX + 3, percY - 1.2, 2.5, 'F');
                            percY = addTextAtY(`${item.group}: ${pct}%`, percX + 9, percY, percMaxW);
                            percY += 1;
                        }
                    });
                }

                y += chartH + 5;
            }
        }

        // Footer on all pages (last, so page count is correct)
        addAllPageFooters();

        return story.name + '_rapport_' + randomFilenameToken();
    }

    function downloadData(fileName: string) {
        doc.save(fileName + '.pdf');
        cleanupMemory();
    }

    function cleanupMemory() {
        if (doc) { doc = null as any; }
        exportDataPages.update(state => ({
            ...state,
            pages: state.pages.map(page => ({ ...page, image: undefined }))
        }));
    }

    function randomFilenameToken(length: number = 8) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const bytes = new Uint8Array(length);
        crypto.getRandomValues(bytes);
        return Array.from(bytes, b => chars[b % chars.length]).join('');
    }

    function getImageDimensions(src: string): Promise<{ width: number; height: number }> {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
            img.onerror = () => resolve({ width: 160, height: 100 }); // safe fallback
            img.src = src;
        });
    }
</script>

<Button
    kind={"tertiary"}
    icon={GeneratePdf}
    iconDescription={$_("tools.stories.downloadPDF")}
    tooltipPosition="top"
    disabled={disableDownloadButton}
    on:click={async () => {
        const fileName = await formatContent(data);
        if (fileName) downloadData(fileName);
    }}
/>