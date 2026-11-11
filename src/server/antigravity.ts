import { inspectAntigravityInstallation } from "../agent/antigravity/installation.ts";
import { initAuthEnv } from "./keys.ts";
import { subscriptionRequestOrigin } from "./web-subscription-http.ts";
import { antigravityEnabled } from "./antigravity-config.ts";

export async function antigravityInstallationStatus() {
	initAuthEnv();
	return inspectAntigravityInstallation();
}

export async function antigravityInstallationResponse(
	request: Request,
	inspect = antigravityInstallationStatus,
	enabled = antigravityEnabled,
): Promise<Response> {
	const origin = subscriptionRequestOrigin(request);
	const supplied = request.headers.get("origin");
	const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
	if (request.method !== "GET" || !origin
		|| request.headers.get("x-learnharness-antigravity") !== "1"
		|| request.headers.get("sec-fetch-site") === "cross-site"
		|| (supplied !== null && supplied !== origin)) {
		return Response.json({ error: "Antigravity checks require a same-origin LearnHarness request." }, { status: 403, headers });
	}
	if (!enabled()) return Response.json({ error: "Antigravity is disabled." }, { status: 403, headers });
	return Response.json(await inspect(), { headers });
}
