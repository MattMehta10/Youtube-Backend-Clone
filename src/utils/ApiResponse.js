class ApiResponse{          //this is a custom API Response for Success
    constructor(
        statusCode,
        data,
        message = "Success"
    ){
        this.statusCode = statusCode            // HTTP status code (e.g., 200, 201)
        this.data= data         // actual response payload (user info, token, etc.)
        this.message=message    // message to describe the response (default: "Success")
        this.success = statusCode < 400     // boolean flag -> true if status < 400 (OK responses), false otherwise
    }
}


export { ApiResponse }