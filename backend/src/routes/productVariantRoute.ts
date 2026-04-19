import express from "express";
import { validateProductVariantRequest } from "../middlewares/validation";
import { verifyToken, authorize } from "../middlewares/auth";

import {
    getAllProductVariant,
    getProductVariantById,
    upsertProductVariant,
    updateVariantPricing,
    uploadImage,
    deleteProductVaraint,
    statusVariant
} from "../controllers/productVariantController";

const router = express.Router();

router.use(verifyToken);
router.route("/").post(authorize(['Product-Variant-Create']), validateProductVariantRequest, uploadImage, upsertProductVariant);
router.route("/status/:id").get(statusVariant);
router.route("/:id/pricing").patch(authorize(['Product-Variant-Edit']), updateVariantPricing);
router.route("/:id").get(getAllProductVariant, getProductVariantById).put(authorize(['Product-Variant-Edit']), validateProductVariantRequest, uploadImage, upsertProductVariant).delete(authorize(['Product-Variant-Delete']), deleteProductVaraint);

export default router;