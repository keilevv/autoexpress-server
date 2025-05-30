exports.helpers = {
  getFilterArray(filter) {
    const filterArray = [];
    if (typeof filter === "string") {
      const array = filter.split("&");
      array.map((filter) => {
        if (filter) {
          const splitValue = filter.split("=");
          filterArray.push({ name: splitValue[0], value: splitValue[1] });
        }
      });
      return filterArray;
    }
    if (typeof filter === "object") {
      Object.entries(filter).forEach((filter) => {
        filterArray.push({ name: filter[0], value: filter[1] });
      });

      return filterArray;
    }
  },
  StringIsNumber(str) {
    return !isNaN(str) && !isNaN(parseFloat(str));
  },
  async SyncSchema(MongoSchema) {
    console.log("Starting schema synchronization...");

    // Get the expected schema fields from the model
    const schemaPaths = MongoSchema.schema.paths;
    const expectedFields = Object.keys(schemaPaths);

    // Retrieve all storage materials
    const materials = await MongoSchema.find({});

    for (const material of materials) {
      let updatedFields = {};
      let removeFields = [];

      // Add missing fields with default values
      expectedFields.forEach((field) => {
        if (!Object.prototype.hasOwnProperty.call(material, field)) {
          let defaultValue = schemaPaths[field].options.default;

          // If the default is a function (like Date.now), call it
          if (typeof defaultValue === "function") {
            defaultValue = defaultValue();
          }

          if (defaultValue !== undefined) {
            updatedFields[field] = defaultValue;
          }
        }
      });

      // Remove extra fields not in the schema
      Object.keys(material._doc).forEach((field) => {
        if (!expectedFields.includes(field)) {
          removeFields.push(field);
        }
      });

      // Debugging: Check missing fields before update
      console.log(
        `Before update: ID=${material._id}, missing fields:`,
        updatedFields
      );

      // Apply updates if necessary
      if (Object.keys(updatedFields).length > 0 || removeFields.length > 0) {
        await MongoSchema.updateOne(
          { _id: material._id },
          {
            $set: updatedFields,
            $unset: removeFields.reduce(
              (acc, field) => ({ ...acc, [field]: "" }),
              {}
            ),
          }
        );
        console.log(`Updated ID=${material._id}, Set:`, updatedFields);
      }
    }
  },
  formatNumber(num) {
    return Number.isInteger(num)
      ? num.toString()
      : parseFloat(num.toFixed(2)).toString();
  },
  getSortOptions(query = [], sortBy = "created_date", sortOrder = "desc") {
    // Default filter to exclude completed
    if (!query["status"]) {
      query["status"] = { $ne: "completed" };
    }

    // Optional: exclude records with missing created_date
    query["created_date"] = query["created_date"] || {};
    query["created_date"]["$exists"] = true;

    // Setup sort options
    let sortOptions = {};
    if (sortBy && sortOrder) {
      sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;
      sortOptions["_id"] = sortOrder === "desc" ? -1 : 1; // tie-breaker
    } else {
      sortOptions = { created_date: -1, _id: -1 }; // default sort
    }
    return sortOptions;
  },
};

exports.colorCodingList = [
  {
    name: "",
    value: "",
  },
];