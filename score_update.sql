/*
  Updates achievement category scores.
*/
update achievement_category set leading_score=scores.leading_score,average_score=scores.average_score from (select category category_id, max(achievements) leading_score, ceil(sum(achievements)/count(roihuuser)) average_score from 
(select ac.category_id category,count(aru.achievementid) achievements,aru.roihuuserid roihuuser from achievement a,achievement_category ac,achievementroihuuser aru 
where a.category_id=ac.id_from_source and aru.achievementid=a.achievement_id group by ac.category_id,aru.roihuuserid) cat_achievements
group by category) scores where scores.category_id=achievement_category.category_id;
