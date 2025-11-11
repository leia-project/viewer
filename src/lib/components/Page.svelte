<script lang="ts">
	import { app } from "$lib/app/app";
	import { setContext } from "svelte";
	import { get, writable } from "svelte/store";

	import { _ } from "svelte-i18n";
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

	const settings = writable<any>({});
	const enabledTools = writable<Array<string>>(new Array<string>());
	const base = process.env.APP_URL;
	let mapVisible = true;
	let interfaceVisible = true;

	const userToolOrder: { id: any; ranking: any; }[] = []; 
	const aliasDict: { [key: string]: string | undefined } = {};
	const map = app.map;
	$: layers = $map ? $map.layers : [];
	$: library = $map ? $map.layerLibrary : undefined;
	$: title = $settings.title ? $settings.title + ' - ' + $settings.subTitle : $_('general.loading')
	
    // $: toolOrder = {
    //     layerlibrary: MapToolLayerLibrary,
    //     layermanager: MapToolLayerManager,
    //     bookmarks: MapToolBookmark,
    //     flooding: MapToolFlooding,
    //     stories: MapToolStories,
    //     projects: MapToolProjects,
    //     featureinfo: MapToolFeatureInfo,
    //     measure: MapToolCesiumMeasure,
    //     info: MapToolInfo,
    //     help: MapToolHelp,
    //     cesium: MapToolCesiumControls,
    //     config_switcher: MapToolConfigSwitcher,
    // };


	let toolOrder = {
        layerLibrary: MapToolLayerLibrary,
        layerManager: MapToolLayerManager,
        bookmarks: MapToolBookmark,
        flooding: MapToolFlooding,
        stories: MapToolStories,
        projects: MapToolProjects,
        featureInfo: MapToolFeatureInfo,
        measure: MapToolCesiumMeasure,
        info: MapToolInfo,
        help: MapToolHelp,
        cesium: MapToolCesiumControls,
        config_switcher: MapToolConfigSwitcher,
    };

    const orderedKeys = [
        'layerLibrary',
        'layerManager',
        'flooding',
		'stories',
        'projects',
        'featureInfo',
        'bookmarks',
        'measure',
        'info',
        'help',
        'cesium',
        'config_switcher'
    ];

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
							userToolOrder.push({
								id: setting.id, ranking: setting.settings.ranking
							});
    					}	

					let orderedToolOrder = {};

					orderedKeys.forEach(key => {
						if (toolOrder.hasOwnProperty(key)) {
							orderedToolOrder[key] = toolOrder[key];
						}
					});

					$: toolOrder = orderedToolOrder;
					}

					console.log(userToolOrder)
					console.log(toolOrder)
					
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
		console.log('enabled tools list' + tools)
	}

	function setColorTokens(tokens: any) {
		for (let i = 0; i < Object.keys(tokens).length; i++) {
			const tokenKey = Object.keys(tokens)[i];

			if (tokenKey in light) {
				light[tokenKey as keyof typeof light] = tokens[tokenKey];
			}
		}
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
				{#each Object.keys(toolOrder) as toolKey}
					{#if $enabledTools.includes(toolKey)}
						<svelte:component
							this={toolOrder[toolKey]}
							label={aliasDict[toolKey] ?? $_(`tools.${toolKey}.label`)}
							{...toolProps(toolKey)}
						/>
					{/if}
				{/each}

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
