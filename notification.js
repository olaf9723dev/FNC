
const helper = require("./helper");
const { PLATFORM_MARK, BOTSTATE, BOTSCHEDULE } = require("./constant");

let msg_page = null;
let current_model = null;
let messages = [];
let users = [];
let api_headers = {};
let words = [];
let notification_data = {};
let url = {};

const getUserName = (userId) => {
    if (users != null)
        return users.collection[userId.toString()].name;
    else
        return "";

}

const checkMessages = async () => {
    try {
        await getUsersInfo();
        notification_data = await helper.getScheduleData(current_model, BOTSCHEDULE.NOTIFICATION);
        if (!notification_data || !notification_data.data || !notification_data.data.noti) {
            notification_data = {};
            notification_data.data = {};
            notification_data.data.noti = [];
        }

        for (let i = 0; i < messages.length; i++) {
            let user_id;
            let auth_id = "";
            if (messages[i].members[0].role == "user") {
                user_id = messages[i].members[0].externalId;
                auth_id = messages[i].members[0].user.id;
            }
            if (messages[i].members[1].role == "user") {
                user_id = messages[i].members[1].externalId;
                auth_id = messages[i].members[1].user.id;
            }
            if (messages[i].messages[0] == null) continue;
            let user_name = getUserName(user_id);
            //console.log(user_name, messages[i].messages[0].data)
            if (messages[i].currentMember.unread == true && messages[i].messages[0].authorId == auth_id && messages[i].messages[0].data.text != undefined) {
                const params = {
                    username: "FNC - Notification",
                    avatar_url: "",
                    content: `Open chat for **${current_model.ALIAS}** from **${user_name}** *${messages[i].messages[0].data.text}*`
                }
                await sendNotificationMessage(params);
                notification_data.data.noti.push({
                    type: "normal",
                    user: user_name,
                    message: messages[i].messages[0].data.text
                });
            }
            if (messages[i].messages[0].data.text != undefined && helper.checkInvaildMessage(messages[i].messages[0].data.text, words)) {
                const params2 = {
                    username: "FNC - Notification",
                    avatar_url: "",
                    content: `WARN - Check chat for **${current_model.ALIAS}** - **${user_name}**: *${messages[i].messages[0].data.text}*`
                }
                let same_check = 0;
                for (let j = 0; j < notification_data.data.noti.length; j++) {
                    if (notification_data.data.noti[j].type == "admin"
                        && notification_data.data.noti[j].user == user_name) {
                        if (notification_data.data.noti[j].message != messages[i].messages[0].data.text) {
                            await sendWarnMessage(params2);
                            notification_data.data.noti[j].message = messages[i].messages[0].data.text;
                            same_check = 2;
                        } else {
                            same_check = 1;
                        }
                    }
                }
                if (same_check == 0) {
                    await sendWarnMessage(params2);
                    notification_data.data.noti.push({ type: "admin", user: user_name, message: messages[i].messages[0].data.text });
                }
            }
        }
        await helper.setScheduleData(current_model, BOTSCHEDULE.NOTIFICATION, notification_data.data);    
    } catch (err) {
        console.error(`### ERROR : checkMessage : ${e.message}`)
    }
}

const sendWarnMessage = async (msg) => {
    await helper.writeLog(current_model, '(NOTIFY) : Send warn message');
    if (url.reportHook)
        await msg_page.request.post(url.reportHook, { data: msg });
}

const sendNotificationMessage = async (msg) => {
    await helper.writeLog(current_model, '(NOTIFY) :Send notification message');
    if (url.modelHook) {
        await msg_page.request.post(url.modelHook, { data: msg });
    }
}

const getUsersInfo = async () => {
    let url = "https://fancentro.com/admin/api/chat.getInterlocutors";
    api_headers.accept = "application/vnd.api+json";
    api_headers["content-type"] = "application/vnd.api+json";
    // let param = {};
    // let user_id = "";
    // for (let i = 0; i < messages.length; i++) {
    //     if (messages[i].members[0].role == "user") {
    //         user_id = messages[i].members[0].externalId;
    //         auth_id = messages[i].members[0].user.id;
    //     }else if (messages[i].members[1].role == "user") {
    //         user_id = messages[i].members[1].externalId;
    //         auth_id = messages[i].members[1].user.id;
    //     }
    //     var keyText =  `userIds[${i}]`;
    //     param[keyText] = user_id;
    // }
    let param = [];
    let user_id = "";
    for (let i = 0; i < messages.length; i++) {
        if (messages[i].members[0].role == "user") {
            user_id = messages[i].members[0].externalId;
            auth_id = messages[i].members[0].user.id;
        } else if (messages[i].members[1].role == "user") {
            user_id = messages[i].members[1].externalId;
            auth_id = messages[i].members[1].user.id;
        }
        param.push(user_id);
    }
    try {
        let response = await msg_page.request.get(url, { headers: api_headers, data: { userIds: param } });
        let respJson = await response.json();
        users = respJson.response;
        //console.log(users)
    } catch (e) {
        users = null;
    }


}

const manageMessage = async (context, model, config, apiHeaders) => {
    try {
        let first_pass = true;
        current_model = model;
        api_headers = apiHeaders;
        // load keywords from wordlist
        words = await helper.getKeywordList();

        let common_config = await helper.getCommonSetting(current_model);
        url.reportHook = await helper.getDiscordHook(common_config.REPORT.DISCORD);
        url.modelHook = await helper.getDiscordHook(current_model.DISCORD);
        // create message page
        if (msg_page) {
            await msg_page.close();
            msg_page = null;
        }
        if (!msg_page) {
            msg_page = await context.newPage();
        }
        messages = [];

        await msg_page.route("https://fancentro.com/admin/api/chat.getInterlocutors", async (route, request) => {
            let post_data = request.postData();
            route.continue();
            api_headers = await request.allHeaders();
            if (first_pass && post_data.indexOf("userIds") >= 0 && messages.length > 0) {
                first_pass = false;
                await checkMessages();
            }
        });

        await msg_page.on('websocket', ws => {
            ws.on('framereceived', event => {
                if (event.payload.indexOf("room_list") > 0) {
                    let txt = event.payload;
                    txt = txt.replace("42/fc,", '');
                    let rooms = JSON.parse(txt);
                    //console.log(rooms[1].roomsData)
                    if (rooms[1].roomsData.length > 0) {
                        messages = messages.concat(rooms[1].roomsData);
                    }
                }
            });

        });
        await msg_page.goto(config.URL.MSG_URL);
        await msg_page.waitForLoadState();
    } catch (err) {
        console.error(`### ERROR : manageMessage : ${e.message}`);
    }
}

module.exports = {
    manageMessage
}