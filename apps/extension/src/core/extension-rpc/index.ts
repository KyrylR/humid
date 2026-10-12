import browser from "webextension-polyfill";

import { INTERNAL_REQUEST, type InternalResponse } from "./protocol";

const REQUEST_TIMEOUT_MS = 60_000;

export async function requestBackground<TResponse>(
	method: string,
	data?: unknown,
): Promise<TResponse> {
	let timeoutId: ReturnType<typeof setTimeout> | undefined;
	try {
		const response = await Promise.race([
			browser.runtime.sendMessage({ type: INTERNAL_REQUEST, method, data }) as Promise<
				InternalResponse | undefined
			>,
			new Promise<never>((_, reject) => {
				timeoutId = setTimeout(
					() => reject(new Error("The extension did not respond. Try again.")),
					REQUEST_TIMEOUT_MS,
				);
			}),
		]);
		if (!response) throw new Error("The extension did not respond. Try again.");
		if (!response.ok) throw new Error(response.error.message);
		return response.data as TResponse;
	} finally {
		clearTimeout(timeoutId);
	}
}
