// backend/messaging-service/src/utils/userClient.js
const axios = require("axios");
const logger = require("../../logger");

// Cache mechanism for tokens and user data
let cachedToken = null;
let tokenExpiryTime = 0;
const userCache = new Map();

/**
 * Get Auth0 Management API token
 * @returns {Promise<string>} The access token
 */
async function getMgmtToken() {
  const now = Math.floor(Date.now() / 1000);

  // Return cached token if it's still valid (with 60s buffer)
  if (cachedToken && tokenExpiryTime > now + 60) {
    return cachedToken;
  }

  try {
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
    tokenExpiryTime = now + res.data.expires_in;

    logger.info(
      `Retrieved new Auth0 management token, expires in ${res.data.expires_in}s`
    );

    return cachedToken;
  } catch (error) {
    logger.error(`Failed to get Auth0 management token: ${error.message}`);
    throw new Error("Failed to get management token");
  }
}

/**
 * Get user details from Auth0
 * @param {string} auth0Id - The Auth0 user ID
 * @returns {Promise<Object|null>} User details or null if not found
 */
// exports.getUserByAuth0Id = async function (auth0Id) {
//   if (!auth0Id) {
//     logger.warn("getUserByAuth0Id called with empty auth0Id");
//     return null;
//   }

//   // Check cache first (valid for 5 minutes)
//   const cacheKey = `user_${auth0Id}`;
//   const cachedUser = userCache.get(cacheKey);

//   if (cachedUser && cachedUser.timestamp > Date.now() - 5 * 60 * 1000) {
//     logger.debug(`User ${auth0Id} found in cache`);
//     return cachedUser.data;
//   }

//   try {
//     const token = await getMgmtToken();

//     const { data } = await axios.get(
//       `https://${process.env.AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(
//         auth0Id
//       )}`,
//       {
//         headers: { Authorization: `Bearer ${token}` },
//       }
//     );

//     // Transform the data to our expected format
//     const userData = {
//       _id: data.user_id,
//       full_name: data.name || data.nickname || "Unknown User",
//       profile_image: data.picture || null,
//       is_online: false, // This would be updated via presence system
//     };

//     // Cache the user data
//     userCache.set(cacheKey, {
//       data: userData,
//       timestamp: Date.now(),
//     });

//     return userData;
//   } catch (err) {
//     // Handle common errors
//     if (err.response) {
//       logger.error(
//         `Auth0 API error (${err.response.status}): ${err.response.statusText}`
//       );

//       if (err.response.status === 429) {
//         logger.warn(
//           "Auth0 rate limit reached. Consider implementing a rate limiter."
//         );
//       }
//     } else {
//       logger.error(`Error fetching user ${auth0Id}: ${err.message}`);
//     }

//     return null; // Return null instead of throwing to prevent 500 errors
//   }
// };

// Optional: Function to get user by internal MongoDB ID - if needed
exports.getUserByAuth0Id = async function (auth0Id) {
  if (!auth0Id) return null;

  // Log the exact URL being accessed
  const userUrl = `https://${
    process.env.AUTH0_DOMAIN
  }/api/v2/users/${encodeURIComponent(auth0Id)}`;
  console.log(`Attempting to fetch user from: ${userUrl}`);

  try {
    const token = await getMgmtToken();
    const { data } = await axios.get(userUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return {
      _id: data.user_id,
      full_name: data.name || data.nickname || "Unknown User",
      profile_image: data.picture || null,
      is_online: false,
    };
  } catch (err) {
    console.error(`Auth0 API error for user ${auth0Id}: ${err.message}`);

    // Create a fallback user - this ensures chat works even with Auth0 issues
    const username = auth0Id.includes("|")
      ? auth0Id.split("|")[1].substring(0, 6)
      : auth0Id.substring(0, 6);

    return {
      _id: auth0Id,
      full_name: `User ${username}`,
      profile_image: null,
      is_online: true,
    };
  }
};

exports.getUserByInternalId = async function (internalId) {
  if (!internalId) return null;

  try {
    // This would connect to your User service API
    const response = await axios.get(
      `${process.env.USER_SERVICE_URL}/api/users/internal/${internalId}`,
      {
        headers: {
          "x-internal-api-key": process.env.INTERNAL_API_KEY,
        },
        timeout: 3000,
      }
    );

    return response.data;
  } catch (err) {
    logger.error(`Failed to fetch user by internal ID: ${err.message}`);
    return null;
  }
};

// Clear cache periodically (every hour)
setInterval(() => {
  logger.info("Clearing user cache");
  userCache.clear();
}, 60 * 60 * 1000);
