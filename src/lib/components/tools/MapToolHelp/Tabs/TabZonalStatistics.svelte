<script lang="ts">
	export let _: any;
	export let base: string;
	export let toolTitle: string;
</script>

<div class="heading-04">{toolTitle}</div>

<div class="body-02">
	{$_("tools.help.zonalStatistics.description")}
</div>

<div class="img">
	<img src="{base}/images/help_zonalstatistics_overview.png" style="width:100%" alt="{toolTitle} overview" />
</div>

<div class="heading-02">{$_("tools.help.zonalStatistics.headingOpen")}</div>
<div class="body-02">
	{$_("tools.help.zonalStatistics.open", { values: { title: toolTitle } })}
</div>

<div class="img-left">
	<img src="{base}/images/help_zonalstatistics_open.png" alt="{toolTitle} icon" />
</div>

<div class="heading-02">{$_("tools.help.zonalStatistics.headingSelectLayer")}</div>
<div class="body-02">
	{$_("tools.help.zonalStatistics.selectLayer")}
</div>

<div class="img-left">
	<img src="{base}/images/help_zonalstatistics_menu.png" alt="layer panel" />
</div>

<div class="heading-02">{$_("tools.help.zonalStatistics.headingTable")}</div>
<div class="body-02">
	{$_("tools.help.zonalStatistics.table")}
</div>

<div class="heading-02">{$_("tools.help.zonalStatistics.headingSelectZones")}</div>
<div class="body-02">
	{$_("tools.help.zonalStatistics.selectZones")}
</div>

<div class="img-left">
	<img src="{base}/images/help_zonalstatistics_table.png" alt="comparison table" />
</div>

<div class="heading-02">{$_("tools.help.zonalStatistics.headingExport")}</div>
<div class="body-02">
	{$_("tools.help.zonalStatistics.export")}
</div>

<style>
	[class*="img"] {
		border: 1px solid var(--cds-ui-03);
		margin-bottom: var(--cds-spacing-05);
		margin-top: var(--cds-spacing-03);
	}

	.img-left {
		width: fit-content;
	}

	.body-02 {
		margin-bottom: var(--cds-spacing-05);
	}
</style>
