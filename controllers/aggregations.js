exports.appointmentProjection = [
  {
    $lookup: {
      from: "clients",
      localField: "client",
      foreignField: "_id",
      as: "client",
    },
  },
  {
    $unwind: "$client",
  },
  {
    $lookup: {
      from: "users",
      localField: "user",
      foreignField: "_id",
      as: "user",
    },
  },
  {
    $unwind: "$user",
  },
  {
    $lookup: {
      from: "cars",
      localField: "car",
      foreignField: "_id",
      as: "car",
    },
  },
  {
    $unwind: "$car",
  },
  {
    $project: {
      created_date: 1,
      _id: 1,
      date: 1,
      time: 1,
      archived: 1,
      "client._id": 1,
      "client.name": 1,
      "client.surname": 1,
      "client.lastname": 1,
      "client.email": 1,
      "user._id": 1,
      "user.username": 1,
      "user.email": 1,
      "car._id": 1,
      "car.plate": 1,
      "car.brand": 1,
      "car.model": 1,
      "car.color": 1,
    },
  },
];

exports.userProjection = [
  {
    $project: {
      _id: 1,
      created_date: 1,
      username: 1,
      email: 1,
      roles: 1,
      archived: 1,
    },
  },
];

exports.clientProjection = [
  {
    $lookup: {
      from: "cars",
      let: { clientCars: "$cars" },
      pipeline: [
        {
          $match: {
            $expr: { $in: ["$_id", "$$clientCars"] },
          },
        },
        {
          $project: {
            _id: 1,
            plate: 1,
            brand: 1,
            model: 1,
            color: 1,
          },
        },
      ],
      as: "cars",
    },
  },
  {
    $project: {
      _id: 1,
      created_date: 1,
      name: 1,
      surname: 1,
      lastname: 1,
      email: 1,
      cars: 1,
      telephone_number: 1,
      birthday: 1,
      country_id: 1,
      created_date: 1,
      archived: 1,
    },
  },
];

exports.carProjection = [
  {
    $lookup: {
      from: "clients",
      localField: "clients",
      foreignField: "_id",
      as: "clients",
    },
  },
];

exports.consumptionMaterialProjection = [
  {
    $lookup: {
      from: "storagematerials",
      localField: "material",
      foreignField: "_id",
      as: "material",
    },
  },
  {
    $unwind: "$material",
  },
  {
    $project: {
      _id: 1,
      archived: 1,
      area: 1,
      quantity: 1,
      created_date: 1,
      "material.caution_quantity": 1,
      "material.owner": 1,
      "material.name": 1,
      "material.reference": 1,
      "material.unit": 1,
      "material.price": 1,
    },
  },
];
exports.jobOrderProjection = [
  {
    $lookup: {
      from: "employees", // Join with employees collection
      localField: "employee",
      foreignField: "_id",
      as: "employee",
    },
  },
  { $unwind: "$employee" },
];

exports.jobOrderProjectionMaterials = [
  {
    $lookup: {
      from: "employees",
      localField: "employee",
      foreignField: "_id",
      as: "employee",
    },
  },
  { $unwind: "$employee" },
  {
    $unwind: {
      path: "$consumed_materials",
      preserveNullAndEmptyArrays: true,
    },
  },
  {
    $lookup: {
      from: "storagematerials",
      localField: "consumed_materials.storage_material",
      foreignField: "_id",
      as: "consumed_material_details",
    },
  },
  {
    $unwind: {
      path: "$consumed_material_details",
      preserveNullAndEmptyArrays: true,
    },
  },
  {
    $group: {
      _id: "$_id",
      description: { $first: "$description" },
      car_brand: { $first: "$car_brand" },
      car_model: { $first: "$car_model" },
      owner: { $first: "$owner" },
      archived: { $first: "$archived" },
      number: { $first: "$number" },
      due_date: { $first: "$due_date" },
      employee: { $first: "$employee" },
      car_plate: { $first: "$car_plate" },
      status: { $first: "$status" },
      consumed_colors: {
        $first: {
          $cond: {
            if: { $eq: ["$consumed_colors", []] }, // Handle empty consumed_colors
            then: [],
            else: "$consumed_colors",
          },
        },
      },
      consumed_materials: {
        $push: {
          quantity: "$consumed_materials.quantity",
          storage_material: "$consumed_material_details",
        },
      },
      created_date: { $first: "$created_date" },
    },
  },
  {
    $addFields: {
      // Ensure consumed_materials is empty if there are no valid entries
      consumed_materials: {
        $cond: {
          if: { $eq: ["$consumed_materials", [{}]] }, // Check for empty object in consumed_materials
          then: [],
          else: "$consumed_materials",
        },
      },
    },
  },
];

exports.saleProjection = [
  {
    $unwind: "$materials", // Unwind the materials array for easier lookup
  },
  {
    $lookup: {
      from: "consumptionmaterials", // Collection name for ConsumptionMaterial
      localField: "materials.material",
      foreignField: "_id",
      as: "materials.materialDetails",
    },
  },
  {
    $unwind: "$materials.materialDetails", // Unwind the materialDetails array
  },
  {
    $lookup: {
      from: "users", // Collection name for ConsumptionMaterial
      localField: "user",
      foreignField: "_id",
      as: "user",
    },
  },
  {
    $unwind: "$user", // Unwind the materialDetails array
  },
  // Lookup to fetch StorageMaterial details
  {
    $lookup: {
      from: "storagematerials", // Collection name for StorageMaterial
      localField: "materials.materialDetails.material",
      foreignField: "_id",
      as: "materials.materialDetails.storageMaterialDetails",
    },
  },
  {
    $unwind: "$materials.materialDetails.storageMaterialDetails", // Unwind storageMaterialDetails
  },
  // Group back by the sale id to reconstruct the sales with all material details
  {
    $group: {
      _id: "$_id",
      user: { $first: "$user" },
      customer_name: { $first: "$customer_name" },
      total_price: { $first: "$total_price" },
      archived: { $first: "$archived" },
      created_date: { $first: "$created_date" },
      materials: {
        $push: {
          consumption_material_id: "$materials.material",
          storage_material: "$materials.materialDetails.storageMaterialDetails",
          quantity: "$materials.quantity",
          price: "$materials.price",
        },
      },
    },
  },
  {
    $project: {
      _id: 1,
      "user.email": 1,
      "user.roles": 1,
      "user._id": 1,
      "user.username": 1,
      customer_name: 1,
      total_price: 1,
      archived: 1,
      created_date: 1,
      materials: 1,
    },
  },
];
