const fs = require("fs");
const { Solver } = require("2captcha-ts");

const playwright = require("playwright");
const args = require("yargs").argv;
const schedule = require('node-schedule');
const upload = require('./upload')
const story = require('./story');
const post = require('./post');
const comment = require('./comment');
const notification = require('./notification');
const dailypost = require('./dailypost');
//const onboard = require('./onboard');
//const subscription = require('./subscription');
//const discount = require('./discount');
const helper = require("./helper");
const { PLATFORM_MARK, BOTSTATE, BOTSCHEDULE } = require("./constant");
const mongoose = require("mongoose");
const FModel = require("./DbModel/model");
const Setting = require("./DbModel/setting");
const Platform = require("./DbModel/platform");
const Proxy = require("./DbModel/proxy");
const User = require("./DbModel/user");

var solver = null;
var common_config;
var config;
var platform;
//var dbUrl = "mongodb://admin:P33j753e!@localhost:27017/bots?authSource=admin";
var dbUrl = "mongodb://admin:P33je231@37.27.63.228:27017/bots?authSource=admin";
// variables
let login_success = false;
let browser, context;
let login_page = null;
let api_headers = {};
var schedule_counter = {
    story: 0,
    post: 0,
    notification: 0,
    upload: 0,
    daily: 0,
    comment: 0
}

let current_model = null;

// Schedule the fetchNewEmails function to run every minute

const closeProcess = async () => {
    await helper.writeLog(current_model, "Close the bot");
    await schedule.gracefulShutdown();
    process.exit(0)
}

const refreshModels = async () => {
    if (current_model == null) return;
    current_model = await FModel.findById(current_model._id);
}

const refmodels = schedule.scheduleJob("1 * * * * *", async function () {
    await refreshModels();
});

const getFirstSchedule = async () => {
    let schedule_list = await helper.getSchedule(current_model);

    if (schedule_list.length == 0) return null;
    return schedule_list[0];
}

const existSchedule = async (sched) => {
    let schedule_list = await helper.getSchedule(current_model);
    for (var schedule of schedule_list) {
        if (schedule.type === sched)
            return true;
    }
    return false;
}

const controller = schedule.scheduleJob("30 * * * * *", async function () {
    if (current_model == null) return;
    const firstSchedule = await getFirstSchedule();
    if (firstSchedule != null && firstSchedule.working == false) {
        await helper.updateSchedule(firstSchedule._id, null, true);
        let bot_state = await helper.readBotStatus(current_model);
        await processSchedule(bot_state, firstSchedule);
    }
}
);

const processSchedule = async (botState, botSchedule) => {
    try {
        if (botSchedule.type == BOTSCHEDULE.LOAD) {
            await helper.writeLog(current_model, `(SCHEDULER) : Current schedule = '${botSchedule.type}'`);
            await startBrowser();
            await helper.updateSchedule(botSchedule._id, { loaded: true }, false);
            return;
        }
        if (botSchedule.type == BOTSCHEDULE.CLOSE) {
            await helper.writeLog(current_model, `(SCHEDULER) : Current schedule = '${botSchedule.type}'`);
            await closeBrower();
            await helper.updateSchedule(botSchedule._id, { posted: true }, false);
            return;
        }
        if (botState == null) return;
        if ((botState.status == BOTSTATE.PURE)
            && botSchedule.type == BOTSCHEDULE.LOGIN) {
            await helper.writeLog(current_model, `(SCHEDULER) : Current schedule = '${botSchedule.type}'`);
            await loginToSite();
            await helper.waitTime(300);
            let bot_state = await helper.getBotStatus(current_model);
            if (bot_state == BOTSTATE.LOGINED)
                await helper.updateSchedule(botSchedule._id, { login: true }, false);
            else
                await helper.updateSchedule(botSchedule._id, { login: false }, false);
            return;
        }
    
    
        if (botSchedule.type == BOTSCHEDULE.STORY && botState.status == BOTSTATE.LOGINED) {
            await helper.writeLog(current_model, `(SCHEDULER) : Current schedule = '${botSchedule.type}'`);
            await story.manageStory(login_page, current_model, config, api_headers);
            await helper.updateSchedule(botSchedule._id, { posted: true }, false);
            return;
        }
    
        if (botSchedule.type == BOTSCHEDULE.POST && botState.status == BOTSTATE.LOGINED) {
            await helper.writeLog(current_model, `(SCHEDULER) : Current schedule = '${botSchedule.type}'`);
            await post.managePost(login_page, current_model, config, api_headers);
            await helper.updateSchedule(botSchedule._id, { posted: true }, false);
            return;
        }
    
        if (botSchedule.type == BOTSCHEDULE.UPLOAD && botState.status == BOTSTATE.LOGINED) {
            await helper.writeLog(current_model, `(SCHEDULER) : Current schedule = '${botSchedule.type}'`);
            await upload.manageUpload(login_page, current_model, config);
            await helper.updateSchedule(botSchedule._id, { uploaded: true }, false);
            return;
        }
    
        if (botSchedule.type == BOTSCHEDULE.COMMENT && botState.status == BOTSTATE.LOGINED) {
            await helper.writeLog(current_model, `(SCHEDULER) : Current schedule = '${botSchedule.type}'`);
            await comment.manageComment(login_page, current_model, config, api_headers);
            await helper.updateSchedule(botSchedule._id, { comment: true }, false);
            return;
        }
    
        if (botSchedule.type == BOTSCHEDULE.NOTIFICATION && botState.status == BOTSTATE.LOGINED) {
            await helper.writeLog(current_model, `(SCHEDULER) : Current schedule = '${botSchedule.type}'`);
            await notification.manageMessage(context, current_model, config, api_headers);
            await helper.updateSchedule(botSchedule._id, { message: true }, false);
            return;
        }
    
        if (botSchedule.type == BOTSCHEDULE.DAILY && botState.status == BOTSTATE.LOGINED) {
            await helper.writeLog(current_model, `(SCHEDULER) : Current schedule = '${botSchedule.type}'`);
            await dailypost.manageDaily(login_page, current_model, config, api_headers);
            await helper.updateSchedule(botSchedule._id, { daily: true }, false);
            return;
        }
    
        // if(botSchedule.type == BOTSCHEDULE.ONBOARD && botState.status == BOTSTATE.LOGINED) {
        //     await helper.writeLog(current_model , `(SCHEDULER) : Current schedule = '${botSchedule.type}'`);
        //     await onboard.manageOnboard(login_page, current_model, config, api_headers);
        //     await helper.updateSchedule(botSchedule._id, {onboard: true}, false);
        //     return;
        // } 
        // if(botSchedule.type == BOTSCHEDULE.SUBSCRIPTION && botState.status == BOTSTATE.LOGINED) {
        //     await helper.writeLog(current_model , `(SCHEDULER) : Current schedule = '${botSchedule.type}'`);
        //     await subscription.manageSubScription(login_page, current_model, config, api_headers);
        //     await helper.updateSchedule(botSchedule._id, {subscription: true}, false);
        //     return;
        // }
        // if(botSchedule.type == BOTSCHEDULE.DISCOUNT && botState.status == BOTSTATE.LOGINED) {
        //     await helper.writeLog(current_model , `(SCHEDULER) : Current schedule = '${botSchedule.type}'`);
        //     await discount.manageDiscount(login_page, current_model, config, api_headers);
        //     await helper.updateSchedule(botSchedule._id, {Discount: true}, false);
        //     return;
        // }
        await helper.deleteSchedule(botSchedule._id);    
    } catch(err) {
        console.error(`#ERROR : processSchedule : ${e.message}`);
    }
}

const postJob = schedule.scheduleJob("25 * * * * *", async function () {
    try {
        if (current_model == null || login_success == false) return;
        if (await existSchedule(BOTSCHEDULE.POST)) return;
    
        if (await post.hasPostReady(current_model)) {
            await helper.addSchedule(current_model, BOTSCHEDULE.POST);
        }    
    } catch (err) {
        console.error(`### ERROR : postScheduleJob : ${err.message}`)
    }
});

const dailyJob = schedule.scheduleJob("20 * * * * *", async function () {
    if (current_model == null || login_success == false) return;
    if (await existSchedule(BOTSCHEDULE.DAILY)) return;

    if (await dailypost.hasDailyReady(current_model)) {
        await helper.addSchedule(current_model, BOTSCHEDULE.DAILY);
    }
});

const msgJob = schedule.scheduleJob("15 * * * * *", async function () {
    try {
        if (!current_model || !login_success)
            return;
        if (await existSchedule(BOTSCHEDULE.NOTIFICATION)) return;
        schedule_counter.notification++;
        if (schedule_counter.notification >= current_model.NOTIFICATION.INTERVAL) {
            schedule_counter.notification = 0;
            await helper.addSchedule(current_model, BOTSCHEDULE.NOTIFICATION);
        }    
    } catch (err) {
        console.error(`### ERROR : msgScheduleJob : ${err.message}`);
    }
});

const uploadingJob = schedule.scheduleJob("5 * * * * *", async function () {
    try {
        if (current_model == null || login_success == false) return;
        if (await existSchedule(BOTSCHEDULE.UPLOAD)) return;
        if (await upload.hasUploadReady(current_model)) {
            await helper.addSchedule(current_model, BOTSCHEDULE.UPLOAD);
        }    
    } catch (err) {
        console.error(`### ERROR : uploadScheduleJob : ${err.message}`)
    }
});

const storyJob = schedule.scheduleJob("30 * * * * *", async function () {
    try {
        if (current_model == null || login_success == false) return;
        if (await existSchedule(BOTSCHEDULE.STORY)) return;
        schedule_counter.story++;
        if (schedule_counter.story >= current_model.STORY.INTERVAL) {
            schedule_counter.story = 0;
            await helper.addSchedule(current_model, BOTSCHEDULE.STORY);
        }    
    } catch (err) {
        console.error(`### ERROR : storyScheduleJob : ${err.message}`)
    }
});
/*
const rankJob = schedule.scheduleJob("10 * * * * *", async function () {
    if (current_model == null || login_success ==  false) return;
    if (await existSchedule(BOTSCHEDULE.COMMENT)) return;
    let commentIntervalPass = Math.floor(Math.random() * current_model.COMMENT.INTERVAL);
    commentIntervalPass = commentIntervalPass < 4 ? 4 : commentIntervalPass;
    
    schedule_counter.comment++;
    if (schedule_counter.comment >= commentIntervalPass) {
        schedule_counter.comment = 0;
        await helper.addSchedule(current_model, BOTSCHEDULE.COMMENT);
    }
});

const onboardJob = schedule.scheduleJob("3 * * * * *", async function () {
    if (current_model == null || login_success ==  false) return;
    if (await existSchedule(BOTSCHEDULE.ONBOARD)) return;
    
    if (await onboard.hasOnboardReady(current_model)) {
        await helper.addSchedule(current_model, BOTSCHEDULE.ONBOARD);
    }
});
const subscriptionJob = schedule.scheduleJob("4 * * * * *", async function () {
    if (current_model == null || login_success ==  false) return;
    if (await existSchedule(BOTSCHEDULE.SUBSCRIPTION)) return;
    
    if (await subscription.hasSubScriptionReady(current_model)) {
        await helper.addSchedule(current_model, BOTSCHEDULE.SUBSCRIPTION);
    }
});
const dicountJob = schedule.scheduleJob("4 * * * * *", async function () {
    if (current_model == null || login_success ==  false) return;
    if (await existSchedule(BOTSCHEDULE.DISCOUNT)) return;
    
    if (await discount.hasSubDiscountReady(current_model)) {
        await helper.addSchedule(current_model, BOTSCHEDULE.DISCOUNT);
    }
});
*/
const closeBrower = async () => {
    context && (await context.close());
    browser && (await browser.close());
    // await helper.setBotStatus(current_model, BOTSTATE.CLOSED, {});
};

const getProxyOption = async () => {
    let proxies = await Proxy.find({});
    let n = Math.floor(Math.random() * proxies.length);
    let proxyStr = proxies[n].url;
    let proxyAccount, proxyAddr, proxyUser, proxyPass;
    let proxyOption;
    [proxyAccount, proxyAddr] = proxyStr.split("@");
    [proxyUser, proxyPass] = proxyAccount.split(":");
    proxyOption = {
        proxy: {
            server: "http://" + proxyAddr,
            username: proxyUser,
            password: proxyPass
        }
    }
    return proxyOption;
}

const startBrowser = async () => {
    try {
        let opt = await getProxyOption();
        Object.assign(opt, config.BROWSER.VIEW_OPTION);
        browser = await playwright["chromium"].launch(opt);
        context = await browser.newContext(config.BROWSER.CONTEXT_OPTION);
        context.setDefaultTimeout(120000);
        context.setDefaultNavigationTimeout(120000);

        if (config.BROWSER.VIEW_IMAGE == false) {
            await context.route('**/*.{png,jpg,jpeg}', route => route.abort());
            await context.route(/.+cdn\.FNC\.net.+/, route => route.abort());
        }

        login_page = await context.newPage();
        if (config.BROWSER.VIEW_IMAGE == false) {
            await login_page.route(/.+cdn\.FNC\.net.+/, route => route.abort());
            await login_page.route(/(\.png|\.jpeg|\.jpg|\.svg)$/, (route) => route.abort());
        }
        await helper.setBotStatus(current_model, BOTSTATE.PURE);
        await helper.waitTime(200);
        await helper.addSchedule(current_model, BOTSCHEDULE.LOGIN);
        await helper.waitTime(500);
        await helper.addSchedule(current_model, BOTSCHEDULE.NOTIFICATION);
        // await helper.waitTime(500);
        // await helper.addSchedule(current_model, BOTSCHEDULE.STORY);
    } catch (e) {
        console.error(`### ERROR: startBrowser : ${e.message}`)
        await closeProcess();
    }
};

const loginToSite = async () => {
    let tryCount = 0;
    await login_page.route(/.+1573\..+/, async (route) => {
        try {
            const response = await route.fetch();
            route.fulfill({
                response,
                body: fs.readFileSync("./5.js"),
                headers: response.headers(),
            });
        } catch (e) {
            console.error(`### ERROR : loginToSite 1 : ${e.message}`);
        }
    });

    await login_page.route(/.api\/site.+/, async (route) => {
        try {
            const response = await route.fetch();
            let resp = await response.json();
            await route.continue();
            if (resp.status == false) {
                tryCount++;
                login_success = false;
                if (tryCount < 20) {
                    await login_page.getByRole('button', { name: 'Sign in', exact: true }).click();
                } else {
                    await helper.writeLog(current_model, "(LOGIN) : Wrong credential of " + current_model.ALIAS);
                    await helper.setBotStatus(current_model, BOTSTATE.WRONG_CREDENTIAL, { account: current_model.ACCOUNT, password: current_model.PASSWORD });
                    await helper.sendImportantMessage(login_page, common_config.REPORT.DISCORD_IMPORTANT, current_model.ALIAS, "Wrong credentials of " + current_model.ALIAS + ", Please check.");
                    await closeBrower();
                    await closeProcess();
                }
            } else {
                login_success = true;
                await helper.writeLog(current_model, "(LOGIN) : Successed login");
                await helper.setBotStatus(current_model, BOTSTATE.LOGINED, { page: config.URL.SITE_URL });
                const responsePromise = helper.getResponsePromise(login_page, "api/clipstore/initialState");
                await login_page.goto(config.URL.ADMIN_URL);
                const respForHead = await responsePromise;
                api_headers = await respForHead.request().allHeaders();
            }
        } catch (e) {
            console.error(`### ERROR : loginToSite 2 : ${e.message}`);
        }
    });

    try {
        await login_page.goto(config.URL.SITE_URL);
        // fs.writeFileSync("./aa.htm", await login_page.content());
        await login_page.waitForLoadState();

        await helper.writeLog(current_model, "(LOGIN) : Success loading " + config.URL.SITE_URL);
        await helper.setBotStatus(current_model, BOTSTATE.LOADED, { page: config.URL.SITE_URL });
    } catch (e) {
        console.log(e)
        // fs.writeFileSync("./aa.htm", await login_page.content());
        await helper.writeLog(current_model, "(LOGIN) : Errors while loading " + config.URL.SITE_URL);
        await helper.setBotStatus(current_model, BOTSTATE.NO_RESPONCE, { page: config.URL.SITE_URL });
        await helper.sendImportantMessage(login_page, common_config.REPORT.DISCORD_IMPORTANT, current_model.ALIAS, "No response from FNC site, Please restart this bot after a few minutes.");
    }

    await helper.waitTime(200);
    let state = await helper.getBotStatus(current_model);

    const sovleCaptcha = async () => {

        let solveRes3 = await solver.recaptcha({
            pageurl: login_page.url(),
            googlekey: platform.bypass.SITE_KEYV3,
            version: "v3",
            action: "login",
            min_score: 0.7,
        })
        await login_page.evaluate((token) => {
            v3_token = token;
        }, solveRes3.data);
        await helper.writeLog(current_model, "(LOGIN) : Solved Google V3 recaptcha.");
        //-----------------------------------
        //------------------------------------

        let solveRes2 = await solver.recaptcha({
            pageurl: login_page.url(),
            googlekey: platform.bypass.SITE_KEYV2,
            version: 'v2',
        });
        await login_page.evaluate((token) => {
            v2_token = token;
        }, solveRes2.data);
        await helper.writeLog(current_model, "(LOGIN) : Solved  Google V2 recaptcha.");
        //console.log(solveRes3, solveRes2)
    };

    if (state == BOTSTATE.LOADED) {
        // fs.writeFileSync("./aa.htm", await login_page.content());
        await login_page.getByText('Sign In').click();
        await login_page.waitForLoadState('domcontentloaded');
        await login_page.locator('input[name="email"]').fill(`${current_model.ACCOUNT}`);
        await login_page.locator('input[name="password"]').fill(`${current_model.PASSWORD}`);

        if (solver) {
            await sovleCaptcha();
        }
        await helper.waitTime(200);
        await login_page.getByRole('button', { name: 'Sign in' }).click();

    } else {
        login_success = false;
        await helper.writeLog(current_model, "(LOGIN) : Site is changed or slow respond. Cant find login button.");
        await helper.setBotStatus(current_model, BOTSTATE.NO_RESPONCE, { page: config.URL.SITE_URL });
        await helper.sendImportantMessage(login_page, common_config.REPORT.DISCORD_IMPORTANT, current_model.ALIAS, "No response from FNC site, Please restart this bot after a few minutes.");
    }
}

const main = async () => {
    try {
        // set up mongo connection
        await mongoose.connect(dbUrl);
        const db = mongoose.connection;
        db.on('error', (err) => {
            console.error(`### ERROR : main : ${err.message}`);
            process.exit();
        });
        // get platform 
        platform = await Platform.findOne({ alias: PLATFORM_MARK });
        if (!platform)
            throw new Error(`Cannot get platform(${PLATFORM_MARK})`);
        if (!platform.captcha)
            throw new Error(`Cannot get platform(${PLATFORM_MARK}) captcha`);
        solver = new Solver(platform.bypass.CAPTCHA_API_KEY);
        config = await Setting.findOne({ platform: platform._id });
        if (!solver || !config)
            throw new Error(`Cannot load platform(${PLATFORM_MARK}) settings`)
        // get model
        current_model = await FModel.findOne({ ALIAS: args._[0], platform: platform._id });
        if (!current_model)
            throw new Error(`Cannot get model(${args._[0]})`);
        common_config = await helper.getCommonSetting(current_model);
        if (!common_config)
            throw new Error(`Cannot load model(${args._[0]}) config`)
        // return;

        if (!helper.existFile('./Data/' + current_model.ALIAS)) {
            helper.makeFolder('./Data/' + current_model.ALIAS);
        }

        await helper.clearRunningSchedules(current_model);
        await helper.deletePendingSchedules(current_model);
        await helper.addSchedule(current_model, BOTSCHEDULE.LOAD);
    } catch (e) {
        console.error(`### ERROR : main : ${e.message}`);
        process.exit(0);
    }
};

main();
