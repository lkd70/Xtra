const b = (typeof browser === 'undefined') ? chrome : browser;

const saveOptions = e => {
	e.preventDefault();
	b.storage.sync.set({
		showChestLemons: document.querySelector("#showChestLemons").checked,
		logChestValueUpdates: document.querySelector("#logChestValueUpdates").checked,
		logDeletedMessages: document.querySelector("#logDeletedMessages").checked,
		logAllChatMessages: document.querySelector("#logAllChatMessages").checked,
		logChatFollows: document.querySelector("#logChatFollows").checked,
		autoClaimChest: document.querySelector("#autoClaimChest").checked,
		autoClaimGiftedSub: document.querySelector("#autoClaimGiftedSub").checked,
	});
	alert('Saved');
};

const resetOptions = e => {
	e.preventDefault();
	b.storage.sync.set({
		showChestLemons: true,
		logChestValueUpdates: true,
		logDeletedMessages: true,
		logAllChatMessages: true,
		logChatFollows: true,
		autoClaimChest: true,
		autoClaimGiftedSub: true,
	});
	alert('Reset to defaults');
	restoreOptions();
};

const restoreOptions = () => {
	const setCurrentChoice = result => {
		document.querySelector("#showChestLemons").checked = (result.showChestLemons === undefined) ? true : result.showChestLemons;
		document.querySelector("#logChestValueUpdates").checked = (result.logChestValueUpdates === undefined) ? true : result.logChestValueUpdates;
		document.querySelector("#logDeletedMessages").checked = (result.logDeletedMessages === undefined) ? true : result.logDeletedMessages;
		document.querySelector("#logAllChatMessages").checked = (result.logAllChatMessages === undefined) ? true : result.logAllChatMessages;
		document.querySelector("#logChatFollows").checked = (result.logChatFollows === undefined) ? true : result.logChatFollows;
		document.querySelector("#autoClaimChest").checked = (result.autoClaimChest === undefined) ? true : result.autoClaimChest;
		document.querySelector("#autoClaimGiftedSub").checked = (result.autoClaimGiftedSub === undefined) ? true : result.autoClaimGiftedSub;
	};

	b.storage.sync.get(null, setCurrentChoice);
};

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);
document.getElementById("reset").addEventListener("click", resetOptions);
