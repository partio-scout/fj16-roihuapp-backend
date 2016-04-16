import Promise from 'bluebird';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import * as errorUtils from '../utils/errors';

export default function(RoihuUser) {

  RoihuUser.findByMemberNumber = function(memberNumber) {
    const query = {
      where: {
        memberNumber: memberNumber,
      },
    };
    return RoihuUser.findOne(query);
  };

  RoihuUser.emailLogin = function(mail, cb) {
    const ACCESS_TOKEN_LIFETIME = 90 * 24 * 60 * 60;
    const findUser = Promise.promisify(RoihuUser.findOne, { context: RoihuUser });
    //const createUser = Promise.promisify(RoihuUser.create, { context: RoihuUser });

    findOrCreateUser(mail)
    .then(generateAccessToken)
    .then(token => {
      // send email
      const url = `roihu://${token.userId}/${token.id}`;
      const transporter = nodemailer.createTransport({

      });
      const mailOptions = {
        from: '"roihuapp" <roihuapp-noreply@roihu2016.fi>',
        to: mail,
        subject: 'Roihuapp email login',
        text: url,
        html: `<a href="${url}">${url}</a>`,
      };

      transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          console.error(err);
          cb(errorUtils.createHTTPError('mail send failed', 500, null), null);
        }
        console.log(info);
      });

    })
    .catch(err => {
      cb(err, null);
    });

    function findOrCreateUser(mail) {
      return findUser({ where: { email: mail } })
      .then(user => {
        (user || RoihuUser.create({
          firstname: 'NoName',
          lastname: 'NoName',
          email: mail,
          password: crypto.randomBytes(24).toString('hex'),
          lastModified: new Date(),
        }));
      });
    }

    function generateAccessToken(user) {
      return user.createAccessToken(ACCESS_TOKEN_LIFETIME);
    }

  };

  RoihuUser.remoteMethod(
    'emailLogin',
    {
      http: { path: '/emailLogin', verb: 'post' },
      accepts: [
        { arg: 'email', type: 'string' },
      ],
      returns: { arg: 'token', type: 'string' },
    }
  );

}
