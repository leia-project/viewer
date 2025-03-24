<script lang="ts">
	import { Person } from "carbon-icons-svelte";
	import type { Game } from "../game";

	export let game: Game;

</script>


<div class="game-stats">
	<div class="game-stat">
		<div class="stat-icon">
			<Person />
		</div>
		<div class="stat-text">
			<span>Slachtoffers</span>
			<span>{game.stats.victims}</span>
		</div>
	</div>
	<div class="game-stat">
		<div class="stat-icon">
			<Person />
		</div>
		<div class="stat-text">
			<span>Geevacueerd</span>
			<span>{game.stats.evacuated}</span>
		</div>
	</div>
</div>


<style>
	

</style>