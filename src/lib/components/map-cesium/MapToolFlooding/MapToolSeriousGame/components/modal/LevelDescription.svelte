<script lang="ts">
	import { createEventDispatcher } from "svelte";
	import { PlayOutlineFilled } from "carbon-icons-svelte";
	import type { Game } from "../../module/game";
	import GameButton from "../general/GameButton.svelte";

	export let game: Game;

	const dispatch = createEventDispatcher();

	function onClose(): void {
		dispatch("close");
		game.onCloseLevelDescription();
	}
	
</script>


<div class="level-content">
	{#if game.gameConfig.thumbnail}
		<img src={game.gameConfig.thumbnail} alt="Level thumbnail" class="level-image" />
	{/if}
	<div class="level-text">
		<div class="level-title">{game.gameConfig.name}</div>
		<div class="level-description">{@html game.gameConfig.scenarioDescription}</div>
		<GameButton
			buttonText="Start"
			icon={PlayOutlineFilled}
			borderHighlight={true}
			hasTooltip={false}
			on:click={onClose}
		/>
	</div>
</div>


<style>

	.level-content {
		padding: 1rem;
		display: flex;
		column-gap: 3rem;
	}

	.level-image {
		max-width: 400px;
	}

	.level-title {
		font-size: 2rem;
		font-weight: 600;
		color: var(--game-color-highlight);
	}

	.level-description {
		color: var(--game-color-text);
		font-size: 1.25rem;
		margin: 1rem 0 2rem;
		display: flex;
		flex-direction: column;
		row-gap: 0.75rem;
	}

</style>