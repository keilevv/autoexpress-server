const nodemailer = require("nodemailer");
const formData = require("form-data");
const Mailgun = require("mailgun.js");
const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: "api",
  key:
    process.env.MAILGUN_API_KEY ||
    "7063c11b170aad2042e49e6cac2b1394-4c205c86-40ca77a9",
});

console.log("key", process.env.MAILGUN_API_KEY);

// Create a transporter object using SMTP transport

// Define a function to send emails
const sendEmail = async (to, subject, text) => {
  console.log("clientEmail", to, subject, text);
  try {
    mg.messages
      .create("sandbox2229e87dd18c407ca2d3c53fde6ef227.mailgun.org", {
        from: "Excited User <mailgun@sandbox2229e87dd18c407ca2d3c53fde6ef227.mailgun.org>",
        to: ["calvihe@gmail.com"],
        subject: "Hello",
        text: "Testing some Mailgun awesomeness!",
        html: "<h1>Testing some Mailgun awesomeness!</h1>",
      })
      .then((msg) => console.log("mesage", msg)) // logs response data
      .catch((err) => console.log(err)); // logs any error
  } catch (error) {
    console.error("Error occurred while sending email:", error);
  }
};

module.exports = sendEmail;
