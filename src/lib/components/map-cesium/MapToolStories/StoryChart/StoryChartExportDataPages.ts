import { writable, type Writable } from 'svelte/store';

type exportDataPage = {
    index: number;
    content: string | undefined;
    image: string | undefined;
};

type ExportDataStore = {
    pages: Array<exportDataPage>;
    ready: boolean;
};

export const exportDataPages: Writable<ExportDataStore> = writable<ExportDataStore>({
    pages: [],
    ready: false
});

// TODO: Debug
exportDataPages.subscribe((value) => {
    console.log("exportDataPages updated:", value);
    
    const allPagesFilled = value.pages.length > 0 && value.pages.every(page => 
        page.content !== undefined && page.image !== undefined
    );

    console.log("All pages filled status:", allPagesFilled);
    
    if (allPagesFilled && !value.ready) {
        exportDataPages.update(store => ({ ...store, ready: true }));
        console.log("All export data pages are ready.");
    }
    else {
        console.log("Export data pages are not yet ready.", value);
    }
});