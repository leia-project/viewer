<script lang="ts">
	import { SvelteComponent } from "svelte";
	import { writable } from "svelte/store";
	import { _ } from "svelte-i18n";
	import { LogoGithub } from "carbon-icons-svelte";
	import { HeaderActionLink } from "carbon-components-svelte";

	import { app } from "$lib/app/app";
	import { light } from "$lib/styles/themes";

	import Map from "./Map.svelte";
	
	import Header from "./header/Header.svelte";
	import HeaderUtilityGeocoder from "./header/HeaderUtilityGeocoder/HeaderUtilityGeocoder.svelte";
	import HeaderUtilityModeSwitcher from "./header/HeaderUtilityModeSwitcher/HeaderUtilityModeSwitcher.svelte";
	import Language from "./header/Language.svelte";

	import MapControls from "./controls/MapControls.svelte";
	import POVMapControls from "./controls/POVMapControls.svelte";
	import NotificationView from "./notifications/NotificationView.svelte";
	import CarbonTheme from "./theme/CarbonTheme.svelte";

	import MapToolMenu from "./tools/MapToolMenu.svelte";
	import MapToolFeatureInfo from "./tools/MapToolFeatureInfo/MapToolFeatureInfo.svelte";
	import MapToolLayerLibrary from "./tools/MapToolLayerLibrary/MapToolLayerLibrary.svelte";
	import MapToolLayerManager from "./tools/MapToolLayerManager/MapToolLayerManager.svelte";
	import MapToolBookmark from "./tools/MapToolBookmarks/MapToolBookmarks.svelte";
	import MapToolCesiumMeasure from "./tools/MapToolCesiumMeasure/MapToolCesiumMeasure.svelte";
	import MapToolStories from "./tools/MapToolStories/MapToolStories.svelte";
	import MapToolCesiumControls from "./tools/MapToolCesiumControls/MapToolCesiumControls.svelte";
	import MapToolInfo from "./tools/MapToolInfo/MapToolInfo.svelte";
	import MapToolHelp from "./tools/MapToolHelp/MapToolHelp.svelte";
	import MapToolTheme from "./tools/MapToolTheme/MapToolTheme.svelte";
	import MapToolProjects from "./tools/MapToolProjects/MapToolProjects.svelte";
	import MapToolIsochrones from "./tools/MapToolIsochrones/MapToolIsochrones.svelte";
	import MapToolConfigSwitcher from "./tools/MapToolConfigSwitcher/MapToolConfigSwitcher.svelte";
	import MapToolFlooding from "./tools/MapToolFlooding/MapToolFlooding.svelte";


	const settings = writable<any>({});
	const enabledTools = writable<Array<string>>(new Array<string>());
	const base = process.env.APP_URL;
	let mapVisible = true;
	let interfaceVisible = true;

	const userToolOrder: Record<string, number> = {};
	const aliasDict: { [key: string]: string | undefined } = {};
	const map = app.map;
	$: title = $settings.title ? $settings.title + ' - ' + $settings.subTitle : $_('general.loading')
	
	const orderedKeys = [
		'layerLibrary',
        'layerManager',
        'flooding',
		'stories',
        'projects',
        'bookmarks',
        'measure',
		'isochrones',
    ]; // Standard order of top left tools in toolmenu

	let toolOrder: Record<string, typeof SvelteComponent<any>> = {
        layerLibrary: MapToolLayerLibrary,
        layerManager: MapToolLayerManager,
        flooding: MapToolFlooding,
        stories: MapToolStories,
        projects: MapToolProjects,
		bookmarks: MapToolBookmark,
        measure: MapToolCesiumMeasure,
		isochrones: MapToolIsochrones,
    };

	function toolProps(toolKey: string) {
		if (toolKey === 'layerLibrary') {
			return { };  
		} else if (toolKey === 'layerManager') {
			return { map: $map };
		} else if (toolKey === 'flooding') {
			return { };
		} else if (toolKey === 'stories') {
			return { };
		} else if (toolKey === 'projects') {
			return { };
		} else if (toolKey === 'bookmarks') {
			return { };
		} else if (toolKey === 'measure') {
			return { };
		} else if (toolKey === 'isochrones') {
			return { };
		}
		return {};
	}

	map.subscribe((map) => {
		if (map) {
			map.on('reload', () => {
				mapVisible = false;
				interfaceVisible = false;
				setTimeout(() => {mapVisible = true}, 0);
			})
			map.configLoaded.subscribe((loaded) => {
				interfaceVisible = true;
				if (loaded) {
					if (map.toolSettings) {
						setEnabledMapTools(map.toolSettings);
					}

					for (const setting of map.toolSettings) {
    						const alias = setting.settings ? setting.settings.alias : undefined;
    						aliasDict[setting.id] = alias;
									
						if (setting.settings && setting.settings.position) {
							 userToolOrder[setting.id] = setting.settings.position;
    					}	
					}

					toolOrder = createToolOrder(map.toolSettings);

					if (map.viewerSettings) {
						settings.set(map.viewerSettings);
						if (map.viewerSettings.colors) {
							setColorTokens(map.viewerSettings.colors);
						}
					}
				}
			});
		}
	})

	function setEnabledMapTools(toolSettings: any) {
		const tools = new Array<string>();
		for (let i = 0; i < toolSettings.length; i++) {
			if (toolSettings[i].enabled) {
				tools.push(toolSettings[i].id);
			}
		}
		enabledTools.set(tools);
	}

	function setColorTokens(tokens: any) {
		for (let i = 0; i < Object.keys(tokens).length; i++) {
			const tokenKey = Object.keys(tokens)[i];

			if (tokenKey in light) {
				light[tokenKey as keyof typeof light] = tokens[tokenKey];
			}
		}
	}

	function createToolOrder(toolSettings: any) {
		const enabledToolIds = new Set(
			toolSettings
				.filter((tool: { enabled: boolean; }) => tool.enabled)
				.map((tool: { id: string; }) => tool.id)
		); 

		const filteredOrderedKeys = orderedKeys.filter(key => enabledToolIds.has(key)); 
		
		const filteredToolOrder = Object.fromEntries(
			Object.entries(toolOrder)
			.filter(([key]) => enabledToolIds.has(key))
		);
					
		const sortedUserKeys = Object.entries(userToolOrder)
			.map(([key, position]) => ({ key, position: position - 1})) // map config tool positions (0-based index)
			.sort((a, b) => b.position - a.position); // sort config tool positions high to low

		for (const { key, position } of sortedUserKeys) {
			const index = filteredOrderedKeys.indexOf(key);
			if (index > -1) {
				filteredOrderedKeys.splice(index, 1); // delete tool in array
			}	
			filteredOrderedKeys.splice(Math.min(position, filteredOrderedKeys.length), 0, key); // reinsert tool based on config position into array
		}

		const newToolOrder: Record<string, typeof SvelteComponent<any>> = {};
		filteredOrderedKeys.forEach(key => {
			if (filteredToolOrder.hasOwnProperty(key)) {
				newToolOrder[key] = filteredToolOrder[key];
			}
		});
		
		toolOrder = newToolOrder;

		return toolOrder
	}

</script>


<svelte:head>
	<title>{title}</title>
	<base href="{base}"> <!-- This is the base path for the app -->
</svelte:head>

<CarbonTheme style={light} />

<div class="main">
	<Header logo={$settings.logo} logoMarginLeft={$settings.logoMarginLeft} logoMarginRight={$settings.logoMarginRight} company={$settings.title} platformName={$settings.subTitle}>
		<div slot="headerUtilities">
			<div class="header-utilities">
				{#if $enabledTools.includes("geocoder")}
					<HeaderUtilityGeocoder />
				{/if}
				{#if $enabledTools.includes("modeswitcher") && $map}
					<HeaderUtilityModeSwitcher map={$map} />
				{/if}
				{#if $enabledTools.includes("language")}
					<Language />
				{/if}
				{#if $enabledTools.includes("github")}
					<HeaderActionLink title="Visit GitHub" icon={LogoGithub} href="https://github.com/leia-project" target="_blank"/>
				{/if}
			</div>
		</div>
	</Header>

	<div class="view">
		{#if interfaceVisible && $map}
			<MapToolMenu
				map={$map}
				expandText={$_("tools.menu.expand")}
				collapseText={$_("tools.menu.collapse")}
			>
				{#each Object.entries(toolOrder) as [toolKey, tool] }
					{#if $enabledTools.includes(toolKey)}
						<svelte:component
							this={tool}
							id={toolKey}
							label={aliasDict[toolKey] ?? `tools.${toolKey}.label`}
							{...toolProps(toolKey)}
						/>
					{/if}
				{/each}

				{#if $enabledTools.includes("theme")}
					<MapToolTheme id="theme"
						label={`tools.layerTools.theme.label`}
					/>
				{/if}

				{#if $enabledTools.includes("featureInfo")}
					<MapToolFeatureInfo
						id="featureInfo"
						label={`tools.featureInfo.label`}
					/>
				{/if}

				{#if $enabledTools.includes("info")}
					<MapToolInfo
						id="info"
						label={`tools.info.label`}
						txtViewerTitle={`tools.info.defaultTitle`}
						txtViewerDescription={`tools.info.defaultDescription`}
					/>
				{/if}

				{#if $enabledTools.includes("help")}
					<MapToolHelp
						id="help"
						label={`tools.help.label`}
					/>
				{/if}

				{#if $enabledTools.includes("cesium")}
					<MapToolCesiumControls
						id="cesium"
						label={`tools.cesium.label`}
						map={$map}
					/>
				{/if}

				{#if $enabledTools.includes("config_switcher")}
					<MapToolConfigSwitcher
						id="config_switcher"
						label={`tools.config_switcher.label`}
					/>
				{/if}
			</MapToolMenu>
		{/if}

		{#if mapVisible && $map}
			<div class="map-body">
				<div class="map-wrapper">
					<Map map={$map} />
					{#if !$enabledTools.includes("flyCamera")}
						<MapControls map={$map} />												
					{:else}
						<POVMapControls map={$map} />												
					{/if}
				</div>
			</div>
		{/if}
		<NotificationView />
	</div>
</div>

<style>

	.main {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		box-sizing: border-box;
	}

	.view {
		width: 100%;
		height: 100%;
		display: flex;
		padding-top: 3rem;
	}

	.map-body {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
	}

	.map-wrapper {
		position: relative;
		width: 100%;
		height: 0;
		flex-grow: 1;
	}

	.header-utilities {
		display: flex;
		justify-content: right;
		width: 100%;
	}

</style>
