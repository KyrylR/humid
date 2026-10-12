import { expect, test } from "bun:test";

import {
	WalletRpcInvalidParamsError,
	WalletRpcResourceUnavailableError,
	WalletRpcUserRejectedError,
	WALLET_RPC_ERROR_REASONS,
} from "@/core/wallet-rpc/errors";

import { dappAuthorizationErrors } from "../dapp-authorization/errors";
import { serializeError } from "./serializeError";

const privateMessage = "This account holds 987654 of the 1000000 needed. abcd:7";
const privateData = {
	balance: 987654,
	txid: privateMessage,
	stage: privateMessage,
	nested: { secret: true },
};

test.each([
	[
		"invalid parameters",
		new WalletRpcInvalidParamsError(privateMessage, privateData),
		{ message: "Invalid wallet request.", code: -32602, data: { reason: "invalid_params" } },
	],
	[
		"UTXO read failure",
		new WalletRpcResourceUnavailableError(
			privateMessage,
			privateData,
			WALLET_RPC_ERROR_REASONS.WALLET_UTXO_READ_FAILED,
		),
		{
			message: "The requested wallet resource is unavailable.",
			code: -32002,
			data: { reason: "wallet_utxo_read_failed" },
		},
	],
	[
		"unauthorized dapp",
		dappAuthorizationErrors.unauthorized(privateMessage, privateData),
		{ message: "The dapp does not have permission for this request.", code: 4100 },
	],
	[
		"wallet refusal",
		new WalletRpcUserRejectedError(privateMessage),
		{ message: "User rejected the request.", code: -32000, data: { reason: "user_rejected" } },
	],
	[
		"dapp refusal",
		dappAuthorizationErrors.userRejected(privateMessage, privateData),
		{ message: "User rejected the request.", code: 4001 },
	],
] as const)("exposes only public classifications for %s", (_name, error, expected) => {
	expect(serializeError(error, "injected")).toEqual(expected);
	expect(serializeError(error, "popup")).toMatchObject({ message: privateMessage });
});

test("unknown errors and thrown values never cross the injected boundary", () => {
	const secret = "private backend body or wallet opening";
	for (const error of [
		Object.assign(new Error(secret), { code: 4001, data: { secret }, cause: { secret } }),
		{ message: secret, code: 4001, data: { secret } },
		secret,
		null,
	])
		expect(serializeError(error, "injected")).toEqual({
			message: "The wallet could not complete this request.",
			code: -32603,
		});
});

test("trusted popup errors preserve structured and non-Error diagnostics", () => {
	const details = { internal: "trusted extension diagnostic" };
	expect(
		serializeError(
			Object.assign(new Error("Internal diagnostic"), { code: 12, data: details }),
			"popup",
		),
	).toEqual({ message: "Internal diagnostic", code: 12, data: details });
	expect(serializeError(details, "popup")).toBe(details);
});
