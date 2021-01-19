const express = require("express");
const router = express.Router();
const auth = require("../middleware/Auth");
const { body, validationResult } = require("express-validator");

const abonne = require("../models/Abonne");
const User = require("../models/User");
const employee = require("../models/Employee");
const Income = require("../models/Income");

//get all abonnes
router.get("/", auth, (req, res) => {
	abonne
		.find()
		.then((result) => {
			res.json(result);
		})
		.catch((err) => console.log(err.message));
});

//get abonne
router.get("/:id", auth, (req, res) => {
	abonne
		.findById(req.params.id)
		.then((result) => {
			res.json(result);
		})
		.catch((err) => console.log(err.message));
});

//add abonnes
router.post(
	"/",
	[auth, [body("firstName").not().isEmpty(), body("lastName").not().isEmpty(), body("phoneNumber").not().isEmpty()]],
	(req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.json({ errors: errors.array() });
		}
		User.findById(req.user.id)
			.then((user) => {
				abonne
					.find()
					.then((data) => {
						let firstdata = false;
						data.map((el) => {
							if (el.firstName === req.body.firstName && el.lastName === req.body.lastName) {
								firstdata = true;
							}
						});

						if (firstdata) {
							return res.status(400).json({ msg: "l'abonné existe déjà" });
						} else {
							const { firstName, lastName, phoneNumber } = req.body;
							const credit = 0;
							const userLogedIn = user.firstName + " " + user.lastName;
							const newAbonne = new abonne({
								userLogedIn,
								firstName,
								lastName,
								phoneNumber,
								credit,
							});
							newAbonne
								.save()
								.then(() => res.json({ msg: "OK" }))
								.catch((err) => console.log(err.message));
						}
					})
					.catch((err) => console.log(err.message));
			})
			.catch((err) => {
				console.log(err.message);
			});
	}
);

//delete abonnes
router.delete("/:id", auth, (req, res) => {
	User.findById(req.user.id)
		.then((user) => {
			abonne
				.findById(req.params.id)
				.then((data) => {
					if (!data) {
						return res.json({ msg: "abonne not found" });
					} else if (user.role !== "ADMIN") {
						res.json({ msg: "not authorised" });
					} else {
						abonne.findByIdAndDelete(req.params.id, (err, newData) => {
							res.json({ msg: "abonne deleted" });
						});
					}
				})
				.catch((err) => console.log(err.message));
		})
		.catch((err) => {
			console.log(err.message);
		});
});

//edit abonne
router.put("/:id", auth, (req, res) => {
	const { firstName, lastName, phoneNumber, abonnements } = req.body;

	let abonnePut = {};
	if (firstName) abonnePut.firstName = firstName;
	if (lastName) abonnePut.lastName = lastName;
	if (phoneNumber) abonnePut.phoneNumber = phoneNumber;
	if (abonnements) abonnePut.abonnements = abonnements;
	abonnePut.credit = 0;

	abonne
		.findById(req.params.id)
		.then((data) => {
			if (!data) {
				return res.json({ msg: "abonne not found" });
			} else {
				data.abonnements.map((el) => {
					if (el.price !== el.pay) {
						abonnePut.credit += el.price - el.pay;
					}
				});
				abonne.findByIdAndUpdate(req.params.id, { $set: abonnePut }, (err, newData) => {
					res.json({ msg: "OK" });
				});
			}
		})
		.catch((err) => console.log(err.message));
});

//add abonnement
router.put(
	"/:id/abonnement",
	auth,
	[
		body("departement").not().isEmpty(),
		body("abType").not().isEmpty(),
		body("price").not().isEmpty(),
		body("pay").not().isEmpty(),
		body("date").not().isEmpty(),
	],
	(req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.json({ errors: errors.array() });
		}
		const { departement, abType, pay, price, date, presences } = req.body;
		let abonnementPut = {};
		if (departement) abonnementPut.departement = departement;
		if (abType) abonnementPut.abType = abType;
		if (price) abonnementPut.price = price;
		if (pay) abonnementPut.pay = pay;
		if (date) abonnementPut.date = date;
		if (presences) abonnementPut.presences = presences;
		abonne
			.findById(req.params.id)
			.then((data) => {
				if (!data) {
					return res.json({ msg: "abonne not found" });
				} else {
					let newabonnementAdded = data;
					newabonnementAdded.abonnements.push(abonnementPut);
					newabonnementAdded.credit = 0;
					newabonnementAdded.abonnements.map((el) => {
						newabonnementAdded.credit += el.price - el.pay;
					});
					employee.find().then((data) => {
						data.map((el) => {
							if (el.jobTitle === abonnementPut.departement) {
								let fetchSalary = false;
								let newSalaryAdded = el;
								let salaryId;
								let avanceOfSalary = 0;
								el.salarys.map((ele, i) => {
									if (
										ele.year === new Date(abonnementPut.date).getFullYear() &&
										ele.month === new Date(abonnementPut.date).getMonth() + 1
									) {
										fetchSalary = true;
										salaryId = i;
									}
									ele.avances.map((ele) => {
										avanceOfSalary += ele.amount;
									});
								});
								if (fetchSalary) {
									el.salarys[salaryId].salary += abonnementPut.pay / 2;
									el.rest += abonnementPut.pay / 2;
									employee.findByIdAndUpdate(el.id, { $set: el }, (err, newData) => {});
								} else {
									el.rest = 0;
									el.salarys.push({
										salary: abonnementPut.pay / 2,
										year: new Date(abonnementPut.date).getFullYear(),
										month: new Date(abonnementPut.date).getMonth() + 1,
									});
									el.rest = abonnementPut.pay / 2;
									employee.findByIdAndUpdate(el.id, { $set: el }, (err, newData) => {});
								}
							}
						});
					});
					abonne.findByIdAndUpdate(req.params.id, { $set: newabonnementAdded }, (err, newData) => {
						if (err) throw err;
						abonne.findById(req.params.id, (err, dat) => {
							let idAbonnement = "";
							let abonneName = newData.firstName + " " + newData.lastName;
							if (dat.abonnements) {
								idAbonnement = dat.abonnements[dat.abonnements.length - 1]._id;
							}
							res.json({ msg: "OK", abId: idAbonnement, abName: abonneName });
						});
					});
				}
			})
			.catch((err) => console.log(err.message));
	}
);

//edit abonnement
router.put("/:id/abonnement/:ida", auth, (req, res) => {
	const { pay } = req.body;

	let abonnementUpdated = {};
	let abind;
	abonne
		.findById(req.params.id)
		.then((data) => {
			if (!data) {
				return res.json({ msg: "abonne not found" });
			} else {
				abonnementUpdated = data;
				abonnementUpdated.credit = 0;
				data.abonnements.map((el, ind) => {
					if (el.id === req.params.ida) {
						el.pay += pay;
						abind = el;
					}
					abonnementUpdated.credit += el.price - el.pay;
				});

				employee.find().then((empData) => {
					empData.map((el) => {
						if (el.jobTitle === abind.departement) {
							el.salarys.map((ele, i) => {
								if (ele.year === new Date(abind.date).getFullYear() && ele.month === new Date(abind.date).getMonth() + 1) {
									ele.salary += pay / 2;
									el.rest += pay / 2;
									employee.findByIdAndUpdate(el.id, { $set: el }, (err, newData) => {});
								}
							});
						}
					});
				});
				abonne.findByIdAndUpdate(req.params.id, { $set: abonnementUpdated }, (err, newData) => {
					abonne.findById(req.params.id, (err, dat) => {
						let idAbonnement = "";
						let abonneName = newData.firstName + " " + newData.lastName;
						if (dat.abonnements) {
							idAbonnement = dat.abonnements[dat.abonnements.length - 1]._id;
						}
						res.json({ msg: "OK", abId: idAbonnement, abName: abonneName });
					});
				});
			}
		})
		.catch((err) => console.log(err.message));
});

//delete abonnement
router.delete("/:id/abonnement/:ida", auth, (req, res) => {
	User.findById(req.user.id)
		.then((user) => {
			abonne
				.findById(req.params.id)
				.then((data) => {
					let newData = data;
					let abId;
					let abdeleted;
					if (!data) {
						return res.json({ msg: "abonnement not found" });
					} else if (user.role !== "ADMIN") {
						res.json({ msg: "not authorised" });
					} else {
						data.abonnements.map((el, i) => {
							if (el.id === req.params.ida) {
								abdeleted = el;
								newData.abonnements.splice(i, 1);
							}
						});
						employee.find().then((empData) => {
							empData.map((el) => {
								if (el.jobTitle === abdeleted.departement) {
									el.salarys.map((ele) => {
										if (ele.year === new Date(abdeleted.date).getFullYear() && ele.month === new Date(abdeleted.date).getMonth() + 1) {
											ele.salary -= abdeleted.pay / 2;
											el.rest -= abdeleted.pay / 2;
											employee.findByIdAndUpdate(el.id, { $set: el }, (err, newData) => {});
										}
									});
								}
							});
						});
						abonne.findByIdAndUpdate(req.params.id, { $set: newData }, (err, newData) => {
							Income.find()
								.then((incomeData) => {
									if (incomeData) {
										incomeData.map((el) => {
											if (el.abonnementId == req.params.ida) {
												Income.findByIdAndDelete(el._id, (err, newData) => {
													res.json({ msg: "abonnement and income deleted" });
												});
											}
										});
									}
								})
								.catch((err) => {
									console.log(err.message);
								});
						});
					}
				})
				.catch((err) => console.log(err.message));
		})
		.catch((err) => {
			console.log(err.message);
		});
});

//add presence
router.put("/:id/presence/:ida", auth, (req, res) => {
	User.findById(req.user.id)
		.then((user) => {
			abonne
				.findById(req.params.id)
				.then((data) => {
					if (!data) {
						return res.json({ msg: "abonnement not found" });
					} else {
						data.abonnements.map((el, i) => {
							if (el.id === req.params.ida) {
								el.presences.push({
									userLogued: user.firstName + " " + user.lastName,
									date: new Date(),
								});
							}
						});
						abonne.findByIdAndUpdate(req.params.id, { $set: data }, (err, newData) => {
							res.json({ msg: "Présence ajoutée" });
						});
					}
				})
				.catch((err) => console.log(err.message));
		})
		.catch((err) => {
			console.log(err.message);
		});
});
//delete presence
router.delete("/:id/presence/:ida/:idp", auth, (req, res) => {
	User.findById(req.user.id)
		.then((user) => {
			abonne
				.findById(req.params.id)
				.then((data) => {
					if (!data) {
						return res.json({ msg: "abonnement not found" });
					} else if (user.role !== "ADMIN") {
						res.json({ msg: "not authorised" });
					} else {
						data.abonnements.map((el, i) => {
							if (el.id === req.params.ida) {
								el.presences.map((elem, index) => {
									if (elem.id === req.params.idp) {
										data.abonnements[i].presences.splice(index, 1);
									}
								});
							}
						});
						abonne.findByIdAndUpdate(req.params.id, { $set: data }, (err, newData) => {
							res.json({ msg: "présence supprimé" });
						});
					}
				})
				.catch((err) => console.log(err.message));
		})
		.catch((err) => {
			console.log(err.message);
		});
});

module.exports = router;
