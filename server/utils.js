
const nodemailer = require("nodemailer");
const randomstring = require("randomstring");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: 465,
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER, // generated ethereal user
    pass: process.env.EMAIL_PASSWORD, // generated ethereal password
  },
});

const sendEmail = async (email, verifyLink, userName) => {
  try {
    let mailOptions = {
      from: '"Convoys" <' + process.env.EMAIL_USER + ">",
      to: email,
      subject: "invitation to Convoys app",
      text: "invitation",
      html:
        `Dear ${userName} <br><br> please copy this code to the app signup page <br><br>` +
        `<b>${verifyLink}</b><br><br>` +
        `Regards,<br><br>The Convoys team`,
    };
    const response = await transporter.sendMail(mailOptions);
    console.log('sendEmail response', response);
    return
  } catch (e) {  //catch here to deliver user friendly error message
    throw new Error(e.message);
  }
};

//standart error output function
const error = (err) => {
    let errmsg = {}
    switch (err) {
        case '1':
            errmsg = {error: 'item not found'}
            break;
        case '2':
            errmsg = {error: 'password not correct'}
            break;
        case '3':
            errmsg = {error: 'protocol blocked'}
            break;
        case '4':
            errmsg = {error: 'token not ok'}
            break;
        case '5':
            errmsg = {error: 'user not found or not authorized'}
            break;
        case '6':
            errmsg = {error: 'no item found'}
            break;
        default:
            errmsg = {error: err}
            break;
    }
    return errmsg
}



const createValidationCode = () => randomstring.generate({
  length: 6,
  capitalization: 'lowercase'
});
module.exports = {error, sendEmail, createValidationCode};
