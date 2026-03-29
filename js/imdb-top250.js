(function () {
    const API_URL = "https://imdb236.p.rapidapi.com/api/imdb/top250-movies";
    const FALLBACK_POSTER = "../omassets/Logo.png";
    const TMDB_TRENDING_URL = "https://api.themoviedb.org/3/trending/movie/week";
    const TMDB_TV_TRENDING_URL = "https://api.themoviedb.org/3/trending/tv/week";
    const TMDB_TV_TOP_RATED_URL = "https://api.themoviedb.org/3/tv/top_rated";
    const TMDB_MOVIE_SEARCH_URL = "https://api.themoviedb.org/3/search/movie";
    const TMDB_TV_SEARCH_URL = "https://api.themoviedb.org/3/search/tv";
    const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";
    const TMDB_SITE_BASE = "https://www.themoviedb.org/movie";
    const TMDB_BEARER_TOKEN = "";
    const TREND_MOVIE_LIMIT = 23;
    const HOME_MOVIE_LIMIT = 21;
    const TMDB_FALLBACK_PAGE_COUNT = 2;
    const TRAILER_FETCH_CONCURRENCY = 5;
    const TMDB_GENRE_MAP = {
        12: "Adventure",
        14: "Fantasy",
        16: "Animation",
        18: "Drama",
        27: "Horror",
        28: "Action",
        35: "Comedy",
        36: "History",
        37: "Western",
        53: "Thriller",
        80: "Crime",
        99: "Documentary",
        878: "Sci-Fi",
        9648: "Mystery",
        10402: "Music",
        10749: "Romance",
        10751: "Family",
        10752: "War",
        10759: "Action",
        10762: "Kids",
        10765: "Sci-Fi",
        10766: "Drama",
        10768: "War"
    };
    const API_HEADERS = {
        "Content-Type": "application/json",
        "x-rapidapi-host": "imdb236.p.rapidapi.com",
        "x-rapidapi-key": "ecdd572f6fmsh055b23482742d2cp1af123jsn9b1d66941f6f"
    };

    function normalizeAbsoluteUrl(value) {
        if (!value || typeof value !== "string") {
            return "";
        }

        try {
            const parsed = new URL(value.trim());
            const isHttp = parsed.protocol === "http:" || parsed.protocol === "https:";
            return isHttp ? parsed.toString() : "";
        } catch (_error) {
            return "";
        }
    }

    function parseYear(value) {
        if (!value || typeof value !== "string") {
            return "";
        }

        const parsed = Number(value.slice(0, 4));
        return Number.isFinite(parsed) ? parsed : "";
    }

    function isQuotaError(status, text) {
        if (status === 429) {
            return true;
        }

        const normalized = String(text || "").toLowerCase();
        return normalized.includes("exceeded the monthly quota")
            || normalized.includes("quota")
            || normalized.includes("too many requests");
    }

    function getTitle(movie) {
        return movie.primaryTitle || movie.title || movie.name || "Untitled";
    }

    function getPoster(movie) {
        const poster = normalizeAbsoluteUrl(movie.primaryImage) || normalizeAbsoluteUrl(movie.image);
        return poster || FALLBACK_POSTER;
    }

    function getWatchUrl(movie) {
        return normalizeAbsoluteUrl(movie.url)
            || normalizeAbsoluteUrl(movie.imdbUrl)
            || normalizeAbsoluteUrl(movie.trailer)
            || "#";
    }

    function normalizeGenre(value) {
        return String(value || "").trim().toLowerCase();
    }

    function movieHasGenre(movie, genreLabel) {
        const target = normalizeGenre(genreLabel);
        if (!target) {
            return true;
        }

        const genres = Array.isArray(movie.genres) ? movie.genres : [];
        return genres.some((genre) => normalizeGenre(genre) === target);
    }

    function getTrendMoviesByGenre(movies, genreLabel) {
        const preferred = movies.filter((movie) => movieHasGenre(movie, genreLabel));
        const selected = preferred.length >= 6 ? preferred : movies;
        return selected.slice(0, TREND_MOVIE_LIMIT);
    }

    function getTrendMoviesByGenres(movies, genreLabels) {
        const normalizedGenres = Array.isArray(genreLabels)
            ? genreLabels.map((genre) => normalizeGenre(genre)).filter(Boolean)
            : [];

        if (normalizedGenres.length === 0) {
            return movies.slice(0, TREND_MOVIE_LIMIT);
        }

        const preferred = movies.filter((movie) => {
            const genres = Array.isArray(movie.genres) ? movie.genres : [];
            return genres.some((genre) => normalizedGenres.includes(normalizeGenre(genre)));
        });

        const selected = preferred.length >= 6 ? preferred : movies;
        return selected.slice(0, TREND_MOVIE_LIMIT);
    }

    function getMoviesMatchingGenres(movies, genreLabels) {
        const normalizedGenres = Array.isArray(genreLabels)
            ? genreLabels.map((genre) => normalizeGenre(genre)).filter(Boolean)
            : [];

        if (normalizedGenres.length === 0) {
            return movies;
        }

        const preferred = movies.filter((movie) => {
            const genres = Array.isArray(movie.genres) ? movie.genres : [];
            return genres.some((genre) => normalizedGenres.includes(normalizeGenre(genre)));
        });

        return preferred.length > 0 ? preferred : movies;
    }

    function getHomeMoviesByGenres(movies, genreLabels) {
        return getMoviesMatchingGenres(movies, genreLabels).slice(0, HOME_MOVIE_LIMIT);
    }

    function getMovieNumericRating(movie) {
        const rating = Number(movie.averageRating || movie.rating);
        return Number.isFinite(rating) ? rating : 0;
    }

    function sortHomeMovies(movies, sortMode) {
        const sortableMovies = [...movies];

        if (sortMode === "year") {
            sortableMovies.sort((leftMovie, rightMovie) => {
                const leftYear = Number(leftMovie.startYear || leftMovie.year || 0);
                const rightYear = Number(rightMovie.startYear || rightMovie.year || 0);
                return rightYear - leftYear;
            });
            return sortableMovies;
        }

        if (sortMode === "az") {
            sortableMovies.sort((leftMovie, rightMovie) => {
                return getTitle(leftMovie).localeCompare(getTitle(rightMovie));
            });
            return sortableMovies;
        }

        return sortableMovies;
    }

    async function fetchTmdbTrendingPage(page, headers) {
        const url = new URL(TMDB_TRENDING_URL);
        url.searchParams.set("page", String(page));

        const response = await fetch(url.toString(), {
            method: "GET",
            headers
        });

        if (!response.ok) {
            throw new Error(`TMDB fallback request failed (${response.status})`);
        }

        const payload = await response.json();
        return Array.isArray(payload.results) ? payload.results : [];
    }

    function pickYouTubeTrailer(videos) {
        const selected = videos.find((video) => {
            const isYouTube = String(video.site || "").toLowerCase() === "youtube";
            const type = String(video.type || "").toLowerCase();
            const isTrailerLike = type === "trailer" || type === "teaser";
            return isYouTube && isTrailerLike && video.key;
        }) || videos.find((video) => String(video.site || "").toLowerCase() === "youtube" && video.key);

        return selected?.key ? `https://www.youtube.com/watch?v=${selected.key}` : "";
    }

    async function fetchTmdbTrailerByMediaId(mediaType, tmdbId, headers) {
        if (!tmdbId || !headers) {
            return "";
        }

        const typePath = mediaType === "tv" ? "tv" : "movie";
        const response = await fetch(`https://api.themoviedb.org/3/${typePath}/${tmdbId}/videos`, {
            method: "GET",
            headers
        });

        if (!response.ok) {
            return "";
        }

        const payload = await response.json();
        const videos = Array.isArray(payload.results) ? payload.results : [];
        return pickYouTubeTrailer(videos);
    }

    async function searchTmdbMediaIdByTitle(mediaType, title, year, headers) {
        const query = String(title || "").trim();
        if (!query || !headers) {
            return null;
        }

        const url = new URL(mediaType === "tv" ? TMDB_TV_SEARCH_URL : TMDB_MOVIE_SEARCH_URL);
        url.searchParams.set("query", query);
        if (year) {
            url.searchParams.set(mediaType === "tv" ? "first_air_date_year" : "year", String(year));
        }

        const response = await fetch(url.toString(), {
            method: "GET",
            headers
        });

        if (!response.ok) {
            return null;
        }

        const payload = await response.json();
        const items = Array.isArray(payload.results) ? payload.results : [];
        return items[0]?.id || null;
    }

    async function findTrailerForEntry(entry, mediaType, headers) {
        if (!entry || normalizeAbsoluteUrl(entry.trailer)) {
            return entry?.trailer || "";
        }

        const tmdbId = entry.tmdbId || entry.id || null;
        if (tmdbId) {
            const byIdTrailer = await fetchTmdbTrailerByMediaId(mediaType, tmdbId, headers);
            if (byIdTrailer) {
                return byIdTrailer;
            }
        }

        const guessedId = await searchTmdbMediaIdByTitle(
            mediaType,
            getTitle(entry),
            entry.startYear || entry.year,
            headers
        );

        if (!guessedId) {
            return "";
        }

        return fetchTmdbTrailerByMediaId(mediaType, guessedId, headers);
    }

    async function enrichTrailersForEntries(entries, mediaType) {
        const list = Array.isArray(entries) ? entries : [];
        if (list.length === 0) {
            return list;
        }

        const headers = getTmdbAuthHeaders();
        if (!headers) {
            return list;
        }

        const tasks = list.map((entry, index) => async () => {
            try {
                const trailer = await findTrailerForEntry(entry, mediaType, headers);
                if (trailer) {
                    list[index] = { ...entry, trailer };
                }
            } catch (_error) {
                // Keep existing entry state when trailer lookup fails.
            }
        });

        for (let start = 0; start < tasks.length; start += TRAILER_FETCH_CONCURRENCY) {
            const chunk = tasks.slice(start, start + TRAILER_FETCH_CONCURRENCY);
            await Promise.all(chunk.map((task) => task()));
        }

        return list;
    }

    function applyPosterFallbacks(scopeElement) {
        if (!scopeElement) {
            return;
        }

        const images = scopeElement.querySelectorAll("img");
        images.forEach((image) => {
            image.addEventListener("error", () => {
                image.src = FALLBACK_POSTER;
            }, { once: true });
        });
    }

    function formatRuntime(minutes) {
        const value = Number(minutes);
        if (!Number.isFinite(value) || value <= 0) {
            return "Runtime N/A";
        }

        const hours = Math.floor(value / 60);
        const mins = value % 60;
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    }

    function formatRating(movie) {
        const rating = Number(movie.averageRating || movie.rating);
        if (!Number.isFinite(rating)) {
            return "N/A";
        }
        return rating.toFixed(1);
    }

    function formatMeta(movie) {
        const year = movie.startYear || movie.year || "Year N/A";
        const runtime = formatRuntime(movie.runtimeMinutes);
        return `${year} | ${runtime}`;
    }

    function trailerToEmbedUrl(trailerUrl) {
        if (!trailerUrl) {
            return "";
        }

        try {
            const parsed = new URL(trailerUrl.trim());
            const host = parsed.hostname.replace("www.", "").toLowerCase();
            let videoId = "";

            if (host === "youtu.be") {
                videoId = parsed.pathname.replace("/", "");
            }

            if (!videoId && (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com")) {
                videoId = parsed.searchParams.get("v") || "";

                if (!videoId && parsed.pathname.startsWith("/embed/")) {
                    videoId = parsed.pathname.split("/embed/")[1]?.split("/")[0] || "";
                }

                if (!videoId && parsed.pathname.startsWith("/shorts/")) {
                    videoId = parsed.pathname.split("/shorts/")[1]?.split("/")[0] || "";
                }
            }

            if (!videoId) {
                return "";
            }

            return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}&rel=0&modestbranding=1&cc_load_policy=0&cc_lang_pref=en&iv_load_policy=3&fs=0&disablekb=1`;
        } catch (_error) {
            return "";
        }
    }

    function getTmdbAuthHeaders() {
        const runtimeToken = window.TMDB_BEARER_TOKEN || "";
        const token = runtimeToken || TMDB_BEARER_TOKEN;
        if (!token) {
            return null;
        }

        return {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
        };
    }

    function getUserCountryCode() {
        const locale = (navigator.language || "").toUpperCase();
        const localeRegionMatch = locale.match(/-([A-Z]{2})$/);
        if (localeRegionMatch) {
            return localeRegionMatch[1];
        }

        return "US";
    }

    function isAvailableInCountry(movie, countryCode) {
        const countries = Array.isArray(movie.countriesOfOrigin) ? movie.countriesOfOrigin : [];
        if (countries.length === 0) {
            return false;
        }

        return countries.includes(countryCode);
    }

    async function fetchTop250FromRapidApi() {
        const response = await fetch(API_URL, {
            method: "GET",
            headers: API_HEADERS
        });

        if (!response.ok) {
            const responseText = await response.text();
            const error = new Error(`IMDb API request failed (${response.status})`);
            error.status = response.status;
            error.responseText = responseText;
            throw error;
        }

        const data = await response.json();
        return Array.isArray(data) ? data : [];
    }

    async function fetchTopMoviesFromTmdb() {
        const headers = getTmdbAuthHeaders();
        if (!headers) {
            console.warn("TMDB fallback skipped: set window.TMDB_BEARER_TOKEN or TMDB_BEARER_TOKEN in js/imdb-top250.js");
            return [];
        }

        const pageRequests = Array.from({ length: TMDB_FALLBACK_PAGE_COUNT }, (_unused, index) => {
            return fetchTmdbTrendingPage(index + 1, headers);
        });
        const pageResults = await Promise.all(pageRequests);
        const results = pageResults.flat();

        const movies = results.map((movie) => ({
            primaryTitle: movie.title || movie.original_title || "Untitled",
            primaryImage: movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : "",
            averageRating: Number(movie.vote_average || 0),
            startYear: parseYear(movie.release_date) || "Year N/A",
            runtimeMinutes: 0,
            description: movie.overview || "No description available.",
            genres: Array.isArray(movie.genre_ids)
                ? movie.genre_ids.map((id) => TMDB_GENRE_MAP[id]).filter(Boolean)
                : [],
            countriesOfOrigin: [],
            trailer: "",
            tmdbId: movie.id,
            mediaType: "movie",
            url: `${TMDB_SITE_BASE}/${movie.id}`
        }));

        return enrichTrailersForEntries(movies, "movie");
    }

    function normalizeTvShow(show) {
        return {
            primaryTitle: show.name || show.original_name || "Untitled",
            primaryImage: show.poster_path ? `${TMDB_IMAGE_BASE}${show.poster_path}` : "",
            averageRating: Number(show.vote_average || 0),
            startYear: parseYear(show.first_air_date) || "N/A",
            runtimeMinutes: 0,
            description: show.overview || "",
            genres: Array.isArray(show.genre_ids)
                ? show.genre_ids.map((id) => TMDB_GENRE_MAP[id]).filter(Boolean)
                : [],
            countriesOfOrigin: [],
            trailer: "",
            tmdbId: show.id,
            mediaType: "tv",
            url: `https://www.themoviedb.org/tv/${show.id}`
        };
    }

    async function fetchTmdbTvPage(type, page, headers) {
        const baseUrl = type === "originals" ? TMDB_TV_TOP_RATED_URL : TMDB_TV_TRENDING_URL;
        const url = new URL(baseUrl);
        url.searchParams.set("page", String(page));

        const response = await fetch(url.toString(), { method: "GET", headers });
        if (!response.ok) {
            throw new Error(`TMDB TV fetch failed (${response.status})`);
        }

        const payload = await response.json();
        return Array.isArray(payload.results) ? payload.results : [];
    }

    async function fetchTvShows(type) {
        const headers = getTmdbAuthHeaders();
        if (!headers) {
            console.warn("TMDB bearer token not set. Cannot fetch TV series.");
            return [];
        }

        const [page1, page2] = await Promise.all([
            fetchTmdbTvPage(type, 1, headers),
            fetchTmdbTvPage(type, 2, headers)
        ]);

        const shows = [...page1, ...page2].map(normalizeTvShow);
        return enrichTrailersForEntries(shows, "tv");
    }

    async function fetchTop250() {
        try {
            const movies = await fetchTop250FromRapidApi();
            return enrichTrailersForEntries(movies, "movie");
        } catch (error) {
            const shouldFallback = isQuotaError(error.status, error.responseText);
            if (!shouldFallback) {
                throw error;
            }

            console.warn("IMDb RapidAPI quota exceeded. Switching to TMDB fallback.");
            const fallbackMovies = await fetchTopMoviesFromTmdb();
            if (fallbackMovies.length > 0) {
                return fallbackMovies;
            }

            throw error;
        }
    }

    const featuredPlaybackState = {
        durationSeconds: 0,
        currentSeconds: 0,
        isPlaying: false,
        isMuted: false,
        volume: 100
    };

    const featuredYouTubeState = {
        apiReadyPromise: null,
        player: null,
        progressTimerId: null,
        captionsEnabled: false,
        sessionId: 0,
        overlayIdleTimerId: null,
        overlayActivityBound: false
    };

    function clearFeaturedOverlayIdleTimer() {
        if (featuredYouTubeState.overlayIdleTimerId) {
            window.clearTimeout(featuredYouTubeState.overlayIdleTimerId);
            featuredYouTubeState.overlayIdleTimerId = null;
        }
    }

    function setFeaturedOverlayVisible(isVisible) {
        const featured = document.getElementById("featuredPlayer");
        if (!featured) {
            return;
        }

        featured.classList.toggle("cursor-active", Boolean(isVisible));
    }

    function markFeaturedCursorActive() {
        const featured = document.getElementById("featuredPlayer");
        if (!featured || featured.classList.contains("is-closed")) {
            return;
        }

        setFeaturedOverlayVisible(true);
        clearFeaturedOverlayIdleTimer();
        featuredYouTubeState.overlayIdleTimerId = window.setTimeout(() => {
            setFeaturedOverlayVisible(false);
            featuredYouTubeState.overlayIdleTimerId = null;
        }, 1800);
    }

    function bindFeaturedOverlayActivity() {
        if (featuredYouTubeState.overlayActivityBound) {
            return;
        }

        const featured = document.getElementById("featuredPlayer");
        if (!featured) {
            return;
        }

        featured.addEventListener("mouseenter", markFeaturedCursorActive);
        featured.addEventListener("mousemove", markFeaturedCursorActive);
        featured.addEventListener("pointermove", markFeaturedCursorActive);
        featured.addEventListener("mouseleave", () => {
            clearFeaturedOverlayIdleTimer();
            setFeaturedOverlayVisible(false);
        });
        featured.addEventListener("focusin", () => {
            clearFeaturedOverlayIdleTimer();
            setFeaturedOverlayVisible(true);
        });
        featured.addEventListener("focusout", () => {
            if (!featured.contains(document.activeElement)) {
                clearFeaturedOverlayIdleTimer();
                setFeaturedOverlayVisible(false);
            }
        });

        featuredYouTubeState.overlayActivityBound = true;
    }

    function formatClock(seconds) {
        const value = Math.max(0, Math.floor(Number(seconds) || 0));
        const hours = Math.floor(value / 3600);
        const minutes = Math.floor((value % 3600) / 60);
        const secs = value % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
        }

        return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }

    function syncFeaturedProgressUI() {
        const currentTimeEl = document.getElementById("featuredCurrentTime");
        const totalTimeEl = document.getElementById("featuredTotalTime");
        const fill = document.getElementById("featuredProgressFill");
        const thumb = document.getElementById("featuredProgressThumb");
        const track = document.getElementById("featuredProgressTrack");
        const playPauseIcon = document.getElementById("featuredPlayPauseIcon");
        const volumeIcon = document.getElementById("featuredVolumeIcon");
        const volumeRange = document.getElementById("featuredVolumeRange");

        const duration = Math.max(0, Number(featuredPlaybackState.durationSeconds) || 0);
        const current = Math.min(Math.max(0, featuredPlaybackState.currentSeconds), duration);
        const pct = duration > 0 ? Math.max(0, Math.min(100, (current / duration) * 100)) : 0;
        const remaining = Math.max(0, duration - current);

        featuredPlaybackState.currentSeconds = current;

        if (currentTimeEl) {
            currentTimeEl.textContent = formatClock(current);
        }
        if (totalTimeEl) {
            totalTimeEl.textContent = `-${formatClock(remaining)}`;
        }
        if (fill) {
            fill.style.width = `${pct}%`;
        }
        if (thumb) {
            thumb.style.left = `${pct}%`;
        }
        if (track) {
            track.setAttribute("aria-valuenow", String(Math.round(pct)));
        }
        if (playPauseIcon) {
            playPauseIcon.className = featuredPlaybackState.isPlaying ? "fa fa-pause" : "fa fa-play";
        }
        if (volumeIcon) {
            volumeIcon.className = featuredPlaybackState.isMuted ? "fa fa-volume-off" : "fa fa-volume-up";
        }
        if (volumeRange) {
            const vol = Math.max(0, Math.min(100, Number(featuredPlaybackState.volume) || 0));
            volumeRange.value = String(vol);
            volumeRange.style.setProperty("--val", `${vol}%`);
        }
    }

    function extractYouTubeVideoId(trailerUrl) {
        if (!trailerUrl || typeof trailerUrl !== "string") {
            return "";
        }

        try {
            const parsed = new URL(trailerUrl.trim());
            const host = parsed.hostname.replace("www.", "").toLowerCase();

            if (host === "youtu.be") {
                return parsed.pathname.replace("/", "").split("/")[0] || "";
            }

            if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
                const watchId = parsed.searchParams.get("v");
                if (watchId) {
                    return watchId;
                }

                const embedMatch = parsed.pathname.match(/\/(embed|shorts)\/([^/?#]+)/);
                if (embedMatch && embedMatch[2]) {
                    return embedMatch[2];
                }
            }
        } catch (_error) {
            return "";
        }

        return "";
    }

    function buildFeaturedYouTubeEmbedUrl(videoId) {
        if (!videoId) {
            return "";
        }

        const params = new URLSearchParams({
            autoplay: "1",
            mute: "0",
            controls: "0",
            rel: "0",
            modestbranding: "1",
            playsinline: "1",
            enablejsapi: "1",
            cc_load_policy: "0",
            cc_lang_pref: "en",
            iv_load_policy: "3",
            fs: "0",
            disablekb: "1"
        });

        if (window.location && window.location.origin) {
            params.set("origin", window.location.origin);
        }

        return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
    }

    function stopFeaturedProgressTimer() {
        if (featuredYouTubeState.progressTimerId) {
            window.clearInterval(featuredYouTubeState.progressTimerId);
            featuredYouTubeState.progressTimerId = null;
        }
    }

    function refreshFeaturedPlaybackFromYouTube() {
        const player = featuredYouTubeState.player;
        if (!player) {
            return;
        }

        const duration = Number(player.getDuration?.() || 0);
        const current = Number(player.getCurrentTime?.() || 0);
        const state = Number(player.getPlayerState?.());

        featuredPlaybackState.durationSeconds = Math.max(0, duration);
        featuredPlaybackState.currentSeconds = Math.max(0, current);
        featuredPlaybackState.isPlaying = state === 1;
        featuredPlaybackState.isMuted = Boolean(player.isMuted?.());
        featuredPlaybackState.volume = Math.max(0, Math.min(100, Number(player.getVolume?.() || 0)));

        syncFeaturedProgressUI();
    }

    function syncFeaturedCaptionsUI() {
        const ccButton = document.getElementById("featuredCcBtn");
        const liveCaptions = document.getElementById("featuredLiveCaptions");
        const featured = document.getElementById("featuredPlayer");
        const isClosed = featured ? featured.classList.contains("is-closed") : true;
        const shouldShow = featuredYouTubeState.captionsEnabled && !isClosed;

        if (ccButton) {
            ccButton.classList.toggle("active", featuredYouTubeState.captionsEnabled);
        }

        if (liveCaptions) {
            liveCaptions.hidden = !shouldShow;
        }
    }

    function applyFeaturedCaptionsState() {
        const player = featuredYouTubeState.player;

        if (!player?.loadModule || !player?.setOption) {
            syncFeaturedCaptionsUI();
            return;
        }

        try {
            if (featuredYouTubeState.captionsEnabled) {
                player.loadModule("captions");
                player.setOption("captions", "track", { languageCode: "en" });
                player.setOption("captions", "reload", true);
            } else {
                // Force captions fully off to prevent YouTube default caption popups.
                player.setOption("captions", "track", {});
                player.setOption("captions", "reload", true);
                if (player.unloadModule) {
                    player.unloadModule("captions");
                }
            }
        } catch (_error) {
            // Keep UI state even if caption module control is unavailable.
        }

        syncFeaturedCaptionsUI();
    }

    function startFeaturedProgressTimer() {
        stopFeaturedProgressTimer();
        featuredYouTubeState.progressTimerId = window.setInterval(() => {
            refreshFeaturedPlaybackFromYouTube();
        }, 250);
    }

    function destroyFeaturedYouTubePlayer() {
        stopFeaturedProgressTimer();

        if (featuredYouTubeState.player) {
            try {
                featuredYouTubeState.player.destroy();
            } catch (_error) {
                // Ignore player teardown failures.
            }
            featuredYouTubeState.player = null;
        }

        featuredYouTubeState.captionsEnabled = false;
        syncFeaturedCaptionsUI();
    }

    function ensureYouTubeIframeApi() {
        if (featuredYouTubeState.apiReadyPromise) {
            return featuredYouTubeState.apiReadyPromise;
        }

        featuredYouTubeState.apiReadyPromise = new Promise((resolve) => {
            if (window.YT && window.YT.Player) {
                resolve(window.YT);
                return;
            }

            const previousReady = window.onYouTubeIframeAPIReady;
            window.onYouTubeIframeAPIReady = () => {
                if (typeof previousReady === "function") {
                    previousReady();
                }
                resolve(window.YT);
            };

            const existingScript = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
            if (existingScript) {
                return;
            }

            const script = document.createElement("script");
            script.src = "https://www.youtube.com/iframe_api";
            script.async = true;
            document.head.appendChild(script);
        });

        return featuredYouTubeState.apiReadyPromise;
    }

    async function attachFeaturedYouTubePlayer(videoId, sessionId) {
        if (!videoId) {
            return;
        }

        try {
            await ensureYouTubeIframeApi();
        } catch (_error) {
            return;
        }

        if (!(window.YT && window.YT.Player)) {
            return;
        }

        if (sessionId !== featuredYouTubeState.sessionId) {
            return;
        }

        if (!document.getElementById("featuredTrailerFrame")) {
            return;
        }

        destroyFeaturedYouTubePlayer();

        featuredYouTubeState.player = new window.YT.Player("featuredTrailerFrame", {
            playerVars: {
                autoplay: 1,
                controls: 0,
                rel: 0,
                modestbranding: 1,
                playsinline: 1,
                enablejsapi: 1,
                cc_load_policy: 0,
                iv_load_policy: 3,
                fs: 0,
                disablekb: 1
            },
            events: {
                onReady(event) {
                    try {
                        event.target.unMute();
                    } catch (_error) {
                        // Keep muted state if browser autoplay policy requires it.
                    }

                    featuredPlaybackState.isMuted = Boolean(event.target.isMuted?.());
                    featuredPlaybackState.volume = Math.max(0, Math.min(100, Number(event.target.getVolume?.() || 100)));
                    featuredPlaybackState.isPlaying = true;
                    featuredYouTubeState.captionsEnabled = false;
                    refreshFeaturedPlaybackFromYouTube();
                    startFeaturedProgressTimer();
                    // Ensure captions are off immediately on load.
                    applyFeaturedCaptionsState();
                    event.target.playVideo();
                },
                onApiChange() {
                    if (!featuredYouTubeState.captionsEnabled) {
                        applyFeaturedCaptionsState();
                    }
                },
                onStateChange(event) {
                    const ytState = event.data;
                    featuredPlaybackState.isPlaying = ytState === window.YT.PlayerState.PLAYING;
                    if (ytState === window.YT.PlayerState.ENDED) {
                        featuredPlaybackState.currentSeconds = Math.max(0, featuredPlaybackState.durationSeconds);
                    }
                    if (!featuredYouTubeState.captionsEnabled) {
                        applyFeaturedCaptionsState();
                    }
                    refreshFeaturedPlaybackFromYouTube();
                }
            }
        });
    }

    function closeFeaturedPlayer() {
        const featured = document.getElementById("featuredPlayer");
        const media = document.getElementById("featuredMedia");

        if (!featured) {
            return;
        }

        featuredYouTubeState.sessionId += 1;
        clearFeaturedOverlayIdleTimer();
        setFeaturedOverlayVisible(false);
        featured.classList.remove("has-card-anchor");
        featured.style.removeProperty("--featured-anchor-x");
        featured.style.removeProperty("clip-path");
        featured.style.removeProperty("-webkit-clip-path");

        destroyFeaturedYouTubePlayer();

        featured.classList.add("is-closed");
        featured.classList.remove("is-trailer");
        if (media) {
            media.innerHTML = "";
        }

        featuredPlaybackState.durationSeconds = 0;
        featuredPlaybackState.currentSeconds = 0;
        featuredPlaybackState.isPlaying = false;
        featuredPlaybackState.isMuted = false;
        featuredPlaybackState.volume = 100;
        featuredYouTubeState.captionsEnabled = false;
        syncFeaturedCaptionsUI();
        syncFeaturedProgressUI();
    }

    function scrollToFeaturedPlayer() {
        const featured = document.getElementById("featuredPlayer");
        if (!featured) {
            return;
        }

        const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
        featured.scrollIntoView({
            behavior: reduceMotion ? "auto" : "smooth",
            block: "center"
        });
    }

    function applyFeaturedBubbleShape(featured, anchorX) {
        if (!featured) {
            return;
        }

        const width = Math.max(320, Math.round(featured.offsetWidth || 0));
        const height = Math.max(320, Math.round(featured.offsetHeight || 0));
        const radius = 14;
        const notchHeight = 28;
        const notchHalfWidth = 24;
        const boundedAnchorX = Math.max(radius + notchHalfWidth, Math.min(width - radius - notchHalfWidth, anchorX));
        const path = [
            `M ${radius} ${notchHeight}`,
            `L ${boundedAnchorX - notchHalfWidth} ${notchHeight}`,
            `L ${boundedAnchorX} 0`,
            `L ${boundedAnchorX + notchHalfWidth} ${notchHeight}`,
            `L ${width - radius} ${notchHeight}`,
            `Q ${width} ${notchHeight} ${width} ${notchHeight + radius}`,
            `L ${width} ${height - radius}`,
            `Q ${width} ${height} ${width - radius} ${height}`,
            `L ${radius} ${height}`,
            `Q 0 ${height} 0 ${height - radius}`,
            `L 0 ${notchHeight + radius}`,
            `Q 0 ${notchHeight} ${radius} ${notchHeight}`,
            "Z"
        ].join(" ");

        featured.style.clipPath = `path('${path}')`;
        featured.style.setProperty("-webkit-clip-path", `path('${path}')`);
    }

    function updateFeaturedBubbleAnchor(sourceCard) {
        const featured = document.getElementById("featuredPlayer");
        const movieGrid = document.getElementById("movieCards");
        const nrGrid = document.getElementById("newReleasesCards");
        const grid = (nrGrid && sourceCard && nrGrid.contains(sourceCard)) ? nrGrid : movieGrid;

        if (!featured || !grid || !sourceCard || !grid.contains(sourceCard)) {
            if (featured) {
                featured.classList.remove("has-card-anchor");
                featured.style.removeProperty("--featured-anchor-x");
                featured.style.removeProperty("clip-path");
                featured.style.removeProperty("-webkit-clip-path");
            }
            return;
        }

        const featuredRect = featured.getBoundingClientRect();
        const sourceRect = sourceCard.getBoundingClientRect();
        const anchorX = sourceRect.left + (sourceRect.width / 2) - featuredRect.left;
        const boundedAnchorX = Math.max(48, Math.min(featuredRect.width - 48, anchorX));

        featured.style.setProperty("--featured-anchor-x", `${boundedAnchorX}px`);
        featured.classList.add("has-card-anchor");
        applyFeaturedBubbleShape(featured, boundedAnchorX);
    }

    function placeFeaturedPlayerAtCardRow(sourceCard) {
        const featured = document.getElementById("featuredPlayer");

        const movieGrid = document.getElementById("movieCards");
        const nrGrid = document.getElementById("newReleasesCards");
        const grid = (nrGrid && sourceCard && nrGrid.contains(sourceCard)) ? nrGrid : movieGrid;

        if (!featured || !grid || !sourceCard || !grid.contains(sourceCard)) {
            return;
        }

        const cards = Array.from(grid.querySelectorAll(".movie-card"));
        if (cards.length === 0) {
            return;
        }

        const clickedIndex = cards.indexOf(sourceCard);
        if (clickedIndex < 0) {
            return;
        }

        const firstRowTop = cards[0].offsetTop;
        let cardsPerRow = 1;
        for (let idx = 0; idx < cards.length; idx += 1) {
            if (Math.abs(cards[idx].offsetTop - firstRowTop) > 1) {
                break;
            }
            cardsPerRow += idx === 0 ? 0 : 1;
        }

        cardsPerRow = Math.max(1, cardsPerRow);
        const rowIndex = Math.floor(clickedIndex / cardsPerRow);
        const rowEndIndex = Math.min(cards.length - 1, (rowIndex + 1) * cardsPerRow - 1);
        const anchorCard = cards[rowEndIndex];

        if (!anchorCard) {
            grid.appendChild(featured);
            return;
        }

        grid.insertBefore(featured, anchorCard.nextSibling);
    }

    function openFeaturedPlayer(movie, sourceCard = null) {
        const featured = document.getElementById("featuredPlayer");
        const media = document.getElementById("featuredMedia");
        const title = document.getElementById("featuredTitle");
        const watching = document.getElementById("featuredWatching");

        if (!featured || !movie) {
            return;
        }

        const videoId = extractYouTubeVideoId(movie.trailer);
        const embedUrl = buildFeaturedYouTubeEmbedUrl(videoId);
        const sessionId = featuredYouTubeState.sessionId + 1;

        featuredYouTubeState.sessionId = sessionId;

        destroyFeaturedYouTubePlayer();

        if (embedUrl && media) {
            media.innerHTML = `<iframe id="featuredTrailerFrame" src="${embedUrl}" title="${getTitle(movie)} trailer" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe>`;
            featured.style.backgroundImage = "none";
            featured.classList.add("is-trailer");

            featuredPlaybackState.durationSeconds = 0;
            featuredPlaybackState.currentSeconds = 0;
            featuredPlaybackState.isPlaying = true;
            featuredPlaybackState.isMuted = false;
            featuredPlaybackState.volume = 100;
            featuredYouTubeState.captionsEnabled = false;
            syncFeaturedCaptionsUI();
            syncFeaturedProgressUI();

            attachFeaturedYouTubePlayer(videoId, sessionId);
        } else {
            if (media) {
                media.innerHTML = "";
            }
            featured.style.backgroundImage = `url('${getPoster(movie)}')`;
            featured.classList.remove("is-trailer");

            featuredPlaybackState.durationSeconds = 0;
            featuredPlaybackState.currentSeconds = 0;
            featuredPlaybackState.isPlaying = false;
            featuredPlaybackState.isMuted = false;
            featuredPlaybackState.volume = 100;
            featuredYouTubeState.captionsEnabled = false;
            syncFeaturedCaptionsUI();
            syncFeaturedProgressUI();
        }

        if (title) {
            title.textContent = `${getTitle(movie)} (${movie.startYear || "N/A"})`;
        }
        if (watching) {
            watching.textContent = "Watching";
        }

        placeFeaturedPlayerAtCardRow(sourceCard);
        bindFeaturedOverlayActivity();
        featured.classList.remove("is-closed");
        window.requestAnimationFrame(() => {
            updateFeaturedBubbleAnchor(sourceCard);
        });
        markFeaturedCursorActive();
        scrollToFeaturedPlayer();
    }

    function bindFeaturedPlayerControls() {
        bindFeaturedOverlayActivity();

        const actionButtons = document.querySelectorAll(".featured-icon-actions button");
        const playPauseButton = document.getElementById("featuredPlayPauseBtn");
        const rewindButton = document.getElementById("featuredRewindBtn");
        const progressTrack = document.getElementById("featuredProgressTrack");
        const ccButton = document.getElementById("featuredCcBtn");
        const volumeButton = document.getElementById("featuredVolumeBtn");
        const volumeRange = document.getElementById("featuredVolumeRange");
        const expandButton = document.getElementById("featuredExpandBtn");

        if (actionButtons.length > 1) {
            actionButtons[1].addEventListener("click", closeFeaturedPlayer);
        }

        if (playPauseButton) {
            playPauseButton.addEventListener("click", () => {
                const player = featuredYouTubeState.player;
                if (!player) {
                    featuredPlaybackState.isPlaying = !featuredPlaybackState.isPlaying;
                    syncFeaturedProgressUI();
                    return;
                }

                const ytState = Number(player.getPlayerState?.());
                const isPlaying = ytState === 1;
                if (isPlaying) {
                    player.pauseVideo();
                } else {
                    player.playVideo();
                }
                refreshFeaturedPlaybackFromYouTube();
                syncFeaturedProgressUI();
            });
        }

        if (rewindButton) {
            rewindButton.addEventListener("click", () => {
                const player = featuredYouTubeState.player;
                if (!player) {
                    featuredPlaybackState.currentSeconds = Math.max(0, featuredPlaybackState.currentSeconds - 10);
                    syncFeaturedProgressUI();
                    return;
                }

                const current = Number(player.getCurrentTime?.() || 0);
                player.seekTo(Math.max(0, current - 10), true);
                refreshFeaturedPlaybackFromYouTube();
                syncFeaturedProgressUI();
            });
        }

        if (progressTrack) {
            progressTrack.addEventListener("click", (event) => {
                const rect = progressTrack.getBoundingClientRect();
                const pct = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));

                const player = featuredYouTubeState.player;
                if (player) {
                    const duration = Number(player.getDuration?.() || featuredPlaybackState.durationSeconds || 0);
                    if (duration > 0) {
                        player.seekTo(duration * pct, true);
                        refreshFeaturedPlaybackFromYouTube();
                    }
                } else {
                    featuredPlaybackState.currentSeconds = Math.round(featuredPlaybackState.durationSeconds * pct);
                }

                syncFeaturedProgressUI();
            });
        }

        if (ccButton) {
            ccButton.addEventListener("click", () => {
                featuredYouTubeState.captionsEnabled = !featuredYouTubeState.captionsEnabled;
                applyFeaturedCaptionsState();
            });
        }

        if (volumeButton) {
            volumeButton.addEventListener("click", () => {
                const player = featuredYouTubeState.player;
                if (player) {
                    if (player.isMuted?.()) {
                        player.unMute();
                        if ((player.getVolume?.() || 0) <= 0) {
                            player.setVolume(50);
                        }
                    } else {
                        player.mute();
                    }
                    refreshFeaturedPlaybackFromYouTube();
                } else {
                    featuredPlaybackState.isMuted = !featuredPlaybackState.isMuted;
                    if (!featuredPlaybackState.isMuted && featuredPlaybackState.volume === 0) {
                        featuredPlaybackState.volume = 50;
                    }
                }

                syncFeaturedProgressUI();
            });
        }

        if (volumeRange) {
            volumeRange.addEventListener("input", () => {
                const nextVolume = Math.max(0, Math.min(100, Number(volumeRange.value || 0)));
                const player = featuredYouTubeState.player;

                featuredPlaybackState.volume = nextVolume;
                featuredPlaybackState.isMuted = nextVolume === 0;

                if (player) {
                    player.setVolume(nextVolume);
                    if (nextVolume === 0) {
                        player.mute();
                    } else {
                        player.unMute();
                    }
                    refreshFeaturedPlaybackFromYouTube();
                } else {
                    syncFeaturedProgressUI();
                }
            });
        }

        if (expandButton) {
            expandButton.addEventListener("click", () => {
                const featured = document.getElementById("featuredPlayer");
                if (!featured) {
                    return;
                }
                if (document.fullscreenElement) {
                    document.exitFullscreen();
                    return;
                }
                featured.requestFullscreen();
            });
        }

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                closeFeaturedPlayer();
            }
        });
    }

    async function ensureTrailerOnDemand(entry) {
        if (!entry) {
            return entry;
        }

        if (normalizeAbsoluteUrl(entry.trailer)) {
            return entry;
        }

        const mediaType = entry.mediaType === "tv" ? "tv" : "movie";
        const [enriched] = await enrichTrailersForEntries([entry], mediaType);
        return enriched || entry;
    }

    function renderHomeCards(movies) {
        const container = document.getElementById("movieCards");
        if (!container) {
            return;
        }

        container.innerHTML = "";

        if (!Array.isArray(movies) || movies.length === 0) {
            container.innerHTML = `
                <article class="movie-empty-state" aria-live="polite">
                    <h3>No matches found</h3>
                    <p>Try a different title or loosen your filters.</p>
                </article>
            `;
            return;
        }

        movies.forEach((movie) => {
            const card = document.createElement("article");
            card.className = "movie-card";

            card.innerHTML = `
                <div class="movie-image">
                    <img src="${getPoster(movie)}" alt="${getTitle(movie)} poster" loading="lazy">
                </div>
                <div class="movie-info">
                    <h3 class="movie-title">${getTitle(movie)}</h3>
                    <p class="movie-meta">${formatMeta(movie)}</p>
                    <p class="movie-meta">Rating: ${formatRating(movie)}</p>
                    <div class="movie-actions">
                        <button class="btn-watch" type="button">WATCH</button>
                        <button class="btn-add-list" type="button">+ ADD LIST</button>
                    </div>
                </div>
            `;

            const watchButton = card.querySelector(".btn-watch");
            if (watchButton) {
                watchButton.addEventListener("click", async () => {
                    const withTrailer = await ensureTrailerOnDemand(movie);
                    openFeaturedPlayer(withTrailer, card);
                });
            }

            container.appendChild(card);
        });

        applyPosterFallbacks(container);
    }

    function renderPosterRow(containerId, movies) {
        const container = document.getElementById(containerId);
        if (!container) {
            return;
        }

        container.innerHTML = "";

        movies.forEach((movie) => {
            const card = document.createElement("article");
            card.className = "poster-card";

            if (containerId === "trendCards") {
                card.classList.add("trend-card");
                card.innerHTML = `
                    <img src="${getPoster(movie)}" class="poster-image" alt="${getTitle(movie)} poster" loading="lazy">
                    <div class="poster-info">
                        <h4 class="poster-title" title="${getTitle(movie)}">${getTitle(movie)}</h4>
                        <div class="poster-meta-row">
                            <span class="poster-year">${movie.startYear || "N/A"}</span>
                            <div class="poster-actions" aria-hidden="true">
                                <span class="action-icon muted">♥</span>
                                <span class="action-icon">●</span>
                                <span class="score">★ ${formatRating(movie)}</span>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                card.innerHTML = `
                    <img src="${getPoster(movie)}" class="poster-image" alt="${getTitle(movie)} poster" loading="lazy">
                    <div class="poster-info">
                        <h4 class="poster-title">${getTitle(movie)}</h4>
                        <p class="poster-meta">${movie.startYear || "N/A"} | ★ ${formatRating(movie)}</p>
                    </div>
                `;
            }

            container.appendChild(card);
        });

        applyPosterFallbacks(container);
    }

    function setupScrollCarousel(rowId, prevId, nextId) {
        const trendRow = document.getElementById(rowId);
        const prevButton = document.getElementById(prevId);
        const nextButton = document.getElementById(nextId);

        if (!trendRow || !prevButton || !nextButton) {
            return;
        }

        const scrollStep = 380;

        if (trendRow.__loopScrollHandler) {
            trendRow.removeEventListener("scroll", trendRow.__loopScrollHandler);
            trendRow.__loopScrollHandler = null;
        }

        if (trendRow.__loopResizeHandler) {
            window.removeEventListener("resize", trendRow.__loopResizeHandler);
            trendRow.__loopResizeHandler = null;
        }

        if (trendRow.__pauseLoopOnEnterHandler) {
            trendRow.removeEventListener("mouseenter", trendRow.__pauseLoopOnEnterHandler);
            trendRow.__pauseLoopOnEnterHandler = null;
        }

        if (trendRow.__resumeLoopOnLeaveHandler) {
            trendRow.removeEventListener("mouseleave", trendRow.__resumeLoopOnLeaveHandler);
            trendRow.__resumeLoopOnLeaveHandler = null;
        }

        if (trendRow.__autoLoopRafId) {
            window.cancelAnimationFrame(trendRow.__autoLoopRafId);
            trendRow.__autoLoopRafId = null;
        }

        if (trendRow.__autoLoopResumeTimeoutId) {
            window.clearTimeout(trendRow.__autoLoopResumeTimeoutId);
            trendRow.__autoLoopResumeTimeoutId = null;
        }

        // Remove any prior loop clones before rebuilding the loop structure.
        trendRow.querySelectorAll('.poster-card[data-clone]').forEach((node) => node.remove());

        const originalCards = Array.from(trendRow.querySelectorAll('.poster-card:not([data-clone])'));
        const originalCount = originalCards.length;

        if (originalCount === 0) {
            prevButton.disabled = true;
            nextButton.disabled = true;
            return;
        }

        // Clone cards to both ends so horizontal scrolling can wrap seamlessly.
        const leadingCloneNodes = originalCards.map((card) => {
            const clone = card.cloneNode(true);
            clone.setAttribute("aria-hidden", "true");
            clone.dataset.clone = "leading";
            return clone;
        });

        const trailingCloneNodes = originalCards.map((card) => {
            const clone = card.cloneNode(true);
            clone.setAttribute("aria-hidden", "true");
            clone.dataset.clone = "trailing";
            return clone;
        });

        leadingCloneNodes.reverse().forEach((clone) => {
            trendRow.insertBefore(clone, trendRow.firstChild);
        });
        trailingCloneNodes.forEach((clone) => {
            trendRow.appendChild(clone);
        });

        const cards = Array.from(trendRow.children);
        const cycleStartCard = cards[originalCount];
        const nextCycleStartCard = cards[originalCount * 2];

        if (!cycleStartCard || !nextCycleStartCard) {
            prevButton.disabled = true;
            nextButton.disabled = true;
            return;
        }

        let cycleStart = cycleStartCard.offsetLeft;
        let cycleWidth = nextCycleStartCard.offsetLeft - cycleStart;

        const jumpTo = (position) => {
            const previousBehavior = trendRow.style.scrollBehavior;
            trendRow.style.scrollBehavior = "auto";
            trendRow.scrollLeft = position;
            trendRow.style.scrollBehavior = previousBehavior;
        };

        const recalculateCycle = () => {
            const updatedCards = Array.from(trendRow.children);
            const updatedStartCard = updatedCards[originalCount];
            const updatedNextCard = updatedCards[originalCount * 2];
            if (!updatedStartCard || !updatedNextCard) {
                return;
            }

            cycleStart = updatedStartCard.offsetLeft;
            cycleWidth = updatedNextCard.offsetLeft - cycleStart;
            if (cycleWidth <= 0) {
                return;
            }
            jumpTo(cycleStart + (trendRow.scrollLeft - cycleStart + cycleWidth) % cycleWidth);
        };

        const keepLoopContinuous = () => {
            if (cycleWidth <= 0) {
                return;
            }

            const rightWrapThreshold = cycleStart + cycleWidth - trendRow.clientWidth;

            if (trendRow.scrollLeft < cycleStart) {
                jumpTo(trendRow.scrollLeft + cycleWidth);
            } else if (trendRow.scrollLeft > rightWrapThreshold) {
                jumpTo(trendRow.scrollLeft - cycleWidth);
            }
        };

        let autoPaused = false;
        const autoScrollStep = 0.45;

        const pauseAutoLoop = () => {
            autoPaused = true;
        };

        const resumeAutoLoop = () => {
            autoPaused = false;
        };

        const pauseAutoLoopTemporarily = (durationMs = 900) => {
            pauseAutoLoop();
            if (trendRow.__autoLoopResumeTimeoutId) {
                window.clearTimeout(trendRow.__autoLoopResumeTimeoutId);
            }
            trendRow.__autoLoopResumeTimeoutId = window.setTimeout(() => {
                resumeAutoLoop();
                trendRow.__autoLoopResumeTimeoutId = null;
            }, durationMs);
        };

        const autoLoopTick = () => {
            if (!autoPaused) {
                trendRow.scrollLeft += autoScrollStep;
                keepLoopContinuous();
            }
            trendRow.__autoLoopRafId = window.requestAnimationFrame(autoLoopTick);
        };

        prevButton.disabled = false;
        nextButton.disabled = false;

        prevButton.onclick = () => {
            pauseAutoLoopTemporarily();
            trendRow.scrollBy({ left: -scrollStep, behavior: "smooth" });
        };

        nextButton.onclick = () => {
            pauseAutoLoopTemporarily();
            trendRow.scrollBy({ left: scrollStep, behavior: "smooth" });
        };

        trendRow.__loopScrollHandler = keepLoopContinuous;
        trendRow.__loopResizeHandler = recalculateCycle;
        trendRow.__pauseLoopOnEnterHandler = pauseAutoLoop;
        trendRow.__resumeLoopOnLeaveHandler = resumeAutoLoop;

        trendRow.addEventListener("scroll", trendRow.__loopScrollHandler);
        window.addEventListener("resize", trendRow.__loopResizeHandler);
        trendRow.addEventListener("mouseenter", trendRow.__pauseLoopOnEnterHandler);
        trendRow.addEventListener("mouseleave", trendRow.__resumeLoopOnLeaveHandler);
        jumpTo(cycleStart);
        trendRow.__autoLoopRafId = window.requestAnimationFrame(autoLoopTick);
    }

    function renderNewReleasesCards(movies) {
        const container = document.getElementById("newReleasesCards");
        if (!container) {
            return;
        }

        container.innerHTML = "";

        if (!Array.isArray(movies) || movies.length === 0) {
            container.innerHTML = `
                <article class="movie-empty-state" aria-live="polite">
                    <h3>No matches found</h3>
                    <p>Try a different title or loosen your filters.</p>
                </article>
            `;
            return;
        }

        movies.forEach((movie) => {
            const card = document.createElement("article");
            card.className = "movie-card";

            card.innerHTML = `
                <div class="movie-image">
                    <img src="${getPoster(movie)}" alt="${getTitle(movie)} poster" loading="lazy">
                </div>
                <div class="movie-info">
                    <h3 class="movie-title">${getTitle(movie)}</h3>
                    <p class="movie-meta">${formatMeta(movie)}</p>
                    <p class="movie-meta">Rating: ${formatRating(movie)}</p>
                    <div class="movie-actions">
                        <button class="btn-watch" type="button">WATCH</button>
                        <button class="btn-add-list" type="button">+ ADD LIST</button>
                    </div>
                </div>
            `;

            const watchButton = card.querySelector(".btn-watch");
            if (watchButton) {
                watchButton.addEventListener("click", async () => {
                    const withTrailer = await ensureTrailerOnDemand(movie);
                    openFeaturedPlayer(withTrailer, card);
                });
            }

            container.appendChild(card);
        });

        applyPosterFallbacks(container);
    }

    function bindNewReleasesFilters(allMovies) {
        const currentYear = new Date().getFullYear();

        const getBasePool = async (tab) => {
            const recentMovies = allMovies.filter((m) => Number(m.startYear) >= currentYear - 2);
            const moviePool = recentMovies.length >= 6 ? recentMovies : allMovies;

            if (tab === "new-movies") {
                return moviePool;
            }
            if (tab === "new-series") {
                const tv = await fetchTvShows("series");
                const recentTv = tv.filter((m) => Number(m.startYear) >= currentYear - 2);
                return recentTv.length >= 4 ? recentTv : tv;
            }
            if (tab === "new-originals") {
                const tv = await fetchTvShows("originals");
                const recentTv = tv.filter((m) => Number(m.startYear) >= currentYear - 2);
                return recentTv.length >= 4 ? recentTv : tv;
            }
            return moviePool;
        };

        const tabs = Array.from(document.querySelectorAll(".new-releases-block .topline-links .topline-link"));
        const chips = Array.from(document.querySelectorAll(".new-releases-block .chip-row .chip"));
        const sortButtons = Array.from(document.querySelectorAll(".new-releases-block .sort-group .mini-pill"));
        const ratingInput = document.getElementById("nrRatingFilter");
        const ratingValue = document.getElementById("nrRatingValue");
        const searchInput = document.getElementById("nrSearchInput");
        const searchButton = document.getElementById("nrSearchBtn");

        if (!ratingInput || !ratingValue) {
            return;
        }

        const state = {
            tab: "new-movies",
            selectedGenres: [],
            sortMode: "newest",
            minRating: 0,
            query: ""
        };

        const render = async () => {
            const container = document.getElementById("newReleasesCards");
            if (container) {
                container.innerHTML = "<p style=\"color:var(--text-secondary);padding:20px 0;text-align:center;\">Loading...</p>";
            }

            let pool = await getBasePool(state.tab);

            if (state.selectedGenres.length > 0) {
                const normalized = state.selectedGenres.map(normalizeGenre);
                const filtered = pool.filter((m) =>
                    (Array.isArray(m.genres) ? m.genres : []).some((g) => normalized.includes(normalizeGenre(g)))
                );
                if (filtered.length > 0) {
                    pool = filtered;
                }
            }

            pool = pool.filter((m) => getMovieNumericRating(m) >= state.minRating);

            const q = state.query.trim().toLowerCase();
            if (q) {
                pool = pool.filter((m) => getTitle(m).toLowerCase().includes(q));
            }

            if (state.sortMode === "newest") {
                pool = [...pool].sort((a, b) => Number(b.startYear || 0) - Number(a.startYear || 0));
            } else if (state.sortMode === "az") {
                pool = [...pool].sort((a, b) => getTitle(a).localeCompare(getTitle(b)));
            } else if (state.sortMode === "rating") {
                pool = [...pool].sort((a, b) => getMovieNumericRating(b) - getMovieNumericRating(a));
            }

            ratingValue.textContent = state.minRating.toFixed(1);
            renderNewReleasesCards(pool.slice(0, HOME_MOVIE_LIMIT));
        };

        tabs.forEach((tab) => {
            tab.addEventListener("click", () => {
                tabs.forEach((t) => t.classList.remove("active"));
                tab.classList.add("active");
                state.tab = tab.dataset.tab || "new-movies";
                render();
            });
        });

        chips.forEach((chip) => {
            chip.addEventListener("click", () => {
                chip.classList.toggle("active");
                state.selectedGenres = chips
                    .filter((c) => c.classList.contains("active"))
                    .map((c) => c.dataset.genre || c.textContent || "");
                render();
            });
        });

        sortButtons.forEach((btn) => {
            btn.addEventListener("click", () => {
                sortButtons.forEach((b) => b.classList.remove("active"));
                btn.classList.add("active");
                state.sortMode = btn.dataset.sort || "newest";
                render();
            });
        });

        ratingInput.addEventListener("input", () => {
            state.minRating = Number(ratingInput.value);
            render();
        });

        const doSearch = () => {
            state.query = searchInput ? searchInput.value : "";
            render();
        };

        if (searchButton) {
            searchButton.addEventListener("click", doSearch);
        }
        if (searchInput) {
            searchInput.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    doSearch();
                }
            });
        }

        render();
    }

    function bindTrendGenreFilters(movies) {
        const chips = Array.from(document.querySelectorAll(".trends-block .chip-row .chip"));
        const tabs = Array.from(document.querySelectorAll(".trends-block .topline-links .topline-link"));
        if (chips.length === 0) {
            return;
        }

        let activeTab = "popular";

        const getMoviesForTab = (selectedGenres) => {
            if (activeTab === "popular") {
                return getTrendMoviesByGenres(movies, selectedGenres);
            }

            // Apply genre filter first (for premieres / recently added)
            let pool = movies;
            if (selectedGenres.length > 0) {
                const normalized = selectedGenres.map(normalizeGenre);
                const genreFiltered = movies.filter((m) =>
                    (Array.isArray(m.genres) ? m.genres : []).some((g) => normalized.includes(normalizeGenre(g)))
                );
                if (genreFiltered.length >= 4) {
                    pool = genreFiltered;
                }
            }

            if (activeTab === "premieres") {
                const currentYear = new Date().getFullYear();
                const recent = pool.filter((m) => Number(m.startYear) >= currentYear - 2);
                const base = recent.length >= 4 ? recent : pool;
                return [...base]
                    .sort((a, b) => Number(b.startYear || 0) - Number(a.startYear || 0))
                    .slice(0, TREND_MOVIE_LIMIT);
            }

            if (activeTab === "recently") {
                return [...pool]
                    .sort((a, b) => Number(b.startYear || 0) - Number(a.startYear || 0))
                    .slice(0, TREND_MOVIE_LIMIT);
            }

            return getTrendMoviesByGenres(movies, selectedGenres);
        };

        const renderFromState = () => {
            const selectedGenres = chips
                .filter((chip) => chip.classList.contains("active"))
                .map((chip) => chip.dataset.genre || chip.textContent || "");

            const trendMovies = getMoviesForTab(selectedGenres);
            renderPosterRow("trendCards", trendMovies);
            setupScrollCarousel("trendCards", "trendPrev", "trendNext");
        };

        tabs.forEach((tab) => {
            tab.addEventListener("click", () => {
                tabs.forEach((t) => t.classList.remove("active"));
                tab.classList.add("active");
                activeTab = tab.dataset.trend || "popular";
                renderFromState();
            });
        });

        chips.forEach((chip) => {
            chip.addEventListener("click", () => {
                chip.classList.toggle("active");
                renderFromState();
            });
        });

        renderFromState();
    }

    function bindMovieGenreFilters(initialMovies) {
        let currentMovies = initialMovies;
        const chips = Array.from(document.querySelectorAll(".movies-block .chip-row .chip"));
        const sortButtons = Array.from(document.querySelectorAll(".movies-block .sort-group .mini-pill"));
        const ratingInput = document.getElementById("movieRatingFilter");
        const ratingValue = document.getElementById("movieRatingValue");
        const searchInput = document.getElementById("movieSearchInput");
        const searchButton = document.getElementById("movieSearchBtn");

        if (chips.length === 0 || !ratingInput || !ratingValue) {
            return null;
        }

        const state = {
            selectedGenres: [],
            sortMode: (sortButtons.find((button) => button.classList.contains("active"))?.dataset.sort || "latest").toLowerCase(),
            minRating: Number(ratingInput.value || 0),
            query: ""
        };

        const renderFromSelectedChips = () => {
            const genreFilteredMovies = getMoviesMatchingGenres(currentMovies, state.selectedGenres);
            const ratingFilteredMovies = genreFilteredMovies.filter((movie) => getMovieNumericRating(movie) >= state.minRating);
            const normalizedQuery = state.query.trim().toLowerCase();
            const searchFilteredMovies = normalizedQuery
                ? ratingFilteredMovies.filter((movie) => getTitle(movie).toLowerCase().includes(normalizedQuery))
                : ratingFilteredMovies;
            const sortedMovies = sortHomeMovies(searchFilteredMovies, state.sortMode);
            const homeMovies = sortedMovies.slice(0, HOME_MOVIE_LIMIT);

            ratingValue.textContent = state.minRating.toFixed(1);
            renderHomeCards(homeMovies);
        };

        chips.forEach((chip) => {
            chip.addEventListener("click", () => {
                chip.classList.toggle("active");
                state.selectedGenres = chips
                    .filter((activeChip) => activeChip.classList.contains("active"))
                    .map((activeChip) => activeChip.dataset.genre || activeChip.textContent || "");
                renderFromSelectedChips();
            });
        });

        sortButtons.forEach((button) => {
            button.addEventListener("click", () => {
                sortButtons.forEach((sortButton) => {
                    sortButton.classList.toggle("active", sortButton === button);
                });
                state.sortMode = (button.dataset.sort || "latest").toLowerCase();
                renderFromSelectedChips();
            });
        });

        ratingInput.addEventListener("input", () => {
            state.minRating = Number(ratingInput.value || 0);
            const pct = ((ratingInput.value - ratingInput.min) / (ratingInput.max - ratingInput.min)) * 100;
            ratingInput.style.setProperty("--val", pct + "%");
            renderFromSelectedChips();
        });

        if (searchInput) {
            searchInput.addEventListener("input", () => {
                state.query = searchInput.value || "";
                renderFromSelectedChips();
            });

            searchInput.addEventListener("keydown", (event) => {
                if (event.key === "Enter") {
                    event.preventDefault();
                    state.query = searchInput.value || "";
                    renderFromSelectedChips();
                }
            });
        }

        if (searchButton) {
            searchButton.addEventListener("click", () => {
                state.query = searchInput?.value || "";
                renderFromSelectedChips();
            });
        }

        // Set initial track fill
        const initPct = ((ratingInput.value - ratingInput.min) / (ratingInput.max - ratingInput.min)) * 100;
        ratingInput.style.setProperty("--val", initPct + "%");

        renderFromSelectedChips();

        return {
            reset(newMovies) {
                currentMovies = newMovies;
                state.selectedGenres = [];
                state.sortMode = "latest";
                state.minRating = Number(ratingInput.min || 0);
                state.query = "";
                chips.forEach((chip) => chip.classList.remove("active"));
                sortButtons.forEach((btn, i) => btn.classList.toggle("active", i === 0));
                ratingInput.value = ratingInput.min;
                ratingInput.style.setProperty("--val", "0%");
                ratingValue.textContent = Number(ratingInput.min).toFixed(1);
                if (searchInput) {
                    searchInput.value = "";
                }
                renderFromSelectedChips();
            }
        };
    }

    function renderCarouselTrailers(movies) {
        const carousel = document.getElementById("heroCarousel");
        if (!carousel) {
            return;
        }

        const indicators = carousel.querySelector(".carousel-indicators");
        const inner = carousel.querySelector(".carousel-inner");
        if (!indicators || !inner) {
            return;
        }

        const userCountryCode = getUserCountryCode();
        const moviesWithTrailers = movies.filter((movie) => trailerToEmbedUrl(movie.trailer));

        let trailerMovies = moviesWithTrailers
            .filter((movie) => isAvailableInCountry(movie, userCountryCode))
            .slice(0, 6);

        // Fallback so carousel still renders when no country-matched trailers exist.
        if (trailerMovies.length === 0) {
            trailerMovies = moviesWithTrailers.slice(0, 6);
        }

        if (trailerMovies.length === 0) {
            return;
        }

        indicators.innerHTML = "";
        inner.innerHTML = "";

        trailerMovies.forEach((movie, index) => {
            const isActive = index === 0 ? "active" : "";
            const embedUrl = trailerToEmbedUrl(movie.trailer);
            const description = movie.description || "No description available.";
            const genres = Array.isArray(movie.genres) && movie.genres.length > 0
                ? movie.genres.join("/")
                : "Movie";

            const indicator = document.createElement("button");
            indicator.type = "button";
            indicator.setAttribute("data-bs-target", "#heroCarousel");
            indicator.setAttribute("data-bs-slide-to", String(index));
            indicator.setAttribute("aria-label", `Slide ${index + 1}`);
            if (index === 0) {
                indicator.classList.add("active");
                indicator.setAttribute("aria-current", "true");
            }
            indicators.appendChild(indicator);

            const item = document.createElement("div");
            item.className = `carousel-item ${isActive}`.trim();
            item.setAttribute("data-bs-interval", "8000");
            item.innerHTML = `
                <div class="trailer-container">
                    <iframe
                        class="trailer trailer-frame"
                        src="${embedUrl}"
                        title="${getTitle(movie)} trailer"
                        loading="lazy"
                        allow="autoplay; encrypted-media; picture-in-picture"
                        allowfullscreen>
                    </iframe>
                    <div class="info">
                        <div class="duration">Duration: ${formatRuntime(movie.runtimeMinutes)}</div>
                        <div class="rating">${formatRating(movie)} ${genres}</div>
                        <h1 class="title">${getTitle(movie)}</h1>
                        <p class="description">${description}</p>
                        <div class="actions">
                            <button class="btn watch" type="button">WATCH</button>
                            <button class="btn add-list" type="button">ADD LIST</button>
                        </div>
                    </div>
                </div>
            `;
            inner.appendChild(item);
        });

        if (window.bootstrap && window.bootstrap.Carousel) {
            const instance = window.bootstrap.Carousel.getOrCreateInstance(carousel, {
                interval: 7000,
                ride: false,
                pause: "hover",
                wrap: true,
                touch: true
            });
            instance.cycle();
        }
    }

    function renderWatchlistCards(movies) {
        const firstGrid = document.querySelector(".watchlistMovie-container .container-fluid");
        if (!firstGrid) {
            return;
        }

        firstGrid.innerHTML = "";

        movies.forEach((movie) => {
            const col = document.createElement("div");
            col.className = "card";
            const watchUrl = getWatchUrl(movie);
            const watchAttributes = watchUrl === "#"
                ? 'href="#"'
                : `href="${watchUrl}" target="_blank" rel="noopener noreferrer"`;

            col.innerHTML = `
                <img src="${getPoster(movie)}" class="card-img-top" alt="${getTitle(movie)} poster" loading="lazy">
                <div class="card-body">
                    <h5 class="card-title">${getTitle(movie)}</h5>
                    <p class="card-text">${formatMeta(movie)} | Rating ${formatRating(movie)}</p>
                    <a ${watchAttributes} class="btn btn-primary">Watch</a>
                </div>
            `;

            firstGrid.appendChild(col);
        });

        applyPosterFallbacks(firstGrid);
    }

    function bindMoviesTabSwitcher(initialMovies, movieFilters) {
        const tabs = Array.from(document.querySelectorAll(".movies-block .topline-links .topline-link"));
        const container = document.getElementById("movieCards");
        const heading = document.getElementById("moviesSectionTitle");
        if (tabs.length === 0 || !movieFilters) {
            return;
        }

        const tabLabels = { movies: "Movies", series: "Series", originals: "Original Series" };
        const dataCache = { movies: initialMovies, series: null, originals: null };

        const updateHeading = (tabKey) => {
            if (!heading) {
                return;
            }
            heading.innerHTML = `<i class="fa fa-film" aria-hidden="true"></i> ${tabLabels[tabKey] || "Movies"}`;
        };

        tabs.forEach((tab) => {
            tab.addEventListener("click", async () => {
                if (tab.classList.contains("active")) {
                    return;
                }

                tabs.forEach((t) => t.classList.remove("active"));
                tab.classList.add("active");

                const tabKey = tab.dataset.tab;
                updateHeading(tabKey);

                if (tabKey === "movies") {
                    movieFilters.reset(dataCache.movies);
                    return;
                }

                if (container) {
                    container.innerHTML = "<p style=\"color:var(--text-secondary);padding:20px 0;text-align:center;\">Loading...</p>";
                }

                try {
                    if (!dataCache[tabKey]) {
                        dataCache[tabKey] = await fetchTvShows(tabKey);
                    }
                    movieFilters.reset(dataCache[tabKey]);
                } catch (err) {
                    console.error("Failed to load tab data:", err);
                    if (container) {
                        container.innerHTML = "<p style=\"color:var(--text-secondary);padding:20px 0;text-align:center;\">Failed to load content. Please try again.</p>";
                    }
                }
            });
        });
    }

    async function loadMovies() {
        try {
            const movies = await fetchTop250();
            const recommendedMovies = movies.slice(HOME_MOVIE_LIMIT, HOME_MOVIE_LIMIT + 6);
            const watchlistMovies = movies.slice(0, 8);

            renderCarouselTrailers(movies);
            bindTrendGenreFilters(movies);
            bindNewReleasesFilters(movies);
            const movieFilters = bindMovieGenreFilters(movies);
            bindMoviesTabSwitcher(movies, movieFilters);
            bindFeaturedPlayerControls();
            renderPosterRow("recommendedCards", recommendedMovies);
            renderWatchlistCards(watchlistMovies);
        } catch (error) {
            console.error("Failed to load IMDb Top 250:", error);
        }
    }

    document.addEventListener("DOMContentLoaded", loadMovies);
})();
