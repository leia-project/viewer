<script lang="ts">
	import { _ } from "svelte-i18n";
	import { DataTable } from "carbon-components-svelte";

	import type { BroObject } from "$lib/bro/bro-api";
	import { BHRGT_LAYER_COLUMNS } from "$lib/bro/bro-schemas";

	export let object: BroObject;

	$: attributeHeaders = [
		{ key: "attribute", value: $_("tools.featureInfo.attribute"), width: "280px", empty: false },
		{ key: "value", value: $_("tools.featureInfo.value"), empty: false }
	];

	function formatValue(value: unknown): string | undefined {
		if (value === null || value === undefined || value === "") {
			return undefined;
		}
		if (value instanceof Date) {
			return value.toISOString().slice(0, 10);
		}
		if (typeof value === "object") {
			const location = value as { x?: number; y?: number; epsg?: string };
			if (location.x !== undefined && location.y !== undefined) {
				return `${location.x}, ${location.y} (EPSG:${location.epsg})`;
			}
			return undefined;
		}
		return String(value);
	}

	$: attributeRows = Object.entries(object.parsed)
		.filter(([key]) => key !== "meta" && key !== "layers")
		.map(([key, value]) => ({ id: key, attribute: key, value: formatValue(value) }))
		.filter((row) => row.value !== undefined);

	$: layerRows =
		object.type === "bhrgt"
			? object.parsed.layers.map((layer, i) => {
					type Row = { id: string } & Record<string, string>;
					const row: Row = { id: String(i) };
					for (const column of BHRGT_LAYER_COLUMNS) {
						row[column] = formatValue(layer[column]) ?? "";
					}
					return row;
				})
			: [];

	const layerHeaders = BHRGT_LAYER_COLUMNS.map((column) => ({ key: column, value: column }));
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
