const mongoose = require("mongoose");
const JobOrder = require("../models/jobOrderModel");
const StorageMaterial = require("../models/storageMaterialModel");
const ConsumptionMaterial = require("../models/consumptionMaterialModel");
const InventoryRequest = require("../models/inventoryRequest");

exports.index = async function (req, res) {
    console.log(req.query);
    try {
        const { owner } = req.query;

        let matchOwner = {};
        if (owner && owner !== "undefined" && owner !== "null") {
            matchOwner.owner = owner;
        }

        // 1. Storage Materials (Total count, Total value)
        const storageQuery = { archived: false, ...matchOwner };
        const storageCount = await StorageMaterial.countDocuments(storageQuery);
        const storageAgg = await StorageMaterial.aggregate([
            { $match: storageQuery },
            { $group: { _id: null, totalValue: { $sum: { $multiply: ["$price", "$quantity"] } } } }
        ]);
        const storageValue = storageAgg.length > 0 ? storageAgg[0].totalValue : 0;

        // 2. Consumption Materials (Total count, Total value)
        // the owner is present in the populated StorageMaterial, but for simplicity, the consumption material itself might not have an owner explicitly unless it's synced. Let's look up or just assume no owner filter for consumption or match by populated storage owner. In consumptionController it uses materialNameFilter["material.owner"].
        let consumptionMatchOwner = {};
        if (owner && owner !== "undefined" && owner !== "null") {
            consumptionMatchOwner["material.owner"] = owner;
        }
        const consumptionAgg = await ConsumptionMaterial.aggregate([
            { $match: { archived: false } },
            {
                $lookup: {
                    from: "storagematerials",
                    localField: "material",
                    foreignField: "_id",
                    as: "material",
                },
            },
            { $unwind: "$material" },
            { $match: consumptionMatchOwner },
            {
                $facet: {
                    totalCount: [{ $count: "count" }],
                    totalValue: [
                        {
                            $group: {
                                _id: null,
                                total: {
                                    $sum: { $multiply: ["$material.price", "$quantity"] },
                                },
                            },
                        },
                    ],
                },
            }
        ]);
        const consumptionCount = consumptionAgg[0].totalCount.length > 0 ? consumptionAgg[0].totalCount[0].count : 0;
        const consumptionValue = consumptionAgg[0].totalValue.length > 0 ? consumptionAgg[0].totalValue[0].total : 0;

        // 3. Inventory Requests (Total count, by status)
        const requestQuery = { archived: false, ...matchOwner };
        const requestCount = await InventoryRequest.countDocuments(requestQuery);
        const requestStatusAgg = await InventoryRequest.aggregate([
            { $match: requestQuery },
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);
        const requestStatusCounts = { pending: 0, approved: 0, rejected: 0 };
        requestStatusAgg.forEach(item => {
            if (item._id in requestStatusCounts) requestStatusCounts[item._id] = item.count;
        });

        // 4. Job Orders (Total count, by status, overall value)
        const jobOrderQuery = { archived: false, ...matchOwner };
        const jobOrderCount = await JobOrder.countDocuments(jobOrderQuery);

        const jobOrderStatusAgg = await JobOrder.aggregate([
            { $match: jobOrderQuery },
            { $unwind: "$status" },
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);
        const jobOrderStatusCounts = { pending: 0, "in-progress": 0, completed: 0 };
        jobOrderStatusAgg.forEach(item => {
            if (item._id in jobOrderStatusCounts) jobOrderStatusCounts[item._id] = item.count;
        });

        const jobOrderPriceOrders = await JobOrder.find(jobOrderQuery)
            .populate({
                path: "consumed_materials.consumption_material",
                populate: { path: "material", model: "StorageMaterial" },
            })
            .lean();

        const jobOrderValue = jobOrderPriceOrders.reduce((acc, order) => {
            const materialsTotal = (order.consumed_materials || []).reduce(
                (sum, item) => {
                    const price = item.consumption_material?.material?.price || 0;
                    return sum + (item.quantity || 0) * price;
                },
                0
            );
            const colorsTotal = (order.consumed_colors || []).reduce(
                (sum, color) => sum + (color.price || 0),
                0
            );
            return acc + materialsTotal + colorsTotal;
        }, 0);


        return res.json({
            status: "success",
            results: {
                storage: {
                    count: storageCount,
                    value: storageValue
                },
                consumption: {
                    count: consumptionCount,
                    value: consumptionValue
                },
                requests: {
                    count: requestCount,
                    statusCounts: requestStatusCounts
                },
                jobOrders: {
                    count: jobOrderCount,
                    value: jobOrderValue,
                    statusCounts: jobOrderStatusCounts
                }
            }
        });

    } catch (err) {
        return res
            .status(500)
            .json({ message: "Internal server error", description: err.message });
    }
};
