<script lang="ts">
	import { get } from "svelte/store";
	import { _ } from "svelte-i18n";
	import { Button } from "carbon-components-svelte";
	import { Settings, Terminal } from "carbon-icons-svelte";
	import QA from "./components/QA.svelte";
	import Chat from "./components/Chat.svelte";
	import SettingsModal from "./components/Settings/Settings.svelte";
	import type { MarvinApp } from "./marvin";
	import CommandPalette from "./components/CommandPalette.svelte";
	import MarvinAvatar from "./components/MarvinAvatar.svelte";

	export let app: MarvinApp;

	const questions = app.qaManager.entries;

	let openMenu: boolean = false;

	let openModal: boolean = false;
	let modalComponent: any;
	let props: Record<string, any>;

	function setModal(component: any, properties: Record<string, any>): void {
		props = properties;
		modalComponent = component;
	}

</script>


<div class="menu-container" class:open={openMenu}>
	<div class="menu-header">
		<div class="menu-title">
			<div class="avatar">
				<MarvinAvatar animate={app.loading} bind:open={openMenu} />
			</div>
			<p class="menu-app-title">{$_("appTitle")}</p>
			<p class="menu-app-subtitle">{$_("appSubtitle")}</p>
		</div>
		<div class="header-buttons">
			<Button
				icon={Settings}
				iconDescription={"Settings"}
				size="small"
				on:click={() => setModal(SettingsModal, {})}
			/>
			<Button
				icon={Terminal}
				iconDescription={"Command Palette"}
				tooltipPosition="bottom"
				tooltipAlignment="end"
				size="small"
				on:click={() => {
					app.commandPalette.open.set(!get(app.commandPalette.open));
				}}
			/>
		</div>
	</div>

	<hr class="menu-divider" />

	<!-- Scrollable content inside the sidebar -->
	{#if $questions.length !== 0}
		<div class="menu-scrollable">
			<div class="menu-questions">
				{#each $questions as qa (qa.id)}
					<QA {app} {qa} on:openModal={(e) => setModal(e.detail.component, e.detail.props)} />
				{/each}
			</div>
		</div>
	{/if}

	<Chat {app} />
</div>

<CommandPalette {app} />

{#if modalComponent && props}
	<div style="pointer-events: auto">
		<svelte:component this={modalComponent} {...props} bind:open={openModal} />
	</div>
{/if}


<style>
	.menu-container {
		visibility: hidden;
		transform: translateX(calc(100% - 50px));
		transition: transform 1s;
		pointer-events: auto;

		--surface-50: #f9fafb;
		--surface-200: #e5e7eb;
		--surface-800: #374151;
		--dark: #111827;
		--primary-500: #007bff;
		--primary-600: #0056b3;
		--error-500: #dc3545;
		--error-600: #a71d2a;

		background-color: var(--surface-50);
		color: var(--dark);
		border: 1px solid var(--surface-200);
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		gap: 0.5rem;
		width: 25rem;
		border-radius: 0.375rem;
		padding: 0.75rem;
	}
	.menu-container.open {
		visibility: visible;
		transform: translateX(0);
	}

	.menu-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.menu-title {
		display: flex;
		align-items: center;
		column-gap: 0.5rem;
	}

	.avatar {
		visibility: visible;
		transform: scale(1.3);
		transition: transform 1s;
	}
	.open .avatar {
		transform: scale(1);
	}

	.menu-app-title {
		font-size: 1rem; /* Equivalent to type-menu */
		color: var(--surface-800);
	}

	.menu-app-subtitle {
		font-size: 0.75rem; /* Equivalent to type-caption */
		color: var(--surface-800);
		padding-top: 0.25rem;
		font-weight: 800;
	}

	.header-buttons {
		display: flex;
	}

	.menu-divider {
		border-color: var(--surface-200);
	}

	.menu-scrollable {
		display: flex;
		flex-direction: column;
		max-height: calc(100vh - 12rem);
		width: 100%;
		overflow-y: auto;
	}

	.menu-questions {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
</style>