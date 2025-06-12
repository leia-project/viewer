<script lang="ts">
  import { createEventDispatcher } from "svelte";
	import { Button } from "carbon-components-svelte";
  import CaretLeft from "carbon-icons-svelte/lib/CaretLeft.svelte";
  import { CaretRight } from "carbon-icons-svelte";
	import type { StoryStep } from "./StoryStep";
	import type { StoryChapter } from "./StoryChapter";

  export let flattenedSteps: Array<{ step: StoryStep; chapter: StoryChapter }>;
  export let page: number; // same 'page' as in StoryView
  let index: number = page - 1;
  let activeChapterIndex: number = 0; // first index of the active chapter in flattenedSteps
  let labels: string[] = [];

  // When page changes...
  $: {
    index = page - 1;
    let activeEntry = flattenedSteps[index];
    let activeChapter = activeEntry.chapter;
    activeChapterIndex = flattenedSteps.findIndex(
      (entry) => entry.chapter.id === activeChapter.id
    );
    let activeChapterSteps = activeChapter.steps;

    // Get titles of steps
    labels = activeChapterSteps.map(step => step.title);
  }

  const dispatch = createEventDispatcher();

  function goTo(idx: number) {
    if (idx < 1) {
      return;
    }
    if (idx > labels.length) {
      return;
    }
    page = activeChapterIndex + idx;
    dispatch("change", { page });
  }

  function next() {
    goTo(page + 1);
  }

  function prev() {
    goTo(page - 1);
  }

  function shouldShowButton(idx: number): boolean {
    // If current page is the first step, show steps 1, 2, 3 (if they exist)
    if (index === activeChapterIndex && idx < Math.min(3, labels.length)) {
      return true;
    }

    // If current page is the last step, show last 3 steps (if they exist)
    if (index === activeChapterIndex + labels.length - 1 && idx >= Math.max(labels.length - 3, 0)) {
      return true;
    }

    // Otherwise, show one before, current, and one after (default)
    if (activeChapterIndex + idx >= index - 1 && activeChapterIndex + idx <= index + 1) {
      return true;
    }

    return false;
  }
</script>

<nav class="custom-pagination-nav">
  <Button 
    kind="ghost" 
    size="small" 
    on:click={prev}
  >
    <CaretLeft />
  </Button>
  {#each labels as label, idx (idx)}
    {#if shouldShowButton(idx)}
      <Button
        kind={page === activeChapterIndex + idx + 1 ? "tertiary" : "ghost"}
        size="small"
        style="margin: 0.1rem; padding: 0 8px; width: fit-content; min-width: 30px;"
        on:click={() => goTo(idx + 1)}
      >
        {label}
      </Button>
    {/if}
  {/each}
  <Button
    kind="ghost"
    size="small"
    on:click={next}
  >
    <CaretRight />
  </Button>
</nav>

<style>
.custom-pagination-nav {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 4px;
}


</style>