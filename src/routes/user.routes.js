import { Router } from "express";
import { 
  changeCurrentPassword, 
  getCurrentUser, 
  getUserChannelProfile, 
  loginUser, 
  logoutUser, 
  refreshAccessToken, 
  registerUser, 
  updateAccountDetails, 
  updateUserAvatar, 
  updateUserCover 
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Public Routes
router.post(
  "/register",
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 }
  ]),
  registerUser
);

router.post("/login", loginUser);
router.post("/refresh-token", refreshAccessToken);

// Protected Routes
router.post("/logout", verifyJWT, logoutUser);
router.patch("/change-password", verifyJWT, changeCurrentPassword);
router.get("/get-user", verifyJWT, getCurrentUser);
router.patch("/update-details", verifyJWT, updateAccountDetails);
router.patch("/update-details/avatar", verifyJWT, upload.single("avatar"), updateUserAvatar);
router.patch("/update-details/coverImage", verifyJWT, upload.single("coverImage"), updateUserCover);
router.get("/getChannelProfile/:username", verifyJWT, getUserChannelProfile);

export default router;
