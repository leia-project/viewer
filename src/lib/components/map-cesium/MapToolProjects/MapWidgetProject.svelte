<script lang="ts">

	import type { Map } from "$lib/components/map-cesium/module/map";
	import { Button } from "carbon-components-svelte";
	import { Exit } from "carbon-icons-svelte";

	export let map: Map;

	$: selectedProject = map.options.selectedProject;

</script>


{#if $selectedProject}
	<div class="widget-projects">
		<div class="heading-03">{$selectedProject}</div>
		<Button
			kind="primary"
			size="default"
			icon={Exit}
			on:click={() => map.options.selectedProject.set(undefined)}
		>Leave Project View</Button>
	</div>
{/if}


<style>

	.widget-projects {
		position: absolute;
		top: 0;
		left: 0;
		width: 400px;
	}
	.heading-03 {
		color: #fff;
	}

</style>