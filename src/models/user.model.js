import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    avatar: {
      type: String, // cloudinary image url
      required: true,
    },
    cover: {
      type: String,
    },
    watchHistory: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    password: {
      type: String,
      required: [true, "password is required"],
    },
    refreshToken: {
      type: String,
    },
  },
  { timeStamps: true }
);

// middleware function in a Mongoose schema, specifically a pre-save hook. It is used to hash the password before saving it to the database.
userSchema.pre("save", async function (next) {
  // checks whether the "password" field (this.password) has been modified. The isModified() method of the Mongoose schema is used for this purpose. It takes the name of the field as an argument and returns true if the field has been modified since it was last saved, and false otherwise.
  if(!this.isModified("password")) {
    return next();
  }

  // If the password has been modified, meaning it's a new password or an updated one, this part hashes the password using bcrypt.
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// defines a new method called isPasswordCorrect on the schema's methods object. isPasswordCorrect method allows you to check if a given plain-text password matches the hashed password stored in a user document. It's typically used during authentication to verify user credentials.
userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// defines a new method called isPasswordCorrect on the schema's methods object.
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      fullName: this.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};

// defines a new method called isPasswordCorrect on the schema's methods object.
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};

export const User = mongoose.model("User", userSchema);
