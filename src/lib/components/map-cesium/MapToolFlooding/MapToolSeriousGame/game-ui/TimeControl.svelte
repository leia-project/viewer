<script lang="ts">
	import { Button } from "carbon-components-svelte";
	import type { Game } from "../game";
	import { SkipForwardSolidFilled, Timer } from "carbon-icons-svelte";

	export let game: Game;
   
</script>


<div class="time-control">
	<Button
		kind="secondary"
		size="small"
		icon={SkipForwardSolidFilled}
		on:click={() => game.changeStep("next")}
	>Forward</Button>
	<div class="times">
		<div class="time-pill">
			<Timer size={32} />
			<div class="pill-text">
				<span>Time</span>
				<span>14:30</span>
			</div>
		</div>
		<div class="time-pill">
			<Timer size={32} />
			<div class="pill-text">
				<span>Since Breach</span>
				<span>14:30</span>
			</div>
		</div>
	</div>
</div>


<style>
   .time-control {
		text-align: end;
		padding: 1rem;
   }
   .times {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		margin-top: 10px;
   }
   .time-pill {
		display: flex;
		flex-direction: row;
		align-items: center;
		background-color: rgba(255, 255, 255, 0.5);
		backdrop-filter: blur(10px);
		padding: 0.25rem;
		padding-right: 1rem;
		border-radius: 0.25rem;
		text-align: start;
   }
   .pill-text {
		display: flex;
		flex-direction: column;
		margin-left: 10px;
   }
   .pill-text span {
		font-size: 0.8rem;
		color: var(--cds-color-text-01);
   }
   .pill-text span:first-child {
		font-weight: bold;
   }

</style>