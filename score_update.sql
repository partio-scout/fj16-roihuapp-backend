/*
  Updates achievement category scores.
*/
UPDATE achievement_category SET leading_score=scores.leading_score,average_score=scores.average_score FROM (
  SELECT category category_id, max(achievements) leading_score, ceil(sum(achievements)/count(apiuser)) average_score FROM (
    SELECT ac.category_id category, count(ach_user.achievementid) achievements, ach_user.apiuserid apiuser 
    FROM achievement a, achievement_category ac, achievementapiuser ach_user 
    WHERE a.category_id=ac.id_from_source AND ach_user.achievementid=a.achievement_id 
    GROUP BY ac.category_id, ach_user.apiuserid
  ) cat_achievements
  GROUP BY category
) scores WHERE scores.category_id=achievement_category.category_id;
