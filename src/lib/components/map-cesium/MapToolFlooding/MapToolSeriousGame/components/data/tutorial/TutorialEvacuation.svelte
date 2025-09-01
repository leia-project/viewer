<script lang="ts">

	const colorScale = [
		"#1a9850", // dark green
		"#66bd63", // green
		"#a6d96a", // yellow-green
		"#d9ef8b", // light yellow
		"#ffffbf", // pale yellow
		"#fee08b", // light orange
		"#fdae61", // orange
		"#f46d43", // reddish orange
		"#d73027", // red
		"#a50026", // dark red
		"#800026"  // deeper red
	]; //https://colordesigner.io/gradient-generator - https://uigradients.com/#TheBlueLagoon

	const legendSteps = colorScale.map((color, i) => {
        const min = (i / 2.5).toFixed(1);
        const max = ((i + 1) / 2.5).toFixed(1);
        return {
            color,
            label: i < colorScale.length - 1
                ? `${min}–${max} m`
                : `${min}+ m`
        };
    });



</script>


<p>
	Tijdens de rampfase kun je inwoners evacueren. Dit doe je door een hexagon te selecteren dat je wilt evacueren en een evacuatiepunten. Die evacuatiepunten worden gevisualiseerd als silo's op het eindpunt van de belangrijkste vluchtroutes. Ontevreden over een evacuatie, dan kan deze weer worden weggehaald door op de delete-knop te klikken in evacuatielijst.
</p>
<p>
	De evacuatiemodule houdt rekening met overstromingsdieptes, bevolkingsdichtheden op basis van CBS-data en de capaciteit van het wegennetwerk. De belasting op de wegen wordt getoond op de kaart. Wanneer een weg volgelopen is (<span style="color: 'red';">rood</span>), kan deze niet meer worden gebruikt voor verdere evacuaties. Zodra een hexagon overstroomd is, kan deze niet meer geevacueerd worden en worden de achterblijvers opgeteld bij de slachtoffers.
</p>


<div class="legend-horizontal">
    {#each legendSteps as step, i}
        <div class="color-block" style="background-color: {step.color};"></div>
    {/each}
</div>
<div class="legend-labels">
    <span>{legendSteps[0].label.split("–")[0]}m</span>
    <span>{legendSteps[legendSteps.length - 1].label}</span>
</div>

<style>

    .legend-horizontal {
        display: flex;
        align-items: flex-end;
        margin: 1rem 0;
    }
    .color-block {
        flex-grow: 1;
        height: 20px;
        margin-bottom: 0.2em;
        min-width: 0;
    }
    .legend-labels {
        display: flex;
        justify-content: space-between;
        font-size: 0.9em;
        width: 100%;
    }
</style>