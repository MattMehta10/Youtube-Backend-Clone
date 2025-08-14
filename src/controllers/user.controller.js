import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { uploadonCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import fs from "fs"
import jwt  from "jsonwebtoken";



const deleteFileIfExists = (filePath) => {
    if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
};

const generateAccessAndRefreshToken = async (userId)=>{
    try{
        const user = await User.findById(userId)
        // console.log("user:\n\n",user)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave:false })

        return {accessToken,refreshToken}
    }
    catch(err){
        console.log("\n\nError is :\n",err,"\n\n\n")
        throw new ApiError(500,"Something went wrong while Generating Refresh And Access Tokens")
    }
}


const registerUser = asyncHandler(async(req,res)=>{
    //get user details from fronend
    //validation - not empty
    //check if user already exists: username,email
    //check for images, check for avatars
    //ipload them to cloudinary, avatar
    //create user object and refresh token field from response 
    //check for user creation
    //return res


    const {fullname,email,username,password}=req.body
    // console.log("\n\n----------req.body--------:\n",req.body,"\n--------------end----------------\n");
    if(
        [fullname,email,username,password].some((field)=>field?.trim === '')
    ){
        throw new ApiError(400,"All fields are required")
    }

    const existedUser = await User.findOne({
        $or:[{ username },{ email }]
    })

    
        const avatarLocalPath = req.files?.avatar[0]?.path
        // const 
        let coverImageLocalPath ;
        if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
            coverImageLocalPath = req.files?.coverImage[0]?.path
        }
        

    if (existedUser){
        deleteFileIfExists(avatarLocalPath);
        deleteFileIfExists(coverImageLocalPath)
        throw new ApiError(409,"User with email or username already exist")
    }
    
    
    // console.log(req.files)





    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar image is required")
    }

    const avatar = await uploadonCloudinary(avatarLocalPath)
    const coverImage = await uploadonCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400,"Avatar image is required")
    }


    const user = await User.create({
        fullname,
        avatar:avatar.url,
        coverImage: coverImage?.url || '',
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken")

    if(!createdUser){
        throw new ApiError(500,"Something went wrong while registering User")
    }

    return res.status(201).json(
        new ApiResponse(200,createdUser,"User Registed Successfully")
    )
})


const loginUser = asyncHandler( async(req,res)=>{
    //get user details from fronend
    //validation - not empty
    //check if user exists: based on input username or email if not suugest it to register first 
    //if yes check it's password
    //send assess Token and refresh token
    //send cookies
    const {email , username,password} = req.body
    if(!(username || email)) {
        throw new ApiError(400,"username or email is required")
    }

    const existedUser = await User.findOne({
        $or:[{ username },{ email }]
    })

    if(!existedUser){
        throw new ApiError(404,"User Doesnot exist")
    }

    const isPasswordValid = await existedUser.isPasswordCorrect(password)
    if (!isPasswordValid) {
        throw new ApiError(401,"Invalid user credential")
    }

    const {accessToken,refreshToken}=await generateAccessAndRefreshToken(existedUser._id)

    const loggedInUser = await User.findById(existedUser._id).select("-password -refreshToken")


    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(200,{
            user : loggedInUser,accessToken,refreshToken
        },
        "User Logged in Succefully"
)
    )

})


const logoutUser = asyncHandler( async (req,res)=>{
    await User.findByIdAndUpdate(
    req.user._id,
    {
        $set:{
            refreshToken:undefined
        }
    },
    {
        new:true
    }
    )
    
    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(
        new ApiResponse(200,{},
        "User LoggedOut Succefully"
    ))
})

const refreshAccessToken = asyncHandler(async(req,res)=>{
   const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken


   if(!incomingRefreshToken){
    throw new ApiError(401,"Unauthorized Request")
   }

   try {
    const decodedToken = jwt.verify(
     incomingRefreshToken,
     process.env.REFRESH_TOKEN_SECRET
    )
 
    const user = await User.findById(decodedToken?._id)
 
    if(!user){
         throw new ApiError(401,"Invalid Refresh Token")
    }
 
    if(incomingRefreshToken !== user?.refreshToken){
         throw new ApiError(401,"Refresh Token is Expired or Used")
    }
 
    const options = {
         httpOnly:true,
         secure:true
    }
 
    const { newrefreshToken , accessToken } =await generateAccessAndRefreshToken(user._id)
 
    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",newrefreshToken,options)
    .json(
     new ApiResponse(
         200,
         {
             accessToken, refreshToken: newrefreshToken
         },
         "Access Token Refreshed Successfully"
     )
    )
   } catch (error) {
        throw new ApiError(401,"Invalid Refresh Token")
   }
})


const changeCurrentPassword = asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword} = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordValid = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordValid){
        throw new ApiError(400,"Invalid old Password")
    }

    user.password=newPassword
    await user.save({validateBeforeSave:true})

    return res
    .status(200)
    .json(new ApiResponse(200,"Password Changed Successfully"))

})



const getCurrentUser = asyncHandler(async (req,res)=>{

    return res
    .status(200)
    .json(200,req.user , "Current user fetched successfully" )
})

const updateAccountDetails = asyncHandler(async(req,res)=>{

    const {fullname,email} = req.body

    if(!fullname || !email){
        throw new ApiError(400,"All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullname,
                email
            }
        },
        {new:true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200,user,"Account details updated Successfully"))
})



const updateUserAvatar = asyncHandler(async(req,res)=>{

    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is missing")
    }

    const avatar = await uploadonCloudinary(avatarLocalPath)

    if(!avatar?.url){
        throw new ApiError(400,"Error while uploading on avatar ")
    }


    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {new:true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Avatar Updated Successfully")
    )


})



const updateUserCover = asyncHandler(async(req,res)=>{

    const CoverLocalPath = req.file?.path

    if(!CoverLocalPath){
        throw new ApiError(400,"Cover Image file is missing")
    }

    const Cover = await uploadonCloudinary(CoverLocalPath)

    if(!Cover?.url){
        throw new ApiError(400,"Error while uploading on Cover ")
    }


    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage:Cover.url
            }
        },
        {new:true}
    ).select("-password")


     return res
    .status(200)
    .json(
        new ApiResponse(200, user, "CoverImage Updated Successfully")
    )

})


export {registerUser,loginUser,logoutUser,refreshAccessToken,updateAccountDetails,updateUserAvatar,updateUserCover,getCurrentUser,changeCurrentPassword}