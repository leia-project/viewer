<script lang="ts">
	import { _ } from "svelte-i18n";
	import { Button, Loading, Modal } from "carbon-components-svelte";
	import { Exit, CaretRight, Save, Book, CaretLeft } from "carbon-icons-svelte";
	import type { GameController } from "../../module/game-controller";
	import GameButton from "../general/GameButton.svelte";
	import LanguageSwitcher from "./LanguageSwitcher.svelte";
	import Manual from "./Manual.svelte";

	export let gameController: GameController;
	export let open: boolean;

	const activeGame = gameController.active;

	$: layersLoaded = $activeGame?.floodLayerController.floodLayer.loaded;
	$: roadsLoaded = $activeGame?.evacuationController.roadNetwork.loaded;
	$: hexagonsLoaded = $activeGame?.evacuationController.hexagonLayer.loaded;

	$: gameLoaded = $layersLoaded && $roadsLoaded && $hexagonsLoaded;

	let showManual: boolean = false;

</script>


<Modal
	bind:open
	size="lg"
	passiveModal={true}
	modalHeading={""}
	id="start-menu-modal"
	preventCloseOnClickOutside={true} 
>
	<div class="top-nav">
		<GameButton
			icon={showManual ? CaretLeft : Book}
			hasTooltip={false}
			size={24}
			borderHighlight={true}
			on:click={() => showManual = !showManual}
		>
			<svelte:fragment slot="popover">{$_("game.manual")}</svelte:fragment>
		</GameButton>
		<LanguageSwitcher />
	</div>
	{#if showManual}
		<Manual />
		{:else}
		<div class="start-menu-content">
			<div class="intro-header">
				<img src="https://www.interregnorthsea.eu/sites/default/files/media-object/2024-09/FIER-Logo-PO-DeepWater_Klein%20formaat_wit.png" alt="FIER Logo" width=150 />
				<h1 class="intro-header-text">
					<span>Serious Game</span>
					<span style="color: var(--game-color-highlight);">Overstromingen Zeeland</span>
				</h1>
			</div>
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
			<div class="credits">
				<div>Een samenwerking van:</div>
				<div class="credits-logos">
					<img class="credits-logo" src="https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Logo_ZeelandProvince.svg/2560px-Logo_ZeelandProvince.svg.png" alt="Logo Province Zeeland" >
					<img class="credits-logo" src="https://storage.googleapis.com/sogelink-research-public/images/logo-sogelink.png" alt="Logo Sogelink" >
					<img class="credits-logo" src="https://dw-consultancy.nl/wp-content/uploads/2024/08/Logo-1-1024x461.png" alt="Logo Dutch Wildfire Consultancy" >
					<img class="credits-logo" src="https://iiw.kuleuven.be/onderzoek/advise/meet_an_engineer/sweco-logo-voor-office-en-online-lindsey.png/@@images/image.png" alt="Logo Sweco" >
				</div>
			</div>
			{#if gameLoaded}
				<div class="start-menu-actions">
					{#if $activeGame}
						<div class="left">
							<Button
								kind="danger"
								icon={Exit}
								on:click={() => gameController.exit()}
							>{$_("game.buttons.exit")}</Button>
							<Button
								kind="primary"
								icon={Save}
								on:click={() => $activeGame.save()}
							>{$_("game.buttons.save")}</Button>
						</div>
						<div class="right">
							<Button
								kind="primary"
								icon={CaretRight}
								on:click={() => {
									open = false;
									$activeGame.start();
								}}
							>{$activeGame.started ? "Start" : $_("game.buttons.continuePlaying")}</Button>
						</div>
					{/if}
				</div>
			{:else}
				<div class="loading-container">
					<Loading withOverlay={false} />
					<div class="loading-status">
						{#if !$roadsLoaded}
							<p>{$_("game.loading")} {$_("game.roadNetwork").toLocaleLowerCase()}...</p>
						{/if}
						{#if !$hexagonsLoaded}
							<p>{$_("game.loading")} {$_("game.hexagons").toLocaleLowerCase()}...</p>
						{/if}
						{#if !$layersLoaded}
							<p>{$_("game.loading")} {$_("game.floodModel").toLocaleLowerCase()}...</p>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	{/if}
</Modal>


<style>

	:global(#start-menu-modal .bx--modal-container) {
		background-color: rgb(var(--game-color-bg));
	}
	:global(#start-menu-modal .bx--modal-close) {
		display: none;
	}

	.top-nav {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	
	.start-menu-content {
		text-align: center;
		padding: 0 2rem;
		color: var(--game-color-text);
	}

	.intro-header {
		display:flex;
		justify-content: center;
		align-items: center; 
		column-gap: 0.5rem;
	}
	.intro-header-text {
		font-weight: 700;
		margin-bottom: 1rem;
		color: var(--game-color-highlight);
		display: flex;
		flex-direction: column;
		align-items: flex-start;
	}
	.intro-header-text span:first-child {
		font-weight: 500;
		font-size: 2rem;
	}

	.intro-text {
		margin: 1rem 0;
		line-height: 1.5;
	}

	.start-menu-actions {
		display: flex;
		justify-content: space-between;
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

	.credits {
		margin-top: 2rem;
		color: var(--game-color-highlight);
		font-size: 0.9rem;
		font-weight: 700;
	}
	.credits-logos {
		display: flex;
		justify-content: center;
		align-items: center;
		column-gap: 1.5rem;
		margin-top: 1rem;
	}
	.credits-logo {
		height: min(50px, auto);
		max-width: 100px;
		filter: invert(1);
	}

</style>