import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { uploadonCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import fs from "fs";
import jwt from "jsonwebtoken";

// ---------------------------------------------------------
// Utility: safely delete a file if it exists (local cleanup)
// ---------------------------------------------------------

const deleteFileIfExists = (filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

// ---------------------------------------------------------
// Utility: Generate Access + Refresh tokens for a user
// ---------------------------------------------------------

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    // console.log("user:\n\n",user)

    // Generate new tokens using schema methods
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // Save refreshToken in DB (persistent login)
    user.refreshToken = refreshToken;
    await user.save({
      validateBeforeSave: false, //validateBeforeSave:false means: skip Mongoose validation (since we’re only saving a token, not full user data).
    });

    return { accessToken, refreshToken };
  } catch (err) {
    console.log("\n\nError is :\n", err, "\n\n\n");
    throw new ApiError(
      500,
      "Something went wrong while Generating Refresh And Access Tokens"
    );
  }
};

// ---------------------------------------------------------
// Register a new user
// ---------------------------------------------------------

const registerUser = asyncHandler(async (req, res) => {
  //get user details from fronend
  const { fullname, email, username, password } = req.body;

  //validation - not empty
  if (
    [fullname, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  //check if user already exists: username,email
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  //check for images, check for avatars
  const avatarLocalPath = req.files?.avatar[0]?.path;
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files?.coverImage[0]?.path;
  }

  if (existedUser) {
    // Cleanup uploaded files if user already exists
    deleteFileIfExists(avatarLocalPath);
    deleteFileIfExists(coverImageLocalPath);
    throw new ApiError(409, "User with email or username already exist");
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar image is required");
  }

  //If everything's alright, Upload them to cloudinary
  const avatar = await uploadonCloudinary(avatarLocalPath);
  const coverImage = await uploadonCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar image is required");
  }

  //create user object
  const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverImage: coverImage?.url || "", //as it's optional
    email,
    password,
    username: username.toLowerCase(),
  });

  //check for user creation
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering User");
  }
  //return res
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User Registed Successfully"));

  // console.log("\n\n----------req.body--------:\n",req.body,"\n--------------end----------------\n");
});

// ---------------------------------------------------------
// Login user
// ---------------------------------------------------------

const loginUser = asyncHandler(async (req, res) => {
  //get user details from fronend
  const { email, username, password } = req.body;
  //validation - not empty
  if (!username && !email) {
    throw new ApiError(400, "Either username or email is required!");
  }
  if (!password) {
    throw new ApiError(400, "Password is required!");
  }
  //check if user exists: based on input username or email if not suugest it to register first
  // ✅ Find user by email/username
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!existedUser) {
    throw new ApiError(404, "User Does not exist , Kindly Register ");
  }
  //if yes check it's password
  // ✅ Verify password
  const isPasswordValid = await existedUser.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credential");
  }
  //send assess Token and refresh token
  // ✅ Generate tokens
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    existedUser._id
  );

  // Remove sensitive fields
  const loggedInUser = await User.findById(existedUser._id).select(
    "-password -refreshToken"
  );

  // Cookie options (httpOnly → can’t access via JS, secure → HTTPS only)
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // only secure in prod
    sameSite: "Strict", // helps prevent CSRF
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };

  
  //send cookies
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "User Logged in Succefully"
      )
    );
});

// ---------------------------------------------------------
// Logout user (clear refreshToken from DB & cookies)
// ---------------------------------------------------------

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
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

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User LoggedOut Succefully"));
});

// ---------------------------------------------------------
// Refresh Access Token (when access token expires)
// ---------------------------------------------------------

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized Request");
  }

  try {
    // Verify refresh token
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid Refresh Token");
    }

    // Ensure token matches DB-stored refreshToken
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh Token is Expired or Used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    // Generate new pair of tokens
    const { newrefreshToken, accessToken } =
      await generateAccessAndRefreshToken(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newrefreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken,
            refreshToken: newrefreshToken,
          },
          "Access Token Refreshed Successfully"
        )
      );
  } catch (error) {
    throw new ApiError(401, "Invalid Refresh Token");
  }
});

// ---------------------------------------------------------
// Change current password
// ---------------------------------------------------------

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);
  const isPasswordValid = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordValid) {
    throw new ApiError(400, "Invalid old Password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: true });

  return res
    .status(200)
    .json(new ApiResponse(200, "Password Changed Successfully"));
});

// ---------------------------------------------------------
// Get current logged-in user
// ---------------------------------------------------------

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

// ---------------------------------------------------------
// Update account details (fullname + email)
// ---------------------------------------------------------
const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullname, email } = req.body;

  if (!fullname || !email) {
    throw new ApiError(400, "All fields are required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullname,
        email,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated Successfully"));
});

// ---------------------------------------------------------
// Update Avatar
// ---------------------------------------------------------

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  const avatar = await uploadonCloudinary(avatarLocalPath);

  if (!avatar?.url) {
    throw new ApiError(400, "Error while uploading on avatar ");
  }

  //todo: //delete the previous one from cloudinary

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar Updated Successfully"));
});

// ---------------------------------------------------------
// Update Cover Image
// ---------------------------------------------------------

const updateUserCover = asyncHandler(async (req, res) => {
  const CoverLocalPath = req.file?.path;

  if (!CoverLocalPath) {
    throw new ApiError(400, "Cover Image file is missing");
  }

  const Cover = await uploadonCloudinary(CoverLocalPath);

  if (!Cover?.url) {
    throw new ApiError(400, "Error while uploading on Cover ");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: Cover.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "CoverImage Updated Successfully"));
});

// ---------------------------------------------------------
// Get User Channel Profile (with subscriptions info)
// ---------------------------------------------------------

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(400, "Username not found");
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelSubscribesToCount: {
          $size: "subscribedTo",
        },
        isSubscribed: {
          if: { $in: [req.user?._id, "$subscribers.subscriber"] },
          then: true,
          else: false,
        },
      },
    },
    {
      $project: {
        fullname: 1,
        username: 1,
        subscribersCount: 1,
        channelSubscribesToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);

  if (!channel?.length) {
    throw new ApiError(404, "channel does not exist");
  }

  return res.status(
    (200).json(
      new ApiResponse(200, channel[0], "User channel fetched successfully")
    )
  );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCover,
  getCurrentUser,
  changeCurrentPassword,
  getUserChannelProfile,
};
