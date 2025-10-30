// Subscription Model Document: 
// + ---------------------------------------------------------------------- +
// |       Each subscription document represents a relationship:            |
// |                                                                        |
// |      “User A (subscriber) is subscribed to User B (channel)”           |
// + ---------------------------------------------------------------------- +

import mongoose, { Schema } from "mongoose";
// Define the schema (blueprint) for subscriptions
const subscriptionSchema = new Schema({
      // The user who is subscribing to a channel
    subscriber:{
        type: Schema.Types.ObjectId, //one who is subscribing
        ref:"User"                  // reference to the User model
    },
    // The user (channel) being subscribed to
    channel:{
        type: Schema.Types.ObjectId,            // store the channel's User _id
        ref:"User"                    // reference to the User model
    }

},{timestamps:true}) // Automatically adds createdAt and updatedAt timestamps



// Create a Mongoose model based on the schema
// "Subscriptions" → collection name in MongoDB (auto pluralized to "subscriptions")
export const Subscription = mongoose.model("Subscriptions",subscriptionSchema)