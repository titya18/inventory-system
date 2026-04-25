import express from "express";
import { verifyToken } from "../middlewares/auth";
import { getCompanySettings, updateCompanySettings, uploadLogo } from "../controllers/settingsController";

const router = express.Router();

router.get("/", verifyToken, getCompanySettings);
router.put("/", verifyToken, uploadLogo.single("logo"), updateCompanySettings);

export default router;
