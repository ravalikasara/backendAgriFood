const nodemailer = require('nodemailer');
const sendMail = (username,email,phoneNumber)=>{
// Replace these values with your Gmail email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'ravalikasara@gmail.com',
    pass: 'hvem phbz xmir ouhu',
  },
});



// Email configuration
const mailOptions = {
  from: 'ravalikasara@gmail.com',
  to: 'info@sumdragrofoods.in',
  subject: 'User Details',
  text: `
    Username: ${username}

    Email: ${email}
    Phone Number: ${phoneNumber}
  `,
};

// Send the email
transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.error('Error sending email:', error.message);
  } else {
    console.log('Email sent:', info);
  }
});


}
module.exports=sendMail
