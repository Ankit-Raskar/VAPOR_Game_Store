# 🎮 VAPOR - Modern Game Store & Library

VAPOR is a fully functional, highly responsive, and beautifully designed digital game store and library (a modern clone of Steam). Built with React, Vite, and cutting-edge web technologies, it aggregates real-time data from the RAWG Video Games Database and integrates directly with the Official Steam API to display live pricing, discounts, and user reviews.

## ✨ Key Features & Functionality

### 🏪 Live Storefront
- **Dynamic Content:** Discover Trending, Newly Released, and Upcoming games dynamically fetched from the RAWG database.
- **Hero Carousel:** An interactive, auto-playing carousel featuring top trending titles with high-quality background images.
- **Steam Integration:** Real-time pricing, discounts, and "Very Positive / Mixed" Steam review scores fetched natively from the official Steam Store API.

### 🔍 Advanced Search & Filtering (Game Library)
- **Instant Search:** Debounced searching allows users to find games instantly across the database.
- **Smart Price Filtering:** A custom-built pipeline filters games by price (e.g., "Under $10", "Free"). The "Free" filter natively queries the `free-to-play` database tags for instantaneous load times.
- **Genre & Ordering:** Filter by genre (Action, RPG, Indie, etc.) and sort by Popularity, Release Date, Rating, or Metacritic score.
- **Infinite Scrolling:** Seamlessly load more games as you scroll through the library.

### 🕹️ Deep Game Details
- **Dynamic Pages:** Each game has a dedicated, dynamic route (`/game/:slug`).
- **Media Galleries:** Embedded YouTube trailers and high-quality screenshot galleries.
- **System Requirements:** Dynamically displays PC system requirements.
- **Review Sentiments:** Detailed Recharts-powered graphs and visual breakdown of Positive vs. Negative Steam reviews.

### 📚 Personal Library Management
- **Add to Library:** Users can add games to their personal library collection using local storage persistence.
- **Interactive UI:** Smooth Framer Motion animations for adding/removing games and hovering over game cards.

## 🚀 Tech Stack & Architecture

### Frontend
- **React 18 & Vite:** Lightning-fast build times and modern React features.
- **TanStack Router:** Fully type-safe, declarative file-based routing.
- **TanStack Query (React Query):** Advanced server-state management, caching, and infinite loading pipelines.
- **Tailwind CSS:** Utility-first, highly responsive, and beautifully themed UI design.
- **Framer Motion:** Smooth micro-animations and page transitions.
- **Recharts:** For data visualization of Steam review metrics.
- **Zod:** For strict schema validation of search parameters.

### Backend Proxy (Vercel Serverless)
- **Node.js Serverless Functions (`api/steam.js`):** Acts as a secure, fast proxy between the frontend and the Official Steam API to bypass browser CORS restrictions.
- **Smart Fallback:** If the local development server is not running the Vercel backend, the frontend automatically falls back to an `allorigins` proxy to guarantee uninterrupted local development.

## 📁 Project Structure

```text
├── api/
│   └── steam.js            # Vercel Serverless API Proxy for Steam
├── src/
│   ├── components/         # Reusable UI components (GameCard, HeroCarousel, etc.)
│   ├── hooks/              # Custom React hooks (useAuth, useLocalStorage)
│   ├── lib/                # API fetchers, database logic, and utilities
│   ├── routes/             # TanStack Router page components (Store, Library, Game)
│   ├── index.css           # Global Tailwind and custom CSS variables
│   └── main.tsx            # Application entry point
├── vite.config.ts          # Vite configuration
└── tailwind.config.js      # Tailwind theme configuration
```

## 🛠️ Local Development Setup

To run this project locally, you will need Node.js (v18+) installed on your machine.

1. **Clone the repository:**
   ```bash
   git clone <your-repository-url>
   cd VAPOR_Game_Store
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the root directory. You will need a free RAWG API Key from [rawg.io/apidocs](https://rawg.io/apidocs).
   ```env
   VITE_RAWG_API_KEY=your_rawg_api_key_here
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:5173`. 
   
   *Note: When running locally with `npm run dev`, the app will smartly bypass the Vercel serverless backend and use a proxy fallback to securely fetch Steam reviews and prices.*

## 🌐 Deployment

This project is fully optimized for edge deployment on **Vercel**. 

When deployed to Vercel, the `api/steam.js` serverless function automatically provisions itself as a proxy handler. This ensures blazing-fast, CORS-free access to Steam's live database for reviews and pricing.

1. Push your code to your private GitHub repository.
2. Connect your repository to your Vercel Dashboard.
3. Add the `VITE_RAWG_API_KEY` to your Vercel Environment Variables under Settings.
4. Click **Deploy**.

## 🐛 API Rate Limits & Troubleshooting
- **RAWG API Limits:** The free tier of the RAWG API is limited to 20,000 requests per month. If the storefront sections (Trending, Upcoming) stop loading, you may have exhausted your API quota. Simply generate a new free key at RAWG and update your `.env` file.
- **Unreleased Games:** Unreleased titles will gracefully display a "No reviews" and "—" price tag, as Steam does not provide live transactional data for unreleased games.

---
*Disclaimer: This is an independent portfolio project and is not affiliated with, endorsed by, or sponsored by Valve Corporation, Steam, or RAWG.*
