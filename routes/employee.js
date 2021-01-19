﻿const express = require("express");
const router = express.Router();
const auth = require("../middleware/Auth");
const { body, validationResult } = require("express-validator");

const employee = require("../models/Employee");
const User = require("../models/User");

const mongoose = require("mongoose");
const { deleteOne } = require("../models/Employee");
mongoose.set("useFindAndModify", false);

//get all employees
router.get("/", auth, (req, res) => {
	employee
		.find()
		.then((result) => {
			res.json(result);
		})
		.catch((err) => console.log(err.message));
});

//get employee
router.get("/:id", auth, (req, res) => {
	employee
		.findById(req.params.id)
		.then((result) => {
			res.json(result);
		})
		.catch((err) => console.log(err.message));
});

//add employees
router.post(
	"/",
	[
		auth,
		[
			body("fullName").not().isEmpty(),
			body("jobTitle").not().isEmpty(),
			body("phoneNumber").not().isEmpty(),
			body("cardNumber").not().isEmpty(),
			body("cardNumber2").not().isEmpty(),
			body("cin").not().isEmpty(),
			body("startDate").not().isEmpty(),
		],
	],
	(req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.json({ errors: errors.array() });
		}
		employee
			.find()
			.then((data) => {
				let firstdata = false;
				data.map((el) => {
					if (el.fullName === req.body.fullName) {
						firstdata = true;
					}
				});

				if (firstdata) {
					return res.status(400).json({ message: "l'employee existe déjà" });
				} else {
					const { fullName, jobTitle, phoneNumber, cin, startDate, cardNumber, cardNumber2 } = req.body;
					const newemployee = new employee({
						fullName,
						jobTitle,
						phoneNumber,
						cardNumber,
						cardNumber2,
						cin,
						startDate,
					});
					newemployee
						.save()
						.then((data) => res.json({ msg: "OK" }))
						.catch((err) => console.log(err.message));
				}
			})
			.catch((err) => console.log(err.message));
	}
);

//delete employees
router.delete("/:id", auth, (req, res) => {
	User.findById(req.user.id)
		.then((user) => {
			employee
				.findById(req.params.id)
				.then((data) => {
					if (!data) {
						return res.json({ msg: "employee not found" });
					} else if (user.role !== "ADMIN") {
						res.json({ msg: "not authorised" });
					} else {
						employee.findByIdAndDelete(req.params.id, (err, newData) => {
							res.json({ msg: "employee deleted" });
						});
					}
				})
				.catch((err) => console.log(err.message));
		})
		.catch((err) => {
			console.log(err.message);
		});
});

//edit employee
router.put(
	"/:id",
	auth,
	[
		body("fullName").not().isEmpty(),
		body("jobTitle").not().isEmpty(),
		body("phoneNumber").not().isEmpty(),
		body("cardNumber").not().isEmpty(),
		body("cardNumber2").not().isEmpty(),
		body("cin").not().isEmpty(),
	],
	(req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.json({ errors: errors.array() });
		}
		const { cin, fullName, phoneNumber, jobTitle, endDate, cardNumber, cardNumber2 } = req.body;

		let employeePut = {};
		if (fullName) employeePut.fullName = fullName;
		if (jobTitle) employeePut.jobTitle = jobTitle;
		if (phoneNumber) employeePut.phoneNumber = phoneNumber;
		if (cardNumber) employeePut.cardNumber = cardNumber;
		if (cardNumber2) employeePut.cardNumber2 = cardNumber2;
		if (cin) employeePut.cin = cin;
		if (endDate) employeePut.endDate = endDate;

		employee
			.findById(req.params.id)
			.then((data) => {
				if (!data) {
					return res.json({ msg: "employee not found" });
				} else {
					employeePut.startDate = data.startDate;
					if (!endDate) {
						employeePut.endDate = null;
					}
					employeePut.salarys = data.salarys;
					employee.findByIdAndUpdate(req.params.id, { $set: employeePut }, (err, newData) => {
						res.json({ msg: "employee updated" });
					});
				}
			})
			.catch((err) => console.log(err.message));
	}
);

//add salary

router.put(
	"/:id/salary",
	auth,
	[body("salary").not().isEmpty(), body("year").not().isEmpty(), body("month").not().isEmpty(), body("dayCoast").not().isEmpty()],
	(req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.json({ errors: errors.array() });
		}
		const { salary, year, month, dayCoast } = req.body;
		let salaryPut = {};
		if (salary) salaryPut.salary = salary;
		if (year) salaryPut.year = year;
		if (month) salaryPut.month = month;
		if (dayCoast) salaryPut.dayCoast = dayCoast;
		employee
			.findById(req.params.id)
			.then((data) => {
				let fetchSalary = false;
				if (!data) {
					return res.json({ msg: "employee not found" });
				} else {
					let newSalaryAdded = data;
					newSalaryAdded.rest = 0;
					data.salarys.map((el) => {
						if (el.year === salaryPut.year && el.month === salaryPut.month) {
							fetchSalary = true;
						}
						let avanceOfSalary = 0;
						el.avances.map((ele) => {
							if (ele.amount) {
								avanceOfSalary += ele.amount;
							}
						});
						newSalaryAdded.rest += el.salary - avanceOfSalary;
					});
					if (fetchSalary) {
						return res.json({ msg: "this salary exist" });
					} else {
						newSalaryAdded.salarys.push(salaryPut);
						newSalaryAdded.rest += salaryPut.salary;
						employee.findByIdAndUpdate(req.params.id, { $set: newSalaryAdded }, (err, newData) => {
							res.json({ msg: "OK" });
						});
					}
				}
			})
			.catch((err) => console.log(err.message));
	}
);

//delete salary
router.delete("/:id/salary/:ids", auth, (req, res) => {
	User.findById(req.user.id)
		.then((user) => {
			employee
				.findById(req.params.id)
				.then((data) => {
					let newData = data;
					if (!data) {
						return res.json({ msg: "salary not found" });
					} else if (user.role !== "ADMIN") {
						res.json({ msg: "not authorised" });
					} else {
						data.salarys.map((el, i) => {
							if (el.id === req.params.ids) {
								newData.salarys.splice(i, 1);
							}
						});
						newData.rest = 0;
						newData.salarys.map((el) => {
							let avanceOfSalary = 0;
							el.avances.map((ele) => {
								if (ele.amount) {
									avanceOfSalary += ele.amount;
								}
							});
							newData.rest += el.salary - avanceOfSalary;
						});
						employee.findByIdAndUpdate(req.params.id, { $set: newData }, (err, newData) => {
							res.json({ msg: "salary deleted" });
						});
					}
				})
				.catch((err) => console.log(err.message));
		})
		.catch((err) => {
			console.log(err.message);
		});
});

//add avance

router.put(
	"/:id/avance",
	auth,
	[body("date").not().isEmpty(), body("year").not().isEmpty(), body("month").not().isEmpty(), body("amount").not().isEmpty()],
	(req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.json({ errors: errors.array() });
		}
		const { date, amount, year, month } = req.body;
		let avancePut = {};
		if (date) avancePut.date = date;
		if (amount) avancePut.amount = amount;
		if (year) avancePut.year = year;
		if (month) avancePut.month = month;
		employee
			.findById(req.params.id)
			.then((data) => {
				if (!data) {
					return res.json({ msg: "employee not found" });
				} else {
					let newavanceAdded = data;
					data.salarys.map((el, i) => {
						if (el.year === avancePut.year && el.month === avancePut.month) {
							newavanceAdded.salarys[i].avances.push(avancePut);
						}
					});
					newavanceAdded.rest = 0;
					newavanceAdded.salarys.map((el) => {
						let avanceOfSalary = 0;
						el.avances.map((ele) => {
							if (ele.amount) {
								avanceOfSalary += ele.amount;
							}
						});
						newavanceAdded.rest += el.salary - avanceOfSalary;
					});
					employee.findByIdAndUpdate(req.params.id, { $set: newavanceAdded }, (err, newData) => {
						res.json({ msg: "OK" });
					});
				}
			})
			.catch((err) => console.log(err.message));
	}
);

//delete avance
router.delete("/:id/avance/:ida", auth, (req, res) => {
	User.findById(req.user.id)
		.then((user) => {
			employee
				.findById(req.params.id)
				.then((data) => {
					let newData = data;
					if (!data) {
						return res.json({ msg: "avance not found" });
					} else if (user.role !== "ADMIN") {
						res.json({ msg: "not authorised" });
					} else {
						data.salarys.map((el, i) => {
							el.avances.map((ele, index) => {
								if (ele.id === req.params.ida) {
									newData.salarys[i].avances.splice(index, 1);
									if (ele.note === "1 jour de congé") {
										newData.salarys[i].salary += newData.salarys[i].dayCoast;
									}
								}
							});
						});
						newData.rest = 0;
						newData.salarys.map((el) => {
							let avanceOfSalary = 0;
							el.avances.map((ele) => {
								if (ele.amount) {
									avanceOfSalary += ele.amount;
								}
							});
							newData.rest += el.salary - avanceOfSalary;
						});
						employee.findByIdAndUpdate(req.params.id, { $set: newData }, (err, newData) => {
							res.json({ msg: "avance deleted" });
						});
					}
				})
				.catch((err) => console.log(err.message));
		})
		.catch((err) => {
			console.log(err.message);
		});
});

//add day for employee
router.put("/:id/dayoff/:ida", auth, [body("dayState").not().isEmpty()], (req, res) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.json({ errors: errors.array() });
	}
	const { dayState } = req.body;
	employee
		.findById(req.params.id)
		.then((data) => {
			if (!data) {
				return res.json({ msg: "employee not found" });
			} else {
				let newData = data;
				newData.salarys.map((el) => {
					if (el._id == req.params.ida) {
						if (dayState == "plus") {
							el.salary += el.dayCoast;
							newData.rest += el.dayCoast;
							el.avances.push({ note: "1 jour double" });
						} else {
							el.salary -= el.dayCoast;
							newData.rest -= el.dayCoast;
							el.avances.push({ note: "1 jour de congé", date: new Date() });
						}
					}
				});
				employee.findByIdAndUpdate(req.params.id, { $set: newData }, (err, newData) => {
					res.json({ msg: "OK" });
				});
			}
		})
		.catch((err) => console.log(err.message));
});

//add entry/exit

router.put("/enterexit/:card", auth, (req, res) => {
	employee
		.find()
		.then((employe) => {
			if (!employe) {
				return res.json({ msg: "employees not found" });
			} else {
				let newEmploye = employe;
				let empUpdated;
				let empId;
				let count = 0;
				newEmploye.map((el) => {
					if (el.cardNumber == req.params.card || el.cardNumber2 == req.params.card) {
						el.salarys.map((ele) => {
							if (new Date().getMonth() + 1 == ele.month) {
								if (
									ele.entryHistory[ele.entryHistory.length - 1] &&
									ele.entryHistory[ele.entryHistory.length - 1].entryDate &&
									!ele.entryHistory[ele.entryHistory.length - 1].exitDate
								) {
									ele.entryHistory[ele.entryHistory.length - 1].exitDate = new Date();
									count = 2;
								} else if (
									!ele.entryHistory[ele.entryHistory.length - 1] ||
									(ele.entryHistory[ele.entryHistory.length - 1].entryDate && ele.entryHistory[ele.entryHistory.length - 1].exitDate)
								) {
									ele.entryHistory.push({
										entryDate: new Date(),
									});
									count = 1;
								}
							}
						});
						empId = el._id;
						empUpdated = el;
					}
				});
				if (count === 0) {
					res.json({ msg: "La carte n'est pas assigné" });
				} else if (count === 1) {
					employee.findByIdAndUpdate(empId, { $set: empUpdated }, (err, newEmploye) => {
						res.json({ msg: "Pointage d'entré enregistré pour " + empUpdated.fullName });
					});
				} else if (count === 2) {
					employee.findByIdAndUpdate(empId, { $set: empUpdated }, (err, newEmploye) => {
						res.json({ msg: "Pointage de sortie enregistré pour " + empUpdated.fullName });
					});
				}
			}
		})
		.catch((err) => console.log(err.message));
});

module.exports = router;
