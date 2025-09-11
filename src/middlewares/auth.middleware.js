import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";

// Middleware to verify Access Token (JWT)
export const verifyJWT = asyncHandler(async(req,_,next)=>{
    try {
        // 1️⃣ Extract token:
        // - First try to get from cookies (common when using httpOnly cookie auth)
        // - If not, try from "Authorization" header (format: "Bearer <token>")
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer","")
    
          // If no token found → user is not authenticated
        if(!token){
            throw new ApiError(401,"Unauthorized request")
        }
    
        // 2️⃣ Verify and decode the token using ACCESS_TOKEN_SECRET
        // - jwt.verify() checks signature + expiry
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
         
        // 3️⃣ Find the user in DB by decoded _id
        // - Remove sensitive fields like password & refreshToken
        const user=await User.findById(decodedToken?._id).select("-password -refreshToken")
    
        if (!user){     // If no user found → token is invalid or user deleted
            throw new ApiError(401,"invalid AccessToken")
        }
    
        // 4️⃣ Attach user object to request
        // - Now downstream routes/middlewares can access req.user
        req.user=user;

        // 5️⃣ Call next() to pass control to the next middleware/route
        next()
    } catch (error) {
        
        // Any error (invalid token, expired token, DB issue) → Unauthorized
        throw new ApiError(401, error?.message || "Invalid Access Token")
    }
})
