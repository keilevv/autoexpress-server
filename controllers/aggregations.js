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
      _id: 1,
      date: 1,
      time: 1,
      "client._id": 1,
      "client.name": 1,
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
