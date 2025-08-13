import { v2 as cloudinary } from "cloudinary";
import fs from "fs"

cloudinary.config({ 
       cloud_name:process.env.CLOUDINARY_CLOUD_NAME, 
       api_key: process.env.CLOUDINARY_API_KEY, 
       api_secret: process.env.CLOUDINARY_API_SECRET, // Click 'View API Keys' above to copy your API secret
   });

const uploadonCloudinary = async (localFilePath)=>{
    try{
        if(!localFilePath) return null
        //upload file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type:"auto",
        })
        //file has been successfully uploaded 
        fs.unlinkSync(localFilePath)
        console.log("------------------------\nresponse:\n",response,"\n\n-------------response End Here---------")
        return response;
    }
    catch(err){
        fs.unlinkSync(localFilePath) // removes the locally saved file 
        return null
    }
}


export {uploadonCloudinary}