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
		<span style="color: {color}">{label}</span>
		<span>{value} {unit}</span>
	</div>
</div>


<style>
	.pill-container {
		user-select: none;
		display: flex;
		flex-direction: row;
		align-items: center;
		column-gap: 0.75rem;
		background-color: rgba(var(--game-color-bg), 0.7);
		color: var(--game-color-contrast);
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
   .pill-text span:first-child {
		font-weight: bold;
   }
</style>