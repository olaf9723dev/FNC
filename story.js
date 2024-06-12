
const helper = require("./helper");
const { PLATFORM_MARK, BOTSTATE, BOTSCHEDULE } = require("./constant");

let story_page = null;
let story_data = null;
let upload_data = null;
let current_model = null;
let bot_config = null;
var story_changed = true;
let api_headers = {};
let common_config;

const increadMediaIndex = () => {
    story_data.data.mediaIndex++;
    if (story_data.data.mediaIndex >= upload_data.data.items.length)
        story_data.data.mediaIndex -= upload_data.data.items.length;
}

const checkMediaIndex = () => {

    if (upload_data.data.uploaded == false) return;

    let u_index = story_data.data.mediaIndex;
    while (upload_data.data.items[u_index].uploaded == false) {
        increadMediaIndex();
        u_index = story_data.data.mediaIndex;
    }
}

const addVaultToStory = async (uuid, storageId) => {
    let param = {
        'stories[0][resourceId]': storageId,
        'stories[0][access]': '1',
        'stories[0][resourceVaultItemId]': uuid,
        'thumbAliases[0]': 'w600i',
        'thumbAliases[1]': 'w768_h1024l',
        'dryRun': '0'
    }
    let url = "https://fancentro.com/admin/api/story.createBulk";
    let response = await story_page.request.post(url, { headers: api_headers, multipart: param });
    let respJson = await response.json();
    //console.log(respJson)
    try {
        story_data.data.items.push({ id: respJson.response[0].id, storageId: respJson.response[0].resourceId });
    } catch (e) {
    }

}

const removeVaultFromStory = async () => {
    let param = { 'storyId': story_data.data.items[0].id };
    let url = "https://fancentro.com/admin/api/story.remove";
    let response = await story_page.request.post(url, { headers: api_headers, multipart: param });
    let respJson = await response.json();

    story_data.data.items.shift();
}

const addItems = async (n) => {
    for (let i = 0; i < n; i++) {
        checkMediaIndex();
        let vault = upload_data.data.items[story_data.data.mediaIndex];
        await addVaultToStory(vault.uuid, vault.storageId);
        increadMediaIndex();
        await helper.waitTime(100);
    }
}

const removeItems = async (n) => {
    for (let i = 0; i < n; i++) {
        await removeVaultFromStory();
        await helper.waitTime(100);
    }
}

const updateCurrentStory = async () => {
    try {
        let currentLen = story_data.data.items.length;
        let countToAdd = 0;
        let countToDel = 0;

        if (currentLen < current_model.STORY.COUNT) {
            countToAdd = current_model.STORY.COUNT - currentLen;
            countToDel = 0;
        } else if (currentLen == current_model.STORY.COUNT) {
            countToAdd = current_model.STORY.REPLACE;
            countToDel = current_model.STORY.REPLACE;
        } else if (currentLen > current_model.STORY.COUNT) {
            countToAdd = 0;
            countToDel = currentLen > current_model.STORY.COUNT;
        }
        //console.log(countToAdd,countToDel)
        if (countToAdd > 0) {
            await addItems(countToAdd);
            await helper.writeLog(current_model, `(STORY) : add ${countToAdd} items.`);
        }

        if (countToDel > 0) {
            await removeItems(countToDel);
            await helper.writeLog(current_model, `(STORY) : remove ${countToDel} items.`);
        }
        if (countToAdd > 0 || countToDel > 0) story_changed = true;

    } catch (err) {
        console.error(`### ERROR : updateCurrentStory : ${err.message}`);
        throw err;
    }
}

const getStories = async () => {
    try {
        let url = "https://fancentro.com/admin/api/story.get";
        if (api_headers)
            api_headers.accept = "*/*";
        let param = {
            "profileAlias": current_model.ALIAS,
            "thumbAliases[0]": "w600i",
            "thumbAliases[1]:": "w768_h1024l",
        };
        let response = await story_page.request.get(url, { headers: api_headers, params: param });
        const respJson = await response.json();
        story_data.data.items = [];
        if (respJson.response != undefined) {
            for (let i = 0; i < respJson.response.length; i++) {
                story_data.data.items.push({ id: respJson.response[i].id, storageId: respJson.response[i].resourceId });
            }
            await helper.writeLog(current_model, `(STORY) : get ${respJson.response.length} story items`, false)
        }
    } catch (err) {
        console.error(`### ERROR : getStories : ${err.message}`);
        throw err;
    }
}

const manageStory = async (page, model, config, apiHeaders) => {
    try {
        current_model = model;
        story_page = page;
        bot_config = config;
        api_headers = apiHeaders;
        // load upload, story, config data
        common_config = await helper.getCommonSetting(current_model);
        story_data = await helper.getScheduleData(model, BOTSCHEDULE.STORY);
        upload_data = await helper.getScheduleData(model, BOTSCHEDULE.UPLOAD);
        // if no story data, create one
        if (!story_data)
            story_data = { data: { mediaIndex: 0, items: [] } };

        if (story_page) {
            if (story_page.url() != bot_config.URL.STORY_URL) {
                await getStories();
                try {
                    await story_page.locator("#stories").click();
                } catch (e) {
                    await helper.sendImportantMessage(story_page, common_config.REPORT.DISCORD_IMPORTANT, current_model.ALIAS, "Popup dialog maybe shown in fnc of " + current_model.ALIAS);
                    await helper.setBotStatus(current_model, BOTSTATE.POPUP, { page: config.URL.SITE_URL });
                }
            }
            if (upload_data && upload_data.data && upload_data.data.items && upload_data.data.items.length > 0) {
                await helper.writeLog(model, "(STORY) : Begin posting to story.");
                await updateCurrentStory();
                await helper.setScheduleData(model, BOTSCHEDULE.STORY, story_data.data);
                await helper.writeLog(model, "(STORY) : End posting to story.");
            }
        }
    } catch (err) {
        console.error(`### ERROR : manageStory : ${err.message}`);
    }

}

module.exports = {
    manageStory,
}