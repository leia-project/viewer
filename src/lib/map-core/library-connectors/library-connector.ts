import { LibraryConnectorData } from "./library-connector-data";

export interface LibraryConnector {
    readonly label: string;
    getData(): Promise<LibraryConnectorData>;
}