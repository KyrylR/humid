import {
	WALLET_RPC_ERROR_CODES,
	WALLET_RPC_ERROR_REASONS,
	WalletRpcError,
} from "@/core/wallet-rpc/errors";

import {
	DAPP_AUTHORIZATION_ERROR_CODES,
	DappAuthorizationError,
} from "../dapp-authorization/errors";

const publicMessages: Record<number, string> = {
	[WALLET_RPC_ERROR_CODES.APPLICATION_ERROR]: "The wallet could not complete this request.",
	[WALLET_RPC_ERROR_CODES.INTERNAL_ERROR]: "The wallet could not complete this request.",
	[WALLET_RPC_ERROR_CODES.INVALID_PARAMS]: "Invalid wallet request.",
	[WALLET_RPC_ERROR_CODES.METHOD_NOT_FOUND]: "This wallet method is not supported.",
	[WALLET_RPC_ERROR_CODES.RESOURCE_UNAVAILABLE]: "The requested wallet resource is unavailable.",
	[WALLET_RPC_ERROR_CODES.UNAUTHORIZED]: "The dapp does not have permission for this request.",
	[DAPP_AUTHORIZATION_ERROR_CODES.USER_REJECTED]: "User rejected the request.",
	[DAPP_AUTHORIZATION_ERROR_CODES.WALLET_LOCKED]: "The wallet is locked.",
	[DAPP_AUTHORIZATION_ERROR_CODES.UNRECOGNIZED_CHAIN]: "The requested chain is not recognized.",
	[DAPP_AUTHORIZATION_ERROR_CODES.UNSUPPORTED_SCOPES]:
		"The requested wallet scopes are not supported.",
};

/** Dapps receive fixed classifications; extension pages retain private diagnostics. */
export function serializeError(error: unknown, audience: "injected" | "popup"): unknown {
	if (audience === "popup") {
		if (!(error instanceof Error)) return error;
		const structured = error as Error & { code?: unknown; data?: unknown };
		return {
			message: error.message,
			...(typeof structured.code === "number" ? { code: structured.code } : {}),
			...(structured.data === undefined ? {} : { data: structured.data }),
		};
	}
	if (error instanceof DappAuthorizationError)
		return { message: publicMessages[error.code], code: error.code };
	if (error instanceof WalletRpcError) {
		return {
			message:
				error.data.reason === WALLET_RPC_ERROR_REASONS.USER_REJECTED
					? "User rejected the request."
					: publicMessages[error.code],
			code: error.code,
			data: { reason: error.data.reason },
		};
	}
	return {
		message: publicMessages[WALLET_RPC_ERROR_CODES.INTERNAL_ERROR],
		code: WALLET_RPC_ERROR_CODES.INTERNAL_ERROR,
	};
}
