<script lang="ts">
	import { _ } from "svelte-i18n";
	import { Button } from "carbon-components-svelte";
	import { ViewFilled, CutOut, Home } from "carbon-icons-svelte";
	import { projectHandler } from "../project-handler";
	import Divider from "$lib/components/theme/Divider/Divider.svelte";

	const clip = projectHandler.clip;
	const selectedProject = projectHandler.selectedProject;

</script>


<div class="project-buttons">
	<div class="cutout-button">
		<Button
			icon={$clip ? ViewFilled : CutOut}
			kind="secondary"
			iconDescription={`${$clip ? $_("tools.projects.show") : $_("tools.projects.hide")} ${$_("tools.projects.environment").toLowerCase()}`}
			tooltipPosition="top"
			on:click={() => clip.set(!$clip)}
		/>
	</div>
	<Divider direction="vertical" />
	<div class="home-button">
		<Button
			icon={Home}
			kind="secondary"
			on:click={() => $selectedProject?.projectCamera.zoomToProject()}
		/>
	</div>
</div>


<style>
	
	.project-buttons {
		order: -1;
		height: 100%;
		display: flex;
	}

	:global(.home-button .bx--btn::before, .home-button .bx--assistive-text) {
		display: none !important;
	}

</style>