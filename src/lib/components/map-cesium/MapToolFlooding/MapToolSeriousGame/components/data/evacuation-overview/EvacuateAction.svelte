<script lang="ts">
	import { _ } from "svelte-i18n";
	import { InformationFilled, TrafficEvent } from "carbon-icons-svelte";
	import type { EvacuationController } from "../../../module/game-elements/evacuation-controller";
	import type { Hexagon } from "../../../module/game-elements/hexagons/hexagon";
	import GameButton from "../../general/GameButton.svelte";

	export let hexagon: Hexagon | undefined;
	export let evacuationController: EvacuationController;
	export let selected: boolean = true;

	const selectedExtractionPoint = evacuationController.roadNetwork.selectedExtractionPoint;
	$: hexagonStatus = hexagon?.status;
	$: hexagonColor = hexagon?.color;

	$: nodesSelected = $selectedExtractionPoint !== undefined && hexagon !== undefined;

	const inPreparationPhase = evacuationController.game.inPreparationPhase;

</script>


<div class="evacuate-action">
	{#if nodesSelected}
		<div class="hexagon-status">
			<span class="status-indicator" style="background-color: {$hexagonColor?.toCssColorString()}" />
			<span class="status-label">{$_(`game.status.${$hexagonStatus}`)}</span>
		</div>
	{/if}
	{#if selected && $hexagonStatus === "accessible"  && !$inPreparationPhase}
		{#if nodesSelected}
			<GameButton
				icon={TrafficEvent}
				borderHighlight={true}
				hasTooltip={false}
				buttonText="Evacueer"
				active={nodesSelected}
				size={18}
				on:click={() => evacuationController.evacuate()}
			/>
		{:else}
			<div class="info-message">
				<div class="info-button">
					<InformationFilled size={20} />
				</div>
				<span>Select an extraction point to evacuate</span>
			</div>
		{/if}
	{/if}
</div>


<style>

	.evacuate-action {
		display: flex;
		flex-direction: column;
		row-gap: 0.35rem;
	}

	.hexagon-status {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.status-indicator {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background-color: var(--status-color);
	}

	.status-label {
		font-size: 0.875rem;
		color: var(--text-color);
	}

	.info-message {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		margin-top: 0.5rem;
	}

</style>