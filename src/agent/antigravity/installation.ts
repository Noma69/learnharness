import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { externalCliEnv } from "../../core/auth-env.ts";
import type { AntigravityStatus } from "../../core/contracts/antigravity.ts";
import { getAntigravityBinary } from "./binary.ts";

export const ANTIGRAVITY_SUPPORTED_MODELS = [
	"gemini-3.8-flash-high",
	"gemini-3.8-flash-medium",
	"gemini-3.8-flash-low",
	"claude-sonnet-4-6",
	"claude-opus-4-6-thinking",
	"gpt-oss-120b-medium",
];

export type ReadAntigravityVersion = (binary: string) => Promise<string>;

export const readAntigravityVersion: ReadAntigravityVersion = (binary) => new Promise((resolve, reject) => {
	execFile(binary, ["--version"], {
		cwd: tmpdir(), env: externalCliEnv(), windowsHide: true,
		timeout: 5_000, killSignal: "SIGKILL", maxBuffer: 4_096,
	}, (error, stdout) => error ? reject(error) : resolve(stdout));
});

export async function inspectAntigravityInstallation(
	findBinary: () => string | null = getAntigravityBinary,
	readVersion: ReadAntigravityVersion = readAntigravityVersion,
): Promise<AntigravityStatus> {
	const base: AntigravityStatus = {
		state: "not-found",
		version: null,
		path: null,
		models: ANTIGRAVITY_SUPPORTED_MODELS,
	};

	const binary = findBinary();
	if (!binary) return base;

	try {
		const output = await readVersion(binary);
		const trimmed = output.trim();
		return {
			...base,
			state: "ready",
			version: trimmed || "1.0.0",
			path: binary,
		};
	} catch {
		return {
			...base,
			state: "version-unchecked",
			path: binary,
		};
	}
}
