import { addMessages, init, locale } from "svelte-i18n";
import { appStorage } from "./app-storage";
import { Language } from "./language";
import { writable } from "svelte/store";

import en from "./json/en.json";
import nl from "./json/nl.json";

let selectedLanguage = writable<string>("en");
const languages: Array<Language> = [
    new Language("English", "en", en),
    new Language("Nederlands", "nl", nl),
];

function setupLocalization(defaultLocale: string = "en", translations: Array<{ locale: string, translations: {} }> | undefined = undefined): void {
    if (translations) {
        for (let i = 0; i < translations.length; i++) {
            addTranslation(translations[i].locale, translations[i].translations);
        }
    }

    for (let i = 0; i < languages.length; i++) {
        const language = languages[i];
        addMessages(language.shortName, language.translations);
    }

    const initLanguage = appStorage.getValue("locale", defaultLocale);
    appStorage.register<string>(locale, "locale", initLanguage);

    init({
        fallbackLocale: defaultLocale
    });

    selectedLanguage.set(initLanguage);
    selectedLanguage.subscribe((l) => {
        locale.set(l);
    });
}

function addTranslation(languageShortName: string, translations: {}): void {
    const lang = languages.find((l) => l.shortName === languageShortName);
    lang?.addTranslation(translations);
}

export { setupLocalization, selectedLanguage, languages };