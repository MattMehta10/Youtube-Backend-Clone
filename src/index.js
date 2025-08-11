// require('dotenv').config({path:'./env'})
import dotenv from 'dotenv'
import connectDB from "./db/db.js";
import { app } from './app.js';

dotenv.config({path:'./env'})

connectDB()
.then(()=>{
    try{
        app.listen(process.env.PORT || 8000,()=>{
            console.log("Server is Running on Port 8000 ")
        })
    }
    catch(err){
        console.log("Server not connected due to error :",err)
    }
})
.catch((err)=>{
    console.log("MONGO DB connection failed",err)
})