// @ts-check

const CyclicDb = require("@cyclic.sh/dynamodb");
const express = require("express");
const { check, validationResult } = require("express-validator");

const router = express.Router();
const db = CyclicDb(process.env.CYCLIC_DB);
const participants = db.collection("participants");

const validateBody = [
  check("email").isEmail().withMessage("Enter a valid email"),
  check("firstname").notEmpty().withMessage("First name is required"),
  check("lastname").notEmpty().withMessage("Last name is required"),
  check("dob").isISO8601().withMessage("Enter a valid date format"),
  check("work").exists().withMessage("Work data is required"),
  check("home").exists().withMessage("Home data is required"),
];

router.get("/", async function (_, res) {
  const participantList = await participants.list();

  const participantPromises = participantList?.results.map(
    async (participant) => {
      return participants.get(participant.key);
    }
  );

  const list = await Promise.all(participantPromises);

  res.status(200).send(list);
});

router.delete("/", async function (req, res, next) {
  // await participants.delete("a@gmail.com");

  res.status(200).send("Yolo");
});

router.post("/", validateBody, async function (req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, firstname, lastname, dob, work, home } = req.body;

  try {
    const user = await participants.get(email);

    if (user) {
      return res.status(400).send(`User with email '${email}' already exists`);
    }

    await participants.set(email, {
      firstname,
      lastname,
      dob,
      active: true,
      work,
      home,
    });

    res.status(200).send(`User with email '${email}' created`);
  } catch (error) {
    res.status(500).send("Could not create user");
  }
});

module.exports = router;
