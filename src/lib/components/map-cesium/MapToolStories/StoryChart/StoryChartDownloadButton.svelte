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

    // Flatten the steps across all chapters so we can access the correct step based on the index
	let flattenedSteps: Array<{ step: StoryStep; chapter: StoryChapter }> = [];
	story.storyChapters.forEach((chapter) => {
		chapter.steps.forEach((step) => {
			flattenedSteps.push({ step, chapter });
		});
	});
    const storyLength = flattenedSteps.length;

    $: disableDownloadButton = $exportDataPages.pages.length < storyLength || $exportDataPages.pages.some(page => page.image === undefined);


    function formatContent(data: Array<{ group: string; value: number }[]>) {
        if (!data) return undefined;

        // Add file header to first page
        doc = new jsPDF();

        setHeadingFont(doc);
        let frontPageContent = `${story.name}\n${story.description}\n`;
        const currentDate = new Date();
        const dateHeader = `Downloaded on: ${currentDate.toLocaleDateString()} at ${currentDate.toLocaleTimeString()}\n\n`;
        frontPageContent += dateHeader;
        addSplitText(doc, frontPageContent, 15, 15, 180);

        const canvas = map.viewer.canvas;
        const mapImage = canvas.toDataURL("image/jpeg", 1.0);
        const aspectRatio = canvas.width / canvas.height;
        const imageHeight = 120;
        const imageWidth = imageHeight * aspectRatio;
        doc.addImage(mapImage, 'JPEG', 15, 60, imageWidth, imageHeight);

        // Loop through each step and add data to seperate pages
        // Use seperate page for each step's text and image
        flattenedSteps.forEach((flattenedStep, index) => {
            const { step, chapter } = flattenedStep;
            doc.addPage();

            // Page header
            setHeadingFont(doc);
            let stepHeader = `${chapter.title} - ${step.title}\n`;
            addSplitText(doc, stepHeader, 15, 20, 180);

            // Page content
            setNormalFont(doc);
            let content = '';

            const stepDescription = step.html || '';
            if (stepDescription) {
                const cleanedDescription = stepDescription.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '');
                content += `${cleanedDescription}\n\n`;
            }

            const generalLegendText = (layerLegends[index]?.generalLegendText || '').replace(/<[^>]*>/g, ''); // Strip HTML tags
            if (generalLegendText) content += `${generalLegendText}\n\n`;

            const legendItems = layerLegends[index]?.legendOptions || undefined;
            if (legendItems) {
                content += `\nHandelingsperspectief\n\n`;
                legendItems.forEach((item: LegendItem) => {
                    const labels = item.labels || 'N/A';
                    const labelWord = labels.length > 1 ? 'Labels' : 'Label';
                    const formattedLabels = labels.length > 1 
                        ? labels.split('').join(', ') 
                        : labels;
                    content += `* ${labelWord}: ${formattedLabels}\n`;

                    const text = item.text || 'N/A';
                    content += `${text}\n\n`;

                    const subLabels = item.subLabels;
                    if (subLabels && typeof subLabels === 'object') {
                        Object.entries(subLabels).forEach(([key, value]) => {
                            content += `\t- ${key}: ${value.text}\n\n`;
                        });
                    }
                });
            };

            // Add text to page
            content = content.trim();
            addSplitText(doc, content, 15, 30, 180); 

            // Add image to new page
            const image = get(exportDataPages).pages.find(page => page.index === index)?.image;
            if (image) {
                doc.addPage(); 
                setHeadingFont(doc);
                addSplitText(doc, stepHeader, 15, 20, 180);
                doc.addImage(image, 'PNG', 15, 30, 198, 110);

                // Add all groups and values for this data point as percentages
                if (data[index]) {
                    setSubheadingFont(doc);
                    let legendText = `Percentage per klasse:\n`;
                    const total = data[index].reduce((sum, item) => sum + item.value, 0);
                    data[index].forEach(item => {
                        const percentage = total > 0 ? ((item.value / total) * 100).toFixed(2) : '0.00';
                        legendText += `${item.group}: ${percentage}%\n`;
                    });
                    // Add legend text to page
                    addSplitText(doc, legendText, 15, 150, 180); 
                };
            }
        });

        const token = randomFilenameToken();
        const fileName = story.name + '_data_' + token;

        return fileName;
    };

    
    function addSplitText(doc: jsPDF, text: string, x: number = 15, y: number = 15, maxWidth: number = 180) {
        const splitText = doc.splitTextToSize(text, maxWidth);
        doc.text(splitText, x, y);
    };


    function setHeadingFont(doc: jsPDF) {
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
    };


    function setSubheadingFont(doc: jsPDF) {
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
    };


    function setNormalFont(doc: jsPDF) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
    };


    function downloadData(fileName: string) {
        doc.save(fileName + '.pdf');
        cleanupMemory();
    };


    function cleanupMemory() {
        if (doc) {
            doc = null as any;
        }

        // Clear all stored images from the exportDataPages store
        exportDataPages.update(state => ({
            ...state,
            pages: state.pages.map(page => ({
                ...page,
                image: undefined
            }))
        }));
    };


    // Random filename token string generator
    function randomFilenameToken(length: number = 8) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const bytes = new Uint8Array(length);
        crypto.getRandomValues(bytes);
        return Array.from(bytes, b => chars[b % chars.length]).join('');
    };

</script>

<Button
    kind={"tertiary"}
    icon = {GeneratePdf}
    iconDescription={$_("tools.stories.downloadPDF")}
    tooltipPosition="top"
    disabled={disableDownloadButton}
    on:click= {() => {
        const fileName = formatContent(data);
        if (fileName) downloadData(fileName);
    }}
/>

<style>

</style>