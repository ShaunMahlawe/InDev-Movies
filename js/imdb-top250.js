(function () {
    const API_URL = "https://imdb236.p.rapidapi.com/api/imdb/top250-movies";
    const FALLBACK_POSTER = "../omassets/Logo.png";
    const TMDB_TRENDING_URL = "https://api.themoviedb.org/3/trending/movie/week";
    const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";
    const TMDB_SITE_BASE = "https://www.themoviedb.org/movie";
    const TMDB_BEARER_TOKEN = "";
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
        10752: "War"
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
        return selected.slice(0, 14);
    }

    function getTrendMoviesByGenres(movies, genreLabels) {
        const normalizedGenres = Array.isArray(genreLabels)
            ? genreLabels.map((genre) => normalizeGenre(genre)).filter(Boolean)
            : [];

        if (normalizedGenres.length === 0) {
            return movies.slice(0, 14);
        }

        const preferred = movies.filter((movie) => {
            const genres = Array.isArray(movie.genres) ? movie.genres : [];
            return genres.some((genre) => normalizedGenres.includes(normalizeGenre(genre)));
        });

        const selected = preferred.length >= 6 ? preferred : movies;
        return selected.slice(0, 14);
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

            return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}&rel=0&modestbranding=1&iv_load_policy=3&fs=0&disablekb=1`;
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

    async function fetchTmdbTrailer(tmdbId, headers) {
        const response = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}/videos`, {
            method: "GET",
            headers
        });

        if (!response.ok) {
            return "";
        }

        const payload = await response.json();
        const videos = Array.isArray(payload.results) ? payload.results : [];
        const selected = videos.find((video) => {
            const isYouTube = String(video.site || "").toLowerCase() === "youtube";
            const isTrailer = String(video.type || "").toLowerCase() === "trailer";
            return isYouTube && isTrailer && video.key;
        }) || videos.find((video) => String(video.site || "").toLowerCase() === "youtube" && video.key);

        return selected?.key ? `https://www.youtube.com/watch?v=${selected.key}` : "";
    }

    async function fetchTopMoviesFromTmdb() {
        const headers = getTmdbAuthHeaders();
        if (!headers) {
            console.warn("TMDB fallback skipped: set window.TMDB_BEARER_TOKEN or TMDB_BEARER_TOKEN in js/imdb-top250.js");
            return [];
        }

        const response = await fetch(TMDB_TRENDING_URL, {
            method: "GET",
            headers
        });

        if (!response.ok) {
            throw new Error(`TMDB fallback request failed (${response.status})`);
        }

        const payload = await response.json();
        const results = Array.isArray(payload.results) ? payload.results.slice(0, 24) : [];

        const trailerTargets = results.slice(0, 6);
        const trailerPairs = await Promise.all(trailerTargets.map(async (movie) => {
            const trailer = await fetchTmdbTrailer(movie.id, headers);
            return [movie.id, trailer];
        }));
        const trailerMap = new Map(trailerPairs);

        return results.map((movie) => ({
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
            trailer: trailerMap.get(movie.id) || "",
            url: `${TMDB_SITE_BASE}/${movie.id}`
        }));
    }

    async function fetchTop250() {
        try {
            return await fetchTop250FromRapidApi();
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

    function renderHomeCards(movies) {
        const container = document.getElementById("movieCards");
        if (!container) {
            return;
        }

        container.innerHTML = "";

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

    function setupTrendRowControls() {
        const trendRow = document.getElementById("trendCards");
        const prevButton = document.getElementById("trendPrev");
        const nextButton = document.getElementById("trendNext");

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

    function bindTrendGenreFilters(movies) {
        const chips = Array.from(document.querySelectorAll(".trends-block .chip-row .chip"));
        if (chips.length === 0) {
            return;
        }

        const renderFromSelectedChips = () => {
            const selectedGenres = chips
                .filter((chip) => chip.classList.contains("active"))
                .map((chip) => chip.dataset.genre || chip.textContent || "");

            const trendMovies = getTrendMoviesByGenres(movies, selectedGenres);
            renderPosterRow("trendCards", trendMovies);
            setupTrendRowControls();
        };

        chips.forEach((chip) => {
            chip.addEventListener("click", () => {
                chip.classList.toggle("active");
                renderFromSelectedChips();
            });
        });

        renderFromSelectedChips();
    }

    function renderFeaturedPlayer(movie) {
        const featured = document.getElementById("featuredPlayer");
        const title = document.getElementById("featuredTitle");
        const runtime = document.getElementById("featuredRuntime");

        if (!featured || !movie) {
            return;
        }

        featured.style.backgroundImage = `url('${getPoster(movie)}')`;
        if (title) {
            title.textContent = `${getTitle(movie)} (${movie.startYear || "N/A"})`;
        }
        if (runtime) {
            runtime.textContent = formatRuntime(movie.runtimeMinutes);
        }
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

    async function loadMovies() {
        try {
            const movies = await fetchTop250();
            const homeMovies = movies.slice(0, 12);
            const recommendedMovies = movies.slice(12, 18);
            const watchlistMovies = movies.slice(0, 8);

            renderCarouselTrailers(movies);
            bindTrendGenreFilters(movies);
            renderHomeCards(homeMovies);
            renderFeaturedPlayer(movies[6]);
            renderPosterRow("recommendedCards", recommendedMovies);
            renderWatchlistCards(watchlistMovies);
        } catch (error) {
            console.error("Failed to load IMDb Top 250:", error);
        }
    }

    document.addEventListener("DOMContentLoaded", loadMovies);
})();
