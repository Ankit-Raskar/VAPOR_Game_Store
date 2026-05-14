const API_KEY = import.meta.env.VITE_RAWG_API_KEY;

const BASE_URL = "https://api.rawg.io/api";

export async function fetchTrendingGames() {
  const response = await fetch(
    `${BASE_URL}/games?key=${API_KEY}&ordering=-added&page_size=12`
  );

  return response.json();
}

export async function fetchNewGames() {
  const response = await fetch(
    `${BASE_URL}/games?key=${API_KEY}&ordering=-released&page_size=12`
  );

  return response.json();
}

export async function fetchUpcomingGames() {
  const response = await fetch(
    `${BASE_URL}/games?key=${API_KEY}&dates=2026-01-01,2027-01-01&ordering=released&page_size=12`
  );

  return response.json();
}