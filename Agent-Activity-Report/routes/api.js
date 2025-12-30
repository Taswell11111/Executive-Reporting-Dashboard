const express = require('express');
const router = express.Router();

router.get('/agents', (req, res) => {
  res.json({ message: 'This is the agents endpoint' });
});

router.get('/groups', (req, res) => {
  res.json({ message: 'This is the groups endpoint' });
});

router.get('/ticket_fields', (req, res) => {
  res.json({ message: 'This is the ticket_fields endpoint' });
});

module.exports = router;
