const fs = require('fs');
const nodemailer = require("nodemailer");
const dotenv = require("dotenv").config();
const path = require('path');
const ejs = require('ejs')
const filePath = path.join(__dirname,'../views/email.ejs');


const generateAndSendOTP = async (user,temp_otp) => {
  const {email} = user;
  const min = 1000;
  const max = 9999;
  const otp = Math.floor(Math.random() * (max - min + 1)) + min;
  const emailTemplate = await ejs.renderFile(filePath,{otp:otp});
  try {
    temp_otp[email]={
        email: email,
        otp: otp,
        // expirationTime:new Date(Date.now() + 15000),
    }
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.gmail_admin,
        pass: process.env.gmail_passcode,
      },
    });

    const mailOptions = {
      from: process.env.gmail_admin,
      to: email,
      subject: "OTP for Account Verification",
      html: emailTemplate,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending OTP email:", error);
        return
      }
    });
  } catch (err) {
    console.error("Error generating OTP:", err);
    return
  }
  return
};

module.exports = { generateAndSendOTP };