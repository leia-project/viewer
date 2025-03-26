<script lang="ts">
	import { _ } from "svelte-i18n";	
	import { Button, ProgressBar } from "carbon-components-svelte";
	import { InformationFilled, Repeat, TrashCan, ViewFilled, ViewOffFilled } from "carbon-icons-svelte";

	import type { QA } from "../module/qa";
	import type { MarvinApp } from "../marvin";
	import QaModal from "./QAModal.svelte";
	import { createEventDispatcher } from "svelte";

	export let app: MarvinApp;
	export let qa: QA;

	const qaResult = qa.result;

	let showLayer = true;
	const loading = qa.loading;
	const qaEror = qa.error;
	let color = qa.color;
	let openState = false;

	$: {
		if (showLayer) {
			qa.showLayers();
		} else {
			qa.hideLayers();
		}
	};

	function deleteQA(): void {
		app.qaManager.removeEntry(qa.id);
	}

	function refresh(): void {
		qa.askGeo();
	}

	function switchModalState(): void {
		openState = !openState;
	}

	const dispatch = createEventDispatcher();

</script>


<div class="qa-card">
	<div>{qa.question}</div>
	{#if $loading}
		<ProgressBar />
	{:else if $qaResult?.features}
		{#if $qaResult.hasGeometry}
			<div class="qa-features">{$_("qa.foundFeatures")}: {$qaResult.features.length()}</div>
		{/if}
		<div class="qa-summary">
			{$qaResult.summary}
		</div>
	{/if}

	{#if $qaEror}
		<div class="qa-error">{app.qaManager.getQAError(`qa.errors.${$qaEror}`)}</div>
	{/if}

	<div class="qa-color-bar" style="background-color: {color};"></div>

	<div class="qa-actions">
		{#if !$loading}
			{#if $qaResult?.features}
				<Button
					icon={InformationFilled}
					size="small"
					iconDescription={"Info"}
					tooltipPosition="top"
					on:click={() => dispatch("openModal", { component: QaModal, props: { qa: qa, open: true } })}
				/>
				<Button
					icon={showLayer ? ViewFilled : ViewOffFilled}
					size="small"
					iconDescription={showLayer ? "Hide" : "Show"}
					tooltipPosition="top"
					on:click={() => {
						showLayer = !showLayer;
					}}
				/>
			{/if}
			<Button
				icon={Repeat}
				size="small"
				iconDescription={"Repeat Query"}
				tooltipPosition="top"
				on:click={refresh}
			/>
			<Button
				icon={TrashCan}
				size="small"
				kind="danger"
				iconDescription={"Delete"}
				tooltipPosition="top"
				tooltipAlignment="end"
				on:click={deleteQA}
			/>
		{/if}
	</div>
</div>

<!-- <QaModal {qa} bind:open={openState} />
 -->

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

</style>