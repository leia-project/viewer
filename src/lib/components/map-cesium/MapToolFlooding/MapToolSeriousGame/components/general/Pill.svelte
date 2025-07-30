<script lang="ts">

	export let icon: any;
	export let label: string;
	export let value: string | number;
	export let unit: string = "";
	export let color: string = "var(--game-color-highlight)";

</script>


<div class="pill-container">
	<svelte:component this={icon} size={20} color={color} />
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
		column-gap: 0.75rem;
		background-color: rgba(var(--game-color-bg), 0.8);
		color: var(--game-color-highlight);
		backdrop-filter: blur(8px);
		padding: 0.25rem;
		padding-right: 1rem;
		border-radius: 0.25rem;
		text-align: start;
   }
   .pill-text {
		display: flex;
		flex-direction: column;
   }
   .pill-text span {
		font-size: 0.8rem;
   }
   .pill-label {
		font-weight: 500;
		color: var(--game-color-highlight);
   }
   .pill-value {
		font-weight: 700;
		color: var(--game-color-contrast);
   }
</style>