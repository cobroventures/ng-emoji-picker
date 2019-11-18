//Config = {};

var categoriesListOrder = {
  Symbols: 1,
  Activities: 6,
  Flags: 7,
  'Travel & Places': 3,
  'Food & Drink': 4,
  'Animals & Nature': 5,
  Objects: 2,
  'Smileys & People': 0
}

function createCategoryToElementMap(){
  var map = {};
  var full = window.fullEmojiRawData;

  for (var index in full) {
    var singleElement = full[index];

    if (!singleElement.has_img_twitter) {
      continue;
    }

    if (!map[singleElement.category]) {
      map[singleElement.category] = [];
      map[singleElement.category].push(singleElement);
    } else {
      for (var catIndex = 0; catIndex < map[singleElement.category].length; catIndex++) {
        var added = false;
        if (map[singleElement.category][catIndex].sort_order > singleElement.sort_order) {
          added = true;
          map[singleElement.category].splice(catIndex, 0, singleElement);
          break;
        }
      }
      if (!added) {
        map[singleElement.category].splice(map[singleElement.category].length, 0, singleElement);
      }
    }
  }

  return map;
}

function createEmojiCategoriesList(fullEmojiMap) {
  if (fullEmojiMap) {
    var tempListMap = {};
    Config.EmojiCategories = new Array (Object.keys(categoriesListOrder).length);
    var allCats = Object.keys(fullEmojiMap);

    for (var catIndex = 0; catIndex < allCats.length; catIndex++) {
      if ('Skin Tones' === allCats[catIndex]) {
        continue;
      }

      var tempList = [];
      for (var itemIndex =0; itemIndex < fullEmojiMap[allCats[catIndex]].length; itemIndex++) {
        tempList.push(fullEmojiMap[allCats[catIndex]][itemIndex].unified.toLowerCase());
      }
      Config.EmojiCategories.splice(categoriesListOrder[allCats[catIndex]], 1, tempList);
    }
  }
  console.log("number of categories is: " + Config.EmojiCategories.length);
}

function downloadFile(content, fileName, contentType) {
    var a = document.createElement("a");
    var file = new Blob([content], {type: contentType});
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
}

function downloadCategoriesStringAsJson(){
  var string = "Config.EmojiCategories = " + "[";
  for (var categoryIndex = 0; categoryIndex < Config.EmojiCategories.length; categoryIndex++) {
    string = string + "[";

    for (var elementIndex = 0; elementIndex < Config.EmojiCategories[categoryIndex].length; elementIndex++) {
      string = string + '"' + Config.EmojiCategories[categoryIndex][elementIndex] + '"';

      if (elementIndex < (Config.EmojiCategories[categoryIndex].length - 1)) {
        string = string + ","
      } else {
        string = string + "]";
      }
    }
    if (categoryIndex < Config.EmojiCategories.length - 1) {
      string = string + ","
    } else {
      string = string + "]"
    }
  }

  string = string + ";";

  downloadFile(string, 'emoji-categories.txt', 'text/plain');
}

function createAndDownloadCategoriesData() {
  var map = createCategoryToElementMap();
  createEmojiCategoriesList(map);
  downloadCategoriesStringAsJson();
}

function createEmojiToUnicodeMap() {
  var allKeys = Object.keys(Config.emoji_data);

  Config.Emoji = {
  };

  for (var allKeyIndex in allKeys) {
    var keyToUse = allKeys[allKeyIndex];
    var emojiDataToUse = Config.emoji_data[keyToUse];

    Config.Emoji[keyToUse] = [];
    var unifiedToUse = "";
    if (emojiDataToUse[0].length) {
      unifiedToUse = emojiDataToUse[0][Config.emoji_data[keyToUse][0].length - 1];


      Config.Emoji[keyToUse].push(unifiedToUse);
      Config.Emoji[keyToUse].push(emojiDataToUse[3]);
    }
  }
}

function downloadEmojiToUnicodeMap(){
  var string = "Config.Emoji = {";
  var allKeys = Object.keys(Config.Emoji);

  for (var allKeyIndex = 0; allKeyIndex < allKeys.length; allKeyIndex++) {
    var keyToUse = allKeys[allKeyIndex];
    string += '"' + keyToUse + '"' + ': ["' +
      Config.Emoji[keyToUse][0] + '"' +  "," + "[" + '"' +
      Config.Emoji[keyToUse][1][0] + '"' + "]]";

    if (allKeyIndex < allKeys.length - 1) {
      string += ",";
    }
  }

  string = string + "};";

  downloadFile(string, 'emoji-unicode-map.txt', 'text/plain');
}

function createAndDownloadEmojiToUnicodeMap() {
  var map = createEmojiToUnicodeMap();
  downloadEmojiToUnicodeMap();
}

function createAllConfigData() {
  createAndDownloadCategoriesData();
  createAndDownloadEmojiToUnicodeMap();
}

createAllConfigData();
