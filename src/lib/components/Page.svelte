<script lang="ts">
	import { app } from "$lib/app/app";
	import { setContext } from "svelte";
	import { get, writable } from "svelte/store";

	import { _, dictionary } from "svelte-i18n";
	import CesiumBackgroundControls from "$lib/components/map-cesium/CesiumBackgroundControls.svelte";
	import HeaderUtilityGeocoder from "$lib/components/map-cesium/Header/HeaderUtilityGeocoder/HeaderUtilityGeocoder.svelte";
	import MapToolCesiumMeasure from "$lib/components/map-cesium/MapToolCesiumMeasure/MapToolCesiumMeasure.svelte";
	import MapToolCesiumControls from "$lib/components/map-cesium/MapToolCesiumControls/MapToolCesiumControls.svelte";
	import MapToolStories from "$lib/components/map-cesium/MapToolStories/MapToolStories.svelte";
	import MapToolProjects from "./map-cesium/MapToolProjects/MapToolProjects.svelte";
	import TostiStyle from "$lib/components/ui/components/TostiStyle/TostiStyle.svelte";
	import { light } from "$lib/components/ui/style/themes";
	import Header from "$lib/components/ui/components/Header/Header.svelte";
	import MapToolMenu from "$lib/components/ui/components/MapToolMenu/MapToolMenu.svelte";
	import MapToolLayerLibrary from "$lib/components/ui/components/MapTools/MapToolLayerLibrary/MapToolLayerLibrary.svelte";
	import MapToolLayerManager from "$lib/components/ui/components/MapTools/MapToolLayerManager/MapToolLayerManager.svelte";
	import MapToolFeatureInfo from "$lib/components/ui/components/MapTools/MapToolFeatureInfo/MapToolFeatureInfo.svelte";
	import MapToolBookmark from "$lib/components/ui/components/MapTools/MapToolBookmarks/MapToolBookmarks.svelte";
	import MapControls from "$lib/components/ui/components/MapControls/MapControls.svelte";
	import MapToolFlooding from "./map-cesium/MapToolFlooding/MapToolFlooding.svelte";
	import MapToolInfo from "$lib/components/ui/components/MapTools/MapToolInfo/MapToolInfo.svelte";
	import NotificationView from "$lib/components/ui/components/Notifications/NotificationView.svelte";
	import MapToolHelp from "$lib/components/ui/components/MapTools/MapToolHelp/MapToolHelp.svelte";
	import Map from "$lib/components/Map.svelte";
	import MapToolTheme from "$lib/components/Tools/Theme.svelte";
	import Language from "$lib/components/Tools/Language.svelte";
	import { Attributions } from "$lib/app/attributions";
	import MapToolConfigSwitcher from "./ui/components/MapTools/MapToolConfigSwitcher/MapToolConfigSwitcher.svelte";
	import { LogoGithub } from "carbon-icons-svelte";
	import { HeaderActionLink } from "carbon-components-svelte";
	import POVMapControls from "./ui/components/MapControls/POVMapControls.svelte";
	import HeaderUtilityModeSwitcher from "./map-cesium/Header/HeaderUtilityModeSwitcher/HeaderUtilityModeSwitcher.svelte";
	import type { List } from "echarts";
	import { OgcFeaturesLoaderCesiumDynamic } from "./map-cesium/module/providers/ogc-features-provider";
	import { filter } from "@observablehq/plot";

	const settings = writable<any>({});
	const enabledTools = writable<Array<string>>(new Array<string>());
	const base = process.env.APP_URL;
	let mapVisible = true;
	let interfaceVisible = true;

	const userToolOrder: Record<string, number> = {};
	const aliasDict: { [key: string]: string | undefined } = {};
	const map = app.map;
	$: layers = $map ? $map.layers : [];
	$: library = $map ? $map.layerLibrary : undefined;
	$: title = $settings.title ? $settings.title + ' - ' + $settings.subTitle : $_('general.loading')
	
	let orderedToolOrder:any = {};
	
	const orderedKeys = [
		'layerLibrary',
        'layerManager',
        'flooding',
		'stories',
        'projects',
        'bookmarks',
        'measure',
    ]; // Standard order of top left tools in toolmenu

	$: toolOrder = {
        layerLibrary: MapToolLayerLibrary,
        layerManager: MapToolLayerManager,
        flooding: MapToolFlooding,
        stories: MapToolStories,
        projects: MapToolProjects,
		bookmarks: MapToolBookmark,
        measure: MapToolCesiumMeasure,
    };

	function toolProps(toolKey: string) {
		if (toolKey === 'layerLibrary') {
			return { };  
		} else if (toolKey === 'layerManager') {
			return { layers: $layers, library };
		} else if (toolKey === 'flooding') {
			return { };
		} else if (toolKey === 'bookmarks') {
			return { };
		} else if (toolKey === 'featureInfo') {
			return { };
		} else if (toolKey === 'theme') {
			return {};
		} else if (toolKey === 'measure') {
			return { };
		} else if (toolKey === 'projects') {
			return { };
		} else if (toolKey === 'info') {
			return { attribution: Attributions, txtViewerTitle: undefined, txtViewerDescription: undefined };
		} else if (toolKey === 'help') {
			return { };
		} else if (toolKey === 'cesium') {
			return { };
		} else if (toolKey === 'config_switcher') {
			return {};
		} else if (toolKey === 'stories') {
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
									
						if (setting.settings && setting.settings.ranking) {
							 userToolOrder[setting.id] = setting.settings.ranking;
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
			.map(([key, ranking]) => ({ key, ranking: ranking - 1})) // map config tool positions (0-based index)
			.sort((a, b) => b.ranking - a.ranking); // sort config tool positions high to low

		for (const { key, ranking } of sortedUserKeys) {
			const index = filteredOrderedKeys.indexOf(key);
			if (index > -1) {
				filteredOrderedKeys.splice(index, 1); // delete tool in array
			}	
			filteredOrderedKeys.splice(Math.min(ranking, filteredOrderedKeys.length), 0, key); // reinsert tool based on config position into array
		}

		filteredOrderedKeys.forEach(key => {
			if (filteredToolOrder.hasOwnProperty(key)) {
				orderedToolOrder[key] = filteredToolOrder[key];
			}
		});
		
		toolOrder = orderedToolOrder;

		return toolOrder
	}

	setContext("page", {
		app
	})

</script>

<svelte:head>
	<title>{title}</title>
	<base href="{base}"> <!-- This is the base path for the app -->
</svelte:head>

<TostiStyle style={light} />
<div class="main">
	<Header logo={$settings.logo} logoMarginLeft={$settings.logoMarginLeft} logoMarginRight={$settings.logoMarginRight} company={$settings.title} platformName={$settings.subTitle}>
		<div slot="headerUtilities">
			<div class="header-utilities">
				{#if $enabledTools.includes("geocoder")}
					<HeaderUtilityGeocoder />
				{/if}
				{#if $enabledTools.includes("modeswitcher")}
					<HeaderUtilityModeSwitcher />
				{/if}
				<Language />
				<HeaderActionLink title="Visit GitHub" icon={LogoGithub} href="https://github.com/leia-project" target="_blank"/>
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
				{#each Object.keys(toolOrder) as toolKey }
					{#if $enabledTools.includes(toolKey)}
						<svelte:component
							this={toolOrder[toolKey]}
							label={aliasDict[toolKey] ?? $_(`tools.${toolKey}.label`)}
							{...toolProps(toolKey)}
						/>
					{/if}
				{/each}

				{#if $enabledTools.includes("theme")}
					<MapToolTheme />
				{/if}

				{#if $enabledTools.includes("featureInfo")}
					<MapToolFeatureInfo	
						label={$_("tools.featureInfo.label")}
						textNoData={$_("tools.featureInfo.noData")}/>
				{/if}

				{#if $enabledTools.includes("info")}
					<MapToolInfo />
				{/if}

				{#if $enabledTools.includes("help")}
					<MapToolHelp />
				{/if}

				{#if $enabledTools.includes("cesium")}
					<MapToolCesiumControls />
				{/if}

				{#if $enabledTools.includes("config_switcher")}
					<MapToolConfigSwitcher />
				{/if}
			</MapToolMenu>
		{/if}

		{#if mapVisible}
			<div class="map-body">
				<div class="map-wrapper">
						<Map />

					{#if !$enabledTools.includes("flyCamera")}
					<MapControls />												
					{:else}
					<POVMapControls />												
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

	.logo_github {
		color: white;
	}

</style>
