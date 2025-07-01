import cloudinary from "../lib/cloudinary.js";
import { generateToken } from "../lib/utils.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";

export const signup = async (req, res) => {
  console.log('Signup called')
  const { username, email, phoneNo, password, role, gender } = req.body;

  // Basic validation
  if (!username || !phoneNo || !password || !role || !gender) {
    return res
      .status(400)
      .json({ success: false, message: "All fields are required" });
  }
  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 8 characters long",
    });
  }

  try {
    //check if user already exisits

    const existingUser1 = await User.findOne({ email });
    if (existingUser1) {
      return res.status(409).json({
        success: false,
        message: "User already exists with the given email",
      });
    }
    const existingUser2 = await User.findOne({ phoneNo });
    if (existingUser2) {
      return res.status(409).json({
        success: false,
        message: "User already exists with the given phone number",
      });
    }

    //if reached here that means we can create a user
    //password

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      username,
      email,
      phoneNo,
      role,
      gender,
      password: hashedPassword,
    });

    if (newUser) {
      //generate jwt token
      generateToken(newUser._id, res);
      await newUser.save();
      res.status(201).json({
        success: true,
        message: "Signup successful",
        user: {
          _id: newUser._id,
          username: newUser.username,
          email: newUser.email,
          phoneNo: newUser.phoneNo,
          role: newUser.role,
          gender: newUser.gender,
          profilePic: newUser.profilePic,
          dob : newUser.dob,
          age : newUser.age,
          location : newUser.location,
          governmentId : newUser.governmentId,
          languageSpoken : newUser.languageSpoken,
          bio : newUser.bio,
          socialLinks : newUser.socialLinks,
          documents : newUser.documents,
          isVerified : newUser.isVerified,
        },
      });
    } else {
      res.status(400).json({ success: false, message: "Invalid user data" });
    }
  } catch (err) {
    console.log("Error in signup", err);

    if (err.name === "ValidationError") {
      const error = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        error,
      });
    }
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

export const loginWithEmail = async (req, res) => {
  console.log('Login with email called')
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ success: false, message: "All fields are required" });
  }

  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 8 characters long",
    });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Invalid credentials" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res
        .status(404)
        .json({ success: false, message: "Invalid credentials" });
    }

    generateToken(user._id, res);
    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        phoneNo: user.phoneNo,
        role: user.role,
        gender: user.gender,
        profilePic: user.profilePic,
        dob : user.dob,
        age : user.age,
        location : user.location,
        governmentId : user.governmentId,
        languageSpoken : user.languageSpoken,
        bio : user.bio,
        socialLinks : user.socialLinks,
        documents : user.documents,
        isVerified : user.isVerified,
      },
    });
  } catch (err) {
    console.log("Error in loginWithEmail", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

export const loginWithPhone = async (req, res) => {
  console.log('Login with phone called')
  const { phoneNo, password } = req.body;

  if (!phoneNo || !password) {
    return res
      .status(400)
      .json({ success: false, message: "All fields are required" });
  }

  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 8 characters long",
    });
  }

  try {
    const user = await User.findOne({ phoneNo });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Invalid credentials" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res
        .status(404)
        .json({ success: false, message: "Invalid credentials" });
    }

    generateToken(user._id, res);
    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        phoneNo: user.phoneNo,
        role: user.role,
        gender: user.gender,
        profilePic: user.profilePic,
        dob : user.dob,
        age : user.age,
        location : user.location,
        governmentId : user.governmentId,
        languageSpoken : user.languageSpoken,
        bio : user.bio,
        socialLinks : user.socialLinks,
        documents : user.documents,
        isVerified : user.isVerified,
      },
    });
  } catch (err) {
    console.log("Error in loginWithPhone", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

export const logout = (req, res) => {
  console.log('Logout called')
  //clear cookies
  try {
    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({ success: true, message: "Logout successful" });
  } catch (err) {
    console.log("Error in logout", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const getProfileCompletion = async (req,res) =>{
  try {
    console.log('Profile completion called')
    const userId = req.user._id
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const fields = [
      user.email,
      user.phoneNo,
      user.username,
      user.gender,
      user.dob,
      user.age,
      user.profilePic,
      user.location?.address,
      user.location?.lat !== 0 ? user.location.lat : null,
      user.location?.lon !== 0 ? user.location.lon : null,
      user.location?.city,
      user.location?.state,
      user.location?.country,
      user.location?.pincode,
      user.governmentId?.idName,
      user.governmentId?.idValue,
      user.languageSpoken?.length > 0 ? 'filled' : null,
      user.bio,
      user.socialLinks?.facebook,
      user.socialLinks?.instagram,
      user.isVerified,
    ];

    const filled = fields.filter((f) => f !== undefined && f !== null && f !== '').length;
    const total = fields.length;
    const percentage = Math.round((filled / total) * 100);

    return res.json({
      success : true,
      percentage,
      filledFields: filled,
      totalFields: total,
      message: `Your profile is ${percentage}% complete`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success : false , message: 'Server error' });
  }
}

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      username,
      role,
      gender,
      bio,
      dob,
      location,
      governmentId,
      socialLinks,
      languageSpoken
    } = req.body;

    const updateFields = {};

    // Validate and trim username
    if (username) {
      const trimmedUsername = username.trim();
      if (trimmedUsername.length < 3) {
        return res.status(400).json({
          success: false,
          message: 'Username cannot be less than 3 characters',
        });
      }
      updateFields.username = trimmedUsername;
    }

    // Validate role
    if (role) {
      const allowedRoles = ['Farmer', 'Logistics'];
      if (!allowedRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role provided. Allowed values: Farmer, Logistics',
        });
      }
      updateFields.role = role;
    }

    // Validate gender
    if (gender) {
      const allowedGenders = ['Male', 'Female', 'Other'];
      if (!allowedGenders.includes(gender)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid gender provided. Allowed values: Male, Female, Other',
        });
      }
      updateFields.gender = gender;
    }

    // Validate bio
    if (bio) {
      const trimmedBio = bio.trim();
      if (trimmedBio.length > 500) {
        return res.status(400).json({
          success: false,
          message: 'Bio cannot exceed 500 characters',
        });
      }
      updateFields.bio = trimmedBio;
    }

    // Validate dob and calculate age
    if (dob) {
      const trimmedDob = dob.trim();
      const parsedDate = new Date(trimmedDob);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format for DOB. Use YYYY-MM-DD',
        });
      }
      updateFields.dob = parsedDate;

      // Calculate age
      const today = new Date();
      const birthDate = parsedDate;
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      const dayDiff = today.getDate() - birthDate.getDate();
      if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
        age--;
      }
      updateFields.age = age;
    }

    // Validate location
    if (location) {
      const { address, city, state, country, pincode  , lat , lon} = location;
      updateFields.location = {
        lat: lat,
        lon: lon,
        address: address?.trim() || '',
        city: city?.trim() || '',
        state: state?.trim() || '',
        country: country?.trim() || '',
        pincode: pincode?.trim() || '',
      };
      // Optional: Add pincode format validation if needed
      if (pincode && !/^\d{5,10}$/.test(pincode.trim())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid pincode format',
        });
      }
    }

    // Validate governmentId
    if (governmentId) {
      const { idName, idValue } = governmentId;
      updateFields.governmentId = {
        idName: idName?.trim() || '',
        idValue: idValue?.trim() || '',
      };
    }

    // Validate socialLinks
    if (socialLinks) {
      const { facebook, instagram } = socialLinks;
      updateFields.socialLinks = {
        facebook: facebook?.trim() || '',
        instagram: instagram?.trim() || '',
      };
      // Optional: Add URL validation if needed
      const urlRegex = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w- ./?%&=]*)?$/;
      if (facebook && !urlRegex.test(facebook.trim())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid Facebook URL',
        });
      }
      if (instagram && !urlRegex.test(instagram.trim())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid Instagram URL',
        });
      }
    }

    // Validate languageSpoken
    if (languageSpoken) {
      if (!Array.isArray(languageSpoken)) {
        return res.status(400).json({
          success: false,
          message: 'Languages spoken must be an array',
        });
      }
      const allowedLanguages = [
        'Hindi', 'Marathi', 'Tamil', 'Telugu', 'Bengali',
        'Gujarati', 'Malayalam', 'Kannada', 'Punjabi', 'Assamese', 'English'
      ];
      const validLanguages = languageSpoken.filter(lang => 
        allowedLanguages.includes(lang) && lang.trim() !== ''
      );
      // Remove duplicates
      updateFields.languageSpoken = [...new Set(validLanguages)];
      if (updateFields.languageSpoken.length === 0 && languageSpoken.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid languages provided. Allowed values: ' + allowedLanguages.join(', '),
        });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateFields, {
      new: true,
    }).select('-password');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (err) {
    console.error('Error in updateProfile:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
    });
  }
};

export const updateProfilePic = async (req, res) => {
  try {
    const userId = req.user._id;
    const { profilePic } = req.body;

    if (!profilePic) {
      return res.status(400).json({
        success: false,
        message: 'Profile picture is required',
      });
    }

    // Upload image to Cloudinary
    const uploadRes = await cloudinary.uploader.upload(profilePic, {
      folder: 'profile_pics',
      transformation: [{ width: 200, height: 200, crop: 'fill' }],
    });

    // Update user with new profile picture URL
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePic: uploadRes.secure_url },
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile picture updated successfully',
      user: updatedUser,
    });
  } catch (err) {
    console.error('Error in updateProfilePic:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
    });
  }
};

export const updatePassword = async (req, res) => {
  try {
    const userId = req.user._id;
    const { newPassword } = req.body;

    // Validate new password
    if (!newPassword) {
      return res.status(400).json({
        success: false,
        message: "New password is required",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update user's password
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { password: hashedPassword },
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (err) {
    console.error("Error in updatePassword:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};