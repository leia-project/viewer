/* De URL van een tile kan een toegangstoken bevatten dat verloopt (Cesium kan bij tile-verzoeken
   geen headers meesturen, dus een credential moet in de URL zitten). Een kaart die openblijft
   moet een nieuwe URL halen vóór dat gebeurt, anders laden de tiles stilletjes niet meer. */

/* Hoe vaak we kijken of een token oud wordt. */
export const RENEWAL_CHECK_MS = 30_000;

/* Verlengen zodra er minder dan een derde van de levensduur van het token over is. Gemeten
   aan de levensduur die het token echt had, dus het werkt voor elke geldigheidsduur; dat
   derde laat ruimte voor een paar mislukte pogingen (de service even niet bereikbaar,
   wegvallende verbinding) voordat het token echt op is. */
export function needsRenewal(expires: number, issuedAt: number, now: number): boolean {
	const lifetime = Math.max(expires - issuedAt, 1);
	return expires - now < lifetime / 3;
}
