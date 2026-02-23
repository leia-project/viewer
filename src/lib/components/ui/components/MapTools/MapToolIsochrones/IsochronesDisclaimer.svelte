<script lang="ts">
    import { Button, Modal } from "carbon-components-svelte";
    import WarningHex from "carbon-icons-svelte/lib/WarningHex.svelte";

    let showDisclaimer = false;
</script>

<div class="component">
    <Button
        kind="danger-tertiary"
        size="small"
        icon={WarningHex}
        on:click={() => {
            showDisclaimer = true;
        }}
    >
        Disclaimer
    </Button>
</div>

{#if showDisclaimer}
    <Modal
        passiveModal
        open={true}
        modalHeading="Disclaimer"
        on:close={() => {
            showDisclaimer = false;
        }}
    >
        <p>
            De gebieden die (gedeeltelijk) buiten Zeeland liggen laten mogelijk onjuiste waardes zien. De berekende druk op de woningmarkt van die gebieden kan hoger lijken dan deze in werkelijkheid is. Dit is te verklaren doordat de woningbouwdata van de omliggende gebieden momenteel ontbreekt, waardoor alleen gerekend wordt met het aantal nieuwe vestigende inwoners. Dit aantal wordt in deze gebieden niet verrekend met woningen die gepland staan, terwijl er in werkelijkheid mogelijk wel woningen bijkomen.
        </p>
    </Modal>
{/if}

<style>
    .component :global(button) {
        width: auto;
    }
</style>
