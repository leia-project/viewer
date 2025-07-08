<script lang="ts">
	import { Button } from "carbon-components-svelte";
	import { ThunderstormScatteredNight, VehicleInsights } from "carbon-icons-svelte";
	import type { Game } from "../../module/game";
	import HexagonEvacuationEntries from "./HexagonEvacuationEntries.svelte";
	import type { Readable } from "svelte/motion";
	import type { Evacuation } from "../../module/game-elements/evacuation";

	export let game: Game;

	let evacuations: Readable<Array<Evacuation>>;

	const hexagonsLoaded = game.evacuationController.hexagonLayer.loaded;

	hexagonsLoaded.then(() => {
		evacuations = game.evacuationController.evacuations;
	});

	let openOverview = false;

</script>

<div class="evacuations">
	{#if openOverview}
		{#await hexagonsLoaded then}
			<div class="evacuation-overview">
				<div>Evacuaties</div>
				{#if $evacuations.length > 0}
					<ul>
						{#each $evacuations as evacuation}
							<HexagonEvacuationEntries {evacuation} />
						{/each}
					</ul>
				{:else}
					<p>No evacuations in progress.</p>
				{/if}
			</div>
		{/await}
	{/if}

	<div class="buttons">
		<Button
			kind="secondary"
			size="default"
			icon={VehicleInsights}
			iconDescription="Evacuaties"
			on:click={() => openOverview = !openOverview}
		/>
	</div>
</div>

<style>

	.evacuations {
		text-align: end;
		padding: 0.5rem;
	}
	
	.evacuation-overview {
		background-color: var(--game-color-bg);
		color: var(--game-color-text);
		padding: 0.5rem;
		margin-bottom: 0.5rem;
		text-align: start;
	}

</style>