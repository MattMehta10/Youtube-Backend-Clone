import { v2 as cloudinary } from "cloudinary";      // import Cloudinary SDK (version 2 API)
import fs from "fs"     // Node.js file system module (to handle local files)

// 🔹 Configure Cloudinary using environment variables from .env

cloudinary.config({ 
       cloud_name:process.env.CLOUDINARY_CLOUD_NAME, 
       api_key: process.env.CLOUDINARY_API_KEY, 
       api_secret: process.env.CLOUDINARY_API_SECRET, // NEVER hardcode this, keep in .env
   });


   // 🔹 Utility function to upload files to Cloudinary
const uploadonCloudinary = async (localFilePath)=>{
    try{
        if(!localFilePath) return null      // if no file path is provided, return null immediately
        //Upload file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type:"auto",       // auto-detects whether file is image, video, pdf, etc.
        })
        // Once uploaded, remove the file from local storage to save space
        fs.unlinkSync(localFilePath)
        // console.log("------------------------\nresponse:\n",response,"\n\n-------------response End Here---------")
        return response;    // return Cloudinary's response (URL, public_id, etc.)
    }
    catch(err){
        // If something goes wrong during upload, still remove the local file
        fs.unlinkSync(localFilePath) 
        return null         // Return null so caller knows upload failed
    }
}


export {uploadonCloudinary}