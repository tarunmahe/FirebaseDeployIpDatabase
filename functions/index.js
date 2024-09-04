/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {
  onCall,
  HttpsError,
  onRequest,
} = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
//const express = require("express");
//const app = express();
const axios = require("axios");
const { getDatabase } = require("firebase-admin/database");
const { defineString } = require("firebase-functions/params");

const { initializeApp } = require("firebase-admin/app");
initializeApp();
const CryptoJS = require("crypto-js");
const functions = require("firebase-functions");

const admin = require("firebase-admin");

const db = admin.database();
const apiKey = defineString("IPSTACK_API_KEY");

function generateCountryHash(countryCode) {
  return CryptoJS.SHA256(countryCode.toLowerCase()).toString(CryptoJS.enc.Hex);
}

// Function to handle updates to the 'countries' array or 'enabled' flag
exports.handleCountryUpdates = functions.database
  .ref("/data")
  .onUpdate(async (change, context) => {
    const beforeData = change.before.val();
    const afterData = change.after.val();

    const beforeCountries = (beforeData.countries || "").toString();
    const afterCountries = (afterData.countries || "").toString();
    const wasEnabled = beforeData.enabled;
    const isEnabled = afterData.enabled;

    // Path where country hashes are stored
    const countryHashesRef = db.ref("/userdata");

    // If enabled is turned off, delete all country hashes
    if (wasEnabled && !isEnabled) {
      await countryHashesRef.remove();
      console.log("Enabled turned off, all country hashes removed.");
      return null;
    }

    // If enabled is true, update country hashes
    if (isEnabled) {
      const updates = {};

      // Convert the afterCountries and beforeCountries strings to arrays
      const afterCountriesArray = afterCountries
        .split(",")
        .map((code) => code.trim().toLowerCase());
      const beforeCountriesArray = beforeCountries
        .split(",")
        .map((code) => code.trim().toLowerCase());

      // Add or update country hashes in the userdata path
      afterCountriesArray.forEach((countryCode) => {
        const hash = generateCountryHash(countryCode);
        updates[hash] = {
          //countryCode: countryCode,
          inapp: afterData.home,
          home: afterData.privacy,
          privacy: afterData.privacy,
          terms: afterData.terms,
          auth: true,
        };
      });

      // Remove hashes that are no longer in the 'countries' array
      beforeCountriesArray.forEach((countryCode) => {
        if (!afterCountriesArray.includes(countryCode)) {
          const hash = generateCountryHash(countryCode);
          updates[hash] = null; // Setting a value to null will remove it in Firebase
        }
      });

      await countryHashesRef.update(updates);
      console.log("Country hashes updated.");
    }
    return null;
  });

exports.init = functions.https.onRequest(async (req, res) => {
  try {
    /* if (req.method !== "POST") {
      return res.status(405).send({ error: "Method Not Allowed. Use POST." });
    } */
    // Step 1: Get the IP address from the request headers
    const clientIP =
      req.headers["x-appengine-user-ip"] || req.headers["x-forwarded-for"];
    logger.info(
      `Hello IP: ${req.headers["x-appengine-user-ip"]} : ${req.headers["x-forwarded-for"]} : ${req.connection.remoteAddress}`,
      {
        structuredData: true,
      }
    );
    const cfCall = {
      method: "GET",
      url: `https://quiz.ely-studio.info`,
      headers: {
        "X-Forwarded-For": clientIP, // Set the X-Forwarded-For header with the client IP
      },
    };
    const cfResp = await axios.request(cfCall);

    // Step 2: Call the ipstack API with the IP address
    //const apiKey = "532b78d7b8e6ff38f9f28997f90d2a58"; // Replace with your ipstack API key
    /* const options = {
      method: "GET",
      url: `https://api.ipstack.com/${clientIP}?access_key=${apiKey.value()}`,
      headers: {
        "X-Forwarded-For": clientIP, // Set the X-Forwarded-For header with the client IP
      },
    };
    const response = await axios.request(options);

    // Step 3: Extract the country code from the response
    const countryCode = response.data.country_code;

    if (!countryCode) {
      return res.status(400).json({ error: "Unable to retrieve country code" });
    }

    const hash = generateCountryHash(countryCode);
    return res.status(200).json({
      user: hash,
    });
    */
    return res.status(200).json({
      user: cfResp,
    });
  } catch (error) {
    console.error("Error processing request:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
//app.use(myMiddleware);

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started
/*
app.get("/", async (request, response) => {
  const db = getDatabase();
  const appRef = db.ref("app");
  const snapshot = await appRef.once("value");
  const appValue = snapshot.val();
  if (!appValue) {
    logger.error("App key not found in the database");
    return response.status(500).send("App key not found in the database");
  }
  try {
    const clientIP =
      request.headers["x-appengine-user-ip"] ||
      request.headers["x-forwarded-for"];
    logger.info(`Hello IP logs from header and request! ${clientIP} `, {
      structuredData: true,
    });
    //logger.info(`Request IP - ${request.ip}`);

    const ipResp = await axios.get(
      `https://ipinfo.io/${clientIP}/json?token=3f5fd9d1215c12`
    );
    const country = ipResp.data.country;

    const zones = appValue.zones.split(",").map((zone) => zone.trim());
    const isInZones =
      zones.find((key) => key.toUpperCase() === country.toUpperCase()) !=
      undefined;
    logger.info(`isInZones! for ${country} ? ${isInZones} `);
    let result = {
      home: appValue.home,
      privacy: appValue.privacy,
    };
    if (isInZones && appValue.isEnabled === true) {
      result.privacy = appValue.privacy;
      response.status(200).json(result);
    } else {
      result.privacy = appValue.terms;
      response.status(200).json(result);
    }
  } catch (error) {
    logger.error("Error occurred:", error);
    response.status(500).json({
      status: false,
      home: appValue.home,
      privacy: appValue.privacy,
    });
  }
});
*/
/*
exports.getAppAuthData = onCall(
  // {
  //  enforceAppCheck: false, // Reject requests with missing or invalid App Check tokens.
  // },
  async (request) => {
    const db = getDatabase();
    const appRef = db.ref("app");
    const snapshot = await appRef.once("value");
    const appValue = snapshot.val();
    logger.info(`appValue: ${JSON.stringify(appValue)}`);
    if (!appValue) {
      logger.error("App key not found in the database");
      return {};
    }

    try {
      const header = request.rawRequest.header.bind(request.rawRequest);

      const clientIP = (header("x-forwarded-for") || "").split(",")[0];
      logger.info(`IP ${clientIP} `);
      // const clientIP =
      //   request.rawRequest.rawHeaders["x-forwarded-for"] ||
      //   request.rawRequest.socket.remoteAddress;
      // logger.info(`Hello IP logs from header and request! ${clientIP} `, {
      //   structuredData: true,
      // });
      //logger.info(`Request IP - ${request.ip}`);

      const ipResp = await axios.get(
        `https://ipinfo.io/${clientIP}/json?token=3f5fd9d1215c12`
      );
      const country = ipResp.data.country;

      const zones = appValue.zones.split(",").map((zone) => zone.trim());
      const isInZones =
        zones.find((key) => key.toUpperCase() === country.toUpperCase()) !=
        undefined;
      logger.info(`isInZones! for ${country} ? ${isInZones} `);
      let result = {
        home: appValue.home,
        privacy: appValue.privacy,
        app: 1,
      };
      if (isInZones && appValue.isEnabled === true) {
        result.privacy = appValue.privacy;
        result.app = appValue.app;
        return result;
      } else {
        result.privacy = appValue.terms;
        return result;
      }
    } catch (error) {
      logger.error("Error occurred:", error);
      return {
        status: false,
        home: appValue.home,
        privacy: appValue.privacy,
      };
    }
    // request.app contains data from App Check, including the app ID.
    // Your function logic follows.
  }
);
*/
//exports.widgets = onRequest(app);
