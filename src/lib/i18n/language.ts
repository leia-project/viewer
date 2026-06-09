export class Language {
    public title: string;
    public shortName: string;
    public translations: any;

    constructor(title: string, shortName: string, translations: any) {
        this.title = title;
        this.shortName = shortName;
        this.translations = translations;
    }

    public addTranslation(translation: {}): void {
        this.translations = {...this.translations, ...translation};
    }
}