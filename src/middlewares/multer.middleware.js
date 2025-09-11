import multer from "multer";   // multer is used for handling multipart/form-data (files)

// 🔹 Define where and how uploaded files will be stored locally
const storage = multer.diskStorage({

  // Destination folder where uploaded files will be stored
  destination: function (req, file, cb) {
    cb(null, './public/temp')   // save uploaded files in "public/temp" folder
  },

  // Define filename for uploaded file to avoid clashes
  filename: function (req, file, cb) {
    // uniqueSuffix = timestamp + random number
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)

    // file.fieldname → name of the field in form-data (like "avatar" or "image")
    // final filename will look like: avatar-1677765432123-123456789
    cb(null, file.fieldname + '-' + uniqueSuffix)
  }
})

// 🔹 Create multer instance with the defined storage engine
export const upload = multer({ storage })
