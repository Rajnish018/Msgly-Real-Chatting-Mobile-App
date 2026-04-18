import { API_URL } from "@/constants";
import axios from "axios";

console.log(API_URL)

export const login = async (
  email: string,
  password: string
): Promise<{ token: string }> => {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email,
      password,
    });

    return response.data;

  } catch (error: any) {
    console.log("got error:", error);
    const msg = error?.response?.data?.msg || "Login failed";
    throw new Error(msg);
  }
};


export const register = async (
  email: string,
  password: string,
  name: string,
  avatar?: string | null
): Promise<{ token: string }> => {
  try {
    const response = await axios.post(`${API_URL}/auth/register`, {
      email,
      password,
      name,
      avatar,
    });
    console.log("authservice", response.data)
    return response.data;
  } catch (error: any) {
    console.log("got error:", error);
    const msg = error?.response?.data?.msg || "Registration failed";
    throw new Error(msg);
  }
};

// Push notification token

export const updatePushToken=async(expoPushToken : string)=>{
  const response=await axios.post(`${API_URL}/auth/push-token`,{
    expoPushToken,
  })

  return response.data;

}