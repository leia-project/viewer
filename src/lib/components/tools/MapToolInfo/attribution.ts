export class Attribution {
    public title: string;
    public description: string;
    public author: string;
    public source: string;
    public license: string;

    constructor(title: string, description: string, author: string, source: string, license: string) {
        this.title = title;
        this.description = description;
        this.author = author;
        this.source = source;
        this.license = license;
    }
}
