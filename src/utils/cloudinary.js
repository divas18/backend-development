import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET_KEY,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) {
      throw new Error("File path is invalid");
    }
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    // File has uploaded successfully
    // console.log("File has uploaded successfully", response.url);
    fs.unlinkSync(localFilePath);
    return response;
  } catch (err) {
    // remove the locally saved temporary file as the upload operation got failed
    fs.unlinkSync(localFilePath);
    return null;
  }
};

export { uploadOnCloudinary };
