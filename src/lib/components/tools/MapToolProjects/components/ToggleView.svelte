<script lang="ts">
	import { _ } from "svelte-i18n";
	import { Toggle } from "carbon-components-svelte";
	import { ViewOffFilled, ViewFilled } from "carbon-icons-svelte";

	export let show: boolean;
	export let text: string;
	export let inline: boolean = false;

</script>


<div class="toggle-container" class:inline >
	<div class="toggle-text">{text}</div>
	<div class="view-toggle">
		<svelte:component this={show ? ViewFilled : ViewOffFilled} />
		<Toggle
			bind:toggled={show}
			size="sm"
			labelText={text}
			hideLabel
			labelA=""
			labelB=""
		/>
	</div>
</div>


<style>

	.toggle-container {
		display: flex;
		justify-content: space-between;
		align-items: center;
		column-gap: 20px;
	}
	.toggle-container.inline {
		display: inline-flex;
	}
	.toggle-text {
		flex: 1 1 auto;
		min-width: 0;
	}
	.view-toggle {
		display: flex;
		align-items: center;
		column-gap: 5px;
		flex: 0 0 auto;
	}
	.view-toggle :global(.bx--form-item) {
		flex: 0 0 auto;
	}

</style>