import { expect, test } from "bun:test";

import type { AccountModelState } from "@/core/accounts/application/account-registry/model/account-model";
import type { DappSessionScope } from "@/core/accounts/application/account-registry/model/dapp-session";

import { sessionProperties } from "./sessionProperties";

test("selected account metadata contains only a connected account on its authorized chain", () => {
	const model = {
		selectedAccountGroupId: "B",
		chainAccounts: {
			a: { accountGroupId: "A", chainId: "test", accountIdentifier: "first" },
			c: { accountGroupId: "B", chainId: "other", accountIdentifier: "private-other-chain" },
			b: { accountGroupId: "B", chainId: "test", accountIdentifier: "second" },
		},
	} as unknown as AccountModelState;
	const scope = {
		accountGroupIds: ["A", "B"],
		chains: ["test"],
		methods: { getAddresses: true },
		events: [],
	} as unknown as DappSessionScope;
	expect(sessionProperties(model, scope)).toEqual({
		test: { humid_methodPolicy: { getAddresses: true }, humid_selectedAccount: "second" },
	});
	expect(
		sessionProperties(model, { ...scope, accountGroupIds: scope.accountGroupIds.slice(0, 1) }).test
			.humid_selectedAccount,
	).toBeNull();
	expect(
		sessionProperties({ ...model, selectedAccountGroupId: undefined }, scope).test
			.humid_selectedAccount,
	).toBeNull();
});
