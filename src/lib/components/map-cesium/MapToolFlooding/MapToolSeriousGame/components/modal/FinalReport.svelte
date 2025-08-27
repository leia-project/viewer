<script lang="ts">
	import { createEventDispatcher } from "svelte";
	import { _ } from "svelte-i18n";
	import { GameConsole } from "carbon-icons-svelte";
	import type { Game } from "../../module/game";
	import TimeseriesPlot from "./TimeseriesPlot.svelte";
	import GameButton from "../general/GameButton.svelte";

	export let game: Game;

	const dispatch = createEventDispatcher();

</script>


<div id="final-report-container">
	<div class="final-report-title">{$_("game.finalReport.title")}</div>

	<div class="score-breakdown">
		<div class="breakdown-item">
			<div>Evacuated:</div>
			<div>{game.report.evacuatedNeeded + game.report.evacuatedUnneeded}</div>
		</div>
		<div class="breakdown-item">
			<div>Victims:</div>
			<div>{game.report.victims}</div>
		</div>
		<div class="breakdown-item">
			<div>Percentage evacuated</div>
			<div>{(game.report.evacuatedRequired - game.report.victims) / game.report.evacuatedRequired * 100 || 0}%</div>
		</div>
		<div class="breakdown-item">
			<div>Unneeded evacuated:</div>
			<div>{game.report.evacuatedUnneeded}</div>
		</div>
	</div>
	<div class="final-score">
		<span>Final Score</span>
		<div class="stars">
			{#each Array(5) as _, i}
				<span class="star {i * 2 < game.report.score ? 'filled' : ''}">★</span>
			{/each}
		</div>
		<span>({game.report.score * 100})</span>
	</div>

	<div class="final-details">
		{#if game.timeseriesVictims.length > 0 || game.timeseriesEvacuated.length > 0}
			<TimeseriesPlot
				victims={game.timeseriesVictims}
				evacuated={game.timeseriesEvacuated}
			/>
		{/if}
	</div>

	<div class="measures">
		Measures taken: ...
		Costs: ...
	</div>

	<div class="bottlenecks">
		<!-- list of worst load/capacity road segments -->
		<!-- dropdown with road segments with loads -->
	</div>

	<div class="return-button">
		<GameButton
			buttonText={$_("game.finalReport.returnToGame")}
			icon={GameConsole}
			borderHighlight={true}
			hasTooltip={false}
			on:click={() => dispatch("close")}
		/>
	</div>
</div>


<style>

	#final-report-container {
		padding: 1rem;
	}

	.final-report-title {
		font-size: 1.5rem;
		font-weight: bold;
		margin-bottom: 1rem;
	}

	.score-breakdown {
		max-width: 400px;
	}

	.breakdown-item {
		display: flex;
		justify-content: space-between;
	}
	
	.final-score {
		display: flex;
		align-items: center;
		column-gap: 1rem;
	}

	.star {
		font-size: 1.5rem;
		color: gray;
	}
	.star.filled {
		color: gold;
	}

	.return-button {
		text-align: right;
	}

</style>