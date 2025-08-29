<script>
  export let size = 16;

  export let title = undefined;

  $: labelled = $$props["aria-label"] || $$props["aria-labelledby"] || title;
  $: attributes = {
    "aria-hidden": labelled ? undefined : true,
    role: labelled ? "img" : undefined,
    focusable: Number($$props["tabindex"]) === 0 ? true : undefined
  };
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 32 32"
  fill="currentColor"
  preserveAspectRatio="xMidYMid meet"
  width={size}
  height={size}
  {...attributes}
  {...$$restProps}>
  {#if title}<title>{title}</title>{/if}
  <path stroke-width="0" d="m3,23v-14c0-.3555.189-.6846.4961-.8638L15.4961,1.1362c.3113-.1816.6965-.1816,1.0078,0l12,7c.3071.1792.4961.5083.4961.8638v14c0,.3555-.189.6846-.4961.8638l-12,7c-.3113.1816-.6965.1816-1.0078,0l-12-7c-.3071-.1792-.4961-.5083-.4961-.8638Zm2-13.4258v12.8516l11,6.4165,11-6.4165v-12.8516l-11-6.4165-11,6.4165Z"></path>
</svg>