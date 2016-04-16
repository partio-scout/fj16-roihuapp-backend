export default {
  service: 'SES',
  auth: {
    user: process.env.AWS_SES_MAILUSER || null,
    pass: process.env.AWS_SES_MAILPASS || null,
  }
};
