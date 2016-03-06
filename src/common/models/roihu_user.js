export default function(RoihuUser) {

  RoihuUser.findByMemberNumber = function(memberNumber) {
    const query = {
      where: {
        memberNumber: memberNumber,
      },
    };
    return RoihuUser.findOne(query);
  };

}
