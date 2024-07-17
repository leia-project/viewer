<script lang="ts">
	import Page from "$lib/components/Page.svelte";
	const base = process.env.APP_URL;
</script>

<svelte:head>
	<base href="{base}"> <!-- This is the base path for the app -->
</svelte:head>

<Page />