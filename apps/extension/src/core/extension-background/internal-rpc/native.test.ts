import { expect, test } from "bun:test";

import { INTERNAL_REQUEST } from "@/core/extension-rpc/protocol";

import type { RequestHandlerMap } from "../transport";
import { createNativeInternalHandler } from "./native";

const popup = {
	id: "wallet",
	url: "chrome-extension://wallet/src/popup.html#/app/settings",
	frameId: 0,
};
const notification = {
	...popup,
	url: "chrome-extension://wallet/src/notification.html?confirmation=example",
};

const handlerWith = (getHandlers: () => Promise<RequestHandlerMap>) =>
	createNativeInternalHandler({
		extensionId: "wallet",
		getURL: (path) => `chrome-extension://wallet/${path}`,
		getHandlers,
	});

test("only top-level wallet documents can invoke internal handlers", async () => {
	let calls = 0;
	const handle = handlerWith(async () => ({ read: () => ++calls }));
	const message = { type: INTERNAL_REQUEST, method: "read" };
	for (const sender of [
		{ ...popup, id: "other" },
		{ ...popup, frameId: 1 },
		{ ...popup, url: "https://dapp.test/src/popup.html" },
		{ ...popup, url: "chrome-extension://other/src/popup.html" },
		{ ...popup, url: "chrome-extension://wallet/src/other.html" },
		{},
	])
		expect(handle(message, sender)).toBeUndefined();
	expect(calls).toBe(0);
	expect(await handle(message, popup)).toEqual({ ok: true, data: 1 });
	expect(await handle(message, notification)).toEqual({ ok: true, data: 2 });
	expect(await handle({ ...message, method: "toString" }, popup)).toEqual({
		ok: false,
		error: { message: "Unknown wallet request." },
	});
});

test("concurrent handler calls retain their results when completion order changes", async () => {
	const finish: Record<string, (value: string) => void> = {};
	const handle = handlerWith(async () => ({
		read: (message) =>
			new Promise((resolve) => {
				finish[String(message.data)] = resolve;
			}),
	}));
	const first = handle({ type: INTERNAL_REQUEST, method: "read", data: "settings" }, popup);
	const second = handle({ type: INTERNAL_REQUEST, method: "read", data: "consent" }, notification);
	await Promise.resolve();
	finish.consent("consent result");
	expect(await second).toEqual({ ok: true, data: "consent result" });
	finish.settings("settings result");
	expect(await first).toEqual({ ok: true, data: "settings result" });
});

test("empty or non-Error failures retain an actionable error message", async () => {
	for (const error of [new Error(""), null]) {
		const handle = handlerWith(async () => {
			throw error;
		});
		expect(await handle({ type: INTERNAL_REQUEST, method: "read" }, popup)).toEqual({
			ok: false,
			error: { message: "The wallet could not complete this request." },
		});
	}
});
