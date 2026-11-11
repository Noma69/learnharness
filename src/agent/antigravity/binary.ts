import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

type BinaryLookup = {
	env: Record<string, string | undefined>;
	platform: NodeJS.Platform;
	homeDir: string;
	cwd?: string;
	isExecutable: (path: string) => boolean;
};

type SearchSpec = {
	paths: path.PlatformPath;
	names: string[];
	knownDirs: string[];
};

function getWindowsSearchSpec(env: BinaryLookup["env"], homeDir: string): SearchSpec {
	const paths = path.win32;
	const appData = env.APPDATA ?? paths.join(homeDir, "AppData", "Roaming");

	return {
		paths,
		names: ["agy.exe", "antigravity.exe"],
		knownDirs: [
			paths.join(homeDir, ".local", "bin"),
			paths.join(homeDir, ".gemini", "antigravity-cli", "bin"),
			env.npm_config_prefix ?? paths.join(appData, "npm"),
		],
	};
}

function getPosixSearchSpec(env: BinaryLookup["env"], homeDir: string): SearchSpec {
	const paths = path.posix;
	const npmBin = env.npm_config_prefix
		? paths.join(env.npm_config_prefix, "bin")
		: paths.join(homeDir, ".npm-global", "bin");

	return {
		paths,
		names: ["agy", "antigravity"],
		knownDirs: [
			paths.join(homeDir, ".local", "bin"),
			paths.join(homeDir, ".gemini", "antigravity-cli", "bin"),
			npmBin,
			"/usr/local/bin",
			"/usr/bin",
		],
	};
}

export function resolveAntigravityBinary({ env, platform, homeDir, cwd = process.cwd(), isExecutable }: BinaryLookup): string | null {
	if (env.AGY_PATH && isExecutable(env.AGY_PATH)) {
		return env.AGY_PATH;
	}

	const { paths, names, knownDirs } = platform === "win32"
		? getWindowsSearchSpec(env, homeDir)
		: getPosixSearchSpec(env, homeDir);

	const pathDirs = (env.PATH ?? "").split(paths.delimiter).filter(Boolean);

	for (const name of names) {
		for (const dir of [...knownDirs, ...pathDirs]) {
			const candidate = paths.resolve(cwd, dir, name);
			if (isExecutable(candidate)) return candidate;
		}
	}

	return null;
}

export function getAntigravityBinary(): string | null {
	return resolveAntigravityBinary({
		env: process.env,
		platform: process.platform,
		homeDir: os.homedir(),
		isExecutable: (candidate) => {
			try {
				fs.accessSync(candidate, fs.constants.X_OK);
				return true;
			} catch {
				return false;
			}
		},
	});
}
