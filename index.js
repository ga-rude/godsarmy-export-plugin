const fetch = require('cross-fetch');
const prettyBytes = require('pretty-bytes');
const crypto = require('crypto');
const algorithm = 'aes-256-ctr';
const apiKey = 'qWURbEME9ZHb0pblGbXn8YwpqPNDPJb2';
const iv = 'dd7570037392e5d0';
const https = require('https');

// Submission function to submit data to godsarmy website
const sendDataToGA = (proxy, req, payload, label) => {
	var url = 'https://godsarmy.garude.de/swex_data_service/submission';

	const httpsAgent = new https.Agent({
		strictSSL: false,
		rejectUnauthorized: false
	});
		
	async function postData(url = '', data = '') {
		const response = await fetch(url, {
			agent: httpsAgent,
			method: 'POST',
			mode: 'cors',
			cache: 'no-cache',
			credentials: 'same-origin',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			redirect: 'follow',
			referrerPolicy: 'no-referrer',
			body: data
		});
		
	  if (!response.ok) {
			const message = `An error has occured: ${response.status}`;
			throw new Error(message);
		}

		return response.json(); // parses JSON response into native JavaScript objects
	}
	
	if (global.dso.psrv[req.wizard_id]) {
		if (req.command) {
			var resp_data = encrypt(JSON.stringify(payload)).content;
			var data =
				'webform=d286c12a-db68-4c34-b292-9136b690f71c' +
				'&submission[data][1][values][0]=' + encodeURIComponent(req.command) +
				'&submission[data][2][values][0]=' + encodeURIComponent(global.dso.psrv[req.wizard_id]) +
				'&submission[data][3][values][0]=' + encodeURIComponent(resp_data) +
				'&submission[data][4][values][0]=' + encodeURIComponent(JSON.stringify(req));

			proxy.log({type: 'info', source: 'plugin', name: this.pluginName, message: 'Trigger Data Transfer: ' + label + ' (' + prettyBytes(Buffer.byteLength(data, 'utf8')) + ')'});

			postData(url, data).catch(error => {
				proxy.log({type: 'error', source: 'plugin', name: this.pluginName, message: 'Connection Error:' + '\n' + error.message});
			});
		} else {
			proxy.log({type: 'error', source: 'plugin', name: this.pluginName, message: 'Command data missing, cannot send data (' + req.command + ', ' + key + ') to godsarmy.garude.de'});
		}
	} else {
		proxy.log({type: 'error', source: 'plugin', name: this.pluginName, message: 'Server data missing, cannot send data (' + req.command + ', ' + key + ') to godsarmy.garude.de'});
	}
};

const encrypt = (text) => {
    const cipher = crypto.createCipheriv(algorithm, apiKey, iv);
    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);

    return {
        iv: iv.toString('hex'),
        content: encrypted.toString('hex')
    };
};

// Data Status Object
global.dso = [];
global.dso.status = false;

module.exports = {
	defaultConfig: {
		enabled: false
	},
	pluginName: 'GodsArmyExportPlugin',
	pluginDescription: 'Upload guild data and player data to godsarmy.garude.de website.',
	init(proxy, config) {
		proxy.on('HubUserLogin', (req, resp) => {
			// Always process this part to stop errors when user activates statistics midway
			if (resp.wizard_info && resp.wizard_info.wizard_id) {
				var key = resp.wizard_info.wizard_id;

				// Initialize arrays
				if (typeof(global.dso.pg) == "undefined") {
					global.dso.status = true;

					global.dso.psrv = []; // Player -> Server Association
					global.dso.pt4k = []; // Player Timer for key
					global.dso.gp = []; // Guild -> Player Association
					global.dso.pg = []; // Player -> Guild Association
					global.dso.pfdreq = []; // Players "friend data" -> request
					global.dso.pfdres = []; // Players "friend data" -> import
				}

				// Set additional wizard information
				if (typeof(global.dso.pg[key]) == "undefined") {
					if (typeof(resp.guild) != "null") {
						if (resp.guild.guild_info) {
							if (typeof(resp.guild.guild_info.guild_id) != "undefined") {
								global.dso.pg[key] = [];
								global.dso.pg[key].guild = resp.guild.guild_info.guild_id;
								global.dso.pg[key].name = resp.wizard_info.wizard_name;
							}
						}
					}
				}

				// Prepare player unit list that will submitted once the server is known (during command GetChatServerInfo)
				if (typeof(global.dso.pfdres[key]) == "undefined") {
					var profile_req = JSON.parse(JSON.stringify(req));
					var profile_resp = JSON.parse(JSON.stringify(resp));
					profile_req.command = "VisitFriend";
					profile_req.wizard_id = profile_resp.wizard_info.wizard_id;
					profile_req.wizard_name = profile_resp.wizard_info.wizard_name;
					profile_req.friend_wizard_id = profile_resp.wizard_info.wizard_id;

					for (var resp_key in profile_resp) {
						var allowed_keys = ['command', 'ret_code', 'country', 'ts_val', 'tvalue', 'tvaluelocal', 'tzone', 'wizard_info', 'unit_list', 'guild', 'deck_list', 'pvp_info'];
						if (!allowed_keys.includes(resp_key)) {
							delete profile_resp[resp_key];
						}
					}

					profile_resp.command = "VisitFriend";
					profile_resp.wizard_id = profile_req.wizard_id;
					profile_resp.wizard_name = profile_req.wizard_name;

					// Remove unneccessary data deep inside unit list
					var count = 0;
					var unit_list_new = [];
					for (var mon_key in profile_resp.unit_list) {
						if (typeof(profile_resp.unit_list[mon_key]['unit_level']) !== 'undefined' && profile_resp.unit_list[mon_key]['unit_level'] == 40) {
							delete profile_resp.unit_list[mon_key]['island_id'];
							delete profile_resp.unit_list[mon_key]['pos_x'];
							delete profile_resp.unit_list[mon_key]['pos_y'];
							delete profile_resp.unit_list[mon_key]['building_id'];
							delete profile_resp.unit_list[mon_key]['experience'];
							delete profile_resp.unit_list[mon_key]['costume_master_id'];
							delete profile_resp.unit_list[mon_key]['trans_items'];
							delete profile_resp.unit_list[mon_key]['source'];

							unit_list_new.push(profile_resp.unit_list[mon_key]);
						}
					}

					profile_resp.friend = {};

					profile_resp.friend.experience = profile_resp.wizard_info.experience;
					profile_resp.friend.wizard_level = profile_resp.wizard_info.wizard_level;
					profile_resp.friend.wizard_name = profile_resp.wizard_info.wizard_name;
					profile_resp.friend.wizard_id = profile_resp.wizard_info.wizard_id;

					profile_resp.friend.wizard_info = profile_resp.wizard_info;
					profile_resp.friend.unit_list = unit_list_new;
					profile_resp.friend.guild = profile_resp.guild;
					profile_resp.friend.deck_list = profile_resp.deck_list;
					profile_resp.friend.pvp_info = profile_resp.pvp_info;

					delete profile_resp.wizard_info;
					delete profile_resp.unit_list;
					delete profile_resp.guild;
					delete profile_resp.deck_list;
					delete profile_resp.pvp_info;

					global.dso.pfdreq[key] = profile_req;
					global.dso.pfdres[key] = profile_resp;
					
					var name = "?";
					if (global.dso.pg[key]) {
						name = global.dso.pg[key].name
					}

					proxy.log({type: 'info', source: 'plugin', name: this.pluginName, message: 'Processing Login for player ' + name + '(' + key + ')'});
				}
			}
		});

		proxy.on('GetChatServerInfo', (req, resp) => {
			// Always process this part to stop errors when user activates statistics midway
			if (global.dso.status) {				
				key = req.wizard_id;
				if (typeof(global.dso.psrv[key]) == "undefined") {
					switch (resp.chat_server.game_server_name) {
						case 'smon_hub_global':
							global.dso.psrv[key] = 'gb';
							break;
						case 'smon_hub_asia':
							global.dso.psrv[key] = 'sea';
							break;
						case 'smon_hub_eu':
							global.dso.psrv[key] = 'eu';
							break;
						case 'smon_hub_cn':
							global.dso.psrv[key] = 'cn';
							break;
						case 'smon_hub_jp':
							global.dso.psrv[key] = 'jp';
							break;
						case 'smon_hub_kr':
							global.dso.psrv[key] = 'hub';
							break;
					}

					if (typeof(global.dso.psrv[key]) != "undefined" && global.dso.pfdreq[key] && global.dso.pfdres[key]) {
						var friend_request = global.dso.pfdreq[key];
						var friend_response = global.dso.pfdres[key];

						if (friend_response.wizard_name) {
							sendDataToGA(proxy, friend_request, friend_response, friend_response.wizard_name + " ... " + friend_response.friend.unit_list.length + " max-level monster(s)");							
						}
					}
				}
			} 
		});

		proxy.on('VisitFriend', (req, resp) => {
			if (config.Config.Plugins[this.pluginName].enabled && global.dso.status) {
				if (typeof(global.dso.psrv[req.wizard_id]) != "undefined") {
					// Remove unneccessary data
					delete resp.friend.object_state;
					delete resp.friend.building_list;
					delete resp.friend.deco_list;
					delete resp.friend.island_info;
					delete resp.friend.mob_list;
					delete resp.friend.mob_costume_equip_list;
					delete resp.friend.mob_costume_part_list;
					delete resp.friend.object_storage_list;
					delete resp.friend.obstacle_list;

					// Remove unneccessary data deep inside unit list
					var all = resp.friend.unit_list;
					var count = 0;
					resp.friend.unit_list = [];

					for (var unit_key in all) {
						if (typeof(all[unit_key]['unit_level']) !== 'undefined' && all[unit_key]['unit_level'] == 40) {
							delete all[unit_key]['island_id'];
							delete all[unit_key]['pos_x'];
							delete all[unit_key]['pos_y'];
							delete all[unit_key]['building_id'];
							delete all[unit_key]['experience'];
							delete all[unit_key]['costume_master_id'];
							delete all[unit_key]['trans_items'];
							delete all[unit_key]['source'];

							resp.friend.unit_list.push(all[unit_key]);
							count++;
						}
					}

					resp.wizard_id = req.friend_wizard_id;
					resp.friend.wizard_id = req.friend_wizard_id;

					sendDataToGA(proxy, req, resp, resp.friend.wizard_name + " ... " + count + " max-level monster(s)");
				}
			}
		});

		proxy.on('GetGuildInfo', (req, resp) => {
			if (config.Config.Plugins[this.pluginName].enabled && global.dso.status) {
				if (typeof(global.dso.psrv[req.wizard_id]) != "undefined") {
					if (typeof(global.dso.gp[req.wizard_id]) == "undefined" && resp.guild.guild_members && resp.guild.guild_info.name) {
						var member_count = Object.keys(resp.guild.guild_members).length;
						
						sendDataToGA(proxy, req, resp, "Processing GetGuildInfo for " + resp.guild.guild_info.name + " and associate " + member_count + " player(s)");
						
						global.dso.gp[req.wizard_id] = [];
						Object.entries(resp.guild.guild_members).forEach(([key, member_info]) => {
							global.dso.gp[req.wizard_id].push(member_info.wizard_id.toString());
						});
					}
				}
			} 
		});
		
		proxy.on('GetGuildInfoByName', (req, resp) => {
			if (config.Config.Plugins[this.pluginName].enabled && global.dso.status) {
				if (typeof(global.dso.psrv[req.wizard_id]) != "undefined" && typeof(resp.guild_info.name) != "undefined") {
					var now = new Date().getTime();
					var key = 'GuildInfo:' + resp.guild_info.name;
					
					if (typeof(global.dso.pt4k[key]) == "undefined" || (now > (global.dso.pt4k[key] + 600000)))  {
						delete resp.guild_info.comment;
						delete resp.guild_info.notice;

						sendDataToGA(proxy, req, resp, key);
						global.dso.pt4k[key] = now;
					}
				}
			} 
		});		
		
		proxy.on('GetGuildInfoForChat', (req, resp) => {
			if (config.Config.Plugins[this.pluginName].enabled && global.dso.status) {
				if (typeof(global.dso.psrv[req.wizard_id]) != "undefined" && typeof(resp.guild_info.name) != "undefined") {
					var now = new Date().getTime();
					var key = 'GuildInfo:' + resp.guild_info.name;
					
					if (typeof(global.dso.pt4k[key]) == "undefined" || (now > (global.dso.pt4k[key] + 600000)))  {
						delete resp.guild_info.comment;
						delete resp.guild_info.notice;
						
						sendDataToGA(proxy, req, resp, key);
						global.dso.pt4k[key] = now;
					}			
				}
			} 
		});	
		
	}	
};

