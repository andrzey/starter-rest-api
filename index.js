const express = require("express");
const app = express();
const participantsRouter = require("./routes/participants");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/participants", participantsRouter);

// Catch all handler for all other request.
app.use("*", (req, res) => {
  res.json({ msg: "no route handler found" }).end();
});

// Start the server
const port = process.env.PORT || 3002;
app.listen(port, () => {
  console.log(`index.js listening on ${port}`);
});
