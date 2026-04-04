(function applyRuntimeMovieConfig() {
	const runtimeConfig = window.INDEV_CONFIG || {};
	const tmdbConfig = runtimeConfig.tmdb || {};

	if (!window.TMDB_BEARER_TOKEN && typeof tmdbConfig.bearerToken === "string") {
		window.TMDB_BEARER_TOKEN = tmdbConfig.bearerToken.trim();
	}

	if (!window.TMDB_API_KEY && typeof tmdbConfig.apiKey === "string") {
		window.TMDB_API_KEY = tmdbConfig.apiKey.trim();
	}

	if (!window.TMDB_API_KEY && window.TMDB_BEARER_TOKEN) {
		try {
			const tokenParts = String(window.TMDB_BEARER_TOKEN).split(".");
			if (tokenParts.length === 3) {
				const payload = JSON.parse(atob(tokenParts[1].replace(/-/g, "+").replace(/_/g, "/")));
				if (payload && typeof payload.aud === "string") {
					window.TMDB_API_KEY = payload.aud;
				}
			}
		} catch (_error) {
			// Ignore token parsing failures and rely on explicit apiKey config.
		}
	}

	window.INDEV_RUNTIME_STATUS = Object.assign({}, window.INDEV_RUNTIME_STATUS, {
		hasTmdbConfig: Boolean(String(window.TMDB_BEARER_TOKEN || window.TMDB_API_KEY || "").trim()),
		hasFirebaseConfig: Boolean(runtimeConfig.firebase)
	});
})();
