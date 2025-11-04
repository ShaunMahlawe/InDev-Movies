const OMDB_API_KEY = "eff87fbd"; 
const TMDB_API_KEY = "c97e398489baf8de66c1eed18a4bd174";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const DEFAULT_VIDEO_URL = "https://www.w3schools.com/html/mov_bbb.mp4";
const DEFAULT_MOVIE_INFO = {
  id: "tt3896198",
  title: "Guardians of the Galaxy Vol. 2",
  image: "https://m.media-amazon.com/images/M/MV5BMjQyNjkxNjUyNF5BMl5BanBnXkFtZTgwNDQ2NDYyMTI@._V1_SX300.jpg"
};

const movieTitleEl = document.querySelector(".movie-title");
const moviePosterEl = document.querySelector(".movie-poster");
const moviePlayer = document.getElementById("moviePlayer");
const sidebarList = document.querySelector(".cbox-content ul");
const feedback = document.getElementById("player-feedback");
const trailerOverlay = document.getElementById("trailer-overlay");
const trailerVideo = document.getElementById("trailerVideo");

function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

function showFeedback(icon, position = "center") {
  if (!feedback) return;
  feedback.textContent = icon;
  feedback.classList.remove("center", "left", "right", "show");
  feedback.classList.add(position);
  void feedback.offsetWidth;
  feedback.classList.add("show");
  setTimeout(() => feedback.classList.remove("show"), 600);
}

let lastTime = 0;
moviePlayer.addEventListener("play", () => showFeedback("▶️"));
moviePlayer.addEventListener("pause", () => showFeedback("⏸️"));
moviePlayer.addEventListener("volumechange", () => {
  showFeedback(moviePlayer.muted || moviePlayer.volume === 0 ? "🔇" : "🔊");
});
moviePlayer.addEventListener("timeupdate", () => {
  const diff = moviePlayer.currentTime - lastTime;
  if (Math.abs(diff) >= 2) showFeedback(diff > 0 ? "⏩" : "⏪", diff > 0 ? "right" : "left");
  lastTime = moviePlayer.currentTime;
});

function hideTrailer() {
  trailerOverlay.style.display = "none";
}
trailerOverlay.addEventListener("click", hideTrailer);
trailerVideo.addEventListener("ended", hideTrailer);

async function getTrailerMP4(imdbID) {
  try {
    const tmdbResp = await fetch(`${TMDB_BASE_URL}/find/${imdbID}?api_key=${TMDB_API_KEY}&external_source=imdb_id`);
    const tmdbData = await tmdbResp.json();
    const movie = tmdbData.movie_results[0];
    if (!movie) return DEFAULT_VIDEO_URL;

    const videosResp = await fetch(`${TMDB_BASE_URL}/movie/${movie.id}/videos?api_key=${TMDB_API_KEY}`);
    const videosData = await videosResp.json();

    return DEFAULT_VIDEO_URL;
  } catch (err) {
    console.error(err);
    return DEFAULT_VIDEO_URL;
  }
}

async function loadMovieDetails(imdbID, fallbackInfo = null) {
  try {
    if (fallbackInfo) {
      movieTitleEl.textContent = fallbackInfo.title;
      moviePosterEl.src = fallbackInfo.image;
    }

    const resp = await fetch(`https://www.omdbapi.com/?i=${imdbID}&plot=full&apikey=${OMDB_API_KEY}`);
    const data = await resp.json();

    movieTitleEl.textContent = data.Title || "Unknown";
    moviePosterEl.src = data.Poster !== "N/A" ? data.Poster : "../media/sample-poster.jpg";

    const trailerUrl = await getTrailerMP4(imdbID);

    const source = moviePlayer.querySelector("source");
    source.src = trailerUrl;
    moviePlayer.load();
    moviePlayer.play().catch(()=>{});

    const trailerSource = trailerVideo.querySelector("source");
    trailerSource.src = trailerUrl;
    trailerVideo.load();
    trailerOverlay.style.display = "flex";
    trailerVideo.play().catch(()=>{});

  
    document.getElementById("info-release").textContent = data.Released || "N/A";
    document.getElementById("info-genre").textContent = data.Genre || "N/A";
    document.getElementById("info-rating").textContent = data.imdbRating || "N/A";
    document.getElementById("info-plot").textContent = data.Plot || "N/A";
  } catch (err) {
    console.error(err);
    movieTitleEl.textContent = "Unable to load movie details.";
  }
}

const topMoviesSets = {
  today: [
    { id: "tt3896198", title: "Guardians of the Galaxy Vol. 2", image: "https://m.media-amazon.com/images/M/MV5BMjQyNjkxNjUyNF5BMl5BanBnXkFtZTgwNDQ2NDYyMTI@._V1_SX300.jpg" },
    { id: "tt4154796", title: "Avengers: Endgame", image: "https://m.media-amazon.com/images/M/MV5BMTc5OTM1NDk1Nl5BMl5BanBnXkFtZTgwODk5OTk1NzM@._V1_SX300.jpg" },
    { id: "tt1877830", title: "The Batman", image: "https://m.media-amazon.com/images/M/MV5BMGFiMTdjNTYtYzRkZi00MTgyLWI3ZTItZDNhMWRiNmFmNjUwXkEyXkFqcGc@._V1_SX300.jpg" },
  ],
  week: [
    { id: "tt4154756", title: "Avengers: Infinity War", image: "https://m.media-amazon.com/images/M/MV5BMjMxNjY2MDU3NF5BMl5BanBnXkFtZTgwODE4NjYyNTM@._V1_SX300.jpg" },
    { id: "tt4912910", title: "Mission: Impossible - Fallout", image: "https://m.media-amazon.com/images/M/MV5BMjQ3NDY1MTk1Ml5BMl5BanBnXkFtZTgwOTAxNDAzNTM@._V1_SX300.jpg" },
    { id: "tt7286456", title: "Joker", image: "https://m.media-amazon.com/images/M/MV5BMTk0ODI3MzYxNV5BMl5BanBnXkFtZTgwNzY5NzQ4NzM@._V1_SX300.jpg" },
  ],
  month: [
    { id: "tt0110912", title: "Pulp Fiction", image: "https://m.media-amazon.com/images/M/MV5BMTM0NzY4MDMwNl5BMl5BanBnXkFtZTcwNTM2NzQzMw@@._V1_SX300.jpg" },
    { id: "tt0137523", title: "Fight Club", image: "https://m.media-amazon.com/images/M/MV5BMmE3MjBjNTAtYmY0MC00NzljLThkODQtNjBiY2E5Y2VmMmJhXkEyXkFqcGdeQXVyNzkwMjQ5NzM@._V1_SX300.jpg" },
    { id: "tt0109830", title: "Forrest Gump", image: "https://m.media-amazon.com/images/M/MV5BNWIwODRlNzAtYWJkZi00ZDY3LTkxMWUtMTQ0MjNkNDAyZDM0XkEyXkFqcGdeQXVyNDYyMDk5MTU@._V1_SX300.jpg" },
  ]
};

function updateOverlay(movie) {
  movieTitleEl.textContent = movie.title;
  moviePosterEl.src = movie.image;
}

trailerOverlay.style.display = "flex"; 
trailerVideo.play().catch(()=>{});

document.getElementById("trailer-skip").addEventListener("click", hideTrailer);

const tabs = document.querySelectorAll(".anw-tabs .nav-link");

tabs.forEach(tab => {
  tab.addEventListener("click", (e) => {
    e.preventDefault();
    tabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");

    const setName = tab.textContent.toLowerCase();
    populateSidebar(topMoviesSets[setName] || topMoviesSets.today);
  });
});

function populateSidebar(movies) {
  sidebarList.innerHTML = "";

  movies.forEach(movie => {
    const li = document.createElement("li");
    li.classList.add("item-top");
    li.innerHTML = `
      <a href="?id=${movie.id}" class="top-movie-link" data-id="${movie.id}">
        <img src="${movie.image}" alt="${movie.title}" style="width:60px; height:90px; object-fit:cover; margin-right:8px; border-radius:4px;">
        <span style="color:#fff;">${movie.title}</span>
      </a>
    `;
    sidebarList.appendChild(li);
  });


  if (movies.length > 0) {
    updateOverlay(movies[0]);
    loadMovieDetails(movies[0].id, movies[0]);
  }
}

sidebarList.addEventListener("click", (e) => {
  const link = e.target.closest(".top-movie-link");
  if (!link) return;

  e.preventDefault();
  const id = link.dataset.id;
  const title = link.querySelector("span").textContent;
  const image = link.querySelector("img").src;

  updateOverlay({ title, image });
  loadMovieDetails(id, { title, image });
  history.pushState(null, "", "?id=" + id);
});

document.addEventListener("DOMContentLoaded", () => {
  const imdbID = getQueryParam("id");
  if (imdbID) {
    loadMovieDetails(imdbID);
  } else {
    populateSidebar(topMoviesSets.today);
  }
});
