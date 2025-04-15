const axios = require("axios");

const USER_SERVICE_URL = process.env.USER_SERVICE_URL;

exports.getUserByAuth0Id = async (auth0Id) => {
  try {
    const response = await axios.get(
      `${USER_SERVICE_URL}/api/users/auth0/${auth0Id}`
    );
    return response.data.user;
  } catch (err) {
    console.error(`Error fetching user ${auth0Id}:`, err.message);
    return null;
  }
};
