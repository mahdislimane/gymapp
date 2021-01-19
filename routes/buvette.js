const express = require("express");
const router = express.Router();
const auth = require("../middleware/Auth");
const { body, validationResult } = require("express-validator");
const buvette = require("../models/buvette");
const User = require("../models/User");

// get all buvette
router.get("/", auth, (req, res) => {
	buvette
		.find()
		.then((result) => {
			res.json(result);
		})
		.catch((err) => console.log(err.message));
});

// add buvette
router.post("/", [auth, [body("comment").not().isEmpty(), body("price").not().isEmpty()]], (req, res) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.json({ errors: errors.array() });
	}
	User.findById(req.user.id)
		.then((user) => {
			const { comment, price } = req.body;
			let userName = user.firstName + " " + user.lastName;
			let date = new Date();
			const newBuvette = new buvette({
				date,
				price,
				userName,
				comment,
			});
			newBuvette
				.save()
				.then(() => res.json({ msg: "OK" }))
				.catch((err) => console.log(err.message));
		})
		.catch((err) => {
			console.log(err.message);
		});
});

// delete buvette
router.delete("/:id", auth, (req, res) => {
	buvette.findByIdAndDelete(req.params.id, (err, newData) => {
		res.json({ msg: "OK" });
	});
});

module.exports = router;
