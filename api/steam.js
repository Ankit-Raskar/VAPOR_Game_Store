export default async function handler(req, res) {
  try {
    const { appid, offers, type } = req.query;

    if (offers === 'true') {
      const response = await fetch("https://store.steampowered.com/api/featuredcategories?cc=us&l=en");
      const data = await response.json();
      return res.status(200).json(data);
    }

    if (appid) {
      if (type === 'price') {
        const response = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appid}&cc=us&l=en&filters=price_overview`);
        const data = await response.json();
        return res.status(200).json(data);
      } else {
        const response = await fetch(
          `https://store.steampowered.com/appreviews/${appid}?json=1&language=all&num_per_page=20`
        );
        const data = await response.json();
        return res.status(200).json(data);
      }
    }

    res.status(400).json({ error: "Missing appid or offers parameter" });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
}