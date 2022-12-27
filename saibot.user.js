// ==UserScript==
// @name         Moe! Ninja Saibot
// @author       x5c0d3
// @version      3.0.0
// @description  Enhancements for Moe! Ninja Girls
// @namespace    http://tampermonkey.net/
// @downloadURL
// @updateURL
// @match        https://def.shall-we-date.com/*
// @match        https://apps.facebook.com/moeninja/*
// @grant        unsafeWindow
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_getResourceText
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @connect      shall-we-date.com
// @run-at       document-start
// @require      https://ajax.googleapis.com/ajax/libs/jquery/1/jquery.js
// @resource     animateCSS https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css
// @resource     myroomCSS https://cdn.shall-we-date.com/pdt/def/DEF/min/css/myroom_01.css
// @resource     albumLinks https://pastebin.com/raw/tjB2GZuA?_v=20200419
// @resource     chapterList https://pastebin.com/raw/MpxvdbqZ?_v=20200419
// @resource     ccList https://pastebin.com/raw/aazBiCx4?_v=20200419
// ==/UserScript==

// load the external CSSes
let cssNames = ["animateCSS"];
cssNames.forEach(function (_name) {
    // Check switch for animations
    if ("animateCSS" !== _name || GM_getValue("animations", true)) {
        GM_addStyle(GM_getResourceText(_name));
    }
});

GM_addStyle(".modal_box:after{position:absolute;width:100%;height:100%;z-index:0;background:url(/img/mypage/bg_login_bonus_modal.png) 0 50% no-repeat;background-size:cover}");
// Styles that are needed inside the story
GM_addStyle(".target.chara_l_p12{background:url(https://cdn.shall-we-date.com/pdt/def/DEF/var/img/story/icon_meter_l_chara12.png) no-repeat;background-size:100% auto}ul.list_boxList>li>div.targets{left:-12%;top:-30%}article.overflow{overflow-x:visible!important;overflow-y:visible!important}");

if (window.location.pathname.match(/gift$/)) {
    let _myroomCSS = GM_getResourceText("myroomCSS");
    GM_addStyle(_myroomCSS);
}

unsafeWindow.saibot = (function (XMLHttpRequest, jQuery) {
    "use strict";

    // Constants
    const HEADERS = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.109 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
        "Accept-Encoding": "gzip, deflate",
        "Accept-Language": "en-US;q=0.8,en;q=0.7"
    };
    const MUTATIONOBSERVERCONFIG = {
        attributes: true,
        childList: true,
        subtree: true
    };
    const GAMELINKSCONFIG = {
        ninjafight: "minigame",
        customize: "room",
        nineyGacha: "gacha/top/3",
        story: "story/main",
        home: "mypage"
    };
    const GIRLS = {
        p0: {
            name: "Okay",
            style: false
        },
        p1: {
            name: "Akari",
            style: "chara_l_11103"
        },
        p2: {
            name: "Enju",
            style: "chara_l_11100"
        },
        p3: {
            name: "Ricka",
            style: "chara_l_11109"
        },
        p4: {
            name: "Myu",
            style: "chara_l_11108"
        },
        p5: {
            name: "Tengge",
            style: "chara_l_11115"
        },
        p6: {
            name: "Yamabuki",
            style: "chara_l_11102"
        },
        p7: {
            name: "Lily",
            style: "chara_l_11101"
        },
        p8: {
            name: "Cy",
            style: false
        },
        p9: {
            name: "Nanao",
            style: "chara_l_11110"
        },
        p10: {
            name: "Kikuko",
            style: false
        },
        p11: {
            name: "Hotaru",
            style: "chara_l_11225"
        },
        p12: {
            name: "YTG8",
            style: "chara_l_p12"
        },
        p13: {
            name: "True Ending",
            style: false
        },
        p14: {
            name: "Happy Ending",
            style: false
        }
    };
    const SETTINGSCONFIG = {
        setting: [
            {
                desc: "Saibot active",
                name: "saibotActive"
            },
            {
                desc: "Base game functions",
                name: "gameFunctions"
            },
            {
                desc: "Show unread indicators",
                name: "unreadIndicator"
            },
            {
                desc: "Show FB indicators",
                name: "fbIndicator"
            },
            {
                desc: "Animations",
                name: "animations"
            },
            {
                desc: "Story",
                name: "story"
            },
            {
                desc: "Heart Troops",
                name: "heartTroops"
            },
            {
                desc: "Album",
                name: "fillAlbum"
            }
        ]
    };
    const ALBUMFORCED = [
        "ev0210",
        "ev0211",
        "ev0503",
        "ev0504"
    ];
    const GAMEPICURLBASE = "https://cdn.shall-we-date.com/pdt/def/DEF/var/img/";
    const ALBUMPICTUREURL = GAMEPICURLBASE + "still/private/{{pictureId}}.jpg?hash={{hash}}";
    const IMGURURL = "https://i.imgur.com/{{pictureId}}.jpg";
    const BACKGROUNDURL = GAMEPICURLBASE + "anim/bg_{{pictureId}}.png?hash={{hash}}";
    const HEARTSREQUESTURLS = {
        accept: "facebook/api/accept/{{id}}",
        send: "facebook/api/ask/reply/{{id}}"
    };
    const GIFTSREQUESSTURL = "gift/api/receive";

    let choicesData = {};
    let inventoryData = {
        favoritAvatarIds: [],
        totalElementPoints: 0,
        totalNiney: 0
    };
    let ccList = [];
    let albumLinks = {};
    let chapterList = {};
    let $solmare = {};
    let hogan = {};
    let $ = {};
    let _observer = {};
    // For the Ticketcounter
    let _timerDiv = {};
    let _timerLi = {};
    let _timerTimeout = null;
    let lastHeartsCount = 0;
    let _giftsParsed = false;
    let _NCGiftCount = 0;
    let _itemHistoryParsed = false;
    let urlParser = {
        encode: function (str) {
            return encodeURI(str);
        },
        decode: function (str) {
            return decodeURI(str);
        },
        clean: function (str = "", noQuery = true) {
            let urlparts = str.split("?");

            if (urlparts.length >= 2) {

                // Only the URL without the query?
                if (noQuery) {
                    return urlparts[0];
                }

                let pars = urlparts[1].split(/[&;]/g);

                //reverse iteration as may be destructive
                pars.forEach(function (_idx) {
                    if (pars[_idx] && pars[_idx].lastIndexOf("_v=", 0) !== -1) {
                        pars.splice(i, 1);
                    }
                });
                return urlparts[0] + (pars.length > 0 ? "?" + pars.join("&") : "");
            }
            return str;
        }
    };
    const dataParser = {
        dataToObject: function (str) {
            try {
                return JSON.parse(str);
            } catch (e) {
                return {};
            }
        },
        objectToData: function (obj, _format = false) {
            try {
                if (_format) {
                    return JSON.stringify(obj, null, 2);
                } else {
                    return JSON.stringify(obj);
                }
            } catch (e) {
                return "";
            }
        },
        objectToArray: function (obj) {
            return Object.keys(obj).map(function (key) {
                return [obj[key]];
            });
        },
        objectHasKey: function (obj, keyStr) {
            return keyStr.split(".").every(function (x) {
                if ((("object" !== typeof obj) && ("function" !== typeof obj)) || (obj === null) || !(x in obj)) {
                    return false;
                }

                obj = obj[x];
                return true;
            });
        },
        objectGetKey: function (obj, keyStr) {
            return keyStr.split(".").reduce(function (o, x) {
                return (typeof o == "undefined" || o === null) ? o : o[x];
            }, obj);
        },
        objectSize: function (obj) {
            if ("object" !== typeof obj) {
                return 0;
            }
            return Object.keys(obj).length;
        },
        // Merge all objects together
        objectMerge: function (..._args) {
            return _args.reduce(
                function (a, b) {
                    return Object.assign(a, b);
                }
            );
        },
        inflateLinks: function (_collection) {
            Object.entries(_collection).forEach(function (_key) {
                _collection[_key[0]] = GAMEPICURLBASE + _key[1];
            });

            return _collection;
        },
        prepareAlbumData: function () {
            let _albumLink = solmare.getPageUrl("album/api/get", "albumUrl");
            // Let's get the album page asynchronously
            GM_xmlhttpRequest({
                method: "GET",
                url: _albumLink,
                headers: HEADERS,
                onload: function (_response) {
                    // Page loaded, let's parse it
                    let _albumObject = dataParser.dataToObject(_response.responseText);
                    let _albumData = _albumObject.data.albumData;

                    // We got the data. Let's iterate through it
                    Object.keys(_albumData).forEach(function (_key) {
                        let _still = _albumData[_key].still;
                        let _story = _albumData[_key].story.story_main;

                        // Ignore the EXTRA and Epilogue section
                        if ("80" !== _key && "121" !== _key) {
                            let _chaptersData = dataParser.getChapterPartsData(_key);
                            if (!dataParser.objectToArray(_chaptersData).length) {
                                // The season was not found
                                return true;
                            }
                            let _premiumData = _story[0].premium;
                            let _endings = _story[0].ending;
                            // Empty the old premium data
                            _albumData[_key].story.story_main[0].premium = [];

                            // Iterate through the premium chapters
                            _premiumData.forEach(function (_val, _idx) {
                                let _chIndex = parseInt(_val[0].chapter_id.substr(-2)) - 1;
                                _chaptersData[_chIndex].part.push(_val[0].part[0]);
                            });
                            _albumData[_key].story.story_main[0].ending = [..._chaptersData, ..._endings];
                        }

                        ["still_event", "still_game", "still_main"].forEach(function (_stillType) {
                            if ("undefined" === typeof _still[_stillType]) {
                                return true;
                            }
                            _still[_stillType].forEach(function (_stillValue, _stillKey) {
                                if ("undefined" === typeof _stillKey) {
                                    return true;
                                }
                                if (!_stillValue.is_have || -1 !== ALBUMFORCED.indexOf(_stillValue.image_id)) {
                                    // Found a picture that needs fixing
                                    let _pictureLink = dataParser.getAlbumLink(_stillValue.image_id);

                                    // Now change the data if we found it in the database
                                    if (_pictureLink) {
                                        Object.assign(_albumData[_key].still[_stillType][_stillKey], {
                                            is_have: true,
                                            thumbnail: _pictureLink,
                                            url: _pictureLink
                                        });
                                    }
                                }
                            });
                        });
                    });
                    let _albumDataString = dataParser.objectToData(_albumData);
                    GM_setValue("albumData", _albumDataString);
                }
            });
        },
        getChoicesData: function () {
            // Grab the story from the content
            let _story = $("#content").data("script");
            let _opponentData = {};
            _story = _story.storyData;

            // Iterate through all steps to see if there is a choice
            _story.forEach(function (element) {
                if (dataParser.objectGetKey(element, "choice")) {
                    // Hit
                    let _choicesData = element.choice.items;
                    let _choices = [];
                    let _text = "";
                    // Now iterate through the possible choices
                    _choicesData.forEach(function (element) {
                        let _lickeabilityObj = dataParser.dataToObject(element.likability);
                        // Standard is "Okay"
                        let _girl = GIRLS.p0.name;
                        let _style = false;
                        // Do we have 2 girls where the intimacy goes up or even none (Route ending)?
                        if (1 === dataParser.objectSize(_lickeabilityObj) && "" !== element.likability) {
                            // One girl
                            let _girlKey = Object.keys(_lickeabilityObj)[0];
                            _girl = GIRLS[_girlKey].name;
                            _style = GIRLS[_girlKey].style;
                        }
                        _text = element.text;

                        // Push the data into the Choices Array
                        _choices.push({
                            girl: _girl,
                            text: _text,
                            style: _style
                        });
                    });
                    _opponentData.choices = _choices;
                }
            });
            return _opponentData;
        },
        getChapterData: function () {
            // Grab the chapter data from the content
            let _partMetaData = $("#partMetaData").data("script");
            let _chapterData = {};

            // Album picture default is false
            _chapterData.album = false;

            // Take the title and work with it
            let _titleParts = _partMetaData
                .title
                // Split it
                .split("-");
            // Make sure that there are only three parts
            let _season;
            let _chapter;
            let _part;
            if (3 < _titleParts.length) {
                _part = _titleParts.pop().trim();
                _chapter = _titleParts.pop().trim();
                _season = _titleParts.join("-");
            } else {
                _part = _titleParts.pop().trim();
                _chapter = _titleParts.pop().trim();
                _season = _titleParts.pop().trim();
            }


            // Sometimes in event stories the chapter and part have almost the same text
            let _chapLen = _chapter.length;
            if (_chapter === _part.substr(0, _chapLen)) {
                _part = _part.substring(_chapLen + 1);
            }

            // To see if there are album pictures inside the chapter
            // we need to check the story data
            let _story = $("#content").data("script");
            let _sceneId = $("#sceneId").data("script");
            let _pictures = Object.keys(_story.resourceData.scene_bg_image_data);

            _pictures.forEach(function (_picKey) {
                if ("ev" === _picKey.substr(0, 2)) {
                    // Found an Event picture!
                    _chapterData.album = true;
                }
            });


            return dataParser.objectMerge(_chapterData, {
                season: _season,
                chapter: _chapter,
                partMeta: _partMetaData,
                part: _part,
                story: dataParser.objectToData(_story),
                sceneId: _sceneId
            });

        },
        // Grab the information about the endings from the album data
        getEndingsData: function () {
            // A small trick to grab the id out of the class attribute because the Icon has the ID at the end
            let _storyId = $("span.sys-album-modal-title-mini-name").first().attr("class").match(/\d+$/)[0];
            // We dont go down to the endings because the Extra section has no endings
            let _story = $("#album-data-content").data("album")[_storyId].story.story_main;
            let _endings = [];

            // Are we outside the Extra section?
            if (1 === _story.length) {
                // Lets get the data we need
                _story[0].ending.forEach(function (_ending) {
                    let _name = _ending.chapter_name.match(/^[a-z\s]+/i)[0];
                    let _parts = _ending.part.length;

                    // Push it into the array
                    _endings.push({
                        name: _name,
                        parts: _parts
                    });
                });
            }
            return _endings;
        },
        getInventoryData: function (_callback) {
            let _customizeLink = solmare.getPageUrl("room", "customize");

            // We need to load the customize page for the selling confirmation
            GM_xmlhttpRequest({
                method: "GET",
                url: _customizeLink,
                headers: HEADERS,
                onload: function (_response) {
                    // Got the page, now lets grab and parse the needed data
                    let _roomDataObj = $("#room-data-content", _response.responseText);
                    let _inventoryDataObj = _roomDataObj.data("meta").avatars;
                    let _favoriteDataObj = dataParser.objectToArray(_roomDataObj.data("favorite"));
                    let _tmp = [];
                    // First put all favorite avatar ids into an array
                    _favoriteDataObj.forEach(function (_favorite) {
                        dbg.info(_favorite[0].avatar);
                        _tmp = _tmp.concat(_favorite[0].avatar);
                    });
                    // Now make it unique
                    inventoryData.favoritAvatarIds = [...new Set(_tmp)];

                    //
                    Object.values(_inventoryDataObj).forEach(function (_itemType) {
                        // We have to dive deeper
                        Object.values(_itemType).forEach(function (_item) {
                            // Ignore items we cannot sell - actually it's just the hexagon
                            if (!_item.canSell) {
                                return;
                            }
                            // Now let's get the data we need and save it
                            _item.price = parseInt(_item.price);
                            inventoryData.totalElementPoints += _item.charmLv;
                            inventoryData.totalNiney += _item.price;

                            inventoryData[_item.objectId] = {
                                personAvatarId: _item.personAvatarId,
                                price: _item.price,
                                charmLv: _item.charmLv,
                                name: _item.name,
                                isEquip: _item.isEquip
                            };
                        });
                    });
                    inventoryData.token = solmare.getPersonData("token");
                }
            });
            _callback();
        },
        getTicketTimeRemaining: function () {
            let _recoverTime = solmare.getPersonData("recoverTime");

            let _seconds = _recoverTime - Math.floor(Date.now() / 1000);
            // Are we over the end?
            if (0 > _seconds || _seconds > 14400) {
                _seconds = 0;
            }
            return new Date(_seconds * 1000)
                .toISOString()
                .substr(11, 8);
        },
        getHeartsRequestCount: function () {
            solmare
                .get("facebook/api/list")
                .done(function (_respond) {
                    dataParser.getFacebookHeartRequest(_respond.length);
                });
            return null;
        },
        getFacebookHeartRequest: function (_requests = 0) {
            solmare
                .get("facebook/api/ask/requested")
                .done(function (_respond) {
                    // Can we send new requests?
                    display.showHeartsRequestCount(_requests, !_respond.length);
                });
            return null;
        },
        padNumber: function (_number, _digits) {
            let _string = _number + "";
            return _string.padStart(_digits, "0");
        },
        getChapterPartsData: function (_seasonNumber) {
            // Did we get the Picture data already?
            if (0 === dataParser.objectSize(chapterList)) {
                // Nope - let's grab them
                let chapterListString = GM_getResourceText("chapterList");
                chapterList = dataParser.dataToObject(chapterListString);
            }

            // We create a list of chapters and parts
            if (dataParser.objectHasKey(chapterList, _seasonNumber)) {
                let _partsData = dataParser.objectGetKey(chapterList, _seasonNumber);
                let _seasonId;
                // TCY chapters start with a different number
                if (_seasonNumber >= 122) {
                    _seasonId = "21";
                }
                else {
                    _seasonId = "11";
                }
                _seasonId += _seasonNumber;

                let _chaptersArray = [];

                // Iterate through the chapters
                _partsData.parts.forEach(function (_parts, _chapter) {
                    // Ignore chapter 0
                    if (0 === _chapter) {
                        return true;
                    }
                    // Did we reach the endings?
                    if (10 < _chapter) {
                        return false;
                    }

                    let _chapterId = _seasonId + dataParser.padNumber(_chapter, 2);
                    let _chapterName = "Ch." + _chapter;
                    let _partsArray = [];


                    let _index = 1;
                    while (_index <= _parts) {
                        _partsArray.push({
                            part_id: _chapterId + dataParser.padNumber(_index, 2),
                            part_name: "Part " + _index + "/" + _parts,
                            lock: true
                        });
                        _index++;
                    }
                    // Insert it into the chapters Array
                    _chaptersArray.push({
                        chapter_id: _chapterId,
                        chapter_name: _chapterName,
                        ending_type: "2",
                        part: _partsArray,
                        product_id: null,
                        reading: true
                    });
                });

                // Now put everything together
                return _chaptersArray;
            }
            // Nothing found
            return {};
        },
        getAlbumLink: function (_pictureId) {
            // Did we get the Picture data already?
            if (0 === dataParser.objectSize(albumLinks)) {
                // Nope - let's grab them
                let albumLinksString = GM_getResourceText("albumLinks");
                albumLinks = dataParser.dataToObject(albumLinksString);
            }

            // Do we know the picture?
            if (dataParser.objectGetKey(albumLinks, _pictureId) && 0 !== albumLinks[_pictureId].length) {
                // Have to set it here or else it gets deleted
                let _tplData;
                let _string;

                // Background picture?
                if ("object" === typeof albumLinks[_pictureId]) {
                    _tplData = {
                        pictureId: albumLinks[_pictureId][0],
                        hash: albumLinks[_pictureId][1]
                    };
                    _string = BACKGROUNDURL;
                }
                // Album picture hash?
                else if (albumLinks[_pictureId].match(/^[a-f0-9]{32}$/)) {
                    _tplData = {
                        pictureId: _pictureId,
                        hash: albumLinks[_pictureId]
                    };
                    _string = ALBUMPICTUREURL;
                } else {
                    // An external link (for missing hashes)
                    _tplData = {
                        pictureId: albumLinks[_pictureId]
                    };
                    _string = IMGURURL;
                }
                return display.parseString(_string, _tplData);
            }
            return false;
        },
        // After selling something we need to update our Userdata
        updatePersondata: function (_personData) {
            inventoryData.totalNiney += _personData.price;
            inventoryData.totalElementPoints -= _personData.charmLv;
        }
    };
    const settings = {
        get: function (settingName, standardValue = true) {
            // First get all the Settings we have
            let _settings = GM_getValue("moeSettings", {});

            // Now let's see if we have what we want
            if (_settings.hasOwnProperty(settingName)) {
                // Yes!
                return _settings[settingName];
            }
            // Nothing found
            return standardValue;
        },
        set: function (settingName, value) {
            // First load the existing settings
            let _settings = GM_getValue("moeSettings", {});

            _settings[settingName] = value;
            GM_setValue("moeSettings", _settings);
        },
        delete: function (settingName) {
            // First load the existing settings
            let _settings = GM_getValue("moeSettings", {});

            delete _settings[settingName];
            GM_setValue("moeSettings", _settings);
        }
    };
    const mutationObserver = {
        start: function (observedNode, callback) {
            // Initialize the MuTationObserver
            _observer = new MutationObserver(callback);
            // and start to watch for changes on thee node
            _observer.observe(observedNode, MUTATIONOBSERVERCONFIG);
        },
        stop: function () {
            _observer.disconnect();
        },
        startGiftObserver: function () {
            mutationObserver.start(document.getElementById("container"), mutationObserver.callbackGift);
        },
        check: function (mutationList, key, value) {
            let _found = false;
            mutationList.forEach(function (mutation) {
                // If we found a match already we don't need to check other keys
                // Just run through the object
                if (_found || value === mutation[key]) {
                    _found = true;
                }
            });

            // Return result
            return _found;
        },
        callbackSettings: function (mutationList/*, observer*/) {
            if (mutationObserver.check(mutationList, "type", "childList")
                && $("div.modal-base").length) {
                // Security against multiple inserts
                if ("Display" === $("article.seting_box > h3:last").text()) {
                    display.showSettings();
                }
            }
        },
        callbackGift: function (mutationList/*, observer*/) {
            if (mutationObserver.check(mutationList, "type", "childList")) {
                if ($("#sys-item-history-container").length && !_itemHistoryParsed) {
                    _itemHistoryParsed = true;
                    dataParser.getInventoryData(display.showHistorySellButton);
                }
            }
        }
    };
    const solmare = {
        gameLinks: {},
        // appPath is normally /DEF/
        // A bit of security gainst errors with this fallback
        appPath: ("undefined" !== typeof unsafeWindow.$solmare && "undefined" !== typeof unsafeWindow.$solmare.appPath ? unsafeWindow.$solmare.appPath : "/DEF/"),
        getMethod: function (_keyString) {
            if (dataParser.objectHasKey(unsafeWindow.$solmare, _keyString)) {
                return dataParser.objectGetKey(unsafeWindow.$solmare, _keyString);
            } else if (dataParser.objectHasKey(unsafeWindow.$solfb, _keyString)) {
                return dataParser.objectGetKey(unsafeWindow.$solfb, _keyString);
            }
            return function () {
            };
        },
        execMethod: function (_methodString, ..._args) {
            let _argsString = _args.toString();
            if (("undefined" !== typeof $solmare) && dataParser.objectHasKey($solmare, _methodString)) {
                return eval('$solmare.' + _methodString + '("' + _argsString + '")');
            }
            if (("undefined" !== typeof $solfb) && dataParser.objectHasKey($solfb, _methodString)) {
                let _solmare = unsafeWindow.$solmare;
                unsafeWindow.$solmare = $solfb;
                let _return = eval('$solfb.' + _methodString + '("' + _argsString + '")');
                unsafeWindow.$solmare = _solmare;
                return _return;
            }
        },
        get: function (...args) {
            let _url = args[0];
            let _albumString = "";
            dbg.log("Getting: " + _url);
            switch (_url) {
                case "album/api/get":
                    // You don't need asynchronous album data dammit!
                    _albumString = GM_getValue("albumData", "{}");
                    return {
                        done: function () {
                            return {
                                albumData: dataParser.dataToObject(_albumString)
                            };
                        }
                    };
                case "mypage/api/getTextNews":
                    break;
            }
            return solmare.oldget(args[0], args[1], args[2]);
        },
        post: function (...args) {
            dbg.log("Posting to: " + args[0]);
            dbg.info(args[1]);
            if ("common/api/log" === args[0]) {
                dbg.error("Blocked log request!");
                return {
                    fail: function () {
                        return true;
                    },
                    done: function () {
                        return true;
                    },
                    always: function () {
                        return true;
                    }
                };
            }
            return solmare.oldpost(args[0], args[1], args[2]);
        },
        reloadPerson: function () {
            solmare
                .getMethod("person.reload")()
                .done(function (_data) {
                    display.setPersonData(_data);
                });
        },
        fillHearts: function (_hearts) {
            dbg.info("Saibot: Filling " + _hearts + " hearts..", true);
            // Build the request
            let _requestData = [{
                type: "recoverVital",
                parameter: {
                    amount: _hearts,
                    nowAmount: solmare.getPersonData("minigameItem")
                },
                eventKey: 1
            }];
            // and send it
            solmare
                .post("minigame/api/postQueues", {
                    queues: dataParser.objectToData(_requestData)
                })
                .done(
                    document.location.reload()
                );
        },
        getPage: function (_shorten = false) {
            // Standard value - We get rid of the appPath at the start
            let _url = window.location.pathname.substring(solmare.appPath.length);

            let _urlTmp = solmare.execMethod("utils.url");
            if (_urlTmp) {
                _url = _urlTmp;
            }

            // Shorten the path?
            if (_shorten) {
                // Get rid of the last part right of the last /
                _url = -1 !== _url.lastIndexOf("/") ? _url.slice(0, _url.lastIndexOf("/")) : _url;
            }

            return _url;
        },
        getPageUrl: function (page, key) {
            // Preload saved version if existent
            let _pageUrl = GM_getValue(key, "");
            if (!_pageUrl.length || "undefined" === _pageUrl) {
                _pageUrl = solmare.getMethod("utils.http.url")(page);
            }
            GM_setValue(key, _pageUrl);
            return _pageUrl;
        },
        jumpToPage: function (_page) {
            solmare.execMethod("utils.jump", _page);
        },
        isFullscreen: function () {
            return "/DEF/facebook" !== parent.location.pathname;
        },
        openModal: function (_e) {
            let _modalMethod = solmare.getMethod("modal");
            return new _modalMethod(_e)
                .open()
                .always(
                    function () {
                        solmare.endloading();
                        // Add close function
                        $("div.btn-close,div.modal-close").each(
                            function (idx, obj) {
                                $(obj).tap(
                                    function () {
                                        solmare
                                            .closeModal()
                                            .done(function () {
                                                solmare.endloading();
                                            });
                                    }
                                );
                            }
                        );
                    }
                );
        },
        closeModal: function () {
            return solmare.execMethod("modal.close");
        },
        endloading: function () {
            return solmare.getMethod("utils.block")(!1);
        },
        // Disable the standard MNG click functionality
        disableTap: function (_id) {
            if ("string" === typeof _id) {
                $(_id).offTap();
            } else {
                return _id.offTap();
            }
        },
        propagateGameLinks: function () {
            for (let key of Object.keys(GAMELINKSCONFIG)) {
                if ("undefined" === typeof solmare.gameLinks[key]) {
                    solmare.gameLinks[key] = solmare.getPageUrl(GAMELINKSCONFIG[key], key);
                }
            }
        },
        getPersonData: function (_dataname) {
            let _personData = $solmare.person.getPersonData();
            if ("undefined" === typeof _dataname) {
                return _personData;
            } else if ("undefined" !== typeof _personData[_dataname]) {
                return _personData[_dataname];
            }
            return null;
        },
        getModalZindex: function () {
            let _modals = $solmare.modal.getModals();

            // Do we have open modals?
            if (!_modals.length) {
                return 10001;
            }

            return _modals.slice(-1)[0]._zIndex + 1;
        },
        trash: function (trashId) {
            return $solmare.utils.http.post("gift/api/trash", {
                personGiftId: trashId
            })
        },
        acceptAllRequests: function () {
            let _exchangeUlObj = $("#sys-facebook-request-modal-list > ul");
            let _liObj = $("li[data-sys-facebook-request-id]:first()", _exchangeUlObj);

            // Anything left to do?
            if (!_liObj.length) {
                // No. So just set the text and leave
                _exchangeUlObj.text("No items available");
                solmare.endloading();
                return true;
            }

            // Get what we need
            let _requestId = parseInt(_liObj.data("sys-facebook-request-id"));
            // Anything useful?
            if (!_requestId) {
                solmare.endloading();
                return true; // No
            }
            // Set standard values
            let _heartsRequestUrl = HEARTSREQUESTURLS.accept;
            let _increaseHearts = true;

            // Find out what kind of request it is by looking for the SEND button
            if (_liObj.find("div.btn-fb-send").length) {
                // A friend asks for hearts - that needs a different request URL
                _heartsRequestUrl = HEARTSREQUESTURLS.send;
                _increaseHearts = false; // We didn't get any hearts
            }
            // Build the URL
            _heartsRequestUrl = display.parseString(_heartsRequestUrl, {
                id: _requestId
            });

            // Send the request
            solmare
                .post(_heartsRequestUrl)
                .done(function () {
                    _liObj
                        .slideUp("fast", function () {
                            // Remove the row
                            _liObj.remove();
                            // Set the count of requests and hearts correct if it was a gift to us
                            if (_increaseHearts) {
                                display.increaseHeartsCounter();
                            }
                            // Iterate to the next request
                            solmare.acceptAllRequests();
                        });
                });
        },
        acceptAllNCGifts: function () {
            let _ncGiftCountCheck = display.showNCGiftAmount();

            // Finished?
            if (0 === _ncGiftCountCheck) {
                solmare.endloading();
                display.showNCGiftConfirm();
                return true;
            }

            // Let's get the next non-counting gift
            let _giftObj = $("div [id^='accept']").first();
            let _giftRowObj = _giftObj.parents("li.sys-gif-row");
            let _giftId = _giftObj.data("gift-id");

            // Send the request
            solmare
                .post(GIFTSREQUESSTURL, {
                    personGiftId: _giftId
                })
                .done(function () {
                    _giftRowObj
                        .slideUp()
                        .remove();
                    display.showNCGiftAmount();
                    solmare.reloadPerson();
                    solmare.acceptAllNCGifts();
                });
        },
        autobattle: function (_count) {
            // Say something
            if (1 < _count) {
                dbg.info("Saibot Autobattle: " + _count + " fights left", true);
            } else if (0 < _count) {
                dbg.info("Saibot Autobattle: Last fight", true)
            }

            return function () {
                _count--;
                if (0 <= _count) {
                    $solmare.minigame.bootAutoBattle();
                    setTimeout(solmare.autobattle(_count), 300);
                }
            }(_count);
        },
        interceptDataCommunication: function () {
            // Is $solmare or $solfb (Gift Exchange IFrame) set? If not there is nothing to intercept.
            if ("undefined" === typeof $solmare && "undefined" === typeof $solfb) {
                return false;
            }

            // Save the normal functions and override them
            if ("undefined" !== typeof $solmare) {
                solmare.oldget = unsafeWindow.$solmare.utils.http.get;
                unsafeWindow.$solmare.utils.http.get = solmare.get;
                solmare.oldpost = unsafeWindow.$solmare.utils.http.post;
                unsafeWindow.$solmare.utils.http.post = solmare.post;
            } else {
                solmare.oldget = unsafeWindow.$solfb.utils.http.get;
                unsafeWindow.$solfb.utils.http.get = solmare.get;
                solmare.oldpost = unsafeWindow.$solfb.utils.http.post;
                unsafeWindow.$solfb.utils.http.post = solmare.post;
            }

            // AJAX Catcher
            XMLHttpRequest.prototype.uniqueID = function () {
                // each XMLHttpRequest gets assigned a unique ID and memorizes it
                //  in the "uniqueIDMemo" property
                if (!solmare.uniqueIDMemo) {
                    solmare.uniqueIDMemo = Math.floor(Math.random() * 1000);
                }
                return solmare.uniqueIDMemo;
            };

            // backup original "open" function reference
            XMLHttpRequest.prototype.oldOpen = XMLHttpRequest.prototype.open;

            // backup original "open" function reference
            XMLHttpRequest.prototype.oldOpen = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = newOpen;

            // backup original "send" function reference
            XMLHttpRequest.prototype.oldSend = XMLHttpRequest.prototype.send;
            XMLHttpRequest.prototype.send = newSend;
        }
    };
    const display = {
        switchButton: function (elem, status = "toggle") {
            let _jqElem = $(elem);
            var _parent = {};

            switch (status) {
                case "on":
                    _parent = _jqElem
                        .removeClass("btn_off")
                        .addClass("btn_on")
                        .parent();
                    if (_parent.hasClass("btn_off")) {
                        _parent
                            .removeClass("btn_off")
                            .addClass("btn_on");
                    }
                    break;
                case "off":
                    _parent = _jqElem
                        .removeClass("btn_on")
                        .addClass("btn_off")
                        .parent();
                    if (_parent.hasClass("btn_on")) {
                        _parent
                            .removeClass("btn_on")
                            .addClass("btn_off");
                    }
                    break;
                default:
                    _jqElem
                        // Toggle between clicked and unclicked
                        .toggleClass("btn_off btn_on")
                        // and do the same with it's parent
                        .parent()
                        .toggleClass("btn_off btn_on");
            }
        },
        changeSetting: function (settingName, value) {
            // First let's select the setting buttons
            let _jqElem = $("div[data-btn-group='" + settingName + "']");

            // Now we need to change the buttons
            if (!!value) {
                display.switchButton(_jqElem[0], "on");
                display.switchButton(_jqElem[1], "off");
            } else {
                display.switchButton(_jqElem[0], "off");
                display.switchButton(_jqElem[1], "on");
            }
        },
        addIconSwapper: function () {
            // Just two Oneliners for some HT fun
            $("article > section > ul > li").each(
                function (idx, obj) {
                    $(obj).on("click",
                        function () {
                            $(this)
                                .parent()
                                .siblings("div")
                                .attr("class", $(this).attr("class"))
                        }
                    );
                }
            );
            $("article > section > div").each(
                function (idx, obj) {
                    $(obj).on("click",
                        function () {
                            $(this)
                                .parent()
                                .toggleClass("team_superior team_inferior")
                        }
                    )
                }
            );
        },
        createHtmlBody: function () {
            // First of all create a body tag and insert it to the page because it's missing here
            document.body = document.createElement("body");
        },
        showSettings: function () {
            // Get the settings template
            let _settingsTpl = display.parseTemplate("settings", SETTINGSCONFIG);

            // Inject it to the settings
            $("article.seting_box").append(_settingsTpl);

            // Set the buttons right
            SETTINGSCONFIG.setting.forEach((_setting) => {
                let _val = settings.get(_setting.name, true);
                display.changeSetting(_setting.name, _val);
            });
        },
        fillAlbum: function () {
            // First of all go through the forced changed and make the pictures lewd again
            ALBUMFORCED.forEach(function (_forcedPic) {
                let _albumObj = $("a.sys-full-size-still[data-still-url*=\"" + _forcedPic + ".jpg\"]");
                if (_albumObj.length) {
                    // We found a pic!
                    // Select the inline image
                    let _imgObj = $(_albumObj.find("img")[0]);
                    let _pictureLink = dataParser.getAlbumLink(_forcedPic);
                    _albumObj
                        .attr("data-still-url", _pictureLink)
                        .attr("data-picture-id", _forcedPic)
                        .attr("onclick", "saibot.showAlbumPicture(\"" + _forcedPic + "\")");
                    _imgObj.attr("src", _pictureLink);
                }
            });

            // Now find all unlocked pictures and fill them
            $("#album-content a.noImg").each(function () {
                // Select once
                let _albumObj = $(this),
                    // While we grab the image we also change the class of the a tag
                    _imgObj = $(_albumObj
                        // Remove the "Not available"
                        .attr("class", "sys-full-size-still")
                        // Select the inline image
                        .find("img")[0]),
                    _pictureId = _imgObj
                        .attr("src")
                        .match(/(ev|sp)\d+/)[0],
                    // Now get the correct link
                    _pictureLink = dataParser.getAlbumLink(_pictureId);

                // Okay lets start changing the image and the click of the parent
                if (_pictureLink) {
                    _albumObj
                        .attr("data-still-url", _pictureLink)
                        .attr("data-picture-id", _pictureId)
                        .attr("onclick", "saibot.showAlbumPicture(\"" + _pictureId + "\")");

                    _imgObj.attr("src", _pictureLink);
                } else {
                    // Bleh... no picture found.. set back to "Not available"
                    _albumObj.attr("class", "no_image noImg");
                }
            });

            // To tell the next Mutation that we are already done
            $("#album-content > ul").attr("data-finished", 1);
        },
        fillEndings: function () {
            // Grab the data about the endings
            let _endings = dataParser.getEndingsData(),
                _albumObj = $("#album-content > ul");
            // And put it under the Season icon
            if ("undefined" === typeof _albumObj.attr("data-finished") && 0 !== _endings.length) {
                _endings.forEach((ending) => {
                    let _string = display.parseTemplate("endings", ending);
                    $("a[data-chapter-name=\"" + ending.name + "\"] > p").text(_string);
                });
            }
            // To tell the next Mutation that we are already done
            _albumObj.attr("data-finished", 1);
        },
        showAlbumPicture(_pictureId) {
            // First select the anchor, get the latest _zIndex and the picture link
            let _anchor = $("a[data-picture-id='" + _pictureId + "']"),
                _picLink = _anchor.data("still-url"),

                // Now fill the template
                _parsedTpl = display.parseTemplate("albumPicture", {
                    picLink: _picLink
                });

            // Show the bis picture
            $("#container").append(_parsedTpl);
        },
        hideModalBox: function () {
            let _modalBase = $("div.modal-sai");
            _modalBase.last().remove();
            if (1 === _modalBase.length) {
                $("div.modal-overlay").hide();
            }
        },
        showChoices: function () {
            display.showSaiModal("choicesBox", choicesData);
            solmare.endloading();
        },
        showSaiModal: function (_modal, _data = {}) {
            let _parsedTpl = display.parseTemplate(_modal, _data);

            // Now lets show the box
            if ($("div.modal-sai").length) {
                // Close the active statbox
                display.hideModalBox();
            }
            $("#container").append(_parsedTpl);
            $("div.modal-overlay")
                .show()
                .css("zIndex", 10000);
        },
        showSolmareUrlModal: function (_modalName, _data = {}, _open = true) {
            let _tpl = MODALURLTEMPLATES[_modalName];
            // Did we get something?
            if (!_tpl) {
                return false;
            }

            // Everything fine. Let's show it!
            let _url = display.parseString(_tpl, _data);
            let _modal = {
                template: {
                    url: _url
                }
            };
            if (_open) {
                return solmare.openModal(_modal);
            }
        },
        showSolmareIdModal: function (_id, _bootup) {
            let _modal = {
                template: {
                    id: _id
                }
            };

            // Something we need to do after the modal was loaded?
            if ("function" === typeof _bootup) {
                _modal.boot = function () {
                    return _bootup;
                }
            }
            return solmare.openModal(_modal);
        },
        showToast: function (template, toastData) {
            // Get the Chapter data and parse it
            let _parsedTpl = display.parseTemplate(template, toastData);

            // Now inject it to the page
            $("#sceneId").after(_parsedTpl);

            // Let it go away after 5 seconds
            setTimeout(function () {
                $("#" + template)
                    .removeClass("toast_show")
                    .addClass("toast_hide");
            }, 2000);
        },
        showJumpToNF: function () {
            // Parse the template
            let _parsedTpl = display.parseTemplate("toNinjaFight", solmare.gameLinks);

            // Now inject it to the page
            $("ul.preview-target:first")
                .prepend(_parsedTpl)
                .css({
                    left: "10%",
                    width: "50%"
                });
        },
        showTrashButton: function () {
            display.modifyGameTemplate("gift-row-template", "trashButton", "ul>");
        },
        showAcceptAllGifts: function () {
            display.modifyGameTemplate("gift-row-template", "acceptAllGifts", "    {{#gift");
            display.modifyGameTemplate("gift-row-template", "countNCGifts", "$");
        },
        showAcceptAllButton: function () {
            display.modifyGameTemplate("sys-facebook-request-modal-list-template", "acceptAllButton", "ul>");
        },
        showTicketTimer: function () {
            _timerDiv = $("div.sys-header-free-ticket-list");
            // Are we on a page where the tickets are visible? (Not inside a story)
            if (_timerDiv.length) {
                // Now check if there is at least one free ticket available
                let _freeTickets = _timerDiv.find("> ul > li.i_freeTicket_off").length;
                if (_freeTickets) {
                    display.setTicketClick();
                }
            }
        },
        showHistorySellButton: function () {
            // First of all select all items that can be sold
            let _selectObjArray = $("div.btn01[data-avatar-id]");

            // Let's itarate through it
            _selectObjArray.each(function (_idx, _obj) {
                let _selectButton = $(_obj);
                let _avatarId = _selectButton.data("avatar-id");
                let _sellButton = display.parseTemplate("sellButton", {
                    avatarId: _avatarId
                });
                _selectButton.after(_sellButton);
            });
        },
        setTicketClick: function () {
            _timerDiv.parent().bind("click", function () {
                // Is a timeout alrealy running?
                if (null === _timerTimeout) {
                    // No
                    display.startTicketTimer();
                    return;
                }
                display.stopTicketTimer();
            });
        },
        setHeaderClick: function () {
            if (settings.get("gameFunctions")) {
                let _previewBtn = $("#preview-btn");

                // Get rid of the standard functionality and inject our own
                solmare.disableTap(_previewBtn);
                _previewBtn.tap(function () {
                        $(".preview-target[id!='avatar-header']").toggle();
                        _previewBtn.show();
                        solmare.endloading();
                    }
                );
            }
        },
        setPersonData: function (_personData) {
            // Set person data in the header
            let _headerObj = $("#header-base");

            $("span.sys_header_coin", _headerObj).text(_personData.coin);
            $("div.sys-header-free-ticket-list", _headerObj).siblings("span").text(_personData.paidTicket);
            $("span.sys_header_minigame", _headerObj).text(_personData.minigameItem);
            $("span.sys_header_token", _headerObj).text(_personData.token);
        },
        fillTicketTimer: function () {
            let _time = dataParser.getTicketTimeRemaining();
            // Did we reach the end?
            if ("00:00:00" === _time) {
                return display.stopTicketTimer();
            }
            let _timeString = display.parseString("<span>{{time}}</span>", {
                time: _time
            });
            _timerLi.html(_timeString);
        },
        startTicketTimer: function () {
            _timerDiv.addClass("freeTicket_countdown");
            _timerLi = _timerDiv.find("> ul > li.recoveryTime");
            display.fillTicketTimer();
            _timerTimeout = setInterval(function () {
                display.fillTicketTimer();
            }, 1000);
        },
        stopTicketTimer: function () {
            _timerDiv.removeClass("freeTicket_countdown");
            clearInterval(_timerTimeout);
            _timerTimeout = null;
            _timerLi.html("");
        },
        removeGiftItem: function (_item) {
            // A little bit of security
            let _itemObj = $("div[data-gift-id='" + _item + "']");
            if (_itemObj) {
                _itemObj
                    .parents("li.sys-gif-row")
                    .slideUp("slow", function () {
                        $(this).remove()
                    })
            }
        },
        removeHistoryItemButtons: function (_item) {
            $("div[data-avatar-id=" + _item + "]")
                .fadeOut("slow", // Slide it up
                    function () {
                        // After the animation delete the buttons
                        $(this).remove();
                    });
        },
        removeUnreadIndicatorFromPage: function () {
            let _selectors = ["i.sys-album-badge", "i.badge.hatch"];
            _selectors.forEach(function (_selector) {
                let _node = document.querySelector(_selector);

                // Remove the indicator if we found it on the page
                if (null !== _node) {
                    _node.remove();
                }
            });
        },
        removeUnreadIndicatorFromTemplate: function (_page) {
            switch (_page) {
                case "mypage":
                    display.modifyGameTemplate("header-menu", "empty", "<i class=\"badge hatch sys-menu-badge\"><\\/i>");
                    break;
                case "album":
                    // We need to modify several positions in the album so we also use RegEx!
                    display.modifyGameTemplate("album-view", "empty", "<i class=\"badge hatch.*?><\\/i>", "g");
                    display.modifyGameTemplate("album-game-story-content-template", "empty", "{{#unread}}<i class=\"badge hatch\"><\\/i>{{\\/unread}}");
                    display.modifyGameTemplate("album-event-story-content-template", "empty", "{{#unread}}<i class=\"badge hatch\"><\\/i>{{\\/unread}}");
                    break;
            }
        },
        changeReadBtnChibi: function () {
            let readBtn = $(".container>.btn_readStory");
            if (readBtn.length) {
                readBtn.removeClass("btn_chara_00 btn_chara_01 btn_chara_02 btn_chara_03 btn_chara_04 btn_chara_05 btn_chara_06")
                    .addClass("btn_chara_0" + (Math.floor(Math.random() * 6) + 1));
            }
        },
        setScreenmodeSwitcher: function () {
            // Set an onclick function onto the scroller at the botttom
            let _marquee = $("#mypage-marquee");
            _marquee.bind("click", function () {
                if (solmare.isFullscreen()) {
                    // Change to Facebook Mode
                    window.location.href = "https://apps.facebook.com/moeninja/";
                } else {
                    top.location.href = solmare.gameLinks["home"];
                }
            });
        },
        showNCGiftAmount: function (_initial) {
            let _ncGiftsCount = $("div [id^='accept']").length;
            $("#giftCount").text(_ncGiftsCount);
            if (_initial) {
                _NCGiftCount = _ncGiftsCount;
            }
            // Any non-inventory gifts left?
            if (!_ncGiftsCount) {
                let _acceptAllObj = $("#ncGiftsAccept");
                // When it was an initial (page load) we simply remove the block
                if (_initial) {
                    _acceptAllObj.remove();
                } else {
                    // Otherwise animate it
                    _acceptAllObj.slideUp(function () {
                        _acceptAllObj.remove();
                    });
                }
            }
            return _ncGiftsCount;
        },
        showNCGiftConfirm: function () {
            display.showSolmareIdModal("gift-complete-template");
            $(".modal-base #gift-complete-gift-name").text(_NCGiftCount + " non-inventory item(s)");
            $(".modal-base #gift-complete-ok-close").tap(function () {
                return solmare.closeModal().done(function () {
                    solmare.jumpToPage("gift");
                })
            })
        },
        showHeartsRequestCount: function (_count = 0, _showIndicator = false) {
            let _indicator = "";

            if (0 < _count) {
                // We do it like this to have a string as a result
                _indicator += _count;
            }
            if (_showIndicator) {
                _indicator += "✓";
            }

            // Is there something to do?
            if ("undefined" === typeof saibot.lastHeartsIndicator || saibot.lastHeartsIndicator !== _indicator) {
                $("#mypage-counter").remove();

                // Is there something to show?
                if (_indicator.length) {
                    let _tplData = {
                        indicator: _indicator
                    };
                    let _tpl = display.parseTemplate("countBadge", _tplData);
                    $("#mypage-status-btn").append(_tpl);
                }
            }

            // At the end save the last hearts indicator
            saibot.lastHeartsIndicator = _indicator;
        },
        increaseHeartsCounter: function (_count = 2) {
            // First select the right way
            let _heartCountObj;
            let _fbFrame = $("#sys-facebook-frame");
            if (_fbFrame.length) {
                _heartCountObj = _fbFrame.contents().find("span.sys_header_minigame");
            } else {
                _heartCountObj = $("span.sys_header_minigame");
            }

            // Get and increase the count
            let _actualCount = parseInt(_heartCountObj.text());
            _heartCountObj.text(_actualCount + _count);
        },
        setupGetHeartsRequestCountIntervall: function () {
            // Get the count of heart request every 2,5 seconds
            // and if we can request new hearts
            // But only if we are not in Fullscreen Mode
            if (parent.location.href !== document.location.href) {
                setInterval(dataParser.getHeartsRequestCount, 2500);
            }
        },
        getTemplate: function (tplName) {
            switch (tplName) {
                case "settings":
                    return "<h3><span>Moe! Ninja Saibot Enchancements</span></h3>\n" +
                        "{{#setting}}\n" +
                        "<p class=\"audio_ttl\">{{desc}} :</p>\n" +
                        "<ul class=\"audio_setting_btnArea\">\n" +
                        "    <li>\n" +
                        "        <div class=\"btn01 btn_short btn-sound1-story btn-sound1 btn_red btn_off btn-sound1\" data-btn-group=\"{{name}}\" onclick=\"saibot.changeSetting('{{name}}', true)\">\n" +
                        "            <div class=\"btn_range\"><span>ON</span></div>\n" +
                        "        </div>\n" +
                        "    </li>\n" +
                        "    <li>\n" +
                        "        <div class=\"btn01 btn_short btn-sound0-story btn-sound0 btn_blue btn-sound0 btn_on\" data-btn-group=\"{{name}}\" onclick=\"saibot.changeSetting('{{name}}', false)\">\n" +
                        "            <div class=\"btn_range\"><span>OFF</span></div>\n" +
                        "        </div>\n" +
                        "    </li>\n" +
                        "</ul>\n" +
                        "{{/setting}}\n";
                case "toastChapter":
                    return "<div class=\"toast_block toast_show\" style=\"z-index: {{zIndex}};\" id='toastChapter'>\n" +
                        "        <div class=\"frame_toast\">\n" +
                        "            <p class=\"txt_attained_toast\">{{season}}</p>\n" +
                        "            <dl class=\"hunting_cont_toast\">\n" +
                        "                \n" +
                        "                <dd>\n" +
                        "                    <p class=\"msg_toast\"><span class=\"hunt_item_name_toast\">{{chapter}}{{part}}</span></p>\n" +
                        "                    {{#album}}\n" +
                        "                     <div class=\"hunting_boost_toast\" style=\"display:block\">\n" +
                        "                        <p>Album picture inside!</p>\n" +
                        "                    </div>\n" +
                        "                    {{/album}}\n" +
                        "                </dd>\n" +
                        "                \n" +
                        "            </dl>\n" +
                        "        </div>\n" +
                        "    </div>";
                case "choiceRevealer":
                    return "<div class=\"btn_function btn_help btn_off\" id=\"def-minigame-help-btn\" style='top:1%;z-index:2'><script type='text/javascript'>$('#def-minigame-help-btn').tap(function() { saibot.showChoices(); $('#def-minigame-help-btn').remove(); });</script></div>";
                case "choicesBox":
                    return "<div class=\"modal-base modal-sai\" style=\"z-index: {{zIndex}};\">\n" +
                        "    <div class=\"m_modalBox modal011\">\n" +
                        "        <div class=\"btn-close btn_off\" onclick=\"saibot.hideModalBox()\"></div>\n" +
                        "        <div class=\"modal_box\">\n" +
                        "            <div class=\"modal_inner m_modal_inner\">\n" +
                        "                <h1>Choices</h1>\n" +
                        "                <article class=\"scroll overflow\">\n" +
                        "                    <ul class=\"list_boxList textOnly\">\n" +
                        "                    {{#choices}}\n" +
                        "                        <li>\n" +
                        "                            {{#style}}" +
                        "                            <div class=\"targets\">\n" +
                        "                                <div class=\"target animated jello {{style}}\"></div>\n" +
                        "                            </div>\n" +
                        "                            {{/style}}" +
                        "                            <div class=\"inner_list\">\n" +
                        "                                <dl class=\"item_detailArea\">\n" +
                        "                                    <dd>\n" +
                        "                                        <p class=\"history-name\">{{girl}}</p>\n" +
                        "                                        <p class=\"history-text\">{{text}}</p>\n" +
                        "                                    </dd>\n" +
                        "                                </dl>\n" +
                        "                            </div>\n" +
                        "                        </li>\n" +
                        "                    {{/choices}}\n" +
                        "                    </ul>\n" +
                        "                </article>\n" +
                        "            </div>\n" +
                        "        </div>\n" +
                        "    </div>\n" +
                        "</div>";
                case "countBadge":
                    return "<span class=\"badge_num hatch\" id=\"mypage-counter\">{{indicator}}</span>";
                case "toNinjaFight":
                    return "<li class=\"btn_reset btn_off\">\n" +
                        "                <div id=\"toNinjaFight\" class=\"btn01 btn_short btn_green btnLeft btn_off\">\n" +
                        "                    <script type=\"text/javascript\">\n" +
                        "                    $(\"#toNinjaFight\").tap(function() {\n" +
                        "                        let _refPageArr = /minigame\\/\\d+/.exec(document.referrer);\n" +
                        "                        if (null === _refPageArr) {\n" +
                        "                            saibot.jumpTo(\"minigame\");\n" +
                        "                        }\n" +
                        "                        else {\n" +
                        "                            saibot.jumpTo(_refPageArr[0]);\n" +
                        "                        }\n" +
                        "                    });\n" +
                        "                    </script>" +
                        "                    <div class=\"btn_range\"><span>&rarr; Fight</span></div>\n" +
                        "                </div>\n" +
                        "            </li>";
                case "albumPicture":
                    return "<div class=\"modal-base modal-sai\" style=\"z-index: {{zIndex}};\">" +
                        "    <div class=\"still_view\" onclick=\"saibot.hideModalBox()\">" +
                        "        <img src=\"{{picLink}}\" id=\"still_full\" alt='Album picture'>" +
                        "    </div>" +
                        "</div>";
                case "endings":
                    return "{{name}} - {{parts}} Parts";
                case "itemTrash":
                    return "<div class=\"modal-base modal-sai\" style=\"z-index: {{zIndex}};\">" +
                        "    <div class=\"s_modalBox\">\n" +
                        "        \n" +
                        "        <div class=\"modal_box\">\n" +
                        "            <div class=\"modal_inner s_modal_inner\">\n" +
                        "                <div class=\"scrollArea scroll\">\n" +
                        "                    <article class=\"msg scroll\">\n" +
                        "                        <p class=\"pt20p\">You’re about to delete <span id=\"gift-trash-avatar-name\">{{itemName}}</span>.<br>Do you really want to proceed?</p>\n" +
                        "                    </article>\n" +
                        "                </div>\n" +
                        "                \n" +
                        "                <div class=\"btn01 btn_short btn_red btnLeft btn_off\" id=\"gift-trash-trash-btn\">\n" +
                        "                    <div class=\"btn_range\" onmousedown='saibot.switchButton(this, \"on\")' onmouseup='saibot.switchButton(this, \"off\")' onmouseout='saibot.switchButton(this, \"off\")' onclick=\"saibot.trashItem({{itemId}})\"><span>YES</span></div>\n" +
                        "                </div>\n" +
                        "                <div class=\"btn01 btn_short btn_blue btnRight btn_off\" id=\"gift-trash-cancel-btn\">\n" +
                        "                    <div class=\"btn_range\" onmousedown='saibot.switchButton(this, \"on\")' onmouseup='saibot.switchButton(this, \"off\")' onmouseout='saibot.switchButton(this, \"off\")' onclick=\"saibot.hideModalBox()\"><span>NO</span></div>\n" +
                        "                </div>\n" +
                        "            </div>\n" +
                        "        </div>\n" +
                        "    </div>" +
                        "</div>";
                case "trashButton":
                    return "ul>\n<div class=\"btn01 btn_short btn_green btn_off\" id='trash{{personGiftId}}' onmousedown='saibot.switchButton(this, \"on\")' onmouseup='saibot.switchButton(this, \"off\")' onmouseout='saibot.switchButton(this, \"off\")' onclick='saibot.trashItemConfirm(this)' style=\"top:25%\" data-gift-id=\"{{personGiftId}}\" data-gift-name=\"{{name}}\">\n" +
                        "    <script type='application/javascript'>if (10000 > {{objectId}}) { let _me = document.getElementById('trash{{personGiftId}}'); _me.nextSibling.nextSibling.id = \'accept{{personGiftId}}'; _me.remove(); } </script>\n" +
                        "    <div class=\"btn_range\"><span>TRASH</span></div>\n" +
                        "</div>";
                case "acceptAllGifts":
                    return "    <li class=\"sys-gif-row\" id=\"ncGiftsAccept\">\n" +
                        "        <div class=\"inner_list\">\n" +
                        "            <dl class=\"item_detailArea\">\n" +
                        "                <dt><img src=\"https://cdn.shall-we-date.com/pdt/def/DEF/var/img/story/tutorial_steps_mini_chara_03.png\"></dt>\n" +
                        "                <dd>\n" +
                        "                    <ul class=\"item_detail\">\n" +
                        "                        <li class=\"itemName\">Autoaccept</li>\n" +
                        "                        <li class=\"item_notes\">Accept <span id=\"giftCount\"></span> item(s) that don't count in the inventory.</li>\n" +
                        "                    </ul>\n" +
                        "                    <div class=\"btn01 btn_short btn_purple btn_off gift-receive-btn\" id='giftsAcceptAllButton'>\n" +
                        "                        <script type=\"text/javascript\">$(\"#giftsAcceptAllButton\").tap(function() { saibot.acceptAllGifts(); });</script>\n" +
                        "                        <div class=\"btn_range\"><span>ACCEPT</span></div>\n" +
                        "                    </div>\n" +
                        "                </dd>\n" +
                        "            </dl>\n" +
                        "        </div>\n" +
                        "    </li>\n" +
                        "    {{#gift";
                case "countNCGifts":
                    return "<script type=\"text/javascript\">saibot.countNCGifts()</script>";
                case "acceptAllButton":
                    return "ul>\n<li id=\"saibotAcceptAll\">\n" +
                        "    <script type=\"text/javascript\">\n" +
                        "        // Remove this function if there are less then 2 requests\n" +
                        "        if (2 > $(\"li[data-sys-facebook-request-id]\").length) {\n" +
                        "            $(\"#saibotAcceptAll\").remove();\n" +
                        "        }\n" +
                        "    </script>\n" +
                        "    <dl>\n" +
                        "        <dd>\n" +
                        "            <h3>ACCEPT AND SEND ALL REQUESTS!</h3>\n" +
                        "        </dd>\n" +
                        "        <dd></dd>\n" +
                        "        <dd>\n" +
                        "            <div id=\"accepAllButton\" class=\"btn-fb-accept btn-fb_off\"></div>\n" +
                        "            <script type=\"text/javascript\">$(\"#accepAllButton\").tap(function() { saibot.acceptAllRequests(); })</script>\n" +
                        "        </dd>\n" +
                        "    </dl>\n" +
                        "</li>";
                case "sellButton":
                    return "<div class=\"btn01 btn_medium btn_red btn_off\" style=\"left:45%\" onclick='saibot.sellItemConfirm(this);' data-avatar-id=\"{{avatarId}}\">\n" +
                        "    <div class=\"btn_range\"><span>SELL</span></div>\n" +
                        "    <script type=\"text/javascript\">$(\"#giftsAcceptAllButton\").tap(function() { saibot.acceptAllGifts(); });</script>\n" +
                        "</div>";
                case "sellConfirm":
                    return "<div class=\"modal-base modal-sai\" style=\"z-index: {{zIndex}};\">\n" +
                        "   <div class=\"s_modalBox modal455\" id=\"avatar-sell-confirm-content\" style=\"display: block;\">\n" +
                        "       <div class=\"modal_box\">\n" +
                        "           <div class=\"modal_inner s_modal_inner\">\n" +
                        "            <h1 style='margin-top:6.8%;font-size:100%'>DO YOU WISH TO SELL {{name}}?</h1>\n" +
                        "               <article>\n" +
                        "                   <ul class=\"scoreArea\">\n" +
                        "                       <li>Total Element Point : <span class=\"red\">-{{charmLv}}</span> ({{charmLvBefore}}→{{charmLvAfter}})</li>\n" +
                        "                       <li>Niney <i class=\"i_zeni\">&nbsp;</i> : <span class=\"red\">+{{price}}</span> ({{priceBefore}}→{{priceAfter}})</li>\n" +
                        "                   </ul>\n" +
                        "                   {{#isEquip}}\n" +
                        "                   <p class=\"caution_favorite\">This avatar item is saved as My Favorite data.<br>If you sell it, that data will be reset.</p>\n" +
                        "                   {{/isEquip}}\n" +
                        "               </article>\n" +
                        "\n" +
                        "               <div class=\"btn01 btn_short btn_red btnLeft btn_off\" id=\"avatar-sell-confirm-ok\">\n" +
                        "                   <div class=\"btn_range\" onmousedown='saibot.switchButton(this, \"on\")' onmouseup='saibot.switchButton(this, \"off\")' onmouseout='saibot.switchButton(this, \"off\")' onclick='saibot.sellItem([{{personAvatarId}}, {{avatarId}}, {{price}}, {{charmLv}}])'><span>YES</span></div>\n" +
                        "               </div>\n" +
                        "               <div class=\"btn01 btn_short btn_blue btnRight btn_off\" id=\"avatar-sell-confirm-cancel\">\n" +
                        "                   <div class=\"btn_range\" onmousedown='saibot.switchButton(this, \"on\")' onmouseup='saibot.switchButton(this, \"off\")' onmouseout='saibot.switchButton(this, \"off\")' onclick=\"saibot.hideModalBox()\"><span>NO</span></div>\n" +
                        "               </div>\n" +
                        "           </div>\n" +
                        "       </div>\n" +
                        "   </div>\n" +
                        "</div>";
                default:
                    return "";
            }
        },
        parseString: function (_str, _tplData) {
            // First compile the tpl string
            let _compiled = hogan.compile(_str);
            // and now render it
            return _compiled.render(_tplData);
        },
        parseTemplate: function (_tplName, _tplData = {}) {
            // Get the template first
            let _tplString = display.getTemplate(_tplName);

            // Always use the gameLinks too
            _tplData = dataParser.objectMerge(_tplData, solmare.gameLinks);
            _tplData.zIndex = solmare.getModalZindex();

            // Compile and render it
            return display.parseString(_tplString, _tplData);
        },
        modifyGameTemplate: function (_tplId, _tplName, _injectionPoint, _modifier = "") {
            // We directly change the game template before it is used
            let _solmareTpl = $("#" + _tplId);
            let _tplText = display.getTemplate(_tplName);
            let _regex = new RegExp(_injectionPoint, _modifier);
            // Inject our stuff
            let _modifiedTpl = _solmareTpl
                .text()
                .replace(_regex, _tplText);
            // Inject it to the game
            _solmareTpl.text(_modifiedTpl);
        },
        getRandomChibis: function () {
            let numbers = ["01", "02", "03", "04", "05", "06", "07", "08"],
                letters = ["a", "b", "c", "d", "e", "f", "g", "h", "i"],
                numLength = numbers.length,
                indexes = [],
                imgStr = "/img/chara/minichara",
                chibis = {};

            // Fill in the possible indexes
            while (numLength--) {
                indexes[indexes.length] = numLength;
            }

            // Now get 4 random ones out of it
            for (let _i = 1; _i <= 4; _i++) {
                let rand = Math.floor(Math.random() * indexes.length),
                    item = numbers[indexes[rand]];
                indexes.splice(rand, 1);

                // Get a random letter
                rand = Math.floor(Math.random() * letters.length);
                let letter = letters[rand];

                // Glue it all together and put it into an array
                chibis["chibi" + _i] = imgStr + item + "_" + letter + ".png";
            }

            return chibis;
        }
    };
    // This is to show the console ouput only if the Debug Mode is active
    const dbg = {
        write: function (_level, _message, _enforce = false) {
            // Only if the debug mode active or the message is enforced or it is an error message
            if (_enforce || "error" === _level) {
                switch (_level) {
                    case "info":
                    case "log":
                    case "error":
                        console[_level](_message);
                        break;
                    default:
                        console.log(_message);
                }
            }
        },
        log: function (_message, _enforce = false) {
            dbg.write("log", _message, _enforce);
        },
        info: function (_message, _enforce = false) {
            dbg.write("info", _message, _enforce);
        },
        error: function (_message) {
            dbg.write("error", _message, true);
        }
    };
    const _console = {
        commandExecuted: function () {
            return "Saibot: Command executed!";
        },
        version: "Saibot is running on version 2.9.1"
    };
    const newSend = function (a) {
        dbg.info("[" + this.uniqueID() + "] intercepted send (" + a + ")");

        let xhr = this;
        let onload = function () {
            dbg.info("[" + xhr.uniqueID() + "] intercepted load: " +
                xhr.status +
                " " + xhr.responseText);
        };

        let onerror = function () {
            dbg.info("[" + xhr.uniqueID() + "] intercepted error: " +
                xhr.status);
        };

        xhr.addEventListener("load", onload, false);
        xhr.addEventListener("error", onerror, false);

        this.oldSend(a);
    };
    const newOpen = function (method, url, async, user, password) {
        dbg.info("[" + this.uniqueID() + "] intercepted open (" +
            method + " , " +
            url + " , " +
            async + " , " +
            user + " , " +
            password + ")");
        if (0 === url.indexOf("/DEF/common/api/log?")) {
            dbg.error("Blocked log request");
        } else {
            this.oldOpen(method, url, async, user, password);
        }
    };

    return {
        jumpTo: function (page) {
            solmare.jumpToPage(page);
        },
        showChoices: function () {
            display.showChoices();
        },
        hideModalBox: function () {
            display.hideModalBox();
        },
        switchButton: function (elem, status) {
            display.switchButton(elem, status);
        },
        changeSetting: function (settingName, val) {
            display.changeSetting(settingName, val);
            settings.set(settingName, val);
        },
        showAlbumPicture: function (_pictureId) {
            display.showAlbumPicture(_pictureId);
        },
        acceptAllRequests: function () {
            solmare.acceptAllRequests();
        },
        acceptAllGifts: function () {
            solmare.acceptAllNCGifts();
        },
        countNCGifts: function () {
            display.showNCGiftAmount(true);
        },
        trashItemConfirm: function (_obj) {
            let _jqObj = $(_obj);
            let _tplData = {
                itemName: _jqObj.data("gift-name"),
                itemId: _jqObj.data("gift-id")
            };
            display.showSaiModal("itemTrash", _tplData);
        },
        trashItem: function (_itemId) {
            solmare.trash(_itemId);
            display.hideModalBox();
            display.removeGiftItem(_itemId);
        },
        sellItemConfirm: function (_obj) {
            let _avatarId = $(_obj).data("avatar-id");
            let _itemData = inventoryData[_avatarId];
            let _tplData = dataParser.objectMerge(
                _itemData,
                {
                    avatarId: _avatarId,
                    charmLvBefore: inventoryData.totalElementPoints,
                    charmLvAfter: (inventoryData.totalElementPoints - _itemData.charmLv),
                    priceBefore: inventoryData.token,
                    priceAfter: (inventoryData.token + _itemData.price)
                });
            display.showSaiModal("sellConfirm", _tplData);
        },
        sellItem: function (_avatarObj) {
            // [{{personAvatarId}}, {{avatarId}}, {{price}}, {{charmLv}}
            display.hideModalBox();
            // This is taken from Solmare
            let _e = new $.Deferred;
            solmare.post("room/api/sell", {
                personAvatarIds: dataParser.objectToData([_avatarObj[0]])
            }).done(function () {
                // Update our data
                dataParser.updatePersondata({
                    price: _avatarObj[2],
                    charmLv: _avatarObj[3]
                });
                display.removeHistoryItemButtons(_avatarObj[1]);
                return solmare.reloadPerson(), _e.resolve();
            });
        },
        console: {
            fillHearts: function (_hearts) {
                _hearts = parseInt(_hearts);
                if (1 > _hearts) {
                    dbg.error("Saibot: Amount of hearts have to be at least 1");
                }
                solmare.fillHearts(_hearts);
                return _console.commandExecuted();
            },
            closeModal: function () {
                solmare.closeModal();
                return _console.commandExecuted();
            },
            searchCC: function (_searchString) {
                // First of all split the search
                const _SEARCHES = _searchString.split(" ");
                // Now itarate through all searchwords
                let _found = ccList;
                _SEARCHES.forEach(function (_searchValue) {
                    _found = _found.map(function (_ccVal) {
                        if (-1 !== _ccVal.toLowerCase().indexOf(_searchValue.toLowerCase())) {
                            return _ccVal;
                        }
                        return "";
                    });
                });

                // Small trick to see if we found anything
                if (!_found.join("").length) {
                    return "Saibot: Nothing found!";
                }

                // Okay there are hits. Let's show them
                dbg.info("Saibot: Found Cookie Collections are listed below.", true);
                _found.map(function (_value, _index) {
                    if (_value.length) {
                        dbg.info("ID: " + _index + " - Name: " + _value, true);
                    }
                });
                return _console.commandExecuted();
            }
        },
        onDomLoaded: function () {
            // Set the missing objects
            $solmare = unsafeWindow.$solmare;
            hogan = unsafeWindow.Hogan;
            $ = "undefined" !== typeof unsafeWindow.$ ? unsafeWindow.$ : jQuery;
            let _page = solmare.getPage(true);

            if (!settings.get("saibotActive") && "setting" !== _page) {
                // Saibot deactivated
                return;
            }

            // Fill the Constant
            ccList = dataParser.dataToObject(GM_getResourceText("ccList"));

            // Setup AJAX interception
            solmare.interceptDataCommunication();

            // Check the page
            switch (_page) {
                case "mypage":
                    // This is the start screen of MNG
                    // Fill the gameLinks
                    solmare.propagateGameLinks();

                    // Set iframe URL
                    GM_setValue("home", document.location.href);

                    // Show random chibi and set the screenmode switcher?
                    if (settings.get("gameFunctions")) {
                        display.changeReadBtnChibi();
                        display.setScreenmodeSwitcher();
                    }

                    // Show Facebook hearts request indicators and count?
                    if (settings.get("fbIndicator")) {
                        dataParser.getHeartsRequestCount();
                        // At the end set an Interval to get the count every 2,5 seconds
                        display.setupGetHeartsRequestCountIntervall();
                    }

                    // If the album enchancements are active
                    // we prepare what we need here
                    if (settings.get("fillAlbum")) {
                        dataParser.prepareAlbumData();
                    }
                    break;
                case "story":
                case "story/modal":
                case "story/spinOff": {
                    // Story
                    let _choices = dataParser.getChoicesData();
                    let _chapter = dataParser.getChapterData();

                    // Show a toast with the chapter data
                    if (settings.get("story")) {
                        display.showToast("toastChapter", _chapter);

                        // Is this a chapter with a route to choose?
                        if (dataParser.objectSize(_choices)) {
                            let _helpButton = display.getTemplate("choiceRevealer");
                            $("#sys-guide-area").after(_helpButton);
                            choicesData = _choices;
                        }
                    }
                    break;
                }
                case "setting":
                    // Start the mutation observer first
                    mutationObserver.start(document.getElementById("container"), mutationObserver.callbackSettings);
                    break;
                case "room":
                    // Customize
                    // Fill the gameLinks
                    solmare.propagateGameLinks();
                    // Show the button to jump to the Ninja Fight
                    display.showJumpToNF();
                    // Clicking the header shows the "Brag version"
                    if (settings.get("gameFunctions")) {
                        display.setHeaderClick();
                    }
                    break;
                case "gift":
                    if (settings.get("gameFunctions")) {
                        display.showTrashButton();
                        display.showAcceptAllGifts();
                        mutationObserver.startGiftObserver();
                    }
                    break;
                case "huntingScore":
                    if (settings.get("heartTroops")) {
                        display.addIconSwapper();
                    }
                    break;
                case "facebook":
                    if (settings.get("gameFunctions")) {
                        display.showAcceptAllButton();
                    }
                    break;
                default:
                    // Fill the gameLinks
                    solmare.propagateGameLinks();
            }
        },
        onDomCompletlyLoaded: function () {
            if (!settings.get("saibotActive")) {
                // Saibot deactivated
                return;
            }

            // Base game functions activated?
            if (settings.get("gameFunctions")) {
                display.showTicketTimer();
            }

            switch (solmare.getPage(true)) {
                case "mypage":
                    if (!settings.get("unreadIndicator")) {
                        display.removeUnreadIndicatorFromPage();
                        display.removeUnreadIndicatorFromTemplate("mypage");
                    }
                    break;
                case "album":
                    if (!settings.get("unreadIndicator")) {
                        display.removeUnreadIndicatorFromPage();
                        display.removeUnreadIndicatorFromTemplate("album");
                    }
                    break;
            }
        },
        onPageStart: function () {
            if (!settings.get("saibotActive")) {
                // Saibot deactivated
                return;
            }

            switch (solmare.getPage(true)) {
                case "album":
                    // Album reached - Anything to do?
                    if (settings.get("fillAlbum")) {
                        let _albumDataString = GM_getValue("albumData", "");
                        if (_albumDataString.length) {
                            // We have a modified Album here
                            display.createHtmlBody();

                            let _div = document.createElement("div");
                            _div.dataset.album = dataParser.dataToObject(_albumDataString);
                            _div.setAttribute("id", "album-data-content");
                            _div.setAttribute("data-album", _albumDataString);

                            // Inject the data into the page
                            document.body.appendChild(_div);
                        }
                    }
                    break;
            }
        },
        version: _console.version
    }
})(unsafeWindow.XMLHttpRequest, jQuery);

// This is available after the DOM is completly loaded
document.addEventListener("DOMContentLoaded", saibot.onDomLoaded);

// This fires when really everything is loaded
window.onload = saibot.onDomCompletlyLoaded;

// Here we fire everything that needs to be done before anything else loads
saibot.onPageStart();