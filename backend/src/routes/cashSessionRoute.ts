import express from "express";
import { verifyToken } from "../middlewares/auth";
import { createCashSession, getCashSessions, getCashSessionById } from "../controllers/cashSessionController";

const router = express.Router();

router.use(verifyToken);
router.route("/").get(getCashSessions).post(createCashSession);
router.route("/:id").get(getCashSessionById);

export default router;
