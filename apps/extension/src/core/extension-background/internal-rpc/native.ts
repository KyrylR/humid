import type { Runtime } from "webextension-polyfill";

import { INTERNAL_REQUEST, type InternalResponse } from "@/core/extension-rpc/protocol";

import type { RequestHandlerMap } from "../transport";

export function createNativeInternalHandler(deps: {
	extensionId: string;
	getURL: (path: string) => string;
	getHandlers: () => Promise<RequestHandlerMap>;
}) {
	const allowedPages = new Set([
		deps.getURL("src/popup.html"),
		deps.getURL("src/notification.html"),
	]);
	return (
		message: unknown,
		sender: Runtime.MessageSender,
	): Promise<InternalResponse> | undefined => {
		if (
			!message ||
			typeof message !== "object" ||
			!("type" in message) ||
			message.type !== INTERNAL_REQUEST
		)
			return undefined;
		let page: string;
		try {
			const url = new URL(sender.url ?? "");
			url.search = "";
			url.hash = "";
			page = url.href;
		} catch {
			return undefined;
		}
		if (
			sender.id !== deps.extensionId ||
			(sender.frameId !== undefined && sender.frameId !== 0) ||
			!allowedPages.has(page)
		)
			return undefined;
		return (async () => {
			try {
				if (!("method" in message) || typeof message.method !== "string")
					throw new Error("Invalid wallet request.");
				const handlers = await deps.getHandlers();
				const handler = Object.hasOwn(handlers, message.method)
					? handlers[message.method]
					: undefined;
				if (!handler) throw new Error("Unknown wallet request.");
				const data = await handler(
					{ method: message.method, data: "data" in message ? message.data : undefined },
					{
						context: "popup",
						tabId: sender.tab?.id ?? null,
					},
				);
				return { ok: true, data };
			} catch (error) {
				return {
					ok: false,
					error: {
						message:
							error instanceof Error && error.message
								? error.message
								: "The wallet could not complete this request.",
					},
				};
			}
		})();
	};
}
