const path = require("path");
const helper = require("./helper");
const {PLATFORM_MARK, BOTSTATE,  BOTSCHEDULE} = require("./constant");

let daily_page = null;
let current_model = null;
let bot_config = null;
let daily_data = {};
let api_headers = {};

const fixUtc = (val) =>{
    let t =  val.toString();
    return t.substring(0, t.length-3);
}

const attachTag = async (postId, tag) =>{
    let param = {
        "postId": postId,
        "tag": tag
    }
    let url = "https://fancentro.com/admin/api/post.attachTag";
    let response = await daily_page.request.post(url, { headers: api_headers, params: param });
    // console.log(tag);
    // console.log(await response.json());
}

const getUtcFromDailyData = (item) =>{
    let t = helper.getDateArray();
    if(t[2] > item.date){
        t[1] += 1;
        if(t[1]>=12) t[1] -= 12;
    }
    t[2] = item.date;

    let nh,nm;

    [nh, nm] = item.time.split(":");
    t[3] = parseInt(nh);
    t[4] = parseInt(nm);
    return helper.makeUTC(t);
}

const updateOnePost = async (post) => {
    let url = "https://fancentro.com/admin/api/post.update";
    let param = { };
    param["title"] = post.title;
    param["body"] = post.desc;
    param["access"] = post.access;
    param["price"] = "";
    param["scheduledPublishDate"] = fixUtc(getUtcFromDailyData(post));
    param["expirationDate"] =  0;
    param['resourceVaultItems['+post.uuid+'][position]'] = 1;
    param['resourceVaultItems['+post.uuid+'][isPreview]'] = 0;
    param["productionDate"] = "";
    param["id"] = post.id.toString();
    param["contestOptIn"] = "";    
    await daily_page.request.post(url, { headers: api_headers, params: param });
}

const publishOnePost = async (post) => {
    let url = "https://fancentro.com/admin/api/post.publish";
    let param = {
        "id": post.id
    };
    
    let response = await daily_page.request.get(url, { headers: api_headers, params : param });
    //console.log("publish",  await response.json(),  await response.url())    
}

const makeOnePostReal = async (post) => {
    let param = {
        "title": post.title,
        "body": post.desc,
        "access": 1,
        "price": post.price,
        "scheduledPublishDate": 0,
        "expirationDate": 0,
        "productionDate": "",
        "id": "",
        "contestOptIn": ""
    }
    
    let url = "https://fancentro.com/admin/api/post.create";
    
    api_headers.accept = "*/*";
    let response = await daily_page.request.post(url, { headers: api_headers, params: param });
    let respJson = await response.json();
    post.id = respJson.response.id;
    //daily_data.data.items.push(post);
    //console.log("create", respJson)   
    post.access = 1;
    if(post.mode != "free"){
        post.access = 2;
        if(post.mode == "paid") {
            post.access = 4;
        }
    }
    await updateOnePost(post);
    
    let tags = post.tags.toLowerCase();
    tags = tags.replaceAll("#", "");
    let tag_array =  tags.split(' ');
    
    for(let i = 0 ; i < tag_array.length ; i++) {
        await attachTag(post.id, tag_array[i]);
    }
    await publishOnePost(post);
    await helper.writeLog(current_model, "(DailyPost) : Created a post has title = " + post.title);
    await helper.waitTime(100);
}

const setTagToVault = async (uuid) =>{
    let opt = `{"data":{"type":"vaultResourceTags","attributes":{"resourceTagId":"84157","vaultId":"${uuid}"}}}`;
    let url = "https://fancentro.com/admin/lapi/vaultResourceTags";
    api_headers["content-type"] = "application/vnd.api+json";
    api_headers.accept = "application/vnd.api+json";
    let response = await daily_page.request.post(url, {headers : api_headers, data: opt});
}

const imageUploadToLibrary = async () =>{
    let dailyData = daily_data.data;
    try{
        let folder = await helper.getDailyFolder(current_model);
        for(let i = dailyData.items.length - 1 ;  i >=0 ; i--) {
            let dailyItem = dailyData.items[i];
            if(dailyItem.uploaded == false) {
                const responsePromisePure = helper.getResponsePromise(daily_page, "admin/lapi/vaultItems" , 201 , "POST");
                const responsePromise = helper.getResponsePromise(daily_page, "include=storageResource");
                await daily_page.locator("#upload-file").setInputFiles(path.join(folder, dailyItem.file));
                const resp = await responsePromisePure;
                let vault = await resp.json();
                const resp2 = await responsePromise;
                api_headers = await resp2.request().allHeaders();
                let storage = await resp2.json();
                
                await daily_page.locator("//span[contains(@class, 'fc-member-a20_038')]").waitFor({timeout:0});
                await helper.waitTime(500);
                //console.log(storage)
                dailyItem.uuid = vault.data.id;
                dailyItem.storageId = storage.data.relationships.storageResource.data.id;
                dailyItem.uploaded =  true;
                dailyData.items[i] = dailyItem;
                await helper.writeLog(current_model , `(DailyPost) : ${dailyItem.file} is uploaded`);
                
                await setTagToVault(vault.data.id);
                await helper.waitTime(300);
            }
        }
       }catch(e){
        console.log(e)
        await helper.writeLog(current_model , "(DailyPost) : Errors while Uploading " + bot_config.URL.UPLOAD_URL);
        await helper.setBotStatus(current_model, BOTSTATE.NO_RESPONCE, {page: bot_config.URL.UPLOAD_URL});
    }
    daily_data.data = dailyData;
};

const hasDailyReady = async (model) => { 
    daily_data =  await helper.getScheduleData(model, BOTSCHEDULE.DAILY);
    if(daily_data == null || daily_data.data == null){
        return false;
    }
    let folder = await helper.getDailyFolder(model);

    if(daily_data.data.uploaded!= undefined && daily_data.data.uploaded == false) {
        for(let i = 0; i < daily_data.data.items.length ; i++) {
            if(!helper.adjustCorrectFile(folder, daily_data.data.items[i].file)){
                await helper.writeLog(model , `(DailyPost) : ${daily_data.data.items[i].file} is not exist for uploading of daily posting`);
                return false;
            }
        }
        if(daily_data.data.items.length > 0) 
            return true;
        else
            return false;
    }

    return false;
}

const makeDailyPosts = async () => {
    for(let i = 0 ; i < daily_data.data.items.length ; i++) {
        if(daily_data.data.items[i].post == false&&daily_data.data.items[i].uploaded == true) {
            try{
                await makeOnePostReal(daily_data.data.items[i]);
                daily_data.data.items[i].post = true;
            }catch(e){
                console.log(e);
                await helper.setBotStatus(current_model, BOTSTATE.NO_RESPONCE, {page: bot_config.URL.POST_URL});            
            }
        }
    }
}

const manageDaily = async (page ,  model , config, apiHeader) => {
    current_model = model;
    daily_page = page;
    bot_config = config;
    api_headers =  apiHeader;
    daily_data =  await helper.getScheduleData(model, BOTSCHEDULE.DAILY);
    
    if(daily_data.data.uploaded == false) {
        try{
            if(daily_page.url() != bot_config.URL.UPLOAD_URL) {
                //const responsePromisePure = helper.getResponsePromise(daily_page, "admin/lapi/vaultItems");
                await daily_page.locator("#uploads").click();
                //await responsePromisePure;
                await helper.waitTime(5000);
            }
            await helper.writeLog(model , "(DailyPost) : Begin uploading for daily posting");
            await imageUploadToLibrary();
            await helper.writeLog(model , "(DailyPost) : End uploading for daily posting");
            daily_data.data.uploaded = true;
            for(let i = 0; i < daily_data.data.items.length ; i++) {
                if(daily_data.data.items[i].uploaded == false)
                daily_data.data.uploaded = false;
            }
            await helper.setScheduleData(model, BOTSCHEDULE.DAILY, daily_data.data);
        }catch(e){
            console.log(e);
        }
    }
    if(daily_data.data.uploaded == true){
        try{
            const responsePromisePure = helper.getResponsePromise(daily_page, "post.get");
            daily_page.locator("#feed").click();
            const response = await responsePromisePure;
            await helper.writeLog(model , "(DailyPost) : Begin daily posting");
            await makeDailyPosts();
            await helper.writeLog(model , "(DailyPost) : End daily posting");
            await helper.setScheduleData(model, BOTSCHEDULE.DAILY, daily_data.data);
        }catch(e){
            console.log(e);
        }  
    }
   
}

module.exports = {
    manageDaily,
    hasDailyReady
}