module.exports = {
    URL: {
        SITE_URL: "https://fancentro.com",
		LOGIN_URL: "https://fancentro.com/login",
        ADMIN_URL: "https://fancentro.com/admin",
        STORY_URL: "https://fancentro.com/admin/stories",
        POST_URL: "https://fancentro.com/admin/feed",
        UPLOAD_URL: "https://fancentro.com/admin/uploads",
        EXPLORER_URL: "https://fancentro.com/discover",
        MSG_URL: "https://fancentro.com/admin/messages"
    },

    BROWSER: {
        VIEW_OPTION: { headless: false }, // fasle  => view gui, true => no gui
        CONTEXT_OPTION: { viewport: { width: 1200, height: 800 } },
    },

    BYPASS: {
        CAPTCHA_API_KEY: '43fd4b9f30bf5fb87af2b5ab1e6313d8',
        SITE_KEYV2: "6LeQ8NoaAAAAAPJUZuO7kQVadg5Du420nyZFadke",
        SITE_KEYV3: "6LfLzNkaAAAAAElQh7ILVaVUUjnuyQqcWoACqaIs",
    },
    VAULT: {
        PUBLIC_TAG: "AAA", // tag for publish image
        USE_FILTER_TAG_FOR_PUBLIC: true, // for adding images to story & post
    }

}