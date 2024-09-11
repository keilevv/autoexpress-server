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
      from: "employees",
      localField: "employee",
      foreignField: "_id",
      as: "employee",
    },
  },
  { $unwind: "$employee" },
  {
    $lookup: {
      from: "consumptionmaterials", // The name of your consumption material collection
      localField: "consumed_materials.material",
      foreignField: "_id",
      as: "material_details",
    },
  },
  {
    $addFields: {
      consumed_materials: {
        $map: {
          input: "$consumed_materials",
          as: "item",
          in: {
            material: {
              $arrayElemAt: [
                {
                  $filter: {
                    input: "$material_details",
                    as: "material",
                    cond: {
                      $eq: ["$$material._id", "$$item.material"],
                    },
                  },
                },
                0,
              ],
            },
            quantity: "$$item.quantity",
          },
        },
      },
    },
  },
  {
    $project: {
      material_details: 0, // Remove the temporary material_details array
    },
  },
];
