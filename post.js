const helper = require("./helper");
const { PLATFORM_MARK, BOTSTATE, BOTSCHEDULE } = require("./constant");

let post_page = null;
let post_data = null;
let upload_data = null;
let bot_config = null;
let current_model = null;
let api_headers = {};

const fixUtc = (val) => {
    let t = val.toString();
    return t.substring(0, t.length - 3);
}

const attachTag = async (postId, tag) => {
    let param = {
        "postId": postId,
        "tag": tag
    }
    let url = "https://fancentro.com/admin/api/post.attachTag";
    let response = await post_page.request.post(url, { headers: api_headers, params: param });
    // console.log(tag);
    // console.log(await response.json());
}

const updateOnePost = async (post) => {
    let url = "https://fancentro.com/admin/api/post.update";
    let param = {};
    param["title"] = post.title;
    param["body"] = post.desc;
    param["access"] = "1";
    param["price"] = "";
    param["scheduledPublishDate"] = fixUtc(post.scheduledPublishDate);
    param["expirationDate"] = fixUtc(post.expirationDate);
    param['resourceVaultItems[' + post.vaultId + '][position]'] = 1;
    param['resourceVaultItems[' + post.vaultId + '][isPreview]'] = 0;
    param["productionDate"] = "";
    param["id"] = post.id.toString();
    param["contestOptIn"] = "";
    //console.log(param);
    await post_page.request.post(url, { headers: api_headers, params: param });
    //console.log("update", await response.json())
}

const publishOnePost = async (post) => {
    let url = "https://fancentro.com/admin/api/post.publish";
    let param = {
        "id": post.id
    };

    let response = await post_page.request.get(url, { headers: api_headers, params: param });
    //console.log("publish",  await response.json(),  await response.url())    
}

const makeOnePost = async (post) => {
    try {
        let param = {
            "title": post.title,
            "body": post.desc,
            "access": 1,
            "price": "",
            "scheduledPublishDate": 0,
            "expirationDate": 0,
            "productionDate": "",
            "id": "",
            "contestOptIn": ""
        }
        let url = "https://fancentro.com/admin/api/post.create";
        if (api_headers)
            api_headers.accept = "*/*";
        let response = await post_page.request.post(url, { headers: api_headers, params: param });
        let respJson = await response.json();
        post.id = respJson.response.id;
        post_data.data.items.push(post);
        await helper.waitTime(100);
        await updateOnePost(post);

        let tags = post.tags.toLowerCase();
        tags = tags.replaceAll("#", "");
        let tag_array = tags.split(' ');

        for (let i = 0; i < tag_array.length; i++) {
            await helper.waitTime(100);
            await attachTag(post.id, tag_array[i]);
        }
        await helper.waitTime(100);
        await publishOnePost(post);
        var date = new Date();
        date.setTime(post.scheduledPublishDate);
        await helper.writeLog(current_model, `(POST) : Create a post(${date} : ${post.title.substring(0, 10)})`);
        await helper.waitTime(100);
    } catch (err) {
        console.error(`### ERROR : makeOnePost : ${err.message}`);
        throw err;
    }
}

const makePosts = async () => {
    let count = 0;
    try {
        const now_utc = Date.now();
        let sUTC = now_utc;
        let eUTC = 0;
        for (var item of upload_data.data.items) {
            if (item.uploaded) {
                sUTC = sUTC + current_model.POST.INTERVAL * 60 * 1000;
                eUTC = sUTC + current_model.POST.DURATION * 60 * 1000
                let post = {
                    id: "",
                    vaultId: item.uuid,
                    title: item.title,
                    desc: item.description,
                    tags: item.tags,
                    scheduledPublishDate: sUTC,
                    expirationDate: eUTC
                };
                await makeOnePost(post);
                count++;
            }
        }
        post_data.data.lastTime = eUTC;
        return count;
    } catch (err) {
        console.error(`### ERROR : makePost : ${err.message}`);
        throw err
    }
}

const hasPostReady = async (model) => {
    try {
        upload_data = await helper.getScheduleData(model, BOTSCHEDULE.UPLOAD);
        if (!upload_data || !upload_data.data || !upload_data.data.uploaded) {
            // await helper.writeLog(model, `(POST) : No uploaded data.`, false)
            return false;
        }
        post_data = await helper.getScheduleData(model, BOTSCHEDULE.POST);
        if (!post_data || !post_data.data || !post_data.data.lastTime) {
            return true;
        }
        const now_date = new Date();
        const now_utc = now_date.getTime();
        const diff = now_utc - post_data.data.lastTime;
        //console.log(diff, now_utc, post_data.data.lastTime,  model.POST.INTERVAL , upload_data.data.items.length , 60 * 1000 - 3600 * 1000);
        //const post_interval = model.POST.INTERVAL * upload_data.data.items.length * 60 * 1000 - 3600 * 1000;    
        // if (diff > post_interval) return true;
        if (diff > 3600 * 1000) return true;
        // await helper.writeLog(model, `(POST) : Uploading interval not expired.`, false)        
        return false;
    } catch (err) {
        console.error(`### ERROR : hasPostReady : ${err.message}`)
        return false;
    }
}

const managePost = async (page, model, config, apiHeader) => {
    try {
        current_model = model;
        post_page = page;
        bot_config = config;
        api_headers = apiHeader;
        // get upload, post shedule data
        post_data = await helper.getScheduleData(model, BOTSCHEDULE.POST);
        upload_data = await helper.getScheduleData(model, BOTSCHEDULE.UPLOAD);
        // if no post data, create one
        if (!post_data)
            post_data = { data: { lastTime: 0, items: [] } };
        if (post_page.url() != bot_config.URL.POST_URL) {
            await post_page.goto(bot_config.URL.POST_URL);
            const responsePromisePure = helper.getResponsePromise(post_page, "post.get");
            await post_page.locator("#feed").click();
            const response = await responsePromisePure;
            await helper.waitTime(5000);
            api_headers = await response.request().allHeaders();
            if (api_headers)
                api_headers.referer = 'https://fancentro.com/admin/post/new';
            await helper.writeLog(model, "(POST) : Begin posting ");
            const postCount = await makePosts();
            await helper.writeLog(model, `(POST) : Post ${postCount} items`);
            await helper.setScheduleData(model, BOTSCHEDULE.POST, post_data.data);
            await helper.writeLog(model, "(POST) : End posting ");
        }
    } catch (err) {
        console.error(`### ERROR : managePost : ${err.message}`);
        console.error(err);
        // let common_config = await helper.getCommonSetting(current_model);
        // await helper.sendImportantMessage(post_page, common_config.REPORT.DISCORD_IMPORTANT, current_model.ALIAS, "Popup dialog maybe shown in fnc of " + current_model.ALIAS);
        // await helper.setBotStatus(current_model, BOTSTATE.POPUP, { page: config.URL.SITE_URL });
    }
}

module.exports = {
    managePost,
    hasPostReady
}