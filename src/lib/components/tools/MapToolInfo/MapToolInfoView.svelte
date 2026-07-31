<script lang="ts">
	import { createEventDispatcher } from "svelte";
	import { _ } from "svelte-i18n";
	import { Modal } from "carbon-components-svelte";
	import { Attribution } from "./attribution";

	export let txtViewerTitle: string | undefined;
	export let txtViewerDescription: string | undefined;
	export let attribution: Array<Attribution> = new Array<Attribution>();

	export let tostiAttribution = new Array<Attribution>(
		new Attribution(
			"fontsource/open-sans",
			"Font used in our application",
			"fontsource/open-sans Contributors",
			"https://github.com/fontsource/fontsource",
			"MIT"
		),
		new Attribution(
			"sass",
			"Used to compile SCSS stylesheets.",
			"sass",
			"https://github.com/sass/dart-sass",
			"MIT"
		),
		new Attribution(
			"carbon-components-svelte",
			"Design System and components used in our application",
			"carbon-components-svelte Contributors",
			"https://github.com/carbon-design-system/carbon-components-svelte",
			"Apache License 2.0"
		),
		new Attribution(
			"carbon-icons-svelte",
			"Most of the icons used in our application",
			"carbon-icons-svelte Contributors",
			"https://github.com/carbon-design-system/carbon-icons-svelte",
			"Apache License 2.0"
		),
		new Attribution(
			"carbon/charts-svelte",
			"Used to render Carbon chart components in the Stories tool.",
			"carbon-design-system",
			"https://github.com/carbon-design-system/carbon-charts",
			"Apache-2.0"
		),
		new Attribution(
			"echarts",
			"Used to render charts in the Stories tool.",
			"apache",
			"https://github.com/apache/echarts",
			"Apache-2.0"
		),
		new Attribution(
			"observablehq/plot",
			"Used to generate data visualizations in the FeatureInfo tool.",
			"Observable, Inc.",
			"https://github.com/observablehq/plot",
			"ISC"
		),
		new Attribution(
			"svelte-parts/zoom",
			"Used in FeatureInfo popups containing a zoomable image.",
			"Idris-maps",
			"https://github.com/idris-maps/svelte-parts",
			"MIT"
		),
		new Attribution(
			"Aim Logo Icon",
			"Used as a position selection marker for the human perspective.",
			"Pixel Icons",
			"https://iconscout.com/free-icon/aim-183_722670",
			"Creative Commons Attribution 4"
		),
		new Attribution(
			"lukeed/uuid",
			"Used to generate lightweight UUIDs.",
			"lukeed",
			"https://github.com/lukeed/uuid",
			"MIT"
		),
		new Attribution(
			"fuzzysort",
			"Fast, Tiny, & Good SublimeText-like fuzzy search for JavaScript.",
			"farzher",
			"https://github.com/farzher/fuzzysort",
			"MIT"
		),
		new Attribution(
			"fast-xml-parser",
			"Used to parse XML capabilities and metadata responses.",
			"Natural Intelligence",
			"https://github.com/NaturalIntelligence/fast-xml-parser",
			"MIT"
		),
		new Attribution(
			"cesium",
			"Used for 3D globe rendering and geospatial visualization.",
			"Cesium GS, Inc.",
			"https://github.com/CesiumGS/cesium",
			"Apache-2.0"
		),
		new Attribution(
			"tile-kiln",
			"Used for vector tile generation utilities.",
			"devTristan",
			"https://github.com/devTristan/tile-kiln",
			"MIT"
		),
		new Attribution(
			"gdal3.js",
			"Used for geopackage data processing.",
			"bugra9",
			"https://github.com/bugra9/gdal3.js",
			"LGPL-2.1 license"
		),
		new Attribution(
			"wicket",
			"Used for WKT parsing and conversion in geocoder workflows.",
			"arthur-e",
			"https://github.com/arthur-e/Wicket",
			"MIT"
		),
		new Attribution(
			"jsPDF",
			"Used to generate a summary PDF based on input data in the Stories and Statistics tool.",
			"parallax",
			"https://github.com/parallax/jsPDF",
			"MIT"
		),
		new Attribution(
			"html-to-image",
			"Used to generate a PNG based on input data in the Statistics tool.",
			"bubkoo",
			"https://github.com/bubkoo/html-to-image",
			"MIT"
		)
	);

	$: att = [...attribution, ...tostiAttribution];

	const dispatch = createEventDispatcher();

	function removeFromView(e: any) {
		e.preventDefault();
		e.stopPropagation();
		e.stopImmediatePropagation();
		dispatch("remove");
	}
</script>

<Modal
	open={true}
	modalHeading={$_("tools.info.label")}
	primaryButtonText={$_("tools.info.close")}
	on:click:button--secondary={(e) => {
		removeFromView(e);
	}}
	on:open
	on:close={(e) => {
		removeFromView(e);
	}}
	on:submit={(e) => {
		removeFromView(e);
	}}
>
	<p>
		{$_("tools.info.general")}
	</p>

	{#if txtViewerTitle}
		<div class="viewer-text">
			<h4>{txtViewerTitle}</h4>
			<p>{@html txtViewerDescription}</p>
		</div>
	{/if}

	<div class="attribution-wrapper">
		<h4>{$_("tools.info.attribution")}</h4>
		{#each att as a}
			<div class="attribution">
				<!-- svelte-ignore security-anchor-rel-noreferrer -->
				<h5><a href={a.source} target="_blank">{a.title}</a></h5>
				<p class="description">{a.description}</p>
				<div class="license">
					by {a.author} - {a.license}
				</div>
			</div>
		{/each}
	</div>
</Modal>

<style>
	.viewer-text {
		width: 100%;
		margin-top: var(--cds-spacing-05);
		margin-bottom: var(--cds-spacing-03);
	}

	.viewer-text h4 {
		margin-bottom: var(--cds-spacing-03);
	}

	.attribution-wrapper {
		margin-top: var(--cds-spacing-05);
	}

	.attribution {
		background-color: var(--cds-ui-03);
		padding: var(--cds-spacing-03);
		margin-top: var(--cds-spacing-03);
		margin-bottom: var(--cds-spacing-03);
	}

	.license {
		width: 100%;
		text-align: right;
		font-size: var(--tosti-font-size-small);
	}

	.description {
		margin-top: var(--cds-spacing-03);
	}

	h5 a {
		text-decoration: none;
		color: black;
	}
</style>
