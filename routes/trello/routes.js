var express = require('express');
var router = express.Router();

router.get('/', function(res,res) { res.sendStatus(200); });
router.post('/cardcreated', cardCreated);

module.exports = router;


function cardCreated(req, res) {
	const { title, description, list, board, creatorUsername } = req.body;
	console.log(title);
	console.log(description);
	console.log(list);
	console.log(board);
	console.log(creatorUsername);
	res.sendStatus(200);
}