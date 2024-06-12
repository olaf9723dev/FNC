const BOTSTATE = {
	CLOSED: "Closed",
    PURE: "Pure",
    LOADED: "Loaded",
    CHANGED: "Changed",
	LOGINED: "Logined",
	CRASHED: "Crashed",
	WRONG_CREDENTIAL: "Wrong credential",
	NO_RESPONCE: "Site is not respond",
	POPUP: "Found Popup"
};


const BOTSCHEDULE = {
	CLOSE: "Close",
	LOAD: "Load",
    LOGIN: "Login",
    UPLOAD: "Upload",
	POST: "Post",
	NOTIFICATION: "Notification",
	COMMENT: "Comment",
	FOLLOW: "Follow",
	DAILY: "Daily",
	ONBOARD: "Onboard",
	SUBSCRIPTION: "Subscription",
	DISCOUNT: "Discount",
	STORY: "Story"
};

const PLATFORM_MARK = "FNC";

module.exports =  {
  PLATFORM_MARK,
  BOTSTATE,
  BOTSCHEDULE
}