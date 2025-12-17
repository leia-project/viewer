<script lang="ts">
	import { _ } from "svelte-i18n";
	import { Button } from "carbon-components-svelte";
    import GeneratePdf from "carbon-icons-svelte/lib/GeneratePdf.svelte";
	import type { StoryStep } from "../StoryStep";
	import type { StoryChapter } from "../StoryChapter";
	import type { Story } from "../Story";
    import { jsPDF } from "jspdf";

    export let data: Array<{ group: string; value: number }[]>;
    export let story: Story;
    
    export let doc = new jsPDF();

    // import { option } from "./StoryChart.svelte";
    // console.log("Imported chart option:", option);

    // Make some mock data
    let mockData: Array<{ group: string; value: number }[]> = [
        [
            { group: "A", value: 10 },
            { group: "B", value: 20 },
            { group: "C", value: 30 },
        ],
        [
            { group: "A", value: 15 },
            { group: "B", value: 25 },
            { group: "C", value: 35 },
        ],
        [
            { group: "A", value: 5 },
            { group: "B", value: 10 }
        ],
    ];

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
            
            // Add all groups and values for this data point
            if (data[index]) {
                data[index].forEach(item => {
                    content += `${item.group}: ${item.value}\n`;
                });
            }
            doc.text(content, 10, 10); // Add text to current page
            // TODO: add images/charts to current page
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
        doc.addImage(image, 'PNG', 15, 40, 180, 100); // Adjust position and size as needed
    }
</script>

<Button
    kind={"tertiary"}
    icon = {GeneratePdf}
    iconDescription={$_("tools.stories.downloadPDF")}
    tooltipPosition="top"
    on:click= {() => {
        console.log("Download chart data:", data);
        const fileName = formatContent(mockData);
        if (fileName) downloadData(fileName);
    }}
/>
<style>

</style>