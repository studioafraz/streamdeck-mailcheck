let websocket = null,
    pluginUUID = null,
    apiKey = "",
    provider = "";

let socketArgs = null;
let reconnectAttempts = 0;

let fetchTimers = {}; // One interval per button context, keyed by context id
let pendingRequests = {}; // Guards against overlapping requests per context

function connectElgatoStreamDeckSocket(
    inPort,
    inPluginUUID,
    inRegisterEvent,
    inInfo
) {
    pluginUUID = inPluginUUID;
    socketArgs = { inPort, inPluginUUID, inRegisterEvent, inInfo };

    openSocket();
}

function openSocket() {
    // Open the web socket
    websocket = new WebSocket("ws://localhost:" + socketArgs.inPort);

    websocket.onopen = function () {
        reconnectAttempts = 0;

        // WebSocket is connected, register the plugin
        const json = {
            event: socketArgs.inRegisterEvent,
            uuid: socketArgs.inPluginUUID,
        };

        websocket.send(JSON.stringify(json));
    };

    websocket.onclose = function () {
        scheduleReconnect();
    };

    websocket.onerror = function () {
        websocket.close(); // Triggers onclose -> reconnect
    };

    websocket.onmessage = function (evt) {
        // Received message from Stream Deck
        const jsonObj = JSON.parse(evt.data);
        const context = jsonObj["context"];

		let fetcherURL = "";
		let backgroundFetching = "true";
		let frequency = 1000 * 60 * 3;
		let imapServers = "";
		let imapUsers = "";
		let imapPasswords = "";

		let allowAnimations = "true";
		let styleIconColorDefault = "transparent";
		let styleIconColorUnread = "#007aff";
		let styleTitleDisplayType = "true";
		let styleTitleCustomText = "";
		let styleTitleCustomPosition = "over";



        if (jsonObj["event"] === "didReceiveSettings" || jsonObj["event"] === "willAppear" || jsonObj["event"] === "keyDown") { //After updating the settings via Property Inspector OR when the plugin just gets displayed OR on Button Press

			if ( //Check if all required settings were set
				jsonObj.payload.settings != null &&
				jsonObj.payload.settings.hasOwnProperty("fetcherURL") &&
				jsonObj.payload.settings.hasOwnProperty("imapServers") &&
				jsonObj.payload.settings.hasOwnProperty("imapUsers") &&
				jsonObj.payload.settings.hasOwnProperty("imapPasswords")

			) {
				fetcherURL = jsonObj.payload.settings["fetcherURL"];
				backgroundFetching = jsonObj.payload.settings["backgroundFetching"];


				imapServers = jsonObj.payload.settings["imapServers"];
				imapUsers = jsonObj.payload.settings["imapUsers"];
				imapPasswords = jsonObj.payload.settings["imapPasswords"];

				let frequencySetting = jsonObj.payload.settings["frequency"];
				let frequencyNumber = Number(frequencySetting);
				if (frequencySetting != "3" && frequencySetting != "" && !isNaN(frequencyNumber) && frequencyNumber > 0){ //Check for valid custom value
					frequency = 1000 * 60 * frequencyNumber;
				}

				allowAnimations = jsonObj.payload.settings["allowAnimations"];

				if (jsonObj.payload.settings["styleIconColorDefault"] != "transparent" && jsonObj.payload.settings["styleIconColorDefault"] != ""){ //Check for custom value
					styleIconColorDefault = jsonObj.payload.settings["styleIconColorDefault"];
				}

				if (jsonObj.payload.settings["styleIconColorUnread"] != "#007aff" && jsonObj.payload.settings["styleIconColorUnread"] != ""){ //Check for custom value
					styleIconColorUnread = jsonObj.payload.settings["styleIconColorUnread"];
				}

				styleTitleDisplayType = jsonObj.payload.settings["styleTitleDisplayType"];

				if (jsonObj.payload.settings["styleTitleCustomText"] != ""){ //Check for custom value
					styleTitleCustomText = jsonObj.payload.settings["styleTitleCustomText"];
				}

				styleTitleCustomPosition = jsonObj.payload.settings["styleTitleCustomPosition"];
			}

			clearInterval(fetchTimers[context]); // Stop this button's timer with old values to start a new one with new values

			sendRequest(context,fetcherURL,imapServers,imapUsers,imapPasswords,allowAnimations,styleIconColorDefault,styleIconColorUnread,styleTitleDisplayType,styleTitleCustomText,styleTitleCustomPosition);

			if (backgroundFetching != "false"){ //Check if Background Fetching is not disabled
				fetchTimers[context] = setInterval(function() { sendRequest(context,fetcherURL,imapServers,imapUsers,imapPasswords,allowAnimations,styleIconColorDefault,styleIconColorUnread,styleTitleDisplayType,styleTitleCustomText,styleTitleCustomPosition); },frequency);
			}

        }

		if (jsonObj["event"] === "willDisappear") { //Button removed from view: stop polling and free resources
			clearInterval(fetchTimers[context]);
			delete fetchTimers[context];
			delete pendingRequests[context];
		}

    };
}

function scheduleReconnect() {
    reconnectAttempts++;
    const delay = Math.min(30000, 1000 * reconnectAttempts); // Back off up to 30s
    setTimeout(openSocket, delay);
}

function joinMultiValue(value) { //Turn multi-line Property Inspector input into a single "splitMarker"-separated string
	return /\r|\n/.test(value) ? value.split(/\r|\n/).join("splitMarker") : value;
}

function sendRequest(context,fetcherURL,imapServers,imapUsers,imapPasswords,allowAnimations,styleIconColorDefault,styleIconColorUnread,styleTitleDisplayType,styleTitleCustomText,styleTitleCustomPosition) {

	if (pendingRequests[context]) { //Skip if the previous request for this button hasn't finished yet
		return;
	}
	pendingRequests[context] = true;

	let url = fetcherURL;
	let servers = joinMultiValue(imapServers);
	let users = joinMultiValue(imapUsers);
	let passwords = joinMultiValue(imapPasswords);

	let body = "servers=" + encodeURIComponent(servers) + "&users=" + encodeURIComponent(users) + "&passwords=" + encodeURIComponent(passwords);
	let allowAnimationsStatus = allowAnimations;
	let styleIconColorDefaultValue = styleIconColorDefault;
	let styleIconColorUnreadValue = styleIconColorUnread;
	let styleTitleDisplayTypeValue = styleTitleDisplayType;
	let styleTitleCustomTextValue = styleTitleCustomText;
	let styleTitleCustomPositionValue = styleTitleCustomPosition;

	let request = new XMLHttpRequest();
    request.open("POST", url);
	request.setRequestHeader("Content-type","application/x-www-form-urlencoded");
	request.timeout = 15000; // Abort if no response within 15s so a stuck request can't block future updates

	function showConnectionError() {
		pendingRequests[context] = false;

		let jsonTitle = {
			event: "setTitle",
			context,
			payload: {
				title: "Conn.\nError",
			},
		};
		websocket.send(JSON.stringify(jsonTitle));

		let jsonDeck = {
			event: "setImage",
			context,
			payload: {
				image: "data:image/svg+xml;charset=utf8,<svg height=\"72\" width=\"72\"><rect x=\"0\" y=\"0\" width=\"72\" height=\"72\" fill=\"#ff3b30\" /></svg>"
			},
		};
		websocket.send(JSON.stringify(jsonDeck));
	}

	request.ontimeout = showConnectionError;
	request.onerror = showConnectionError;

    request.send(body);

    request.onreadystatechange = function () {
        if (request.readyState === XMLHttpRequest.DONE) {
			pendingRequests[context] = false;

            if (request.status === 200) {
				let titleContent = request.responseText;
				let titleContentWording = "";

				if ( !isNaN(titleContent) ) { //Check if url response contains only a number

					if (titleContent > 0) { //At least one unread mail found

						if (titleContent == 1) {
							titleContentWording = "\nMail";
						}
						else {
							titleContentWording = "\nMails";
						}

						if (allowAnimationsStatus == "true"){ //Animations enabled
							let canvas = document.getElementById("idCanvas");
							let ctx = canvas.getContext("2d");

							function drawCircle(x){
								ctx.lineWidth = 2;
								ctx.beginPath();
								ctx.arc(36,36,x+3,0,2*Math.PI);
								ctx.strokeStyle = styleIconColorUnreadValue;
								ctx.stroke();

							}

							ctx.clearRect(0,0,72,72);
							drawCircle(54/3);

							let dataUrl = canvas.toDataURL();
							let jsonDeckImg = {
								event: "setImage",
								context,
								payload: {
									image: dataUrl,
								},
							};
							websocket.send(JSON.stringify(jsonDeckImg));

							setTimeout(function (){

								ctx.clearRect(0,0,72,72);
								drawCircle(72/3);
								dataUrl = canvas.toDataURL();
								jsonDeckImg = {
									event: "setImage",
									context,
									payload: {
										image: dataUrl,
									},
								};
								websocket.send(JSON.stringify(jsonDeckImg));

							}, 100);

						}
						else { //Animations disabled
							let jsonDeck = {
							event: "setImage",
							context,
							payload: {
								image: "data:image/svg+xml;charset=utf8,<svg height=\"72\" width=\"72\"><rect x=\"0\" y=\"0\" width=\"72\" height=\"72\" fill=\"" + styleIconColorUnreadValue + "\" /></svg>"
								},
							};

							websocket.send(JSON.stringify(jsonDeck));
						}

					}
					else { //No unread mails found
						titleContentWording = "\nMails";

						let jsonDeck = {
						event: "setImage",
						context,
						payload: {
							image: "data:image/svg+xml;charset=utf8,<svg height=\"72\" width=\"72\"><rect x=\"0\" y=\"0\" width=\"72\" height=\"72\" fill=\""+ styleIconColorDefaultValue +"\" /></svg>"
								},
						};

						websocket.send(JSON.stringify(jsonDeck));
					}

					if (styleTitleDisplayTypeValue == "false") { //Check if Title Display is disabled
						let jsonDeck = {
							event: "setTitle",
							context,
							payload: {
								title: titleContent,
							},
						};

						websocket.send(JSON.stringify(jsonDeck));
					}
					else { //Title Display enabled
						if (styleTitleCustomTextValue != ""){
							if (styleTitleCustomPositionValue == "over"){
								titleContent = styleTitleCustomTextValue + "\n" + titleContent;
							}
							else {
								titleContent = titleContent + "\n" + styleTitleCustomTextValue;
							}
						}
						else {
							titleContent = titleContent + titleContentWording;
						}

						let jsonDeck = {
							event: "setTitle",
							context,
							payload: {
								title: titleContent,
							},
						};

						websocket.send(JSON.stringify(jsonDeck));
					}

				}
				else {
					let titleContent = "Config\nError";
					let json = {
						event: "setTitle",
						context,
						payload: {
							title: titleContent,
						},
					};
					websocket.send(JSON.stringify(json));

					let jsonDeck = {
					event: "setImage",
					context,
					payload: {
						image: "data:image/svg+xml;charset=utf8,<svg height=\"72\" width=\"72\"><rect x=\"0\" y=\"0\" width=\"72\" height=\"72\" fill=\"#ff3b30\" /></svg>"
						},
					};

					websocket.send(JSON.stringify(jsonDeck));
				}

            } else {
				let titleContent = "Status\nError";
                let json = {
                    event: "setTitle",
                    context,
					payload: {
                        title: titleContent,
                    },
                };
                websocket.send(JSON.stringify(json));

				let jsonDeck = {
				event: "setImage",
				context,
				payload: {
					image: "data:image/svg+xml;charset=utf8,<svg height=\"72\" width=\"72\"><rect x=\"0\" y=\"0\" width=\"72\" height=\"72\" fill=\"#ff3b30\" /></svg>"
					},
				};

				websocket.send(JSON.stringify(jsonDeck));
            }
        }
    };
}
