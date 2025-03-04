<script lang="ts">
	export let legendUrls: { srcStrings: string[]; legendNames: string[] } | undefined;
</script>

<div class="legend-container">
	{#each legendUrls.srcStrings as srcString, id}
		<img id="myImage" src={legendUrls.srcStrings[id]} alt="Base64 Image" />
		<span>{legendUrls.legendNames[id]}</span>
	{/each}
</div>

<style>
	.legend-container {
		display: flex;
		align-items: center;
		column-gap: 1em;
		margin-bottom: 1em;
	}
</style>
