// --- Sidebar and Profile Menu (shared across pages) ---
function showSidebar() {
	const sidebar = document.querySelector('.sidebar');
	if (sidebar) sidebar.style.display = 'flex';
}

function hideSidebar() {
	const sidebar = document.querySelector('.sidebar');
	if (sidebar) sidebar.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', function () {
	const profileBadge = document.querySelector('.profile-badge');
	if (profileBadge) {
		profileBadge.addEventListener('click', function (event) {
			event.preventDefault();
			const profileMenu = document.querySelector('.profile-menu');
			if (profileMenu) profileMenu.classList.toggle('is-open');
		});
	}
});

// --- Movie Detail Page Logic ---
if (document.body.classList.contains('detail-page')) {
	// Only run on Movie Detail.html
	const DEFAULT_DETAIL_TITLE = 'Oppenheimer';
	const FALLBACK_POSTER = 'https://via.placeholder.com/500x750?text=Poster';
	const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w780';
	const TMDB_LOGO_BASE = 'https://image.tmdb.org/t/p/w185';

	function getQueryParams() {
		const params = new URLSearchParams(window.location.search);
		return {
			imdbId: params.get('id') || '',
			tmdbId: params.get('tmdbId') || '',
			title: params.get('title') || '',
			type: params.get('type') || ''
		};
	}

	function normalizeMediaType(type) {
		return type === 'series' || type === 'tv' ? 'tv' : 'movie';
	}

	function isImdbId(value) {
		return /^tt\d+$/.test(String(value || '').trim());
	}

	function getTmdbHeaders() {
		const token = String(window.TMDB_BEARER_TOKEN || '').trim();
		if (!token) return null;
		return {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json'
		};
	}

	function buildTmdbApiUrl(baseUrl) {
		const key = String(window.TMDB_API_KEY || '').trim();
		if (!key) return baseUrl;
		const separator = baseUrl.includes('?') ? '&' : '?';
		return `${baseUrl}${separator}api_key=${encodeURIComponent(key)}`;
	}

	function getTmdbRequestOptions() {
		const headers = getTmdbHeaders();
		return headers ? { method: 'GET', headers } : { method: 'GET' };
	}

	function escapeHtml(value) {
		return String(value || '').replace(/[&<>"']/g, function (character) {
			const entities = {
				'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
			};
			return entities[character] || character;
		});
	}

	function normalizeImage(url) {
		if (!url || url === 'N/A') return FALLBACK_POSTER;
		return url;
	}

	function createDetailUrl(options) {
		const detailUrl = new URL('./Movie Detail.html', window.location.href);
		if (options && options.imdbId) detailUrl.searchParams.set('id', options.imdbId);
		if (options && options.tmdbId) detailUrl.searchParams.set('tmdbId', options.tmdbId);
		else if (options && options.title) detailUrl.searchParams.set('title', options.title);
		if (options && options.type) detailUrl.searchParams.set('type', options.type);
		return detailUrl.toString();
	}

	function splitList(value, maxItems) {
		return String(value || '').split(',').map(item => item.trim()).filter(Boolean).slice(0, maxItems);
	}

	function makeMetaParts(movie) {
		const parts = [];
		if (movie.Year) parts.push(movie.Year);
		parts.push(movie.Type === 'series' ? 'TV Series' : 'Movie');
		if (movie.totalSeasons) parts.push(`${movie.totalSeasons} Seasons`);
		else if (movie.Runtime && movie.Runtime !== 'N/A') parts.push(movie.Runtime);
		return parts;
	}

	function countryCodeFromMovie(movie) {
		const firstCountry = splitList(movie.Country, 1)[0] || 'United States';
		const lookup = {
			'United States': 'US', 'United Kingdom': 'UK', 'South Korea': 'KR', 'Korea': 'KR',
			'Japan': 'JP', 'France': 'FR', 'Germany': 'DE', 'Spain': 'ES', 'India': 'IN',
			'Canada': 'CA', 'Australia': 'AU'
		};
		return lookup[firstCountry] || firstCountry.slice(0, 2).toUpperCase();
	}

	function setBackdropImages(primaryUrl, secondaryUrl) {
		const hero = document.getElementById('detailHero');
		const footerScene = document.getElementById('detailFooterScene');
		const backdrop = normalizeImage(primaryUrl || secondaryUrl);
		const scene = normalizeImage(secondaryUrl || primaryUrl);
		if (hero) hero.style.setProperty('--detail-backdrop', `url('${backdrop}')`);
		if (footerScene) footerScene.style.setProperty('--detail-scene', `url('${scene}')`);
	}

	function buildGalleryImages(movie, tmdbImages) {
		const galleryImages = [];
		if (tmdbImages && Array.isArray(tmdbImages.backdrops)) {
			tmdbImages.backdrops.slice(0, 9).forEach(image => {
				if (image.file_path) galleryImages.push(`${TMDB_IMAGE_BASE}${image.file_path}`);
			});
		}
		const poster = normalizeImage(movie.Poster);
		while (galleryImages.length < 9) {
			galleryImages.push(galleryImages[galleryImages.length % Math.max(galleryImages.length, 1)] || poster);
		}
		return galleryImages.slice(0, 9);
	}

	function renderProviders(providerData) {
		const providersContainer = document.getElementById('detailProviders');
		if (!providersContainer) return;
		providersContainer.innerHTML = '';
		const region = (navigator.language || 'en-US').split('-')[1] || 'US';
		const scoped = providerData && providerData.results ? (providerData.results[region] || providerData.results.US || Object.values(providerData.results)[0]) : null;
		const flatrate = scoped && Array.isArray(scoped.flatrate) ? scoped.flatrate.slice(0, 3) : [];
		if (flatrate.length === 0) {
			const chip = document.createElement('div');
			chip.className = 'provider-chip';
			chip.style.width = 'auto';
			chip.style.padding = '0 16px';
			chip.innerHTML = '<span>No provider data</span>';
			providersContainer.appendChild(chip);
			return;
		}
		flatrate.forEach(provider => {
			const chip = document.createElement('div');
			chip.className = 'provider-chip';
			chip.innerHTML = `<img src="${TMDB_LOGO_BASE}${provider.logo_path}" alt="${escapeHtml(provider.provider_name)}">`;
			providersContainer.appendChild(chip);
		});
	}

	function getQuote(movie, tmdbDetail) {
		if (tmdbDetail && tmdbDetail.tagline) return tmdbDetail.tagline;
		if (movie.Plot && movie.Plot !== 'N/A') {
			const sentence = movie.Plot.split('. ')[0] || movie.Plot;
			return sentence.endsWith('.') ? sentence : `${sentence}.`;
		}
		return '';
	}

	function saveToWatchlist(movie) {
		const current = JSON.parse(localStorage.getItem('watchlist') || '[]');
		const imdbId = isImdbId(movie.imdbID) ? movie.imdbID : '';
		const tmdbId = String(movie.tmdbID || '').trim();
		const watchlistKey = imdbId || (tmdbId ? `tmdb-${tmdbId}` : '');

		if (!watchlistKey) return;

		if (!current.find(entry => entry.imdbID === watchlistKey)) {
			current.push({
				imdbID: watchlistKey,
				tmdbID: tmdbId,
				Title: movie.Title,
				Year: movie.Year,
				Type: movie.Type,
				Poster: movie.Poster,
				imdbRating: movie.imdbRating,
				dateAdded: new Date().toISOString()
			});
			localStorage.setItem('watchlist', JSON.stringify(current));
		}
	}

	async function searchTmdbByTitle(title, mediaTypeHint) {
		if (!title) return null;

		const preferredType = normalizeMediaType(mediaTypeHint);
		const endpoints = preferredType === 'tv' ? ['tv', 'movie'] : ['movie', 'tv'];
		const options = getTmdbRequestOptions();

		for (const endpoint of endpoints) {
			const response = await fetch(
				buildTmdbApiUrl(`https://api.themoviedb.org/3/search/${endpoint}?query=${encodeURIComponent(title)}`),
				options
			);

			if (!response.ok) continue;

			const payload = await response.json();
			const match = Array.isArray(payload.results) ? payload.results[0] : null;
			if (match && match.id) return { id: match.id, type: endpoint };
		}

		return null;
	}

	function getTrailerUrlFromTmdbVideos(videosPayload, fallbackImdbId) {
		const videos = videosPayload && Array.isArray(videosPayload.results) ? videosPayload.results : [];
		const preferred = videos.find(video => {
			const site = String(video.site || '').toLowerCase();
			const type = String(video.type || '').toLowerCase();
			return site === 'youtube' && (type === 'trailer' || type === 'teaser') && video.key;
		}) || videos.find(video => String(video.site || '').toLowerCase() === 'youtube' && video.key);

		if (preferred && preferred.key) return `https://www.youtube.com/watch?v=${preferred.key}`;
		return fallbackImdbId ? `https://www.imdb.com/title/${fallbackImdbId}/` : '#';
	}

	async function fetchTmdbBundle(options) {
		let resolvedId = options && options.tmdbId ? String(options.tmdbId) : '';
		let resolvedType = normalizeMediaType(options && options.mediaTypeHint);
		const requestOptions = getTmdbRequestOptions();

		if (!resolvedId && options && options.imdbId && isImdbId(options.imdbId)) {
			const findResponse = await fetch(
				buildTmdbApiUrl(`https://api.themoviedb.org/3/find/${encodeURIComponent(options.imdbId)}?external_source=imdb_id`),
				requestOptions
			);

			if (findResponse.ok) {
				const findData = await findResponse.json();
				const movieResult = Array.isArray(findData.movie_results) ? findData.movie_results[0] : null;
				const tvResult = Array.isArray(findData.tv_results) ? findData.tv_results[0] : null;
				if (movieResult && movieResult.id) {
					resolvedId = String(movieResult.id);
					resolvedType = 'movie';
				} else if (tvResult && tvResult.id) {
					resolvedId = String(tvResult.id);
					resolvedType = 'tv';
				}
			}
		}

		if (!resolvedId && options && options.title) {
			const tmdbMatch = await searchTmdbByTitle(options.title, resolvedType);
			if (tmdbMatch) {
				resolvedId = String(tmdbMatch.id);
				resolvedType = tmdbMatch.type;
			}
		}

		if (!resolvedId) {
			return { detail: null, images: null, providers: null, videos: null, credits: null, externalIds: null, resolvedId: null, resolvedType };
		}

		const [detailResponse, imagesResponse, providersResponse, videosResponse, creditsResponse, externalIdsResponse] = await Promise.all([
			fetch(buildTmdbApiUrl(`https://api.themoviedb.org/3/${resolvedType}/${resolvedId}`), requestOptions),
			fetch(buildTmdbApiUrl(`https://api.themoviedb.org/3/${resolvedType}/${resolvedId}/images`), requestOptions),
			fetch(buildTmdbApiUrl(`https://api.themoviedb.org/3/${resolvedType}/${resolvedId}/watch/providers`), requestOptions),
			fetch(buildTmdbApiUrl(`https://api.themoviedb.org/3/${resolvedType}/${resolvedId}/videos`), requestOptions),
			fetch(buildTmdbApiUrl(`https://api.themoviedb.org/3/${resolvedType}/${resolvedId}/credits`), requestOptions),
			fetch(buildTmdbApiUrl(`https://api.themoviedb.org/3/${resolvedType}/${resolvedId}/external_ids`), requestOptions)
		]);

		return {
			detail: detailResponse.ok ? await detailResponse.json() : null,
			images: imagesResponse.ok ? await imagesResponse.json() : null,
			providers: providersResponse.ok ? await providersResponse.json() : null,
			videos: videosResponse.ok ? await videosResponse.json() : null,
			credits: creditsResponse.ok ? await creditsResponse.json() : null,
			externalIds: externalIdsResponse.ok ? await externalIdsResponse.json() : null,
			resolvedId,
			resolvedType
		};
	}

	function normalizeMovieFromTmdb(tmdbBundle, requestedTitle) {
		const detail = tmdbBundle.detail;
		if (!detail) return null;

		const releaseDate = detail.release_date || detail.first_air_date || '';
		const releaseYear = releaseDate ? releaseDate.slice(0, 4) : '';
		const spokenLanguages = Array.isArray(detail.spoken_languages)
			? detail.spoken_languages.map(item => item.english_name || item.name).filter(Boolean).join(', ')
			: '';
		const countries = Array.isArray(detail.production_countries)
			? detail.production_countries.map(item => item.name).filter(Boolean).join(', ')
			: '';
		const genres = Array.isArray(detail.genres)
			? detail.genres.map(item => item.name).filter(Boolean).join(', ')
			: '';
		const cast = tmdbBundle.credits && Array.isArray(tmdbBundle.credits.cast)
			? tmdbBundle.credits.cast.slice(0, 6).map(person => person.name).join(', ')
			: '';
		const directors = tmdbBundle.credits && Array.isArray(tmdbBundle.credits.crew)
			? tmdbBundle.credits.crew.filter(person => person.job === 'Director' || person.job === 'Series Director').map(person => person.name)
			: [];
		const creators = Array.isArray(detail.created_by) ? detail.created_by.map(person => person.name) : [];
		const runtime = detail.runtime ? `${detail.runtime} min` : 'N/A';
		const posterPath = detail.poster_path ? `${TMDB_IMAGE_BASE}${detail.poster_path}` : FALLBACK_POSTER;

		return {
			imdbID: tmdbBundle.externalIds && tmdbBundle.externalIds.imdb_id ? tmdbBundle.externalIds.imdb_id : `tmdb-${tmdbBundle.resolvedId}`,
			tmdbID: String(tmdbBundle.resolvedId || ''),
			Title: detail.title || detail.name || requestedTitle || 'Untitled',
			Year: releaseYear,
			Type: tmdbBundle.resolvedType === 'tv' ? 'series' : 'movie',
			totalSeasons: detail.number_of_seasons || '',
			Runtime: runtime,
			Language: spokenLanguages || 'N/A',
			Country: countries || 'N/A',
			Genre: genres || 'N/A',
			Plot: detail.overview || 'No synopsis is available for this title.',
			imdbRating: Number(detail.vote_average || 0).toFixed(1),
			Actors: cast || 'Unavailable',
			Director: directors.length > 0 ? directors.join(', ') : (creators.length > 0 ? creators.join(', ') : 'Unavailable'),
			Poster: posterPath
		};
	}

	function renderMovie(movie, tmdbBundle) {
		const wrap = document.getElementById('detailWrap');
		const loading = document.getElementById('detailLoading');
		movie.tmdbID = movie.tmdbID || String(tmdbBundle.resolvedId || '');

		const posterUrl = normalizeImage(movie.Poster);
		const tmdbBackdropPath = tmdbBundle.images && Array.isArray(tmdbBundle.images.backdrops) && tmdbBundle.images.backdrops[0]
			? `${TMDB_IMAGE_BASE}${tmdbBundle.images.backdrops[0].file_path}`
			: '';
		const tmdbScenePath = tmdbBundle.images && Array.isArray(tmdbBundle.images.backdrops) && tmdbBundle.images.backdrops[2]
			? `${TMDB_IMAGE_BASE}${tmdbBundle.images.backdrops[2].file_path}`
			: tmdbBackdropPath;
		const ratingValue = Number(movie.imdbRating);
		const rating = Number.isFinite(ratingValue) ? ratingValue.toFixed(1) : 'N/A';
		const progress = Number.isFinite(ratingValue) ? Math.max(0, Math.min(100, ratingValue * 10)) : 0;
		const genres = splitList(movie.Genre, 4);
		const cast = splitList(movie.Actors, 3).join('<br>') || 'Unavailable';
		const director = splitList(movie.Director, 2).join('<br>') || 'Unavailable';
		const trailerUrl = getTrailerUrlFromTmdbVideos(tmdbBundle.videos, movie.imdbID);

		document.title = `${movie.Title} | Movie Detail`;
		document.getElementById('detailPoster').src = posterUrl;
		document.getElementById('detailPoster').alt = `${movie.Title} poster`;
		document.getElementById('detailTitle').textContent = movie.Title;
		document.getElementById('detailMeta').innerHTML = makeMetaParts(movie).map(part => `<span>${escapeHtml(part)}</span>`).join('<span>|</span>');
		document.getElementById('detailLanguage').textContent = splitList(movie.Language, 1)[0] || 'Language N/A';
		document.getElementById('detailCountry').textContent = countryCodeFromMovie(movie);
		document.getElementById('detailRatingValue').textContent = rating;
		document.getElementById('detailRatingBadge').style.setProperty('--rating-progress', progress);
		document.getElementById('detailOverview').textContent = movie.Plot && movie.Plot !== 'N/A' ? movie.Plot : 'No synopsis is available for this title.';
		document.getElementById('detailDirector').innerHTML = director;
		document.getElementById('detailCast').innerHTML = cast;
		document.getElementById('detailQuote').textContent = getQuote(movie, tmdbBundle.detail);

		const watchLink = document.getElementById('detailWatchLink');
		watchLink.href = trailerUrl;

		const addListBtn = document.getElementById('detailAddListBtn');
		addListBtn.textContent = 'Add To My List';
		addListBtn.onclick = function () {
			saveToWatchlist(movie);
			addListBtn.textContent = 'Saved';
		};

		const genresContainer = document.getElementById('detailGenres');
		genresContainer.innerHTML = '';
		genres.forEach(genre => {
			const chip = document.createElement('span');
			chip.className = 'genre-pill';
			chip.textContent = genre;
			genresContainer.appendChild(chip);
		});

		const gallery = document.getElementById('detailGallery');
		gallery.innerHTML = '';
		buildGalleryImages(movie, tmdbBundle.images).forEach((imageUrl, index) => {
			const card = document.createElement('div');
			card.className = 'detail-gallery-card';
			card.innerHTML = `<img src="${imageUrl}" alt="${escapeHtml(movie.Title)} scene ${index + 1}" loading="lazy">`;
			gallery.appendChild(card);
		});

		renderProviders(tmdbBundle.providers);
		setBackdropImages(tmdbBackdropPath || posterUrl, tmdbScenePath || posterUrl);

		loading.hidden = true;
		wrap.hidden = false;
	}

	async function initDetailPage() {
		const errorNode = document.getElementById('detailError');
		const params = getQueryParams();

		try {
			const fallbackTitle = params.title || DEFAULT_DETAIL_TITLE;
			const tmdbBundle = await fetchTmdbBundle({
				imdbId: params.imdbId,
				tmdbId: params.tmdbId,
				title: fallbackTitle,
				mediaTypeHint: params.type
			});

			const movie = normalizeMovieFromTmdb(tmdbBundle, fallbackTitle);
			if (!movie) throw new Error('Movie lookup failed');

			renderMovie(movie, tmdbBundle);

			const resolvedDetailUrl = createDetailUrl({
				imdbId: isImdbId(movie.imdbID) ? movie.imdbID : '',
				tmdbId: tmdbBundle.resolvedId,
				title: movie.Title,
				type: movie.Type
			});

			document.querySelectorAll('a[href="../Pages/Movie Detail.html?title=Oppenheimer"], a[href="../Pages/Movie Detail.html"]').forEach(link => {
				link.href = resolvedDetailUrl;
			});
		} catch (_error) {
			document.getElementById('detailLoading').hidden = true;
			errorNode.hidden = false;
		}
	}

	initDetailPage();
}

// --- Watchlist Page Logic ---
if (document.getElementById('watchlistCards')) {
	class WatchlistManager {
		constructor() {
			this.watchlist = JSON.parse(localStorage.getItem('watchlist')) || [];
			this.currentFilter = 'all';
			this.currentSort = 'latest';
			this.currentGenreFilter = '';
			this.init();
		}
		getMovieDetailUrl(movie) {
			const detailUrl = new URL('./Movie Detail.html', window.location.href);
			if (/^tt\d+$/.test(String(movie.imdbID || '').trim())) detailUrl.searchParams.set('id', movie.imdbID);
			else if (movie.tmdbID) detailUrl.searchParams.set('tmdbId', movie.tmdbID);
			if (movie.Title) detailUrl.searchParams.set('title', movie.Title);
			if (movie.Type) detailUrl.searchParams.set('type', movie.Type);
			return detailUrl.toString();
		}
		attachCardRedirect(card, movie) {
			const redirect = () => { window.location.href = this.getMovieDetailUrl(movie); };
			card.setAttribute('role', 'link');
			card.setAttribute('tabindex', '0');
			card.addEventListener('click', redirect);
			card.addEventListener('keydown', (event) => {
				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault();
					redirect();
				}
			});
		}
		init() {
			this.loadTrailerCarousel();
			this.loadWatchlist();
			this.setupEventListeners();
			this.updateStats();
		}
		buildYouTubeEmbedUrl(videoKey) {
			if (!videoKey) return '';
			return `https://www.youtube.com/embed/${videoKey}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoKey}&rel=0&modestbranding=1&cc_load_policy=0&cc_lang_pref=en&iv_load_policy=3&fs=0&disablekb=1`;
		}
		async resolveTmdbId(movie) {
			const explicitTmdbId = String(movie.tmdbID || '').trim();
			if (explicitTmdbId && /^\d+$/.test(explicitTmdbId)) return explicitTmdbId;

			const fromPrefixedImdb = String(movie.imdbID || '').trim().match(/^tmdb-(\d+)$/);
			if (fromPrefixedImdb) return fromPrefixedImdb[1];

			const imdbId = String(movie.imdbID || '').trim();
			if (!/^tt\d+$/.test(imdbId)) return '';

			const options = getTmdbRequestConfig();
			const response = await fetch(
				buildTmdbUrl(`https://api.themoviedb.org/3/find/${encodeURIComponent(imdbId)}?external_source=imdb_id`),
				{ method: 'GET', headers: options.headers || undefined }
			);
			if (!response.ok) return '';

			const payload = await response.json();
			const movieMatch = Array.isArray(payload.movie_results) ? payload.movie_results[0] : null;
			const tvMatch = Array.isArray(payload.tv_results) ? payload.tv_results[0] : null;
			return String((movieMatch && movieMatch.id) || (tvMatch && tvMatch.id) || '');
		}
		async buildTrailerSlide(movie) {
			const tmdbId = await this.resolveTmdbId(movie);
			if (!tmdbId) return null;

			const mediaType = (String(movie.Type || '').toLowerCase() === 'series' || String(movie.Type || '').toLowerCase() === 'tv') ? 'tv' : 'movie';
			const options = getTmdbRequestConfig();
			const [detailResponse, videoResponse] = await Promise.all([
				fetch(buildTmdbUrl(`https://api.themoviedb.org/3/${mediaType}/${tmdbId}`), { method: 'GET', headers: options.headers || undefined }),
				fetch(buildTmdbUrl(`https://api.themoviedb.org/3/${mediaType}/${tmdbId}/videos`), { method: 'GET', headers: options.headers || undefined })
			]);

			if (!videoResponse.ok) return null;

			const detail = detailResponse.ok ? await detailResponse.json() : null;
			const videoPayload = await videoResponse.json();
			const videos = Array.isArray(videoPayload.results) ? videoPayload.results : [];
			const trailer = videos.find(video => {
				const site = String(video.site || '').toLowerCase();
				const type = String(video.type || '').toLowerCase();
				return site === 'youtube' && (type === 'trailer' || type === 'teaser') && video.key;
			}) || videos.find(video => String(video.site || '').toLowerCase() === 'youtube' && video.key);

			if (!trailer || !trailer.key) return null;

			const fallbackBackdrop = movie.Poster && movie.Poster !== 'N/A'
				? movie.Poster
				: 'https://via.placeholder.com/1600x900?text=Trailer';

			return {
				movie,
				title: (detail && (detail.title || detail.name)) || movie.Title || 'Untitled',
				overview: (detail && detail.overview) || 'Trailer from your watchlist.',
				rating: (detail && Number(detail.vote_average)) || Number(movie.imdbRating || 0),
				backdrop: detail && detail.backdrop_path ? `https://image.tmdb.org/t/p/original${detail.backdrop_path}` : fallbackBackdrop,
				embedUrl: this.buildYouTubeEmbedUrl(trailer.key)
			};
		}
		async loadTrailerCarousel() {
			const carousel = document.getElementById('watchlistTrailerCarousel');
			const inner = document.getElementById('watchlistTrailerInner');
			const indicators = document.getElementById('watchlistTrailerIndicators');
			if (!carousel || !inner || !indicators) return;

			if (!Array.isArray(this.watchlist) || this.watchlist.length === 0) {
				carousel.hidden = true;
				return;
			}

			const candidates = this.watchlist.slice(0, 12);
			const slides = [];
			for (const item of candidates) {
				try {
					const slide = await this.buildTrailerSlide(item);
					if (slide) slides.push(slide);
					if (slides.length >= 5) break;
				} catch (_error) {
					// Skip invalid trailer candidates.
				}
			}

			if (slides.length === 0) {
				carousel.hidden = true;
				return;
			}

			inner.innerHTML = '';
			indicators.innerHTML = '';
			slides.forEach((slide, index) => {
				const isActive = index === 0 ? 'active' : '';
				const ratingText = Number.isFinite(slide.rating) && slide.rating > 0 ? slide.rating.toFixed(1) : 'N/A';
				const escapedTitle = String(slide.title || '').replace(/"/g, '&quot;');
				const truncated = String(slide.overview || '').slice(0, 190);

				const indicator = document.createElement('button');
				indicator.type = 'button';
				indicator.setAttribute('data-bs-target', '#watchlistTrailerCarousel');
				indicator.setAttribute('data-bs-slide-to', String(index));
				indicator.setAttribute('aria-label', `Slide ${index + 1}`);
				if (index === 0) {
					indicator.classList.add('active');
					indicator.setAttribute('aria-current', 'true');
				}
				indicators.appendChild(indicator);

				const item = document.createElement('div');
				item.className = `carousel-item ${isActive}`;
				item.innerHTML = `
					<div class="trailer-container" style="background-image:url('${slide.backdrop}'); background-size: cover; background-position: center;">
						<iframe class="trailer trailer-frame" src="${slide.embedUrl}" title="${escapedTitle} trailer" loading="lazy" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>
						<div class="info">
							<div class="rating">${ratingText} Watchlist Trailer</div>
							<h1 class="title">${slide.title}</h1>
							<p class="description">${truncated}</p>
							<div class="actions">
								<button class="btn watch" type="button" data-detail-url="${this.getMovieDetailUrl(slide.movie)}">DETAILS</button>
							</div>
						</div>
					</div>
				`;
				inner.appendChild(item);
			});

			inner.querySelectorAll('.btn.watch').forEach((btn) => {
				btn.addEventListener('click', (event) => {
					const url = event.currentTarget.getAttribute('data-detail-url');
					if (url) window.location.href = url;
				});
			});

			carousel.hidden = false;
			if (window.bootstrap && window.bootstrap.Carousel) {
				window.bootstrap.Carousel.getOrCreateInstance(carousel, {
					interval: 7000,
					ride: false,
					pause: 'hover',
					wrap: true,
					touch: true
				}).cycle();
			}
		}
		loadWatchlist() {
			const container = document.getElementById('watchlistCards');
			const emptyState = document.getElementById('emptyState');
			if (this.watchlist.length === 0) {
				if (emptyState) emptyState.style.display = 'block';
				if (container) container.innerHTML = '';
				return;
			}
			if (emptyState) emptyState.style.display = 'none';
			this.displayWatchlist();
		}
		displayWatchlist() {
			let filtered = [...this.watchlist];
			if (this.currentFilter !== 'all') filtered = filtered.filter(m => (m.Type || 'movie').toLowerCase() === this.currentFilter);
			if (this.currentGenreFilter) filtered = filtered.filter(m => (m.Title || '').toLowerCase().includes(this.currentGenreFilter.toLowerCase()));
			filtered.sort((a, b) => {
				switch (this.currentSort) {
					case 'az': return (a.Title || '').localeCompare(b.Title || '');
					case 'rating': return (parseFloat(b.imdbRating) || 0) - (parseFloat(a.imdbRating) || 0);
					case 'latest':
					default: return (new Date(b.dateAdded) || 0) - (new Date(a.dateAdded) || 0);
				}
			});
			const container = document.getElementById('watchlistCards');
			if (!container) return;
			container.innerHTML = '';
			filtered.forEach(movie => {
				const movieCard = document.createElement('div');
				movieCard.className = 'movie-card';
				movieCard.innerHTML = `
					<div class="movie-image">
						<img src="${movie.Poster !== 'N/A' ? movie.Poster : 'https://via.placeholder.com/220x330?text=No+Image'}" alt="${movie.Title}" loading="lazy">
					</div>
					<div class="movie-info">
						<h3 class="movie-title">${movie.Title}</h3>
						<p class="movie-meta">${movie.Year} • ${movie.Type || 'Movie'}</p>
						<div class="movie-actions">
							<button class="btn-watch" type="button" data-imdb-id="${movie.imdbID}">Watch</button>
							<button class="btn-add-list" type="button" data-imdb-id="${movie.imdbID}" aria-label="Remove from watchlist">
								<i class="fa fa-trash"></i>
							</button>
						</div>
					</div>
				`;
				this.attachCardRedirect(movieCard, movie);
				const watchButton = movieCard.querySelector('.btn-watch');
				if (watchButton) {
					watchButton.addEventListener('click', (e) => {
						e.preventDefault();
						e.stopPropagation();
						window.location.href = this.getMovieDetailUrl(movie);
					});
				}
				movieCard.querySelector('.btn-add-list').addEventListener('click', (e) => {
					e.preventDefault();
					e.stopPropagation();
					this.removeFromWatchlist(movie.imdbID);
				});
				container.appendChild(movieCard);
			});
		}
		addToWatchlist(movie) {
			if (!this.watchlist.find(m => m.imdbID === movie.imdbID)) {
				this.watchlist.push({ ...movie, dateAdded: new Date().toISOString() });
				this.saveWatchlist();
				this.loadWatchlist();
				this.updateStats();
			}
		}
		removeFromWatchlist(imdbID) {
			this.watchlist = this.watchlist.filter(m => m.imdbID !== imdbID);
			this.saveWatchlist();
			this.loadWatchlist();
			this.updateStats();
		}
		saveWatchlist() {
			localStorage.setItem('watchlist', JSON.stringify(this.watchlist));
		}
		updateStats() {
			const count = document.getElementById('watchlistCount');
			const movies = document.getElementById('watchlistMovies');
			const series = document.getElementById('watchlistSeries');
			if (count) count.textContent = this.watchlist.length;
			if (movies) movies.textContent = this.watchlist.filter(m => (m.Type || 'movie').toLowerCase() === 'movie').length;
			if (series) series.textContent = this.watchlist.filter(m => (m.Type || '').toLowerCase() === 'series').length;
		}
		setupEventListeners() {
			document.querySelectorAll('[data-filter]').forEach(btn => {
				btn.addEventListener('click', (e) => {
					document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
					btn.classList.add('active');
					this.currentFilter = btn.getAttribute('data-filter');
					this.loadWatchlist();
				});
			});
			document.querySelectorAll('.chip').forEach(chip => {
				chip.addEventListener('click', (e) => {
					document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
					chip.classList.add('active');
					this.currentGenreFilter = chip.getAttribute('data-genre');
					this.loadWatchlist();
				});
			});
			document.querySelectorAll('[data-sort]').forEach(btn => {
				btn.addEventListener('click', (e) => {
					document.querySelectorAll('[data-sort]').forEach(b => b.classList.remove('active'));
					btn.classList.add('active');
					this.currentSort = btn.getAttribute('data-sort');
					this.loadWatchlist();
				});
			});
			const searchInput = document.getElementById('watchlistSearchInput');
			const searchBtn = document.getElementById('watchlistSearchBtn');
			if (searchBtn) searchBtn.addEventListener('click', () => this.performSearch());
			if (searchInput) searchInput.addEventListener('keypress', (e) => {
				if (e.key === 'Enter') this.performSearch();
			});
		}
		performSearch() {
			const query = document.getElementById('watchlistSearchInput').value.toLowerCase();
			const container = document.getElementById('watchlistCards');
			if (!query) {
				this.loadWatchlist();
				return;
			}
			const filtered = this.watchlist.filter(m => (m.Title || '').toLowerCase().includes(query));
			container.innerHTML = '';
			if (filtered.length === 0) {
				container.innerHTML = '<div class="movie-empty-state"><h3>No results found</h3><p>Try searching with a different title</p></div>';
				return;
			}
			filtered.forEach(movie => {
				const movieCard = document.createElement('div');
				movieCard.className = 'movie-card';
				movieCard.innerHTML = `
					<div class="movie-image">
						<img src="${movie.Poster !== 'N/A' ? movie.Poster : 'https://via.placeholder.com/220x330?text=No+Image'}" alt="${movie.Title}" loading="lazy">
					</div>
					<div class="movie-info">
						<h3 class="movie-title">${movie.Title}</h3>
						<p class="movie-meta">${movie.Year} • ${movie.Type || 'Movie'}</p>
						<div class="movie-actions">
							<button class="btn-watch" type="button" data-imdb-id="${movie.imdbID}">Watch</button>
							<button class="btn-add-list" type="button" data-imdb-id="${movie.imdbID}" aria-label="Remove from watchlist">
								<i class="fa fa-trash"></i>
							</button>
						</div>
					</div>
				`;
				this.attachCardRedirect(movieCard, movie);
				const watchButton = movieCard.querySelector('.btn-watch');
				if (watchButton) {
					watchButton.addEventListener('click', (e) => {
						e.preventDefault();
						e.stopPropagation();
						window.location.href = this.getMovieDetailUrl(movie);
					});
				}
				movieCard.querySelector('.btn-add-list').addEventListener('click', (e) => {
					e.preventDefault();
					e.stopPropagation();
					this.removeFromWatchlist(movie.imdbID);
				});
				container.appendChild(movieCard);
			});
		}
	}
	// Initialize watchlist on page load
	document.addEventListener('DOMContentLoaded', function () {
		const watchlistManager = new WatchlistManager();
		window.addToWatchlist = (movie) => watchlistManager.addToWatchlist(movie);
	});
}
// Sidebar and profile menu logic
function showSidebar() {
	const sidebar = document.querySelector('.sidebar');
	sidebar.style.display = 'flex';
}

function hideSidebar() {
	const sidebar = document.querySelector('.sidebar');
	sidebar.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', function() {
	const profileBadge = document.querySelector('.profile-badge');
	if (profileBadge) {
		profileBadge.addEventListener('click', function(e) {
			e.preventDefault();
			document.querySelector('.profile-menu').classList.toggle('is-open');
		});
	}
});

// Library page state
let allMoviesData = [];
let currentGenreFilter = '';
let currentSortMethod = 'latest';
let currentRatingFilter = 0;
let currentTab = 'trending';
let rapidCatalogCache = null;
let featuredMovieKey = '';

const RAPID_TOP250_URL = 'https://imdb236.p.rapidapi.com/api/imdb/top250-movies';
const RAPID_HEADERS = {
	'Content-Type': 'application/json',
	'x-rapidapi-host': 'imdb236.p.rapidapi.com',
	'x-rapidapi-key': 'ecdd572f6fmsh055b23482742d2cp1af123jsn9b1d66941f6f'
};

function getMovieDetailUrl(movie) {
	const detailUrl = new URL('./Movie Detail.html', window.location.href);
	const imdbId = String(movie.imdbID || '').trim();
	const tmdbId = String(movie.tmdbID || movie.id || '').trim();

	if (/^tt\d+$/.test(imdbId)) {
		detailUrl.searchParams.set('id', imdbId);
	} else {
		if (tmdbId) {
			detailUrl.searchParams.set('tmdbId', tmdbId);
		}
	}

	if (movie.Title || movie.title) {
		detailUrl.searchParams.set('title', movie.Title || movie.title);
	}

	if (movie.Type || movie.type || movie.mediaType) {
		detailUrl.searchParams.set('type', movie.Type || movie.type || movie.mediaType);
	}

	return detailUrl.toString();
}

function saveMovieToWatchlist(movie) {
	const stored = JSON.parse(localStorage.getItem('watchlist') || '[]');
	const imdbId = String(movie.imdbID || '').trim();
	const tmdbId = String(movie.tmdbID || movie.id || '').trim();
	const watchlistKey = /^tt\d+$/.test(imdbId) ? imdbId : (tmdbId ? `tmdb-${tmdbId}` : '');

	if (!watchlistKey || stored.some((entry) => entry.imdbID === watchlistKey)) {
		return false;
	}

	stored.push({
		imdbID: watchlistKey,
		tmdbID: tmdbId,
		Title: movie.Title || movie.title || 'Untitled',
		Year: movie.Year || movie.year || '',
		Type: movie.Type || movie.type || movie.mediaType || 'movie',
		Poster: movie.Poster || movie.primaryImage || '',
		imdbRating: movie.imdbRating || movie.averageRating || '',
		dateAdded: new Date().toISOString()
	});

	localStorage.setItem('watchlist', JSON.stringify(stored));
	return true;
}

function attachCardRedirect(card, movie) {
	const redirect = () => {
		window.location.href = getMovieDetailUrl(movie);
	};

	card.setAttribute('role', 'link');
	card.setAttribute('tabindex', '0');
	card.addEventListener('click', redirect);
	card.addEventListener('keydown', (event) => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			redirect();
		}
	});
}

function getTmdbRequestConfig() {
	const bearer = String(window.TMDB_BEARER_TOKEN || '').trim();
	if (bearer) {
		return {
			headers: {
				Authorization: `Bearer ${bearer}`,
				'Content-Type': 'application/json'
			},
			query: ''
		};
	}

	const apiKey = String(window.TMDB_API_KEY || '').trim();
	return {
		headers: null,
		query: apiKey ? `api_key=${encodeURIComponent(apiKey)}` : ''
	};
}

function buildTmdbUrl(baseUrl) {
	const tmdbConfig = getTmdbRequestConfig();
	if (!tmdbConfig.query) {
		return baseUrl;
	}
	return `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${tmdbConfig.query}`;
}

function normalizeRapidMovie(movie) {
	const imdbId = String(movie.id || movie.imdbID || '').trim();
	const titleType = String(movie.titleType || movie.type || '').toLowerCase();
	const isSeries = titleType.includes('tv') || titleType.includes('series');
	const year = String(movie.startYear || movie.year || '').slice(0, 4);
	const rating = Number(movie.averageRating || movie.rating);

	return {
		imdbID: imdbId,
		Title: movie.primaryTitle || movie.title || 'Untitled',
		Year: year || 'N/A',
		Type: isSeries ? 'series' : 'movie',
		Poster: movie.primaryImage || movie.image || 'N/A',
		imdbRating: Number.isFinite(rating) ? rating.toFixed(1) : 'N/A',
		dateAdded: movie.releaseDate || ''
	};
}

function normalizeTmdbMovie(movie, forcedType) {
	const mediaType = forcedType || movie.media_type || (movie.first_air_date ? 'tv' : 'movie');
	const isSeries = mediaType === 'tv';
	const releaseDate = movie.release_date || movie.first_air_date || '';
	const rating = Number(movie.vote_average || 0);

	return {
		imdbID: `tmdb-${movie.id}`,
		tmdbID: String(movie.id || ''),
		Title: movie.title || movie.name || 'Untitled',
		Year: releaseDate ? releaseDate.slice(0, 4) : 'N/A',
		Type: isSeries ? 'series' : 'movie',
		Poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : 'N/A',
		imdbRating: Number.isFinite(rating) ? rating.toFixed(1) : 'N/A'
	};
}

async function fetchRapidCatalog() {
	const response = await fetch(RAPID_TOP250_URL, {
		method: 'GET',
		headers: RAPID_HEADERS
	});

	if (!response.ok) {
		throw new Error(`RapidAPI request failed (${response.status})`);
	}

	const payload = await response.json();
	if (!Array.isArray(payload)) {
		return [];
	}

	return payload.map(normalizeRapidMovie).filter(movie => movie.Title && movie.Title !== 'Untitled');
}

async function fetchTmdbFallbackCatalog() {
	const tmdbConfig = getTmdbRequestConfig();
	const requestOptions = { headers: tmdbConfig.headers || undefined };
	const [movieResponse, tvResponse] = await Promise.all([
		fetch(buildTmdbUrl('https://api.themoviedb.org/3/trending/movie/week?page=1'), requestOptions),
		fetch(buildTmdbUrl('https://api.themoviedb.org/3/trending/tv/week?page=1'), requestOptions)
	]);

	const moviePayload = movieResponse.ok ? await movieResponse.json() : { results: [] };
	const tvPayload = tvResponse.ok ? await tvResponse.json() : { results: [] };
	const movies = Array.isArray(moviePayload.results) ? moviePayload.results.map(item => normalizeTmdbMovie(item, 'movie')) : [];
	const series = Array.isArray(tvPayload.results) ? tvPayload.results.map(item => normalizeTmdbMovie(item, 'tv')) : [];

	return [...movies, ...series];
}

async function getCatalogMovies() {
	if (Array.isArray(rapidCatalogCache) && rapidCatalogCache.length > 0) {
		return rapidCatalogCache;
	}

	try {
		rapidCatalogCache = await fetchRapidCatalog();
		if (rapidCatalogCache.length > 0) {
			return rapidCatalogCache;
		}
	} catch (_error) {
		// Fall through to TMDB fallback.
	}

	rapidCatalogCache = await fetchTmdbFallbackCatalog();
	return rapidCatalogCache;
}

// Initialize library page with API calls
document.addEventListener('DOMContentLoaded', function() {
	loadTabContent('trending');
	loadFeaturedMovie();
	loadRecommendedMovies();
	setupEventListeners();
});

function loadTabContent(tab) {
	currentTab = tab;
	switch(tab) {
		case 'trending':
			loadTrendingNow();
			break;
		case 'movies':
			loadAllMovies();
			break;
		case 'series':
			loadAllSeries();
			break;
		case 'originals':
			loadOriginals();
			break;
		case 'new':
			loadNewReleases();
			break;
		default:
			loadAllMovies();
	}
}

function loadTrendingNow() {
	const tmdbConfig = getTmdbRequestConfig();
	fetch(buildTmdbUrl('https://api.themoviedb.org/3/trending/all/week'), {
		headers: tmdbConfig.headers || undefined
	})
		.then(response => response.json())
		.then(data => {
			if (data.results) {
				allMoviesData = data.results.map(item => normalizeTmdbMovie(item));
				displayAllMovies(allMoviesData);
			}
		})
		.catch(error => console.error('Error fetching trending:', error));
}

function loadAllSeries() {
	const tmdbConfig = getTmdbRequestConfig();
	fetch(buildTmdbUrl('https://api.themoviedb.org/3/trending/tv/week'), {
		headers: tmdbConfig.headers || undefined
	})
		.then(response => response.json())
		.then(data => {
			if (data.results) {
				allMoviesData = data.results.map(item => normalizeTmdbMovie(item, 'tv'));
				displayAllMovies(allMoviesData);
			}
		})
		.catch(error => console.error('Error fetching series:', error));
}

function loadOriginals() {
	// For demo, treat 'originals' as Netflix originals (or similar)
	const tmdbConfig = getTmdbRequestConfig();
	fetch(buildTmdbUrl('https://api.themoviedb.org/3/discover/tv?with_networks=213'), {
		headers: tmdbConfig.headers || undefined
	})
		.then(response => response.json())
		.then(data => {
			if (data.results) {
				allMoviesData = data.results.map(item => normalizeTmdbMovie(item, 'tv'));
				displayAllMovies(allMoviesData);
			}
		})
		.catch(error => console.error('Error fetching originals:', error));
}

function loadNewReleases() {
	const tmdbConfig = getTmdbRequestConfig();
	fetch(buildTmdbUrl('https://api.themoviedb.org/3/movie/now_playing'), {
		headers: tmdbConfig.headers || undefined
	})
		.then(response => response.json())
		.then(data => {
			if (data.results) {
				allMoviesData = data.results.map(item => normalizeTmdbMovie(item, 'movie'));
				displayAllMovies(allMoviesData);
			}
		})
		.catch(error => console.error('Error fetching new releases:', error));
}

// Load all movies from API
function loadAllMovies() {
	getCatalogMovies()
		.then((movies) => {
			allMoviesData = movies.filter(movie => movie.Type === 'movie');
			displayAllMovies(allMoviesData);
		})
		.catch(error => {
			console.error('Error fetching movies:', error);
			document.getElementById('libraryCards').innerHTML = '<div class="movie-empty-state"><h3>Movie load error</h3><p>Please try again later</p></div>';
		});
}

// Display movies in grid
function displayAllMovies(movies) {
	const container = document.getElementById('libraryCards');
	if (!container) return;

	let filteredMovies = movies;

	// Apply genre filter
	if (currentGenreFilter) {
		filteredMovies = filteredMovies.filter(m => {
			const genre = m.Title.toLowerCase() || '';
			return genre.includes(currentGenreFilter.toLowerCase());
		});
	}

	// Apply rating filter
	if (currentRatingFilter > 0) {
		filteredMovies = filteredMovies.filter(m => {
			const rating = parseFloat(m.imdbRating) || 0;
			return rating >= currentRatingFilter;
		});
	}

	// Apply sorting
	filteredMovies.sort((a, b) => {
		switch (currentSortMethod) {
			case 'az':
				return a.Title.localeCompare(b.Title);
			case 'year':
				return parseInt(b.Year) - parseInt(a.Year);
			case 'latest':
			default:
				return parseInt(b.Year) - parseInt(a.Year);
		}
	});

	// Clear container
	container.innerHTML = '';

	// Generate movie cards
	filteredMovies.slice(0, 50).forEach(movie => {
		const movieCard = document.createElement('div');
		movieCard.className = 'movie-card';
		movieCard.innerHTML = `
			<div class="movie-image">
				<img src="${movie.Poster !== 'N/A' ? movie.Poster : 'https://via.placeholder.com/220x330?text=No+Image'}" 
					 alt="${movie.Title}" loading="lazy">
			</div>
			<div class="movie-info">
				<h3 class="movie-title">${movie.Title}</h3>
				<p class="movie-meta">${movie.Year} • ${movie.Type}</p>
				<div class="movie-actions">
					<button class="btn-watch" type="button" data-imdb-id="${movie.imdbID}">Watch</button>
					<button class="btn-add-list" type="button" aria-label="Add to list">
						<i class="fa fa-plus"></i>
					</button>
				</div>
			</div>
		`;

		attachCardRedirect(movieCard, movie);

		const watchButton = movieCard.querySelector('.btn-watch');
		const addListButton = movieCard.querySelector('.btn-add-list');

		if (watchButton) {
			watchButton.addEventListener('click', (event) => {
				event.stopPropagation();
				window.location.href = getMovieDetailUrl(movie);
			});
		}

		if (addListButton) {
			addListButton.addEventListener('click', (event) => {
				event.stopPropagation();
				const saved = saveMovieToWatchlist(movie);
				addListButton.innerHTML = saved ? '<i class="fa fa-check"></i>' : '<i class="fa fa-heart"></i>';
			});
		}

		container.appendChild(movieCard);
	});
}

// Load featured movie
function loadFeaturedMovie() {
	getCatalogMovies()
		.then((movies) => {
			if (!movies.length) return;
			const ranked = [...movies].sort((a, b) => (parseFloat(b.imdbRating) || 0) - (parseFloat(a.imdbRating) || 0));
			const pick = ranked[Math.floor(Math.random() * Math.min(10, ranked.length))];
			if (pick) {
				featuredMovieKey = String(pick.imdbID || pick.tmdbID || '');
				updateFeaturedPlayer(pick);
			}
		})
		.catch(error => console.error('Error loading featured:', error));
}

// Update featured player
function updateFeaturedPlayer(movie) {
	document.getElementById('featuredTitle').textContent = movie.Title;
	document.getElementById('featuredWatching').textContent = `Rating: ${movie.imdbRating}/10`;
    
	const featuredPlayer = document.getElementById('featuredPlayer');
	if (featuredPlayer) {
		featuredPlayer.classList.remove('is-closed');
		const poster = movie.Poster && movie.Poster !== 'N/A' ? movie.Poster : 'https://via.placeholder.com/500x280?text=Featured';
		featuredPlayer.style.backgroundImage = `url('${poster}')`;
	}
}

// Load recommended movies
function loadRecommendedMovies() {
	getCatalogMovies()
		.then((movies) => {
			const filtered = movies.filter(movie => String(movie.imdbID || movie.tmdbID || '') !== featuredMovieKey);
			const recommended = [...filtered]
				.sort((a, b) => (parseFloat(b.imdbRating) || 0) - (parseFloat(a.imdbRating) || 0))
				.slice(0, 8);
			displayRecommendedMovies(recommended);
		})
		.catch(error => console.error('Error loading recommended:', error));
}

// Display recommended movies
function displayRecommendedMovies(movies) {
	const container = document.getElementById('recommendedCards');
	if (!container) return;

	container.innerHTML = '';

	movies.forEach(movie => {
		const card = document.createElement('div');
		card.className = 'poster-card';
		card.innerHTML = `
			<img class="poster-image" src="${movie.Poster !== 'N/A' ? movie.Poster : 'https://via.placeholder.com/180x270?text=No+Image'}" 
				 alt="${movie.Title}" loading="lazy">
			<div class="poster-info">
				<h3 class="poster-title">${movie.Title}</h3>
				<div class="poster-meta-row">
					<span class="poster-year">${movie.Year}</span>
					<div class="poster-actions">
						<span class="score">${movie.imdbRating || 'N/A'}</span>
					</div>
				</div>
			</div>
		`;

		attachCardRedirect(card, movie);
		container.appendChild(card);
	});
}

// Setup event listeners
function setupEventListeners() {
	// Handle tab buttons for category switching
	document.querySelectorAll('[data-tab]').forEach(btn => {
		btn.addEventListener('click', function() {
			document.querySelectorAll('.topline-link').forEach(b => b.classList.remove('active'));
			this.classList.add('active');
			loadTabContent(this.getAttribute('data-tab'));
		});
	});
	// Update rating filter display
	const ratingFilter = document.getElementById('libraryRatingFilter');
	if (ratingFilter) {
		ratingFilter.addEventListener('input', function() {
			currentRatingFilter = parseFloat(this.value);
			document.getElementById('libraryRatingValue').textContent = currentRatingFilter.toFixed(1);
			displayAllMovies(allMoviesData);
		});
	}

	// Handle genre filter clicks
	document.querySelectorAll('.filter-card').forEach(card => {
		card.addEventListener('click', function() {
			document.querySelectorAll('.filter-card').forEach(c => c.style.opacity = '0.6');
			this.style.opacity = '1';
			currentGenreFilter = this.getAttribute('data-genre');
			displayAllMovies(allMoviesData);
		});
	});

	document.querySelectorAll('.chip').forEach(chip => {
		chip.addEventListener('click', function() {
			document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
			this.classList.add('active');
			currentGenreFilter = this.getAttribute('data-genre');
			displayAllMovies(allMoviesData);
		});
	});

	// Handle sort buttons
	document.querySelectorAll('.mini-pill').forEach(btn => {
		btn.addEventListener('click', function() {
			document.querySelectorAll('.mini-pill').forEach(b => b.classList.remove('active'));
			this.classList.add('active');
			currentSortMethod = this.getAttribute('data-sort');
			displayAllMovies(allMoviesData);
		});
	});

	// Handle search
	const searchBtn = document.getElementById('librarySearchBtn');
	const searchInput = document.getElementById('librarySearchInput');
    
	if (searchBtn) {
		searchBtn.addEventListener('click', function() {
			const query = searchInput.value.trim();
			if (query) {
				searchMovies(query);
			}
		});
	}

	if (searchInput) {
		searchInput.addEventListener('keypress', function(e) {
			if (e.key === 'Enter') {
				const query = this.value.trim();
				if (query) {
					searchMovies(query);
				}
			}
		});
	}

	// Handle tab buttons
	document.querySelectorAll('[data-tab]').forEach(btn => {
		btn.addEventListener('click', function() {
			document.querySelectorAll('.topline-link').forEach(b => b.classList.remove('active'));
			this.classList.add('active');
		});
	});
}

// Search movies
function searchMovies(query) {
	getCatalogMovies()
		.then((movies) => {
			const normalizedQuery = String(query || '').toLowerCase().trim();
			allMoviesData = movies.filter(movie => String(movie.Title || '').toLowerCase().includes(normalizedQuery));
			if (allMoviesData.length > 0) {
				displayAllMovies(allMoviesData);
			} else {
				document.getElementById('libraryCards').innerHTML = '<div class="movie-empty-state"><h3>No movies found</h3><p>Try searching with a different title</p></div>';
			}
		})
		.catch(error => {
			console.error('Error searching:', error);
			document.getElementById('libraryCards').innerHTML = '<div class="movie-empty-state"><h3>Search error</h3><p>Please try again later</p></div>';
		});
}
