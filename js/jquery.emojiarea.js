// Original Liscense
/**
 * emojiarea - A rich textarea control that supports emojis, WYSIWYG-style.
 * Copyright (c) 2012 DIY Co
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this
 * file except in compliance with the License. You may obtain a copy of the License at:
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF
 * ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 *
 * @author Brian Reavis <brian@diy.org>
 */

/**
 * This file also contains some modifications by Igor Zhukov in order to add
 * custom scrollbars to EmojiMenu See keyword `MODIFICATION` in source code.
 */
(function($, window, document) {

	var ELEMENT_NODE = 1;
	var TEXT_NODE = 3;
	var TAGS_BLOCK = [ 'p', 'div', 'pre', 'form' ];
	var KEY_ESC = 27;
	var KEY_TAB = 9;
  var KEY_ENTER = 13;
	/* Keys that are not intercepted and canceled when the textbox has reached its max length:
	 	   Backspace, Tab, Ctrl, Alt, Left Arrow, Up Arrow, Right Arrow, Down Arrow, Cmd Key, Delete
	*/
	var MAX_LENGTH_ALLOWED_KEYS = [8, 9, 17, 18, 37, 38, 39, 40, 91, 46];

	// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

	/*
	 * ! MODIFICATION START Options 'spritesheetPath', 'spritesheetDimens',
	 * 'iconSize' added by Andre Staltz.
	 */
	$.emojiarea = {
		assetsPath : '',
		iconSize : 25,
    sheetIconSize: 32,
		emojiAttachmentLocation: "bottom right",
		emojiMenuLocation: "top left",
		icons : {},
	};
	var defaultRecentEmojis = ':joy:,:kissing_heart:,:heart:,:heart_eyes:,:blush:,:grin:,:+1:,:pensive:,:smile:,:sob:,:kiss:,:unamused:,:flushed:,:stuck_out_tongue_winking_eye:,:see_no_evil:,:wink:,:smiley:,:cry:,:stuck_out_tongue_closed_eyes:,:scream:,:rage:,:smirk:,:disappointed:,:sweat_smile:,:kissing_closed_eyes:,:speak_no_evil:,:relieved:,:grinning:,:yum:,:laughing:,:ok_hand:,:neutral_face:,:confused:'
			.split(',');
	/* ! MODIFICATION END */

	$.fn.emojiarea = function(options) {
		options = $.extend({}, options);
		return this
			.each(function () {
				var originalInput = $(this);
				var id = getGuid();
				new EmojiArea_Plain(originalInput, id, options);
				originalInput.attr(
					{
						'data-emojiable': 'converted',
						'data-id': id,
						'data-type': 'original-input'
					});
			});
	};

	// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

	var util = {};

	util.restoreSelection = (function() {
		if (window.getSelection) {
			return function(savedSelection) {
				var sel = window.getSelection();
				sel.removeAllRanges();
				for (var i = 0, len = savedSelection.length; i < len; ++i) {
					sel.addRange(savedSelection[i]);
				}
			};
		} else if (document.selection && document.selection.createRange) {
			return function(savedSelection) {
				if (savedSelection) {
					savedSelection.select();
				}
			};
		}
	})();

	util.saveSelection = (function() {
		if (window.getSelection) {
			return function() {
				var sel = window.getSelection(), ranges = [];
				if (sel.rangeCount) {
					for (var i = 0, len = sel.rangeCount; i < len; ++i) {
						ranges.push(sel.getRangeAt(i));
					}
				}
				return ranges;
			};
		} else if (document.selection && document.selection.createRange) {
			return function() {
				var sel = document.selection;
				return (sel.type.toLowerCase() !== 'none') ? sel.createRange()
						: null;
			};
		}
	})();

	util.replaceSelection = (function() {
		if (window.getSelection) {
			return function(content) {
				var range, sel = window.getSelection();
				var node = typeof content === 'string' ? document
						.createTextNode(content) : content;
				if (sel.getRangeAt && sel.rangeCount) {
					range = sel.getRangeAt(0);
					range.deleteContents();
					//range.insertNode(document.createTextNode(''));
					range.insertNode(node);
					range.setStart(node, 0);

					window.setTimeout(function() {
						range = document.createRange();
						range.setStartAfter(node);
						range.collapse(true);
						sel.removeAllRanges();
						sel.addRange(range);
					}, 0);
				}
			}
		} else if (document.selection && document.selection.createRange) {
			return function(content) {
				var range = document.selection.createRange();
				if (typeof content === 'string') {
					range.text = content;
				} else {
					range.pasteHTML(content.outerHTML);
				}
			}
		}
	})();

	util.insertAtCursor = function(text, el) {
		/*Do not add an extra white-space*/
		var val = el.value, endIndex, startIndex, range;
    if (window.emojiPicker.insertEmojiFunc && window.emojiPicker.options.targetIdentifier){
      // If the client provided a function to add the emojis, use that to add the
      // emoji to the element. This is used in the case of the trix editor since
      // that uses its own function to insert text into its editor.
      // A target identifier is needed so that we can identify which element (trix editor)
      // to target since there can be multiple trix editors
      window.emojiPicker.insertEmojiFunc(window.emojiPicker.options.targetIdentifier, text);
    } else if (typeof el.selectionStart != 'undefined'
				&& typeof el.selectionEnd != 'undefined') {
			startIndex = el.selectionStart;
			endIndex = el.selectionEnd;
			el.value = val.substring(0, startIndex) + text
					+ val.substring(el.selectionEnd);
			el.selectionStart = el.selectionEnd = startIndex + text.length;
		} else if (typeof document.selection != 'undefined'
				&& typeof document.selection.createRange != 'undefined') {
			range = document.selection.createRange();
			range.text = text;
			range.select();
		}
	};

	util.extend = function(a, b) {
		if (typeof a === 'undefined' || !a) {
			a = {};
		}
		if (typeof b === 'object') {
			for ( var key in b) {
				if (b.hasOwnProperty(key)) {
					a[key] = b[key];
				}
			}
		}
		return a;
	};

	util.escapeRegex = function(str) {
		return (str + '').replace(/([.?*+^$[\]\\(){}|-])/g, '\\$1');
	};

  // When the isForDisplay field is triur, it means that this can be
  // potentially dispalyed to the user.
	util.htmlEntities = function(str, isForDisplay) {
    var retStr = String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
			.replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    if (isForDisplay) {
      // The string is of the form ":smiley:" but we want to show smiley
      // instead in the tooltip. So remove the ":"
      // Also replace _ with white space since underscore looks a little
      // more technical in this context
      retStr = retStr.replace(/:/g, '').replace(/_/g, ' ');
    }

    return retStr;
	};

	/*
	 * ! MODIFICATION START This function was added by Igor Zhukov to save
	 * recent used emojis.
	 */
	util.emojiInserted = function(emojiKey, menu) {
		ConfigStorage.get('emojis_recent', function(curEmojis) {
			curEmojis = curEmojis || defaultRecentEmojis || [];

			var pos = curEmojis.indexOf(emojiKey);
			if (!pos) {
				return false;
			}
			if (pos != -1) {
				curEmojis.splice(pos, 1);
			}
			curEmojis.unshift(emojiKey);
			if (curEmojis.length > 40) {
				// Limit recent emojis to 40 (=8x5)
				curEmojis.length = 40;
			}

			ConfigStorage.set({
				emojis_recent : curEmojis
			});
		})
	};
	/* ! MODIFICATION END */

	// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
	var EmojiArea = function() {
	};

	EmojiArea.prototype.setup = function() {
		var self = this;

    // Assign a unique instance of an emojiMenu to
    self.emojiMenu = new EmojiMenu(self);

		this.setupButton();
	};

	EmojiArea.prototype.setupButton = function() {
		var self = this;
		var $button = $('[data-id=' + this.id + '][data-type=picker]');

    $button.on('click', function(e) {
      self.emojiMenu.show(self);
		});

		this.$button = $button;
    this.$dontHideOnClick = 'emoji-picker';
	};

	/*
	 * ! MODIFICATION START This function was modified by Andre Staltz so that
	 * the icon is created from a spritesheet.
	 */
	EmojiArea.createIcon = function(emoji, menu) {
		var category = emoji[0];//Example value: 0
		var row = emoji[1];//Example value: 1
		var column = emoji[2];//Exampe value: 0
		var name = emoji[3];//Example value: :sweat_smile:
    // We are using a single sprite sheet
		var filename = $.emojiarea.assetsPath + '/emoji_spritesheet.png';
    // Does this need a new file, not sure of the license on this one
    var blankGifPath = $.emojiarea.assetsPath + '/blank.gif';
		var iconSize = menu && Config.Mobile ? 26 : $.emojiarea.iconSize;//25
		var xoffset = -(iconSize * column) + Math.floor(column/2);
		var yoffset = -(iconSize * row) + Math.floor(row/2);

		var style = 'display:inline-block;';
		style += 'width:' + iconSize + 'px;';
		style += 'height:' + iconSize + 'px;';

    var sheetIconSize = $.emojiarea.sheetIconSize

    var sheet_size = Config.EmojiCategorySpritesheetDimens[0][0] * (sheetIconSize+2); // size of image in pixels
    var sheet_x = 100 * (((column * (sheetIconSize+2)) + 1) / (sheet_size - sheetIconSize));
    var sheet_y = 100 * (((row * (sheetIconSize+2)) + 1) / (sheet_size - sheetIconSize));
    var sheet_sz = 100 * (sheet_size / sheetIconSize);

    style += 'background: url('+filename+');background-position:'+(sheet_x)+'% '+(sheet_y)+'%;background-size:'+sheet_sz+'% '+sheet_sz+'%';

      // Do not allow users to drag these emojis
		return '<img src="' + blankGifPath + '" draggable="false" class="img" style="'
				+ style + '" alt="' + util.htmlEntities(name, true) + '">';

	};

	$.emojiarea.createIcon = EmojiArea.createIcon;
	/* ! MODIFICATION END */

	// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
	/**
	 * Editor (plain-text)
	 *
	 * @constructor
	 * @param {object}
	 *            $textarea
	 * @param {object}
	 *            options
	 */

	var EmojiArea_Plain = function($textarea, id, options) {
		this.options = options;
		this.$textarea = $textarea;
		this.options.inputMethod = 'unicode';
    this.emojiPopup = options.emojiPopup;
		this.$editor = $textarea;
    this.id = id;

    // The code below changes emoji unicodes to images, since
    // images look better on the UI. However, this code causes
    // rendering when using it in conjunction with the image
    // picker, so just avoid having this code for now. The emojis
    // look fine.

    /*
    var unicodeToImageText = this.emojiPopup.unicodeToImage($textarea.val());
		this.$editor.html(unicodeToImageText);
		this.$editor.attr({
			'data-id': id,
			'data-type': 'input',
			'placeholder': $textarea.attr('placeholder'),
			'contenteditable': 'true',
		});*/

	var changeEvents = 'blur change';
		if (!this.options.norealTime) {
			changeEvents += ' keyup';
		}
		/* ! MODIFICATION END */

    var editorDiv = this.$editor;
		this.$editor.on("change keydown keyup resize scroll", function(e) {
      if(MAX_LENGTH_ALLOWED_KEYS.indexOf(e.which) == -1 &&
				!((e.ctrlKey || e.metaKey) && e.which == 65) && // Ctrl + A
				!((e.ctrlKey || e.metaKey) && e.which == 67) && // Ctrl + C
				editorDiv.text().length + editorDiv.find('img').length >= editorDiv.attr('maxlength'))
      {
        e.preventDefault();
      }
    });

		if (this.options.onPaste) {
			var self = this;
			this.$editor.on("paste", function (e) {
				e.preventDefault();

				if ((e.originalEvent || e).clipboardData) {
					var content = (e.originalEvent || e).clipboardData.getData('text/plain');
					var finalText = self.options.onPaste(content);
					document.execCommand('insertText', false, finalText);
				}
				else if (window.clipboardData) {
					var content = window.clipboardData.getData('Text');
					var finalText = self.options.onPaste(content);
					document.selection.createRange().pasteHTML(finalText);
				}
				editorDiv.scrollTop(editorDiv[0].scrollHeight);
			});
		}

    // Instead of adding right after, add it as the last child of parent.
    // This is because the styling for inputs labels depends on the
    // textarea being the previous sibling, and we do not want to break that.
    $textarea.parent().append("<i class='bu-icon bu-icon--emoji-smiley emoji-picker-open-button emoji-picker " + this.options.popupButtonClasses + "' data-id='" + id + "' data-type='picker'></i>");

		this.setup();
	};

	EmojiArea_Plain.prototype.insert = function(emoji) {
		var content;
		/*
		 * MODIFICATION: Following line was modified by Andre Staltz, to use new
		 * implementation of createIcon function.
		 */
		var insertionContent = '';
		insertionContent = this.emojiPopup.colonToUnicode(emoji);
		util.insertAtCursor(insertionContent, this.$textarea[0]);
		/*
		 * MODIFICATION: Following line was added by Igor Zhukov, in order to
		 * save recent emojis
		 */
		util.emojiInserted(emoji, this.menu);
		this.$textarea.trigger('change');
		this.$textarea.focus();
	};

	EmojiArea_Plain.prototype.val = function() {
		if (this.$textarea == '\n')
			return '';
		return this.$textarea.val();
	};

	util.extend(EmojiArea_Plain.prototype, EmojiArea.prototype);


	// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  jQuery.fn.hasScrollbar = function() {
    var scrollHeight = this.get(0).scrollHeight;

    //safari's scrollHeight includes padding
    //if ($.browser.safari)
//      scrollHeight -= parseInt(this.css('padding-top')) + parseInt(this.css('padding-bottom'));
    if (this.outerHeight() < scrollHeight)
      return true;
    else
      return false;
  }

	/**
	 * Emoji Dropdown Menu
	 *
	 * @constructor
	 * @param {object}
	 *            emojiarea
	 */
	var EmojiMenu = function(emojiarea) {
		var self = this;
    self.id = emojiarea.id;
		var $body = $(document.body);
		var $window = $(window);

		this.visible = false;
		this.emojiarea = emojiarea;
		EmojiMenu.menuZIndex = 5000;
		this.$menu = $('<div>');
		this.$menu.addClass('emoji-menu');
    this.$menu.attr('data-id', self.id);
    this.$menu.attr('data-type', 'menu');
		this.$menu.hide();

    window.emojiPickerStatus.emojiMenu = this;
		/*
		 * ! MODIFICATION START Following code was modified by Igor Zhukov, in
		 * order to add scrollbars and tail to EmojiMenu Also modified by Andre
		 * Staltz, to include tabs for categories, on the menu header.
		 */
		this.$itemsTailWrap = $('<div class="emoji-items-wrap1"></div>')
				.appendTo(this.$menu);
		this.$categoryTabs = $(
				'<table class="emoji-menu-tabs"><tr>'
            + '<td><a class="bu-icon bu-icon--clock emoji-menu-tab "></a></td>'//Recent
            + '<td><a class="bu-icon bu-icon--emoji-smiley emoji-menu-tab"></a></td>'//People
            + '<td><a class="bu-icon bu-icon--circle_checked emoji-menu-tab "></a></td>'//Symbols
						+ '<td><a class="bu-icon bu-icon--emoji-object emoji-menu-tab"></a></td>'//Objects
            + '<td><a class="bu-icon bu-icon--emoji-travel emoji-menu-tab"></a></td>'//Places
            + '<td><a class="bu-icon bu-icon--emoji-food emoji-menu-tab"></a></td>'//Foods
						+ '<td><a class="bu-icon bu-icon--emoji-animal emoji-menu-tab"></a></td>'//Nature
						+ '<td><a class="bu-icon bu-icon--emoji-activities emoji-menu-tab"></a></td>'//Activity
            // The flags do not display properly on windows. Hide the category for now.
						//+ '<td><a class="bu-icon bu-icon--flag emoji-menu-tab"></a></td>'//Flags
						+ '</tr></table>').appendTo(this.$itemsTailWrap);
		this.$itemsWrap = $(
				'<div class="emoji-items-wrap nano mobile_scrollable_wrap"></div>')
				.appendTo(this.$itemsTailWrap);
		this.$items = $('<div class="emoji-items nano-content">').appendTo(
				this.$itemsWrap);
		/* ! MODIFICATION END */

		$body.append(this.$menu);

		/*
		 * ! MODIFICATION: Following 3 lines were added by Igor Zhukov, in order
		 * to add scrollbars to EmojiMenu
		 */

		  if (!Config.Mobile) {
		  this.$itemsWrap.nanoScroller({preventPageScrolling: true, tabIndex:
		  -1}); }


		//this.$itemsWrap.nanoScroller({preventPageScrolling: true, tabIndex:* -1});

    this.handleKeydown = function(e) {
      // Close on enter key press as well
      if (e.keyCode === KEY_ESC || e.keyCode === KEY_TAB || e.keyCode === KEY_ENTER) {
				self.hide();
			}
    }


		/*
		 * ! MODIFICATION: Following 3 lines were added by Igor Zhukov, in order
		 * to hide menu on message submit with keyboard
		 */
    this.handleMessageSend = function(e) {
      self.hide();
    }

    this.onMouseUp = function(e){
      /*
			 * ! MODIFICATION START Following code was added by Igor Zhukov, in
			 * order to prevent close on click on EmojiMenu scrollbar
			 */
			e = e.originalEvent || e;
			var target = e.originalTarget || e.target || window;

      if ($(target).hasClass(self.emojiarea.$dontHideOnClick)) {
        return;
      }

			while (target && target != window) {
				target = target.parentNode;
				if (target == self.$menu[0] || self.emojiarea
						&& target == self.emojiarea.$button[0]) {
					return;
				}
			}
			/* ! MODIFICATION END */
			self.hide();
    }

		this.$menu.on('mouseup', 'a', function(e) {
			e.stopPropagation();
			return false;
		});

		this.$menu.on('click', 'a', function(e) {
			/*
			 * ! MODIFICATION START Following code was modified by Andre Staltz,
			 * to capture clicks on category tabs and change the category
			 * selection.
			 */
			if ($(this).hasClass('emoji-menu-tab')) {
				if (self.getTabIndex(this) !== self.currentCategory) {
					self.selectCategory(self.getTabIndex(this));
				}
				return false;
			}
			/* ! MODIFICATION END */
			var emoji = $('.label', $(this)).text();
			window.setTimeout(function() {
				self.onItemSelected(emoji);
				/*
				 * ! MODIFICATION START Following code was modified by Igor
				 * Zhukov, in order to close only on ctrl-, alt- emoji select
				 */
				if (e.ctrlKey || e.metaKey) {
					self.hide();
				}
				/* ! MODIFICATION END */
			}, 0);
			e.stopPropagation();
			return false;
		});

		/*
		 * MODIFICATION: Following line was modified by Andre Staltz, in order
		 * to select a default category.
		 */
		this.selectCategory(0);
	};

	/*
	 * ! MODIFICATION START Following code was added by Andre Staltz, to
	 * implement category selection.
	 */
	EmojiMenu.prototype.getTabIndex = function(tab) {
		return this.$categoryTabs.find('.emoji-menu-tab').index(tab);
	};

	EmojiMenu.prototype.selectCategory = function(category) {
		var self = this;
		this.$categoryTabs.find('.emoji-menu-tab').each(function(index) {
			if (index === category) {
        this.classList.add("emoji-menu-tab--selected");
			} else {
        this.classList.remove("emoji-menu-tab--selected");
			}
		});
		this.currentCategory = category;
		this.load(category);


		 if (!Config.Mobile) { this.$itemsWrap.nanoScroller({ scroll: 'top'
		 }); }



	};
	/* ! MODIFICATION END */

	EmojiMenu.prototype.onItemSelected = function(emoji) {
    if(this.emojiarea.$editor.text().length + this.emojiarea.$editor.find('img').length >= this.emojiarea.$editor.attr('maxlength'))
    {
      return;
    }
		this.emojiarea.insert(emoji);
	};

	/*
	 * MODIFICATION: The following function argument was modified by Andre
	 * Staltz, in order to load only icons from a category. Also function was
	 * modified by Igor Zhukov in order to display recent emojis from
	 * localStorage
	 */
	EmojiMenu.prototype.load = function(category) {
		var html = [];
		var options = $.emojiarea.icons;
		var path = $.emojiarea.assetsPath;
		var self = this;
		if (path.length && path.charAt(path.length - 1) !== '/') {
			path += '/';
		}

		/*
		 * ! MODIFICATION: Following function was added by Igor Zhukov, in order
		 * to add scrollbars to EmojiMenu
		 */
		var updateItems = function() {
			self.$items.html(html.join(''));


			  if (!Config.Mobile) { setTimeout(function () {
			  self.$itemsWrap.nanoScroller(); }, 100); }

		}

		if (category > 0) {
			for ( var key in options) {
				/*
				 * MODIFICATION: The following 2 lines were modified by Andre
				 * Staltz, in order to load only icons from the specified
				 * category.
				 */
				if (options.hasOwnProperty(key)
						&& options[key][0] === (category - 1)) {
					html.push('<a href="javascript:void(0)" draggable="false" title="'
							+ util.htmlEntities(key, true) + '">'
							+ EmojiArea.createIcon(options[key], true)
							+ '<span class="label">' + util.htmlEntities(key)
							+ '</span></a>');
				}
			}
			updateItems();
		} else {
			ConfigStorage.get('emojis_recent', function(curEmojis) {
				curEmojis = curEmojis || defaultRecentEmojis || [];
				var key, i;
				for (i = 0; i < curEmojis.length; i++) {
					key = curEmojis[i]
					if (options[key]) {
						html.push('<a href="javascript:void(0)" draggable="false" title="'
								+ util.htmlEntities(key, true) + '">'
								+ EmojiArea.createIcon(options[key], true)
								+ '<span class="label">'
								+ util.htmlEntities(key) + '</span></a>');
					}
				}
				updateItems();
			});
		}
	};

	EmojiMenu.prototype.reposition = function(attachmentLocation,menuLocation) {
    this.tether = new Tether({
      element: '[data-id="' + this.id + '"][data-type="menu"]',
      target: '[data-id="' + this.id + '"][data-type="picker"]',
      attachment: attachmentLocation,
      targetAttachment: menuLocation,
      constraints: [
        {
          to: 'html',
          pin: true
        }
      ]
    });
	};

  EmojiMenu.prototype.hide = function(callback) {
    if (!this.visible) {
      // If not visible, exit
      return;
    }


		this.visible = false;

    // Disable all click handlers so that the memory can be
    // released
    $(document.body).off('mouseup', this.onMouseUp);
    $(document.body).off('message_send', this.handleMessageSend);
    $(document.body)[0].removeEventListener('keydown', this.handleKeydown, true);

		// Note on the window global if the emoji picker is visible. Since there
		// can be only one emoji picker at any time, this will work.
		window.emojiPickerStatus.isPickerVisible = false;

		this.$menu.hide("fast", function(){
			// Reset to default category upon close
			this.selectCategory(0);
		}.bind(this));
  };

  // Clear all listeners and also remove from DOM
  EmojiMenu.prototype.clearAndRemove = function() {
    // Remove all listeners on button
    this.emojiarea.$button.off();
    // Remove all listeners on menu
    this.$menu.off();
    // Remove from DOM
    this.$menu.remove();
  };

  EmojiMenu.prototype.show = function(emojiarea) {
    /*
     * MODIFICATION: Following line was modified by Igor Zhukov, in order to
     * improve EmojiMenu behaviour
     */
    if (this.visible)
      return this.hide();

      // Add all click handlers so that the emoji menu can be
      // closed upon click of the body outside the emoji picker
      $(document.body).on('mouseup', this.onMouseUp);
      $(document.body).on('message_send', this.handleMessageSend);
      // We want to "capture" the keydown. The capture cannot be done with
      // jquery, so using JS. Passing in true so that we always get the
      // event.
      $(document.body)[0].addEventListener('keydown', this.handleKeydown, true);

    this.reposition(emojiarea.options.emojiAttachmentLocation,emojiarea.options.emojiMenuLocation);
		$(this.$menu).css('z-index', ++EmojiMenu.menuZIndex);

		// Show the emoji picker without animation. If we show animation
		// there is actually a position change from bottom right to top left (say)
		// which looks strange. To avoid that, remove the animation for now.
		this.$menu.show();
		// Call tether to position correctly accounting for viewport and
		// such
		this.tether.position();

    /*
     * MODIFICATION: Following 3 lines were added by Igor Zhukov, in order
     * to update EmojiMenu contents
     */
    if (!this.currentCategory) {
      this.load(0);
    }

    this.visible = true;
		// Note on the window global if the emoji picker is visible. Since there
		// can be only one emoji picker at any time, this will work.
		window.emojiPickerStatus.isPickerVisible = true;
    // this.tether.setOptions({enabled: true});
    // // Repositiong the menu as suggested by http://tether.io/overview/repositioning/
    // Tether.position();
  };


  var ngEmojiPicker = angular.module('ngEmojiPicker', []);

	ngEmojiPicker.directive('emojiPicker',[function(){
	  return{
	    link: function(scope, element, attrs){
	      var emojiAttachmentLocation = attrs["emojiAttachmentLocation"] || "bottom right";
	      var emojiMenuLocation = attrs["emojiMenuLocation"] || "top left";


	      window.emojiPicker = new EmojiPicker({
          // Ignore when emoji picker has already been converted so that
          // we do not convert multiple times
	        emojiable_selector: '[emoji-picker="emoji-picker"][data-emojiable!=converted]',
	        assetsPath: 'images',
	        popupButtonClasses: 'fa fa-smile-o',
	        emojiAttachmentLocation: emojiAttachmentLocation,
          emojiMenuLocation: emojiMenuLocation,
          // A target identifier is needed so that we can identify which element (trix editor)
          // to target since there can be multiple trix editors
          // this is optional
          targetIdentifier: attrs["targetIdentifier"],
          // So these emojis are not displayed properly in one browser or the other
          // relaxed: firefox and chrone (windows)
          // spades, hearts, diamonds, clubs: irefox
          // Just do not show them in the emoji picker for now
          blacklistedEmojis: ['relaxed', 'spades', 'hearts', 'diamonds', 'clubs']
	      });

        // If the client provided a function to add the emojis, use that to add the
        // emoji to the element. This is used in the case of the trix editor since
        // that uses its own function to insert text into its editor.
        // With this function a target identifier is to be provided.
        window.emojiPicker.insertEmojiFunc = scope.insertEmojiFunc;

				// Note on the window global if the emoji picker is visible. Since there
				// can be only one emoji picker at any time, this will work.
				if (!window.emojiPickerStatus) {
					window.emojiPickerStatus = {};
				}

        // Signifies if emoji picker is visible
        window.emojiPickerStatus.isPickerVisible = false;
        // The menu element itself
        window.emojiPickerStatus.emojiMenu = null;

	      // Finds all elements with `emojiable_selector` and converts them to rich emoji input fields
	      // You may want to delay this step if you have dynamically created input fields that appear later in the loading process
	      // It can be called as many times as necessary; previously converted input fields will not be converted again
	      window.emojiPicker.discover();

        function clearEmojiPickerState() {
          // When the directive is destroyed, remove the emoji picker from the
          // DOM as well. Currently we are using the emoji picker as a singleton,
          // which works for now but has to be looked at later
          if (window.emojiPickerStatus.emojiMenu) {
            // Hide the emoji picker
            window.emojiPickerStatus.emojiMenu.hide();
            // Unbind handlers and remove from DOM
            window.emojiPickerStatus.emojiMenu.clearAndRemove();
            // Clear reference so it can be garbage collceted
            window.emojiPickerStatus.emojiMenu = null;
          }

          if (window.emojiPicker.insertEmojiFunc) {
            window.emojiPicker.insertEmojiFunc = null;
          }
        }

        function hideEmojiMenuElement() {
          // When the state chagnes or we show a dialog on top, hide the
          // emoji picker since we have gone to a different context.
          if (window.emojiPickerStatus.emojiMenu) {
            window.emojiPickerStatus.emojiMenu.hide();
          }
        }

        // I am not sure if the name open.leave-conf-dialog, is generic enough, but
        // I guess it is OK.
        scope.$on('open.leave-conf-dialog', hideEmojiMenuElement)
        scope.$on('$stateChangeStart', hideEmojiMenuElement);
        scope.$on('$destroy', clearEmojiPickerState);

	    }
	  };
	}]);

})(jQuery, window, document);