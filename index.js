var _ = require('lodash');
var Shipit = require('shipit-cli');
var inquirer = require('bluebird-inquirer');
var chalk = require('chalk');
var util = require('util');
var yargs = require('yargs');

function captain(shipitConfig, options) {
  var argv = yargs.option('target', {
    alias: 't',
  }).argv;
  var targetEnv = argv['target'] || false;
  var shipit;
  var options = _.defaults(options || {}, {
    init: function(shipit) {
      return shipit.initConfig(shipitConfig);
    }
  });
  var availableEnvs = _.without(Object.keys(shipitConfig), 'default');

  var confirmPrompt = function confirmPrompt(targetEnv, shipit) {
    var msg = [
      chalk.bold('- Environment: %s'),
      chalk.bold('- Branch: %s'),
      chalk.bold('- Path: %s'),
    ];

    return util.format(
      '\n' + msg.join('\n') + '\n',
      chalk.blue(targetEnv),
      chalk.blue(shipit.config.branch),
      chalk.blue(shipit.config.deployTo)
    );
  };

  var envPrompt = function envPrompt(targetEnv, availableEnvs) {
    if (availableEnvs.length > 1) {
      return inquirer.prompt([{
        type: 'list',
        name: 'targetEnv',
        default: targetEnv,
        message: 'Target environment:',
        choices: availableEnvs
      }])
    }

    return Promise.resolve({targetEnv: availableEnvs[0]});
  };

  return envPrompt(targetEnv, availableEnvs)
  .then(function(answers) {
    targetEnv = answers.targetEnv;
    shipit = new Shipit({environment: targetEnv});

    // TODO: check that options.init must be a fn
    options.init(shipit);

    // Log details with confirmation
    console.log(confirmPrompt(targetEnv, shipit));

    return inquirer.prompt([{
      type: 'confirm',
      name: 'deployConfirm',
      default: true,
      message: 'Proceed with deploy?',
    }]).then(function(answers) {
      if (answers.deployConfirm) {
        shipit.initialize();
        shipit.start('deploy');
      }
    });
  });
}

module.exports = captain;
