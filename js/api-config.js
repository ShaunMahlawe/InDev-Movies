window.TMDB_BEARER_TOKEN = window.TMDB_BEARER_TOKEN || "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI0MDIxYWNkZmZjYmZkY2RlOTA1OTlmNDk1NzMyNjdjYyIsIm5iZiI6MTc3NDcxMjYwMS44ODcsInN1YiI6IjY5YzdmNzE5YTQwOGMwOTM4ZjlkNGMwYyIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.9h5SbVoGEMWYIWKTHtztfiu5urwuMgcIfRz1m0YmwwM";

// Derive TMDB v3 key from bearer token payload when not explicitly configured.
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
		// Keep explicit configuration paths working if token parsing fails.
	}
}
