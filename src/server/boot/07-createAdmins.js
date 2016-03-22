import Promise from 'bluebird';

export default function(app) {
  const User = app.models.RoihuUser;
  const findUser = Promise.promisify(User.findOne, { context: User });
  const Role = app.models.Role;
  const findRole = Promise.promisify(Role.findOne, { context: Role });
  const RoleMapping = app.models.RoleMapping;

  Promise.join(
    findUser({ where: { memberNumber: '123ADMIN456' } }),
    findRole({ where: { name: 'admin' } }),
    (user, role) => {
      role.principals.create({
        principalType: RoleMapping.USER,
        principalId: user.id
      }, (err, principal) => {
        if (err) console.log('Role assing fail:', err);
      });
    })
    .catch(err => console.log('No admin created: ', err));
}
