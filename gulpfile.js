'use strict';

const build = require('@microsoft/sp-build-web');
const path = require('path');

build.addSuppression(`Warning - [sass] The local CSS class 'ms-Grid' is not camelCase and will not be type-safe.`);

var getTasks = build.rig.getTasks;
build.rig.getTasks = function () {
  var result = getTasks.call(build.rig);

  result.set('serve', result.get('serve-deprecated'));

  return result;
};



// tailwind
const postcss = require("gulp-postcss");
const tailwind = require("@tailwindcss/postcss");

const tailwindcss = build.subTask(
    "@tailwindcss/postcss",
    function (gulp, buildOptions, done) {
      gulp
          .src("./src/styles/tailwind.css")
          .pipe(
              postcss([
                tailwind("./tailwind.config.js"),
              ])
          )
          .pipe(gulp.dest("dist"));
      done();
    }
);
build.rig.addPreBuildTask(tailwindcss);

// aliases
build.configureWebpack.mergeConfig({
    additionalConfiguration: (generatedConfig) => {
        generatedConfig.resolve = generatedConfig.resolve || {};
        generatedConfig.resolve.alias = {
            ...(generatedConfig.resolve.alias || {}),
            '@dist': path.resolve(__dirname, 'dist'),
            '@styles': path.resolve(__dirname, 'lib/styles'),
            '@webparts': path.resolve(__dirname, 'lib/webparts'),
            '@extensions': path.resolve(__dirname, 'lib/extensions'),
        };
        return generatedConfig;
    },
});

/* fast-serve */
const { addFastServe } = require("spfx-fast-serve-helpers");
addFastServe(build);
/* end of fast-serve */


build.initialize(require('gulp'));

