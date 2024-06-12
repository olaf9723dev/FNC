
const helper = require("./helper");
const {BOTSTATE,  BOTSCHEDULE} = require("./constant");

let comment_page = null;
let current_model = null;
let state = null;

let bot_config = null;
let comment_list = [];
let api_headers = {};
let common_config ={};
let team_length = 0;

const compactState = () => {
    let cList = state.data.comments;
    let fList = state.data.follows;
    if(state.data.comments.length > 100){
        cList = state.data.comments.slice(state.data.comments.length-100);
    }
    if(state.data.follows.length > 100){
        fList = state.data.follows.slice(state.data.follows.length-100);
    }
    state.data.comments = cList;
    state.data.follows =  fList;
}

const checkAlreadyComment = (post) => {
    for(let i = 0; i < state.data.comments.length ; i++){
        if(state.data.comments[i].uuid == post.id) {
            return true;
        }
    }
    return false;
}

const checkAlreadyLike = (post) => {
    for(let i = 0; i < state.data.follows.length ; i++){
        if(state.data.follows[i].uuid == post.id) {
            return true;
        }
    }
    return false;
}

const checkDecide = () =>{
    let n = Math.floor(Math.random() * team_length);
    if(n < common_config.COMMENT.MAX_COMMENTS_PER_POST){
        return true
    }
    return false;
}

const makeCommentForPost = async (post) => {
    if(checkAlreadyComment(post)){       
        return;
    }
    
    if(post.creator == current_model.ALIAS) {
        return;
    }
    
    if(await helper.isTeamMember(post.creator,  current_model.platform)) {
        // Team
        if(common_config.COMMENT.ENABLE_FOLLOW_TEAM && checkAlreadyLike(post) == false) {
            await followPost(post);
        }
        if(common_config.COMMENT.ENABLE_COMMENT_TEAM) {
            await commentPost(post);
        }
        return;
    }   
    
    let isInBlackList = await helper.isBlackListMember(current_model.platform, current_model.ALIAS);
    
    if(isInBlackList && common_config.COMMENT.ENABLE_COMMENT_BLACKLIST) {
        await commentPost(post);
    }
    
    if(!isInBlackList && common_config.COMMENT.ENABLE_COMMENT_WHITEIST) {
        await commentPost(post);
    }
}

const followPost = async (post) => {
    //console.log(post)
    try{
        let url =  "https://fancentro.com/api/post.like";
        let resp = await comment_page.request.post(url, {headers : api_headers, params :{postId: post.id}});
        await helper.writeLog(current_model , "(COMMENT) : Successed to follow for " + post.creator + " post id = " + post.id);
        state.data.follows.push({uuid: post.id, creator: post.creator});
        //console.log(await resp.json())
    }catch(e){
        await helper.writeLog(current_model , "(COMMENT) : Failed to follow for " + post.creator + " post id = " + post.id);
    }
}

const commentPost = async (post) => {
    //console.log(post)
    let txt = takeCommentContent();
    try{
        let url =  "https://fancentro.com/api/postComment.add";
        if(checkDecide()) {
            let resp = await api_request_context.post(url, {headers : api_headers, params:{comment: txt, parentId: 0, postId: post.id}});
            await helper.writeLog(current_model , "(COMMENT) : Successed to comment for " + post.creator + " post id = " + post.id + " content = " + txt);
            //console.log(await resp.json())
        }
        state.data.comments.push({uuid: post.id, creator: post.creator, content: txt});
    }catch(e){
        await helper.writeLog(current_model , "(COMMENT) : Failed to comment for " + post.creator + " post id = " + post.id + " content = " + txt);
    }
}

const collectPosts = (json_data) => {
    let ret = [];
    let posts = [];
    for(let i = 0 ; i < json_data.included.length ; i++){
        let item = json_data.included[i];
        if(item.type == "posts"){
            ret.push({"id": item.id, creator: item.relationships.profile.data.id});
        }
    }
    for(let i = 0 ; i < ret.length ; i++){
        let item = ret[i];
        for(let j = 0 ; j < json_data.included.length ; j++){
            let item2 = json_data.included[j];
            if(item2.type == "profiles" && item2.id == item.creator){
                posts.push({"id": item.id, creator: item2.attributes.alias});
            }
        }
    }
    return posts;
}

const browseExplorer = async () => {
    let posts = [];
    try{
        let response = await comment_page.request.get(bot_config.URL.API_URL, {headers : api_headers});
        let post_json = await response.json();
        posts = posts.concat(collectPosts(post_json));
        //console.log(posts);
        for(let i = 0; i < posts.length ; i++) {
            await makeCommentForPost(posts[i]);
        }
    } catch (e){
    
    }
}

const takeCommentContent = () =>{
    let n = Math.floor(Math.random() * comment_list.length);
    return comment_list[n].word;
}

const manageComment = async (page, model, config, apiHeader) => {
    current_model = model;
    comment_page = page;
    api_headers = apiHeader;
    bot_config = config;
    common_config = await helper.getCommonSetting(current_model);
    comment_list = await helper.getCommentList();
    team_length = await helper.getTeamCount(current_model.platform);
    state =  await helper.getScheduleData(current_model, BOTSCHEDULE.COMMENT);
    
    if(state == null){
        state = {};
        state.data = {
            comments:[],
            follows: []
        }
    }
    //console.log(state.data)
    if(comment_page){
       await helper.writeLog(model , "(COMMENT) : Begin commenting & following");
       await browseExplorer();
       await helper.writeLog(model , "(COMMENT) : End commenting & following");
       compactState();
       await helper.setScheduleData(current_model, BOTSCHEDULE.COMMENT, state.data);
    }
}

module.exports = {
    manageComment
}