export class MarvinClient {
	private baseUrl: string;

	constructor(baseUrl: string) {
		this.baseUrl = baseUrl;
	}

	public async askGeo(
		question: string,
		geom: string,
		userLocation: string,
		debug: boolean = true
	): Promise<any> {
		const body = {
			question: question,
			geom: geom,
			userLocation: userLocation,
			debug: debug
		};

		return this.post<any>('ask-geo', body);
	}

	private async get<T>(url: string): Promise<T> {
		try {
			const response = await fetch(`${this.baseUrl}/${url}`);

			if (!response.ok) {
				throw new Error(`GET failed with status ${response.status}: ${response.statusText}`);
			}

			const result = await response.json();

			return result as T;
		} catch (error) {
			throw new Error(`GET request to ${url} failed: ${(error as Error).message}`);
		}
	}

	private async post<T>(url: string, body: any): Promise<T> {
		try {
			const response = await fetch(`${this.baseUrl}/${url}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(body)
			});

			if (!response.ok) {
				throw new Error(`POST failed with status ${response.status}: ${response.statusText}`);
			}

			const result = await response.json();

			return result as T;
		} catch (error) {
			throw new Error(`POST request to ${url} failed: ${(error as Error).message}`);
		}
	}
}
