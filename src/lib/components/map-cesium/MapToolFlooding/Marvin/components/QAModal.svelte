<script lang="ts">
    import { CodeSnippet, DataTable, Modal } from "carbon-components-svelte";
	import { WarningSquareFilled } from "carbon-icons-svelte";

	import type { QA } from "../module/qa";

    export let qa: QA;

    const qaResult = qa.result;

    let open = false;

</script>


<Modal bind:open>
    <header class="modal-header">
        <h2 class="modal-title">{qa.question}</h2>
    </header>

    <div class="modal-body">
        <article class="modal-content">
            <div>
                <h5 class="section-title">Summary</h5>
                <p>{$qaResult?.summary}</p>
            </div>

            {#if $qaResult?.executionTime}
                <div>
                    <h5 class="section-title">Execution Time</h5>
                    <CodeSnippet code={`${($qaResult.executionTime / 1000).toFixed(2)} seconds`} />
                </div>
            {/if}

            <div>
                <h5 class="section-title">Data</h5>
                <DataTable rows={$qaResult.data} />
            </div>

            {#if $qaResult?.debug}
                <div>
                    <h5 class="section-title">Query</h5>
                    <CodeSnippet code={$qaResult.debug.sql} />
                </div>

                {#if $qaResult.debug?.documentation}
                    <div>
                        <h5 class="section-title">Related Documents</h5>
                        <div class="related-docs">
                            {#each $qaResult.debug.documentation as doc}
                                <CodeSnippet code={doc.replace(/\n/, "")} />
                            {/each}
                        </div>
                    </div>
                {/if}

                {#if $qaResult.debug?.ddl}
                    <div>
                        <h5 class="section-title">Related DDL</h5>
                        <div class="related-ddl">
                            {#each $qaResult.debug.ddl as ddl}
                                <CodeSnippet code={ddl.replace("\n", "").trim()} />
                            {/each}
                        </div>
                    </div>
                {/if}

                {#if $qaResult.debug?.similarQuestions}
                    <div>
                        <h5 class="section-title">Related Questions</h5>
                        <div class="related-questions">
                            {#each $qaResult.debug.similarQuestions as q}
                                <div class="card">
                                    <div class="card-content">
                                        <b>{q}</b>
                                    </div>
                                </div>
                            {/each}
                        </div>
                    </div>
                {/if}

                <div>
                    <h5 class="section-title">Logs</h5>
                    <CodeSnippet code={$qaResult.debug.getLogs()} />
                </div>

                {#if $qaResult.debug?.sqlPrompt}
                    <div class="sql-prompt">
                        <h5 class="section-title">SQL Prompt</h5>
                        {#each $qaResult.debug.sqlPrompt as p}
                            <div class="card">
                                <div class="card-content">
                                    <b>{p}</b>
                                </div>
                            </div>
                        {/each}
                    </div>
                {/if}
            {:else}
                <div>
                    <h5 class="section-title">Debug Info</h5>
                </div>

                <div class="warning-card">
                    <WarningSquareFilled color="#ffd966" />
                    <div>
                        <p class="warning-title">Info</p>
                        <p class="warning-description">No debug information requested from server</p>
                    </div>
                </div>
            {/if}
        </article>
    </div>
    <footer class="modal-footer">
        <button type="button" class="btn" on:click={() => (open = false)}>Close</button>
    </footer>
</Modal>


<style>
    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        border-bottom: 1px solid var(--surface-200);
    }

    .modal-title {
        font-size: 1.5rem;
        color: var(--surface-800);
    }

    .modal-body {
        margin-bottom: 1rem;
        height: 100%;
        overflow-y: auto;
        padding: 1rem;
    }

    .modal-content {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .section-title {
        font-size: 1rem;
        margin-bottom: 0.5rem;
        color: var(--surface-800);
    }

    .related-docs,
    .related-ddl,
    .related-questions,
    .sql-prompt {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .card {
        background-color: var(--surface-100);
        border: 1px solid var(--surface-200);
        border-radius: 0.375rem;
        padding: 1rem;
    }

    .card-content {
        padding-bottom: 0.5rem;
    }

    .warning-card {
        display: grid;
        grid-template-columns: auto 1fr;
        align-items: center;
        gap: 1rem;
        padding: 1rem;
        border: 1px solid var(--warning-500);
        background-color: var(--warning-100);
        border-radius: 0.375rem;
    }

    .warning-title {
        font-weight: bold;
        color: var(--warning-800);
    }

    .warning-description {
        font-size: 0.875rem;
        opacity: 0.6;
    }

    .modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: 1rem;
        padding: 1rem;
        border-top: 1px solid var(--surface-200);
    }

    .btn {
        background-color: var(--primary-500);
        color: white;
        border: none;
        border-radius: 0.375rem;
        padding: 0.5rem 1rem;
        cursor: pointer;
    }

    .btn:hover {
        background-color: var(--primary-600);
    }
</style>