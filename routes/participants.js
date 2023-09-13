const CyclicDb = require("@cyclic.sh/dynamodb");
const express = require("express");
const { check, validationResult } = require("express-validator");

const router = express.Router();
const db = CyclicDb(process.env.CYCLIC_DB);
const participants = db.collection("participants");

const validateUser = [
  check("email").isEmail().withMessage("Email is required"),
  check("firstname").notEmpty().withMessage("First name is required"),
  check("lastname").notEmpty().withMessage("Last name is required"),
  check("dob").isISO8601().withMessage("Date of birth is required"),
  check("work").exists().withMessage("Work data is required"),
  check("home").exists().withMessage("Home data is required"),
  check("active").isBoolean().withMessage("Active is required"),
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

router.post("/", validateUser, async function (req, res) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, firstname, lastname, dob, work, home, active } = req.body;

  try {
    const user = await participants.get(email);

    if (user) {
      return res.status(400).send(`User with email '${email}' already exists`);
    }

    await participants.set(email, {
      firstname,
      lastname,
      dob,
      active,
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
});

router.get("/work/:email", async function (req, res) {
  try {
    const participant = await participants.get(req.params.email);

    if (!participant || participant.props.active !== true) {
      return res
        .status(404)
        .json(`Could not find participant with email '${req.params.email}'`);
    }

    const { work } = participant.props;

    res.status(200).send({
      companyname: work.companyname,
      salary: work.salary,
      currency: work.currency,
    });
  } catch (error) {
    res.status(500).send("Could not get participant");
  }
});

router.get("/home/:email", async function (req, res) {
  try {
    const participant = await participants.get(req.params.email);

    if (!participant || participant.props.active !== true) {
      return res
        .status(404)
        .json(`Could not find participant with email '${req.params.email}'`);
    }

    const { home } = participant.props;

    res.status(200).send({
      country: home.country,
      city: home.city,
    });
  } catch (error) {
    res.status(500).send("Could not get participant");
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

router.put("/", validateUser, async function (req, res) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, firstname, lastname, dob, work, home, active } = req.body;

  try {
    const user = await participants.get(email);

    if (!user) {
      return res.status(400).send(`User with email '${email}' was not found`);
    }

    await participants.set(email, {
      firstname,
      lastname,
      dob,
      active,
      work,
      home,
    });

    res.status(200).send(`User with email '${email}' updated`);
  } catch (error) {
    res.status(500).send("Could not update user");
  }
});

router.delete("/", async function (req, res, next) {
  await participants.delete("alma@gmail.com");

  res.status(200).send("Yolo");
});

module.exports = router;
