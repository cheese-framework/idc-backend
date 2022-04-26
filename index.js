require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const { getAnalytics, getAnalytic } = require("./app/controllers/analytics");

const { PORT } = process.env;

app.use(express.json());
app.use(cors());

app.get("/", getAnalytics);
app.get("/:location", getAnalytic);

// start server
app.listen(PORT || 5000, "0.0.0.0", () =>
  console.log(`Server is running on port ${PORT}`)
);
