import multer from "multer";   // multer is used for handling multipart/form-data (files)

// 🔹 Define where and how uploaded files will be stored locally
const storage = multer.diskStorage({

  // Destination folder where uploaded files will be stored temporarily
  destination: function (req, file, cb) {
    cb(null, './public/temp')   //The first parameter null means "no error" then it tells to saves uploaded files in "public/temp" folder
  },

  // Define filename for uploaded file to avoid clashes
  filename: function (req, file, cb) {
    // uniqueSuffix = timestamp + random number
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)

    cb(null, file.fieldname + '-' + uniqueSuffix)
    // file.fieldname → name of the field in form-data (like "avatar" or "image")
    // final filename will look like: avatar-1677765432123-123456789
  }
})

// 🔹Creates the configured middleware instance using the storage logic you defined.
export const upload = multer({ storage })
