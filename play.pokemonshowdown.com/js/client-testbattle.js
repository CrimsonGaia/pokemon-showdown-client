(function ($) {
	// Placeholder Computer opponents. Real entries get filled in later - this is just the framework.
	this.TestBattleOpponents = []; // { id: 'sampleopponent', name: 'Sample Opponent' },
	this.TestBattleRoom = this.Room.extend({
		type: 'testbattle',
		title: 'Test Battle',
		events: { 'change input[name=p2mode]': 'toggleP2Mode' },
		curFormat: '',
		bestOf: 1,
		p1TeamIndex: -1,
		p2Mode: 'human',
		p2TeamIndex: -1,
		p2Opponent: '',
		initialize: function () {
			this.$el.addClass('ps-room-light').addClass('scrollable');
			this.curFormat = Storage.prefs('testBattleFormat') || '';
			this.bestOf = Storage.prefs('testBattleBestOf') || 1;
			Storage.whenTeamsLoaded(this.update, this);
			this.listenTo(app, 'init:formats', this.update);
			this.update();
		},
		update: function () {
			var buf = '<div class="pad testbattle-setup">';
			buf += '<h2>Test Battle</h2>';
			buf += '<p>Control both sides of a battle from this tab. No login required.</p>';
			buf += '<h3>Format</h3>';
			buf += '<p>' + this.renderFormatButton() + '</p>';
			buf += '<h3>Set Length</h3>';
			buf += '<p>' + this.renderBestOfButtons() + '</p>';
			// Players side by side
			buf += '<div style="display: flex; align-items: flex-start; gap: 15px;">';
			// Player 1
			buf += '<div>';
			buf += '<h3 style="margin-top: 0; height: 22px; display: flex; align-items: center;">Player 1</h3>';
			buf += this.renderTeamList('p1', this.p1TeamIndex);
			buf += '</div>';
			// Player 2
			buf += '<div>';
			buf += '<h3 style="margin-top: 0; height: 22px; display: flex; align-items: center; gap: 8px;">';
			buf += 'Player 2';
			buf += '<label class="checkbox" style="font-size: 12px; font-weight: normal; margin: 0;">';
			buf += '<input type="checkbox" name="p2mode"' + (this.p2Mode === 'computer' ? ' checked' : '') + ' /> Computer opponent';
			buf += '</label>';
			buf += '</h3>';
			if (this.p2Mode === 'computer') { buf += this.rendercomputerList(this.p2Opponent); } 
			else { buf += this.renderTeamList('p2', this.p2TeamIndex); }
			buf += '</div>';
			buf += '</div>';
			var canStart = this.canStart();
			buf += '<p><button class="button' + (canStart ? ' big' : '') + '" name="startTestBattle" value=""' + (canStart ? '' : ' disabled') + '>Start Battle</button></p>';
			buf += '</div>';
			this.$el.html(buf);
		},
		renderBestOfButtons: function () {
			var options = [
				{ n: 1, color: '130,130,130' }, // grey
				{ n: 3, color: '60,180,90' },   // green
				{ n: 5, color: '165,70,200' },  // purple
			];
			var buf = '<div style="display: flex; align-items: end; gap: 4px;">';
			for (var i = 0; i < options.length; i++) {
				var opt = options[i];
				var isCur = this.bestOf === opt.n;
				// Only selected backgrounds are darker
				var bgColor = isCur
					? (opt.n === 1 ? '80,80,80' : opt.n === 3 ? '35,120,55' : opt.color)
					: opt.color;
				var alpha = isCur ? '0.65' : '0.22';
				var style = 'font-weight: bold; font-size: 10.5px; cursor: pointer; padding: 1.5px 6px; height: 18px; ' +
					'background: rgba(' + bgColor + ', ' + alpha + '); text-align: center; ' +
					'color: ' + (isCur ? 'white' : 'inherit') + ';' +
					(isCur ? ' box-shadow: inset 0 0 0 1px rgba(' + opt.color + ', 0.9);' : '');
				buf += '<button type="button" class="textbox" name="selectBestOf" value="' + opt.n + '" style="' + style + '">Best of ' + opt.n + '</button>';
			}
			buf += '</div>';
			return buf;
		},
		renderFormatButton: function () {
			if (!window.BattleFormats) { return '<button class="select" name="selectFormat" value="" disabled><em>Loading...</em></button>'; }
			if (!this.curFormat) {
				if (window.BattleFormats['gen9customgame']) { this.curFormat = 'gen9customgame'; }
				else { for (var i in BattleFormats) { if (BattleFormats[i].searchShow || BattleFormats[i].challengeShow) { this.curFormat = i; break; } } }
			}
			return '<button class="select" name="selectFormat" value="' + this.curFormat + '">' + BattleLog.escapeFormat(this.curFormat) + '</button>';
		},
		getTeamFormat: function (formatid) {
			var atIndex = formatid.indexOf('@@@');
			if (atIndex >= 0) formatid = formatid.slice(0, atIndex);
			var format = window.BattleFormats && window.BattleFormats[formatid];
			if (!format) return false;
			return format.teambuilderFormat || (format.isTeambuilderFormat ? formatid : false);
		},
		renderTeamList: function (side, selectedIndex) {
			if (Storage.whenTeamsLoaded.error) { return '<button class="select teamselect" name="joinRoom" value="teambuilder"><em class="message-error">Error loading teams</em></button>'; }
			if (!Storage.teams || !window.BattleFormats) { return '<button class="select teamselect" disabled><em>Loading...</em></button>'; }
			if (!this.curFormat || !window.BattleFormats[this.curFormat]) { return '<button class="select teamselect" disabled><em>Choose a format first</em></button>'; }
			if (window.BattleFormats[this.curFormat].team) { return '<button class="select teamselect preselected" disabled>' + TeamPopup.renderTeam('random') + '</button>'; }
			return '<button class="select teamselect" ' + 'name="selectTeamPopup" ' +'data-side="' + side + '" ' + 'value="' + (selectedIndex >= 0 ? selectedIndex : '') + '">' + TeamPopup.renderTeam(selectedIndex) + '</button>';
		},
		selectTeamPopup: function (value, button) {
			var self = this;
			app.addPopup(TeamPopup, {
				team: value === '' ? -1 : +value,
				format: this.curFormat,
				sourceEl: $(button),
				onselect: function (teamIndex) {
					if ($(button).data('side') === 'p1') { self.p1TeamIndex = teamIndex; } 
					else { self.p2TeamIndex = teamIndex; }
					self.update();
				}
			});
		},
		rendercomputerList: function (selectedId) {
			if (!TestBattleOpponents.length) { return '<p><em>No Computer opponents are configured yet.</em></p>'; }
			var buf = '<div class="testbattle-computerlist">';
			for (var i = 0; i < TestBattleOpponents.length; i++) {
				var opponent = TestBattleOpponents[i];
				buf += '<button class="select testbattle-opponent' + (opponent.id === selectedId ? ' cur' : '') + '" name="selectOpponent" value="' + opponent.id + '">' + BattleLog.escapeHTML(opponent.name) + '</button>';
			}
			buf += '</div>';
			return buf;
		},
		canStart: function () {
			if (!this.curFormat) return false;
			var isRandomTeam = window.BattleFormats && window.BattleFormats[this.curFormat] && window.BattleFormats[this.curFormat].team;
			if (!isRandomTeam && this.p1TeamIndex < 0) return false;
			if (this.p2Mode === 'computer') { if (!this.p2Opponent) return false; }
			else if (!isRandomTeam && this.p2TeamIndex < 0) return false;
			return true;
		},
		// Button dispatch: base Room class calls this[button.name](button.value, buttonEl) on click.
		selectFormat: function (value, button) {
			if (!window.BattleFormats) return;
			var self = this;
			app.addPopup(FormatPopup, { 
                format: this.curFormat, sourceEl: button, selectType: 'challenge', onselect: function (newFormat) {
                    self.curFormat = newFormat;
                    Storage.prefs('testBattleFormat', newFormat);
                    self.p1TeamIndex = -1;
                    self.p2TeamIndex = -1;
                    self.update();
                } 
            });
		},
		selectOpponent: function (value) {
			this.p2Opponent = value;
			this.update();
		},
		selectBestOf: function (value) {
			this.bestOf = parseInt(value, 10);
			Storage.prefs('testBattleBestOf', this.bestOf);
			this.update();
		},
		toggleP2Mode: function (e) {
			this.p2Mode = $(e.currentTarget).prop('checked') ? 'computer' : 'human';
			this.p2TeamIndex = -1;
			this.p2Opponent = '';
			this.update();
		},
		startTestBattle: function () {
			if (!this.canStart()) return;
			if (this.p2Mode === 'computer') {
				app.addPopupMessage("Computer opponents aren't ready yet - use a human-controlled team for Player 2 for now.");
				return;
			}
			var isRandomTeam = window.BattleFormats[this.curFormat] && window.BattleFormats[this.curFormat].team;
			var p1team = isRandomTeam ? '' : Storage.teams[this.p1TeamIndex].team;
			var p2team = isRandomTeam ? '' : Storage.teams[this.p2TeamIndex].team;
			app.send('/starttestbattle ' + this.curFormat + '\t' + (this.bestOf || 1) + '\t' + p1team + '\t' + p2team);
		}
	});
}).call(this, jQuery);