export const ANTIGRAVITY_PROVIDER = "antigravity";

export interface AntigravityStatus {
	state: "not-found" | "ready" | "version-unchecked";
	version: string | null;
	path: string | null;
	models: string[];
}
