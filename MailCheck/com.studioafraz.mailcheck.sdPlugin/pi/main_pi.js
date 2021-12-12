let websocket = null,
    uuid = null,
    actionInfo = {};

function connectElgatoStreamDeckSocket(
    inPort,
    inPropertyInspectorUUID,
    inRegisterEvent,
    inInfo,
    inActionInfo
) {
    uuid = inPropertyInspectorUUID;
    actionInfo = JSON.parse(inActionInfo);

    websocket = new WebSocket("ws://localhost:" + inPort);

    websocket.onopen = function () {
		
        // WebSocket is connected, register the Property Inspector
        let json = {
            event: inRegisterEvent,
            uuid: inPropertyInspectorUUID,
        };
        websocket.send(JSON.stringify(json));

        json = {
            event: "getSettings",
            context: uuid,
        };
        websocket.send(JSON.stringify(json));
        json = {
            event: "getGlobalSettings",
            context: uuid,
        };
        websocket.send(JSON.stringify(json));
    };

    websocket.onmessage = function (evt) {
        // Received message from Stream Deck
        const jsonObj = JSON.parse(evt.data);
		
        if (jsonObj.event === "didReceiveSettings") {
            const payload = jsonObj.payload.settings;
            initiateElement("fetcherURL", payload.fetcherURL);
            initiateElement("frequency", payload.frequency, "3");
			initiateElement("imapServers", payload.imapServers);
			initiateElement("imapUsers", payload.imapUsers);
			initiateElement("imapPasswords", payload.imapPasswords);
			initiateElement("allowAnimations", payload.allowAnimations, "true");
			initiateElement("styleIconColorDefault", payload.styleIconColorDefault, "transparent");
			initiateElement("styleIconColorUnread", payload.styleIconColorUnread, "#007aff");
			initiateElement("styleTitleCustomText", payload.styleTitleCustomText);
			initiateElement("styleTitleCustomPosition", payload.styleTitleCustomPosition, "over");
			
        }
		
		const el = document.querySelector(".sdpi-wrapper");
        el && el.classList.remove("hidden");
    };
}

function initiateElement(element, value, fallback = "") {
    if (typeof value === "undefined") {
        document.getElementById(element).value = fallback;
        return;
    }
    document.getElementById(element).value = value;
}

function updateSettings() {
    if (websocket && websocket.readyState === 1) {
        let payload = {};
        payload.fetcherURL = document.getElementById("fetcherURL").value;
        payload.frequency = document.getElementById("frequency").value;
		payload.imapServers = document.getElementById("imapServers").value;
		payload.imapUsers = document.getElementById("imapUsers").value;
		payload.imapPasswords = document.getElementById("imapPasswords").value;		
		payload.allowAnimations = document.getElementById("allowAnimations").value;
		payload.styleIconColorDefault = document.getElementById("styleIconColorDefault").value;
		payload.styleIconColorUnread = document.getElementById("styleIconColorUnread").value;
		payload.styleTitleCustomText = document.getElementById("styleTitleCustomText").value;
		payload.styleTitleCustomPosition = document.getElementById("styleTitleCustomPosition").value;
		
        const json = {
            event: "setSettings",
            context: uuid,
            payload: payload,
        };
        websocket.send(JSON.stringify(json));
    }
}