<script lang="ts">

	export let icon: any;
	export let label: string;
	export let value: string | number;
	export let unit: string = "";
	export let color: string = "var(--game-color-highlight)";
	export let scale: number = 1;

</script>


<div class="pill-container" style="--pill-scale: {scale};">
	<svelte:component this={icon} size={20 * scale} color={color} />
	<div class="pill-text">
		<span class="pill-label">{label}</span>
		<span class="pill-value">{value} {unit}</span>
	</div>
</div>


<style>
	.pill-container {
		user-select: none;
		display: flex;
		flex-direction: row;
		align-items: center;
		column-gap: calc(0.75rem * var(--pill-scale));
		background-color: rgba(var(--game-color-bg), 0.8);
		color: var(--game-color-highlight);
		backdrop-filter: blur(8px);
		padding: calc(0.25rem * var(--pill-scale));
		padding-right: calc(1rem * var(--pill-scale));
		border-radius: calc(0.25rem * var(--pill-scale));
		text-align: start;
   }
   .pill-text {
		display: flex;
		flex-direction: column;
  		row-gap: calc(0.1rem * var(--pill-scale));
 	}
   .pill-label {
		font-weight: 400;
		font-size: 0.5rem;
		color: var(--game-color-highlight);
  		font-size: calc(0.8rem * var(--pill-scale));
 }
   .pill-value {
		font-weight: 400;
		color: var(--game-color-contrast);
  		font-size: calc(0.88rem * var(--pill-scale));
 	}
</style>