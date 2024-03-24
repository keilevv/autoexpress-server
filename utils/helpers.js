exports.helpers = {
  getFilterArray(filter) {
    const array = filter.split("&");
    const filterArray = [];
    array.map((filter) => {
      if (filter) {
        const splitValue = filter.split("=");
        filterArray.push({ name: splitValue[0], value: splitValue[1] });
      }
    });
    return filterArray;
  },
};
