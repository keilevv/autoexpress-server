// storageMaterialController.js
// Import Models
const { helpers } = require("../utils/helpers");
const mongoose = require("mongoose");
const User = require("../models/userModel");
const ConsumptionMaterial = require("../models/consumptionMaterialModel");
const StorageMaterial = require("../models/storageMaterialModel");
const aggregations = require("./aggregations");
const InventoryRequest = require("../models/inventoryRequest");

exports.createRequest = async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).send({ message: "Usuario no encontrado" });
        }

        if (!req.body.materials || !req.body.signature)
            return res.status(400).send({ message: "Datos incompletos" });

        const materials = req.body.materials.map((m) => {
            const material = StorageMaterial.findById(m.material_id);
            if (!material) {
                return res.status(404).send({ message: "Material no encontrado" });
            }

            return {
                material: m.material_id || m.material,
                quantity: m.quantity,
            };
        });
        if (!materials || materials.length === 0)
            return res
                .status(400)
                .send({ message: "Ningun material válido asignado" });

        const inventoryRequest = new InventoryRequest({
            materials,
            user: req.userId,
            owner: req.body.owner,
            approved: false,
            signature: req.body.signature,
        });

        await inventoryRequest.save();

        await inventoryRequest.populate([
            { path: "user", select: "-password" },
            { path: "materials.material" },
        ]);

        return res.status(201).send({
            message: "Solicitud de inventario creada exitosamente",
            results: inventoryRequest,
        });
    } catch (err) {
        return res
            .status(500)
            .send({ message: "Internal server error", description: err.message });
    }
};

exports.indexInventoryRequests = async function (req, res) {
    const { page = 1, limit = 10, sortBy, sortOrder, ...filter } = req.query;

    let query = {};
    const filterArray = helpers.getFilterArray(filter);
    query.archived = false;

    // Apply filtering if any
    if (filter) {
        filterArray.forEach(async (filterItem) => {
            switch (filterItem.name) {
                case "archived":
                    const actingUser = await User.findById(req.userId);
                    if (actingUser?.roles.includes("admin"))
                        query[filterItem.name] = filterItem.value === "true";
                    break;
                case "start_date":
                case "end_date":
                    const dateFilter = query["created_date"] || {};
                    if (filterItem.name === "start_date")
                        dateFilter["$gte"] = new Date(filterItem.value);
                    if (filterItem.name === "end_date")
                        dateFilter["$lte"] = new Date(filterItem.value);
                    query["created_date"] = dateFilter;
                    break;
                case "user":
                    query["user"] = filterItem.value;
                    break;
                case "approved":
                    query["approved"] = filterItem.value === "true";
                    break;
                default:
                    query[filterItem.name] = {
                        $regex: filterItem.value,
                        $options: "i",
                    };
                    break;
            }
        });
    }

    // Apply sorting if any
    let sortOptions = {};
    if (sortBy && sortOrder) {
        sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;
    } else {
        sortOptions["created_date"] = -1;
    }

    try {
        const actingUser = await User.findById(req.userId);
        if (!actingUser) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }

        // Role-based filtering: Admin sees all, others only see their own
        if (!actingUser.roles.includes("admin")) {
            query["user"] = req.userId;
        }

        const count = await InventoryRequest.countDocuments(query);
        const results = await InventoryRequest.find(query)
            .sort(sortOptions)
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .populate({ path: "user", select: "-password" })
            .populate("materials.material");

        return res.json({
            status: "success",
            message: "Inventory requests retrieved successfully",
            count,
            results,
        });
    } catch (err) {
        return res
            .status(500)
            .json({ message: "Internal server error", description: err.message });
    }
};

exports.approveRequest = async (req, res) => {
    try {
        const inventoryRequest = await InventoryRequest.findById(req.params.id);
        if (!inventoryRequest) {
            return res.status(404).send({ message: "Solicitud no encontrada" });
        }

        const materials = inventoryRequest.materials;
        if (!materials || materials.length === 0)
            return res
                .status(400)
                .send({ message: "Ningun material válido asignado" });

        for (const material of materials) {
            const storageMaterial = await StorageMaterial.findById(
                material.material_id,
            );
            if (!storageMaterial) {
                return res.status(404).send({ message: "Material no encontrado" });
            }

            const existingConsumptionMaterial = await ConsumptionMaterial.findOne({
                material: material.material_id,
            });

            if (
                existingConsumptionMaterial &&
                !existingConsumptionMaterial.archived
            ) {
                if (material.quantity > storageMaterial.quantity) {
                    return res
                        .status(400)
                        .send({ message: "No hay suficientes materiales" });
                }

                existingConsumptionMaterial.quantity += material.quantity;
                storageMaterial.quantity -= material.quantity;

                await existingConsumptionMaterial.save();
                await storageMaterial.save();

                return res
                    .status(201)
                    .send({ message: "Materiales de consumo agregados exitosamente" });
            } else {
                if (material.quantity > storageMaterial.quantity) {
                    return res
                        .status(400)
                        .send({ message: "No hay suficientes materiales" });
                }

                storageMaterial.quantity -= material.quantity;
                await storageMaterial.save();

                const consumptionMaterial = new ConsumptionMaterial({
                    material: material.material_id,
                    quantity: material.quantity,
                    caution_quantity: material.caution_quantity,
                });

                await consumptionMaterial.save();
                inventoryRequest.approved = true;
                await inventoryRequest.save();
                res.status(201).send({ message: "Solicitud aprobada exitosamente" });
            }
        }
    } catch (err) {
        res
            .status(500)
            .send({ message: "Internal server error", description: err });
    }
};

exports.rejectRequest = async (req, res) => {
    try {
        const inventoryRequest = await InventoryRequest.findById(req.params.id);
        if (!inventoryRequest) {
            return res.status(404).send({ message: "Solicitud no encontrada" });
        }

        inventoryRequest.approved = false;
        await inventoryRequest.save();
        res.status(201).send({ message: "Solicitud rechazada exitosamente" });
    } catch (err) {
        res
            .status(500)
            .send({ message: "Internal server error", description: err });
    }
};

exports.get = async function (req, res) {
    const materialId = new mongoose.Types.ObjectId(req.params.material_id);
    if (!materialId) {
        return res.status(400).send({ message: "Invalid material id" });
    }

    ConsumptionMaterial.aggregate(
        [
            {
                $match: {
                    _id: materialId,
                },
            },
        ].concat(aggregations.consumptionMaterialProjection),
    )
        .then((cursor) => {
            if (!cursor || !cursor.length) {
                return res.status(404).send({ message: "Material not found" });
            }
            return res.json({
                status: "success",
                message: "Material retrieved successfully",
                results: cursor[0],
            });
        })
        .catch((error) => {
            return res
                .status(500)
                .send({ message: "Internal server error", description: error });
        });
};

// Handle update material from id
exports.update = async function (req, res) {
    try {
        const userId = req.userId;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).send({ message: "Usuario no encontrado" });
        }

        const inventoryRequest = await InventoryRequest.findById(
            req.params.request_id,
        );
        if (!inventoryRequest) {
            return res.status(404).send({ message: "Solicitud no encontrada" });
        }

        // Ownership check: Admin or the user who created it
        if (!user.roles.includes("admin")) {
            const requesterId = inventoryRequest.user._id
                ? inventoryRequest.user._id.toString()
                : inventoryRequest.user.toString();

            if (requesterId !== userId) {
                return res.status(403).send({
                    message: "No tienes permiso para actualizar esta solicitud",
                });
            }
        }

        const allowedKeys = ["archived", "materials"];
        const keys = Object.keys(req.body);

        // Check if I send any other fields other than archived and materials
        for (const key of keys) {
            if (!allowedKeys.includes(key)) {
                return res.status(400).send({ message: "Key no valida" });
            }
        }

        if (keys.includes("archived")) {
            inventoryRequest.archived = req.body.archived;
        }

        if (keys.includes("materials")) {
            const newMaterials = req.body.materials;
            if (!Array.isArray(newMaterials)) {
                return res
                    .status(400)
                    .send({ message: "Materials debe ser un arreglo" });
            }

            // Validate all materials before applying any changes
            for (const material of newMaterials) {
                const materialId = material.material_id || material.material;
                if (!materialId) {
                    return res.status(400).send({ message: "ID de material faltante" });
                }

                const storageMaterial = await StorageMaterial.findById(materialId);
                if (!storageMaterial) {
                    return res.status(404).send({ message: "Material no encontrado" });
                }

                if (!material.quantity || material.quantity <= 0) {
                    return res.status(400).send({ message: "Cantidad no valida" });
                }
            }

            inventoryRequest.materials = newMaterials.map((m) => ({
                material: m.material_id || m.material,
                quantity: m.quantity,
            }));
            inventoryRequest.markModified("materials");
        }

        await inventoryRequest.save();

        return res.status(200).send({
            message: "Solicitud actualizada exitosamente",
            results: inventoryRequest,
        });
    } catch (err) {
        return res
            .status(500)
            .send({ message: "Internal server error", description: err.message });
    }
};
// Handle delete material
exports.delete = function (req, res) {
    ConsumptionMaterial.deleteOne({
        _id: req.params.material_id,
    })
        .then((material) => {
            if (material) {
                return res.json({
                    status: "success",
                    message: "ConsumptionMaterial deleted successfully!",
                });
            }
            return res
                .status(400)
                .send({ message: "ConsumptionMaterial not found!" });
        })
        .catch((err) => {
            if (err) res.status(500).send({ message: err });
        });
};

/* WARNING: This will delete all appointments, use only on dev environment */
exports.deleteAll = function (req, res) {
    ConsumptionMaterial.deleteMany({})
        .then(() => {
            res.json({
                status: "success",
                message:
                    "All materials deleted, prepare yourself, I'm going to kill you.",
            });
        })
        .catch((err) => {
            if (err) res.status(500).send({ message: err });
        });
};
