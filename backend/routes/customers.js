const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.json({ success: true, customers: [] });
});

module.exports = router;
