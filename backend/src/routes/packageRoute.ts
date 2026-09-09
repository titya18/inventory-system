import express from "express";
import { validatePackageRequest } from "../middlewares/validation";
import { verifyToken, authorize } from "../middlewares/auth";

import {
    getAllPackages,
    getAllPackagesWithPagination,
    getPackageById,
    upsertPackage,
    uploadPackageImage,
    deletePackage,
    explodePackage,
    getNextPackageSku,
    getPackagesAvailability,
} from "../controllers/packageController";

const router = express.Router();

router.use(verifyToken);
router.route("/all").get(getAllPackages);
router.route("/next-sku").get(getNextPackageSku);
router.route("/availability").get(getPackagesAvailability);
router
    .route("/")
    .get(authorize(["Package-View"]), getAllPackagesWithPagination)
    .post(authorize(["Package-Create"]), uploadPackageImage, validatePackageRequest, upsertPackage);
// No Package-View requirement here — selling a package (Invoice/Quotation/POS)
// must work for any authenticated user who can create a sale, same as /all.
router.route("/:id/explode").get(explodePackage);
router
    .route("/:id")
    .get(authorize(["Package-View"]), getPackageById)
    .put(authorize(["Package-Edit"]), uploadPackageImage, validatePackageRequest, upsertPackage)
    .delete(authorize(["Package-Delete"]), deletePackage);

export default router;
