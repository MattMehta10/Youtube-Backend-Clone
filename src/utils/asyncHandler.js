/*
A higher-order function to handle async errors in Express
Instead of writing try-catch in every controller, 
we wrap the async function inside asyncHandler.
*/

const asyncHandler = (requestHandler) => { return (req,res,next)=>{
    // Ensure the async function (requestHandler) always returns a Promise
        Promise.resolve(requestHandler(req,res,next))
        .catch((err)=> next(err))
        // If the Promise is rejected (error happens),
            // catch the error and pass it to Express's next() error handler
    }
}




// Export the function to use in controllers/routes
export {asyncHandler}