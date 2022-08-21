var DEFAULT_TIMEOUT = 60 * 1e3;
var DEFAULT_OAUTH_THRESHOLD = 30 * 1e3;
var __assign = function() {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s)
                if (Object.prototype.hasOwnProperty.call(s, p))
                    t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};

function setDefaults(options) {
    return __assign(__assign({}, options), {
        oauthThreshold: options.oauthThreshold || DEFAULT_OAUTH_THRESHOLD
    });
}
var Config = function() {
    function Config2() {}
    Config2.set = function(options) {
        if (!this.isValid(options)) {
            throw new Error("Configuration is invalid");
        }
        if (options.serverConfig) {
            this.validateServerConfig(options.serverConfig);
        }
        this.options = __assign({}, setDefaults(options));
    };
    Config2.get = function(options) {
        if (!this.options && !options) {
            throw new Error("Configuration has not been set");
        }
        var merged = __assign(__assign({}, this.options), options);
        if (!merged.serverConfig || !merged.serverConfig.baseUrl) {
            throw new Error("Server configuration has not been set");
        }
        return merged;
    };
    Config2.isValid = function(options) {
        return !!(options && options.serverConfig);
    };
    Config2.validateServerConfig = function(serverConfig) {
        if (!serverConfig.timeout) {
            serverConfig.timeout = DEFAULT_TIMEOUT;
        }
        var url = serverConfig.baseUrl;
        if (url && url.charAt(url.length - 1) !== "/") {
            serverConfig.baseUrl = url + "/";
        }
    };
    return Config2;
}();
var ActionTypes;
(function(ActionTypes2) {
    ActionTypes2["Authenticate"] = "AUTHENTICATE";
    ActionTypes2["Authorize"] = "AUTHORIZE";
    ActionTypes2["EndSession"] = "END_SESSION";
    ActionTypes2["Logout"] = "LOGOUT";
    ActionTypes2["ExchangeToken"] = "EXCHANGE_TOKEN";
    ActionTypes2["RefreshToken"] = "REFRESH_TOKEN";
    ActionTypes2["ResumeAuthenticate"] = "RESUME_AUTHENTICATE";
    ActionTypes2["RevokeToken"] = "REVOKE_TOKEN";
    ActionTypes2["StartAuthenticate"] = "START_AUTHENTICATE";
    ActionTypes2["UserInfo"] = "USER_INFO";
})(ActionTypes || (ActionTypes = {}));
var REQUESTED_WITH = "forgerock-sdk";

function withTimeout(promise, timeout) {
    if (timeout === void 0) {
        timeout = DEFAULT_TIMEOUT;
    }
    var effectiveTimeout = timeout || DEFAULT_TIMEOUT;
    var timeoutP = new Promise(function(_, reject) {
        return window.setTimeout(function() {
            return reject(new Error("Timeout"));
        }, effectiveTimeout);
    });
    return Promise.race([promise, timeoutP]);
}

function getRealmUrlPath(realmPath) {
    var names = (realmPath || "").split("/").map(function(x) {
        return x.trim();
    }).filter(function(x) {
        return x !== "";
    });
    if (names[0] !== "root") {
        names.unshift("root");
    }
    var urlPath = names.map(function(x) {
        return "realms/".concat(x);
    }).join("/");
    return urlPath;
}
var __spreadArray = function(to, from, pack) {
    if (pack || arguments.length === 2)
        for (var i = 0, l = from.length, ar; i < l; i++) {
            if (ar || !(i in from)) {
                if (!ar)
                    ar = Array.prototype.slice.call(from, 0, i);
                ar[i] = from[i];
            }
        }
    return to.concat(ar || Array.prototype.slice.call(from));
};

function getBaseUrl(url) {
    var isNonStandardPort = url.protocol === "http:" && ["", "80"].indexOf(url.port) === -1 || url.protocol === "https:" && ["", "443"].indexOf(url.port) === -1;
    var port = isNonStandardPort ? ":".concat(url.port) : "";
    var baseUrl = "".concat(url.protocol, "//").concat(url.hostname).concat(port);
    return baseUrl;
}

function getEndpointPath(endpoint, realmPath, customPaths) {
    var realmUrlPath = getRealmUrlPath(realmPath);
    var defaultPaths = {
        authenticate: "json/".concat(realmUrlPath, "/authenticate"),
        authorize: "oauth2/".concat(realmUrlPath, "/authorize"),
        accessToken: "oauth2/".concat(realmUrlPath, "/access_token"),
        endSession: "oauth2/".concat(realmUrlPath, "/connect/endSession"),
        userInfo: "oauth2/".concat(realmUrlPath, "/userinfo"),
        revoke: "oauth2/".concat(realmUrlPath, "/token/revoke"),
        sessions: "json/".concat(realmUrlPath, "/sessions/")
    };
    if (customPaths && customPaths[endpoint]) {
        return customPaths[endpoint];
    } else {
        return defaultPaths[endpoint];
    }
}

function resolve(baseUrl, path) {
    var url = new URL(baseUrl);
    if (path.startsWith("/")) {
        return "".concat(getBaseUrl(url)).concat(path);
    }
    var basePath = url.pathname.split("/");
    var destPath = path.split("/").filter(function(x) {
        return !!x;
    });
    var newPath = __spreadArray(__spreadArray([], basePath.slice(0, -1), true), destPath, true).join("/");
    return "".concat(getBaseUrl(url)).concat(newPath);
}

function parseQuery(fullUrl) {
    var url = new URL(fullUrl);
    var query = {};
    url.searchParams.forEach(function(v, k) {
        return query[k] = v;
    });
    return query;
}

function stringify(data) {
    var pairs = [];
    for (var k in data) {
        if (data[k]) {
            pairs.push(k + "=" + encodeURIComponent(data[k]));
        }
    }
    return pairs.join("&");
}

function middlewareWrapper(request, _a2) {
    var type = _a2.type,
        payload = _a2.payload;
    var actionCopy = Object.freeze({
        type,
        payload
    });
    return function(middleware) {
        if (!Array.isArray(middleware)) {
            return request;
        }
        var mwareCopy = middleware.map(function(fn) {
            return fn;
        });

        function iterator() {
            var nextMiddlewareToBeCalled = mwareCopy.shift();
            nextMiddlewareToBeCalled && nextMiddlewareToBeCalled(request, actionCopy, iterator);
            return request;
        }
        return iterator();
    };
}
var __assign$1 = function() {
    __assign$1 = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s)
                if (Object.prototype.hasOwnProperty.call(s, p))
                    t[p] = s[p];
        }
        return t;
    };
    return __assign$1.apply(this, arguments);
};
var __awaiter = function(thisArg, _arguments, P, generator) {
    function adopt(value) {
        return value instanceof P ? value : new P(function(resolve2) {
            resolve2(value);
        });
    }
    return new(P || (P = Promise))(function(resolve2, reject) {
        function fulfilled(value) {
            try {
                step(generator.next(value));
            } catch (e) {
                reject(e);
            }
        }

        function rejected(value) {
            try {
                step(generator["throw"](value));
            } catch (e) {
                reject(e);
            }
        }

        function step(result) {
            result.done ? resolve2(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = function(thisArg, body) {
    var _ = {
            label: 0,
            sent: function() {
                if (t[0] & 1)
                    throw t[1];
                return t[1];
            },
            trys: [],
            ops: []
        },
        f, y, t, g;
    return g = {
        next: verb(0),
        throw: verb(1),
        return: verb(2)
    }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
        return this;
    }), g;

    function verb(n) {
        return function(v) {
            return step([n, v]);
        };
    }

    function step(op) {
        if (f)
            throw new TypeError("Generator is already executing.");
        while (_)
            try {
                if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
                    return t;
                if (y = 0, t)
                    op = [op[0] & 2, t.value];
                switch (op[0]) {
                    case 0:
                    case 1:
                        t = op;
                        break;
                    case 4:
                        _.label++;
                        return {
                            value: op[1], done: false
                        };
                    case 5:
                        _.label++;
                        y = op[1];
                        op = [0];
                        continue;
                    case 7:
                        op = _.ops.pop();
                        _.trys.pop();
                        continue;
                    default:
                        if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                            _ = 0;
                            continue;
                        }
                        if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
                            _.label = op[1];
                            break;
                        }
                        if (op[0] === 6 && _.label < t[1]) {
                            _.label = t[1];
                            t = op;
                            break;
                        }
                        if (t && _.label < t[2]) {
                            _.label = t[2];
                            _.ops.push(op);
                            break;
                        }
                        if (t[2])
                            _.ops.pop();
                        _.trys.pop();
                        continue;
                }
                op = body.call(thisArg, _);
            } catch (e) {
                op = [6, e];
                y = 0;
            } finally {
                f = t = 0;
            }
        if (op[0] & 5)
            throw op[1];
        return {
            value: op[0] ? op[1] : void 0,
            done: true
        };
    }
};
var Auth = function() {
    function Auth2() {}
    Auth2.next = function(previousStep, options) {
        return __awaiter(this, void 0, void 0, function() {
            var _a2, middleware, realmPath, serverConfig, tree, type, query, url, runMiddleware, req, res, json;
            return __generator(this, function(_b) {
                switch (_b.label) {
                    case 0:
                        _a2 = Config.get(options), middleware = _a2.middleware, realmPath = _a2.realmPath, serverConfig = _a2.serverConfig, tree = _a2.tree, type = _a2.type;
                        query = options ? options.query : {};
                        url = this.constructUrl(serverConfig, realmPath, tree, query);
                        runMiddleware = middlewareWrapper({
                            url: new URL(url),
                            init: this.configureRequest(previousStep)
                        }, {
                            type: previousStep ? ActionTypes.Authenticate : ActionTypes.StartAuthenticate,
                            payload: {
                                tree,
                                type: type ? type : "service"
                            }
                        });
                        req = runMiddleware(middleware);
                        return [4, withTimeout(fetch(req.url.toString(), req.init), serverConfig.timeout)];
                    case 1:
                        res = _b.sent();
                        return [4, this.getResponseJson(res)];
                    case 2:
                        json = _b.sent();
                        return [2, json];
                }
            });
        });
    };
    Auth2.constructUrl = function(serverConfig, realmPath, tree, query) {
        var treeParams = tree ? {
            authIndexType: "service",
            authIndexValue: tree
        } : void 0;
        var params = __assign$1(__assign$1({}, query), treeParams);
        var queryString = Object.keys(params).length > 0 ? "?".concat(stringify(params)) : "";
        var path = getEndpointPath("authenticate", realmPath, serverConfig.paths);
        var url = resolve(serverConfig.baseUrl, "".concat(path).concat(queryString));
        return url;
    };
    Auth2.configureRequest = function(step) {
        var init = {
            body: step ? JSON.stringify(step) : void 0,
            credentials: "include",
            headers: new Headers({
                accept: "application/json",
                "accept-api-version": "protocol=1.0,resource=2.1",
                "content-type": "application/json",
                "x-requested-with": REQUESTED_WITH
            }),
            method: "POST"
        };
        return init;
    };
    Auth2.getResponseJson = function(res) {
        return __awaiter(this, void 0, void 0, function() {
            var contentType, isJson, json, _a2;
            return __generator(this, function(_b) {
                switch (_b.label) {
                    case 0:
                        contentType = res.headers.get("content-type");
                        isJson = contentType && contentType.indexOf("application/json") > -1;
                        if (!isJson)
                            return [3, 2];
                        return [4, res.json()];
                    case 1:
                        _a2 = _b.sent();
                        return [3, 3];
                    case 2:
                        _a2 = {};
                        _b.label = 3;
                    case 3:
                        json = _a2;
                        json.status = res.status;
                        json.ok = res.ok;
                        return [2, json];
                }
            });
        });
    };
    return Auth2;
}();
var ErrorCode;
(function(ErrorCode2) {
    ErrorCode2["BadRequest"] = "BAD_REQUEST";
    ErrorCode2["Timeout"] = "TIMEOUT";
    ErrorCode2["Unauthorized"] = "UNAUTHORIZED";
    ErrorCode2["Unknown"] = "UNKNOWN";
})(ErrorCode || (ErrorCode = {}));
var CallbackType;
(function(CallbackType2) {
    CallbackType2["BooleanAttributeInputCallback"] = "BooleanAttributeInputCallback";
    CallbackType2["ChoiceCallback"] = "ChoiceCallback";
    CallbackType2["ConfirmationCallback"] = "ConfirmationCallback";
    CallbackType2["DeviceProfileCallback"] = "DeviceProfileCallback";
    CallbackType2["HiddenValueCallback"] = "HiddenValueCallback";
    CallbackType2["KbaCreateCallback"] = "KbaCreateCallback";
    CallbackType2["MetadataCallback"] = "MetadataCallback";
    CallbackType2["NameCallback"] = "NameCallback";
    CallbackType2["NumberAttributeInputCallback"] = "NumberAttributeInputCallback";
    CallbackType2["PasswordCallback"] = "PasswordCallback";
    CallbackType2["PollingWaitCallback"] = "PollingWaitCallback";
    CallbackType2["ReCaptchaCallback"] = "ReCaptchaCallback";
    CallbackType2["RedirectCallback"] = "RedirectCallback";
    CallbackType2["SelectIdPCallback"] = "SelectIdPCallback";
    CallbackType2["StringAttributeInputCallback"] = "StringAttributeInputCallback";
    CallbackType2["SuspendedTextOutputCallback"] = "SuspendedTextOutputCallback";
    CallbackType2["TermsAndConditionsCallback"] = "TermsAndConditionsCallback";
    CallbackType2["TextOutputCallback"] = "TextOutputCallback";
    CallbackType2["ValidatedCreatePasswordCallback"] = "ValidatedCreatePasswordCallback";
    CallbackType2["ValidatedCreateUsernameCallback"] = "ValidatedCreateUsernameCallback";
})(CallbackType || (CallbackType = {}));

function add(container, type, listener) {
    container[type] = container[type] || [];
    if (container[type].indexOf(listener) < 0) {
        container[type].push(listener);
    }
}

function remove(container, type, listener) {
    if (!container[type]) {
        return;
    }
    var index = container[type].indexOf(listener);
    if (index >= 0) {
        container[type].splice(index, 1);
    }
}

function clear(container, type) {
    Object.keys(container).forEach(function(k) {
        if (!type || k === type) {
            delete container[k];
        }
    });
}
var Dispatcher = function() {
    function Dispatcher2() {
        this.callbacks = {};
    }
    Dispatcher2.prototype.addEventListener = function(type, listener) {
        add(this.callbacks, type, listener);
    };
    Dispatcher2.prototype.removeEventListener = function(type, listener) {
        remove(this.callbacks, type, listener);
    };
    Dispatcher2.prototype.clearEventListeners = function(type) {
        clear(this.callbacks, type);
    };
    Dispatcher2.prototype.dispatchEvent = function(event) {
        if (!this.callbacks[event.type]) {
            return;
        }
        for (var _i = 0, _a2 = this.callbacks[event.type]; _i < _a2.length; _i++) {
            var listener = _a2[_i];
            listener(event);
        }
    };
    return Dispatcher2;
}();
var PolicyKey;
(function(PolicyKey2) {
    PolicyKey2["CannotContainCharacters"] = "CANNOT_CONTAIN_CHARACTERS";
    PolicyKey2["CannotContainDuplicates"] = "CANNOT_CONTAIN_DUPLICATES";
    PolicyKey2["CannotContainOthers"] = "CANNOT_CONTAIN_OTHERS";
    PolicyKey2["LeastCapitalLetters"] = "AT_LEAST_X_CAPITAL_LETTERS";
    PolicyKey2["LeastNumbers"] = "AT_LEAST_X_NUMBERS";
    PolicyKey2["MatchRegexp"] = "MATCH_REGEXP";
    PolicyKey2["MaximumLength"] = "MAX_LENGTH";
    PolicyKey2["MaximumNumber"] = "MAXIMUM_NUMBER_VALUE";
    PolicyKey2["MinimumLength"] = "MIN_LENGTH";
    PolicyKey2["MinimumNumber"] = "MINIMUM_NUMBER_VALUE";
    PolicyKey2["Required"] = "REQUIRED";
    PolicyKey2["Unique"] = "UNIQUE";
    PolicyKey2["UnknownPolicy"] = "UNKNOWN_POLICY";
    PolicyKey2["ValidArrayItems"] = "VALID_ARRAY_ITEMS";
    PolicyKey2["ValidDate"] = "VALID_DATE";
    PolicyKey2["ValidEmailAddress"] = "VALID_EMAIL_ADDRESS_FORMAT";
    PolicyKey2["ValidNameFormat"] = "VALID_NAME_FORMAT";
    PolicyKey2["ValidNumber"] = "VALID_NUMBER";
    PolicyKey2["ValidPhoneFormat"] = "VALID_PHONE_FORMAT";
    PolicyKey2["ValidQueryFilter"] = "VALID_QUERY_FILTER";
    PolicyKey2["ValidType"] = "VALID_TYPE";
})(PolicyKey || (PolicyKey = {}));

function plural(n, singularText, pluralText) {
    if (n === 1) {
        return singularText;
    }
    return pluralText !== void 0 ? pluralText : singularText + "s";
}

function getProp(obj, prop, defaultValue) {
    if (!obj || obj[prop] === void 0) {
        return defaultValue;
    }
    return obj[prop];
}
var _a;
var defaultMessageCreator = (_a = {}, _a[PolicyKey.CannotContainCharacters] = function(property, params) {
    var forbiddenChars = getProp(params, "forbiddenChars", "");
    return "".concat(property, ' must not contain following characters: "').concat(forbiddenChars, '"');
}, _a[PolicyKey.CannotContainDuplicates] = function(property, params) {
    var duplicateValue = getProp(params, "duplicateValue", "");
    return "".concat(property, '  must not contain duplicates: "').concat(duplicateValue, '"');
}, _a[PolicyKey.CannotContainOthers] = function(property, params) {
    var disallowedFields = getProp(params, "disallowedFields", "");
    return "".concat(property, ' must not contain: "').concat(disallowedFields, '"');
}, _a[PolicyKey.LeastCapitalLetters] = function(property, params) {
    var numCaps = getProp(params, "numCaps", 0);
    return "".concat(property, " must contain at least ").concat(numCaps, " capital ").concat(plural(numCaps, "letter"));
}, _a[PolicyKey.LeastNumbers] = function(property, params) {
    var numNums = getProp(params, "numNums", 0);
    return "".concat(property, " must contain at least ").concat(numNums, " numeric ").concat(plural(numNums, "value"));
}, _a[PolicyKey.MatchRegexp] = function(property) {
    return "".concat(property, ' has failed the "MATCH_REGEXP" policy');
}, _a[PolicyKey.MaximumLength] = function(property, params) {
    var maxLength = getProp(params, "maxLength", 0);
    return "".concat(property, " must be at most ").concat(maxLength, " ").concat(plural(maxLength, "character"));
}, _a[PolicyKey.MaximumNumber] = function(property) {
    return "".concat(property, ' has failed the "MAXIMUM_NUMBER_VALUE" policy');
}, _a[PolicyKey.MinimumLength] = function(property, params) {
    var minLength = getProp(params, "minLength", 0);
    return "".concat(property, " must be at least ").concat(minLength, " ").concat(plural(minLength, "character"));
}, _a[PolicyKey.MinimumNumber] = function(property) {
    return "".concat(property, ' has failed the "MINIMUM_NUMBER_VALUE" policy');
}, _a[PolicyKey.Required] = function(property) {
    return "".concat(property, " is required");
}, _a[PolicyKey.Unique] = function(property) {
    return "".concat(property, " must be unique");
}, _a[PolicyKey.UnknownPolicy] = function(property, params) {
    var policyRequirement = getProp(params, "policyRequirement", "Unknown");
    return "".concat(property, ': Unknown policy requirement "').concat(policyRequirement, '"');
}, _a[PolicyKey.ValidArrayItems] = function(property) {
    return "".concat(property, ' has failed the "VALID_ARRAY_ITEMS" policy');
}, _a[PolicyKey.ValidDate] = function(property) {
    return "".concat(property, " has an invalid date");
}, _a[PolicyKey.ValidEmailAddress] = function(property) {
    return "".concat(property, " has an invalid email address");
}, _a[PolicyKey.ValidNameFormat] = function(property) {
    return "".concat(property, " has an invalid name format");
}, _a[PolicyKey.ValidNumber] = function(property) {
    return "".concat(property, " has an invalid number");
}, _a[PolicyKey.ValidPhoneFormat] = function(property) {
    return "".concat(property, " has an invalid phone number");
}, _a[PolicyKey.ValidQueryFilter] = function(property) {
    return "".concat(property, ' has failed the "VALID_QUERY_FILTER" policy');
}, _a[PolicyKey.ValidType] = function(property) {
    return "".concat(property, ' has failed the "VALID_TYPE" policy');
}, _a);
var __assign$2 = function() {
    __assign$2 = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s)
                if (Object.prototype.hasOwnProperty.call(s, p))
                    t[p] = s[p];
        }
        return t;
    };
    return __assign$2.apply(this, arguments);
};
var FRPolicy = function() {
    function FRPolicy2() {}
    FRPolicy2.parseErrors = function(err, messageCreator) {
        var _this = this;
        var errors = [];
        if (err.detail && err.detail.failedPolicyRequirements) {
            err.detail.failedPolicyRequirements.map(function(x) {
                errors.push.apply(errors, [{
                    detail: x,
                    messages: _this.parseFailedPolicyRequirement(x, messageCreator)
                }]);
            });
        }
        return errors;
    };
    FRPolicy2.parseFailedPolicyRequirement = function(failedPolicy, messageCreator) {
        var _this = this;
        var errors = [];
        failedPolicy.policyRequirements.map(function(policyRequirement) {
            errors.push(_this.parsePolicyRequirement(failedPolicy.property, policyRequirement, messageCreator));
        });
        return errors;
    };
    FRPolicy2.parsePolicyRequirement = function(property, policy, messageCreator) {
        if (messageCreator === void 0) {
            messageCreator = {};
        }
        var policyObject = typeof policy === "string" ? JSON.parse(policy) : __assign$2({}, policy);
        var policyRequirement = policyObject.policyRequirement;
        var effectiveMessageCreator = messageCreator[policyRequirement] || defaultMessageCreator[policyRequirement] || defaultMessageCreator[PolicyKey.UnknownPolicy];
        var params = policyObject.params ? __assign$2(__assign$2({}, policyObject.params), {
            policyRequirement
        }) : {
            policyRequirement
        };
        var message = effectiveMessageCreator(property, params);
        return message;
    };
    return FRPolicy2;
}();
var StepType;
(function(StepType2) {
    StepType2["LoginFailure"] = "LoginFailure";
    StepType2["LoginSuccess"] = "LoginSuccess";
    StepType2["Step"] = "Step";
})(StepType || (StepType = {}));
var FRLoginFailure = function() {
    function FRLoginFailure2(payload) {
        this.payload = payload;
        this.type = StepType.LoginFailure;
    }
    FRLoginFailure2.prototype.getCode = function() {
        return Number(this.payload.code);
    };
    FRLoginFailure2.prototype.getDetail = function() {
        return this.payload.detail;
    };
    FRLoginFailure2.prototype.getMessage = function() {
        return this.payload.message;
    };
    FRLoginFailure2.prototype.getProcessedMessage = function(messageCreator) {
        return FRPolicy.parseErrors(this.payload, messageCreator);
    };
    FRLoginFailure2.prototype.getReason = function() {
        return this.payload.reason;
    };
    return FRLoginFailure2;
}();
var FRLoginSuccess = function() {
    function FRLoginSuccess2(payload) {
        this.payload = payload;
        this.type = StepType.LoginSuccess;
    }
    FRLoginSuccess2.prototype.getRealm = function() {
        return this.payload.realm;
    };
    FRLoginSuccess2.prototype.getSessionToken = function() {
        return this.payload.tokenId;
    };
    FRLoginSuccess2.prototype.getSuccessUrl = function() {
        return this.payload.successUrl;
    };
    return FRLoginSuccess2;
}();
var FRCallback = function() {
    function FRCallback2(payload) {
        this.payload = payload;
    }
    FRCallback2.prototype.getType = function() {
        return this.payload.type;
    };
    FRCallback2.prototype.getInputValue = function(selector) {
        if (selector === void 0) {
            selector = 0;
        }
        return this.getArrayElement(this.payload.input, selector).value;
    };
    FRCallback2.prototype.setInputValue = function(value, selector) {
        if (selector === void 0) {
            selector = 0;
        }
        this.getArrayElement(this.payload.input, selector).value = value;
    };
    FRCallback2.prototype.getOutputValue = function(selector) {
        if (selector === void 0) {
            selector = 0;
        }
        return this.getArrayElement(this.payload.output, selector).value;
    };
    FRCallback2.prototype.getOutputByName = function(name, defaultValue) {
        var output = this.payload.output.find(function(x) {
            return x.name === name;
        });
        return output ? output.value : defaultValue;
    };
    FRCallback2.prototype.getArrayElement = function(array, selector) {
        if (selector === void 0) {
            selector = 0;
        }
        if (array === void 0) {
            throw new Error("No NameValue array was provided to search (selector ".concat(selector, ")"));
        }
        if (typeof selector === "number") {
            if (selector < 0 || selector > array.length - 1) {
                throw new Error("Selector index ".concat(selector, " is out of range"));
            }
            return array[selector];
        }
        if (typeof selector === "string") {
            var input = array.find(function(x) {
                return x.name === selector;
            });
            if (!input) {
                throw new Error('Missing callback input entry "'.concat(selector, '"'));
            }
            return input;
        }
        if (typeof selector === "object" && selector.test && selector.exec) {
            var input = array.find(function(x) {
                return selector.test(x.name);
            });
            if (!input) {
                throw new Error('Missing callback input entry "'.concat(selector, '"'));
            }
            return input;
        }
        throw new Error("Invalid selector value type");
    };
    return FRCallback2;
}();
var __extends = function() {
    var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf || {
                __proto__: []
            }
            instanceof Array && function(d2, b2) {
                d2.__proto__ = b2;
            } || function(d2, b2) {
                for (var p in b2)
                    if (Object.prototype.hasOwnProperty.call(b2, p))
                        d2[p] = b2[p];
            };
        return extendStatics(d, b);
    };
    return function(d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);

        function __() {
            this.constructor = d;
        }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
}();
var AttributeInputCallback = function(_super) {
    __extends(AttributeInputCallback2, _super);

    function AttributeInputCallback2(payload) {
        var _this = _super.call(this, payload) || this;
        _this.payload = payload;
        return _this;
    }
    AttributeInputCallback2.prototype.getName = function() {
        return this.getOutputByName("name", "");
    };
    AttributeInputCallback2.prototype.getPrompt = function() {
        return this.getOutputByName("prompt", "");
    };
    AttributeInputCallback2.prototype.isRequired = function() {
        return this.getOutputByName("required", false);
    };
    AttributeInputCallback2.prototype.getFailedPolicies = function() {
        return this.getOutputByName("failedPolicies", []);
    };
    AttributeInputCallback2.prototype.getPolicies = function() {
        return this.getOutputByName("policies", {});
    };
    AttributeInputCallback2.prototype.setValidateOnly = function(value) {
        this.setInputValue(value, /validateOnly/);
    };
    AttributeInputCallback2.prototype.setValue = function(value) {
        this.setInputValue(value);
    };
    return AttributeInputCallback2;
}(FRCallback);
var __extends$1 = function() {
    var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf || {
                __proto__: []
            }
            instanceof Array && function(d2, b2) {
                d2.__proto__ = b2;
            } || function(d2, b2) {
                for (var p in b2)
                    if (Object.prototype.hasOwnProperty.call(b2, p))
                        d2[p] = b2[p];
            };
        return extendStatics(d, b);
    };
    return function(d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);

        function __() {
            this.constructor = d;
        }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
}();
var ChoiceCallback = function(_super) {
    __extends$1(ChoiceCallback2, _super);

    function ChoiceCallback2(payload) {
        var _this = _super.call(this, payload) || this;
        _this.payload = payload;
        return _this;
    }
    ChoiceCallback2.prototype.getPrompt = function() {
        return this.getOutputByName("prompt", "");
    };
    ChoiceCallback2.prototype.getDefaultChoice = function() {
        return this.getOutputByName("defaultChoice", 0);
    };
    ChoiceCallback2.prototype.getChoices = function() {
        return this.getOutputByName("choices", []);
    };
    ChoiceCallback2.prototype.setChoiceIndex = function(index) {
        var length = this.getChoices().length;
        if (index < 0 || index > length - 1) {
            throw new Error("".concat(index, " is out of bounds"));
        }
        this.setInputValue(index);
    };
    ChoiceCallback2.prototype.setChoiceValue = function(value) {
        var index = this.getChoices().indexOf(value);
        if (index === -1) {
            throw new Error('"'.concat(value, '" is not a valid choice'));
        }
        this.setInputValue(index);
    };
    return ChoiceCallback2;
}(FRCallback);
var __extends$2 = function() {
    var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf || {
                __proto__: []
            }
            instanceof Array && function(d2, b2) {
                d2.__proto__ = b2;
            } || function(d2, b2) {
                for (var p in b2)
                    if (Object.prototype.hasOwnProperty.call(b2, p))
                        d2[p] = b2[p];
            };
        return extendStatics(d, b);
    };
    return function(d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);

        function __() {
            this.constructor = d;
        }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
}();
var ConfirmationCallback = function(_super) {
    __extends$2(ConfirmationCallback2, _super);

    function ConfirmationCallback2(payload) {
        var _this = _super.call(this, payload) || this;
        _this.payload = payload;
        return _this;
    }
    ConfirmationCallback2.prototype.getDefaultOption = function() {
        return Number(this.getOutputByName("defaultOption", 0));
    };
    ConfirmationCallback2.prototype.getMessageType = function() {
        return Number(this.getOutputByName("messageType", 0));
    };
    ConfirmationCallback2.prototype.getOptions = function() {
        return this.getOutputByName("options", []);
    };
    ConfirmationCallback2.prototype.getOptionType = function() {
        return Number(this.getOutputByName("optionType", 0));
    };
    ConfirmationCallback2.prototype.getPrompt = function() {
        return this.getOutputByName("prompt", "");
    };
    ConfirmationCallback2.prototype.setOptionIndex = function(index) {
        if (index !== 0 && index !== 1) {
            throw new Error('"'.concat(index, '" is not a valid choice'));
        }
        this.setInputValue(index);
    };
    ConfirmationCallback2.prototype.setOptionValue = function(value) {
        var index = this.getOptions().indexOf(value);
        if (index === -1) {
            throw new Error('"'.concat(value, '" is not a valid choice'));
        }
        this.setInputValue(index);
    };
    return ConfirmationCallback2;
}(FRCallback);
var __extends$3 = function() {
    var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf || {
                __proto__: []
            }
            instanceof Array && function(d2, b2) {
                d2.__proto__ = b2;
            } || function(d2, b2) {
                for (var p in b2)
                    if (Object.prototype.hasOwnProperty.call(b2, p))
                        d2[p] = b2[p];
            };
        return extendStatics(d, b);
    };
    return function(d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);

        function __() {
            this.constructor = d;
        }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
}();
var DeviceProfileCallback = function(_super) {
    __extends$3(DeviceProfileCallback2, _super);

    function DeviceProfileCallback2(payload) {
        var _this = _super.call(this, payload) || this;
        _this.payload = payload;
        return _this;
    }
    DeviceProfileCallback2.prototype.getMessage = function() {
        return this.getOutputByName("message", "");
    };
    DeviceProfileCallback2.prototype.isMetadataRequired = function() {
        return this.getOutputByName("metadata", false);
    };
    DeviceProfileCallback2.prototype.isLocationRequired = function() {
        return this.getOutputByName("location", false);
    };
    DeviceProfileCallback2.prototype.setProfile = function(profile) {
        this.setInputValue(JSON.stringify(profile));
    };
    return DeviceProfileCallback2;
}(FRCallback);
var __extends$4 = function() {
    var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf || {
                __proto__: []
            }
            instanceof Array && function(d2, b2) {
                d2.__proto__ = b2;
            } || function(d2, b2) {
                for (var p in b2)
                    if (Object.prototype.hasOwnProperty.call(b2, p))
                        d2[p] = b2[p];
            };
        return extendStatics(d, b);
    };
    return function(d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);

        function __() {
            this.constructor = d;
        }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
}();
var HiddenValueCallback = function(_super) {
    __extends$4(HiddenValueCallback2, _super);

    function HiddenValueCallback2(payload) {
        var _this = _super.call(this, payload) || this;
        _this.payload = payload;
        return _this;
    }
    return HiddenValueCallback2;
}(FRCallback);
var __extends$5 = function() {
    var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf || {
                __proto__: []
            }
            instanceof Array && function(d2, b2) {
                d2.__proto__ = b2;
            } || function(d2, b2) {
                for (var p in b2)
                    if (Object.prototype.hasOwnProperty.call(b2, p))
                        d2[p] = b2[p];
            };
        return extendStatics(d, b);
    };
    return function(d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);

        function __() {
            this.constructor = d;
        }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
}();
var KbaCreateCallback = function(_super) {
    __extends$5(KbaCreateCallback2, _super);

    function KbaCreateCallback2(payload) {
        var _this = _super.call(this, payload) || this;
        _this.payload = payload;
        return _this;
    }
    KbaCreateCallback2.prototype.getPrompt = function() {
        return this.getOutputByName("prompt", "");
    };
    KbaCreateCallback2.prototype.getPredefinedQuestions = function() {
        return this.getOutputByName("predefinedQuestions", []);
    };
    KbaCreateCallback2.prototype.setQuestion = function(question) {
        this.setValue("question", question);
    };
    KbaCreateCallback2.prototype.setAnswer = function(answer) {
        this.setValue("answer", answer);
    };
    KbaCreateCallback2.prototype.setValue = function(type, value) {
        if (!this.payload.input) {
            throw new Error("KBA payload is missing input");
        }
        var input = this.payload.input.find(function(x) {
            return x.name.endsWith(type);
        });
        if (!input) {
            throw new Error('No input has name ending in "'.concat(type, '"'));
        }
        input.value = value;
    };
    return KbaCreateCallback2;
}(FRCallback);
var __extends$6 = function() {
    var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf || {
                __proto__: []
            }
            instanceof Array && function(d2, b2) {
                d2.__proto__ = b2;
            } || function(d2, b2) {
                for (var p in b2)
                    if (Object.prototype.hasOwnProperty.call(b2, p))
                        d2[p] = b2[p];
            };
        return extendStatics(d, b);
    };
    return function(d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);

        function __() {
            this.constructor = d;
        }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
}();
var MetadataCallback = function(_super) {
    __extends$6(MetadataCallback2, _super);

    function MetadataCallback2(payload) {
        var _this = _super.call(this, payload) || this;
        _this.payload = payload;
        return _this;
    }
    MetadataCallback2.prototype.getData = function() {
        return this.getOutputByName("data", {});
    };
    return MetadataCallback2;
}(FRCallback);
var __extends$7 = function() {
    var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf || {
                __proto__: []
            }
            instanceof Array && function(d2, b2) {
                d2.__proto__ = b2;
            } || function(d2, b2) {
                for (var p in b2)
                    if (Object.prototype.hasOwnProperty.call(b2, p))
                        d2[p] = b2[p];
            };
        return extendStatics(d, b);
    };
    return function(d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);

        function __() {
            this.constructor = d;
        }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
}();
var NameCallback = function(_super) {
    __extends$7(NameCallback2, _super);

    function NameCallback2(payload) {
        var _this = _super.call(this, payload) || this;
        _this.payload = payload;
        return _this;
    }
    NameCallback2.prototype.getPrompt = function() {
        return this.getOutputByName("prompt", "");
    };
    NameCallback2.prototype.setName = function(name) {
        this.setInputValue(name);
    };
    return NameCallback2;
}(FRCallback);
var __extends$8 = function() {
    var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf || {
                __proto__: []
            }
            instanceof Array && function(d2, b2) {
                d2.__proto__ = b2;
            } || function(d2, b2) {
                for (var p in b2)
                    if (Object.prototype.hasOwnProperty.call(b2, p))
                        d2[p] = b2[p];
            };
        return extendStatics(d, b);
    };
    return function(d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);

        function __() {
            this.constructor = d;
        }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
}();
var PasswordCallback = function(_super) {
    __extends$8(PasswordCallback2, _super);

    function PasswordCallback2(payload) {
        var _this = _super.call(this, payload) || this;
        _this.payload = payload;
        return _this;
    }
    PasswordCallback2.prototype.getFailedPolicies = function() {
        return this.getOutputByName("failedPolicies", []);
    };
    PasswordCallback2.prototype.getPolicies = function() {
        return this.getOutputByName("policies", []);
    };
    PasswordCallback2.prototype.getPrompt = function() {
        return this.getOutputByName("prompt", "");
    };
    PasswordCallback2.prototype.setPassword = function(password) {
        this.setInputValue(password);
    };
    return PasswordCallback2;
}(FRCallback);
var __extends$9 = function() {
    var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf || {
                __proto__: []
            }
            instanceof Array && function(d2, b2) {
                d2.__proto__ = b2;
            } || function(d2, b2) {
                for (var p in b2)
                    if (Object.prototype.hasOwnProperty.call(b2, p))
                        d2[p] = b2[p];
            };
        return extendStatics(d, b);
    };
    return function(d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);

        function __() {
            this.constructor = d;
        }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
}();
var PollingWaitCallback = function(_super) {
    __extends$9(PollingWaitCallback2, _super);

    function PollingWaitCallback2(payload) {
        var _this = _super.call(this, payload) || this;
        _this.payload = payload;
        return _this;
    }
    PollingWaitCallback2.prototype.getMessage = function() {
        return this.getOutputByName("message", "");
    };
    PollingWaitCallback2.prototype.getWaitTime = function() {
        return Number(this.getOutputByName("waitTime", 0));
    };
    return PollingWaitCallback2;
}(FRCallback);
var __extends$a = function() {
    var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf || {
                __proto__: []
            }
            instanceof Array && function(d2, b2) {
                d2.__proto__ = b2;
            } || function(d2, b2) {
                for (var p in b2)
                    if (Object.prototype.hasOwnProperty.call(b2, p))
                        d2[p] = b2[p];
            };
        return extendStatics(d, b);
    };
    return function(d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);

        function __() {
            this.constructor = d;
        }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
}();
var ReCaptchaCallback = function(_super) {
    __extends$a(ReCaptchaCallback2, _super);

    function ReCaptchaCallback2(payload) {
        var _this = _super.call(this, payload) || this;
        _this.payload = payload;
        return _this;
    }
    ReCaptchaCallback2.prototype.getSiteKey = function() {
        return this.getOutputByName("recaptchaSiteKey", "");
    };
    ReCaptchaCallback2.prototype.setResult = function(result) {
        this.setInputValue(result);
    };
    return ReCaptchaCallback2;
}(FRCallback);
var __extends$b = function() {
    var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf || {
                __proto__: []
            }
            instanceof Array && function(d2, b2) {
                d2.__proto__ = b2;
            } || function(d2, b2) {
                for (var p in b2)
                    if (Object.prototype.hasOwnProperty.call(b2, p))
                        d2[p] = b2[p];
            };
        return extendStatics(d, b);
    };
    return function(d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);

        function __() {
            this.constructor = d;
        }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
}();
var RedirectCallback = function(_super) {
    __extends$b(RedirectCallback2, _super);

    function RedirectCallback2(payload) {
        var _this = _super.call(this, payload) || this;
        _this.payload = payload;
        return _this;
    }
    RedirectCallback2.prototype.getRedirectUrl = function() {
        return this.getOutputByName("redirectUrl", "");
    };
    return RedirectCallback2;
}(FRCallback);
var __extends$c = function() {
    var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf || {
                __proto__: []
            }
            instanceof Array && function(d2, b2) {
                d2.__proto__ = b2;
            } || function(d2, b2) {
                for (var p in b2)
                    if (Object.prototype.hasOwnProperty.call(b2, p))
                        d2[p] = b2[p];
            };
        return extendStatics(d, b);
    };
    return function(d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);

        function __() {
            this.constructor = d;
        }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
}();
var SelectIdPCallback = function(_super) {
    __extends$c(SelectIdPCallback2, _super);

    function SelectIdPCallback2(payload) {
        var _this = _super.call(this, payload) || this;
        _this.payload = payload;
        return _this;
    }
    SelectIdPCallback2.prototype.getProviders = function() {
        return this.getOutputByName("providers", []);
    };
    SelectIdPCallback2.prototype.setProvider = function(value) {
        var item = this.getProviders().find(function(item2) {
            return item2.provider === value;
        });
        if (!item) {
            throw new Error('"'.concat(value, '" is not a valid choice'));
        }
        this.setInputValue(item.provider);
    };
    return SelectIdPCallback2;
}(FRCallback);
var __extends$d = function() {
    var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf || {
                __proto__: []
            }
            instanceof Array && function(d2, b2) {
                d2.__proto__ = b2;
            } || function(d2, b2) {
                for (var p in b2)
                    if (Object.prototype.hasOwnProperty.call(b2, p))
                        d2[p] = b2[p];
            };
        return extendStatics(d, b);
    };
    return function(d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);

        function __() {
            this.constructor = d;
        }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
}();
var TextOutputCallback = function(_super) {
    __extends$d(TextOutputCallback2, _super);

    function TextOutputCallback2(payload) {
        var _this = _super.call(this, payload) || this;
        _this.payload = payload;
        return _this;
    }
    TextOutputCallback2.prototype.getMessage = function() {
        return this.getOutputByName("message", "");
    };
    TextOutputCallback2.prototype.getMessageType = function() {
        return this.getOutputByName("messageType", "");
    };
    return TextOutputCallback2;
}(FRCallback);
var __extends$e = function() {
    var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf || {
                __proto__: []
            }
            instanceof Array && function(d2, b2) {
                d2.__proto__ = b2;
            } || function(d2, b2) {
                for (var p in b2)
                    if (Object.prototype.hasOwnProperty.call(b2, p))
                        d2[p] = b2[p];
            };
        return extendStatics(d, b);
    };
    return function(d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);

        function __() {
            this.constructor = d;
        }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
}();
var SuspendedTextOutputCallback = function(_super) {
    __extends$e(SuspendedTextOutputCallback2, _super);

    function SuspendedTextOutputCallback2(payload) {
        var _this = _super.call(this, payload) || this;
        _this.payload = payload;
        return _this;
    }
    return SuspendedTextOutputCallback2;
}(TextOutputCallback);
var __extends$f = function() {
    var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf || {
                __proto__: []
            }
            instanceof Array && function(d2, b2) {
                d2.__proto__ = b2;
            } || function(d2, b2) {
                for (var p in b2)
                    if (Object.prototype.hasOwnProperty.call(b2, p))
                        d2[p] = b2[p];
            };
        return extendStatics(d, b);
    };
    return function(d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);

        function __() {
            this.constructor = d;
        }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
}();
var TermsAndConditionsCallback = function(_super) {
    __extends$f(TermsAndConditionsCallback2, _super);

    function TermsAndConditionsCallback2(payload) {
        var _this = _super.call(this, payload) || this;
        _this.payload = payload;
        return _this;
    }
    TermsAndConditionsCallback2.prototype.getTerms = function() {
        return this.getOutputByName("terms", "");
    };
    TermsAndConditionsCallback2.prototype.getVersion = function() {
        return this.getOutputByName("version", "");
    };
    TermsAndConditionsCallback2.prototype.getCreateDate = function() {
        var date = this.getOutputByName("createDate", "");
        return new Date(date);
    };
    TermsAndConditionsCallback2.prototype.setAccepted = function(accepted) {
        if (accepted === void 0) {
            accepted = true;
        }
        this.setInputValue(accepted);
    };
    return TermsAndConditionsCallback2;
}(FRCallback);
var __extends$g = function() {
    var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf || {
                __proto__: []
            }
            instanceof Array && function(d2, b2) {
                d2.__proto__ = b2;
            } || function(d2, b2) {
                for (var p in b2)
                    if (Object.prototype.hasOwnProperty.call(b2, p))
                        d2[p] = b2[p];
            };
        return extendStatics(d, b);
    };
    return function(d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);

        function __() {
            this.constructor = d;
        }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
}();
var ValidatedCreatePasswordCallback = function(_super) {
    __extends$g(ValidatedCreatePasswordCallback2, _super);

    function ValidatedCreatePasswordCallback2(payload) {
        var _this = _super.call(this, payload) || this;
        _this.payload = payload;
        return _this;
    }
    ValidatedCreatePasswordCallback2.prototype.getFailedPolicies = function() {
        return this.getOutputByName("failedPolicies", []);
    };
    ValidatedCreatePasswordCallback2.prototype.getPolicies = function() {
        return this.getOutputByName("policies", {});
    };
    ValidatedCreatePasswordCallback2.prototype.getPrompt = function() {
        return this.getOutputByName("prompt", "");
    };
    ValidatedCreatePasswordCallback2.prototype.isRequired = function() {
        return this.getOutputByName("required", false);
    };
    ValidatedCreatePasswordCallback2.prototype.setPassword = function(password) {
        this.setInputValue(password);
    };
    ValidatedCreatePasswordCallback2.prototype.setValidateOnly = function(value) {
        this.setInputValue(value, /validateOnly/);
    };
    return ValidatedCreatePasswordCallback2;
}(FRCallback);
var __extends$h = function() {
    var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf || {
                __proto__: []
            }
            instanceof Array && function(d2, b2) {
                d2.__proto__ = b2;
            } || function(d2, b2) {
                for (var p in b2)
                    if (Object.prototype.hasOwnProperty.call(b2, p))
                        d2[p] = b2[p];
            };
        return extendStatics(d, b);
    };
    return function(d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);

        function __() {
            this.constructor = d;
        }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
}();
var ValidatedCreateUsernameCallback = function(_super) {
    __extends$h(ValidatedCreateUsernameCallback2, _super);

    function ValidatedCreateUsernameCallback2(payload) {
        var _this = _super.call(this, payload) || this;
        _this.payload = payload;
        return _this;
    }
    ValidatedCreateUsernameCallback2.prototype.getPrompt = function() {
        return this.getOutputByName("prompt", "");
    };
    ValidatedCreateUsernameCallback2.prototype.getFailedPolicies = function() {
        return this.getOutputByName("failedPolicies", []);
    };
    ValidatedCreateUsernameCallback2.prototype.getPolicies = function() {
        return this.getOutputByName("policies", {});
    };
    ValidatedCreateUsernameCallback2.prototype.isRequired = function() {
        return this.getOutputByName("required", false);
    };
    ValidatedCreateUsernameCallback2.prototype.setName = function(name) {
        this.setInputValue(name);
    };
    ValidatedCreateUsernameCallback2.prototype.setValidateOnly = function(value) {
        this.setInputValue(value, /validateOnly/);
    };
    return ValidatedCreateUsernameCallback2;
}(FRCallback);

function createCallback(callback) {
    switch (callback.type) {
        case CallbackType.BooleanAttributeInputCallback:
            return new AttributeInputCallback(callback);
        case CallbackType.ChoiceCallback:
            return new ChoiceCallback(callback);
        case CallbackType.ConfirmationCallback:
            return new ConfirmationCallback(callback);
        case CallbackType.DeviceProfileCallback:
            return new DeviceProfileCallback(callback);
        case CallbackType.HiddenValueCallback:
            return new HiddenValueCallback(callback);
        case CallbackType.KbaCreateCallback:
            return new KbaCreateCallback(callback);
        case CallbackType.MetadataCallback:
            return new MetadataCallback(callback);
        case CallbackType.NameCallback:
            return new NameCallback(callback);
        case CallbackType.NumberAttributeInputCallback:
            return new AttributeInputCallback(callback);
        case CallbackType.PasswordCallback:
            return new PasswordCallback(callback);
        case CallbackType.PollingWaitCallback:
            return new PollingWaitCallback(callback);
        case CallbackType.ReCaptchaCallback:
            return new ReCaptchaCallback(callback);
        case CallbackType.RedirectCallback:
            return new RedirectCallback(callback);
        case CallbackType.SelectIdPCallback:
            return new SelectIdPCallback(callback);
        case CallbackType.StringAttributeInputCallback:
            return new AttributeInputCallback(callback);
        case CallbackType.SuspendedTextOutputCallback:
            return new SuspendedTextOutputCallback(callback);
        case CallbackType.TermsAndConditionsCallback:
            return new TermsAndConditionsCallback(callback);
        case CallbackType.TextOutputCallback:
            return new TextOutputCallback(callback);
        case CallbackType.ValidatedCreatePasswordCallback:
            return new ValidatedCreatePasswordCallback(callback);
        case CallbackType.ValidatedCreateUsernameCallback:
            return new ValidatedCreateUsernameCallback(callback);
        default:
            return new FRCallback(callback);
    }
}
var FRStep = function() {
    function FRStep2(payload, callbackFactory) {
        this.payload = payload;
        this.type = StepType.Step;
        this.callbacks = [];
        if (payload.callbacks) {
            this.callbacks = this.convertCallbacks(payload.callbacks, callbackFactory);
        }
    }
    FRStep2.prototype.getCallbackOfType = function(type) {
        var callbacks = this.getCallbacksOfType(type);
        if (callbacks.length !== 1) {
            throw new Error('Expected 1 callback of type "'.concat(type, '", but found ').concat(callbacks.length));
        }
        return callbacks[0];
    };
    FRStep2.prototype.getCallbacksOfType = function(type) {
        return this.callbacks.filter(function(x) {
            return x.getType() === type;
        });
    };
    FRStep2.prototype.setCallbackValue = function(type, value) {
        var callbacks = this.getCallbacksOfType(type);
        if (callbacks.length !== 1) {
            throw new Error('Expected 1 callback of type "'.concat(type, '", but found ').concat(callbacks.length));
        }
        callbacks[0].setInputValue(value);
    };
    FRStep2.prototype.getDescription = function() {
        return this.payload.description;
    };
    FRStep2.prototype.getHeader = function() {
        return this.payload.header;
    };
    FRStep2.prototype.getStage = function() {
        return this.payload.stage;
    };
    FRStep2.prototype.convertCallbacks = function(callbacks, callbackFactory) {
        var converted = callbacks.map(function(x) {
            return (callbackFactory || createCallback)(x) || createCallback(x);
        });
        return converted;
    };
    return FRStep2;
}();
var __assign$3 = function() {
    __assign$3 = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s)
                if (Object.prototype.hasOwnProperty.call(s, p))
                    t[p] = s[p];
        }
        return t;
    };
    return __assign$3.apply(this, arguments);
};
var __awaiter$1 = function(thisArg, _arguments, P, generator) {
    function adopt(value) {
        return value instanceof P ? value : new P(function(resolve2) {
            resolve2(value);
        });
    }
    return new(P || (P = Promise))(function(resolve2, reject) {
        function fulfilled(value) {
            try {
                step(generator.next(value));
            } catch (e) {
                reject(e);
            }
        }

        function rejected(value) {
            try {
                step(generator["throw"](value));
            } catch (e) {
                reject(e);
            }
        }

        function step(result) {
            result.done ? resolve2(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator$1 = function(thisArg, body) {
    var _ = {
            label: 0,
            sent: function() {
                if (t[0] & 1)
                    throw t[1];
                return t[1];
            },
            trys: [],
            ops: []
        },
        f, y, t, g;
    return g = {
        next: verb(0),
        throw: verb(1),
        return: verb(2)
    }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
        return this;
    }), g;

    function verb(n) {
        return function(v) {
            return step([n, v]);
        };
    }

    function step(op) {
        if (f)
            throw new TypeError("Generator is already executing.");
        while (_)
            try {
                if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
                    return t;
                if (y = 0, t)
                    op = [op[0] & 2, t.value];
                switch (op[0]) {
                    case 0:
                    case 1:
                        t = op;
                        break;
                    case 4:
                        _.label++;
                        return {
                            value: op[1], done: false
                        };
                    case 5:
                        _.label++;
                        y = op[1];
                        op = [0];
                        continue;
                    case 7:
                        op = _.ops.pop();
                        _.trys.pop();
                        continue;
                    default:
                        if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                            _ = 0;
                            continue;
                        }
                        if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
                            _.label = op[1];
                            break;
                        }
                        if (op[0] === 6 && _.label < t[1]) {
                            _.label = t[1];
                            t = op;
                            break;
                        }
                        if (t && _.label < t[2]) {
                            _.label = t[2];
                            _.ops.push(op);
                            break;
                        }
                        if (t[2])
                            _.ops.pop();
                        _.trys.pop();
                        continue;
                }
                op = body.call(thisArg, _);
            } catch (e) {
                op = [6, e];
                y = 0;
            } finally {
                f = t = 0;
            }
        if (op[0] & 5)
            throw op[1];
        return {
            value: op[0] ? op[1] : void 0,
            done: true
        };
    }
};
var FRAuth = function() {
    function FRAuth2() {}
    FRAuth2.next = function(previousStep, options) {
        return __awaiter$1(this, void 0, void 0, function() {
            var nextPayload, callbackFactory;
            return __generator$1(this, function(_a2) {
                switch (_a2.label) {
                    case 0:
                        return [4, Auth.next(previousStep ? previousStep.payload : void 0, options)];
                    case 1:
                        nextPayload = _a2.sent();
                        if (nextPayload.authId) {
                            callbackFactory = options ? options.callbackFactory : void 0;
                            return [2, new FRStep(nextPayload, callbackFactory)];
                        }
                        if (!nextPayload.authId && nextPayload.ok) {
                            return [2, new FRLoginSuccess(nextPayload)];
                        }
                        return [2, new FRLoginFailure(nextPayload)];
                }
            });
        });
    };
    FRAuth2.redirect = function(step) {
        var cb = step.getCallbackOfType(CallbackType.RedirectCallback);
        var redirectUrl = cb.getRedirectUrl();
        window.localStorage.setItem(this.previousStepKey, JSON.stringify(step));
        window.location.assign(redirectUrl);
    };
    FRAuth2.resume = function(url, options) {
        var _a2, _b, _c;
        return __awaiter$1(this, void 0, void 0, function() {
            function requiresPreviousStep() {
                return code && state || form_post_entry || responsekey;
            }
            var parsedUrl, code, error, errorCode, errorMessage, form_post_entry, nonce, RelayState, responsekey, scope, state, suspendedId, authIndexValue, previousStep, redirectStepString, nextOptions;
            return __generator$1(this, function(_d) {
                switch (_d.label) {
                    case 0:
                        parsedUrl = new URL(url);
                        code = parsedUrl.searchParams.get("code");
                        error = parsedUrl.searchParams.get("error");
                        errorCode = parsedUrl.searchParams.get("errorCode");
                        errorMessage = parsedUrl.searchParams.get("errorMessage");
                        form_post_entry = parsedUrl.searchParams.get("form_post_entry");
                        nonce = parsedUrl.searchParams.get("nonce");
                        RelayState = parsedUrl.searchParams.get("RelayState");
                        responsekey = parsedUrl.searchParams.get("responsekey");
                        scope = parsedUrl.searchParams.get("scope");
                        state = parsedUrl.searchParams.get("state");
                        suspendedId = parsedUrl.searchParams.get("suspendedId");
                        authIndexValue = (_a2 = parsedUrl.searchParams.get("authIndexValue")) !== null && _a2 !== void 0 ? _a2 : void 0;
                        if (requiresPreviousStep()) {
                            redirectStepString = window.localStorage.getItem(this.previousStepKey);
                            if (!redirectStepString) {
                                throw new Error("Error: could not retrieve original redirect information.");
                            }
                            try {
                                previousStep = JSON.parse(redirectStepString);
                            } catch (err) {
                                throw new Error("Error: could not parse redirect params or step information");
                            }
                            window.localStorage.removeItem(this.previousStepKey);
                        }
                        nextOptions = __assign$3(__assign$3(__assign$3({}, options), {
                            query: __assign$3(__assign$3(__assign$3(__assign$3(__assign$3(__assign$3(__assign$3(__assign$3(__assign$3(__assign$3(__assign$3(__assign$3({}, code && {
                                code
                            }), error && {
                                error
                            }), errorCode && {
                                errorCode
                            }), errorMessage && {
                                errorMessage
                            }), form_post_entry && {
                                form_post_entry
                            }), nonce && {
                                nonce
                            }), RelayState && {
                                RelayState
                            }), responsekey && {
                                responsekey
                            }), scope && {
                                scope
                            }), state && {
                                state
                            }), suspendedId && {
                                suspendedId
                            }), options && options.query)
                        }), ((_b = options === null || options === void 0 ? void 0 : options.tree) !== null && _b !== void 0 ? _b : authIndexValue) && {
                            tree: (_c = options === null || options === void 0 ? void 0 : options.tree) !== null && _c !== void 0 ? _c : authIndexValue
                        });
                        return [4, this.next(previousStep, nextOptions)];
                    case 1:
                        return [2, _d.sent()];
                }
            });
        });
    };
    FRAuth2.start = function(options) {
        return __awaiter$1(this, void 0, void 0, function() {
            return __generator$1(this, function(_a2) {
                switch (_a2.label) {
                    case 0:
                        return [4, FRAuth2.next(void 0, options)];
                    case 1:
                        return [2, _a2.sent()];
                }
            });
        });
    };
    FRAuth2.previousStepKey = "FRAuth_PreviousStep";
    return FRAuth2;
}();
var browserProps = [
    "userAgent",
    "appName",
    "appCodeName",
    "appVersion",
    "appMinorVersion",
    "buildID",
    "product",
    "productSub",
    "vendor",
    "vendorSub",
    "browserLanguage"
];
var configurableCategories = [
    "fontNames",
    "displayProps",
    "browserProps",
    "hardwareProps",
    "platformProps"
];
var delay = 30 * 1e3;
var devicePlatforms = {
    mac: ["Macintosh", "MacIntel", "MacPPC", "Mac68K"],
    windows: ["Win32", "Win64", "Windows", "WinCE"],
    ios: ["iPhone", "iPad", "iPod"]
};
var displayProps = ["width", "height", "pixelDepth", "orientation.angle"];
var fontNames = [
    "cursive",
    "monospace",
    "serif",
    "sans-serif",
    "fantasy",
    "Arial",
    "Arial Black",
    "Arial Narrow",
    "Arial Rounded MT Bold",
    "Bookman Old Style",
    "Bradley Hand ITC",
    "Century",
    "Century Gothic",
    "Comic Sans MS",
    "Courier",
    "Courier New",
    "Georgia",
    "Gentium",
    "Impact",
    "King",
    "Lucida Console",
    "Lalit",
    "Modena",
    "Monotype Corsiva",
    "Papyrus",
    "Tahoma",
    "TeX",
    "Times",
    "Times New Roman",
    "Trebuchet MS",
    "Verdana",
    "Verona"
];
var hardwareProps = [
    "cpuClass",
    "deviceMemory",
    "hardwareConcurrency",
    "maxTouchPoints",
    "oscpu"
];
var platformProps = ["language", "platform", "userLanguage", "systemLanguage"];
var Collector = function() {
    function Collector2() {}
    Collector2.prototype.reduceToObject = function(props, src) {
        return props.reduce(function(prev, curr) {
            if (curr.includes(".")) {
                var propArr = curr.split(".");
                var prop1 = propArr[0];
                var prop2 = propArr[1];
                var prop = src[prop1] && src[prop1][prop2];
                prev[prop2] = prop != void 0 ? prop : "";
            } else {
                prev[curr] = src[curr] != void 0 ? src[curr] : null;
            }
            return prev;
        }, {});
    };
    Collector2.prototype.reduceToString = function(props, src) {
        return props.reduce(function(prev, curr) {
            prev = "".concat(prev).concat(src[curr].filename, ";");
            return prev;
        }, "");
    };
    return Collector2;
}();
var __extends$i = function() {
    var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf || {
                __proto__: []
            }
            instanceof Array && function(d2, b2) {
                d2.__proto__ = b2;
            } || function(d2, b2) {
                for (var p in b2)
                    if (Object.prototype.hasOwnProperty.call(b2, p))
                        d2[p] = b2[p];
            };
        return extendStatics(d, b);
    };
    return function(d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);

        function __() {
            this.constructor = d;
        }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
}();
var __assign$4 = function() {
    __assign$4 = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s)
                if (Object.prototype.hasOwnProperty.call(s, p))
                    t[p] = s[p];
        }
        return t;
    };
    return __assign$4.apply(this, arguments);
};
var __awaiter$2 = function(thisArg, _arguments, P, generator) {
    function adopt(value) {
        return value instanceof P ? value : new P(function(resolve2) {
            resolve2(value);
        });
    }
    return new(P || (P = Promise))(function(resolve2, reject) {
        function fulfilled(value) {
            try {
                step(generator.next(value));
            } catch (e) {
                reject(e);
            }
        }

        function rejected(value) {
            try {
                step(generator["throw"](value));
            } catch (e) {
                reject(e);
            }
        }

        function step(result) {
            result.done ? resolve2(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator$2 = function(thisArg, body) {
    var _ = {
            label: 0,
            sent: function() {
                if (t[0] & 1)
                    throw t[1];
                return t[1];
            },
            trys: [],
            ops: []
        },
        f, y, t, g;
    return g = {
        next: verb(0),
        throw: verb(1),
        return: verb(2)
    }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
        return this;
    }), g;

    function verb(n) {
        return function(v) {
            return step([n, v]);
        };
    }

    function step(op) {
        if (f)
            throw new TypeError("Generator is already executing.");
        while (_)
            try {
                if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
                    return t;
                if (y = 0, t)
                    op = [op[0] & 2, t.value];
                switch (op[0]) {
                    case 0:
                    case 1:
                        t = op;
                        break;
                    case 4:
                        _.label++;
                        return {
                            value: op[1], done: false
                        };
                    case 5:
                        _.label++;
                        y = op[1];
                        op = [0];
                        continue;
                    case 7:
                        op = _.ops.pop();
                        _.trys.pop();
                        continue;
                    default:
                        if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                            _ = 0;
                            continue;
                        }
                        if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
                            _.label = op[1];
                            break;
                        }
                        if (op[0] === 6 && _.label < t[1]) {
                            _.label = t[1];
                            t = op;
                            break;
                        }
                        if (t && _.label < t[2]) {
                            _.label = t[2];
                            _.ops.push(op);
                            break;
                        }
                        if (t[2])
                            _.ops.pop();
                        _.trys.pop();
                        continue;
                }
                op = body.call(thisArg, _);
            } catch (e) {
                op = [6, e];
                y = 0;
            } finally {
                f = t = 0;
            }
        if (op[0] & 5)
            throw op[1];
        return {
            value: op[0] ? op[1] : void 0,
            done: true
        };
    }
};
var FRDevice = function(_super) {
    __extends$i(FRDevice2, _super);

    function FRDevice2(config) {
        var _this = _super.call(this) || this;
        _this.config = {
            fontNames,
            devicePlatforms,
            displayProps,
            browserProps,
            hardwareProps,
            platformProps
        };
        if (config) {
            Object.keys(config).forEach(function(key) {
                if (!configurableCategories.includes(key)) {
                    throw new Error("Device profile configuration category does not exist.");
                }
                _this.config[key] = config[key];
            });
        }
        return _this;
    }
    FRDevice2.prototype.getBrowserMeta = function() {
        if (!navigator) {
            console.warn("Cannot collect browser metadata. navigator is not defined.");
            return {};
        }
        return this.reduceToObject(this.config.browserProps, navigator);
    };
    FRDevice2.prototype.getBrowserPluginsNames = function() {
        if (!(navigator && navigator.plugins)) {
            console.warn("Cannot collect browser plugin information. navigator.plugins is not defined.");
            return "";
        }
        return this.reduceToString(Object.keys(navigator.plugins), navigator.plugins);
    };
    FRDevice2.prototype.getDeviceName = function() {
        if (!navigator) {
            console.warn("Cannot collect device name. navigator is not defined.");
            return "";
        }
        var userAgent = navigator.userAgent;
        var platform = navigator.platform;
        switch (true) {
            case this.config.devicePlatforms.mac.includes(platform):
                return "Mac (Browser)";
            case this.config.devicePlatforms.ios.includes(platform):
                return "".concat(platform, " (Browser)");
            case this.config.devicePlatforms.windows.includes(platform):
                return "Windows (Browser)";
            case (/Android/.test(platform) || /Android/.test(userAgent)):
                return "Android (Browser)";
            case (/CrOS/.test(userAgent) || /Chromebook/.test(userAgent)):
                return "Chrome OS (Browser)";
            case /Linux/.test(platform):
                return "Linux (Browser)";
            default:
                return "".concat(platform || "Unknown", " (Browser)");
        }
    };
    FRDevice2.prototype.getDisplayMeta = function() {
        if (!screen) {
            console.warn("Cannot collect screen information. screen is not defined.");
        }
        return this.reduceToObject(this.config.displayProps, screen);
    };
    FRDevice2.prototype.getHardwareMeta = function() {
        if (!navigator) {
            console.warn("Cannot collect OS metadata. Navigator is not defined.");
            return {};
        }
        return this.reduceToObject(this.config.hardwareProps, navigator);
    };
    FRDevice2.prototype.getIdentifier = function() {
        if (!(window.crypto && window.crypto.getRandomValues)) {
            console.warn("Cannot generate profile ID. Crypto and/or getRandomValues is not supported.");
            return "";
        }
        if (!localStorage) {
            console.warn("Cannot store profile ID. localStorage is not supported.");
            return "";
        }
        var id = localStorage.getItem("profile-id");
        if (!id) {
            id = window.crypto.getRandomValues(new Uint32Array(3)).join("-");
            localStorage.setItem("profile-id", id);
        }
        return id;
    };
    FRDevice2.prototype.getInstalledFonts = function() {
        var canvas = document.createElement("canvas");
        if (!canvas) {
            console.warn("Cannot collect font data. Browser does not support canvas element");
            return "";
        }
        var context = canvas.getContext && canvas.getContext("2d");
        if (!context) {
            console.warn("Cannot collect font data. Browser does not support 2d canvas context");
            return "";
        }
        var text = "abcdefghi0123456789";
        context.font = "72px Comic Sans";
        var baseWidth = context.measureText(text).width;
        var installedFonts = this.config.fontNames.reduce(function(prev, curr) {
            context.font = "72px ".concat(curr, ", Comic Sans");
            var newWidth = context.measureText(text).width;
            if (newWidth !== baseWidth) {
                prev = "".concat(prev).concat(curr, ";");
            }
            return prev;
        }, "");
        return installedFonts;
    };
    FRDevice2.prototype.getLocationCoordinates = function() {
        return __awaiter$2(this, void 0, void 0, function() {
            var _this = this;
            return __generator$2(this, function(_a2) {
                if (!(navigator && navigator.geolocation)) {
                    console.warn("Cannot collect geolocation information. navigator.geolocation is not defined.");
                    return [2, Promise.resolve({})];
                }
                return [2, new Promise(function(resolve2) {
                    return __awaiter$2(_this, void 0, void 0, function() {
                        return __generator$2(this, function(_a3) {
                            navigator.geolocation.getCurrentPosition(function(position) {
                                return resolve2({
                                    latitude: position.coords.latitude,
                                    longitude: position.coords.longitude
                                });
                            }, function(error) {
                                console.warn("Cannot collect geolocation information. " + error.code + ": " + error.message);
                                resolve2({});
                            }, {
                                enableHighAccuracy: true,
                                timeout: delay,
                                maximumAge: 0
                            });
                            return [2];
                        });
                    });
                })];
            });
        });
    };
    FRDevice2.prototype.getOSMeta = function() {
        if (!navigator) {
            console.warn("Cannot collect OS metadata. navigator is not defined.");
            return {};
        }
        return this.reduceToObject(this.config.platformProps, navigator);
    };
    FRDevice2.prototype.getProfile = function(_a2) {
        var location = _a2.location,
            metadata = _a2.metadata;
        return __awaiter$2(this, void 0, void 0, function() {
            var profile, _b;
            return __generator$2(this, function(_c) {
                switch (_c.label) {
                    case 0:
                        profile = {
                            identifier: this.getIdentifier()
                        };
                        if (metadata) {
                            profile.metadata = {
                                hardware: __assign$4(__assign$4({}, this.getHardwareMeta()), {
                                    display: this.getDisplayMeta()
                                }),
                                browser: __assign$4(__assign$4({}, this.getBrowserMeta()), {
                                    plugins: this.getBrowserPluginsNames()
                                }),
                                platform: __assign$4(__assign$4({}, this.getOSMeta()), {
                                    deviceName: this.getDeviceName(),
                                    fonts: this.getInstalledFonts(),
                                    timezone: this.getTimezoneOffset()
                                })
                            };
                        }
                        if (!location)
                            return [3, 2];
                        _b = profile;
                        return [4, this.getLocationCoordinates()];
                    case 1:
                        _b.location = _c.sent();
                        _c.label = 2;
                    case 2:
                        return [2, profile];
                }
            });
        });
    };
    FRDevice2.prototype.getTimezoneOffset = function() {
        try {
            return new Date().getTimezoneOffset();
        } catch (err) {
            console.warn("Cannot collect timezone information. getTimezoneOffset is not defined.");
            return null;
        }
    };
    return FRDevice2;
}(Collector);

function parseDisplayRecoveryCodesText(text) {
    var recoveryCodesMatches = text.match(/\s[\w\W]"([\w]*)\\/g);
    var recoveryCodes = Array.isArray(recoveryCodesMatches) && recoveryCodesMatches.map(function(substr) {
        var arr = substr.match(/"([\w]*)\\/);
        return Array.isArray(arr) ? arr[1] : "";
    });
    return recoveryCodes || [];
}
var FRRecoveryCodes = function() {
    function FRRecoveryCodes2() {}
    FRRecoveryCodes2.getCodes = function(step) {
        var _a2;
        var text = (_a2 = this.getDisplayCallback(step)) === null || _a2 === void 0 ? void 0 : _a2.getOutputByName("message", "");
        return parseDisplayRecoveryCodesText(text || "");
    };
    FRRecoveryCodes2.isDisplayStep = function(step) {
        return !!this.getDisplayCallback(step);
    };
    FRRecoveryCodes2.getDisplayCallback = function(step) {
        return step.getCallbacksOfType(CallbackType.TextOutputCallback).find(function(x) {
            var cb = x.getOutputByName("message", void 0);
            return cb && (cb.includes("Recovery Codes") || cb.includes("recovery codes"));
        });
    };
    return FRRecoveryCodes2;
}();
var DB_NAME = "forgerock-sdk";
var TOKEN_KEY = "tokens";
var __awaiter$3 = function(thisArg, _arguments, P, generator) {
    function adopt(value) {
        return value instanceof P ? value : new P(function(resolve2) {
            resolve2(value);
        });
    }
    return new(P || (P = Promise))(function(resolve2, reject) {
        function fulfilled(value) {
            try {
                step(generator.next(value));
            } catch (e) {
                reject(e);
            }
        }

        function rejected(value) {
            try {
                step(generator["throw"](value));
            } catch (e) {
                reject(e);
            }
        }

        function step(result) {
            result.done ? resolve2(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator$3 = function(thisArg, body) {
    var _ = {
            label: 0,
            sent: function() {
                if (t[0] & 1)
                    throw t[1];
                return t[1];
            },
            trys: [],
            ops: []
        },
        f, y, t, g;
    return g = {
        next: verb(0),
        throw: verb(1),
        return: verb(2)
    }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
        return this;
    }), g;

    function verb(n) {
        return function(v) {
            return step([n, v]);
        };
    }

    function step(op) {
        if (f)
            throw new TypeError("Generator is already executing.");
        while (_)
            try {
                if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
                    return t;
                if (y = 0, t)
                    op = [op[0] & 2, t.value];
                switch (op[0]) {
                    case 0:
                    case 1:
                        t = op;
                        break;
                    case 4:
                        _.label++;
                        return {
                            value: op[1], done: false
                        };
                    case 5:
                        _.label++;
                        y = op[1];
                        op = [0];
                        continue;
                    case 7:
                        op = _.ops.pop();
                        _.trys.pop();
                        continue;
                    default:
                        if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                            _ = 0;
                            continue;
                        }
                        if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
                            _.label = op[1];
                            break;
                        }
                        if (op[0] === 6 && _.label < t[1]) {
                            _.label = t[1];
                            t = op;
                            break;
                        }
                        if (t && _.label < t[2]) {
                            _.label = t[2];
                            _.ops.push(op);
                            break;
                        }
                        if (t[2])
                            _.ops.pop();
                        _.trys.pop();
                        continue;
                }
                op = body.call(thisArg, _);
            } catch (e) {
                op = [6, e];
                y = 0;
            } finally {
                f = t = 0;
            }
        if (op[0] & 5)
            throw op[1];
        return {
            value: op[0] ? op[1] : void 0,
            done: true
        };
    }
};
var IndexedDBWrapper = function() {
    function IndexedDBWrapper2() {}
    IndexedDBWrapper2.get = function(clientId) {
        return __awaiter$3(this, void 0, void 0, function() {
            return __generator$3(this, function(_a2) {
                return [2, new Promise(function(resolve2, reject) {
                    var onError = function() {
                        return reject();
                    };
                    var openReq = window.indexedDB.open(DB_NAME);
                    openReq.onsuccess = function() {
                        if (!openReq.result.objectStoreNames.contains(clientId)) {
                            openReq.result.close();
                            return reject("Client ID not found");
                        }
                        var getReq = openReq.result.transaction(clientId, "readonly").objectStore(clientId).get(TOKEN_KEY);
                        getReq.onsuccess = function(event) {
                            if (!event || !event.target) {
                                throw new Error("Missing storage event target");
                            }
                            openReq.result.close();
                            resolve2(event.target.result);
                        };
                        getReq.onerror = onError;
                    };
                    openReq.onupgradeneeded = function() {
                        openReq.result.close();
                        reject("IndexedDB upgrade needed");
                    };
                    openReq.onerror = onError;
                })];
            });
        });
    };
    IndexedDBWrapper2.set = function(clientId, tokens) {
        return __awaiter$3(this, void 0, void 0, function() {
            return __generator$3(this, function(_a2) {
                return [2, new Promise(function(resolve2, reject) {
                    var openReq = window.indexedDB.open(DB_NAME);
                    var onSetSuccess = function() {
                        openReq.result.close();
                        resolve2();
                    };
                    var onError = function() {
                        return reject();
                    };
                    var onUpgradeNeeded = function() {
                        openReq.result.createObjectStore(clientId);
                    };
                    var onOpenSuccess = function() {
                        if (!openReq.result.objectStoreNames.contains(clientId)) {
                            var version = openReq.result.version + 1;
                            openReq.result.close();
                            openReq = window.indexedDB.open(DB_NAME, version);
                            openReq.onupgradeneeded = onUpgradeNeeded;
                            openReq.onsuccess = onOpenSuccess;
                            openReq.onerror = onError;
                            return;
                        }
                        var txnReq = openReq.result.transaction(clientId, "readwrite");
                        txnReq.onerror = onError;
                        var objectStore = txnReq.objectStore(clientId);
                        var putReq = objectStore.put(tokens, TOKEN_KEY);
                        putReq.onsuccess = onSetSuccess;
                        putReq.onerror = onError;
                    };
                    openReq.onupgradeneeded = onUpgradeNeeded;
                    openReq.onsuccess = onOpenSuccess;
                    openReq.onerror = onError;
                })];
            });
        });
    };
    IndexedDBWrapper2.remove = function(clientId) {
        return __awaiter$3(this, void 0, void 0, function() {
            return __generator$3(this, function(_a2) {
                return [2, new Promise(function(resolve2, reject) {
                    var onError = function() {
                        return reject();
                    };
                    var openReq = window.indexedDB.open(DB_NAME);
                    openReq.onsuccess = function() {
                        if (!openReq.result.objectStoreNames.contains(clientId)) {
                            return resolve2();
                        }
                        var removeReq = openReq.result.transaction(clientId, "readwrite").objectStore(clientId).delete(TOKEN_KEY);
                        removeReq.onsuccess = function() {
                            resolve2();
                        };
                        removeReq.onerror = onError;
                    };
                    openReq.onerror = onError;
                })];
            });
        });
    };
    return IndexedDBWrapper2;
}();
var __awaiter$4 = function(thisArg, _arguments, P, generator) {
    function adopt(value) {
        return value instanceof P ? value : new P(function(resolve2) {
            resolve2(value);
        });
    }
    return new(P || (P = Promise))(function(resolve2, reject) {
        function fulfilled(value) {
            try {
                step(generator.next(value));
            } catch (e) {
                reject(e);
            }
        }

        function rejected(value) {
            try {
                step(generator["throw"](value));
            } catch (e) {
                reject(e);
            }
        }

        function step(result) {
            result.done ? resolve2(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator$4 = function(thisArg, body) {
    var _ = {
            label: 0,
            sent: function() {
                if (t[0] & 1)
                    throw t[1];
                return t[1];
            },
            trys: [],
            ops: []
        },
        f, y, t, g;
    return g = {
        next: verb(0),
        throw: verb(1),
        return: verb(2)
    }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
        return this;
    }), g;

    function verb(n) {
        return function(v) {
            return step([n, v]);
        };
    }

    function step(op) {
        if (f)
            throw new TypeError("Generator is already executing.");
        while (_)
            try {
                if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
                    return t;
                if (y = 0, t)
                    op = [op[0] & 2, t.value];
                switch (op[0]) {
                    case 0:
                    case 1:
                        t = op;
                        break;
                    case 4:
                        _.label++;
                        return {
                            value: op[1], done: false
                        };
                    case 5:
                        _.label++;
                        y = op[1];
                        op = [0];
                        continue;
                    case 7:
                        op = _.ops.pop();
                        _.trys.pop();
                        continue;
                    default:
                        if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                            _ = 0;
                            continue;
                        }
                        if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
                            _.label = op[1];
                            break;
                        }
                        if (op[0] === 6 && _.label < t[1]) {
                            _.label = t[1];
                            t = op;
                            break;
                        }
                        if (t && _.label < t[2]) {
                            _.label = t[2];
                            _.ops.push(op);
                            break;
                        }
                        if (t[2])
                            _.ops.pop();
                        _.trys.pop();
                        continue;
                }
                op = body.call(thisArg, _);
            } catch (e) {
                op = [6, e];
                y = 0;
            } finally {
                f = t = 0;
            }
        if (op[0] & 5)
            throw op[1];
        return {
            value: op[0] ? op[1] : void 0,
            done: true
        };
    }
};
var LocalStorageWrapper = function() {
    function LocalStorageWrapper2() {}
    LocalStorageWrapper2.get = function(clientId) {
        return __awaiter$4(this, void 0, void 0, function() {
            var tokenString;
            return __generator$4(this, function(_a2) {
                tokenString = localStorage.getItem("".concat(DB_NAME, "-").concat(clientId));
                try {
                    return [2, Promise.resolve(JSON.parse(tokenString || ""))];
                } catch (err) {
                    console.warn("Could not parse token from localStorage. This could be due to accessing a removed token");
                    return [2, void 0];
                }
                return [2];
            });
        });
    };
    LocalStorageWrapper2.set = function(clientId, tokens) {
        return __awaiter$4(this, void 0, void 0, function() {
            var tokenString;
            return __generator$4(this, function(_a2) {
                tokenString = JSON.stringify(tokens);
                localStorage.setItem("".concat(DB_NAME, "-").concat(clientId), tokenString);
                return [2];
            });
        });
    };
    LocalStorageWrapper2.remove = function(clientId) {
        return __awaiter$4(this, void 0, void 0, function() {
            return __generator$4(this, function(_a2) {
                localStorage.removeItem("".concat(DB_NAME, "-").concat(clientId));
                return [2];
            });
        });
    };
    return LocalStorageWrapper2;
}();
var __awaiter$5 = function(thisArg, _arguments, P, generator) {
    function adopt(value) {
        return value instanceof P ? value : new P(function(resolve2) {
            resolve2(value);
        });
    }
    return new(P || (P = Promise))(function(resolve2, reject) {
        function fulfilled(value) {
            try {
                step(generator.next(value));
            } catch (e) {
                reject(e);
            }
        }

        function rejected(value) {
            try {
                step(generator["throw"](value));
            } catch (e) {
                reject(e);
            }
        }

        function step(result) {
            result.done ? resolve2(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator$5 = function(thisArg, body) {
    var _ = {
            label: 0,
            sent: function() {
                if (t[0] & 1)
                    throw t[1];
                return t[1];
            },
            trys: [],
            ops: []
        },
        f, y, t, g;
    return g = {
        next: verb(0),
        throw: verb(1),
        return: verb(2)
    }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
        return this;
    }), g;

    function verb(n) {
        return function(v) {
            return step([n, v]);
        };
    }

    function step(op) {
        if (f)
            throw new TypeError("Generator is already executing.");
        while (_)
            try {
                if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
                    return t;
                if (y = 0, t)
                    op = [op[0] & 2, t.value];
                switch (op[0]) {
                    case 0:
                    case 1:
                        t = op;
                        break;
                    case 4:
                        _.label++;
                        return {
                            value: op[1], done: false
                        };
                    case 5:
                        _.label++;
                        y = op[1];
                        op = [0];
                        continue;
                    case 7:
                        op = _.ops.pop();
                        _.trys.pop();
                        continue;
                    default:
                        if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                            _ = 0;
                            continue;
                        }
                        if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
                            _.label = op[1];
                            break;
                        }
                        if (op[0] === 6 && _.label < t[1]) {
                            _.label = t[1];
                            t = op;
                            break;
                        }
                        if (t && _.label < t[2]) {
                            _.label = t[2];
                            _.ops.push(op);
                            break;
                        }
                        if (t[2])
                            _.ops.pop();
                        _.trys.pop();
                        continue;
                }
                op = body.call(thisArg, _);
            } catch (e) {
                op = [6, e];
                y = 0;
            } finally {
                f = t = 0;
            }
        if (op[0] & 5)
            throw op[1];
        return {
            value: op[0] ? op[1] : void 0,
            done: true
        };
    }
};
var SessionStorageWrapper = function() {
    function SessionStorageWrapper2() {}
    SessionStorageWrapper2.get = function(clientId) {
        return __awaiter$5(this, void 0, void 0, function() {
            var tokenString;
            return __generator$5(this, function(_a2) {
                tokenString = sessionStorage.getItem("".concat(DB_NAME, "-").concat(clientId));
                try {
                    return [2, Promise.resolve(JSON.parse(tokenString || ""))];
                } catch (err) {
                    console.warn("Could not parse token from sessionStorage. This could be due to accessing a removed token");
                    return [2, void 0];
                }
                return [2];
            });
        });
    };
    SessionStorageWrapper2.set = function(clientId, tokens) {
        return __awaiter$5(this, void 0, void 0, function() {
            var tokenString;
            return __generator$5(this, function(_a2) {
                tokenString = JSON.stringify(tokens);
                sessionStorage.setItem("".concat(DB_NAME, "-").concat(clientId), tokenString);
                return [2];
            });
        });
    };
    SessionStorageWrapper2.remove = function(clientId) {
        return __awaiter$5(this, void 0, void 0, function() {
            return __generator$5(this, function(_a2) {
                sessionStorage.removeItem("".concat(DB_NAME, "-").concat(clientId));
                return [2];
            });
        });
    };
    return SessionStorageWrapper2;
}();
var __awaiter$6 = function(thisArg, _arguments, P, generator) {
    function adopt(value) {
        return value instanceof P ? value : new P(function(resolve2) {
            resolve2(value);
        });
    }
    return new(P || (P = Promise))(function(resolve2, reject) {
        function fulfilled(value) {
            try {
                step(generator.next(value));
            } catch (e) {
                reject(e);
            }
        }

        function rejected(value) {
            try {
                step(generator["throw"](value));
            } catch (e) {
                reject(e);
            }
        }

        function step(result) {
            result.done ? resolve2(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator$6 = function(thisArg, body) {
    var _ = {
            label: 0,
            sent: function() {
                if (t[0] & 1)
                    throw t[1];
                return t[1];
            },
            trys: [],
            ops: []
        },
        f, y, t, g;
    return g = {
        next: verb(0),
        throw: verb(1),
        return: verb(2)
    }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
        return this;
    }), g;

    function verb(n) {
        return function(v) {
            return step([n, v]);
        };
    }

    function step(op) {
        if (f)
            throw new TypeError("Generator is already executing.");
        while (_)
            try {
                if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
                    return t;
                if (y = 0, t)
                    op = [op[0] & 2, t.value];
                switch (op[0]) {
                    case 0:
                    case 1:
                        t = op;
                        break;
                    case 4:
                        _.label++;
                        return {
                            value: op[1], done: false
                        };
                    case 5:
                        _.label++;
                        y = op[1];
                        op = [0];
                        continue;
                    case 7:
                        op = _.ops.pop();
                        _.trys.pop();
                        continue;
                    default:
                        if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                            _ = 0;
                            continue;
                        }
                        if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
                            _.label = op[1];
                            break;
                        }
                        if (op[0] === 6 && _.label < t[1]) {
                            _.label = t[1];
                            t = op;
                            break;
                        }
                        if (t && _.label < t[2]) {
                            _.label = t[2];
                            _.ops.push(op);
                            break;
                        }
                        if (t[2])
                            _.ops.pop();
                        _.trys.pop();
                        continue;
                }
                op = body.call(thisArg, _);
            } catch (e) {
                op = [6, e];
                y = 0;
            } finally {
                f = t = 0;
            }
        if (op[0] & 5)
            throw op[1];
        return {
            value: op[0] ? op[1] : void 0,
            done: true
        };
    }
};
var TokenStorage = function() {
    function TokenStorage2() {}
    TokenStorage2.get = function() {
        return __awaiter$6(this, void 0, void 0, function() {
            var _a2, clientId, tokenStore;
            return __generator$6(this, function(_b) {
                switch (_b.label) {
                    case 0:
                        _a2 = this.getClientConfig(), clientId = _a2.clientId, tokenStore = _a2.tokenStore;
                        if (!(tokenStore === "sessionStorage"))
                            return [3, 2];
                        return [4, SessionStorageWrapper.get(clientId)];
                    case 1:
                        return [2, _b.sent()];
                    case 2:
                        if (!(tokenStore === "localStorage"))
                            return [3, 4];
                        return [4, LocalStorageWrapper.get(clientId)];
                    case 3:
                        return [2, _b.sent()];
                    case 4:
                        if (!(tokenStore === "indexedDB"))
                            return [3, 6];
                        return [4, IndexedDBWrapper.get(clientId)];
                    case 5:
                        return [2, _b.sent()];
                    case 6:
                        if (!(tokenStore && tokenStore.get))
                            return [3, 8];
                        return [4, tokenStore.get(clientId)];
                    case 7:
                        return [2, _b.sent()];
                    case 8:
                        return [4, LocalStorageWrapper.get(clientId)];
                    case 9:
                        return [2, _b.sent()];
                }
            });
        });
    };
    TokenStorage2.set = function(tokens) {
        return __awaiter$6(this, void 0, void 0, function() {
            var _a2, clientId, tokenStore;
            return __generator$6(this, function(_b) {
                switch (_b.label) {
                    case 0:
                        _a2 = this.getClientConfig(), clientId = _a2.clientId, tokenStore = _a2.tokenStore;
                        if (!(tokenStore === "sessionStorage"))
                            return [3, 2];
                        return [4, SessionStorageWrapper.set(clientId, tokens)];
                    case 1:
                        return [2, _b.sent()];
                    case 2:
                        if (!(tokenStore === "localStorage"))
                            return [3, 4];
                        return [4, LocalStorageWrapper.set(clientId, tokens)];
                    case 3:
                        return [2, _b.sent()];
                    case 4:
                        if (!(tokenStore === "indexedDB"))
                            return [3, 6];
                        return [4, IndexedDBWrapper.set(clientId, tokens)];
                    case 5:
                        return [2, _b.sent()];
                    case 6:
                        if (!(tokenStore && tokenStore.set))
                            return [3, 8];
                        return [4, tokenStore.set(clientId, tokens)];
                    case 7:
                        return [2, _b.sent()];
                    case 8:
                        return [4, LocalStorageWrapper.set(clientId, tokens)];
                    case 9:
                        return [2, _b.sent()];
                }
            });
        });
    };
    TokenStorage2.remove = function() {
        return __awaiter$6(this, void 0, void 0, function() {
            var _a2, clientId, tokenStore;
            return __generator$6(this, function(_b) {
                switch (_b.label) {
                    case 0:
                        _a2 = this.getClientConfig(), clientId = _a2.clientId, tokenStore = _a2.tokenStore;
                        if (!(tokenStore === "sessionStorage"))
                            return [3, 2];
                        return [4, SessionStorageWrapper.remove(clientId)];
                    case 1:
                        return [2, _b.sent()];
                    case 2:
                        if (!(tokenStore === "localStorage"))
                            return [3, 4];
                        return [4, LocalStorageWrapper.remove(clientId)];
                    case 3:
                        return [2, _b.sent()];
                    case 4:
                        if (!(tokenStore === "indexedDB"))
                            return [3, 6];
                        return [4, IndexedDBWrapper.remove(clientId)];
                    case 5:
                        return [2, _b.sent()];
                    case 6:
                        if (!(tokenStore && tokenStore.remove))
                            return [3, 8];
                        return [4, tokenStore.remove(clientId)];
                    case 7:
                        return [2, _b.sent()];
                    case 8:
                        return [4, LocalStorageWrapper.remove(clientId)];
                    case 9:
                        return [2, _b.sent()];
                }
            });
        });
    };
    TokenStorage2.getClientConfig = function() {
        var _a2 = Config.get(),
            clientId = _a2.clientId,
            tokenStore = _a2.tokenStore;
        if (!clientId) {
            throw new Error("clientId is required to manage token storage");
        }
        return {
            clientId,
            tokenStore
        };
    };
    return TokenStorage2;
}();

function isOkOr4xx(response) {
    return response.ok || Math.floor(response.status / 100) === 4;
}
var __awaiter$7 = function(thisArg, _arguments, P, generator) {
    function adopt(value) {
        return value instanceof P ? value : new P(function(resolve2) {
            resolve2(value);
        });
    }
    return new(P || (P = Promise))(function(resolve2, reject) {
        function fulfilled(value) {
            try {
                step(generator.next(value));
            } catch (e) {
                reject(e);
            }
        }

        function rejected(value) {
            try {
                step(generator["throw"](value));
            } catch (e) {
                reject(e);
            }
        }

        function step(result) {
            result.done ? resolve2(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator$7 = function(thisArg, body) {
    var _ = {
            label: 0,
            sent: function() {
                if (t[0] & 1)
                    throw t[1];
                return t[1];
            },
            trys: [],
            ops: []
        },
        f, y, t, g;
    return g = {
        next: verb(0),
        throw: verb(1),
        return: verb(2)
    }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
        return this;
    }), g;

    function verb(n) {
        return function(v) {
            return step([n, v]);
        };
    }

    function step(op) {
        if (f)
            throw new TypeError("Generator is already executing.");
        while (_)
            try {
                if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
                    return t;
                if (y = 0, t)
                    op = [op[0] & 2, t.value];
                switch (op[0]) {
                    case 0:
                    case 1:
                        t = op;
                        break;
                    case 4:
                        _.label++;
                        return {
                            value: op[1], done: false
                        };
                    case 5:
                        _.label++;
                        y = op[1];
                        op = [0];
                        continue;
                    case 7:
                        op = _.ops.pop();
                        _.trys.pop();
                        continue;
                    default:
                        if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                            _ = 0;
                            continue;
                        }
                        if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
                            _.label = op[1];
                            break;
                        }
                        if (op[0] === 6 && _.label < t[1]) {
                            _.label = t[1];
                            t = op;
                            break;
                        }
                        if (t && _.label < t[2]) {
                            _.label = t[2];
                            _.ops.push(op);
                            break;
                        }
                        if (t[2])
                            _.ops.pop();
                        _.trys.pop();
                        continue;
                }
                op = body.call(thisArg, _);
            } catch (e) {
                op = [6, e];
                y = 0;
            } finally {
                f = t = 0;
            }
        if (op[0] & 5)
            throw op[1];
        return {
            value: op[0] ? op[1] : void 0,
            done: true
        };
    }
};
var PKCE = function() {
    function PKCE2() {}
    PKCE2.createState = function() {
        return this.createRandomString(16);
    };
    PKCE2.createVerifier = function() {
        return this.createRandomString(32);
    };
    PKCE2.createChallenge = function(verifier) {
        return __awaiter$7(this, void 0, void 0, function() {
            var sha256, challenge;
            return __generator$7(this, function(_a2) {
                switch (_a2.label) {
                    case 0:
                        return [4, this.sha256(verifier)];
                    case 1:
                        sha256 = _a2.sent();
                        challenge = this.base64UrlEncode(sha256);
                        return [2, challenge];
                }
            });
        });
    };
    PKCE2.base64UrlEncode = function(array) {
        var numbers = Array.prototype.slice.call(array);
        var ascii = window.btoa(String.fromCharCode.apply(null, numbers));
        var urlEncoded = ascii.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
        return urlEncoded;
    };
    PKCE2.sha256 = function(value) {
        return __awaiter$7(this, void 0, void 0, function() {
            var uint8Array, hashBuffer, hashArray;
            return __generator$7(this, function(_a2) {
                switch (_a2.label) {
                    case 0:
                        uint8Array = new TextEncoder().encode(value);
                        return [4, window.crypto.subtle.digest("SHA-256", uint8Array)];
                    case 1:
                        hashBuffer = _a2.sent();
                        hashArray = new Uint8Array(hashBuffer);
                        return [2, hashArray];
                }
            });
        });
    };
    PKCE2.createRandomString = function(num) {
        if (num === void 0) {
            num = 32;
        }
        var random = new Uint8Array(num);
        window.crypto.getRandomValues(random);
        return btoa(random.join("")).replace(/[^a-zA-Z0-9]+/, "");
    };
    return PKCE2;
}();
var ResponseType;
(function(ResponseType2) {
    ResponseType2["Code"] = "code";
    ResponseType2["Token"] = "token";
})(ResponseType || (ResponseType = {}));
var __assign$5 = function() {
    __assign$5 = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s)
                if (Object.prototype.hasOwnProperty.call(s, p))
                    t[p] = s[p];
        }
        return t;
    };
    return __assign$5.apply(this, arguments);
};
var __awaiter$8 = function(thisArg, _arguments, P, generator) {
    function adopt(value) {
        return value instanceof P ? value : new P(function(resolve2) {
            resolve2(value);
        });
    }
    return new(P || (P = Promise))(function(resolve2, reject) {
        function fulfilled(value) {
            try {
                step(generator.next(value));
            } catch (e) {
                reject(e);
            }
        }

        function rejected(value) {
            try {
                step(generator["throw"](value));
            } catch (e) {
                reject(e);
            }
        }

        function step(result) {
            result.done ? resolve2(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator$8 = function(thisArg, body) {
    var _ = {
            label: 0,
            sent: function() {
                if (t[0] & 1)
                    throw t[1];
                return t[1];
            },
            trys: [],
            ops: []
        },
        f, y, t, g;
    return g = {
        next: verb(0),
        throw: verb(1),
        return: verb(2)
    }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
        return this;
    }), g;

    function verb(n) {
        return function(v) {
            return step([n, v]);
        };
    }

    function step(op) {
        if (f)
            throw new TypeError("Generator is already executing.");
        while (_)
            try {
                if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
                    return t;
                if (y = 0, t)
                    op = [op[0] & 2, t.value];
                switch (op[0]) {
                    case 0:
                    case 1:
                        t = op;
                        break;
                    case 4:
                        _.label++;
                        return {
                            value: op[1], done: false
                        };
                    case 5:
                        _.label++;
                        y = op[1];
                        op = [0];
                        continue;
                    case 7:
                        op = _.ops.pop();
                        _.trys.pop();
                        continue;
                    default:
                        if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                            _ = 0;
                            continue;
                        }
                        if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
                            _.label = op[1];
                            break;
                        }
                        if (op[0] === 6 && _.label < t[1]) {
                            _.label = t[1];
                            t = op;
                            break;
                        }
                        if (t && _.label < t[2]) {
                            _.label = t[2];
                            _.ops.push(op);
                            break;
                        }
                        if (t[2])
                            _.ops.pop();
                        _.trys.pop();
                        continue;
                }
                op = body.call(thisArg, _);
            } catch (e) {
                op = [6, e];
                y = 0;
            } finally {
                f = t = 0;
            }
        if (op[0] & 5)
            throw op[1];
        return {
            value: op[0] ? op[1] : void 0,
            done: true
        };
    }
};
var allowedErrors = {
    AuthenticationConsentRequired: "Authentication or consent required",
    AuthorizationTimeout: "Authorization timed out",
    FailedToFetch: "Failed to fetch",
    NetworkError: "NetworkError when attempting to fetch resource.",
    CORSError: "Cross-origin redirection"
};
var OAuth2Client = function() {
    function OAuth2Client2() {}
    OAuth2Client2.createAuthorizeUrl = function(options) {
        return __awaiter$8(this, void 0, void 0, function() {
            var _a2, clientId, middleware, redirectUri, scope, requestParams, challenge, runMiddleware, url;
            return __generator$8(this, function(_b) {
                switch (_b.label) {
                    case 0:
                        _a2 = Config.get(options), clientId = _a2.clientId, middleware = _a2.middleware, redirectUri = _a2.redirectUri, scope = _a2.scope;
                        requestParams = __assign$5(__assign$5({}, options.query), {
                            client_id: clientId,
                            redirect_uri: redirectUri,
                            response_type: options.responseType,
                            scope,
                            state: options.state
                        });
                        if (!options.verifier)
                            return [3, 2];
                        return [4, PKCE.createChallenge(options.verifier)];
                    case 1:
                        challenge = _b.sent();
                        requestParams.code_challenge = challenge;
                        requestParams.code_challenge_method = "S256";
                        _b.label = 2;
                    case 2:
                        runMiddleware = middlewareWrapper({
                            url: new URL(this.getUrl("authorize", requestParams, options)),
                            init: {}
                        }, {
                            type: ActionTypes.Authorize
                        });
                        url = runMiddleware(middleware).url;
                        return [2, url.toString()];
                }
            });
        });
    };
    OAuth2Client2.getAuthCodeByIframe = function(options) {
        return __awaiter$8(this, void 0, void 0, function() {
            var url, serverConfig;
            var _this = this;
            return __generator$8(this, function(_a2) {
                switch (_a2.label) {
                    case 0:
                        return [4, this.createAuthorizeUrl(options)];
                    case 1:
                        url = _a2.sent();
                        serverConfig = Config.get(options).serverConfig;
                        return [2, new Promise(function(resolve2, reject) {
                            var iframe = document.createElement("iframe");
                            var noop = function() {
                                return;
                            };
                            var onLoad = noop;
                            var cleanUp = noop;
                            var timeout = 0;
                            cleanUp = function() {
                                window.clearTimeout(timeout);
                                iframe.removeEventListener("load", onLoad);
                                iframe.remove();
                            };
                            onLoad = function() {
                                if (iframe.contentWindow) {
                                    var newHref = iframe.contentWindow.location.href;
                                    if (_this.containsAuthCode(newHref)) {
                                        cleanUp();
                                        resolve2(newHref);
                                    } else if (_this.containsAuthError(newHref)) {
                                        cleanUp();
                                        resolve2(newHref);
                                    }
                                }
                            };
                            timeout = window.setTimeout(function() {
                                cleanUp();
                                reject(new Error(allowedErrors.AuthorizationTimeout));
                            }, serverConfig.timeout);
                            iframe.style.display = "none";
                            iframe.addEventListener("load", onLoad);
                            document.body.appendChild(iframe);
                            iframe.src = url;
                        })];
                }
            });
        });
    };
    OAuth2Client2.getOAuth2Tokens = function(options) {
        return __awaiter$8(this, void 0, void 0, function() {
            var _a2, clientId, redirectUri, requestParams, body, init, response, responseBody, message, responseObject, tokenExpiry;
            return __generator$8(this, function(_b) {
                switch (_b.label) {
                    case 0:
                        _a2 = Config.get(options), clientId = _a2.clientId, redirectUri = _a2.redirectUri;
                        requestParams = {
                            client_id: clientId,
                            code: options.authorizationCode,
                            grant_type: "authorization_code",
                            redirect_uri: redirectUri
                        };
                        if (options.verifier) {
                            requestParams.code_verifier = options.verifier;
                        }
                        body = stringify(requestParams);
                        init = {
                            body,
                            headers: new Headers({
                                "content-length": body.length.toString(),
                                "content-type": "application/x-www-form-urlencoded"
                            }),
                            method: "POST"
                        };
                        return [4, this.request("accessToken", void 0, false, init, options)];
                    case 1:
                        response = _b.sent();
                        return [4, this.getBody(response)];
                    case 2:
                        responseBody = _b.sent();
                        if (response.status !== 200) {
                            message = typeof responseBody === "string" ? "Expected 200, received ".concat(response.status) : this.parseError(responseBody);
                            throw new Error(message);
                        }
                        responseObject = responseBody;
                        if (!responseObject.access_token) {
                            throw new Error("Access token not found in response");
                        }
                        tokenExpiry = void 0;
                        if (responseObject.expires_in) {
                            tokenExpiry = Date.now() + responseObject.expires_in * 1e3;
                        }
                        return [2, {
                            accessToken: responseObject.access_token,
                            idToken: responseObject.id_token,
                            refreshToken: responseObject.refresh_token,
                            tokenExpiry
                        }];
                }
            });
        });
    };
    OAuth2Client2.getUserInfo = function(options) {
        return __awaiter$8(this, void 0, void 0, function() {
            var response, json;
            return __generator$8(this, function(_a2) {
                switch (_a2.label) {
                    case 0:
                        return [4, this.request("userInfo", void 0, true, void 0, options)];
                    case 1:
                        response = _a2.sent();
                        if (response.status !== 200) {
                            throw new Error("Failed to get user info; received ".concat(response.status));
                        }
                        return [4, response.json()];
                    case 2:
                        json = _a2.sent();
                        return [2, json];
                }
            });
        });
    };
    OAuth2Client2.endSession = function(options) {
        return __awaiter$8(this, void 0, void 0, function() {
            var idToken, query, response;
            return __generator$8(this, function(_a2) {
                switch (_a2.label) {
                    case 0:
                        return [4, TokenStorage.get()];
                    case 1:
                        idToken = _a2.sent().idToken;
                        query = {};
                        if (idToken) {
                            query.id_token_hint = idToken;
                        }
                        return [4, this.request("endSession", query, true, void 0, options)];
                    case 2:
                        response = _a2.sent();
                        if (!isOkOr4xx(response)) {
                            throw new Error("Failed to end session; received ".concat(response.status));
                        }
                        return [2, response];
                }
            });
        });
    };
    OAuth2Client2.revokeToken = function(options) {
        return __awaiter$8(this, void 0, void 0, function() {
            var clientId, accessToken, init, response;
            return __generator$8(this, function(_a2) {
                switch (_a2.label) {
                    case 0:
                        clientId = Config.get(options).clientId;
                        return [4, TokenStorage.get()];
                    case 1:
                        accessToken = _a2.sent().accessToken;
                        init = {
                            body: stringify({
                                client_id: clientId,
                                token: accessToken
                            }),
                            credentials: "include",
                            headers: new Headers({
                                "content-type": "application/x-www-form-urlencoded"
                            }),
                            method: "POST"
                        };
                        return [4, this.request("revoke", void 0, false, init, options)];
                    case 2:
                        response = _a2.sent();
                        if (!isOkOr4xx(response)) {
                            throw new Error("Failed to revoke token; received ".concat(response.status));
                        }
                        return [2, response];
                }
            });
        });
    };
    OAuth2Client2.request = function(endpoint, query, includeToken, init, options) {
        return __awaiter$8(this, void 0, void 0, function() {
            var _a2, middleware, serverConfig, url, getActionType, accessToken, runMiddleware, req;
            return __generator$8(this, function(_b) {
                switch (_b.label) {
                    case 0:
                        _a2 = Config.get(options), middleware = _a2.middleware, serverConfig = _a2.serverConfig;
                        url = this.getUrl(endpoint, query, options);
                        getActionType = function(endpoint2) {
                            switch (endpoint2) {
                                case "accessToken":
                                    return ActionTypes.ExchangeToken;
                                case "endSession":
                                    return ActionTypes.EndSession;
                                case "revoke":
                                    return ActionTypes.RevokeToken;
                                default:
                                    return ActionTypes.UserInfo;
                            }
                        };
                        init = init || {};
                        if (!includeToken)
                            return [3, 2];
                        return [4, TokenStorage.get()];
                    case 1:
                        accessToken = _b.sent().accessToken;
                        init.credentials = "include";
                        init.headers = init.headers || new Headers();
                        init.headers.set("authorization", "Bearer ".concat(accessToken));
                        _b.label = 2;
                    case 2:
                        runMiddleware = middlewareWrapper({
                            url: new URL(url),
                            init
                        }, {
                            type: getActionType(endpoint)
                        });
                        req = runMiddleware(middleware);
                        return [4, withTimeout(fetch(req.url.toString(), req.init), serverConfig.timeout)];
                    case 3:
                        return [2, _b.sent()];
                }
            });
        });
    };
    OAuth2Client2.containsAuthCode = function(url) {
        return !!url && /code=([^&]+)/.test(url);
    };
    OAuth2Client2.containsAuthError = function(url) {
        return !!url && /error=([^&]+)/.test(url);
    };
    OAuth2Client2.getBody = function(response) {
        return __awaiter$8(this, void 0, void 0, function() {
            var contentType;
            return __generator$8(this, function(_a2) {
                switch (_a2.label) {
                    case 0:
                        contentType = response.headers.get("content-type");
                        if (!(contentType && contentType.indexOf("application/json") > -1))
                            return [3, 2];
                        return [4, response.json()];
                    case 1:
                        return [2, _a2.sent()];
                    case 2:
                        return [4, response.text()];
                    case 3:
                        return [2, _a2.sent()];
                }
            });
        });
    };
    OAuth2Client2.parseError = function(json) {
        if (json) {
            if (json.error && json.error_description) {
                return "".concat(json.error, ": ").concat(json.error_description);
            }
            if (json.code && json.message) {
                return "".concat(json.code, ": ").concat(json.message);
            }
        }
        return void 0;
    };
    OAuth2Client2.getUrl = function(endpoint, query, options) {
        var _a2 = Config.get(options),
            realmPath = _a2.realmPath,
            serverConfig = _a2.serverConfig;
        var path = getEndpointPath(endpoint, realmPath, serverConfig.paths);
        var url = resolve(serverConfig.baseUrl, path);
        if (query) {
            url += "?".concat(stringify(query));
        }
        return url;
    };
    return OAuth2Client2;
}();
var __awaiter$9 = function(thisArg, _arguments, P, generator) {
    function adopt(value) {
        return value instanceof P ? value : new P(function(resolve2) {
            resolve2(value);
        });
    }
    return new(P || (P = Promise))(function(resolve2, reject) {
        function fulfilled(value) {
            try {
                step(generator.next(value));
            } catch (e) {
                reject(e);
            }
        }

        function rejected(value) {
            try {
                step(generator["throw"](value));
            } catch (e) {
                reject(e);
            }
        }

        function step(result) {
            result.done ? resolve2(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator$9 = function(thisArg, body) {
    var _ = {
            label: 0,
            sent: function() {
                if (t[0] & 1)
                    throw t[1];
                return t[1];
            },
            trys: [],
            ops: []
        },
        f, y, t, g;
    return g = {
        next: verb(0),
        throw: verb(1),
        return: verb(2)
    }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
        return this;
    }), g;

    function verb(n) {
        return function(v) {
            return step([n, v]);
        };
    }

    function step(op) {
        if (f)
            throw new TypeError("Generator is already executing.");
        while (_)
            try {
                if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
                    return t;
                if (y = 0, t)
                    op = [op[0] & 2, t.value];
                switch (op[0]) {
                    case 0:
                    case 1:
                        t = op;
                        break;
                    case 4:
                        _.label++;
                        return {
                            value: op[1], done: false
                        };
                    case 5:
                        _.label++;
                        y = op[1];
                        op = [0];
                        continue;
                    case 7:
                        op = _.ops.pop();
                        _.trys.pop();
                        continue;
                    default:
                        if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                            _ = 0;
                            continue;
                        }
                        if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
                            _.label = op[1];
                            break;
                        }
                        if (op[0] === 6 && _.label < t[1]) {
                            _.label = t[1];
                            t = op;
                            break;
                        }
                        if (t && _.label < t[2]) {
                            _.label = t[2];
                            _.ops.push(op);
                            break;
                        }
                        if (t[2])
                            _.ops.pop();
                        _.trys.pop();
                        continue;
                }
                op = body.call(thisArg, _);
            } catch (e) {
                op = [6, e];
                y = 0;
            } finally {
                f = t = 0;
            }
        if (op[0] & 5)
            throw op[1];
        return {
            value: op[0] ? op[1] : void 0,
            done: true
        };
    }
};
var SessionManager = function() {
    function SessionManager2() {}
    SessionManager2.logout = function(options) {
        return __awaiter$9(this, void 0, void 0, function() {
            var _a2, middleware, realmPath, serverConfig, init, path, url, runMiddleware, req, response;
            return __generator$9(this, function(_b) {
                switch (_b.label) {
                    case 0:
                        _a2 = Config.get(options), middleware = _a2.middleware, realmPath = _a2.realmPath, serverConfig = _a2.serverConfig;
                        init = {
                            credentials: "include",
                            headers: new Headers({
                                "accept-api-version": "protocol=1.0,resource=2.0",
                                "x-requested-with": REQUESTED_WITH
                            }),
                            method: "POST"
                        };
                        path = "".concat(getEndpointPath("sessions", realmPath, serverConfig.paths), "?_action=logout");
                        url = resolve(serverConfig.baseUrl, path);
                        runMiddleware = middlewareWrapper({
                            url: new URL(url),
                            init
                        }, {
                            type: ActionTypes.Logout
                        });
                        req = runMiddleware(middleware);
                        return [4, withTimeout(fetch(req.url.toString(), req.init), serverConfig.timeout)];
                    case 1:
                        response = _b.sent();
                        if (!isOkOr4xx(response)) {
                            throw new Error("Failed to log out; received ".concat(response.status));
                        }
                        return [2, response];
                }
            });
        });
    };
    return SessionManager2;
}();

function tokensWillExpireWithinThreshold(oauthThreshold, tokenExpiry) {
    if (oauthThreshold && tokenExpiry) {
        return tokenExpiry - oauthThreshold < Date.now();
    }
    return false;
}
var __assign$6 = function() {
    __assign$6 = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s)
                if (Object.prototype.hasOwnProperty.call(s, p))
                    t[p] = s[p];
        }
        return t;
    };
    return __assign$6.apply(this, arguments);
};
var __awaiter$a = function(thisArg, _arguments, P, generator) {
    function adopt(value) {
        return value instanceof P ? value : new P(function(resolve2) {
            resolve2(value);
        });
    }
    return new(P || (P = Promise))(function(resolve2, reject) {
        function fulfilled(value) {
            try {
                step(generator.next(value));
            } catch (e) {
                reject(e);
            }
        }

        function rejected(value) {
            try {
                step(generator["throw"](value));
            } catch (e) {
                reject(e);
            }
        }

        function step(result) {
            result.done ? resolve2(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator$a = function(thisArg, body) {
    var _ = {
            label: 0,
            sent: function() {
                if (t[0] & 1)
                    throw t[1];
                return t[1];
            },
            trys: [],
            ops: []
        },
        f, y, t, g;
    return g = {
        next: verb(0),
        throw: verb(1),
        return: verb(2)
    }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
        return this;
    }), g;

    function verb(n) {
        return function(v) {
            return step([n, v]);
        };
    }

    function step(op) {
        if (f)
            throw new TypeError("Generator is already executing.");
        while (_)
            try {
                if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
                    return t;
                if (y = 0, t)
                    op = [op[0] & 2, t.value];
                switch (op[0]) {
                    case 0:
                    case 1:
                        t = op;
                        break;
                    case 4:
                        _.label++;
                        return {
                            value: op[1], done: false
                        };
                    case 5:
                        _.label++;
                        y = op[1];
                        op = [0];
                        continue;
                    case 7:
                        op = _.ops.pop();
                        _.trys.pop();
                        continue;
                    default:
                        if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                            _ = 0;
                            continue;
                        }
                        if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
                            _.label = op[1];
                            break;
                        }
                        if (op[0] === 6 && _.label < t[1]) {
                            _.label = t[1];
                            t = op;
                            break;
                        }
                        if (t && _.label < t[2]) {
                            _.label = t[2];
                            _.ops.push(op);
                            break;
                        }
                        if (t[2])
                            _.ops.pop();
                        _.trys.pop();
                        continue;
                }
                op = body.call(thisArg, _);
            } catch (e) {
                op = [6, e];
                y = 0;
            } finally {
                f = t = 0;
            }
        if (op[0] & 5)
            throw op[1];
        return {
            value: op[0] ? op[1] : void 0,
            done: true
        };
    }
};
var TokenManager = function() {
    function TokenManager2() {}
    TokenManager2.getTokens = function(options) {
        var _a2, _b, _c;
        return __awaiter$a(this, void 0, void 0, function() {
            var tokens, _d, clientId, middleware, serverConfig, support, oauthThreshold, error_1, error_2, storedString, storedValues, verifier, state, authorizeUrlOptions, authorizeUrl, parsedUrl, _e, runMiddleware, init, response, parsedQuery, err_1;
            return __generator$a(this, function(_f) {
                switch (_f.label) {
                    case 0:
                        tokens = null;
                        _d = Config.get(options), clientId = _d.clientId, middleware = _d.middleware, serverConfig = _d.serverConfig, support = _d.support, oauthThreshold = _d.oauthThreshold;
                        _f.label = 1;
                    case 1:
                        _f.trys.push([1, 3, , 4]);
                        return [4, TokenStorage.get()];
                    case 2:
                        tokens = _f.sent();
                        return [3, 4];
                    case 3:
                        error_1 = _f.sent();
                        console.info("No stored tokens available", error_1);
                        return [3, 4];
                    case 4:
                        if (tokens && !(options === null || options === void 0 ? void 0 : options.forceRenew) && !((_a2 = options === null || options === void 0 ? void 0 : options.query) === null || _a2 === void 0 ? void 0 : _a2.code) && !tokensWillExpireWithinThreshold(oauthThreshold, tokens.tokenExpiry)) {
                            return [2, tokens];
                        }
                        if (!tokens)
                            return [3, 9];
                        _f.label = 5;
                    case 5:
                        _f.trys.push([5, 8, , 9]);
                        return [4, OAuth2Client.revokeToken(options)];
                    case 6:
                        _f.sent();
                        return [4, TokenManager2.deleteTokens()];
                    case 7:
                        _f.sent();
                        return [3, 9];
                    case 8:
                        error_2 = _f.sent();
                        console.warn("Existing tokens could not be revoked or deleted", error_2);
                        return [3, 9];
                    case 9:
                        if (!(((_b = options === null || options === void 0 ? void 0 : options.query) === null || _b === void 0 ? void 0 : _b.code) && ((_c = options === null || options === void 0 ? void 0 : options.query) === null || _c === void 0 ? void 0 : _c.state)))
                            return [3, 11];
                        storedString = window.sessionStorage.getItem(clientId);
                        window.sessionStorage.removeItem(clientId);
                        storedValues = JSON.parse(storedString);
                        return [4, this.tokenExchange(options, storedValues)];
                    case 10:
                        return [2, _f.sent()];
                    case 11:
                        verifier = PKCE.createVerifier();
                        state = PKCE.createState();
                        authorizeUrlOptions = __assign$6(__assign$6({}, options), {
                            responseType: ResponseType.Code,
                            state,
                            verifier
                        });
                        return [4, OAuth2Client.createAuthorizeUrl(authorizeUrlOptions)];
                    case 12:
                        authorizeUrl = _f.sent();
                        _f.label = 13;
                    case 13:
                        _f.trys.push([13, 18, , 19]);
                        parsedUrl = void 0;
                        if (!(support === "legacy" || support === void 0))
                            return [3, 15];
                        _e = URL.bind;
                        return [4, OAuth2Client.getAuthCodeByIframe(authorizeUrlOptions)];
                    case 14:
                        parsedUrl = new(_e.apply(URL, [void 0, _f.sent()]))();
                        return [3, 17];
                    case 15:
                        runMiddleware = middlewareWrapper({
                            url: new URL(authorizeUrl),
                            init: {
                                credentials: "include",
                                mode: "cors"
                            }
                        }, {
                            type: ActionTypes.Authorize
                        });
                        init = runMiddleware(middleware).init;
                        return [4, withTimeout(fetch(authorizeUrl, init), serverConfig.timeout)];
                    case 16:
                        response = _f.sent();
                        parsedUrl = new URL(response.url);
                        _f.label = 17;
                    case 17:
                        if (parsedUrl.searchParams.get("error")) {
                            throw Error("".concat(parsedUrl.searchParams.get("error_description")));
                        } else if (!parsedUrl.searchParams.get("code")) {
                            throw Error(allowedErrors.AuthenticationConsentRequired);
                        }
                        parsedQuery = parseQuery(parsedUrl.toString());
                        if (!options) {
                            options = {};
                        }
                        options.query = parsedQuery;
                        return [3, 19];
                    case 18:
                        err_1 = _f.sent();
                        if (!(err_1 instanceof Error) || (options === null || options === void 0 ? void 0 : options.login) !== "redirect") {
                            throw err_1;
                        }
                        if (allowedErrors.AuthenticationConsentRequired !== err_1.message && allowedErrors.AuthorizationTimeout !== err_1.message && allowedErrors.FailedToFetch !== err_1.message && allowedErrors.NetworkError !== err_1.message && !err_1.message.includes(allowedErrors.CORSError)) {
                            throw err_1;
                        }
                        window.sessionStorage.setItem(clientId, JSON.stringify(authorizeUrlOptions));
                        return [2, window.location.assign(authorizeUrl)];
                    case 19:
                        return [4, this.tokenExchange(options, {
                            state,
                            verifier
                        })];
                    case 20:
                        return [2, _f.sent()];
                }
            });
        });
    };
    TokenManager2.deleteTokens = function() {
        return __awaiter$a(this, void 0, void 0, function() {
            return __generator$a(this, function(_a2) {
                switch (_a2.label) {
                    case 0:
                        return [4, TokenStorage.remove()];
                    case 1:
                        _a2.sent();
                        return [2];
                }
            });
        });
    };
    TokenManager2.tokenExchange = function(options, stored) {
        var _a2, _b, _c, _d;
        return __awaiter$a(this, void 0, void 0, function() {
            var authorizationCode, verifier, getTokensOptions, tokens, error_3;
            return __generator$a(this, function(_e) {
                switch (_e.label) {
                    case 0:
                        if (((_a2 = options.query) === null || _a2 === void 0 ? void 0 : _a2.state) !== stored.state) {
                            throw new Error("State mismatch");
                        }
                        if (!((_b = options.query) === null || _b === void 0 ? void 0 : _b.code) || Array.isArray((_c = options.query) === null || _c === void 0 ? void 0 : _c.code)) {
                            throw new Error("Failed to acquire authorization code");
                        }
                        authorizationCode = (_d = options.query) === null || _d === void 0 ? void 0 : _d.code;
                        verifier = stored.verifier;
                        getTokensOptions = __assign$6(__assign$6({}, options), {
                            authorizationCode,
                            verifier
                        });
                        return [4, OAuth2Client.getOAuth2Tokens(getTokensOptions)];
                    case 1:
                        tokens = _e.sent();
                        if (!tokens || !tokens.accessToken) {
                            throw new Error("Unable to exchange authorization for tokens");
                        }
                        _e.label = 2;
                    case 2:
                        _e.trys.push([2, 4, , 5]);
                        return [4, TokenStorage.set(tokens)];
                    case 3:
                        _e.sent();
                        return [3, 5];
                    case 4:
                        error_3 = _e.sent();
                        console.error("Failed to store tokens", error_3);
                        return [3, 5];
                    case 5:
                        return [2, tokens];
                }
            });
        });
    };
    return TokenManager2;
}();
var UserManager = function() {
    function UserManager2() {}
    UserManager2.getCurrentUser = function(options) {
        return OAuth2Client.getUserInfo(options);
    };
    return UserManager2;
}();
var __awaiter$b = function(thisArg, _arguments, P, generator) {
    function adopt(value) {
        return value instanceof P ? value : new P(function(resolve2) {
            resolve2(value);
        });
    }
    return new(P || (P = Promise))(function(resolve2, reject) {
        function fulfilled(value) {
            try {
                step(generator.next(value));
            } catch (e) {
                reject(e);
            }
        }

        function rejected(value) {
            try {
                step(generator["throw"](value));
            } catch (e) {
                reject(e);
            }
        }

        function step(result) {
            result.done ? resolve2(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator$b = function(thisArg, body) {
    var _ = {
            label: 0,
            sent: function() {
                if (t[0] & 1)
                    throw t[1];
                return t[1];
            },
            trys: [],
            ops: []
        },
        f, y, t, g;
    return g = {
        next: verb(0),
        throw: verb(1),
        return: verb(2)
    }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
        return this;
    }), g;

    function verb(n) {
        return function(v) {
            return step([n, v]);
        };
    }

    function step(op) {
        if (f)
            throw new TypeError("Generator is already executing.");
        while (_)
            try {
                if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
                    return t;
                if (y = 0, t)
                    op = [op[0] & 2, t.value];
                switch (op[0]) {
                    case 0:
                    case 1:
                        t = op;
                        break;
                    case 4:
                        _.label++;
                        return {
                            value: op[1], done: false
                        };
                    case 5:
                        _.label++;
                        y = op[1];
                        op = [0];
                        continue;
                    case 7:
                        op = _.ops.pop();
                        _.trys.pop();
                        continue;
                    default:
                        if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                            _ = 0;
                            continue;
                        }
                        if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
                            _.label = op[1];
                            break;
                        }
                        if (op[0] === 6 && _.label < t[1]) {
                            _.label = t[1];
                            t = op;
                            break;
                        }
                        if (t && _.label < t[2]) {
                            _.label = t[2];
                            _.ops.push(op);
                            break;
                        }
                        if (t[2])
                            _.ops.pop();
                        _.trys.pop();
                        continue;
                }
                op = body.call(thisArg, _);
            } catch (e) {
                op = [6, e];
                y = 0;
            } finally {
                f = t = 0;
            }
        if (op[0] & 5)
            throw op[1];
        return {
            value: op[0] ? op[1] : void 0,
            done: true
        };
    }
};
var FRUser = function() {
    function FRUser2() {}
    FRUser2.login = function(handler, options) {
        return __awaiter$b(this, void 0, void 0, function() {
            return __generator$b(this, function(_a2) {
                console.info(handler, options);
                throw new Error("FRUser.login() not implemented");
            });
        });
    };
    FRUser2.loginWithUI = function(ui, options) {
        return __awaiter$b(this, void 0, void 0, function() {
            var currentUser;
            return __generator$b(this, function(_a2) {
                switch (_a2.label) {
                    case 0:
                        _a2.trys.push([0, 4, , 5]);
                        return [4, ui.getSession(options)];
                    case 1:
                        _a2.sent();
                        return [4, TokenManager.getTokens({
                            forceRenew: true
                        })];
                    case 2:
                        _a2.sent();
                        return [4, UserManager.getCurrentUser()];
                    case 3:
                        currentUser = _a2.sent();
                        return [2, currentUser];
                    case 4:
                        _a2.sent();
                        throw new Error("Login failed");
                    case 5:
                        return [2];
                }
            });
        });
    };
    FRUser2.logout = function(options) {
        return __awaiter$b(this, void 0, void 0, function() {
            return __generator$b(this, function(_a2) {
                switch (_a2.label) {
                    case 0:
                        _a2.trys.push([0, 2, , 3]);
                        return [4, SessionManager.logout(options)];
                    case 1:
                        _a2.sent();
                        return [3, 3];
                    case 2:
                        _a2.sent();
                        console.warn("Session logout was not successful");
                        return [3, 3];
                    case 3:
                        _a2.trys.push([3, 5, , 6]);
                        return [4, OAuth2Client.endSession(options)];
                    case 4:
                        _a2.sent();
                        return [3, 6];
                    case 5:
                        _a2.sent();
                        console.warn("OAuth endSession was not successful");
                        return [3, 6];
                    case 6:
                        _a2.trys.push([6, 8, , 9]);
                        return [4, OAuth2Client.revokeToken(options)];
                    case 7:
                        _a2.sent();
                        return [3, 9];
                    case 8:
                        _a2.sent();
                        console.warn("OAuth revokeToken was not successful");
                        return [3, 9];
                    case 9:
                        return [4, TokenManager.deleteTokens()];
                    case 10:
                        _a2.sent();
                        return [2];
                }
            });
        });
    };
    return FRUser2;
}();
var WebAuthnOutcome;
(function(WebAuthnOutcome2) {
    WebAuthnOutcome2["Error"] = "ERROR";
    WebAuthnOutcome2["Unsupported"] = "unsupported";
})(WebAuthnOutcome || (WebAuthnOutcome = {}));
var WebAuthnOutcomeType;
(function(WebAuthnOutcomeType2) {
    WebAuthnOutcomeType2["AbortError"] = "AbortError";
    WebAuthnOutcomeType2["DataError"] = "DataError";
    WebAuthnOutcomeType2["ConstraintError"] = "ConstraintError";
    WebAuthnOutcomeType2["EncodingError"] = "EncodingError";
    WebAuthnOutcomeType2["InvalidError"] = "InvalidError";
    WebAuthnOutcomeType2["NetworkError"] = "NetworkError";
    WebAuthnOutcomeType2["NotAllowedError"] = "NotAllowedError";
    WebAuthnOutcomeType2["NotSupportedError"] = "NotSupportedError";
    WebAuthnOutcomeType2["SecurityError"] = "SecurityError";
    WebAuthnOutcomeType2["TimeoutError"] = "TimeoutError";
    WebAuthnOutcomeType2["UnknownError"] = "UnknownError";
})(WebAuthnOutcomeType || (WebAuthnOutcomeType = {}));
var WebAuthnStepType;
(function(WebAuthnStepType2) {
    WebAuthnStepType2[WebAuthnStepType2["None"] = 0] = "None";
    WebAuthnStepType2[WebAuthnStepType2["Authentication"] = 1] = "Authentication";
    WebAuthnStepType2[WebAuthnStepType2["Registration"] = 2] = "Registration";
})(WebAuthnStepType || (WebAuthnStepType = {}));

function ensureArray(arr) {
    return arr || [];
}

function arrayBufferToString(arrayBuffer) {
    var uint8Array = new Uint8Array(arrayBuffer);
    var txtDecoder = new TextDecoder();
    var json = txtDecoder.decode(uint8Array);
    return json;
}

function getIndexOne(arr) {
    return arr ? arr[1] : "";
}

function parseCredentials(value) {
    try {
        var creds = value.split("}").filter(function(x) {
            return !!x && x !== "]";
        }).map(function(x) {
            var idArray = parseNumberArray(x);
            return {
                id: new Int8Array(idArray).buffer,
                type: "public-key"
            };
        });
        return creds;
    } catch (error) {
        var e = new Error("Transforming credential object to string failed");
        e.name = WebAuthnOutcomeType.EncodingError;
        throw e;
    }
}

function parseNumberArray(value) {
    var matches = /new Int8Array\((.+)\)/.exec(value);
    if (matches === null || matches.length < 2) {
        return [];
    }
    return JSON.parse(matches[1]);
}

function parsePubKeyArray(value) {
    if (Array.isArray(value)) {
        return value;
    }
    if (typeof value !== "string") {
        return void 0;
    }
    if (value && value[0] === "[") {
        return JSON.parse(value);
    }
    value = value.replace(/(\w+):/g, '"$1":');
    return JSON.parse("[".concat(value, "]"));
}

function parseRelyingPartyId(relyingPartyId) {
    if (relyingPartyId.includes("rpId")) {
        return relyingPartyId.replace(/rpId: "(.+)",/, "$1");
    } else {
        return relyingPartyId.replace(/id: "(.+)",/, "$1");
    }
}
var __assign$7 = function() {
    __assign$7 = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s)
                if (Object.prototype.hasOwnProperty.call(s, p))
                    t[p] = s[p];
        }
        return t;
    };
    return __assign$7.apply(this, arguments);
};

function parseWebAuthnRegisterText(text) {
    var txtEncoder = new TextEncoder();
    var attestation = getIndexOne(text.match(/attestation"{0,}:\s{0,}"(\w+)"/));
    var timeout = Number(getIndexOne(text.match(/timeout"{0,}:\s{0,}(\d+)/)));
    var userVerification = getIndexOne(text.match(/userVerification"{0,}:\s{0,}"(\w+)"/));
    var requireResidentKey = getIndexOne(text.match(/requireResidentKey"{0,}:\s{0,}(\w+)/));
    var authenticatorAttachment = getIndexOne(text.match(/authenticatorAttachment"{0,}:\s{0,}"([\w-]+)/));
    var rp = getIndexOne(text.match(/rp"{0,}:\s{0,}{([^}]+)}/)).trim();
    var rpId = getIndexOne(rp.match(/id"{0,}:\s{0,}"([^"]*)"/));
    var rpName = getIndexOne(rp.match(/name"{0,}:\s{0,}"([^"]*)"/));
    var user = getIndexOne(text.match(/user"{0,}:\s{0,}{([^]{0,})},/)).trim();
    var userId = getIndexOne(user.match(/id"{0,}:\s{0,}Uint8Array.from\("([^"]+)"/));
    var userName = getIndexOne(user.match(/name"{0,}:\s{0,}"([\d\w._-]+)"/));
    var userDisplayName = getIndexOne(user.match(/displayName"{0,}:\s{0,}"([\d\w\s.@_-]+)"/));
    var pubKeyCredParamsString = getIndexOne(text.match(/pubKeyCredParams"*:\s*\[([^]+\d\s*})\s*]/)).trim();
    var pubKeyCredParams = parsePubKeyArray(pubKeyCredParamsString);
    if (!pubKeyCredParams) {
        var e = new Error("Missing pubKeyCredParams property from registration options");
        e.name = WebAuthnOutcomeType.DataError;
        throw e;
    }
    var excludeCredentialsString = getIndexOne(text.match(/excludeCredentials"{0,}:\s{0,}\[([^]+)\s{0,}]/)).trim();
    var excludeCredentials = parseCredentials(excludeCredentialsString);
    var challengeArr = ensureArray(text.match(/challenge"{0,}:\s{0,}new\s{0,}(Uint|Int)8Array\(([^\)]+)/));
    var challengeJSON = JSON.parse(challengeArr[2]);
    var challenge = new Int8Array(challengeJSON).buffer;
    return __assign$7(__assign$7({
        attestation,
        authenticatorSelection: __assign$7(__assign$7({
            userVerification
        }, authenticatorAttachment && {
            authenticatorAttachment
        }), requireResidentKey === "true" && {
            requireResidentKey: !!requireResidentKey
        }),
        challenge
    }, excludeCredentials.length && {
        excludeCredentials
    }), {
        pubKeyCredParams,
        rp: __assign$7({
            name: rpName
        }, rpId && {
            id: rpId
        }),
        timeout,
        user: {
            displayName: userDisplayName,
            id: txtEncoder.encode(userId),
            name: userName
        }
    });
}

function parseWebAuthnAuthenticateText(text) {
    var allowCredentials;
    var allowCredentialsText;
    if (text.includes("acceptableCredentials")) {
        allowCredentialsText = getIndexOne(text.match(/acceptableCredentials"*\s*=\s*\[([^]+)\s*]/)).trim();
    } else {
        allowCredentialsText = getIndexOne(text.match(/allowCredentials"{0,}:\s{0,}\[([^]+)\s{0,}]/)).trim();
    }
    var userVerification = getIndexOne(text.match(/userVerification"{0,}:\s{0,}"(\w+)"/));
    if (allowCredentialsText) {
        var allowCredentialArr = allowCredentialsText.split("},") || [allowCredentialsText];
        allowCredentials = allowCredentialArr.map(function(str) {
            var type = getIndexOne(str.match(/type"{0,}:\s{0,}"([\w-]+)"/));
            var idArr = ensureArray(str.match(/id"{0,}:\s{0,}new\s{0,}(Uint|Int)8Array\(([^\)]+)/));
            var idJSON = JSON.parse(idArr[2]);
            var id = new Int8Array(idJSON).buffer;
            return {
                type,
                id
            };
        });
    }
    var timeout = Number(getIndexOne(text.match(/timeout"{0,}:\s{0,}(\d+)/)));
    var challengeArr = ensureArray(text.match(/challenge"{0,}:\s{0,}new\s{0,}(Uint|Int)8Array\(([^\)]+)/));
    var challengeJSON = JSON.parse(challengeArr[2]);
    var challenge = new Int8Array(challengeJSON).buffer;
    var rpId = getIndexOne(text.match(/rpId"{0,}:\s{0,}\\{0,}"([^"\\]*)/));
    return __assign$7(__assign$7(__assign$7({
        challenge,
        timeout
    }, allowCredentials && {
        allowCredentials
    }), userVerification && {
        userVerification
    }), rpId && {
        rpId
    });
}
var __assign$8 = function() {
    __assign$8 = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s)
                if (Object.prototype.hasOwnProperty.call(s, p))
                    t[p] = s[p];
        }
        return t;
    };
    return __assign$8.apply(this, arguments);
};
var __awaiter$c = function(thisArg, _arguments, P, generator) {
    function adopt(value) {
        return value instanceof P ? value : new P(function(resolve2) {
            resolve2(value);
        });
    }
    return new(P || (P = Promise))(function(resolve2, reject) {
        function fulfilled(value) {
            try {
                step(generator.next(value));
            } catch (e) {
                reject(e);
            }
        }

        function rejected(value) {
            try {
                step(generator["throw"](value));
            } catch (e) {
                reject(e);
            }
        }

        function step(result) {
            result.done ? resolve2(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator$c = function(thisArg, body) {
    var _ = {
            label: 0,
            sent: function() {
                if (t[0] & 1)
                    throw t[1];
                return t[1];
            },
            trys: [],
            ops: []
        },
        f, y, t, g;
    return g = {
        next: verb(0),
        throw: verb(1),
        return: verb(2)
    }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
        return this;
    }), g;

    function verb(n) {
        return function(v) {
            return step([n, v]);
        };
    }

    function step(op) {
        if (f)
            throw new TypeError("Generator is already executing.");
        while (_)
            try {
                if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
                    return t;
                if (y = 0, t)
                    op = [op[0] & 2, t.value];
                switch (op[0]) {
                    case 0:
                    case 1:
                        t = op;
                        break;
                    case 4:
                        _.label++;
                        return {
                            value: op[1], done: false
                        };
                    case 5:
                        _.label++;
                        y = op[1];
                        op = [0];
                        continue;
                    case 7:
                        op = _.ops.pop();
                        _.trys.pop();
                        continue;
                    default:
                        if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                            _ = 0;
                            continue;
                        }
                        if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
                            _.label = op[1];
                            break;
                        }
                        if (op[0] === 6 && _.label < t[1]) {
                            _.label = t[1];
                            t = op;
                            break;
                        }
                        if (t && _.label < t[2]) {
                            _.label = t[2];
                            _.ops.push(op);
                            break;
                        }
                        if (t[2])
                            _.ops.pop();
                        _.trys.pop();
                        continue;
                }
                op = body.call(thisArg, _);
            } catch (e) {
                op = [6, e];
                y = 0;
            } finally {
                f = t = 0;
            }
        if (op[0] & 5)
            throw op[1];
        return {
            value: op[0] ? op[1] : void 0,
            done: true
        };
    }
};
var FRWebAuthn = function() {
    function FRWebAuthn2() {}
    FRWebAuthn2.getWebAuthnStepType = function(step) {
        var outcomeCallback = this.getOutcomeCallback(step);
        var metadataCallback = this.getMetadataCallback(step);
        var textOutputCallback = this.getTextOutputCallback(step);
        if (outcomeCallback && metadataCallback) {
            var metadata = metadataCallback.getOutputValue("data");
            if (metadata === null || metadata === void 0 ? void 0 : metadata.pubKeyCredParams) {
                return WebAuthnStepType.Registration;
            }
            return WebAuthnStepType.Authentication;
        } else if (outcomeCallback && textOutputCallback) {
            var message = textOutputCallback.getMessage();
            if (message.includes("pubKeyCredParams")) {
                return WebAuthnStepType.Registration;
            }
            return WebAuthnStepType.Authentication;
        } else {
            return WebAuthnStepType.None;
        }
    };
    FRWebAuthn2.authenticate = function(step) {
        return __awaiter$c(this, void 0, void 0, function() {
            var _a2, hiddenCallback, metadataCallback, textOutputCallback, outcome, publicKey, meta, credential, error_1, e;
            return __generator$c(this, function(_b) {
                switch (_b.label) {
                    case 0:
                        _a2 = this.getCallbacks(step), hiddenCallback = _a2.hiddenCallback, metadataCallback = _a2.metadataCallback, textOutputCallback = _a2.textOutputCallback;
                        if (!(hiddenCallback && (metadataCallback || textOutputCallback)))
                            return [3, 5];
                        outcome = void 0;
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        publicKey = void 0;
                        if (metadataCallback) {
                            meta = metadataCallback.getOutputValue("data");
                            publicKey = this.createAuthenticationPublicKey(meta);
                        } else if (textOutputCallback) {
                            publicKey = parseWebAuthnAuthenticateText(textOutputCallback.getMessage());
                        }
                        return [4, this.getAuthenticationCredential(publicKey)];
                    case 2:
                        credential = _b.sent();
                        outcome = this.getAuthenticationOutcome(credential);
                        return [3, 4];
                    case 3:
                        error_1 = _b.sent();
                        if (!(error_1 instanceof Error))
                            throw error_1;
                        if (error_1.name === WebAuthnOutcomeType.NotSupportedError) {
                            hiddenCallback.setInputValue(WebAuthnOutcome.Unsupported);
                            throw error_1;
                        }
                        hiddenCallback.setInputValue("".concat(WebAuthnOutcome.Error, "::").concat(error_1.name, ":").concat(error_1.message));
                        throw error_1;
                    case 4:
                        hiddenCallback.setInputValue(outcome);
                        return [2, step];
                    case 5:
                        e = new Error("Incorrect callbacks for WebAuthn authentication");
                        e.name = WebAuthnOutcomeType.DataError;
                        hiddenCallback === null || hiddenCallback === void 0 ? void 0 : hiddenCallback.setInputValue("".concat(WebAuthnOutcome.Error, "::").concat(e.name, ":").concat(e.message));
                        throw e;
                }
            });
        });
    };
    FRWebAuthn2.register = function(step) {
        return __awaiter$c(this, void 0, void 0, function() {
            var _a2, hiddenCallback, metadataCallback, textOutputCallback, outcome, publicKey, meta, credential, error_2, e;
            return __generator$c(this, function(_b) {
                switch (_b.label) {
                    case 0:
                        _a2 = this.getCallbacks(step), hiddenCallback = _a2.hiddenCallback, metadataCallback = _a2.metadataCallback, textOutputCallback = _a2.textOutputCallback;
                        if (!(hiddenCallback && (metadataCallback || textOutputCallback)))
                            return [3, 5];
                        outcome = void 0;
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        publicKey = void 0;
                        if (metadataCallback) {
                            meta = metadataCallback.getOutputValue("data");
                            publicKey = this.createRegistrationPublicKey(meta);
                        } else if (textOutputCallback) {
                            publicKey = parseWebAuthnRegisterText(textOutputCallback.getMessage());
                        }
                        return [4, this.getRegistrationCredential(publicKey)];
                    case 2:
                        credential = _b.sent();
                        outcome = this.getRegistrationOutcome(credential);
                        return [3, 4];
                    case 3:
                        error_2 = _b.sent();
                        if (!(error_2 instanceof Error))
                            throw error_2;
                        if (error_2.name === WebAuthnOutcomeType.NotSupportedError) {
                            hiddenCallback.setInputValue(WebAuthnOutcome.Unsupported);
                            throw error_2;
                        }
                        hiddenCallback.setInputValue("".concat(WebAuthnOutcome.Error, "::").concat(error_2.name, ":").concat(error_2.message));
                        throw error_2;
                    case 4:
                        hiddenCallback.setInputValue(outcome);
                        return [2, step];
                    case 5:
                        e = new Error("Incorrect callbacks for WebAuthn registration");
                        e.name = WebAuthnOutcomeType.DataError;
                        hiddenCallback === null || hiddenCallback === void 0 ? void 0 : hiddenCallback.setInputValue("".concat(WebAuthnOutcome.Error, "::").concat(e.name, ":").concat(e.message));
                        throw e;
                }
            });
        });
    };
    FRWebAuthn2.getCallbacks = function(step) {
        var hiddenCallback = this.getOutcomeCallback(step);
        var metadataCallback = this.getMetadataCallback(step);
        var textOutputCallback = this.getTextOutputCallback(step);
        var returnObj = {
            hiddenCallback
        };
        if (metadataCallback) {
            returnObj.metadataCallback = metadataCallback;
        } else if (textOutputCallback) {
            returnObj.textOutputCallback = textOutputCallback;
        }
        return returnObj;
    };
    FRWebAuthn2.getMetadataCallback = function(step) {
        return step.getCallbacksOfType(CallbackType.MetadataCallback).find(function(x) {
            var cb = x.getOutputByName("data", void 0);
            return cb && cb.hasOwnProperty("relyingPartyId");
        });
    };
    FRWebAuthn2.getOutcomeCallback = function(step) {
        return step.getCallbacksOfType(CallbackType.HiddenValueCallback).find(function(x) {
            return x.getOutputByName("id", "") === "webAuthnOutcome";
        });
    };
    FRWebAuthn2.getTextOutputCallback = function(step) {
        return step.getCallbacksOfType(CallbackType.TextOutputCallback).find(function(x) {
            var cb = x.getOutputByName("message", void 0);
            return cb && cb.includes("webAuthnOutcome");
        });
    };
    FRWebAuthn2.getAuthenticationCredential = function(options) {
        return __awaiter$c(this, void 0, void 0, function() {
            var e, credential;
            return __generator$c(this, function(_a2) {
                switch (_a2.label) {
                    case 0:
                        if (!window.PublicKeyCredential) {
                            e = new Error("PublicKeyCredential not supported by this browser");
                            e.name = WebAuthnOutcomeType.NotSupportedError;
                            throw e;
                        }
                        return [4, navigator.credentials.get({
                            publicKey: options
                        })];
                    case 1:
                        credential = _a2.sent();
                        return [2, credential];
                }
            });
        });
    };
    FRWebAuthn2.getAuthenticationOutcome = function(credential) {
        if (credential === null) {
            var e = new Error("No credential generated from authentication");
            e.name = WebAuthnOutcomeType.UnknownError;
            throw e;
        }
        try {
            var clientDataJSON = arrayBufferToString(credential.response.clientDataJSON);
            var assertionResponse = credential.response;
            var authenticatorData = new Int8Array(assertionResponse.authenticatorData).toString();
            var signature = new Int8Array(assertionResponse.signature).toString();
            var userHandle = arrayBufferToString(credential.response.userHandle);
            var stringOutput = "".concat(clientDataJSON, "::").concat(authenticatorData, "::").concat(signature, "::").concat(credential.id);
            if (userHandle) {
                stringOutput = "".concat(stringOutput, "::").concat(userHandle);
            }
            return stringOutput;
        } catch (error) {
            var e = new Error("Transforming credential object to string failed");
            e.name = WebAuthnOutcomeType.EncodingError;
            throw e;
        }
    };
    FRWebAuthn2.getRegistrationCredential = function(options) {
        return __awaiter$c(this, void 0, void 0, function() {
            var e, credential;
            return __generator$c(this, function(_a2) {
                switch (_a2.label) {
                    case 0:
                        if (!window.PublicKeyCredential) {
                            e = new Error("PublicKeyCredential not supported by this browser");
                            e.name = WebAuthnOutcomeType.NotSupportedError;
                            throw e;
                        }
                        return [4, navigator.credentials.create({
                            publicKey: options
                        })];
                    case 1:
                        credential = _a2.sent();
                        return [2, credential];
                }
            });
        });
    };
    FRWebAuthn2.getRegistrationOutcome = function(credential) {
        if (credential === null) {
            var e = new Error("No credential generated from registration");
            e.name = WebAuthnOutcomeType.UnknownError;
            throw e;
        }
        try {
            var clientDataJSON = arrayBufferToString(credential.response.clientDataJSON);
            var attestationResponse = credential.response;
            var attestationObject = new Int8Array(attestationResponse.attestationObject).toString();
            return "".concat(clientDataJSON, "::").concat(attestationObject, "::").concat(credential.id);
        } catch (error) {
            var e = new Error("Transforming credential object to string failed");
            e.name = WebAuthnOutcomeType.EncodingError;
            throw e;
        }
    };
    FRWebAuthn2.createAuthenticationPublicKey = function(metadata) {
        var acceptableCredentials = metadata.acceptableCredentials,
            allowCredentials = metadata.allowCredentials,
            challenge = metadata.challenge,
            relyingPartyId = metadata.relyingPartyId,
            timeout = metadata.timeout,
            userVerification = metadata.userVerification;
        var rpId = parseRelyingPartyId(relyingPartyId);
        var allowCredentialsValue = parseCredentials(allowCredentials || acceptableCredentials || "");
        return __assign$8(__assign$8(__assign$8({
            challenge: Uint8Array.from(atob(challenge), function(c) {
                return c.charCodeAt(0);
            }).buffer,
            timeout
        }, allowCredentialsValue && {
            allowCredentials: allowCredentialsValue
        }), userVerification && {
            userVerification
        }), rpId && {
            rpId
        });
    };
    FRWebAuthn2.createRegistrationPublicKey = function(metadata) {
        var pubKeyCredParamsString = metadata.pubKeyCredParams;
        var pubKeyCredParams = parsePubKeyArray(pubKeyCredParamsString);
        if (!pubKeyCredParams) {
            var e = new Error("Missing pubKeyCredParams property from registration options");
            e.name = WebAuthnOutcomeType.DataError;
            throw e;
        }
        var excludeCredentials = parseCredentials(metadata.excludeCredentials);
        var attestationPreference = metadata.attestationPreference,
            authenticatorSelection = metadata.authenticatorSelection,
            challenge = metadata.challenge,
            relyingPartyId = metadata.relyingPartyId,
            relyingPartyName = metadata.relyingPartyName,
            timeout = metadata.timeout,
            userId = metadata.userId,
            userName = metadata.userName,
            displayName = metadata.displayName;
        var rpId = parseRelyingPartyId(relyingPartyId);
        var rp = __assign$8({
            name: relyingPartyName
        }, rpId && {
            id: rpId
        });
        return __assign$8(__assign$8({
            attestation: attestationPreference,
            authenticatorSelection: JSON.parse(authenticatorSelection),
            challenge: Uint8Array.from(atob(challenge), function(c) {
                return c.charCodeAt(0);
            }).buffer
        }, excludeCredentials.length && {
            excludeCredentials
        }), {
            pubKeyCredParams,
            rp,
            timeout,
            user: {
                displayName: displayName || userName,
                id: Int8Array.from(userId.split("").map(function(c) {
                    return c.charCodeAt(0);
                })),
                name: userName
            }
        });
    };
    return FRWebAuthn2;
}();
var __awaiter$d = function(thisArg, _arguments, P, generator) {
    function adopt(value) {
        return value instanceof P ? value : new P(function(resolve2) {
            resolve2(value);
        });
    }
    return new(P || (P = Promise))(function(resolve2, reject) {
        function fulfilled(value) {
            try {
                step(generator.next(value));
            } catch (e) {
                reject(e);
            }
        }

        function rejected(value) {
            try {
                step(generator["throw"](value));
            } catch (e) {
                reject(e);
            }
        }

        function step(result) {
            result.done ? resolve2(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator$d = function(thisArg, body) {
    var _ = {
            label: 0,
            sent: function() {
                if (t[0] & 1)
                    throw t[1];
                return t[1];
            },
            trys: [],
            ops: []
        },
        f, y, t, g;
    return g = {
        next: verb(0),
        throw: verb(1),
        return: verb(2)
    }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
        return this;
    }), g;

    function verb(n) {
        return function(v) {
            return step([n, v]);
        };
    }

    function step(op) {
        if (f)
            throw new TypeError("Generator is already executing.");
        while (_)
            try {
                if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
                    return t;
                if (y = 0, t)
                    op = [op[0] & 2, t.value];
                switch (op[0]) {
                    case 0:
                    case 1:
                        t = op;
                        break;
                    case 4:
                        _.label++;
                        return {
                            value: op[1], done: false
                        };
                    case 5:
                        _.label++;
                        y = op[1];
                        op = [0];
                        continue;
                    case 7:
                        op = _.ops.pop();
                        _.trys.pop();
                        continue;
                    default:
                        if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                            _ = 0;
                            continue;
                        }
                        if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
                            _.label = op[1];
                            break;
                        }
                        if (op[0] === 6 && _.label < t[1]) {
                            _.label = t[1];
                            t = op;
                            break;
                        }
                        if (t && _.label < t[2]) {
                            _.label = t[2];
                            _.ops.push(op);
                            break;
                        }
                        if (t[2])
                            _.ops.pop();
                        _.trys.pop();
                        continue;
                }
                op = body.call(thisArg, _);
            } catch (e) {
                op = [6, e];
                y = 0;
            } finally {
                f = t = 0;
            }
        if (op[0] & 5)
            throw op[1];
        return {
            value: op[0] ? op[1] : void 0,
            done: true
        };
    }
};

function addAuthzInfoToHeaders(init, advices, tokens) {
    var headers = new Headers(init.headers);
    if (advices.AuthenticateToServiceConditionAdvice) {
        headers.set("x-tree", advices.AuthenticateToServiceConditionAdvice[0]);
    } else if (advices.TransactionConditionAdvice) {
        headers.set("x-txid", advices.TransactionConditionAdvice[0]);
    }
    if (tokens && tokens.idToken) {
        headers.set("x-idtoken", tokens.idToken);
    }
    return headers;
}

function addAuthzInfoToURL(url, advices, tokens) {
    var updatedURL = new URL(url);
    if (advices.TransactionConditionAdvice) {
        var txId = advices.TransactionConditionAdvice[0];
        updatedURL.searchParams.append("_txid", txId);
    }
    if (tokens && tokens.idToken) {
        updatedURL.searchParams.append("_idtoken", tokens.idToken);
    }
    return updatedURL.toString();
}

function buildAuthzOptions(authzObj, baseURL, timeout, realmPath, customPaths) {
    var treeAuthAdvices = authzObj.advices && authzObj.advices.AuthenticateToServiceConditionAdvice;
    var txnAuthAdvices = authzObj.advices && authzObj.advices.TransactionConditionAdvice;
    var attributeValue = "";
    var attributeName = "";
    if (treeAuthAdvices) {
        attributeValue = treeAuthAdvices.reduce(function(prev, curr) {
            var prevWithSpace = prev ? " ".concat(prev) : prev;
            prev = "".concat(curr).concat(prevWithSpace);
            return prev;
        }, "");
        attributeName = "AuthenticateToServiceConditionAdvice";
    } else if (txnAuthAdvices) {
        attributeValue = txnAuthAdvices.reduce(function(prev, curr) {
            var prevWithSpace = prev ? " ".concat(prev) : prev;
            prev = "".concat(curr).concat(prevWithSpace);
            return prev;
        }, "");
        attributeName = "TransactionConditionAdvice";
    }
    var openTags = "<Advices><AttributeValuePair>";
    var nameTag = '<Attribute name="'.concat(attributeName, '"/>');
    var valueTag = "<Value>".concat(attributeValue, "</Value>");
    var endTags = "</AttributeValuePair></Advices>";
    var fullXML = "".concat(openTags).concat(nameTag).concat(valueTag).concat(endTags);
    var path = getEndpointPath("authenticate", realmPath, customPaths);
    var queryParams = {
        authIndexType: "composite_advice",
        authIndexValue: fullXML
    };
    var options = {
        init: {
            method: "POST",
            credentials: "include",
            headers: new Headers({
                "Accept-API-Version": "resource=2.0, protocol=1.0"
            })
        },
        timeout,
        url: resolve(baseURL, "".concat(path, "?").concat(stringify(queryParams)))
    };
    return options;
}

function examineForIGAuthz(res) {
    var type = res.headers.get("Content-Type") || "";
    return type.includes("html") && res.url.includes("composite_advice");
}

function examineForRESTAuthz(res) {
    return __awaiter$d(this, void 0, void 0, function() {
        var clone, json;
        return __generator$d(this, function(_a2) {
            switch (_a2.label) {
                case 0:
                    clone = res.clone();
                    return [4, clone.json()];
                case 1:
                    json = _a2.sent();
                    return [2, !!json.advices];
            }
        });
    });
}

function getXMLValueFromURL(urlString) {
    var url = new URL(urlString);
    var value = url.searchParams.get("authIndexValue") || "";
    var parser = new DOMParser();
    var decodedValue = decodeURIComponent(value);
    var doc = parser.parseFromString(decodedValue, "application/xml");
    var el = doc.querySelector("Value");
    return el ? el.innerHTML : "";
}

function hasAuthzAdvice(json) {
    if (json.advices && json.advices.AuthenticateToServiceConditionAdvice) {
        return Array.isArray(json.advices.AuthenticateToServiceConditionAdvice) && json.advices.AuthenticateToServiceConditionAdvice.length > 0;
    } else if (json.advices && json.advices.TransactionConditionAdvice) {
        return Array.isArray(json.advices.TransactionConditionAdvice) && json.advices.TransactionConditionAdvice.length > 0;
    } else {
        return false;
    }
}

function isAuthzStep(res) {
    return __awaiter$d(this, void 0, void 0, function() {
        var clone, json;
        return __generator$d(this, function(_a2) {
            switch (_a2.label) {
                case 0:
                    clone = res.clone();
                    return [4, clone.json()];
                case 1:
                    json = _a2.sent();
                    return [2, !!json.callbacks];
            }
        });
    });
}

function newTokenRequired(res, requiresNewToken) {
    if (typeof requiresNewToken === "function") {
        return requiresNewToken(res);
    }
    return res.status === 401;
}

function normalizeIGJSON(res) {
    var advices = {};
    if (res.url.includes("AuthenticateToServiceConditionAdvice")) {
        advices.AuthenticateToServiceConditionAdvice = [getXMLValueFromURL(res.url)];
    } else {
        advices.TransactionConditionAdvice = [getXMLValueFromURL(res.url)];
    }
    return {
        resource: "",
        actions: {},
        attributes: {},
        advices,
        ttl: 0
    };
}

function normalizeRESTJSON(res) {
    return __awaiter$d(this, void 0, void 0, function() {
        return __generator$d(this, function(_a2) {
            switch (_a2.label) {
                case 0:
                    return [4, res.json()];
                case 1:
                    return [2, _a2.sent()];
            }
        });
    });
}
var __extends$j = function() {
    var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf || {
                __proto__: []
            }
            instanceof Array && function(d2, b2) {
                d2.__proto__ = b2;
            } || function(d2, b2) {
                for (var p in b2)
                    if (Object.prototype.hasOwnProperty.call(b2, p))
                        d2[p] = b2[p];
            };
        return extendStatics(d, b);
    };
    return function(d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);

        function __() {
            this.constructor = d;
        }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
}();
var __awaiter$e = function(thisArg, _arguments, P, generator) {
    function adopt(value) {
        return value instanceof P ? value : new P(function(resolve2) {
            resolve2(value);
        });
    }
    return new(P || (P = Promise))(function(resolve2, reject) {
        function fulfilled(value) {
            try {
                step(generator.next(value));
            } catch (e) {
                reject(e);
            }
        }

        function rejected(value) {
            try {
                step(generator["throw"](value));
            } catch (e) {
                reject(e);
            }
        }

        function step(result) {
            result.done ? resolve2(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator$e = function(thisArg, body) {
    var _ = {
            label: 0,
            sent: function() {
                if (t[0] & 1)
                    throw t[1];
                return t[1];
            },
            trys: [],
            ops: []
        },
        f, y, t, g;
    return g = {
        next: verb(0),
        throw: verb(1),
        return: verb(2)
    }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
        return this;
    }), g;

    function verb(n) {
        return function(v) {
            return step([n, v]);
        };
    }

    function step(op) {
        if (f)
            throw new TypeError("Generator is already executing.");
        while (_)
            try {
                if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
                    return t;
                if (y = 0, t)
                    op = [op[0] & 2, t.value];
                switch (op[0]) {
                    case 0:
                    case 1:
                        t = op;
                        break;
                    case 4:
                        _.label++;
                        return {
                            value: op[1], done: false
                        };
                    case 5:
                        _.label++;
                        y = op[1];
                        op = [0];
                        continue;
                    case 7:
                        op = _.ops.pop();
                        _.trys.pop();
                        continue;
                    default:
                        if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                            _ = 0;
                            continue;
                        }
                        if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
                            _.label = op[1];
                            break;
                        }
                        if (op[0] === 6 && _.label < t[1]) {
                            _.label = t[1];
                            t = op;
                            break;
                        }
                        if (t && _.label < t[2]) {
                            _.label = t[2];
                            _.ops.push(op);
                            break;
                        }
                        if (t[2])
                            _.ops.pop();
                        _.trys.pop();
                        continue;
                }
                op = body.call(thisArg, _);
            } catch (e) {
                op = [6, e];
                y = 0;
            } finally {
                f = t = 0;
            }
        if (op[0] & 5)
            throw op[1];
        return {
            value: op[0] ? op[1] : void 0,
            done: true
        };
    }
};
var HttpClient = function(_super) {
    __extends$j(HttpClient2, _super);

    function HttpClient2() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    HttpClient2.request = function(options) {
        return __awaiter$e(this, void 0, void 0, function() {
            var res, authorizationJSON, hasIG, _a2, middleware, realmPath, serverConfig, authzOptions, url, type, tree, runMiddleware, _b, authUrl, authInit, initialStep, tokens;
            return __generator$e(this, function(_c) {
                switch (_c.label) {
                    case 0:
                        return [4, this._request(options, false)];
                    case 1:
                        res = _c.sent();
                        hasIG = false;
                        if (!newTokenRequired(res, options.requiresNewToken))
                            return [3, 3];
                        return [4, this._request(options, true)];
                    case 2:
                        res = _c.sent();
                        _c.label = 3;
                    case 3:
                        if (!(options.authorization && options.authorization.handleStep))
                            return [3, 16];
                        if (!(res.redirected && examineForIGAuthz(res)))
                            return [3, 4];
                        hasIG = true;
                        authorizationJSON = normalizeIGJSON(res);
                        return [3, 7];
                    case 4:
                        return [4, examineForRESTAuthz(res)];
                    case 5:
                        if (!_c.sent())
                            return [3, 7];
                        return [4, normalizeRESTJSON(res)];
                    case 6:
                        authorizationJSON = _c.sent();
                        _c.label = 7;
                    case 7:
                        if (!(authorizationJSON && authorizationJSON.advices))
                            return [3, 16];
                        _a2 = Config.get(options.authorization.config), middleware = _a2.middleware, realmPath = _a2.realmPath, serverConfig = _a2.serverConfig;
                        authzOptions = buildAuthzOptions(authorizationJSON, serverConfig.baseUrl, options.timeout, realmPath, serverConfig.paths);
                        url = new URL(authzOptions.url);
                        type = url.searchParams.get("authIndexType");
                        tree = url.searchParams.get("authIndexValue");
                        runMiddleware = middlewareWrapper({
                            url: new URL(authzOptions.url),
                            init: authzOptions.init
                        }, {
                            type: ActionTypes.StartAuthenticate,
                            payload: {
                                type,
                                tree
                            }
                        });
                        _b = runMiddleware(middleware), authUrl = _b.url, authInit = _b.init;
                        authzOptions.url = authUrl.toString();
                        authzOptions.init = authInit;
                        return [4, this._request(authzOptions, false)];
                    case 8:
                        initialStep = _c.sent();
                        return [4, isAuthzStep(initialStep)];
                    case 9:
                        if (!_c.sent()) {
                            throw new Error('Error: Initial response from auth server not a "step".');
                        }
                        if (!hasAuthzAdvice(authorizationJSON)) {
                            throw new Error("Error: Transactional or Service Advice is empty.");
                        }
                        return [4, this.stepIterator(initialStep, options.authorization.handleStep, type, tree)];
                    case 10:
                        _c.sent();
                        tokens = void 0;
                        _c.label = 11;
                    case 11:
                        _c.trys.push([11, 13, , 14]);
                        return [4, TokenStorage.get()];
                    case 12:
                        tokens = _c.sent();
                        return [3, 14];
                    case 13:
                        _c.sent();
                        return [3, 14];
                    case 14:
                        if (hasIG) {
                            options.url = addAuthzInfoToURL(options.url, authorizationJSON.advices, tokens);
                        } else {
                            options.init.headers = addAuthzInfoToHeaders(options.init, authorizationJSON.advices, tokens);
                        }
                        return [4, this._request(options, false)];
                    case 15:
                        res = _c.sent();
                        _c.label = 16;
                    case 16:
                        return [2, res];
                }
            });
        });
    };
    HttpClient2.setAuthHeaders = function(headers, forceRenew) {
        return __awaiter$e(this, void 0, void 0, function() {
            var tokens;
            return __generator$e(this, function(_a2) {
                switch (_a2.label) {
                    case 0:
                        _a2.trys.push([0, 2, , 3]);
                        return [4, TokenStorage.get()];
                    case 1:
                        tokens = _a2.sent();
                        return [3, 3];
                    case 2:
                        _a2.sent();
                        return [3, 3];
                    case 3:
                        if (!(tokens && tokens.accessToken))
                            return [3, 5];
                        return [4, TokenManager.getTokens({
                            forceRenew
                        })];
                    case 4:
                        tokens = _a2.sent();
                        if (tokens && tokens.accessToken) {
                            headers.set("Authorization", "Bearer ".concat(tokens.accessToken));
                        }
                        _a2.label = 5;
                    case 5:
                        return [2, headers];
                }
            });
        });
    };
    HttpClient2.stepIterator = function(res, handleStep, type, tree) {
        return __awaiter$e(this, void 0, void 0, function() {
            var jsonRes, initialStep;
            var _this = this;
            return __generator$e(this, function(_a2) {
                switch (_a2.label) {
                    case 0:
                        return [4, res.json()];
                    case 1:
                        jsonRes = _a2.sent();
                        initialStep = new FRStep(jsonRes);
                        return [2, new Promise(function(resolve2, reject) {
                            return __awaiter$e(_this, void 0, void 0, function() {
                                function handleNext(step) {
                                    return __awaiter$e(this, void 0, void 0, function() {
                                        var input, output;
                                        return __generator$e(this, function(_a3) {
                                            switch (_a3.label) {
                                                case 0:
                                                    return [4, handleStep(step)];
                                                case 1:
                                                    input = _a3.sent();
                                                    return [4, FRAuth.next(input, {
                                                        type,
                                                        tree
                                                    })];
                                                case 2:
                                                    output = _a3.sent();
                                                    if (output.type === StepType.LoginSuccess) {
                                                        resolve2();
                                                    } else if (output.type === StepType.LoginFailure) {
                                                        reject("Authentication tree failure.");
                                                    } else {
                                                        handleNext(output);
                                                    }
                                                    return [2];
                                            }
                                        });
                                    });
                                }
                                return __generator$e(this, function(_a3) {
                                    handleNext(initialStep);
                                    return [2];
                                });
                            });
                        })];
                }
            });
        });
    };
    HttpClient2._request = function(options, forceRenew) {
        return __awaiter$e(this, void 0, void 0, function() {
            var url, init, timeout, headers;
            return __generator$e(this, function(_a2) {
                switch (_a2.label) {
                    case 0:
                        url = options.url, init = options.init, timeout = options.timeout;
                        headers = new Headers(init.headers || {});
                        if (!!options.bypassAuthentication)
                            return [3, 2];
                        return [4, this.setAuthHeaders(headers, forceRenew)];
                    case 1:
                        headers = _a2.sent();
                        _a2.label = 2;
                    case 2:
                        init.headers = headers;
                        return [2, withTimeout(fetch(url, init), timeout)];
                }
            });
        });
    };
    return HttpClient2;
}(Dispatcher);
var Deferred = function() {
    function Deferred2() {
        var _this = this;
        this.promise = new Promise(function(resolve2, reject) {
            _this.reject = reject;
            _this.resolve = resolve2;
        });
    }
    return Deferred2;
}();
var LocalStorage = function() {
    function LocalStorage2(persist) {
        if (persist === void 0) {
            persist = false;
        }
        this.storage = persist ? window.localStorage : window.sessionStorage;
    }
    LocalStorage2.prototype.get = function(key) {
        var value = this.storage.getItem(key);
        if (!value) {
            return void 0;
        }
        return JSON.parse(value);
    };
    LocalStorage2.prototype.set = function(key, value) {
        this.storage.setItem(key, JSON.stringify(value));
    };
    LocalStorage2.prototype.remove = function(key) {
        this.storage.removeItem(key);
    };
    return LocalStorage2;
}();

export {
    AttributeInputCallback,
    Auth,
    CallbackType,
    ChoiceCallback,
    Config,
    ConfirmationCallback,
    Deferred,
    DeviceProfileCallback,
    Dispatcher,
    ErrorCode,
    FRAuth,
    FRCallback,
    FRDevice,
    FRLoginFailure,
    FRLoginSuccess,
    FRPolicy,
    FRRecoveryCodes,
    FRStep,
    FRUser,
    FRWebAuthn,
    HiddenValueCallback,
    HttpClient,
    KbaCreateCallback,
    LocalStorage,
    MetadataCallback,
    NameCallback,
    OAuth2Client,
    PKCE,
    PasswordCallback,
    PolicyKey,
    PollingWaitCallback,
    ReCaptchaCallback,
    RedirectCallback,
    ResponseType,
    SelectIdPCallback,
    SessionManager,
    StepType,
    SuspendedTextOutputCallback,
    TermsAndConditionsCallback,
    TextOutputCallback,
    TokenManager,
    TokenStorage,
    UserManager,
    ValidatedCreatePasswordCallback,
    ValidatedCreateUsernameCallback,
    WebAuthnOutcome,
    WebAuthnStepType,
    defaultMessageCreator
};
export default null;