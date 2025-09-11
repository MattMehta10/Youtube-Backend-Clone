//Custom error class that extend the built-in JS Error
class ApiError extends Error {
    constructor(
        statusCode,     // HTTP status code (e.g., 400, 401, 500)
        message="Something went wrong",     // default error message if not provided
        errors=[],      // optional: array of detailed errors (e.g., validation errors)
        stack = ''          // optional: custom stack trace
    ){
        super(message)      // call parent Error constructor with the message
        
         // Custom properties we add for API responses
        this.statusCode = statusCode    // HTTP status code (used in response)
        this.data = null            // can be used for extra data (default: null)
        this.message = message       // main error message
        this.success = false;        // always false, since this represents an error
        this.errors = errors                 // extra error details (array of issues, if needed)

// Handle stack trace (useful for debugging)
    // A stack trace is basically a snapshot of the call stack at the moment an error occurred.
    // The call stack is a list of all the functions your code was running when the error happened.
    // A stack trace shows where the error started and which functions led up to it.
    // If a custom stack is provided, use it.
    // Otherwise, Error.captureStackTrace automatically creates a stack trace from where the error was thrown (useful for debugging).
    
        if(stack){
            this.stack = stack      // if provided, use custom stack
        }
        else{
            // Otherwise capture the current stack trace automatically
            Error.captureStackTrace(this,this.constructor)
        }
    }
}


export {ApiError}