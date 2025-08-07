<script lang="ts">
	import { Button, Loading, Modal } from "carbon-components-svelte";
	import { Exit, CaretRight, Save } from "carbon-icons-svelte";
	import type { GameController } from "../module/game-controller";

	export let gameController: GameController;
	export let open: boolean;

	const activeGame = gameController.active;

	$: layersLoaded = $activeGame?.floodLayerController.floodLayer.loaded;
	$: roadsLoaded = $activeGame?.evacuationController.roadNetwork.loaded;
	$: hexagonsLoaded = $activeGame?.evacuationController.hexagonLayer.loaded;

	$: gameLoaded = $layersLoaded && $roadsLoaded && $hexagonsLoaded;

</script>


<Modal
	bind:open
	passiveModal={true}
	modalHeading={""}
	id="start-menu-modal"
	preventCloseOnClickOutside={true} 
>
	<div class="start-menu-content">
		<img src="https://www.interregnorthsea.eu/sites/default/files/media-object/2024-09/FIER-Logo-PO-DeepWater_Klein%20formaat_wit.png" alt="FIER Logo" width=200 />
		<h1 class="intro-header">Serious Game - Overstromingen</h1>
		<p class="intro-text">
			In deze game neem jij de leiding tijdens een acute overstromingsdreiging in Zeeland. De klok tikt, het water stijgt, en de veiligheid van duizenden mensen ligt in jouw handen.
		</p>
		<p class="intro-text">
			Als speler kruip je in de huid van een crisismanager. Op basis van actuele data - zoals overstromingsmodellen, belasting van het wegennetwerk, kwetsbare gebieden en bevolkingsdichtheid - moet je razendsnelle maar doordachte beslissingen nemen.
		</p>
		<p class="intro-text">
			Evacueren of niet? Welke routes blijven open? En hoe ga je om met beperkte middelen en tijdsdruk?
		</p>
		<p class="intro-text">
			Je keuzes bepalen het verloop van de ramp - en de gevolgen zijn voelbaar.
		</p>
		<p class="intro-text">
			Ben jij klaar om Zeeland te beschermen?
		</p>
		{#if gameLoaded}
			<div class="start-menu-actions">
				<Button
					kind="danger"
					icon={Exit}
					on:click={() => gameController.exit()}
				>Exit Game</Button>
				{#if $activeGame}
					<Button
						kind="primary"
						icon={Save}
						on:click={() => $activeGame.save()}
					>Save Game</Button>
				{/if}
				<Button
					kind="primary"
					icon={CaretRight}
					on:click={() => {
						open = false;
						$activeGame?.startCutscene();
					}}
				>Start</Button>
			</div>
		{:else}
			<div class="loading-container">
				<Loading withOverlay={false} />
				<div class="loading-status">
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
			</div>
		{/if}
	</div>
</Modal>


<style>

	:global(#start-menu-modal .bx--modal-container) {
		background-color: rgb(var(--game-color-bg));
	}
	:global(#start-menu-modal .bx--modal-close) {
		display: none;
	}
	
	.start-menu-content {
		text-align: center;
		padding: 1rem;
		color: var(--game-color-text);
	}

	.intro-header {
		font-weight: 500;
		margin-bottom: 1rem;
	}

	.intro-text {
		margin: 1rem 0;
		line-height: 1.5;
	}

	.start-menu-actions {
		margin-top: 2rem;
	}

	.loading-container {
		display: flex;
		justify-content: center;
		align-items: center;
		column-gap: 2rem;
		height: 150px;
	}

	.loading-status {
		text-align: left;
	}

</style>