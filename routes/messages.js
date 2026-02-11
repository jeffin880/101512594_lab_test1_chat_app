const express = require("express");
const GroupMessage = require("../models/GroupMessage");
const PrivateMessage = require("../models/PrivateMessage");

const router = express.Router();


router.get("/group/:room", async (req, res) => {
  const room = req.params.room;
  const msgs = await GroupMessage.find({ room }).sort({ date_sent: 1 }).limit(200);
  res.json(msgs);
});


router.get("/private", async (req, res) => {
  const { a, b } = req.query; 
  const msgs = await PrivateMessage.find({
    $or: [
      { from_user: a, to_user: b },
      { from_user: b, to_user: a }
    ]
  }).sort({ date_sent: 1 }).limit(200);
  res.json(msgs);
});

module.exports = router;
