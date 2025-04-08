// job-service/src/utils/auth0Client.js
const axios = require("axios");

const getAuth0AccessToken = async () => {
  const response = await axios.post(
    `https://${process.env.AUTH0_DOMAIN}/oauth/token`,
    {
      client_id: process.env.AUTH0_CLIENT_ID,
      client_secret: process.env.AUTH0_CLIENT_SECRET,
      audience: process.env.AUTH0_AUDIENCE,
      grant_type: "client_credentials",
    }
  );

  return response.data.access_token;
};

module.exports = getAuth0AccessToken;
