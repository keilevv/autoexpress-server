// userModel.js
var mongoose = require("mongoose");
// Setup schema

const R2_BASE_URL = process.env.R2_BASE_URL;
var inventoryRequestSchema = mongoose.Schema({
    archived: {
        type: Boolean,
        default: false,
    },
    signature: {
        type: String,
        required: true,
        validate: {
            validator: (v) => {
                return (
                    /^data:image\/png;base64,.*$/.test(v) || v.startsWith(R2_BASE_URL)
                );
            },
            message: "La firma debe ser una imagen en base64",
        },
    },
    materials: [
        {
            material: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "StorageMaterial",
            },
            quantity: {
                type: Number,
                required: true,
            },
            caution_quantity: {
                type: Number,
                required: true,
            },
        },
    ],
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    created_date: {
        type: Date,
        default: Date.now,
    },
});

// Export Info model
var InventoryRequest = (module.exports = mongoose.model(
    "inventoryRequest",
    inventoryRequestSchema,
));
module.exports.get = function (callback, limit) {
    InventoryRequest.find(callback)
        .limit(limit)
        .populate("user")
        .populate("materials.material");
};
