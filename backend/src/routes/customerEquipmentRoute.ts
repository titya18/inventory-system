import express from "express";
import { verifyToken, authorize } from "../middlewares/auth";
import {
    getAllCustomerEquipments,
    getCustomerEquipmentById,
    getSerialHistory,
    getAvailableAssetItems,
    getVariantUnits,
    searchOrders,
    searchStockRequests,
    getCeqReturnedQty,
    createCustomerEquipment,
    updateCustomerEquipment,
    returnCustomerEquipment,
    deleteCustomerEquipment,
    swapSerialInCustomerEquipment,
} from "../controllers/customerEquipmentController";

const router = express.Router();

router.use(verifyToken);

// Helper lookups — require View (View is prerequisite to Create/Edit)
router.route("/asset-items").get(authorize(["Customer-Equipment-View"]), getAvailableAssetItems);
router.route("/variant-units/:variantId").get(authorize(["Customer-Equipment-View"]), getVariantUnits);
router.route("/search-orders").get(authorize(["Customer-Equipment-View"]), searchOrders);
router.route("/search-stock-requests").get(authorize(["Customer-Equipment-View"]), searchStockRequests);
router.route("/serial-history/:assetItemId").get(authorize(["Customer-Equipment-View"]), getSerialHistory);
router.route("/ceq-returned-qty").get(authorize(["Customer-Equipment-View"]), getCeqReturnedQty);

// CRUD
router.route("/").get(authorize(["Customer-Equipment-View"]), getAllCustomerEquipments).post(authorize(["Customer-Equipment-Create"]), createCustomerEquipment);
router.route("/:id").get(authorize(["Customer-Equipment-View"]), getCustomerEquipmentById).put(authorize(["Customer-Equipment-Edit"]), updateCustomerEquipment).delete(authorize(["Customer-Equipment-Delete"]), deleteCustomerEquipment);
router.route("/:id/return").put(authorize(["Customer-Equipment-Return"]), returnCustomerEquipment);
router.route("/:id/swap-serial").put(authorize(["Customer-Equipment-Edit"]), swapSerialInCustomerEquipment);

export default router;
