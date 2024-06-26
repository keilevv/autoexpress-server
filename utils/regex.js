exports.commonRegex = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  country_id: /^(?:\d{8}|\d{10})$/,
  vin: /^(?=.*[0-9])(?=.*[A-z])[0-9A-z-]{16}$/,
  carPlate: /^[a-zA-Z]{3}\d{3}$/,
  telephone_number: /^(?:\d{7}|\d{10})$/,
};
