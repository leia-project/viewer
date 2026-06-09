import { LibraryConnectorData } from "./library-connector-data";

export interface LibraryConnector {
    getData(): Promise<LibraryConnectorData>;
}