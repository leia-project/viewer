<script lang="ts">
	import { onMount } from 'svelte';
	import Grid from 'gridjs-svelte';

	let { data }: { data: Record<string, any>[] } = $props();

	let rows = $state<any>();
	let colums = $state<any>();

	let style = {
		table: {
			'white-space': 'wrap',
			color: '#fff',
			'background-color': '#1e1e1e',
			'border-style': 'hidden !important'
		},
		container: {
			'background-color': '',
			'max-width': '100%',
			'border-width': '0'
		},
		th: {
			'background-color': '#1e1e1e',
			color: '#fff',
			'text-align': 'center',
			'border-width': '0'
		},
		td: {
			'background-color': '#1e1e1e',
			color: '#fff',
			'border-color': 'rgba(68, 68, 68, 0.5)',
			'font-size': '13px',
			'font-family': 'monospace',
			'white-space': 'nowrap',
			'max-width': '100px',
			overflow: 'hidden',
			'text-overflow': 'ellipsis',
			padding: '8px'
		},
		header: {
			'border-width': '0',
			'border-style': 'hidden !important'
		},
		footer: {
			'background-color': '#1e1e1e',
			color: '#fff',
			'border-width': '0',
			'text-align': 'center'
		}
	};

	let pagination = {
		limit: 10
	};

	onMount(async () => {
		if (data.length > 0) {
			const keys = Object.keys(data[0]);
			colums = keys.map((key) => ({ name: key }));

			/* colums.forEach((column: any) => {
				if (column.name.includes('geom') || column.name.includes('geometry')) {
					column.formatter = (cell: any) => {
						if (cell) {
							return 'truncated';
						}
					};
				}
			}); */

			rows = data.map((row) => {
				const values = keys.map((key) => row[key]);
				return values;
			});
		}
	});
</script>

{#if rows}
	<div class="width-[10rem]">
		<Grid data={rows} columns={colums} {style} {pagination} search />
	</div>
{/if}

<style global>
	@import 'https://cdn.jsdelivr.net/npm/gridjs/dist/theme/mermaid.min.css';
</style>
