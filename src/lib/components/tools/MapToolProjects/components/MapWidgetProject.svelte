<script lang="ts">
	import { onDestroy, onMount } from "svelte";
	import { _ } from "svelte-i18n";
	import { Button } from "carbon-components-svelte";
	import { Exit, ViewFilled, ViewOffFilled } from "carbon-icons-svelte";
	import { projectHandler } from "../project-handler";
	import MapControlsProject from "./MapControlsProject.svelte";

	const selectedProject = projectHandler.selectedProject;
	const clip = projectHandler.clip;
	$: processing = $selectedProject?.processing;
	
	let homeButton: HTMLButtonElement;
	let projectButtons: MapControlsProject;

	onMount(() => {
		const mapControlsContainer = document.getElementById("navfooter");
		const buttons = mapControlsContainer?.querySelectorAll("button");
		if (!mapControlsContainer || !buttons) return;
		homeButton = buttons[0];
		homeButton.style.display = "none";

		projectButtons = new MapControlsProject({
			target: mapControlsContainer
		});
	});

	onDestroy(() => {
		homeButton.style.display = "block";
		projectButtons?.$destroy();
	});

</script>


{#if $selectedProject && projectHandler.showDefaultWidget}
	<div class="widget-projects">
		<div class="heading-03">
			{#if $selectedProject.projectConfig.logo}
				<img class="project-logo" src={$selectedProject.projectConfig.logo} alt="logo" />
			{/if}
			<div class="project-title">{$selectedProject.projectConfig.name}</div>
		</div>
		<div class="widget-item">
			<Button
				kind="primary"
				size="field"
				icon={Exit}
				disabled={$processing}
				on:click={() => projectHandler.selectedProject.set(undefined)}
			>{$_("tools.projects.leaveProject")}</Button>
			{#if projectHandler.showClipToggleInWidget}
				<Button
					icon={$clip ? ViewOffFilled : ViewFilled}
					size="field"
					kind="tertiary"
					iconDescription={`${$clip ? $_("tools.projects.show") : $_("tools.projects.hide")} ${$_("tools.projects.environment")}`}
					tooltipPosition="right"
					on:click={() => clip.set(!$clip)}
				/>
			{/if}
		</div>
	</div>
{/if}


<style>

	.widget-projects {
		position: absolute;
		top: 0;
		left: 0;
		min-width: 400px;
		pointer-events: none;
	}
	.heading-03 {
		display: flex;
		align-items: center;
	}
	.project-title {
		backdrop-filter: blur(8px);
		padding: 5px 12px;
		border-radius: 3px;
		font-size: 1.2rem;
		font-weight: 500;
		color: #ffffff;
	}
	.project-logo {
		height: 50px;
	}
	.widget-item {
		margin-top: 10px;
	}
	:global(.widget-item button) {
		pointer-events: all;
	}

</style>