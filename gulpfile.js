'use strict';

const build = require('@microsoft/sp-build-web');

build.addSuppression(`Warning - [sass] The local CSS class 'ms-Grid' is not camelCase and will not be type-safe.`);

var getTasks = build.rig.getTasks;
build.rig.getTasks = function () {
  var result = getTasks.call(build.rig);

  result.set('serve', result.get('serve-deprecated'));

  return result;
};



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






build.initialize(require('gulp'));
