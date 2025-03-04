<script lang="ts">
	export let legendUrls: string;

	console.log("TOOTOTOOIWEHFHIUWEHFIUWHGCUIEGFLWEJKEWGFIUEW");
</script>

<div class="legend-container">
	<img id="myImage" src={legendUrls.srcString} alt="Base64 Image" />
	<span>{legendUrls.legendName}</span>
</div>

<style>
	.legend-container {
		display: flex;
		align-items: center;
		column-gap: 1em;
		margin-bottom: 1em;
	}
</style>
