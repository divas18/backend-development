import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (request, response, next) => {
  //   response.status(200).json({
  //     message: "ok",
  //   });

  // get details from frontend
  // validation (check for empty field)
  // check if user already exist: username or email
  // check images, check for avatar
  // upload them to cloudinary, avatar
  // create user object- create entry in db
  // remove password and refresh token field from response
  // check user creation
  // return response

  const { fullName, email, username, password } = request.body;

  // validation
  if (Object.keys(request.body).length === 0 ||
    [fullName, email, username, password].some((field) => field?.trim === "")
  ) {
    throw new ApiError(400, "All feild is required");
  }
  // Checking for existed user
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exist");
  }

  const avatarLocalPath = request.files?.avatar[0]?.path;
  const coverImageLocalPath = request.files?.coverImage[0]?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
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

export { registerUser };
