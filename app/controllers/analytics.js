const fs = require("fs");
const path = require("path");
const { csvToArray } = require("../utils/utils");
const axios = require("axios");
const { setupCache } = require("axios-cache-adapter");

const cache = setupCache({
  maxAge: 15 * 60 * 1000,
});

const api = axios.create({
  adapter: cache.adapter,
});

const getProviderCount = async (network, current, result, gps) => {
  const providers = {
    africell: [
      "africell",
      "africell data",
      "africel",
      "africel data",
      "africel router",
      "africell outdoor",
      "dk telecom",
    ],
    qcell: ["qcell", "qcell data", "qcell pocket router", "qcell router"],
    netpage: ["netpage", "natpage"],
    netpage_fiber: ["netpage fiber"],
    gamtel: ["gamtel", "gamtel adsl"],
    gamcel: ["gamcel", "gamcel adsl"],
    gamtel_fiber: ["gamtel fiber"],
    other: ["other", "none", "others"],
    "dk telecom": ["dk telecom"],
  };

  return providers[network].includes(
    current["Existing Internet"].trim().toLowerCase()
  )
    ? (result[gps] ? result[gps]["internet_providers"][network] : 0) + 1
    : result[gps]
    ? result[gps]["internet_providers"][network]
    : 0;
};

const getGeoLocation = async (gps) => {
  try {
    const { data } = await api.get(`http://api.positionstack.com/v1/forward`, {
      params: {
        access_key: process.env.GEO_KEY,
        query: gps,
        limit: 1,
      },
    });
    const countries =
      data.data && data.data.filter((d) => d.country === "The Gambia");
    return countries[0];
  } catch (err) {
    throw err;
  }
};

const processData = async (data) => {
  const visitedLocations = [];
  const result = {};
  for (let i = 0; i < data.length; i++) {
    const current = data[i];
    const gps = current.GPS.trim().toLowerCase();

    if (gps) {
      result[gps] = {
        // location: !visitedLocations.includes(gps)
        //   ? await getGeoLocation(gps)
        //   : result[gps]["location"],
        feedback: current.Feedback
          ? (result[gps] ? result[gps]["feedback"] : 0) + 1
          : 0,
        internet_providers: {
          africell: await getProviderCount("africell", current, result, gps),
          gamcel: await getProviderCount("gamcel", current, result, gps),
          gamtel: await getProviderCount("gamtel", current, result, gps),
          gamtel_fiber: await getProviderCount(
            "gamtel_fiber",
            current,
            result,
            gps
          ),
          qcell: await getProviderCount("qcell", current, result, gps),
          netpage: await getProviderCount("netpage", current, result, gps),
          "dk telecom": await getProviderCount(
            "dk telecom",
            current,
            result,
            gps
          ),
          netpage_fiber: await getProviderCount(
            "netpage_fiber",
            current,
            result,
            gps
          ),
          other: await getProviderCount("other", current, result, gps),
        },
        prospect: current.Prospect
          ? (result[gps] ? result[gps]["prospect"] : 0) + 1
          : 0,
      };
      if (!visitedLocations.includes(gps)) {
        visitedLocations.push(gps);
      }
    }
  }
  return result;
};

exports.getAnalytics = async (req, res) => {
  fs.readFile(
    `${path.join(__dirname, "../data/data.csv")}`,
    "utf-8",
    async (err, fileContent) => {
      if (err) throw err;

      const data = await processData(await csvToArray(fileContent || ""));

      res.send(Object.entries(data));
    }
  );
};

exports.getAnalytic = async (req, res) => {
  const { location } = req.params;
  fs.readFile(
    `${path.join(__dirname, "../data/data.csv")}`,
    "utf-8",
    async (err, fileContent) => {
      if (err) throw err;

      const data = await csvToArray(fileContent || "");

      const result = {};

      for (let i = 0; i < data.length; i++) {
        const current = data[i];
        const gps = current.GPS.trim().toLowerCase();
        const network = current["Existing Internet"].trim().toLowerCase();
        const feedback = current.Feedback.trim().toLowerCase();
        if (gps && gps === location.trim().toLowerCase()) {
          if (feedback) {
            result[network] = result[network] || {};
            result[network][feedback] = result[network][feedback]
              ? result[network][feedback] + 1
              : 1;
          }
        }
      }

      res.send(Object.entries(result));
    }
  );
};

// {
//   network: "africell",
//   feedback: {
//     slow: 23,
//     fast: 12
//   }
// }
