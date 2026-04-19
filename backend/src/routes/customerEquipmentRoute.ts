import express from "express";
import { verifyToken, authorize } from "../middlewares/auth";
import {
    getAllCustomerEquipments,
    getCustomerEquipmentById,
    getSerialHistory,
    getAvailableAssetItems,
    getVariantUnits,
    searchOrders,
    createCustomerEquipment,
    updateCustomerEquipment,
    returnCustomerEquipment,
    deleteCustomerEquipment,
} from "../controllers/customerEquipmentController";

const router = express.Router();

router.use(verifyToken);

// Helper lookups — require View (View is prerequisite to Create/Edit)
router.route("/asset-items").get(authorize(["Customer-Equipment-View"]), getAvailableAssetItems);
router.route("/variant-units/:variantId").get(authorize(["Customer-Equipment-View"]), getVariantUnits);
router.route("/search-orders").get(authorize(["Customer-Equipment-View"]), searchOrders);
router.route("/serial-history/:assetItemId").get(authorize(["Customer-Equipment-View"]), getSerialHistory);

// CRUD
router.route("/").get(authorize(["Customer-Equipment-View"]), getAllCustomerEquipments).post(authorize(["Customer-Equipment-Create"]), createCustomerEquipment);
router.route("/:id").get(authorize(["Customer-Equipment-View"]), getCustomerEquipmentById).put(authorize(["Customer-Equipment-Edit"]), updateCustomerEquipment).delete(authorize(["Customer-Equipment-Delete"]), deleteCustomerEquipment);
router.route("/:id/return").put(authorize(["Customer-Equipment-Return"]), returnCustomerEquipment);

export default router;
