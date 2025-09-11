// require('dotenv').config({path:'./env'})
import dotenv from 'dotenv'         //to use environment variables 
import connectDB from "./db/db.js";         //to import db file
import { app } from './app.js';             // to import app.js

dotenv.config({path:'./.env'})              // configuring the env file to use the secret variables

connectDB()                              // connecting the DB by calling the imported function
.then(()=>{                              // it returns a promise so we use "then" to run the callback if successfull
    try{
        app.listen(process.env.PORT || 8000,()=>{                   //run the server once DB is connected
            console.log(`Server is Running on Port ${process.env.PORT}`)
        })
    }
    catch(err){
        console.log("Server not connected due to error :",err)      //handle server connection errors
    }
})
.catch((err)=>{                     //handles DB connection errors
    console.log("MONGO DB connection failed",err)
})