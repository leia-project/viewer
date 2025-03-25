<script lang="ts">
	import { _ } from "svelte-i18n";
	import QA from "./components/QA.svelte";
	import Chat from "./components/Chat.svelte";
	import Settings from "./components/Settings/Settings.svelte";
	import type { MarvinApp } from "./marvin";

	export let app: MarvinApp;

	const questions = app.qaManager.entries;

</script>
<div class="menu-container">
    <div class="menu-header">
        <div class="menu-title">
            <p class="menu-app-title">{$_("appTitle")}</p>
            <p class="menu-app-subtitle">- {$_("appSubtitle")}</p>
        </div>
        <div>
            <Settings />
            <!-- <button onclick={() => (app.commandPalette.open = !app.commandPalette.open)} class="btn-icon preset-filled" title="">
                <Terminal size={18} />
            </button> -->
        </div>
    </div>

    <hr class="menu-divider" />

    <!-- Scrollable content inside the sidebar -->
    {#if $questions.length !== 0}
        <div class="menu-scrollable">
            <div class="menu-questions">
                {#each $questions as qa}
                    <QA {app} {qa} />
                {/each}
            </div>
        </div>
    {/if}

    <Chat {app} />
</div>

<style>


    .menu-container {
		--surface-50: #f9fafb;
        --surface-200: #e5e7eb;
        --surface-800: #374151;
        --dark: #111827; 

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

    .menu-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .menu-title {
        display: flex;
        align-items: center;
        gap: 0.25rem;
    }

    .menu-app-title {
        font-size: 1rem; /* Equivalent to type-menu */
        color: var(--surface-800);
    }

    .menu-app-subtitle {
        font-size: 0.75rem; /* Equivalent to type-caption */
        color: var(--surface-800);
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