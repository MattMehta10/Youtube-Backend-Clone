import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";   // for creating JWT access & refresh tokens
import bcrypt from 'bcrypt'       // for hashing and comparing passwords

const userSchema = new Schema(
    {
        username:{
            type:String,
            required:true,
            unique:true,
            lowercase:true,
            trim:true,
            index:true // adds DB index for faster queries
        },
        email:{
            type:String,
            require:true,
            unique:true,
            lowercase:true,
            trim:true
        },
        fullname:{
            type:String,
            required:true,
            trim:true,
            index:true
        },
        avatar:{
            type:String,    // profile picture (stored as URL, e.g., Cloudinary)
            required:true
        },
        coverImage:{
            type:String
        },
        watchHistory:[      // stores a list of video IDs the user watched
            {
                type:Schema.Types.ObjectId,
                ref:"Video"
            }
        ],
        password:{                  // encrypted password (never stored as plain text)
            type:String,
            require:[true,"Password is required"]
        },
        refreshToken:{                  // stores the refresh token (used for reissuing access tokens)
            type:String
        }
    },{timestamps:true}          // adds createdAt and updatedAt fields automatically
)


// Pre-save Middleware  -----------------------------------------

userSchema.pre('save',async function(next){
    if(!this.isModified('password')) return next(); //if the password field is not modified then skip this middleware
    // If user updates other fields (e.g., email), password won’t be re-hashed unnecessarily.
    
    //Run on Initial password setting and everytime it's changed
    //This ensures passwords are always saved hashed (never plain text).
    this.password = await bcrypt.hash(this.password,10)
    next()
})
//---------------------------------------------------------------



//Custom Schema Methods -----------------------------------------

userSchema.methods.isPasswordCorrect = async function (password) {
    // Takes raw password from login form.

    return await bcrypt.compare(password,this.password)
    // Compares it with hashed password in DB----↑.
    // Returns true or false.
}
//---------------------------------------------------------------



// What is an Access Token?
// A short-lived token (e.g., expires in 15 min).
// Generated when a user logs in.
// It is a JWT - JSON Web Token
// Example structure (JWT): header.payload.signature
    // header: info about algorithm (e.g., HS256).
    // payload: user details (id, email, roles).   
    // signature: ensures the token wasn’t modified.
// Main Purpose → Allow the client (browser, mobile app) to access protected resources without re-checking password every time.

// 🛠 How it works:

// User logs in with username/password.
// Server verifies credentials → generates accessToken.
// Client stores it in memory, cookie, or local storage.
// For every API request → client sends token in Authorization header:
// Authorization: Bearer <access_token>
// Server verifies token’s signature + expiry → if valid → gives access.


userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id:this._id,
            email:this.email,
            username:this.username,
            fullname:this.fullname
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )    
}
// ⚠️ Limitation of Access Tokens:
// Short lifespan → they expire quickly (e.g., 15m).
// Once expired → user can’t call APIs unless they log in again.
// 👉 That’s why we need Refresh Tokens


// What is a Refresh Token?
// A long-lived token (e.g., expires in 7 days or 30 days).
// Also a JWT, but stored securely (e.g., in HTTP-only cookie, not in localStorage).
// Only used to request a new Access Token when the old one expires.

// ✅ Main Purpose → Keep the user logged in without asking for username/password repeatedly.

// 🛠 How it works:
// When user logs in → server sends both:
    // accessToken (short expiry, e.g., 15m)
    // refreshToken (long expiry, e.g., 7d)

// Client stores:
    // Access Token → memory (for API calls).
    // Refresh Token → HTTP-only cookie or database (more secure).

// When Access Token expires:
    // Client silently calls an endpoint like /refresh-token
    // Sends refresh token.

// Server verifies refresh token:
    // If valid → issues new accessToken.
    // If invalid/expired → user must log in again


    userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id:this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )    
}
export const User = mongoose.model('User',userSchema)