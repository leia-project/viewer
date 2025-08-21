<script lang="ts">
	import { onDestroy } from "svelte";
	import { derived } from "svelte/store";
	import { _ } from "svelte-i18n";
	import * as Cesium from "cesium";
	import { Slider } from "carbon-components-svelte";
	import { Reset } from "carbon-icons-svelte";
	import { Game } from "../../module/game";
	import GameButton from "../general/GameButton.svelte";

	export let game: Game;

	const simulationTime = game.elapsedTime;
	const selectedTime = game.elapsedTimeDynamic;

	$: timeDelta = $selectedTime - $simulationTime;
 
	const floodLayer = game.floodLayerController.floodLayer;

	const floodLayerOpacity = floodLayer.opacity;

	$: floodLayer.source.color.set(
		timeDelta === 0 ? floodLayer.source.defaultColor 
		: timeDelta < 0 ? new Cesium.Cartesian3(0.5, 0, 0.5) // Past: purple
		: new Cesium.Cartesian3(1, 0, 0)) // Future: red
	
	onDestroy(() => {
		selectedTime.set($simulationTime);
		floodLayer.source.color.set(floodLayer.source.defaultColor);
		console.log("Flood model control destroyed, resetting time and color.");
	});

	const sliderMin = game.gameConfig.timesteps[0];
	const sliderMax = game.gameConfig.timesteps[game.gameConfig.timesteps.length - 1];

	const floodedSegments = game.evacuationController.roadNetwork.routingAPI.floodedSegments;
	let floodedHexagons = derived(
		game.evacuationController.hexagonLayer.hexagons.map(hex => hex.status), 
		$statuses => $statuses.filter(status => status === "flooded").length
	);
	let maxFloodDepth = derived(
		game.evacuationController.hexagonLayer.hexagons.map(hex => hex.floodDepth), 
		$depths => Math.max(...$depths)
	);

</script>


<div class="flood-model">
	<div class="flood-details">
		<div class="flood-model-info">
			<div class="flood-model-info-key">{$_("game.expansion")}</div>
			<div class="flood-model-info-value">
				<span>{$floodedHexagons}</span>
				<span>
					{$_("game.flooded").toLowerCase()}
					{($floodedHexagons === 1 ? $_("game.hexagon") : $_("game.hexagons")).toLowerCase()}
				</span>
			</div>
		</div>
		<div class="flood-model-info">
			<div class="flood-model-info-key">{$_("game.maxFloodDepth")}</div>
			<div class="flood-model-info-value">
				<span>{Math.round($maxFloodDepth * 100) / 100}</span>
				<span>m</span>
			</div>
		</div>
		<div class="flood-model-info">
			<div class="flood-model-info-key">{$_("game.flooded")} {$_("game.roads").toLowerCase()}</div>
			<div class="flood-model-info-value">
				<span>{$floodedSegments.length}</span>
				<span>
					{$_("game.flooded").toLowerCase()}
					{($floodedHexagons === 1 ? $_("game.roadSection") : $_("game.roadSections")).toLowerCase()}
				</span>
			</div>
		</div>
	</div>

	<div class="divider" />

	<div class="slider-container">
		<div class="slider-label">{$_("game.opacity")}</div>
		<Slider
			min={0}
			max={100}
			step={0.01}
			bind:value={$floodLayerOpacity}
			hideLabel={true}
			hideTextInput={true}
		/>
	</div>
	<div class="slider-container">
		<div class="slider-label">{$_("game.menu.timeSinceBreach")}</div>
		<Slider
			min={sliderMin}
			max={sliderMax}
			step={0.1}
			minLabel={(sliderMin - Game.breachStartOffsetInHours).toString()}
			maxLabel={(sliderMax - Game.breachStartOffsetInHours).toString()}
			bind:value={$selectedTime}
			hideLabel={true}
			hideTextInput={true}
		/>
		<GameButton
			size={15}
			icon={Reset}
			hasTooltip={false}
			borderHighlight={true}
			on:click={() => selectedTime.set($simulationTime)}
		/>
	</div>
</div>


<style>

	.divider {
		border-bottom: 1px solid lightslategray;
		margin: 1rem 0;
	}

	.flood-model {
		padding-bottom: 0.75rem;
	}

	.flood-details {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin: 1rem 0;
		font-weight: 600;
	}

	.flood-model-info {
		display: grid;
		grid-template-columns: 150px auto;
		align-items: center;
		gap: 0.5rem;
	}

	.flood-model-info-key {
		color: var(--game-color-highlight);
	}

	.flood-model-info-value {
		display: grid;
		grid-template-columns: 40px auto;
		gap: 0.6rem;
	}

	.flood-model-info-value span:first-child {
		justify-self: flex-end;
	}

	.slider-container :global(.bx--slider__thumb) {
		background: var(--game-color-highlight);
		border-radius: 50%;
		border-top: solid 0.44rem transparent; 
		border-bottom: solid 0.44rem transparent;
	}
	.slider-container :global(.bx--slider__track) {
		background: var(--game-color-highlight);
	}
	.slider-container :global(.bx--slider__filled-track) {
		background: var(--game-color-highlight);
	}
	.slider-container :global(.bx--slider__range-label) {
		color: #fff;
		font-size: 0.7rem;
		margin-right: 0;
	}

	.slider-container {
		display: grid;
		grid-template-columns: 160px 1fr auto;
		align-items: center;
		margin-top: 1rem;
	}

	.slider-label {
		text-align: right;
		margin-right: 1rem;
		font-weight: 600;
	}

</style>