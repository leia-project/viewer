import { writable, type Writable } from 'svelte/store';

type exportDataPage = {
    index: number;
    image: string | undefined;
};

type ExportDataStore = {
    pages: Array<exportDataPage>;
};

export const exportDataPages: Writable<ExportDataStore> = writable<ExportDataStore>({
    pages: [],
});
