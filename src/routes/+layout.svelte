<script lang="ts">
	import { app } from '$lib/app/app';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { setupLocalization } from '$lib/components/localization/localization';
	import { ConfigSettings } from '$lib/app/config-settings';
	import { selectedLanguage } from '$lib/components/localization/localization';

	import './app.css';	

	app.init();

	/* const translations = new Array<{ locale: string, translations: {} }>();
	translations.push({ locale: "en", translations: {
		tools: { layerTools: { theme: { legend: "Legend "} } }
	}}); */

	// Because of how the viewer is set up, we cannot initialize the localization
	// with the language from the config at first. Therefore we set it to a default
	setupLocalization("nl");

	$: map = get(app.map);
	
	$: {
		if (map) {
			map.configLoaded.subscribe((loaded) => {
				if (loaded) {
					let languageSettings = map.config.tools.find((t: any) => t.id === "language")?.settings;
					if (languageSettings && languageSettings.startLanguage) {
						selectedLanguage.set(languageSettings.startLanguage);
					}
				}
			});
		}
	};

	onMount(async () => {
		let configUrl = new URLSearchParams(window.location.search).get("config");
		// Look for name in URL that corresponds to a config name
		if (!configUrl) {
			if ($page.params.config) {
				const response = await fetch(process.env.CONFIG_SERVER_URL + `/overview?q=${$page.params.config}`);
				if (response.ok) {
					const responseJson = await response.json();
					configUrl = responseJson[0].url;
				}
			}
		}
		app.configSettings.set(new ConfigSettings(configUrl ?? (process.env.CONFIG_URL ? process.env.CONFIG_URL : "")));
	})
</script>

<main>
	<slot />
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
