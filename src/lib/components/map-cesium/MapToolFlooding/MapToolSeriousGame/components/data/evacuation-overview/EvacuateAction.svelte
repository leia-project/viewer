<script lang="ts">
	import { InformationFilled, VehicleApi } from "carbon-icons-svelte";
	import type { EvacuationController } from "../../../module/game-elements/evacuation-controller";
	import type { Hexagon } from "../../../module/game-elements/hexagons/hexagon";
	import GameButton from "../../general/GameButton.svelte";

	export let hexagon: Hexagon | undefined;
	export let evacuationController: EvacuationController;

	const selectedExtractionPoint = evacuationController.roadNetwork.selectedExtractionPoint;
	$: hexagonStatus = hexagon?.status;

	$: nodesSelected = $selectedExtractionPoint !== undefined && hexagon !== undefined;

</script>


<div>
	{#if nodesSelected}
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
		{:else if $hexagonStatus === "accessible"}
			<GameButton
				icon={VehicleApi}
				borderHighlight={true}
				hasTooltip={false}
				buttonText="Evacueer"
				active={nodesSelected}
				size={18}
				on:click={() => evacuationController.evacuate()}
			/>
		{/if}
	{:else}
		<div>
			<span>Select an extraction point</span>
			<div class="info-button">
				<InformationFilled size={20} />
			</div>
		</div>
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

</style>