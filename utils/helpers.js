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
};
