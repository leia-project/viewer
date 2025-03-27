<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { RadioButtonGroup, RadioButton } from 'carbon-components-svelte';
	import { Earth } from 'carbon-icons-svelte';
	import { languages, selectedLanguage } from '$lib/components/localization/localization';

</script>


<div class="content">
	<div class="wrapper">
		<div class="heading-03" title="{$_('tools.language.setLanguage')}">
			<Earth size={24} />
			{$_('tools.language.setLanguage')}
		</div>
		<div class="language-options">
			<RadioButtonGroup orientation="vertical" bind:selected={$selectedLanguage} >
				{#each languages as language}
					<RadioButton labelText={language.title} value={language.shortName} />
				{/each}
			</RadioButtonGroup>
		</div>
	</div>
</div>


<style>
	.content {
		display: flex;
		flex-direction: column;
	}

	.wrapper {
		width: 100%;
		padding: var(--cds-spacing-05);
		height: 100%;
		box-sizing: border-box;
	}

	.heading-03 {
		display: flex;
		align-items: center;
		column-gap: 0.5rem;
	}
	
	.language-options {
		margin-left: 2px;
	}
</style>
