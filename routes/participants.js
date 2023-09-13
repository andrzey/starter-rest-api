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

const getParticipantData = async () => {
  const participantList = await participants.list();
  const participantPromises = participantList?.results.map(
    async (participant) => {
      return participants.get(participant.key);
    }
  );

  const list = await Promise.all(participantPromises);

  return list;
};

router.get("/", async function (_, res) {
  try {
    const list = await getParticipantData();

    res.status(200).send(list);
  } catch (error) {
    res.status(500).send("Could not get participants");
  }
});

router.post("/", validateBody, async function (req, res) {
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

router.get("/details", async function (_, res) {
  try {
    const list = await getParticipantData();

    const filteredList = list.filter(
      (participant) => participant.props.active === true
    );

    res.status(200).send(filteredList);
  } catch (error) {
    res.status(500).send("Could not get active participants");
  }
});

router.get("/details/deleted", async function (_, res) {
  try {
    const list = await getParticipantData();

    const filteredList = list.filter(
      (participant) => participant.props.active !== true
    );

    res.status(200).send(filteredList);
  } catch (error) {
    res.status(500).send("Could not get deleted participants");
  }
});

router.get("/details/:email", async function (req, res) {
  try {
    const participant = await participants.get(req.params.email);

    if (!participant || participant.props.active !== true) {
      return res
        .status(404)
        .json(`Could not find participant with email '${req.params.email}'`);
    }

    res.status(200).send({
      name: participant.props.firstname,
      lastname: participant.props.lastname,
      active: participant.props.active,
    });
  } catch (error) {
    res.status(500).send("Could not get participant");
  }

  try {
    const list = await getParticipantData();

    const filteredList = list.filter(
      (participant) => participant.props.active !== true
    );

    res.status(200).send(filteredList);
  } catch (error) {
    res.status(500).send("Could not get deleted participants");
  }
});

router.delete("/:email", async function (req, res) {
  const participant = await participants.get(req.params.email);

  if (!participant) {
    return res
      .status(404)
      .json(`Could not find participant with email '${req.params.email}'`);
  }

  try {
    await participants.set(req.params.email, { active: false });

    res.status(200).send(`User with email '${req.params.email}' deleted`);
  } catch (error) {
    res.status(500).send("Could not delete user");
  }
});

router.delete("/", async function (req, res, next) {
  await participants.delete("alma@gmail.com");

  res.status(200).send("Yolo");
});

module.exports = router;
