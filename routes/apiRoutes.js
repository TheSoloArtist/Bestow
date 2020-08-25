const axios = require("axios");
const mongoose = require("mongoose");
const db = require("../models");
const argon2 = require("argon2");
const session = require("express-session");

mongoose.Promise = Promise;

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const mongooseConnection = mongoose.connection;

// If there is an error while connecting, it logs the error
mongooseConnection.on(
  "error",
  console.error.bind(console, "connection error:")
);

// When mongoose connects, it console logs that it's connected
mongooseConnection.once("open", function () {
  console.log("Connected to Database");
});

module.exports = (app) => {
  // ================================================================
  // SESSION COOKIE
  // ================================================================

  app.use(
    session({
      name: "sid",
      saveUninitialized: false,
      resave: false,
      secret: process.env.SECRET_KEY,
      cookie: {
        maxAge: 288000000,
        sameSite: true,
      },
    })
  );

  // ================================================================
  // API ROUTES
  // ================================================================

  app.post("/register", async (req, res) => {
    const { username, password } = req.body;

    const hashword = await argon2.hash(password);

    await db.User.findOne({ username: username }, "username", (err, resp) => {
      if (err) return handleError(err);
    }).then((resp) => {
      if (resp === null) {
        db.User.create({
          username: username,
          password: hashword,
        })
          .then((resp) => {
            req.session.user = username;
            res.send(req.session);
          })
          .catch((err) => res.json(err));
      }
    });
  });

  app.post("/login", async (req, res) => {
    const { username, password } = req.body;

    await db.User.findOne(
      { username: username },
      "username password",
      (err, resp) => {
        if (err) return handleError(err);
      }
    )
      .then(async (resp) => {
        var searchSet = resp.password;

        const valid = await argon2.verify(searchSet, password);

        if (valid) {
          req.session.user = resp.username;
          res.send(req.session);
        } else {
          res.send(req.session);
        }
      })
      .catch((err) => {
        res.send(err);
      });
  });

  app.post("/add-drink", async (req, res) => {
    var currentUser = req.session.userId;

    await db.SiteDrink.create({
      owner: currentUser,
      coffeeShop: req.body.coffeeShop,
      isHot: req.body.isHot.value,
      drinkName: req.body.drinkName,
      specialInstructions: req.body.specialInstructions,
    }).then((resp) => {
      res.send(resp);
    });
  });
};
