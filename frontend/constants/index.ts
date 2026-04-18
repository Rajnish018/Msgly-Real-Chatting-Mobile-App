import { Platform } from "react-native";

export const API_URL=Platform.OS==='android'?'http://172.29.221.167:3000':'http://localhost:3000'

// export const API_URL="http://localhost:3000"

export const CLOUDINARY_CLOUD_NAME="dhkw2hukr"
export const CLOUDINARY_UPLOAD_PRESET="images"