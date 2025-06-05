<script lang="ts">
  import { createEventDispatcher } from "svelte";
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
  <button class="nav-btn prev" on:click={prev}>
    <CaretLeft />
  </button>
  {#each labels as label, idx (label)}
    {#if shouldShowButton(idx)}
      <button
        class:selected={page === idx + 1}
        on:click={() => goTo(idx + 1)}
        aria-current={page === idx + 1 ? "page" : undefined}
      >
        {label}
      </button>
    {/if}
  {/each}
  <button class="nav-btn next" on:click={next}>
    <CaretRight />
  </button>
</nav>

<style>
.custom-pagination-nav {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.125rem;
    font-family: inherit;
    margin-top: 4px;
}

.custom-pagination-nav button {
    min-width: 2rem;
    height: 2rem;
    padding: 0 0.5rem;
    margin: 0 0.125rem;
    border: none;
    border-radius: 0.125rem;
    background: transparent;
    color: var(--cds-text-01, #161616);
    font-size: 0.8rem;
    font-weight: 400;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
    outline: none;
}

.custom-pagination-nav button.selected,
.custom-pagination-nav button[aria-current="page"] {
    background: var(--cds-interactive-01, #0f62fe);
    color: var(--cds-ui-01, #fff);
    font-weight: 600;
}

.custom-pagination-nav button:hover:not([aria-current="page"]):not(:disabled) {
    background: var(--cds-hover-ui, #e5e5e5);
}

.custom-pagination-nav .nav-btn {
    background: transparent;
    color: var(--cds-interactive-01, #0f62fe);
    font-weight: 600;
    min-width: 2.5rem;
    transition: background 0.15s, color 0.15s;
}

.custom-pagination-nav .nav-btn:disabled {
    color: var(--cds-disabled-02, #c6c6c6);
    cursor: not-allowed;
    background: transparent;
}

.custom-pagination-nav button:focus {
    outline: 2px solid var(--cds-focus, #0f62fe);
    outline-offset: 2px;
}
</style>