<script lang="ts">
	import { Button, Loading, Modal } from "carbon-components-svelte";
	import { Exit, CaretRight } from "carbon-icons-svelte";
	import type { GameController } from "../module/game-controller";

	export let gameController: GameController;
	export let open: boolean;

	const activeGame = gameController.active;

	$: layersLoaded = $activeGame?.loaded;
	$: roadsLoaded = $activeGame?.evacuationController.roadNetwork.loaded;
	$: hexagonsLoaded = $activeGame?.evacuationController.hexagonLayer.loaded;

	$: gameLoaded = $layersLoaded && $roadsLoaded && $hexagonsLoaded;

</script>


<Modal
	bind:open
	passiveModal={true}
	modalHeading={""}
	id="start-menu-modal"
>
	<div class="start-menu-content">
		<h1>Serious Game - Floods</h1>
		<div>[image]</div>
		<p>
			Explanations about the game...
		</p>
		{#if !gameLoaded}
			<div class="start-menu-actions">
				<Button
					kind="danger"
					icon={Exit}
					on:click={() => gameController.exit()}
				>Exit Game</Button>
				<Button
					kind="primary"
					icon={CaretRight}
					on:click={() => open = false}
				>Start</Button>
			</div>
		{:else}
			<div class="loading-container">
				<Loading withOverlay={false} />
				{#if !$roadsLoaded}
					<p>Loading road network...</p>
				{/if}
				{#if !$hexagonsLoaded}
					<p>Loading hexagons...</p>
				{/if}
				{#if !$layersLoaded}
					<p>Loading flood layer...</p>
				{/if}
			</div>
		{/if}
	</div>
</Modal>


<style>

	:global(#start-menu-modal .bx--modal-container) {
		background-color: var(--game-color-bg);
	}

	.start-menu-content {
		text-align: center;
		padding: 1rem;
		color: var(--game-color-text);
	}

	.start-menu-actions {
		margin-top: 2rem;
	}

	.loading-container {
		display: flex;
		justify-content: center;
		align-items: center;
		height: 150px;
	}

</style>