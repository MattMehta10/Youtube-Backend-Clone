// app.js is used to use express and the middlewares and defining Routes
import express from 'express';                    
import cors from "cors"
import cookieParser from 'cookie-parser';
import userRouter from './routes/user.routes.js'

const app = express();          //importing all powers of express into the app reference variable

app.use(cors({                              // using cors middleware to allow requests from origin different from backend. eg: frontend
    origin:process.env.CORS_ORIGIN,           //defines what all origins are allowed
    credentials:true                           // allows cookies and authentication headers to be sent in cross-origin requests
}))

app.use(express.json({
    limit:"16kb"                            //let's you handle json data from frontend but within a limit of 16kb
}))

app.use(express.urlencoded({                //let's you handle data from Forms from frontend
    extended:true,                           //allows nested objects inside forms (not just plain key=value).
    limit:"16kb"                              //again ensures payload size control.
}))

app.use(express.static("public"))       //let's us use static files in public folder and server to frontend

app.use(cookieParser())             //let backend handle cookie at front end

//routes import 

app.use("/api/v1/users",userRouter)             // mounts all the user routes in the userRouter.js under /api/v1/users/...

export { app }