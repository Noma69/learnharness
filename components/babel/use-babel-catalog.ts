"use client";

import { useCallback, useEffect, useState } from "react";
import type { BabelSubject } from "./types";

export function useBabelCatalog(enabled = true) {
	const [catalog, setCatalog] = useState<BabelSubject[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const fetchCatalog = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const res = await fetch("/api/babel/catalog", { cache: "no-store" });
			const json = await res.json();
			if (json.success && Array.isArray(json.catalog)) {
				setCatalog(json.catalog);
			} else {
				setError(json.error || "Impossible de récupérer le catalogue Babel ICS.");
			}
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : "Erreur de connexion avec Babel ICS.");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		if (enabled) {
			void fetchCatalog();
		}
	}, [enabled, fetchCatalog]);

	return { catalog, loading, error, refetch: fetchCatalog };
}
