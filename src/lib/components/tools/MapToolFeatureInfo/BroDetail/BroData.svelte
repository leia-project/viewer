<script lang="ts">
	import { _ } from "svelte-i18n";
	import { DataTable } from "carbon-components-svelte";

	import type { Location } from "@bedrock-engineer/bro-xml-parser";

	import type { BroObject } from "$lib/bro/bro-api";
	import { BHRGT_LAYER_COLUMNS } from "$lib/bro/bro-schemas";
	import { decode } from "$lib/bro/bro-decoders";
	import { fieldLabel, layerFieldLabel } from "$lib/bro/bro-labels";

	export let object: BroObject;

	$: attributeHeaders = [
		{ key: "attribute", value: $_("tools.featureInfo.attribute"), width: "280px", empty: false },
		{ key: "value", value: $_("tools.featureInfo.value"), empty: false }
	];

	function formatDate(date: Date): string {
		return date.toISOString().slice(0, 10);
	}

	function isLocation(value: object): value is Location {
		return "x" in value && "y" in value && "epsg" in value;
	}

	function formatLocation(location: Location): string {
		return `${location.x}, ${location.y} (${location.epsg})`;
	}

	/** Render a parsed BRO value for display */
	function formatValue(value: unknown, yesNo: { yes: string; no: string }): string {
		if (value === null || value === undefined) {
			return "";
		}

		if (typeof value === "boolean") {
			return value ? yesNo.yes : yesNo.no;
		}

		if (value instanceof Date) {
			return formatDate(value);
		}

		if (typeof value === "object") {
			return isLocation(value) ? formatLocation(value) : "";
		}

		return String(value);
	}

	$: yesNo = { yes: $_("tools.featureInfo.yes"), no: $_("tools.featureInfo.no") };

	$: attributeRows = Object.entries(object.parsed)
		.filter(([key]) => key !== "meta" && key !== "layers")
		.map(([key, value]) => ({
			id: key,
			attribute: fieldLabel(object.type, key),
			value: formatValue(decode(key, value), yesNo)
		}))
		.filter((row) => row.value !== "");

	$: layerRows =
		object.type === "bhrgt"
			? object.parsed.layers.map((layer, i) => {
					type Row = { id: string } & Record<string, string>;
					const row: Row = { id: String(i) };
					for (const column of BHRGT_LAYER_COLUMNS) {
						row[column] = formatValue(decode(column, layer[column]), yesNo);
					}
					return row;
				})
			: [];

	const layerHeaders = BHRGT_LAYER_COLUMNS.map((column) => ({
		key: column,
		value: layerFieldLabel(column)
	}));
</script>

<div class="bro-data">
	<DataTable size="compact" headers={attributeHeaders} rows={attributeRows} />

	{#if object.type === "bhrgt" && layerRows.length > 0}
		<div class="layers heading-compact-01">{$_("tools.featureInfo.bro.layers")}</div>
		
		<DataTable size="compact" headers={layerHeaders} rows={layerRows} />
	{/if}
</div>

<style>
	.layers {
		margin-top: var(--cds-spacing-06);
		margin-bottom: var(--cds-spacing-03);
	}
</style>
