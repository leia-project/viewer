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
	import MapToolInfo from "$lib/components/ui/components/MapTools/MapToolInfo/MapToolInfo.svelte";
	import NotificationView from "$lib/components/ui/components/Notifications/NotificationView.svelte";
	import MapToolHelp from "$lib/components/ui/components/MapTools/MapToolHelp/MapToolHelp.svelte";
	import Map from "$lib/components/Map.svelte";
	import MapToolTheme from "$lib/components/Tools/Theme.svelte";
	import Language from "$lib/components/Tools/Language.svelte";
	import { Attributions } from "$lib/app/attributions";
	import MapToolConfigSwitcher from "./ui/components/MapTools/MapToolConfigSwitcher/MapToolConfigSwitcher.svelte";

	const settings = writable<any>({});
	const enabledTools = writable<Array<string>>(new Array<string>());
	const base = process.env.APP_URL;
	let mapVisible = true;
	let interfaceVisible = true;
	
	const map = app.map;
	$: layers = $map ? $map.layers : [];
	$: library = $map ? $map.layerLibrary : undefined;

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

	setContext("page", {
		app
	})
</script>

<svelte:head>
	<title>{$settings.title + ' - ' + $settings.subTitle}</title>
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
				<Language />
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
				{#if $enabledTools.includes("layerlibrary")}
					<MapToolLayerLibrary
						label={$_("tools.layerLibrary.label")}
					/>
				{/if}

				{#if $enabledTools.includes("layermanager")}
					<MapToolLayerManager
						layers={$layers}
						library={library}
						label={$_("tools.layerManager.label")}
						textBaselayers={$_("tools.layerManager.baseLayers")}
						textThematicLayers={$_("tools.layerManager.thematicLayer")}
						textOpacity={$_("tools.layerManager.opacity")}
						textLegend={$_("tools.layerManager.legend")}
					>
						<CesiumBackgroundControls
							slot="backgroundControls"
							textOpacity={$_("tools.backgroundControls.opacity")}
						/>
					</MapToolLayerManager>
				{/if}

					

				{#if $enabledTools.includes("bookmarks")}
					<MapToolBookmark
						label={$_("tools.bookmarks.label")}
						textTitle={$_("tools.bookmarks.title")}
						textSave={$_("tools.bookmarks.save")}
						textCancel={$_("tools.bookmarks.cancel")}
						textDelete={$_("tools.bookmarks.delete")}
						textAdd={$_("tools.bookmarks.add")}
						textDescription={$_("tools.bookmarks.description")}
						textInfoCameraPosition={$_("tools.bookmarks.cameraPosition")}
						textInfoCameraPositionSubtitle={$_("tools.bookmarks.cameraPositionSubtitle")}
						textNoBookmarks={$_("tools.bookmarks.noBookmarks")}
						textNoBookmarksSubtitle={$_("tools.bookmarks.noBookmarksSubtitle")}
					/>
				{/if}

				{#if $enabledTools.includes("featureinfo")}
					<MapToolFeatureInfo
						label={$_("tools.featureInfo.label")}
						textNoData={$_("tools.featureInfo.noData")}
					/>
				{/if}

				{#if $enabledTools.includes("theme")}
					<MapToolTheme />
				{/if}

				{#if $enabledTools.includes("measure")}
					<MapToolCesiumMeasure
						label={$_("tools.measure.label")}
						textNoMeasurements={$_("tools.measure.noMeasurement")}
						textNoMeasurementsSubtitle={$_("tools.measure.noMeasurementSubtitle")}
						textAdd={$_("tools.measure.add")}
						textEditMeasurement={$_("tools.measure.edit")}
						textTitle={$_("tools.measure.title")}
						textDefaultTitle={$_("tools.measure.defaultTitle")}
						textSave={$_("tools.measure.save")}
						textRecord={$_("tools.measure.record")}
						textDelete={$_("tools.measure.delete")}
						textCameraPosition={$_("tools.measure.cameraPosition")}
						textTotalLength={$_("tools.measure.totalLength")}
						textMeasurementPoints={$_("tools.measure.points")}
					/>
				{/if}

				{#if $enabledTools.includes("projects")}
					<MapToolProjects
						label={$_("tools.projects.label")}
					/>
				{/if}

				{#if $enabledTools.includes("info")}
					<MapToolInfo attribution={Attributions} txtViewerTitle={undefined} txtViewerDescription={undefined} />
				{/if}

				{#if $enabledTools.includes("help")}
					<MapToolHelp />
				{/if}

				{#if $enabledTools.includes("cesium")}
					<MapToolCesiumControls
						label={$_("tools.controls.label")}
						textSunPosition={$_("tools.controls.sunPosition")}
						textSunPositionDate={$_("tools.controls.sunPositionDate")}
						textSunPositionHour={$_("tools.controls.sunPositionHour")}
						textQuality={$_("tools.controls.quality")}
						textRendering={$_("tools.controls.rendering")}
						textEnvironment={$_("tools.controls.environment")}
						textDebug={$_("tools.controls.debug")}
						textLow={$_("tools.controls.low")}
						textMedium={$_("tools.controls.medium")}
						textHigh={$_("tools.controls.high")}
						textCustom={$_("tools.controls.custom")}
						textAnimate={$_("tools.controls.animate")}
						textFXAA={$_("tools.controls.fxaa")}
						textFog={$_("tools.controls.fog")}
						textGroundAtmosphere={$_("tools.controls.groundAtmosphere")}
						textHighDynamicRange={$_("tools.controls.dynamicRange")}
						textLighting={$_("tools.controls.lighting")}
						textMSAA={$_("tools.controls.msaa")}
						textMaximumScreenspaceError={$_("tools.controls.maximumScreenspaceError")}
						textResolutionScale={$_("tools.controls.resolutionScale")}
						textShadows={$_("tools.controls.shadows")}
						textSkyAtmosphere={$_("tools.controls.skyAtmosphere")}
						textFPSCounter={$_("tools.controls.FPSCounter")}
						textInspector={$_("tools.controls.inspector")}
						textMouseCoordinates={$_("tools.controls.coordinates")}
						textPointCloud={$_("tools.controls.pointCloud")}
						textPointCloudAttenuation={$_("tools.controls.pointCloudAttenuation")}
						textPointCloudAttenuationBaseResolution={$_(
							"tools.controls.pointCloudAttenuationBaseResolution"
						)}
						textPointCloudAttenuationErrorScale={$_("tools.controls.pointCloudAttenuationErrorScale")}
						textPointCloudAttenuationMaximum={$_("tools.controls.pointCloudAttenuationMaximum")}
						textPointCloudEDL={$_("tools.controls.pointCloudEDL")}
						textPointCloudEDLRadius={$_("tools.controls.pointCloudEDLRadius")}
						textPointCloudEDLStrength={$_("tools.controls.pointCloudEDLStrength")}
					/>
				{/if}

				{#if $enabledTools.includes("config_switcher")}
					<MapToolConfigSwitcher />
				{/if}

				{#if $enabledTools.includes("stories")}
					<MapToolStories
						label={$_("tools.stories.label")}
						textBack={$_("tools.stories.back")}
						textStepBack={$_("tools.stories.stepBack")}
						textStepForward={$_("tools.stories.stepForward")}
					/>
				{/if}

			</MapToolMenu>
		{/if}
		{#if mapVisible}
			<div class="map-body">
				<div class="map-wrapper">
					<Map />
					<MapControls />
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
