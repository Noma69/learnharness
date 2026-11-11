import { getAntigravityBinary } from "../agent/antigravity/binary.ts";
import { settingsStore } from "../store/settings.ts";

export function antigravityEnabled(): boolean {
	const settings = settingsStore.readSettings();
	// If explicitly set, respect user choice; otherwise enabled if binary is found
	if (settings?.antigravity?.enabled !== undefined) {
		return settings.antigravity.enabled === true;
	}
	return getAntigravityBinary() !== null;
}

export function antigravityAvailable(): boolean {
	return antigravityEnabled() && getAntigravityBinary() !== null;
}
