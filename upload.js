const path = require("path");
const helper = require("./helper");
const FModel = require("./DbModel/model");
const Setting = require("./DbModel/setting");
const Platform = require("./DbModel/platform");
const { PLATFORM_MARK, BOTSTATE, BOTSCHEDULE } = require("./constant");

let upload_page = null;
let current_model = null;
let bot_config = null;
let upload_data = null;
let api_headers = {};

const setTagToVault = async (uuid) => {
    let opt = `{"data":{"type":"vaultResourceTags","attributes":{"resourceTagId":"68146","vaultId":"${uuid}"}}}`;
    let url = "https://fancentro.com/admin/lapi/vaultResourceTags";
    //console.log(api_headers)
    api_headers["content-type"] = "application/vnd.api+json";
    api_headers.accept = "application/vnd.api+json";
    let response = await upload_page.request.post(url, { headers: api_headers, data: opt });
    //console.log("BBB",  await response.json())  
}

const imageUploadToLibrary = async () => {
    let uploadData = upload_data.data;
    let count = 0;
    try {
        let folder = await helper.getUploadFolder(current_model);
        for (let i = uploadData.items.length - 1; i >= 0; i--) {
            let uploadItem = uploadData.items[i];
            if (!uploadItem.uploaded) {
                const responsePromisePure = helper.getResponsePromise(upload_page, "admin/lapi/vaultItems", 201, "POST");
                const responsePromise = helper.getResponsePromise(upload_page, "include=storageResource");
                await upload_page.locator("#upload-file").setInputFiles(path.join(folder, uploadItem.file));
                const resp = await responsePromisePure;
                let vault = await resp.json();
                const resp2 = await responsePromise;
                api_headers = await resp2.request().allHeaders();
                let storage = await resp2.json();
                await upload_page.locator("//span[contains(@class, 'fc-member-a20_038')]").waitFor({ timeout: 0 });
                await helper.waitTime(500);
                //console.log(storage)
                uploadItem.uuid = vault.data.id;
                uploadItem.storageId = storage.data.relationships.storageResource.data.id;
                uploadItem.uploaded = true;
                uploadData.items[i] = uploadItem;
                await helper.writeLog(current_model, `(UPLOAD) : ${uploadItem.file} is uploaded`, false);
                await setTagToVault(vault.data.id);
                await helper.waitTime(300);
                count ++;
            }
        }
    } catch (e) {
        console.error(`### ERROR : imageUploadToLibray : ${e.message}`)
        await helper.writeLog(current_model, "(UPLOAD) : Errors while Uploading " + bot_config.URL.UPLOAD_URL);
        throw e;
        // await helper.setBotStatus(current_model, BOTSTATE.NO_RESPONCE, { page: bot_config.URL.UPLOAD_URL });
    }
    upload_data.data = uploadData;
    await helper.writeLog(current_model, `(UPLOAD) : Bot uploads ${count} items.`, false);
};

// check if needs to upload
const hasUploadReady = async (model) => {
    try {
        let folder = await helper.getUploadFolder(model);
        upload_data = await helper.getScheduleData(model, BOTSCHEDULE.UPLOAD);
        if (upload_data && upload_data.data && !upload_data.data.uploaded) {
            for (let item of upload_data.data.items) {
                if (!helper.adjustCorrectFile(folder, item.file)) {
                    await helper.writeLog(model, `(UPLOAD) : ${item.file} is not exist for uploading `);
                    return false;
                }
            }
            return true;
        }
        // await helper.writeLog(model, `(UPLOAD) : Already uploaded`, false);
        return false;
    } catch (err) {
        console.error(`### ERROR : hasUploadReady : ${err.message}`)
        return false;
    }
}

const manageUpload = async (page, model, config, apiHeaders) => {
    try {
        current_model = model;
        upload_page = page;
        bot_config = config;
        api_headers = apiHeaders;
        let common_config = await helper.getCommonSetting(current_model);
        if (upload_page) {
            // check upload data
            if (!upload_data || !upload_data.data || upload_data.data.uploaded) {
                await helper.writeLog(current_model, "(UPLOAD) : There is no uploading data.", false)
                return false;
            }
            // go to uploads url
            if (upload_page.url() != bot_config.URL.UPLOAD_URL) {
                await upload_page.goto(bot_config.URL.UPLOAD_URL);
                try {
                    //const responsePromisePure = helper.getResponsePromise(upload_page, "admin/lapi/vaultItems");
                    console.log("HERE : 6")
                    await upload_page.locator("#uploads").click();
                    //await responsePromisePure;
                    await helper.waitTime(5000);
                } catch (e) {
                    console.log("HERE : 5")
                    await helper.sendImportantMessage(upload_page, common_config.REPORT.DISCORD_IMPORTANT, current_model.ALIAS, "Popup dialog maybe shown in fnc of " + current_model.ALIAS);
                    await helper.setBotStatus(current_model, BOTSTATE.POPUP, { page: config.URL.SITE_URL });
                }
            }
            // if (!upload_data.data.uploaded) {
            await helper.writeLog(model, "(UPLOAD) : Begin uploading");
            await imageUploadToLibrary();
            await helper.writeLog(model, "(UPLOAD) : End uploading");
            // check if all upload data is uploaded
            console.log("HERE : 4")
            upload_data.data.uploaded = true;
            for (var item of upload_data.data.items) {
                if (item.uploaded == false)
                    upload_data.data.uploaded = false;
            }
            await helper.setScheduleData(model, BOTSCHEDULE.UPLOAD, upload_data.data);
        }
        console.log("HERE : 3")
    } catch (err) {
        console.error(`### ERROR : manageUpload : ${err.message}`);
    }
}

module.exports = {
    hasUploadReady,
    manageUpload,
}