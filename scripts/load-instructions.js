import app from '../src/server/server';
import Promise from 'bluebird';
import _ from 'lodash';
import request from 'superagent';

export function instructionsHandler(articles, categories) {
  const Instruction = app.models.Instruction;
  const InstructionCategory = app.models.InstructionCategory;
  const createInstuction = Promise.promisify(Instruction.create, { context: Instruction });
  const createInstuctionCategory = Promise.promisify(InstructionCategory.create, { context: InstructionCategory });
  const deleteInstruction = Promise.promisify(Instruction.destroyAll, { context: Instruction });
  const deleteInstructionCategory = Promise.promisify(InstructionCategory.destroyAll, { context: InstructionCategory });

  return new Promise((resolve, reject) => {
    const instructions = [];
    const instructionCategories = [];

    _.forEach(articles, article => {
      if (!article.field_category_in_participant_in.tid) return;
      if (!article.title) return;
      if (!article.language) return;
      if (article.body.format !== 'fj16_markdown') return;

      instructions.push({
        instructionId: parseInt(article.nid),
        categoryId: parseInt(article.field_category_in_participant_in.tid),
        sortNo: parseInt(article['Sort number'].value),
        lastModified: article['Päivitetty'],
        name: article.title,
        description: replaceInvalidNewLines(article.body.value),
        lang: getLangCode(article.language),
      });
    });

    _.forEach(categories, category => {
      if (!category.name) return;
      if (!category.field_language) return;

      instructionCategories.push({
        categoryId: parseInt(category.tid),
        name: category.name,
        sortNo: parseInt(category.Paino),
        lang: getLangCode(category.field_language),
        lastModified: new Date(),
      });
    });

    Promise.join(deleteInstruction(), deleteInstructionCategory(), () => {

      Promise.join(
        createInstuctionCategory(instructionCategories),
        createInstuction(instructions),
        (inst, cat) => {
          resolve();
        }).catch(err => {
          reject(err);
        });
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

    return langs[langText] || '';
  }

  function replaceInvalidNewLines(text) {
    return text.replace(/\u2028/g, '')
      .replace(/\u2029/g, '');
  }
}

export function loadInstructions(handler) {
  const baseurl = process.env.INSTRUCTIONS_SOURCE;
  return new Promise((resolve, reject) => {
    request.get(`${baseurl}/api/infoarticles/participant`)
    .end((err, articles) => {
      if (err) reject(err);
      else {
        request.get(`${baseurl}/api/infoarticles/categories`)
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
    console.log(err);
    process.exit(0);
  });
}
