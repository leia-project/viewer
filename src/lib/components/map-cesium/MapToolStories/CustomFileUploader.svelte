<script lang="ts">
    import { Button } from 'carbon-components-svelte';
    import { Upload } from 'carbon-icons-svelte';
    import { createEventDispatcher } from 'svelte';

    export let accept: any = [];
    export let multiple: boolean = false;
    export let disabled: boolean = false;
    export let kind: "primary" | "secondary" | "tertiary" | "ghost" | "danger" | "danger-tertiary" | "danger-ghost" | undefined = "tertiary";
    export let size: "small" | "default" | "field" | "lg" | "xl" | undefined = "default";
    export let labelText: string = "Add file";
    export let id: string = "ccs-" + Math.random().toString(36);
    export let name: string = "";

    let inputElement: any;

    const dispatch = createEventDispatcher();

    function handleFileChange() {
    const files = inputElement.files;
    dispatch('change', Array.from(files)); // Convert FileList to array
    };
</script>

<div class="custom-file-uploader-wrapper">
    <Button icon={Upload} kind={kind} size={size} disabled={disabled} on:click={() => !disabled && inputElement.click()}>
        {labelText}
    </Button>
    <input
        type="file"
        id={id}
        name={name}
        accept={accept.join(',')}
        multiple={multiple}
        disabled={disabled}
        style="display: none;"
        bind:this={inputElement}
        on:change={handleFileChange}
    />  

    <style>
        .custom-file-uploader-wrapper .bx--btn {
            width: 100% !important;  /* Or whatever width you want */
        }
    </style>  

</div>

