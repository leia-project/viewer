<script lang="ts">
  import { createEventDispatcher } from "svelte";
	import { Button } from "carbon-components-svelte";
  import CaretLeft from "carbon-icons-svelte/lib/CaretLeft.svelte";
  import { CaretRight } from "carbon-icons-svelte";

  export let labels: string[] = [];
  export let page: number = 1; // 1-based index for consistency with PaginationNav
  export let shown: number = 10; // How many buttons to show at once (optional)
  export let loop: boolean = false;
  export let forwardText: string = "Next";
  export let backwardText: string = "Previous";

  const dispatch = createEventDispatcher();

  function goTo(idx: number) {
    if (idx < 1) {
      if (loop) idx = labels.length;
      else return;
    }
    if (idx > labels.length) {
      if (loop) idx = 1;
      else return;
    }
    page = idx;
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
    if (page === 1 && idx < Math.min(3, labels.length)) return true;
    // If current page is the last step, show last 3 steps (if they exist)
    if (page === labels.length && idx >= Math.max(labels.length - 3, 0)) return true;
    // Otherwise, show one before, current, and one after (default)
    if (idx >= page - 2 && idx <= page) return true;
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
  {#each labels as label, idx (label)}
    {#if shouldShowButton(idx)}
      <Button
        kind={page === idx + 1 ? "tertiary" : "ghost"}
        size="small"
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
    justify-content: space-between;
    gap: 0.125rem;
    font-family: inherit;
    margin-top: 4px;
}

</style>