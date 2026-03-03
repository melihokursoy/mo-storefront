/* eslint-disable */

module.exports = async function () {
  // Services are managed by Nx (via api-gateway:serve dependsOn) or run externally.
  // Do not kill ports — let Nx handle cleanup.
  // Hint: `globalThis` is shared between setup.
  console.log(globalThis.__TEARDOWN_MESSAGE__);
};
