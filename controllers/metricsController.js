JobOrder = require("../models/jobOrderModel");
const { jobOrderProjectionMaterials } = require("./aggregations");

const { helpers } = require("../utils/helpers");
const mongoose = require("mongoose");

exports.getJobOrderMetrics = async function (req, res) {
  const { ...filter } = req.query;

  let query = {};
  const filterArray = helpers.getFilterArray(filter);
  if (filter) {
    filterArray.forEach((filterItem) => {
      switch (filterItem.name) {
        case "archived":
          query[filterItem.name] = filterItem.value === "true";
          break;
        case "start_date":
        case "end_date":
          const dateFilter = {};
          if (req.query.start_date)
            dateFilter["$gte"] = new Date(req.query.start_date);
          if (req.query.end_date)
            dateFilter["$lte"] = new Date(req.query.end_date);
          query["created_date"] = dateFilter;
          break;
        case "due_start_date":
        case "due_end_date":
          const dueDateFilter = {};
          if (req.query.due_start_date)
            dueDateFilter["$gte"] = new Date(req.query.due_start_date);
          if (req.query.due_end_date)
            dueDateFilter["$lte"] = new Date(req.query.due_end_date);
          query["due_date"] = dueDateFilter;
          break;
        case "search":
          if (filterItem.value) {
            query["$or"] = [
              { number: { $regex: filterItem.value, $options: "i" } },
              { car_plate: { $regex: filterItem.value, $options: "i" } },
            ];
          }
          break;
        case "employee":
          if (filterItem.value) {
            query["employee"] = new mongoose.Types.ObjectId(filterItem.value);
          }
          break;
        case "owner":
          if (filterItem.value) {
            query["owner"] = filterItem.value || "autoexpresss";
          }
          break;
        case "status":
          if (filterItem.value) {
            query["status"] = [String(filterItem.value)];
          }
          break;
      }
    });
  }
  // Exclude completed jobs from the query
  // if (!query["status"]) {
  //   query["status"] = { $ne: "completed" };
  // }

  // if (
  //   !query["start_date"] &&
  //   !query["end_date"] 
  // ) {
  //   const today = new Date();
  //   const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  //   query["created_date"] = {
  //     $gte: startOfMonth,
  //     $lte: today,
  //   };
  // }

  const jobOrders = await JobOrder.find(query);

  const totalJobOrders = jobOrders.length;

  const archivedCount = jobOrders.filter((order) => order.archived).length;

  const activeOrders = jobOrders.filter((order) => !order.archived);

  const statusCounts = {};
  activeOrders.forEach((order) => {
    const lastStatus = order.status?.[order.status.length - 1] || "unknown";
    statusCounts[lastStatus] = (statusCounts[lastStatus] || 0) + 1;
  });

  // Build percentages array
  const rawPercentages = [];

  let totalNonArchived = 0;

  for (const [key, count] of Object.entries(statusCounts)) {
    totalNonArchived += count;
    rawPercentages.push({ key, count });
  }

  if (archivedCount > 0) {
    rawPercentages.push({ key: "archived", count: archivedCount });
  }

  const total = totalNonArchived + archivedCount;

  // Step 1: Calculate unrounded percentages
  let totalRounded = 0;
  const status_percentages = rawPercentages.map((item) => {
    const rawValue = (item.count / total) * 100;
    const roundedValue = Math.round(rawValue);
    totalRounded += roundedValue;
    return { ...item, value: roundedValue };
  });

  console.log("status_percentages", status_percentages.length);

  // Step 2: Adjust the highest value down if needed
  if (totalRounded !== 100 && status_percentages.length) {
    const diff = totalRounded - 100;

    // Sort descending by value to adjust the largest bucket
    status_percentages.sort((a, b) => b.value - a.value);

    status_percentages[0].value -= diff;

    // Re-sort alphabetically or however you want afterward
    status_percentages.sort((a, b) => a.key.localeCompare(b.key));
  }

  const totalCostResult = await JobOrder.aggregate([
    { $match: query },
    ...jobOrderProjectionMaterials,
    {
      $group: {
        _id: null,
        total_cost: { $sum: "$materials_cost" },
        total_material_profit: { $sum: "$materials_profit" },
        total_sell_price: { $sum: "$sell_price" },
        total_profit: { $sum: "$profit" },
      },
    },
  ]);

  const total_cost = totalCostResult[0]?.total_cost || 0;
  const total_material_profit = totalCostResult[0]?.total_material_profit || 0;
  const total_sell_price = totalCostResult[0]?.total_sell_price || 0;
  const total_profit = totalCostResult[0]?.total_profit || 0;

  return res.json({
    message: "Job orders list retrieved successfully",
    status: "success",
    count: totalJobOrders,
    results: {
      total_cost,
      total_material_profit,
      total_sell_price,
      total_profit,
      status_percentages,
    },
  });
};
