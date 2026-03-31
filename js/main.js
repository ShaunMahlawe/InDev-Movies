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
	const FALLBACK_POSTER = '../omassets/Logo.png';
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
		const token = window.TMDB_BEARER_TOKEN || '';
		if (!token) return null;
		return {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json'
		};
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
			this.loadWatchlist();
			this.setupEventListeners();
			this.updateStats();
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
	const apiKey = window.OMDB_API_KEY || '';
	fetch(`https://api.themoviedb.org/3/trending/all/week?api_key=${apiKey}`)
		.then(response => response.json())
		.then(data => {
			if (data.results) {
				allMoviesData = data.results;
				displayAllMovies(allMoviesData);
			}
		})
		.catch(error => console.error('Error fetching trending:', error));
}

function loadAllSeries() {
	const apiKey = window.OMDB_API_KEY || '';
	fetch(`https://api.themoviedb.org/3/trending/tv/week?api_key=${apiKey}`)
		.then(response => response.json())
		.then(data => {
			if (data.results) {
				allMoviesData = data.results;
				displayAllMovies(allMoviesData);
			}
		})
		.catch(error => console.error('Error fetching series:', error));
}

function loadOriginals() {
	// For demo, treat 'originals' as Netflix originals (or similar)
	const apiKey = window.OMDB_API_KEY || '';
	fetch(`https://api.themoviedb.org/3/discover/tv?with_networks=213&api_key=${apiKey}`)
		.then(response => response.json())
		.then(data => {
			if (data.results) {
				allMoviesData = data.results;
				displayAllMovies(allMoviesData);
			}
		})
		.catch(error => console.error('Error fetching originals:', error));
}

function loadNewReleases() {
	const apiKey = window.OMDB_API_KEY || '';
	fetch(`https://api.themoviedb.org/3/movie/now_playing?api_key=${apiKey}`)
		.then(response => response.json())
		.then(data => {
			if (data.results) {
				allMoviesData = data.results;
				displayAllMovies(allMoviesData);
			}
		})
		.catch(error => console.error('Error fetching new releases:', error));
}

// Load all movies from API
function loadAllMovies() {
	const apiKey = window.OMDB_API_KEY || '';
	// Fetch popular movies - using multiple queries to get comprehensive data
	const queries = ['action', 'drama', 'comedy', 'thriller', 'adventure', 'animation', 'sci-fi', 'horror'];
	let allMovies = [];
	let completedRequests = 0;

	queries.forEach(query => {
		fetch(`https://www.omdbapi.com/?s=${query}&type=movie&apikey=${apiKey}`)
			.then(response => response.json())
			.then(data => {
				if (data.Search) {
					allMovies = allMovies.concat(data.Search);
				}
				completedRequests++;

				if (completedRequests === queries.length) {
					// Remove duplicates
					allMoviesData = Array.from(new Map(allMovies.map(m => [m.imdbID, m])).values());
					displayAllMovies(allMoviesData);
				}
			})
			.catch(error => {
				console.error('Error fetching movies:', error);
				completedRequests++;
			});
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
	const apiKey = window.OMDB_API_KEY || '';
	const featuredTitles = ['Oppenheimer', 'The Shawshank Redemption', 'Inception', 'Pulp Fiction', 'Parasite'];
	const randomTitle = featuredTitles[Math.floor(Math.random() * featuredTitles.length)];

	fetch(`https://www.omdbapi.com/?t=${randomTitle}&apikey=${apiKey}`)
		.then(response => response.json())
		.then(data => {
			if (data.imdbID) {
				updateFeaturedPlayer(data);
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
		featuredPlayer.style.backgroundImage = `url('${movie.Poster}')`;
	}
}

// Load recommended movies
function loadRecommendedMovies() {
	const apiKey = window.OMDB_API_KEY || '';
	const recommendedTitles = ['Dune', 'Avatar', 'The Dark Knight', 'Interstellar', 'Joker'];
	let recommendedMovies = [];
	let completed = 0;

	recommendedTitles.forEach(title => {
		fetch(`https://www.omdbapi.com/?t=${title}&apikey=${apiKey}`)
			.then(response => response.json())
			.then(data => {
				if (data.imdbID) {
					recommendedMovies.push(data);
				}
				completed++;

				if (completed === recommendedTitles.length) {
					displayRecommendedMovies(recommendedMovies);
				}
			})
			.catch(error => console.error('Error loading recommended:', error));
	});
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
	const apiKey = window.OMDB_API_KEY || '';
	fetch(`https://www.omdbapi.com/?s=${query}&type=movie&apikey=${apiKey}`)
		.then(response => response.json())
		.then(data => {
			if (data.Search) {
				allMoviesData = data.Search;
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
