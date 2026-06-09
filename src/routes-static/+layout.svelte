<script lang="ts">
	import { onMount } from 'svelte';
	import { app } from '$lib/app/app';
	import { page } from '$app/stores';
	import { ConfigSettings } from '$lib/app/config-settings';
	import { setupLocalization } from '$lib/i18n/localization';
	import '../routes/app.css';	
	import PageNotFound from './error/pageNotFound.svelte';
	import { t } from 'svelte-i18n';
	import { error } from '@sveltejs/kit';

	app.init();
	setupLocalization("nl");

	let pageNotFound = false

	onMount(async () => {
		let generalConfig: any = null;
		try{
			const generalConfigUrl= process.env.GENERAL_CONFIG_URL;
			if ( generalConfigUrl ) {

			const generalRes = await fetch(generalConfigUrl);
			generalConfig = await generalRes.json();
			}
		}
		catch (e) {
			console.warn("failed to load general config")
		}

		if (generalConfig?.translations){
			for (const t of generalConfig.translations){
				addTranslation(t.land, t.translations)
			}
		}
		let configUrl = new URLSearchParams(window.location.search).get("config");
		// Look for name in URL that corresponds to a config name
		if (!configUrl) {
			if ($page.params.config) {
				try {
					const response = await fetch(process.env.CONFIG_SERVER_URL + `/overview?mode=dt&q=${$page.params.config}`);
					if (response.ok) {
						const responseJson = await response.json();
						configUrl = responseJson[0].url;
					} else {
						pageNotFound = true;
						return;
					}
				} catch {
					pageNotFound = true;
					return;
				}
			}
		}
		app.configSettings.set(new ConfigSettings(configUrl ?? (process.env.CONFIG_URL ?? "")));
	})
</script>

<main>
    {#if pageNotFound}
        <PageNotFound redirectUrl={generalConfig?.redirect}/>
    {:else}
        <slot />
    {/if}
</main>

<style>
	main {
		width: 100%;
		height: 100%;
		margin: 0 auto;
		box-sizing: border-box;
		overflow-y: auto;
	}
</style>
