<script lang="ts">
    import { CodeSnippet, DataTable, Modal } from "carbon-components-svelte";
	import { WarningSquareFilled } from "carbon-icons-svelte";

	import type { QA } from "../module/qa";

    export let qa: QA;

    const qaResult = qa.result;

    let open = false;

</script>

<Modal
    bind:open
>
    <header class="flex justify-between">
        <h2 class="h2">{qa.question}</h2>
    </header>

    <div class="mb-4 h-full overflow-y-auto p-4">
        <article class="flex h-full flex-col gap-4">
            <div>
                <h5 class="h5 mb-2">Summary</h5>
                <p>{$qaResult?.summary}</p>
            </div>

            {#if $qaResult?.executionTime}
                <div>
                    <h5 class="h5 mb-2">Execution Time</h5>
                    <p></p>
                    <CodeSnippet code={`${($qaResult.executionTime / 1000).toFixed(2)} seconds`} />
                </div>
            {/if}

            <div>
                <h5 class="h5 mb-2">Data</h5>
                <DataTable rows={$qaResult.data} />
            </div>

            {#if $qaResult?.debug}
                <div>
                    <h5 class="h5 mb-2">Query</h5>
                    <CodeSnippet code={$qaResult.debug.sql} />
                </div>

                {#if $qaResult.debug?.documentation}
                    <div>
                        <h5 class="h5 mb-2">Related Documents</h5>
                        <div class="flex flex-col gap-2">
                            {#each $qaResult.debug.documentation as doc}
                                <CodeSnippet code={doc.replace(/\n/, "")} />
                            {/each}
                        </div>
                    </div>
                {/if}

                {#if $qaResult.debug?.ddl}
                    <div>
                        <h5 class="h5 mb-2">Related DDL</h5>
                        <div class="flex flex-wrap items-stretch gap-2">
                            {#each $qaResult.debug.ddl as ddl}
                                <CodeSnippet code={ddl.replace("\n", "").trim()} />
                            {/each}
                        </div>
                    </div>
                {/if}

                {#if $qaResult.debug?.similarQuestions}
                    <div>
                        <h5 class="h5 mb-2">Related Questions</h5>
                        <div class="flex flex-col items-stretch gap-3">
                            {#each $qaResult.debug.similarQuestions as q}
                                <div class="card preset-filled-surface-100-900 border-surface-200-800 w-full border-[1px] p-4 text-left">
                                    <div class="pb-2">
                                        <b>{q}</b>
                                    </div>
                                    <!-- <CodeSnippet code={`${q.sql}`} /> -->
                                </div>
                            {/each}
                        </div>
                    </div>
                {/if}

                <div>
                    <h5 class="h5 mb-2">Logs</h5>
                    <CodeSnippet code={$qaResult.debug.getLogs()} />
                </div>

                {#if $qaResult.debug?.sqlPrompt}
                    <div class="flex flex-col items-stretch gap-3">
                        <h5 class="h5 mb-2">SQL Prompt</h5>

                        {#each $qaResult.debug.sqlPrompt as p}
                            <div class="card preset-filled-surface-100-900 border-surface-200-800 w-full border-[1px] p-4 text-left">
                                <div class="pb-2">
                                    <b>{p}</b>
                                </div>
                                <!-- <CodeSnippet code={`${p.content}`} /> -->
                            </div>
                        {/each}
                    </div>
                {/if}
            {:else}
                <div>
                    <h5 class="h5 mb-2">Debug Info</h5>
                </div>

                <div class="card preset-outlined-warning-500 grid grid-cols-1 items-center gap-4 p-4 lg:grid-cols-[auto_1fr_auto]">
                    <WarningSquareFilled color="#ffd966" />
                    <div>
                        <p class="font-bold">Info</p>
                        <p class="type-scale-1 opacity-60">No debug information requested from server</p>
                    </div>
                </div>
            {/if}
        </article>
    </div>
    <footer class="flex justify-end gap-4">
        <button type="button" class="btn preset-filled" on:click={switchModalState}>Close</button>
    </footer>
</Modal>