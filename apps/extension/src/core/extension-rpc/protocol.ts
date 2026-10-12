export const INTERNAL_REQUEST = "humid:internal-request";

export type InternalResponse =
	| { ok: true; data: unknown }
	| { ok: false; error: { message: string } };
