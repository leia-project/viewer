<script lang="ts">
    import { Button, Modal } from "carbon-components-svelte";
    import Help from "carbon-icons-svelte/lib/Help.svelte";

    let showExplainer = false;
</script>

<div class="component">
    <Button
        kind="tertiary"
        size="small"
        icon={Help}
        on:click={() => {
            showExplainer = true;
        }}
    >
        Legenda Uitleg
    </Button>
</div>

{#if showExplainer}
    <Modal
        passiveModal
        open={true}
        modalHeading="Uitleg Legenda"
        on:close={() => {
            showExplainer = false;
        }}
    >
        <p>
            De kleuren geven aan hoe de druk op de woningmarkt verandert wanneer er een ontwikkeling plaatsvindt op de gekozen locatie. De eenheid is het verschil tussen het geschatte aantal mensen dat zich in een gebied zal vestigen en het aantal beschikbare woonplaatsen op basis van huidige woningbouwplannen.  Hoe donkerder de kleur, hoe hoger de geschatte druk. Groen geeft aan waar gebieden zijn zonder toename in druk op de woningmarkt. Deze berekening is op basis van het aantal geplande nieuwbouwwoningen en de aanname over een huishoudensgrootte van 2.1, verrekend met het geschatte aantal mensen dat zich waarschijnlijk in het gebied zal vestigen op basis van autoreistijdafstanden.
        </p>
    </Modal>
{/if}

<style>
    .component :global(button) {
        width: auto;
    }
</style>
