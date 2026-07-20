const asyncHandler = require("../utils/asyncHandler");
const { getDashboard } = require("../services/statsService");

// RF-14 — panel de control en una sola petición
const dashboard = asyncHandler(async (req, res) => {
  res.json(await getDashboard());
});

module.exports = { dashboard };
