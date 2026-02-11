const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const router = express.Router();

// signup
router.post("/signup", async (req, res) => {
  try {
    const { username, firstname, lastname, password } = req.body;
    if (!username || !firstname || !lastname || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    const exists = await User.findOne({ username });
    if (exists) return res.status(409).json({ message: "Username already exists" });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      firstname,
      lastname,
      password: hash
    });

    res.json({ message: "Signup success", user: { username: user.username } });
  } catch (e) {
    res.status(500).json({ message: "Server error", error: e.message });
  }
});

// login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "Username & password required" });
    }

    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    res.json({
      message: "Login success",
      user: { username: user.username, firstname: user.firstname, lastname: user.lastname }
    });
  } catch (e) {
    res.status(500).json({ message: "Server error", error: e.message });
  }
});

module.exports = router;
