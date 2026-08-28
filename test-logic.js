let localModules = [{ id: '1', title: 'Old', items: [{ id: 'item1', title: 'old item' }] }];

function setDraftModules(newModules) {
  localModules = newModules;
}

function updateModule(index, field, value) {
  const newModules = [...localModules];
  newModules[index] = { ...newModules[index], [field]: value };
  setDraftModules(newModules);
}

function updateModuleItem(moduleIndex, itemIndex, field, value) {
  const newModules = [...localModules];
  const item = newModules[moduleIndex].items[itemIndex];
  newModules[moduleIndex].items[itemIndex] = { ...item, [field]: value };
  setDraftModules(newModules);
}

updateModule(0, 'title', 'New Title');
console.log('After updateModule:', localModules[0].title);
updateModuleItem(0, 0, 'title', 'New Item');
console.log('After updateModuleItem:', localModules[0].title, localModules[0].items[0].title);
