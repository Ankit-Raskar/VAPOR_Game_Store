# 🎮 VAPOR - Modern Game Store & Library

VAPOR is a fully functional, highly responsive, and beautifully designed digital game store and library (a modern clone of Steam). Built with React, Vite, and cutting-edge web technologies, it aggregates real-time data from the RAWG Video Games Database and integrates directly with the Official Steam API to display live pricing, discounts, and user reviews.

## ✨ Features

- **Live Storefront:** Discover Trending, Newly Released, and Upcoming games dynamically fetched from RAWG.
- **Steam Integration:** Real-time pricing, discounts, and "Very Positive / Mixed" Steam review scores fetched natively from the official Steam Store API.
- **Advanced Filtering:** Browse thousands of games with instant search, genre filtering, and smart price filtering (including native Free-to-Play tag detection).
- **Game Details:** Deep dive into individual games with screenshots, system requirements, descriptions, metacritic scores, and embedded YouTube trailers.
- **Personal Library:** Add and manage your favorite games in your own personal library collection.
- **Vercel Serverless Backend:** Bypasses browser CORS restrictions securely to communicate with Steam's API, utilizing an unbreakable smart fallback system for local development.

## 🚀 Tech Stack

- **Frontend Framework:** React 18 + Vite
- **Routing:** TanStack Router (Type-safe routing)
- **Data Fetching & Caching:** TanStack Query (React Query)
- **Styling:** Tailwind CSS + custom UI components
- **Backend/Proxy:** Vercel Serverless Functions (`api/steam.js`)
- **APIs Used:** RAWG API, Steam Store API, allorigins (local dev fallback)

## 🛠️ Local Development Setup

To run this project locally, you will need Node.js installed on your machine.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Ankit-Raskar/VAPOR_Game_Store.git
   cd VAPOR_Game_Store
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the root directory and add your RAWG API Key. You can get a free key from [rawg.io/apidocs](https://rawg.io/apidocs).
   ```env
   VITE_RAWG_API_KEY=your_rawg_api_key_here
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:5173`. 
   
   *Note: When running locally, the app will smartly bypass the Vercel serverless backend and use a proxy fallback to securely fetch Steam reviews and prices.*

## 🌐 Deployment

This project is optimized for deployment on **Vercel**. 
When deployed to Vercel, the `api/steam.js` serverless function automatically handles the Steam API proxying, ensuring blazing-fast, CORS-free access to Steam's live database.

1. Connect your GitHub repository to Vercel.
2. Ensure you add `VITE_RAWG_API_KEY` to your Vercel Environment Variables.
3. Deploy!

## 🐛 Known API Limits
- **RAWG API:** The free tier is limited to 20,000 requests per month. If the app stops loading games, you may have hit the rate limit and will need to generate a new API key.
- Unreleased games will gracefully display a "No reviews" and "—" price tag, as Steam does not provide data for unreleased titles.

---
*Disclaimer: This is a portfolio project and is not affiliated with Valve Corporation, Steam, or RAWG.*
