<script lang="ts">
	import type { Writable } from "svelte/store";
	import { _ } from "svelte-i18n";
	import { Close } from "carbon-icons-svelte";
	import { Button } from "carbon-components-svelte";
	import type { Breach } from "./layer-controller";

	export let breach: Breach;
	export let active: Writable<Breach | undefined>;
	export let hovered: Writable<Breach | undefined>;
		
	export let showInfo: boolean = true;

	const name = breach.properties.name;
	const dijkring = breach.properties.dijkring;

	$: hoveredBoolean = $hovered === breach;
	$: activeBoolean = $active === breach;

	function entryClick(): void {
		if (breach !== $active) active.set(breach);
		showInfo = true;
	}

</script>



<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
<div class="container" class:active={activeBoolean} on:mouseenter={() => hovered.set(breach)} on:mouseleave={() => hovered.set(undefined)}>
	<div class="entry" on:click={entryClick} class:entry-hovered={hoveredBoolean}>
		<div class="entry-prefix">
			<span class="encircled-text">
				{dijkring}
			</span>
		</div>
		<div class="entry-body">
			<div>{name}</div>
		</div>
		{#if activeBoolean}
			<Button
				kind="ghost"
				iconDescription={"Close"}
				icon={Close}
				size="small"
				on:click={() => active.set(undefined)}
			/>
		{/if}
	</div>
	<slot name="info" />
</div>


<style>
	
	.container {
		border: 1px solid transparent;
		border-radius: 5px;
		cursor: pointer;
		transition: background-color 0.3s;
	}
	.active.container, .container:hover {
		background-color: #e1f1fa; 
	}
	.active.container {
		cursor: default;
	}
	.entry {
		width: 100%;
		border: 1px solid var(--cds-ui-03);
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-radius: 5px;
		height: 2.5rem;
	}
	.entry-prefix {
		padding: 0 var(--cds-spacing-03);
	}
	.encircled-text {
		display: inline-block;
		width: 1.5rem;
		height: 1.5rem;
		border-radius: 50%;
		background-color: var(--cds-ui-01);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.entry-body {
		flex-grow: 1;
		white-space: nowrap;
		overflow: hidden;
	}
	

</style>