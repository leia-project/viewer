<script lang="ts">
	import { app } from '$lib/app/app';
	import { page } from '$app/stores';
	import { ConfigSettings } from '$lib/app/config-settings';
	import { setupLocalization } from '$lib/components/localization/localization';
	import { onMount } from 'svelte';
	import '../routes/app.css';	

	app.init();
	setupLocalization("nl");

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
