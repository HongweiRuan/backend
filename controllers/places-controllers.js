const fs = require("fs");

const { validationResult } = require("express-validator");
const mongoose = require("mongoose");

const HttpError = require("../models/http-error");
const getCoordsForAddress = require("../util/location");
const Place = require("../models/place");
const User = require("../models/user");


const getPlacesById = async (req, res, next) => {
  const placeId = req.params.pid; // { pid: 'p1' }

  let place;

  try {
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError("Something went wrong.", 500);

    return next(error);
  }

  if (!place) {
    const error = new HttpError("Could not find place for the provided id", 404);

    return next(error);
  }

  res.json({ place: place.toObject({ getters: true }) }); // => { place } => { place: place }
};

const getPlaceByUserId = async (req, res, next) => {
  const userId = req.params.uid; // { pid: 'p1' }

  let userWithPlaces;

  try {
    userWithPlaces = await User.findById(userId).populate("places");
  } catch (err) {
    const error = new HttpError("Something went wrong.", 500);

    return next(error);
  }

  if (!userWithPlaces || userWithPlaces.places.length === 0) {
    const error = new HttpError("Could not find places for the provided user id", 404);

    return next(error);
  }

  res.json({ places: userWithPlaces.places.map((place) => place.toObject({ getters: true })) });
};

const createPlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    next(new HttpError("Invalid inputs", 422));
  }

  const { title, description, address, creator } = req.body;

  let coordinates;

  try {
    coordinates = await getCoordsForAddress(address);
  } catch (error) {
    return next(error);
  }

  const createdPlace = new Place({
    title,
    description,
    address,
    location: coordinates,
    image: req.file.path,
    creator,
  });

  let user;
  try {
    user = await User.findById(creator);
  } catch (err) {
    const error = new HttpError("Creating place failed", 500);
    return next(error);
  }

  if (!user) {
    const error = new HttpError("Could not find user for provided id", 404);
    return next(error);
  }



  try {
    const session = await mongoose.startSession();
    session.startTransaction();

    await createdPlace.save({ session: session });
    user.places.push(createdPlace);
    await user.save({ session: session });

    await session.commitTransaction();

  } catch (err) {
    const error = new HttpError("Creating place failed", 500);
    return next(error);
  }

  res.status(201).json({ place: createdPlace });
};

const updatePlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError("Invalid updates", 422));
  }

  const { title, description } = req.body;
  const placeId = req.params.pid;

  let updatedPlace;

  try {
    updatedPlace = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError("Something went wrong when updating.", 500);

    return next(error);
  }

  updatedPlace.title = title;
  updatedPlace.description = description;

  try {
    await updatedPlace.save();
  } catch (err) {
    const error = new HttpError("Something went wrong when updating(save)", 500);

    return next(error);
  }

  res.status(200).json({ updatedplace: updatedPlace.toObject({ getters: true }) });
};

const deletePlace = async (req, res, next) => {
  const placeId = req.params.pid;

  let deletePlace;

  try {
    deletePlace = await Place.findById(placeId).populate("creator");
  } catch (err) {
    const error = new HttpError("Something went wrong when deleting.", 500);
    return next(error);
  }

  if (!deletePlace) {
    const error = new HttpError("Could not find place for this id.", 404);
    return next(error);
  }

  const imagePath = deletePlace.image;

  try {
    const session = await mongoose.startSession();
    session.startTransaction();

    await deletePlace.deleteOne({ session: session });
    deletePlace.creator.places.pull(deletePlace);
    await deletePlace.creator.save({ session: session });

    await session.commitTransaction();
  } catch (err) {
    const error = new HttpError("Something went wrong when deleting.", 500);
    return next(error);
  }

  fs.unlink(imagePath, (err) => {
    // console.log(err);
  });

  res.status(200).json({ message: " Deleted place." });
};

exports.getPlacesById = getPlacesById;
exports.getPlaceByUserId = getPlaceByUserId;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;
