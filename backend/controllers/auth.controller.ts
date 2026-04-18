import type { Request,Response } from "express";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs"
import { generateToken } from "../Utils/token.js";


export const registerUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { email, password, name, avatar } = req.body;

  // console.log(req.body)

  try {
    // check if already exists
    let user = await User.findOne({ email });
    if (user) {
      res.status(400).json({ success: false, msg: "User already exists" });
      return;

    }

    // create new user
    user = new User({
      email,
      password,
      name,
      avatar: avatar || "",
    });
    

    // hash the password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // save user
    await user.save();

    // gen token
    const token = generateToken(user);

    res.json({
      success: true,
      token,
    });
  } catch (error) {
    console.log("error: ", error);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};

export const loginUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { email, password } = req.body;

  // console.log(req.body)
  


  try {
    // find user by email
    const user = await User.findOne({ email });
    if (!user) {
      res.status(400).json({ success: false, msg: "Invalid credentials" });
      return;
    }

    // compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(400).json({ success: false, msg: "Invalid credentials" });
      return;
    }

    // gen token
    const token = generateToken(user);


    console.log(token)

    res.json({
      success: true,
      token,
    });
  } catch (error) {
    console.log("error: ", error);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};
