import { asyncHandler } from "../utils/asyncHandler.js";

const registerUser = asyncHandler(async (request, response, next) => {
  response.status(200).json({
    message: "ok",
  });
});

export { registerUser };
