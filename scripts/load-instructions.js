import app from '../src/server/server';
import Promise from 'bluebird';
import _ from 'lodash';
import request from 'superagent';

export function instructionsHandler(articles, categories) {
  const createInstuction = Promise.promisify(app.models.Instruction.create, { context: app.models.Instruction });
  const createInstuctionCategory = Promise.promisify(app.models.InstructionCategory.create, { context: app.models.InstructionCategory });
  return new Promise((resolve, reject) => {
    console.log('----- ARTICLES --------');
    console.log(articles);
    console.log('----- CATEGORIES ------');
    console.log(categories);

    const instructions = [];
    const instructionCategories = [];

    _.forEach(articles, article => {
      instructions.push({
        instructionId: parseInt(article.nid),
        categoryId: parseInt(article.field_category_in_participant_in.tid),
        sortNo: parseInt(article['Sort number'].value),
        lastModified: article['Päivitetty'],
        name: article.title,
        description: article.body.value,
        lang: getLangCode(article.language),
      });
    });

    _.forEach(categories, category => {
      instructionCategories.push({
        categoryId: parseInt(category.tid),
        name: category.name,
        sortNo: parseInt(category.Paino),
        lang: getLangCode(category.field_language),
        lastModified: new Date(),
      });
    });

    console.log('-----------------');
    console.log(instructions);
    console.log('-----------------');
    console.log(instructionCategories);

    Promise.join(
      createInstuctionCategory(instructionCategories),
      createInstuction(instructions),
      (inst, cat) => {
        resolve();
      }).catch(err => {
        console.log(err);
        reject(err);
      });

  });

  function getLangCode(langText) {
    const langs = {
      suomi: 'FI',
      Finnish: 'FI',
      ruotsi: 'SV',
      Swedish: 'SV',
      englanti: 'EN',
      English: 'EN',
    };
    console.log('LANGTEXT',langText);
    return langs[langText] || '';
  }
}

export function loadInstructions(handler) {
  const baseurl = 'http://fj16-qa.jelastic.planeetta.net/api/infoarticles';
  return new Promise((resolve, reject) => {
    request.get(`${baseurl}/participant`)
    .end((err, articles) => {
      if (err) reject(err);
      else {
        request.get(`${baseurl}/categories`)
        .end((err, categories) => {
          if (err) reject(err);
          else {
            return handler(articles.body, categories.body);
          }
        });
      }
    });
  });
}

if (require.main === module) {
  loadInstructions(instructionsHandler)
  .then(() => {
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
}
