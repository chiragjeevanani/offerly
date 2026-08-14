import jwt from "jsonwebtoken";

import User from "../modules/user/models/User.js";
import Merchant from "../modules/merchant/models/Merchant.js";
import Admin from "../modules/admin/models/Admin.js";

const getTokenFromRequest = (req) => {
  const authorization = req.headers.authorization || req.headers.Authorization;

  if (!authorization || typeof authorization !== "string") {
    return null;
  }

  if (authorization.startsWith("Bearer ")) {
    return authorization.slice(7).trim();
  }

  return null;
};

const resolveUserFromToken = async (token) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  
  let user;
  if (decoded.role === "admin") {
    user = await Admin.findById(decoded.id).select("-password");
  } else if (decoded.role === "merchant") {
    user = await Merchant.findById(decoded.id).select("-password");
  } else {
    user = await User.findById(decoded.id).select("-password");
  }

  if (!user) {
    throw new Error("User not found");
  }

  if (user.status === "blocked" || user.status === "suspended") {
    throw new Error("User account is blocked or suspended");
  }

  return user;
};

export const protect = async (req, res, next) => {
  try {
    const token = getTokenFromRequest(req);

    if (!token) {
      return res.status(401).json({ message: "Authentication token missing" });
    }

    req.user = await resolveUserFromToken(token);
    next();
  } catch (error) {
    return res.status(401).json({
      message: error.name === "TokenExpiredError" ? "Token expired" : "Not authorized",
    });
  }
};

export const optionalAuth = async (req, _res, next) => {
  try {
    const token = getTokenFromRequest(req);

    if (!token) {
      return next();
    }

    req.user = await resolveUserFromToken(token);
    return next();
  } catch (_error) {
    return next();
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    return next();
  };
};

export default protect;
