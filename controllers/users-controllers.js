const { v4: uuidv4 } = require("uuid");
const { validationResult } = require("express-validator");

const HttpError = require("../models/http-error");

let DUMMY_USERS = [
  {
    id: "u1",
    username: "MAX",
    email: "max@qq.com",
    password: "12345678",
  },
];

const getUsers = (req, res, next) => {
  res.json({ users: DUMMY_USERS });
};

const signup = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new HttpError("Invalid updates", 422);
  }

  const { username, email, password } = req.body;

  const hasUser = DUMMY_USERS.find((u) => (u.email = email));
  if (hasUser) {
    throw new HttpError("User already exists!", 422);
  }

  const newUser = {
    id: uuidv4(),
    username: username,
    email: email,
    password: password,
  };

  DUMMY_USERS.push(newUser);

  res.status(201).json({ user: newUser });
};

const login = (req, res, next) => {
  const { email, password } = req.body;

  const verifyUser = DUMMY_USERS.find((u) => u.email === email);

  if (!verifyUser) {
    throw new HttpError("You don't have an account, please sign up", 401);
  }

  if (verifyUser.password === password) {
    res.json({ message: "logged in!" });
  } else {
    res.json("Your password is not correct!");
  }
};

exports.getUsers = getUsers;
exports.signup = signup;
exports.login = login;
