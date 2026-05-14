export default async function handler(req, res) {
  try {
    const appid = req.query.appid;

    const response = await fetch(
      `https://steam2.p.rapidapi.com/appReviews/${appid}/limit/20/*`,
      {
        headers: {
          "X-RapidAPI-Key": process.env.STEAM_API_KEY,
          "X-RapidAPI-Host": "steam2.p.rapidapi.com",
        },
      }
    );

    const data = await response.json();

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
}