import emailjs from "emailjs-com";

export const sendEmail = async (templateParams) => {
  const serviceID = process.env.REACT_APP_EMAILJS_SERVICE_ID; // Replace with your EmailJS service ID
  const templateID = process.env.REACT_APP_EMAILJS_TEMPLATE_ID; // Replace with your EmailJS template ID
  const userID = process.env.REACT_APP_EMAILJS_USER_ID; // Replace with your EmailJS user ID

  try {
    await emailjs.send(serviceID, templateID, templateParams, userID);
    console.log("Email sent successfully");
  } catch (error) {
    console.error("Error sending email:", error);
  }
};
