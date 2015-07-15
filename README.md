# shipit-captain 
> Invoke [Shipit](https://github.com/shipitjs/shipit) and tasks on your own terms, without `shipit-cli`. Includes [Inquirer.js](https://github.com/SBoudrias/Inquirer.js) prompts, [CLI arguements](https://github.com/bcoe/yargs), customized logging, and more.

## Why?
Shipit comes with it's own [CLI](https://github.com/shipitjs/shipit#launch-command), but I wanted to integrate Shipit tasks into our existing task workflow, be it Gulp, Grunt, or anything else.

Using shipit-captain will let you easily do things like [set default environments](https://github.com/shipitjs/shipit/issues/38), log confirmation prompts, and easily integrate into Gulp tasks.

## Install

```sh
$ npm install --save shipit-captain
```

## Usage

You can organize your config files any way you like. Below is my preference, as it still allows shipit-cli commands to work, as well as shipit-captain. The only requirment is you must separate your `shipit.config` exports.

### Example `shipitfile.js`
```js
module.exports = require('./config/shipit').init;
```

### Example `config/shipit.js`

```js
var config: {
  default: {
    workspace: '/tmp/github-monitor',
    deployTo: '/tmp/deploy_to',
    repositoryUrl: 'https://github.com/user/repo.git',
    ignores: ['.git', 'node_modules'],
    keepReleases: 2,
    deleteOnRollback: false,
    key: '/path/to/key',
    shallowClone: true
  },
  staging: {
    servers: 'user@myserver.com'
  }
};
module.exports.config = config;
module.exports.initConfig = function(shipit) {
  require('shipit-shared')(shipit);
  shipit.initConfig(config);
}
```

### Example `gulpfile.js`
```js
var gulp   = require('gulp');
var shipitCaptain = require('shipit-captain');

// With no options, will run shipit-deploy task by default.
gulp.task('shipit', function(cb) {
  shipitCaptain(shipitConfig, cb);
});

// Run other after shipit tasks are completed 
gulp.task('myTask', ['shipit'], function(cb) {
  console.log('Shipit tasks are done!');
  cb();
});

// Pass options 
var options = {
  init: require('config/shipit').init,
  tasks: ['deploy', 'clean'],
  targetEnv: 'staging',
}

gulp.task('deploy', function(cb) {
  shipitCaptain(shipitConfig, options, cb);
});
// 

```

## API

### captain(shipitConfig, [options], [cb])

------

#### shipitConfig

`@param {object} shipitConfig`

> The config object you would normally pass to `shipit.initConfig`.

##### Gulp example:

```bash
gulp shipit -e production
```

------

#### options.run

`@param {string|string[]} [options.run=['deploy']]`

> An string or array of strings of shipit tasks to run. If not set, user will be prompted for a task to run from all available tasks.

> Users may set `options.run` manually, or by passing the `-r` or `--run` argument via the CLI. If set via CLI, comma-separate multiple tasks names.

##### Gulp example:

```bash
gulp shipit --run deploy,myOtherTask
```

------

#### options.availableEnvs

`{string[]} [options.availableEnvs]`
 
> By default this will be set to any environments defined in `shipitConfig`. This shouldn't normally need to be set.

------

#### options.logItems

`{function} [options.logItems(options, shipit)]`

##### Gulp example:

```js
var options = {
  logItems: function(options, shipit) {
    return {
      'Environment': options.targetEnv,
      'Branch': shipit.config.branch,
    };
  },
};

gulp.task('shipit', function(cb) {
  shipitCaptain(shipitConfig, options, cb);
});

```

------

#### options.init

`{function} [options.init(shipit)]`

Require Shipit plugins or anything else you would have in your [`shipitfile`](https://github.com/shipitjs/shipit#example-shipitfilejs).

You **do not** need to call `shipit.initConfig`. It will be called automatically if it has not been called.

##### Gulp example:

```js
var options = {
  init: function(options, shipit) {
    require('shipit-deploy')(shipit);
    require('shipit-shared')(shipit);
  }
};

gulp.task('shipit', function(cb) {
  shipitCaptain(shipitConfig, options, cb);
});
```

------

#### cb

`{function} cb`

Optional callback function, called when all shipit tasks are complete.

```js
var gulp   = require('gulp');
var shipitCaptain = require('shipit-captain');

gulp.task('shipit', function(cb) {
  shipitCaptain(shipitConfig, cb);
});
```

## License

MIT © [Tim kelty](http://fusionary.com)
