export const dynamic = "force-dynamic";

export async function GET() {
	const babelUrl = process.env.BABEL_INTERNAL_API_URL || "http://127.0.0.1:8000/api";
	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 4000);
		const res = await fetch(`${babelUrl}/catalog`, {
			signal: controller.signal,
			headers: { "Accept": "application/json" },
			cache: "no-store",
		});
		clearTimeout(timeout);

		if (!res.ok) {
			return Response.json(
				{ error: `Babel ICS a répondu avec le statut HTTP ${res.status}` },
				{ status: res.status }
			);
		}

		const data = await res.json();
		return Response.json({ success: true, catalog: data });
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		return Response.json(
			{
				success: false,
				error: "Impossible de joindre le serveur Babel ICS (port 8000). Vérifiez que Babel est bien démarré.",
				details: message,
				catalog: [],
			},
			{ status: 502 }
		);
	}
}
