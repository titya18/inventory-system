import express from "express";
import { verifyToken, authorize } from "../middlewares/auth";

import {
    getAllExchangesWithPagination,
    getLastExchangeRate,
    upsertExchangeRate,
    fetchAndSaveMefRate,
} from "../controllers/exchangeRateController";

const router = express.Router();

router.use(verifyToken);
router.route("/").get(authorize(["Exchange-Rate-View"]), getAllExchangesWithPagination).post(authorize(["Exchange-Rate-Create"]), upsertExchangeRate);
router.route("/lastexchange").get(getLastExchangeRate);
router.route("/mef").post(authorize(["Exchange-Rate-Create"]), fetchAndSaveMefRate);
router.route("/:id").put(authorize(["Exchange-Rate-Edit"]), upsertExchangeRate);

export default router;