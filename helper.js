const fs = require("fs");
const Log = require("./DbModel/log");
const BotStatus = require("./DbModel/botstatus");
const BotSchedule = require("./DbModel/botschedule");
const CommonSetting = require("./DbModel/commonsetting");
const ScheduleData = require("./DbModel/scheduledata");
const Blacklist = require("./DbModel/blacklist");
const Wordlist = require("./DbModel/wordlist");
const { BOTSTATE, BOTSCHEDULE } = require("./constant");
const csv = require("csvtojson");
const Platform = require("./DbModel/platform");
const path = require("path");
const FModel = require("./DbModel/model");
const Discord = require("./DbModel/discord");
const waitTime = (msecs) => {
    return new Promise((resolve) => setTimeout(() => resolve(), msecs));
};

const makeUTC = (v) => {
    const utcDate1 = new Date(Date.UTC(v[0], v[1], v[2], v[3], v[4], v[5]));
    return utcDate1.getTime();
}

const makeDateArrayFromUTC = (v) => {
    const d = new Date();
    d.setTime(v)
    let yr = d.getFullYear();
    let mon = d.getUTCMonth();
    let dy = d.getUTCDate();
    let hr = d.getUTCHours();
    let min = d.getUTCMinutes();
    let sec = d.getUTCSeconds();
    return [yr, mon, dy, hr, min, sec];
}

const getDateArray = () => {
    const d = new Date();
    let yr = d.getFullYear();
    let mon = d.getUTCMonth();
    let dy = d.getUTCDate();
    let hr = d.getUTCHours();
    let min = d.getUTCMinutes();
    let sec = d.getUTCSeconds();
    return [yr, mon, dy, hr, min, sec];
}

const loadObject = (jsonPath) => {
    try {
        const data = fs.readFileSync(jsonPath);
        return JSON.parse(data);
    } catch (e) {
        return {};
    }
}

const existFile = (path) => {
    return fs.existsSync(path);
}

const renameFile = (path, newPath) => {
    fs.renameSync(path, newPath);
}
const makeFolder = (path) => {
    fs.mkdirSync(path, { recursive: true });
}

const saveObject = (jsonPath, obj) => {
    fs.writeFileSync(jsonPath, JSON.stringify(obj));
}

const checkInvaildMessage = (msg, words) => {
    if (msg == undefined || msg == null || msg == "")
        return false;
    const checkLink = (msg) => {
        let temp = msg.toLowerCase();
        if (temp.indexOf("http") >= 0 || temp.indexOf("//") >= 0)
            return true;
        return false;
    }

    const checkWords = (msg) => {
        let temp = msg.toLowerCase();
        for (let i = 0; i < words.length; i++) {
            if (temp.indexOf(words[i].word.toLowerCase()) >= 0)
                return true;
        }
        return false;
    }
    const checkNumber = (msg) => {
        // 2124567890
        // 212-456-7890
        // (212)456-7890
        // (212)-456-7890
        // 212.456.7890
        // 212 456 7890
        // +12124567890
        // +12124567890
        // +1 212.456.7890
        // +212-456-7890
        // 1-212-456-7890
        const regex = /\d+/g;
        let number_list = msg.match(regex);
        if (number_list != null) {
            for (let i = 0; i < number_list.length; i++) {
                if (number_list[i].length >= 3)
                    return true;
            }
        }
        return false;
    }
    return checkLink(msg) || checkWords(msg) || checkNumber(msg);
}

const waitForViewingItems = async (page, cnt) => {
    let count2 = 0;
    do {
        await waitTime(1000);
        count2 = await page.locator("//div[contains(@class, 'MuiGrid-container')]/div[contains(@class, 'MuiGrid-item')]/div/span/span[not(contains(@class, 'fc-member-a24_011'))]").count();
    } while (cnt > count2);
}

const readDataFromCsv = async (path, delimiter = ',') => {
    const entries = await csv({
        noheader: true,
        output: "csv",
        delimiter,
    }).fromFile(path);
    return entries;
};

const getResponseForMediaList = async (page) => {
    const responsePromise = page.waitForResponse(response => {
        let req = response.request();
        return (req.url() == "https://f2f.com/accounts/media/") && response.status() === 200;
    }
    );
    return responsePromise;
}

const writeLog = async (cModel, message, db = true) => {
    console.log("[FNC] : ", message);
    if (db)
        await Log.create({
            model: cModel._id,
            message: message,
            time: new Date()
        });
}

const addSchedule = async (cModel, type, param) => {
    await BotSchedule.create({
        model: cModel._id,
        type: type,
        param: param
    });
}

const updateSchedule = async (schedule_id, result, working) => {
    await BotSchedule.findByIdAndUpdate(schedule_id, { $set: { result, working } });
}

const deleteSchedule = async (schedule_id) => {
    await BotSchedule.deleteOne({ _id: schedule_id });
}

const clearRunningSchedules = async (cModel) => {
    await BotSchedule.updateMany({ model: cModel._id }, { $set: { working: false } });
}

// get working schedule(result is null) for model
const getSchedule = async (cModel) => {
    let schedule = await BotSchedule.find({ model: cModel._id, result: null }).sort({ createdAt: 1 });
    return schedule;
}

const setBotStatus = async (cModel, state_txt, param) => {
    let state = await BotStatus.findOne({ model: cModel._id });
    if (state == null) {
        await BotStatus.create({
            model: cModel._id,
            status: state_txt,
            param: param
        });
    }
    else {
        state.status = state_txt;
        state.param = param;
        state.save();
    }
    await writeLog(cModel, `(STATUS) Bot's state is changed to '${state_txt}' `);
}

const readBotStatus = async (cModel) => {
    let state = await BotStatus.findOne({ model: cModel._id });
    return state;
}
const getBotStatus = async (cModel) => {
    let state = await BotStatus.findOne({ model: cModel._id });
    return state.status;
}
const getResponsePromise = async (page, url, status, mode) => {
    const responsePromise = page.waitForResponse(response => {
        let req = response.request();
        if (status == undefined || status == null)
            return (req.url().indexOf(url) >= 0);
        else {
            if (mode == undefined || mode == null) {
                return (req.url().indexOf(url) >= 0) && response.status() === status;
            } else {
                return (req.url().indexOf(url) >= 0) && response.status() === status && req.method() === mode;
            }
        }
    });
    return responsePromise;
}

const getUploadFolder = async (model) => {
    let commonSetting = await CommonSetting.findOne({ platform: model.platform });
    let platform = await Platform.findById(model.platform);
    return path.join(commonSetting.UPLOAD.FOLDER, model.UNIQUE, "free");
}

const getDailyFolder = async (model) => {
    let commonSetting = await CommonSetting.findOne({ platform: model.platform });
    let platform = await Platform.findById(model.platform);
    return path.join(commonSetting.UPLOAD.FOLDER, model.UNIQUE, "daily");
}

const getOnboardFolder = async (model) => {
    let commonSetting = await CommonSetting.findOne({ platform: model.platform });
    let platform = await Platform.findById(model.platform);
    return path.join(commonSetting.UPLOAD.FOLDER, model.UNIQUE, "onboard");
}

const getCommonSetting = async (model) => {
    let commonSetting = await CommonSetting.findOne({ platform: model.platform });
    return commonSetting;
}

const setScheduleData = async (cModel, type, param) => {
    let scheduleData = await ScheduleData.findOne({ model: cModel._id, type: type });
    if (!scheduleData) {
        await ScheduleData.create({
            model: cModel._id,
            type: type,
            data: param
        });
    } else {
        scheduleData.data = param;
        scheduleData.save();
    }
    await writeLog(cModel, `(SCHEDULER) : Bot data of \'${type}\' is changed`);
}

const getScheduleData = async (cModel, type) => {
    let scheduleData = await ScheduleData.findOne({ model: cModel._id, type: type });
    return scheduleData;
}

const getCommentList = async () => {
    let commentList = await Wordlist.find({ type: "COMMENT" });
    return commentList;
}

const getKeywordList = async () => {
    let keywordList = await Wordlist.find({ type: "KEYWORD" });
    return keywordList;
}

const isTeamMember = async (alias, platform) => {
    let oneModel = await FModel.findOne({ ALIAS: alias, platform: platform });
    return oneModel !== null;
}
const isBlackListMember = async (platform, alias) => {
    let oneModel = await Blacklist.findOne({ platform: platform, user: alias });
    return oneModel !== null;
}

const getTeamCount = async (platform) => {
    let models = await FModel.find({ platform: platform });
    return models.length;
}

const getDiscordHook = async (id) => {
    let models = await Discord.findById(id);
    return models == null ? "" : models.url;
}

const adjustCorrectFile = (folder, file) => {
    let filePath = path.join(folder, file);
    let filePath1 = path.join(folder, file.toUpperCase());
    let filePath2 = path.join(folder, file.toLowerCase());
    if (!existFile(filePath1) && !existFile(filePath2)) {
        return false;
    }
    if (filePath == filePath1 && !existFile(filePath)) {
        renameFile(filePath2, filePath);
    }
    if (filePath == filePath2 && !existFile(filePath)) {
        renameFile(filePath1, filePath);
    }
    return true;
}

const checkFisrtVaultItem = async (page) => {
    const checkSpans = page.locator("//div[contains(@class, 'MuiGrid-grid-xs-2') or contains(@class, 'MuiGrid-grid-xs-4')]")
        .locator("//span/span[1]");
    let checkItem = await checkSpans.first();
    await checkItem.scrollIntoViewIfNeeded();
    await checkItem.click();
    await waitTime(100);
}

const deletePendingSchedules = async (model) => {
    await BotSchedule.deleteMany({ model: model._id, result: null });
}

const sendImportantMessage = async (page, discordId, alias, msg) => {
    const params = {
        username: "FNC - Notification from " + alias,
        avatar_url: "",
        content: msg
    }
    let importantHook = await getDiscordHook(discordId);
    await page.request.post(importantHook, { data: params });
}
module.exports = {
    sendImportantMessage,

    clearRunningSchedules,
    deletePendingSchedules,
    deleteSchedule,
    addSchedule,
    updateSchedule,
    getSchedule,

    checkFisrtVaultItem,
    adjustCorrectFile,
    getDailyFolder,
    getOnboardFolder,
    getKeywordList,
    getDiscordHook,
    getTeamCount,
    isTeamMember,
    isBlackListMember,
    getCommentList,
    getCommonSetting,
    getScheduleData,
    setScheduleData,
    getUploadFolder,
    checkInvaildMessage,
    existFile,
    makeFolder,
    renameFile,
    loadObject,
    saveObject,
    waitTime,
    makeUTC,
    makeDateArrayFromUTC,
    waitForViewingItems,
    readDataFromCsv,
    getDateArray,
    getResponseForMediaList,
    writeLog,
    setBotStatus,
    readBotStatus,
    getBotStatus,
    getResponsePromise
}