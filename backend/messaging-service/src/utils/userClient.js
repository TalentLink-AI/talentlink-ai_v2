const axios = require("axios");

let cachedToken = null;
let tokenExp = 0;

async function getMgmtToken() {
  const now = Math.floor(Date.now() / 1000);

  if (cachedToken && tokenExp - now > 60) {
    // ≥1 min left
    return cachedToken;
  }

  const res = await axios.post(
    `https://${process.env.AUTH0_DOMAIN}/oauth/token`,
    {
      grant_type: "client_credentials",
      client_id: process.env.AUTH0_CLIENT_ID,
      client_secret: process.env.AUTH0_CLIENT_SECRET,
      audience: `https://${process.env.AUTH0_DOMAIN}/api/v2/`,
    }
  );

  cachedToken = res.data.access_token;
  tokenExp = now + res.data.expires_in; // seconds
  return cachedToken;
}

exports.getUserByAuth0Id = async function (auth0Id) {
  if (!auth0Id) return null;

  try {
    const token = await getMgmtToken();
    const { data } = await axios.get(
      `https://${process.env.AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(
        auth0Id
      )}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    return {
      _id: data.user_id,
      full_name: data.name || data.nickname || "Unknown",
      profile_image: data.picture || null,
      is_online: false, // you’ll fill this later via presence
    };
  } catch (err) {
    console.error(
      `userClient: failed to fetch ${auth0Id}`,
      err.response?.status
    );
    return null; // don’t throw – prevents 500
  }
};
