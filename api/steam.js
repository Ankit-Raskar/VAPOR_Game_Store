export default async function handler(req, res) {
  try {
    const { appid, offers } = req.query;

    if (offers === 'true') {
      const response = await fetch("https://store.steampowered.com/api/featuredcategories?cc=us&l=en");
      const data = await response.json();
      return res.status(200).json(data);
    }

    if (appid) {
      const response = await fetch(
        `https://steam2.p.rapidapi.com/appReviews/${appid}/limit/20/*`,
        {
          headers: {
            "X-RapidAPI-Key": process.env.STEAM_API_KEY || "a7c8d6b50bmsha7ff17013912dadp14edd6jsnb207187ecff6",
            "X-RapidAPI-Host": "steam2.p.rapidapi.com",
          },
        }
      );

      const data = await response.json();
      return res.status(200).json(data);
    }

    res.status(400).json({ error: "Missing appid or offers parameter" });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
}