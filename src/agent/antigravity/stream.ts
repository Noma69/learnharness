import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { tmpdir } from "node:os";
import { createInterface } from "node:readline";
import {
	createAssistantMessageEventStream,
	type Api,
	type AssistantMessage,
	type Message,
	type Model,
	type SimpleStreamOptions,
	type StreamFunction,
	type ThinkingLevel,
} from "@earendil-works/pi-ai";
import { getCurrentSystemPrompt } from "@earendil-works/pi-ai/utils/transcript";
import { externalCliEnv } from "../../core/auth-env.ts";
import { getAntigravityBinary } from "./binary.ts";
import { AntigravityError } from "./constants.ts";

const EFFORTS: Record<ThinkingLevel, string> = {
	minimal: "low",
	low: "low",
	medium: "medium",
	high: "high",
	xhigh: "xhigh",
	max: "max",
};

function formatTranscript(messages: readonly Message[]): string {
	const parts: string[] = [];
	const system = getCurrentSystemPrompt(messages);
	if (system) {
		parts.push(`[System instructions]\n${system.trim()}`);
	}

	for (const msg of messages) {
		if (msg.role === "system") continue;
		if (msg.role === "user") {
			const text = typeof msg.content === "string"
				? msg.content
				: msg.content.flatMap((c) => (c.type === "text" ? [c.text] : [])).join("\n");
			if (text.trim()) parts.push(`[User]\n${text.trim()}`);
		} else if (msg.role === "assistant") {
			const text = msg.content.flatMap((c) => (c.type === "text" ? [c.text] : [])).join("\n");
			if (text.trim()) parts.push(`[Assistant]\n${text.trim()}`);
		} else if (msg.role === "toolResult") {
			const text = typeof msg.content === "string"
				? msg.content
				: msg.content.flatMap((c) => (c.type === "text" ? [c.text] : [])).join("\n");
			const label = msg.isError ? `[Tool Result (${msg.toolName}) Error]` : `[Tool Result (${msg.toolName})]`;
			if (text.trim()) parts.push(`${label}\n${text.trim()}`);
		}
	}

	return parts.join("\n\n---\n\n");
}

function createOutput(model: Model<Api>): AssistantMessage {
	return {
		role: "assistant",
		content: [{ type: "text", text: "" }],
		api: model.api,
		provider: model.provider,
		model: model.id,
		usage: {
			input: 0,
			output: 0,
			cacheRead: 0,
			cacheWrite: 0,
			totalTokens: 0,
			cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
		},
		stopReason: "pending",
		timestamp: Date.now(),
	};
}

export function createAntigravityStreamFunction(): StreamFunction<Api, SimpleStreamOptions> {
	return (model, context, options) => {
		const stream = createAssistantMessageEventStream();
		const output = createOutput(model);
		const binary = getAntigravityBinary();

		const fail = (message: string, reason: "aborted" | "error") => {
			output.stopReason = reason;
			output.errorMessage = message;
			stream.push({ type: "error", reason, error: output });
			stream.end();
		};

		if (!binary) {
			queueMicrotask(() => {
				fail(AntigravityError.CliNotFound, "error");
			});
			return stream;
		}

		const prompt = formatTranscript(context.messages);
		const effort = options?.reasoning ? EFFORTS[options.reasoning] : undefined;

		const args = [
			"--model", model.id,
			"--disable-slash-commands",
			"--output-format", "stream-json",
		];

		if (effort) {
			args.push("--effort", effort);
		}

		args.push("-p", prompt);

		let child: ChildProcessWithoutNullStreams;
		try {
			child = spawn(binary, args, {
				cwd: tmpdir(),
				env: externalCliEnv(),
				windowsHide: true,
			});
		} catch (err) {
			queueMicrotask(() => {
				fail(err instanceof Error ? err.message : String(err), "error");
			});
			return stream;
		}

		let started = false;
		const start = () => {
			if (started) return;
			started = true;
			stream.push({ type: "start", partial: output });
		};

		if (options?.signal) {
			const onAbort = () => {
				child.kill("SIGTERM");
				setTimeout(() => {
					try { child.kill("SIGKILL"); } catch { /* ignore */ }
				}, 2000);
			};
			if (options.signal.aborted) {
				onAbort();
			} else {
				options.signal.addEventListener("abort", onAbort, { once: true });
			}
		}

		const rl = createInterface({ input: child.stdout, crlfDelay: Infinity });
		let isDone = false;

		rl.on("line", (line) => {
			if (!line.trim()) return;
			try {
				const event = JSON.parse(line.trim());
				if (event.event === "step_update" && event.step_update?.text_delta) {
					start();
					const delta = event.step_update.text_delta;
					(output.content[0] as { type: "text"; text: string }).text += delta;
					stream.push({
						type: "text_delta",
						contentIndex: 0,
						delta,
						partial: output,
					});
				} else if (event.event === "result" && event.result) {
					if (event.result.usage) {
						output.usage.input = event.result.usage.input_tokens ?? 0;
						output.usage.output = event.result.usage.output_tokens ?? 0;
						output.usage.totalTokens = event.result.usage.total_tokens ?? 0;
					}
					output.stopReason = "stop";
				}
			} catch {
				// Ignore non-JSON log lines
			}
		});

		let stderrOutput = "";
		child.stderr.on("data", (chunk) => {
			stderrOutput += chunk.toString("utf8");
		});

		child.on("close", (code) => {
			if (isDone) return;
			isDone = true;

			if (options?.signal?.aborted) {
				fail("Request was aborted", "aborted");
				return;
			}

			if (code !== 0 && !(output.content[0] as { type: "text"; text: string }).text.trim()) {
				const errMsg = stderrOutput.trim() || `agy exited with code ${code}`;
				fail(errMsg, "error");
				return;
			}

			start();
			output.stopReason = "stop";
			stream.push({ type: "done", reason: "stop", message: output });
			stream.end();
		});

		child.on("error", (err) => {
			if (isDone) return;
			isDone = true;
			fail(err.message, "error");
		});

		return stream;
	};
}

export const streamAntigravity = createAntigravityStreamFunction();
