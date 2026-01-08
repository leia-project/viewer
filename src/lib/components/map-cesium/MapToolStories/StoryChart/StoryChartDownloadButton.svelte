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

    export let data: Array<{ group: string; value: number }[]>;
    export let story: Story;

    let doc: jsPDF;

    // Flatten the steps across all chapters so we can access the correct step based on the index
	let flattenedSteps: Array<{ step: StoryStep; chapter: StoryChapter }> = [];
	story.storyChapters.forEach((chapter) => {
		chapter.steps.forEach((step) => {
			flattenedSteps.push({ step, chapter });
		});
	});


    function formatContent(data: Array<{ group: string; value: number }[]>) {
        if (!data) return undefined;

        // Add file header to first page
        doc = new jsPDF();
        const storyHeader = `${story.name}\n${story.description}\n`;
        const currentDate = new Date();
        const dateHeader = `Downloaded on: ${currentDate.toLocaleDateString()} ${currentDate.toLocaleTimeString()}\n\n`;
        const headerContent = storyHeader + dateHeader;
        doc.text(headerContent, 10, 10);

        // Loop through each step and add data to seperate pages
        flattenedSteps.forEach((flattenedStep, index) => {
            doc.addPage(); // Add a new page for each step
            let content = '';
            const { step, chapter } = flattenedStep;
            content += `Chapter: ${chapter.title}\n`;
            content += `Step: ${step.title}\n`;
            
            // Add all groups and values for this data point as percentages
            if (data[index]) {
                const total = data[index].reduce((sum, item) => sum + item.value, 0);
                data[index].forEach(item => {
                    const percentage = total > 0 ? ((item.value / total) * 100).toFixed(2) : '0.00';
                    content += `${item.group}: ${percentage}%\n`;
                });
            }

            //add content to exportDataPages store
            exportDataPages.update(dataPages => {
                let existingPage = dataPages.pages.find(page => page.index === index);
                if (!existingPage) {
                    dataPages.pages.push({ index, content: content, image: undefined });
                }
                else {
                    existingPage.content = content;
                }
                return dataPages;
            });

            doc.text(content, 10, 10); // Add text to current page

            const image = get(exportDataPages).pages.find(page => page.index === index)?.image;
            if (image) doc.addImage(image, 'PNG', 15, 80, 180, 100);
            // doc.addImage(chartImages[index], 'PNG', 15, 40, 180, 100);
        });

        const token = randomFilenameToken();
        const fileName = story.name + '_data_' + token;

        return fileName;
    }


    function downloadData(fileName: string) {
        doc.save(fileName + '.pdf');
    }

    // Random filename token string generator
    function randomFilenameToken(length: number = 8) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const bytes = new Uint8Array(length);
        crypto.getRandomValues(bytes);
        return Array.from(bytes, b => chars[b % chars.length]).join('');
    }

    export function addChartImageToPage(image: any, pageIndex: number) {
        doc.setPage(pageIndex);
        doc.addImage(image, 'JPEG', 150, 1000, 180, 100); // Adjust position and size as needed
    }
</script>

<!-- disabled={!$exportDataPages.ready} -->
<Button
    kind={"tertiary"}
    icon = {GeneratePdf}
    iconDescription={$_("tools.stories.downloadPDF")}
    tooltipPosition="top"
    disabled={!data}
    on:click= {() => {
        const fileName = formatContent(data);
        if (fileName) downloadData(fileName);
    }}
/>

<style>

</style>