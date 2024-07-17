<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { selectedLanguage, languages } from '../localization/localization';
	import { HeaderAction, HeaderPanelDivider } from 'carbon-components-svelte';
	import { RadioButtonGroup, RadioButton } from 'carbon-components-svelte';

	import Earth from 'carbon-icons-svelte/lib/EarthFilled.svelte';
</script>

<HeaderAction icon={Earth} closeIcon={Earth}>
	<div class="content">
		<div class="wrapper shell">
			<RadioButtonGroup orientation="vertical" bind:selected={$selectedLanguage} >
				{#each languages as language}
					<RadioButton labelText={language.title} value={language.shortName} class="test" />
				{/each}
			</RadioButtonGroup>
		</div>

		<HeaderPanelDivider />

		<div class="wrapper" />
	</div>
</HeaderAction>

<style>
	.wrapper {
		width: 100%;
		padding: var(--cds-spacing-05);
		height: 100%;
		box-sizing: border-box;
	}

    :global(.shell .bx--radio-button__appearance) {
        border: 1px solid var(--cds-ui-01) !important;
        border-color: var(--cds-ui-01) !important;
    }

    :global(.shell .bx--radio-button__appearance::before) {
        background-color: var(--cds-ui-01) !important;
    }

	.content {
		display: flex;
		flex-direction: column;
	}
</style>
