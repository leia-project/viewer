<script lang="ts">
	import { InformationFilled, TrafficEvent } from "carbon-icons-svelte";
	import type { EvacuationController } from "../../../module/game-elements/evacuation-controller";
	import type { Hexagon } from "../../../module/game-elements/hexagons/hexagon";
	import GameButton from "../../general/GameButton.svelte";

	export let hexagon: Hexagon | undefined;
	export let evacuationController: EvacuationController;
	export let selected: boolean = true;

	const selectedExtractionPoint = evacuationController.roadNetwork.selectedExtractionPoint;
	$: hexagonStatus = hexagon?.status;

	$: nodesSelected = $selectedExtractionPoint !== undefined && hexagon !== undefined;

</script>


<div>
	{#if $hexagonStatus === "flooded"}
		<div class="hexagon-status">
			<span class="status-indicator" style="background-color: {hexagon?.getStatusColor($hexagonStatus)}" />
			<span class="status-label">Flooded</span>
		</div>
	{:else if $hexagonStatus === "evacuated"}
		<div class="hexagon-status">
			<span class="status-indicator" style="background-color: {hexagon?.getStatusColor($hexagonStatus)}" />
			<span class="status-label">Evacuated</span>
		</div>
	{:else if $hexagonStatus === "accessible" && !nodesSelected}
		<div class="hexagon-status">
			<span class="status-indicator" style="background-color: {hexagon?.getStatusColor($hexagonStatus)}" />
			<span class="status-label">Accessible</span>
		</div>
	{/if}
	{#if selected && $hexagonStatus === "accessible"}
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