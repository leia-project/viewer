<script lang="ts">
	import { _ } from "svelte-i18n";
	import { Button } from "carbon-components-svelte";
    import GeneratePdf from "carbon-icons-svelte/lib/GeneratePdf.svelte";
	import type { StoryStep } from "./StoryStep";
	import type { StoryChapter } from "./StoryChapter";
	import type { Story } from "./Story";
    import { jsPDF } from "jspdf";

    export let data: Array<{ group: string; value: number }[]>;
    export let story: Story;

    //make some mock data
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
            { group: "B", value: 10 },
            { group: "C", value: 15 },
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

        // File header
        const storyHeader = `${story.name}\n${story.description}\n`;
        const currentDate = new Date();
        const dateHeader = `Downloaded on: ${currentDate.toLocaleDateString()} ${currentDate.toLocaleTimeString()}\n\n`;
        let content = storyHeader + dateHeader;

        // Loop through each step
        flattenedSteps.forEach((flattenedStep, index) => {
            const { step, chapter } = flattenedStep;
            content += `Chapter: ${chapter.title}\n`;
            content += `Step: ${step.title}\n`;
            
            // Add all groups and values for this data point
            if (data[index]) {
                data[index].forEach(item => {
                    content += `${item.group}: ${item.value}\n`;
                });
            }
            content += '\n'; // Add a newline between steps
        });

        return content;
    }

    function downloadData(content: string, filename: string) {
        // Default export is a4 paper, portrait, using millimeters for units
        const doc = new jsPDF();

        doc.text(content, 10, 10);
        doc.save(filename + '.pdf');
    }
</script>

<Button
    kind={"tertiary"}
    icon = {GeneratePdf}
    iconDescription={$_("tools.stories.downloadPDF")}
    tooltipPosition="top"
    on:click= {() => {
        console.log("Download chart data:", data);
        const content = formatContent(mockData);
        if (content) downloadData(content, story.name+'_data');
    }}
/>
<style>

</style>