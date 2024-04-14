import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh token"
    );
  }
};

const registerUser = asyncHandler(async (request, response, next) => {
  /*
  Todos
    1. get details from frontend
    2. validation (check for empty field)
    3. check if user already exist: username or email
    4. check images, check for avatar
    5. upload them to cloudinary, avatar
    6. create user object- create entry in db
    7. remove password and refresh token field from response
    8. check user creation
    9. return response
  */

  const { fullName, email, username, password } = request.body;

  // validation
  if (
    Object.keys(request.body).length === 0 ||
    [fullName, email, username, password].some((field) => field?.trim === "")
  ) {
    throw new ApiError(400, "All feild is required");
  }
  // Checking for existed user using this syntax we can check for username or email both at same time
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exist");
  }

  const avatarLocalPath = request.files?.avatar[0]?.path;
  // const coverImageLocalPath = request.files?.coverImage[0]?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  let coverImageLocalPath;
  if (
    request.files &&
    Array.isArray(request.files.coverImage) &&
    request.files.coverImage.length > 0
  ) {
    coverImageLocalPath = request.files.coverImage[0].path;
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: String(username).toLowerCase(),
  });

  //  remove password and refresh token field from response
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  return response
    .send(201)
    .json(new ApiResponse(200, createdUser, "user register successfully"));
});

const loginUser = asyncHandler(async (request, response, next) => {
  /* 
    Todo's 
    1. get data from frontend
    2. validate the information provided by user
    3. check user is available or not on DB (username or email)
    4. check password is correct password provided by user or not
    5. password is correct Login & access & refreshtoken generate otherwise throw error wrong password
    6. send cookies
  */

  const { email, username, password } = request.body;

  if (!username && !email) {
    throw new ApiError(400, "username or password is required");
  }

  // Check whether username or email exist in DB
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return response
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          refreshToken,
          accessToken,
        },
        "User logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (request, response, next) => {
  await User.findByIdAndUpdate(
    request.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return response
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out Successfully"));
});

const refreshAccessToken = asyncHandler(async (request, response, next) => {
  const incomingRefreshToken =
    request.cookies?.refreshToken || req.body?.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request");
  }

  try {
    const decodedTOken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedTOken?._id);

    if (!user) {
      throw new ApiError(401, "invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "refresh Token is expired or used");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      user._id
    );

    return response
      .status(200)
      .cookie("accessToken", accessToken)
      .cookie("refreshToken", refreshToken)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken },
          "Access Token updated successfully"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh Token");
  }
});

const changeCurrentPassword = asyncHandler(async (request, response, next) => {
  const { oldPassword, newPassword, confPassword } = request.body;

  if (newPassword !== confPassword) {
    throw new ApiError(400, "new password and confirm password are not same");
  }

  const user = User.findById(request.user?._id); // request.user?._id is available because of auth middleware
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "invalid old password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return response
    .status(200)
    .json(new ApiResponse(200, {}, "password change successfully"));
});

const getCurrentUser = asyncHandler(async (request, response, next) => {
  const currentUser = request.user;

  return response
    .status(200)
    .json(new ApiResponse(200, currentUser, "current user information"));
});

const updateAccountDetails = asyncHandler(async (request, response, next) => {
  const { fullName, email } = request.body;

  if (!fullName || !email) {
    throw new ApiError(400, "All feild are required");
  }

  const user = User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName: fullName,
        email: email,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  return response
    .status(200)
    .json(
      new ApiResponse(200, user, "Account Details are Updated Successfully")
    );
});

const updateUserAvatar = asyncHandler(async (request, response, next) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Error while uploading Avatar to cloudinary");
  }

  const user = await User.findByIdAndUpdate(
    request.user?._id,
    {
      $set: {
        avatar: avatar?.url,
      },
    },
    {
      new: true,
    }
  ).select("-password -refreshToken");

  return response
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"));
});

const updateUserCoverImage = asyncHandler(async (request, response, next) => {
  const coverImageLocalPath = request.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover Image file is missing");
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage) {
    throw new ApiError(400, "Error while uploading Cover Image on Cloudinary");
  }
  const user = User.findByIdAndUpdate(
    request.user?._id,
    {
      $set: {
        coverImage: coverImage?.url,
      },
    },
    {
      new: true,
    }
  ).select("-password -refreshToken");

  return response
    .status(200)
    .json(new ApiResponse(200, user, "Cover image updated Successfully"));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
};
