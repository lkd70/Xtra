/* eslint-disable max-len */
/* eslint-disable no-invalid-this */
/* eslint-disable no-console */
'use strict';

const error = error => console.log(`%c[XTRA ERROR] - %c${error}`, 'color: red', 'color: red');

const log = message => console.log(`%c[XTRA] - %c${message}`, 'color: #ff0066', 'color: grey');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const request = (data, auth = true) => new Promise((resolve, reject) => {
	const d = (typeof data === 'object') ? JSON.stringify(data) : data;
	const xhr = new XMLHttpRequest();
	xhr.open('POST', 'https://graphigo.prd.dlive.tv/', true);
	xhr.setRequestHeader('Content-Type', 'application/json');
	if (auth) {
		xhr.setRequestHeader(
			'authorization',
			JSON.parse(window.localStorage.getItem('store')).accessToken.token
		);
	}
	xhr.onload = () => resolve(JSON.parse(xhr.responseText).data);
	xhr.onerror = error => reject(error);
	xhr.send(d);
});

const getDisplayName = () => {
	const matches = window.location.href.match(/^https:\/\/dlive\.tv\/(?:c\/|)([a-z_A-Z-0-9]+)$/);
	if (matches === null) return undefined;
	if (matches.length === 2 && !(matches[1] in ['s', 'c'])) return matches[1];
	return undefined;
};

const getPageUsername = displayName => new Promise(async (resolve, reject) => {
	if (typeof displayName !== 'undefined') {
		let names = window.localStorage.getItem('names');
		if (names === null) {
			window.localStorage.setItem('names', '{}');
			names = '{}';
		}
		names = JSON.parse(names);
		if (displayName in names) {
			resolve(names[displayName]);
		} else {
			let userName = null;
			while (userName === null) {
				await sleep(1000);
				const obj = {
					query: `query LivestreamPage(){userByDisplayName(displayname:"${displayName}"){username}}`
				};
				request(JSON.stringify(obj))
					.then(ls => {
						userName = ls.userByDisplayName.username;
					}).catch(reject);
			}
			names[displayName] = userName;
			window.localStorage.setItem('names', JSON.stringify(names));
			resolve(userName);
		}
	}
});

const getMessageData = id => {
	const local = window.localStorage.getItem('local');
	if (local !== null) {
		const j_local = JSON.parse(local);
		const message = j_local.messages.filter(msg => msg.id === id);
		if (message.length) return message[0];
	}
	return null;
};

const saveMessage = msg => {
	const local = window.localStorage.getItem('local');
	let j_local;
	if (local === null) {
		j_local = {
			messages: []
		};
	} else {
		j_local = JSON.parse(local);
	}
	j_local.messages.push({
		id: msg.id,
		content: msg.content,
		sender: {
			username: msg.sender.username,
			displayname: msg.sender.displayname
		}
	});
	window.localStorage.setItem('local', JSON.stringify(j_local));
};

const formatDeletedMessage = msg => msg === null ? 'UNKNOWN MESSAGE' : `[SENDER]: "${msg.sender.displayname}" (${msg.sender.username}) - DELETED MESSAGE: "${msg.content}"`;

const handleChatText = msg => {
	saveMessage(msg);
	console.log(`%c[XTRA][CHAT] - %c[${msg.sender.displayname}]: %c${msg.content}`, 'color: #ff0066;', 'color: orange;', 'color: grey;');
};

const handleChestValueUpdated = msg => console.log(`%c[XTRA][CHEST] - %c[VALUE UPDATED]: %c${msg.value}`, 'color: #ff0066;', 'color: lightblue;', 'color: white;');

const handleChatFollow = msg => console.log(`%c[XTRA][FOLLOW] - %c${msg.sender.displayname}`, 'color: #ff0066;', 'color: orange;');

const handleChatDelete = msg => console.log(`%c[XTRA][DELETED][${msg.ids.length}]:\n%c${msg.ids.map(id => '\t' + formatDeletedMessage(getMessageData(id))).join('\n')}`, 'color: #ff0066;', 'color: white;');

const openChest = streamer => new Promise((resolve, reject) => {
	request({
		query: `mutation GiveawayClaim{giveawayClaim(streamer: "${streamer}"){err{code message}}}`
	}).then(resolve).catch(reject);
});

const claimGiftedSub = streamer => new Promise((resolve, reject) => {
	request({
		query: `mutation AddGiftSubClaim{giftSubClaim(streamer:"${streamer}"){err{code message}}}`
	}).then(resolve).catch(reject);
});

const onLoad = async () => {
	const b = (typeof browser === 'undefined') ? chrome : browser;
	b.storage.sync.get(null, async settings => {
		console.clear();
		const displayname = getDisplayName();
		if (typeof displayname === 'undefined') {
			error('No displayname found - Stopping Xtra');
		} else {
			const username = await getPageUsername(displayname);
			log(`Connecting to ${displayname} [${username}]\n\tSettings: ${JSON.stringify(settings, null, 8)}`);

			if (settings.showChestLemons) {
				const chest = document.getElementById('chestvalue');
				if (!chest) {
					const chestParent = document.querySelector('.info-line-wrap > div:nth-child(2)');
					if (chestParent) {
						const chestValue = document.createElement('p');
						chestValue.innerHTML = '<center>LOADING LEMONS (This might take a while...)</center>';
						chestValue.id = 'chestvalue';
						chestParent.appendChild(chestValue);
					}
				}
			}

			/* #region Chat WebSocket */
			const ws = new WebSocket('wss://graphigostream.prd.dlive.tv/', 'graphql-ws');
			ws.onopen = () => {
				ws.send('{"type":"connection_init","payload":{}}');
				const joinmsg = { "id": "4", "type": "start", "payload": { "variables": { "streamer": username }, "extensions": { "persistedQuery": { "version": 1, "sha256Hash": "feb450b243f3dc91f7672129876b5c700b6594b9ce334bc71f574653181625d5" } }, "operationName": "StreamMessageSubscription", "query": "subscription StreamMessageSubscription($streamer: String!) {\n  streamMessageReceived(streamer: $streamer) {\n    type\n    ... on ChatGift {\n      id\n      gift\n      amount\n      message\n      recentCount\n      expireDuration\n      ...VStreamChatSenderInfoFrag\n      __typename\n    }\n    ... on ChatHost {\n      id\n      viewer\n      ...VStreamChatSenderInfoFrag\n      __typename\n    }\n    ... on ChatSubscription {\n      id\n      month\n      ...VStreamChatSenderInfoFrag\n      __typename\n    }\n    ... on ChatExtendSub {\n      id\n      month\n      length\n      ...VStreamChatSenderInfoFrag\n      __typename\n    }\n    ... on ChatChangeMode {\n      mode\n      __typename\n    }\n    ... on ChatText {\n      id\n      content\n      subLength\n      ...VStreamChatSenderInfoFrag\n      __typename\n    }\n    ... on ChatSubStreak {\n      id\n      ...VStreamChatSenderInfoFrag\n      length\n      __typename\n    }\n    ... on ChatClip {\n      id\n      url\n      ...VStreamChatSenderInfoFrag\n      __typename\n    }\n    ... on ChatFollow {\n      id\n      ...VStreamChatSenderInfoFrag\n      __typename\n    }\n    ... on ChatDelete {\n      ids\n      __typename\n    }\n    ... on ChatBan {\n      id\n      ...VStreamChatSenderInfoFrag\n      bannedBy {\n        id\n        displayname\n        __typename\n      }\n      bannedByRoomRole\n      __typename\n    }\n    ... on ChatModerator {\n      id\n      ...VStreamChatSenderInfoFrag\n      add\n      __typename\n    }\n    ... on ChatEmoteAdd {\n      id\n      ...VStreamChatSenderInfoFrag\n      emote\n      __typename\n    }\n    ... on ChatTimeout {\n      id\n      ...VStreamChatSenderInfoFrag\n      minute\n      bannedBy {\n        id\n        displayname\n        __typename\n      }\n      bannedByRoomRole\n      __typename\n    }\n    ... on ChatTCValueAdd {\n      id\n      ...VStreamChatSenderInfoFrag\n      amount\n      totalAmount\n      __typename\n    }\n    ... on ChatGiftSub {\n      id\n      ...VStreamChatSenderInfoFrag\n      count\n      receiver\n      __typename\n    }\n    ... on ChatGiftSubReceive {\n      id\n      ...VStreamChatSenderInfoFrag\n      gifter\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment VStreamChatSenderInfoFrag on SenderInfo {\n  subscribing\n  role\n  roomRole\n  sender {\n    id\n    username\n    displayname\n    avatar\n    partnerStatus\n    badges\n    effect\n    __typename\n  }\n  __typename\n}\n" } };
				ws.send(JSON.stringify(joinmsg));
			};

			ws.onmessage = msg => {
				if (settings.autoClaimGiftedSub) claimGiftedSub(username);
				msg = JSON.parse(msg.data);
				if (msg.type === 'connection_ack') {
					log('Connected on stream chat socket.');
					// Connected, remove old message log...
					window.localStorage.removeItem('local');
				}
				if (msg.type !== 'ka' && msg.type !== 'connection_ack') {
					[msg] = msg.payload.data.streamMessageReceived;
					if (msg.__typename === 'ChatText' && settings.logAllChatMessages) handleChatText(msg);
					if (msg.__typename === 'ChatFollow' && settings.logChatFollows) handleChatFollow(msg);
					if (msg.__typename === 'ChatDelete' && settings.logDeletedMessages) handleChatDelete(msg);
				}
			};
			/* #endregion */

			/* #region Chest WebSocket */
			const cs = new WebSocket('wss://graphigostream.prd.dlive.tv/', 'graphql-ws');
			cs.onopen = () => {
				cs.send('{"type":"connection_init","payload":{}}');
				const joinmsg = { "id": "1", "type": "start", "payload": { "variables": { "streamer": username }, "extensions": { "persistedQuery": { "version": 1, "sha256Hash": "68ad3a464ae2f860541e98dfe28a64756ef772811d2307298f0fb865b5593566" } }, "operationName": "TreasureChestMessageReceived", "query": "subscription TreasureChestMessageReceived($streamer: String!) {\n  treasureChestMessageReceived(streamer: $streamer) {\n    type\n    ... on TreasureChestGiveawayEnded {\n      type\n      nextGiveawayThresholdAt\n      __typename\n    }\n    ... on TreasureChestValueExpired {\n      type\n      expireAt\n      value\n      __typename\n    }\n    ... on TreasureChestGiveawayStarted {\n      type\n      endTime\n      pricePool\n      durationInSeconds\n      __typename\n    }\n    ... on TreasureChestReadyToCollect {\n      type\n      __typename\n    }\n    ... on TreasureChestValueUpdated {\n      type\n      value\n      __typename\n    }\n    __typename\n  }\n}\n" } };
				cs.send(JSON.stringify(joinmsg));
			};

			cs.onmessage = msg => {
				msg = JSON.parse(msg.data);
				if (msg.type === 'connection_ack') {
					log('Connected on treasure chest socket.');
				} else if (msg.type !== 'ka') {
					if (settings.autoClaimChest) openChest(username);
					msg = msg.payload.data.treasureChestMessageReceived;
					if (msg.type === 'ValueUpdated') {
						if (settings.logChestValueUpdates) handleChestValueUpdated(msg);
						if (settings.showChestLemons) {
							const chest = document.getElementById('chestvalue');
							if (chest) {
								chest.innerHTML = '<center>' + msg.value / 100000 + '</center>';
								console.log('appended to chest: <center> ' + msg.value / 100000 + ' </center>')
							} else {
								console.log('chest dont exist, adding');
								const chestParent = document.querySelector('.info-line-wrap > div:nth-child(2)');
								if (chestParent) {
									const chestValue = document.createElement('p');
									chestValue.innerHTML = '<center>' + msg.value / 100000 + '</center>';
									chestValue.id = 'chestvalue';
									chestParent.appendChild(chestValue);
								}
							}
						}
					}
				}
			};
			/* #endregion */
		}
	});

};

setInterval(() => {
	if (this.lastPathStr !== location.pathname || this.lastQueryStr !== location.search) {
		this.lastPathStr = location.pathname;
		this.lastQueryStr = location.search;
		onLoad();
	}
}, 111);
