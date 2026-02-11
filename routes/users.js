const express = require("express");
const User = require("../models/User");

const router = express.Router();


router.get("/", async (req, res) => {
  try {
    const users = await User.find({}, { username: 1, firstname: 1, lastname: 1, _id: 0 }).sort({ username: 1 });
    res.json(users);
  } catch (e) {
    res.status(500).json({ message: "Server error", error: e.message });
  }
});

module.exports = router;
