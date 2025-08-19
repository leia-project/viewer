<script lang="ts">
	import { _ } from "svelte-i18n";
	import type { Game } from "../module/game";
	import { SkipBackSolidFilled, SkipForwardSolidFilled, TimeFilled, Timer } from "carbon-icons-svelte";
	import Pill from "./general/Pill.svelte";
	import GameButton from "./general/GameButton.svelte";

	export let game: Game;

	const inPreparationPhase = game.inPreparationPhase;
	const elapsedTimeFormatted = game.elapsedTimeDynamicFormatted;
	const timeGaps = game.timeGaps;

	const currentTime = game.map.options.dateTime;
	$: currentTimeFormatted = new Date($currentTime).toLocaleTimeString("nl", {
		day: "numeric",
		month: "short",
		hour: "2-digit",
		minute: "2-digit"
	});

</script>


{#if $inPreparationPhase}
	<div class="prep-phase">
		<div class="prep-phase-title">{$_("game.preparationPhase")}</div>
		<GameButton
			icon={SkipForwardSolidFilled}
			hasTooltip={false}
			size={18}
			borderHighlight={true}
			buttonText={$_("game.startFlood")}
			on:click={() => game.startBreach()}
		/>
	</div>
{:else}
	<div class="time-control">
		<div class="button-container" style="justify-content: flex-end;" >
			{#if $timeGaps.before}
				<GameButton
					icon={SkipBackSolidFilled}
					hasTooltip={true}
					size={18}
					borderHighlight={true}
					on:click={() => game.changeStep("previous")}
				>
					<svelte:fragment slot="popover">Terugspoelen ({$timeGaps.after} uur)</svelte:fragment>
				</GameButton>
			{/if}
		</div>
		<Pill 
			icon={TimeFilled}
			label="Time"
			bind:value={currentTimeFormatted}
		/>
		<Pill 
			icon={Timer}
			label="Since Breach"
			value={$elapsedTimeFormatted}
			unit={"hours"}
		/>
		<div class="button-container" style="justify-content: flex-start;" >
			{#if $timeGaps.after}
				<GameButton
					icon={SkipForwardSolidFilled}
					hasTooltip={true}
					size={18}
					borderHighlight={true}
					on:click={() => game.changeStep("next")}
				>
					<svelte:fragment slot="popover">Ga verder ({$timeGaps.after} uur)</svelte:fragment>
				</GameButton>
			{/if}
		</div>
	</div>
{/if}


<style>

	.prep-phase {
		display: flex;
		align-items: center;
		column-gap: 2rem;
	}

	.prep-phase-title {
		color: var(--game-color-highlight);
		font-weight: 600;
		font-size: 1.2rem;
		text-align: center;
		margin: 1rem 0;
	}

   .time-control {
		text-align: end;
		display: flex;
		flex-direction: row;
		align-items: center;
		height: 100%;
		column-gap: 0.5rem;
   }

	.button-container {
		min-width: 100px;
		display: flex;
	}

</style>