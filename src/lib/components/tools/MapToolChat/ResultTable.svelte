<script lang="ts">
	import { artifactCaption, artifactColumns, artifactRows, formatCell } from "./artifact";

	/* Het resultaat van een backend-tool als tabel, met een bijschrift erboven. */
	export let content: unknown;

	const MAX_ROWS = 15;

	$: rows = artifactRows(content);
	$: columns = artifactColumns(rows);
</script>

<span class="result__caption">{artifactCaption(content, rows.length)}</span>
{#if rows.length === 0}
	<span class="result__empty">Geen resultaten.</span>
{:else}
	<div class="result__scroll">
		<table class="data-table">
			<thead>
				<tr>
					{#each columns as column}<th>{column}</th>{/each}
				</tr>
			</thead>
			<tbody>
				{#each rows.slice(0, MAX_ROWS) as row}
					<tr>
						{#each columns as column}<td>{formatCell(row[column])}</td>{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	{#if rows.length > MAX_ROWS}
		<span class="result__caption">+ {rows.length - MAX_ROWS} meer</span>
	{/if}
{/if}

<style>
	.result__caption,
	.result__empty {
		color: var(--cds-text-03, #a8a8a8);
	}

	.result__empty {
		font-style: italic;
	}

	/* De tabel mag breder worden dan het paneel; dit blok schuift dan in plaats van
	   de layout op te rekken. */
	.result__scroll {
		overflow-x: auto;
		max-width: 100%;
	}

	.data-table {
		border-collapse: collapse;
		font-size: 0.6875rem;
	}

	.data-table th,
	.data-table td {
		padding: 0.25rem 0.5rem;
		text-align: left;
		vertical-align: top;
		white-space: nowrap;
	}

	.data-table th {
		font-weight: 600;
		color: var(--cds-text-01, #161616);
		border-bottom: 1px solid var(--cds-ui-04, #8d8d8d);
	}

	.data-table td {
		border-bottom: 1px solid var(--cds-ui-03, #e0e0e0);
	}

	.data-table tbody tr:last-child td {
		border-bottom: none;
	}
</style>
