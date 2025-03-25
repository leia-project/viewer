<script lang="ts">
	import { _ } from "svelte-i18n";	
	import { ProgressBar } from "carbon-components-svelte";
	import { InformationFilled, Reset, TrashCan, ViewFilled, ViewOffFilled } from "carbon-icons-svelte";

	import type { QA } from "../module/qa";
	import type { MarvinApp } from "../marvin";

	export let app: MarvinApp;
	export let qa: QA;

	const qaResult = qa.result;

	let showLayer = true;
	let loading = qa.loading;
	let error = qa.error;
	$: hasError = error !== undefined;
	let color = qa.color;
	let openState = false;

	$: () => {
		if (showLayer) {
			qa.showLayers();
		} else {
			qa.hideLayers();
		}
	};

	function deleteQA() {
		app.qaManager.removeEntry(qa.id);
	}

	function refresh() {
		qa.askGeo();
	}

	function switchModalState() {
		openState = !openState;
	}
</script>


<div class="qa-card">
    {qa.question}
    {#if loading}
        <ProgressBar />
    {:else if $qaResult?.features}
        {#if $qaResult.hasGeometry}
            <div class="qa-features">{$_("qa.foundFeatures")}: {$qaResult.features.length()}</div>
        {/if}
        <div class="qa-summary">
            {$qaResult.summary}
        </div>
    {/if}

    {#if qa.error}
        <div class="qa-error">{app.qaManager.getQAError(`qa.errors.${qa.error}`)}</div>
    {/if}

    <div class="qa-color-bar" style="background-color: {color};"></div>

    <div class="qa-actions">
        {#if !loading}
            {#if $qaResult?.features}
                <button on:click={switchModalState} class="qa-btn qa-btn-primary">
                    <InformationFilled color="#fff" />
                </button>
                <button
                    class="qa-btn qa-btn-primary"
                    on:click={() => {
                        showLayer = !showLayer;
                    }}
                >
                    {#if showLayer}
                        <ViewFilled color="#fff" />
                    {:else}
                        <ViewOffFilled color="#fff" />
                    {/if}
                </button>
            {/if}

            <button on:click={refresh} class="qa-btn qa-btn-primary">
                <Reset color="#fff" />
            </button>
            <button on:click={deleteQA} class="qa-btn qa-btn-error">
                <TrashCan color="#fff" />
            </button>
        {/if}
    </div>
</div>



<style>
    .qa-card {
        background-color: var(--surface-100);
        border: 1px solid var(--surface-100);
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        border-radius: 0.375rem;
        padding: 0.75rem;
        color: black;
        background-opacity: 0.4;
    }

    .qa-features {
        color: var(--surface-600);
        font-size: 0.875rem; /* Equivalent to text-sm */
    }

    .qa-summary {
        color: var(--surface-500);
        font-size: 0.875rem; /* Equivalent to text-sm */
    }

    .qa-error {
        color: var(--error-600);
        font-size: 0.875rem; /* Equivalent to text-sm */
    }

    .qa-color-bar {
        position: absolute;
        top: 0;
        left: 0;
        height: 0.25rem; /* Equivalent to h-1 */
        width: 100%;
        border-top-left-radius: 0.375rem;
        border-top-right-radius: 0.375rem;
    }

    .qa-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
    }

    .qa-btn {
        border: none;
        border-radius: 0.375rem;
        padding: 0.5rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .qa-btn-primary {
        background-color: var(--primary-500);
        color: white;
    }

    .qa-btn-primary:hover {
        background-color: var(--primary-600);
    }

    .qa-btn-error {
        background-color: var(--error-500);
        color: white;
    }

    .qa-btn-error:hover {
        background-color: var(--error-600);
    }
</style>