<script lang="ts">
	import { _ } from 'svelte-i18n';

	/* const locales = localizationManager.locales;

	function setLocale(event: any) {
		localizationManager.setLocale(event.target.value);
	} */

</script>

<div class="flex flex-col gap-4">
	<p class="type-subtitle">
		{$_("settings.language")}
	</p>

	<!-- <div class="max-w-[20rem]">
		<select class="select" on:change="{setLocale}" bind:value="{localizationManager.locale}">
				{#each locales as locale}
				<option value="{locale}">
					{$_(`settings.locale.${locale}`)}
				</option>
			{/each}
		</select>
	</div> -->
</div>

