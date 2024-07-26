import express from "express";

import {createUser, getAllUsers, getUser } from "../controllers/user.js";

const router = express.Router();

router.post("/register", createUser);
router.get("/", getAllUsers);
router.get("/:userId", getUser);

export default router;
