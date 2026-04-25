import express from "express";
import { validatePurchaseRequest } from "../middlewares/validation";
import { verifyToken, authorize } from "../middlewares/auth";

import {
    getAllPurchases,
    getPurchaseById,
    upsertPurchase,
    insertPurchasePayment,
    getPurchasePaymentById,
    getPurchasePaymentReceipt,
    deletePurchase,
    deletePayment,
    getNextPurchaseRef,
    uploadImage,
    updateAmountPurchasing,
    getAmountPurchasings
} from "../controllers/purchaseController";

const router = express.Router();

router.use(verifyToken);
router.route("/").get(authorize(["Purchase-View"]), getAllPurchases).post(uploadImage, validatePurchaseRequest, upsertPurchase);
router.route("/amount-purchasing").get(getAmountPurchasings);
router.route("/payment").post(authorize(["Purchase-Payment"]), insertPurchasePayment);
router.route("/payment/:id").get(getPurchasePaymentById);
router.route("/payment-receipt/:id").get(verifyToken, getPurchasePaymentReceipt);
router.route("/next-ref/:branchId").get(getNextPurchaseRef);
router.route("/:id").get(authorize(["Purchase-View"]), getPurchaseById).put(authorize(["Purchase-Edit"]), uploadImage, validatePurchaseRequest, upsertPurchase).delete(authorize(["Purchase-Delete"]), deletePurchase);
router.route("/delpayment/:id").delete(authorize(["Delete-Payment-Purchase"]), deletePayment);
router.route("/amount-purchasing/:id").put(authorize(["Amount-Purchase-Edit"]), updateAmountPurchasing);

export default router;
