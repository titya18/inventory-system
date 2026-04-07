import express from "express";
import { validateCustomerRequest } from "../middlewares/validation";
import { verifyToken, authorize } from "../middlewares/auth";

import {
    getAllCustomersWithPagination,
    getAllCustomers,
    getCustomerById,
    upsertCustomer
} from "../controllers/customerController";

const router = express.Router();

router.use(verifyToken);
router.route("/all").get(getAllCustomers);
router.route("/").get(getAllCustomersWithPagination).post(authorize(["Customer-Create"]), validateCustomerRequest, upsertCustomer);
router.route("/:id").get(getCustomerById).put(authorize(["Customer-Edit"]), validateCustomerRequest, upsertCustomer);

export default router;