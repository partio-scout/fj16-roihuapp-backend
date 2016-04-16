export default {
  auth: {
    user: process.env.AWS_SES_MAILUSER || null,
    pass: process.env.AWS_SES_MAILPASS || null,
  },
  host: 'email-smtp.eu-west-1.amazonaws.com',
  port: 587,
  requireTLS: true,
};
