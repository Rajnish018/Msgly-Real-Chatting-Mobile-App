const ExpoKeepAwakeTag = "ExpoKeepAwakeDefaultTag";

function useKeepAwake() {}

async function activateKeepAwakeAsync() {}

async function deactivateKeepAwake() {}

async function isAvailableAsync() {
  return false;
}

module.exports = {
  ExpoKeepAwakeTag,
  useKeepAwake,
  activateKeepAwakeAsync,
  deactivateKeepAwake,
  isAvailableAsync,
};
