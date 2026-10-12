import type { AccountModelState } from "@/core/accounts/application/account-registry/model/account-model";
import type { DappSessionScope } from "@/core/accounts/application/account-registry/model/dapp-session";
import { toCaip25ScopedProperties } from "@/core/caip25";

/** Report selection only when the current connection already authorizes that account. */
export function sessionProperties(model: AccountModelState, scope: DappSessionScope) {
	const properties = toCaip25ScopedProperties(scope);
	const selected = model.selectedAccountGroupId;
	for (const chain of scope.chains) {
		const account =
			selected && scope.accountGroupIds.includes(selected)
				? Object.values(model.chainAccounts).find(
						(candidate) => candidate.accountGroupId === selected && candidate.chainId === chain,
					)
				: undefined;
		properties[chain].humid_selectedAccount = account?.accountIdentifier ?? null;
	}
	return properties;
}
