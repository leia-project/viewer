<script lang="ts">
	import { FaceDizzyFilled, FaceWinkFilled } from "carbon-icons-svelte";
	import type { Game } from "../module/game";
	import Pill from "./general/Pill.svelte";

	export let game: Game;

</script>


<div class="game-stats">
	<Pill
		icon={FaceDizzyFilled}
		label="Slachtoffers"
		value={game.stats.victims}
		color="#c21111"
	/>
	<Pill
		icon={FaceWinkFilled}
		label="Geevacueerd"
		value={game.stats.evacuated}
		color="green"
	/>
</div>


<style>

	.game-stats {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		column-gap: 0.5rem;
		padding: 1rem;
	}
	
</style>