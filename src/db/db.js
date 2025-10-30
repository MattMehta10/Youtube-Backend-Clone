import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URL}/${DB_NAME}`
    ); //connect to mongoDB using the passed connection string
    console.log(
      `\nMongoDB connected!! DB Host:${connectionInstance.connection.host}`
    );
  } catch (err) {
    console.log("MONGODB connection error", err);
    process.exit(1); //exit and stop the server in case of connection failure with the Database
  }
};

export default connectDB;
