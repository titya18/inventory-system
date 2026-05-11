import express from "express";
import { verifyToken, authorize } from "../middlewares/auth";

import {
    stockSummary,
    lowStockReport,
    stockMovementReport,
    stockValuationReport,
    getSerialsByVariant,
    getAssetReport,
    getLowStockAlerts
} from "../controllers/stockController";

const router = express.Router();

router.use(verifyToken);
router.route("/").get(authorize(["Stock-Summary-Report"]), stockSummary);
router.route("/low-stock").get(authorize(["Stock-Low-Report"]), lowStockReport);
router.get("/movements", authorize(["Stock-Movement-Report"]), stockMovementReport);
router.get("/valuation", authorize(["Stock-Valuation-Report"]), stockValuationReport);
router.get("/serials", authorize(["Stock-Summary-Report"]), getSerialsByVariant);
router.get("/asset-report", authorize(["Serial-Number-Report"]), getAssetReport);
router.get("/low-stock-alerts", getLowStockAlerts);
export default router;