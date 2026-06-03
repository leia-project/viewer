export type SubLabel = {
    text: string;
    hoverText: string;
};

export type LegendItem = {
    labels: string;
    text: string;
    subLabels?: {
        [key: string]: SubLabel;
    };
};

export type LegendOptions = {
    generalLegendText: string;
    legendOptions: LegendItem[];
};
