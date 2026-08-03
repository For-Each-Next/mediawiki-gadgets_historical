/** Classification for magic words that share template braces. */

import {
    wikitext,
    type SourceRange,
    type TopLevelRange,
} from "#shared/wikitext";

interface BaseTemplateHeadSyntax {
    modifiers: SourceRange[];
    separators: SourceRange[];
}

export type TemplateHeadSyntax =
    | (BaseTemplateHeadSyntax & {
          argument?: SourceRange;
          invoke: boolean;
          kind: "magic-word";
          magicWord: SourceRange;
      })
    | (BaseTemplateHeadSyntax & {
          kind: "template";
          target: SourceRange;
      });

interface TemplateModifierState extends BaseTemplateHeadSyntax {
    allowLeadingWhitespace: boolean;
    databaseName: string;
    partIndex: number;
}

type TemplateModifier = "message" | "raw" | "substitution";

interface MagicWordCandidate {
    entered: string;
    part: TopLevelRange;
    range: SourceRange;
}

const TEMPLATE_MODIFIERS: Readonly<
    Record<TemplateModifier, readonly string[]>
> = Object.freeze({
    message: ["msg", "msgnw"],
    raw: ["raw"],
    substitution: ["safesubst", "subst"],
});

const ZHWIKI_TEMPLATE_MODIFIERS: Readonly<
    Record<TemplateModifier, readonly string[]>
> = Object.freeze({
    message: ["訊息"],
    raw: ["原始"],
    substitution: ["安全替代", "安全替換", "替代", "替換"],
});

const CASE_SENSITIVE_VARIABLES = new Set([
    "!",
    "#bcp47",
    "#contentmodel",
    "#dir",
    "#interlanguagelink",
    "#interwikilink",
    "#isbn",
    "=",
    "ARTICLEPAGENAME",
    "ARTICLEPAGENAMEE",
    "ARTICLESPACE",
    "ARTICLESPACEE",
    "BASEPAGENAME",
    "BASEPAGENAMEE",
    "CASCADINGSOURCES",
    "CONTENTLANG",
    "CONTENTLANGUAGE",
    "CURRENTDAY",
    "CURRENTDAY2",
    "CURRENTDAYNAME",
    "CURRENTDOW",
    "CURRENTHOUR",
    "CURRENTMONTH",
    "CURRENTMONTH1",
    "CURRENTMONTH2",
    "CURRENTMONTHABBREV",
    "CURRENTMONTHNAME",
    "CURRENTMONTHNAMEGEN",
    "CURRENTTIME",
    "CURRENTTIMESTAMP",
    "CURRENTVERSION",
    "CURRENTWEEK",
    "CURRENTYEAR",
    "DIRECTIONMARK",
    "DIRMARK",
    "FULLPAGENAME",
    "FULLPAGENAMEE",
    "LOCALDAY",
    "LOCALDAY2",
    "LOCALDAYNAME",
    "LOCALDOW",
    "LOCALHOUR",
    "LOCALMONTH",
    "LOCALMONTH1",
    "LOCALMONTH2",
    "LOCALMONTHABBREV",
    "LOCALMONTHNAME",
    "LOCALMONTHNAMEGEN",
    "LOCALTIME",
    "LOCALTIMESTAMP",
    "LOCALWEEK",
    "LOCALYEAR",
    "NAMESPACE",
    "NAMESPACEE",
    "NAMESPACENUMBER",
    "NUMBEROFACTIVEUSERS",
    "NUMBEROFADMINS",
    "NUMBEROFARTICLES",
    "NUMBEROFEDITS",
    "NUMBEROFFILES",
    "NUMBEROFPAGES",
    "NUMBEROFUSERS",
    "PAGELANGUAGE",
    "PAGENAME",
    "PAGENAMEE",
    "REVISIONDAY",
    "REVISIONDAY2",
    "REVISIONID",
    "REVISIONMONTH",
    "REVISIONMONTH1",
    "REVISIONSIZE",
    "REVISIONTIMESTAMP",
    "REVISIONUSER",
    "REVISIONYEAR",
    "ROOTPAGENAME",
    "ROOTPAGENAMEE",
    "SITENAME",
    "SUBJECTPAGENAME",
    "SUBJECTPAGENAMEE",
    "SUBJECTSPACE",
    "SUBJECTSPACEE",
    "SUBPAGENAME",
    "SUBPAGENAMEE",
    "TALKPAGENAME",
    "TALKPAGENAMEE",
    "TALKSPACE",
    "TALKSPACEE",
    "TRANSLATABLEPAGE",
    "USERLANGUAGE",
]);

const CASE_INSENSITIVE_VARIABLES = normalizeNames([
    "#LANGUAGE",
    "ARTICLEPATH",
    "NOEXTERNALLANGLINKS",
    "NUMBEROFWIKIS",
    "PAGEID",
    "SCRIPTPATH",
    "SERVER",
    "SERVERNAME",
    "STYLEPATH",
    "WBREPONAME",
]);

const CASE_SENSITIVE_FUNCTIONS = new Set([
    "ARTICLEPAGENAME",
    "ARTICLEPAGENAMEE",
    "ARTICLESPACE",
    "ARTICLESPACEE",
    "BASEPAGENAME",
    "BASEPAGENAMEE",
    "CASCADINGSOURCES",
    "DEFAULTCATEGORYSORT",
    "DEFAULTSORT",
    "DEFAULTSORTKEY",
    "DISPLAYTITLE",
    "FULLPAGENAME",
    "FULLPAGENAMEE",
    "NAMESPACE",
    "NAMESPACEE",
    "NAMESPACENUMBER",
    "NUMBERINGROUP",
    "NUMBEROFACTIVEUSERS",
    "NUMBEROFADMINS",
    "NUMBEROFARTICLES",
    "NUMBEROFEDITS",
    "NUMBEROFFILES",
    "NUMBEROFPAGES",
    "NUMBEROFUSERS",
    "NUMINGROUP",
    "PAGENAME",
    "PAGENAMEE",
    "PAGESINCAT",
    "PAGESINCATEGORY",
    "PAGESINNAMESPACE",
    "PAGESINNS",
    "PAGESIZE",
    "PROTECTIONEXPIRY",
    "PROTECTIONLEVEL",
    "REVISIONDAY",
    "REVISIONDAY2",
    "REVISIONID",
    "REVISIONMONTH",
    "REVISIONMONTH1",
    "REVISIONTIMESTAMP",
    "REVISIONUSER",
    "REVISIONYEAR",
    "ROOTPAGENAME",
    "ROOTPAGENAMEE",
    "SUBJECTPAGENAME",
    "SUBJECTPAGENAMEE",
    "SUBJECTSPACE",
    "SUBJECTSPACEE",
    "SUBPAGENAME",
    "SUBPAGENAMEE",
    "TALKPAGENAME",
    "TALKPAGENAMEE",
    "TALKSPACE",
    "TALKSPACEE",
]);

const CASE_INSENSITIVE_FUNCTIONS = normalizeNames([
    "ANCHORENCODE",
    "BIDI",
    "CANONICALURL",
    "CANONICALURLE",
    "FILEPATH",
    "FORMATNUM",
    "FULLURL",
    "FULLURLE",
    "GENDER",
    "GRAMMAR",
    "INT",
    "LC",
    "LCFIRST",
    "LOCALURL",
    "LOCALURLE",
    "NOEXTERNALLANGLINKS",
    "NS",
    "NSE",
    "PADLEFT",
    "PADRIGHT",
    "PAGEID",
    "PLURAL",
    "UC",
    "UCFIRST",
    "URLENCODE",
]);

const ZHWIKI_CASE_SENSITIVE_VARIABLE_FUNCTIONS = [
    "基础页面名称",
    "基础页面名称等同",
    "级联来源",
    "页面全称",
    "完整页面名称",
    "完整页面名称等同",
    "名字空间",
    "命名空間",
    "名字空间等同",
    "名字空间编号",
    "命名空間數",
    "活跃用户数",
    "活躍使用者人數",
    "管理员数",
    "管理員數",
    "条目数",
    "文章數",
    "编辑数",
    "文件数",
    "檔案數",
    "页面数",
    "頁面數",
    "用户数",
    "使用者人數量",
    "页名",
    "页面名",
    "页面名称",
    "頁面名稱",
    "页面名等同",
    "页面名称等同",
    "修订日",
    "修订日2",
    "修订ID",
    "修订月",
    "修订月1",
    "修订时间戳",
    "修订用户",
    "修訂使用者",
    "修订年",
    "根页面名称",
    "根頁面名稱",
    "根页面名称等同",
    "根頁面名稱E",
    "主名字空间页面名称",
    "条目页面名称",
    "主名字空间页面名称等同",
    "条目页面名称等同",
    "主名字空间",
    "条目名字空间",
    "主名字空间等同",
    "条目名字空间等同",
    "子页面名称",
    "子页面名称等同",
    "讨论页面名称",
    "对话页面名称",
    "讨论页面名称等同",
    "对话页面名称等同",
    "讨论空间",
    "讨论名字空间",
    "對話空間",
    "讨论空间等同",
    "讨论名字空间等同",
] as const;

const ZHWIKI_CASE_SENSITIVE_FUNCTIONS = new Set([
    ...ZHWIKI_CASE_SENSITIVE_VARIABLE_FUNCTIONS,
    "显示标题",
    "顯示標題",
    "默认分类排序",
    "默认排序",
    "默认排序关键字",
    "组中用户数",
    "分类中页面数",
    "名字空间中页面数",
    "页面大小",
    "保护级别",
]);

const ZHWIKI_CASE_INSENSITIVE_FUNCTIONS = normalizeNames([
    "锚编码",
    "规范URL",
    "规范URL等同",
    "文件路径",
    "格式化数字",
    "完整URL",
    "完整URL等同",
    "性",
    "性别",
    "性別",
    "语法",
    "界面",
    "小写",
    "小写首字",
    "本地URL",
    "本地URLE",
    "名称空间",
    "命名空間",
    "名字空间",
    "名称空间E",
    "命名空間E",
    "名字空间E",
    "无外部语言连接",
    "隱藏跨語言連結",
    "左填充",
    "右填充",
    "页面ID",
    "頁面ID",
    "复数",
    "大写",
    "大写首字",
    "URL编码",
]);

const ZHWIKI_CASE_SENSITIVE_VARIABLES = new Set([
    ...ZHWIKI_CASE_SENSITIVE_VARIABLE_FUNCTIONS,
    "今年",
    "内容语言",
    "內容語言",
    "今天",
    "今天2",
    "星期",
    "今天名",
    "今天名称",
    "当前DOW",
    "当前小时",
    "本月",
    "本月2",
    "本月1",
    "本月简称",
    "本月縮寫",
    "本月名",
    "本月名称",
    "本月名属格",
    "本月名称属格",
    "当前时间",
    "此时",
    "目前時間",
    "当前时间戳",
    "当前版本",
    "目前版本",
    "本周",
    "方向标记",
    "本地日",
    "本地日2",
    "本地日名",
    "本地DOW",
    "本地小时",
    "本地月",
    "本地月2",
    "本地月1",
    "本地月缩写",
    "本地月份名",
    "本地月历",
    "本地时间",
    "本地时间戳",
    "本地周",
    "本地年",
    "修订大小",
    "站点名称",
    "網站名稱",
]);

const ZHWIKI_CASE_INSENSITIVE_VARIABLES = normalizeNames([
    "#语言",
    "#語言",
    "条目路径",
    "无外部语言连接",
    "隱藏跨語言連結",
    "页面ID",
    "頁面ID",
    "脚本路径",
    "服务器",
    "伺服器",
    "服务器名",
    "伺服器名稱",
    "样式路径",
    "wb报告名",
    "wb報表名稱",
]);

const ZHWIKI_INVOKE_ALIASES = normalizeNames(["invoke", "调用", "調動"]);

/**
 * Separates a template target from brace-based magic-word syntax.
 *
 * Canonical English aliases provide an offline fallback. Leading-hash
 * Parser functions remain recognizable when an extension supplies the
 * name.
 *
 * @param name - Parsed text before the first top-level pipe.
 * @param hasParameters - Whether pipe-delimited arguments were entered.
 * @param databaseName - Wiki database used for bundled localized
 * aliases.
 * @returns Relative syntax ranges within `name`.
 */
export function classifyTemplateHead(
    name: string,
    hasParameters: boolean,
    databaseName = "enwiki",
): TemplateHeadSyntax {
    const parts = splitMagicWordRanges(name);
    const substitution = readTemplateModifier(
        name,
        parts,
        emptyModifierState(databaseName),
        "substitution",
    );
    const variable = readMagicWord(name, parts, substitution);
    if (isVariableInvocation(variable, substitution, parts, hasParameters)) {
        return createMagicWordSyntax(
            name,
            variable.part,
            variable.range,
            false,
            substitution,
        );
    }
    return classifyFunctionOrTemplate(name, parts, substitution);
}

function classifyFunctionOrTemplate(
    name: string,
    parts: TopLevelRange[],
    substitution: TemplateModifierState,
): TemplateHeadSyntax {
    const message = readTemplateModifier(name, parts, substitution, "message");
    const state = readTemplateModifier(name, parts, message, "raw");
    const part = parts[state.partIndex] ?? {
        end: name.length,
        start: 0,
        value: name,
    };
    const magicWord = readMagicWord(name, parts, state);
    const hasColon = state.partIndex < parts.length - 1;
    const magic =
        magicWord != null &&
        hasColon &&
        isParserFunction(magicWord.entered, state.databaseName);
    return magic && magicWord != null
        ? createMagicWordSyntax(name, part, magicWord.range, hasColon, state)
        : createTemplateSyntax(name, part, state);
}

function isVariableInvocation(
    variable: MagicWordCandidate | null,
    state: TemplateModifierState,
    parts: TopLevelRange[],
    hasParameters: boolean,
): variable is MagicWordCandidate {
    return (
        variable != null &&
        state.partIndex === parts.length - 1 &&
        !hasParameters &&
        isParserVariable(variable.entered, state.databaseName)
    );
}

function emptyModifierState(databaseName: string): TemplateModifierState {
    return {
        allowLeadingWhitespace: false,
        databaseName,
        modifiers: [],
        partIndex: 0,
        separators: [],
    };
}

function readTemplateModifier(
    name: string,
    parts: TopLevelRange[],
    state: TemplateModifierState,
    kind: TemplateModifier,
): TemplateModifierState {
    const part = parts[state.partIndex];
    if (
        part == null ||
        state.partIndex >= parts.length - 1 ||
        name[part.end] !== ":"
    ) {
        return state;
    }
    const range = readHeadRange(name, part, state.allowLeadingWhitespace);
    if (
        range == null ||
        !isTemplateModifier(
            name.slice(range.start, range.end),
            kind,
            state.databaseName,
        )
    ) {
        return state;
    }
    return {
        allowLeadingWhitespace: kind === "substitution",
        databaseName: state.databaseName,
        modifiers: [...state.modifiers, range],
        partIndex: state.partIndex + 1,
        separators: [
            ...state.separators,
            { end: part.end + 1, start: part.end },
        ],
    };
}

function createTemplateSyntax(
    name: string,
    part: TopLevelRange,
    state: TemplateModifierState,
): TemplateHeadSyntax {
    return {
        kind: "template",
        modifiers: state.modifiers,
        separators: state.separators,
        target: trimRange(name, {
            end: name.length,
            start: part.start,
        }),
    };
}

function createMagicWordSyntax(
    name: string,
    part: TopLevelRange,
    magicWord: SourceRange,
    hasColon: boolean,
    state: TemplateModifierState,
): TemplateHeadSyntax {
    const argument = hasColon
        ? trimRange(name, { end: name.length, start: part.end + 1 })
        : undefined;
    const separators = [...state.separators];
    if (hasColon) {
        separators.push({ end: part.end + 1, start: part.end });
    }
    return {
        argument,
        invoke: isInvoke(
            name.slice(magicWord.start, magicWord.end),
            state.databaseName,
        ),
        kind: "magic-word",
        magicWord,
        modifiers: state.modifiers,
        separators,
    };
}

function isParserVariable(value: string, databaseName: string): boolean {
    const normalized = value.toLowerCase();
    return (
        CASE_SENSITIVE_VARIABLES.has(value) ||
        CASE_INSENSITIVE_VARIABLES.has(normalized) ||
        (databaseName === "zhwiki" &&
            (ZHWIKI_CASE_SENSITIVE_VARIABLES.has(value) ||
                ZHWIKI_CASE_INSENSITIVE_VARIABLES.has(normalized)))
    );
}

function isParserFunction(value: string, databaseName: string): boolean {
    const normalized = value.toLowerCase();
    return (
        value.startsWith("#") ||
        CASE_SENSITIVE_FUNCTIONS.has(value) ||
        CASE_INSENSITIVE_FUNCTIONS.has(normalized) ||
        (databaseName === "zhwiki" &&
            (ZHWIKI_CASE_SENSITIVE_FUNCTIONS.has(value) ||
                ZHWIKI_CASE_INSENSITIVE_FUNCTIONS.has(normalized)))
    );
}

function isInvoke(value: string, databaseName: string): boolean {
    const normalized = value.toLowerCase();
    return (
        normalized === "#invoke" ||
        (databaseName === "zhwiki" &&
            normalized.startsWith("#") &&
            ZHWIKI_INVOKE_ALIASES.has(normalized.slice(1)))
    );
}

function isTemplateModifier(
    value: string,
    kind: TemplateModifier,
    databaseName: string,
): boolean {
    const normalized = value.toLowerCase();
    return (
        TEMPLATE_MODIFIERS[kind].includes(normalized) ||
        (databaseName === "zhwiki" &&
            ZHWIKI_TEMPLATE_MODIFIERS[kind].includes(normalized))
    );
}

function readMagicWord(
    name: string,
    parts: TopLevelRange[],
    state: TemplateModifierState,
): MagicWordCandidate | null {
    const part = parts[state.partIndex];
    if (part == null) {
        return null;
    }
    const range = readHeadRange(name, part, state.allowLeadingWhitespace);
    if (range == null) {
        return null;
    }
    return {
        entered: name.slice(range.start, range.end),
        part,
        range,
    };
}

function readHeadRange(
    value: string,
    range: SourceRange,
    allowLeadingWhitespace: boolean,
): SourceRange | null {
    let { start } = range;
    if (allowLeadingWhitespace) {
        while (start < range.end && /\s/u.test(value[start] ?? "")) {
            start += 1;
        }
    }
    if (
        start === range.end ||
        /\s/u.test(value[start] ?? "") ||
        /\s/u.test(value[range.end - 1] ?? "")
    ) {
        return null;
    }
    return { end: range.end, start };
}

function splitMagicWordRanges(value: string): TopLevelRange[] {
    return wikitext(value)
        .splitRanges(":")
        .flatMap((asciiPart) =>
            wikitext(asciiPart.value)
                .splitRanges("：")
                .map((widePart) => ({
                    end: asciiPart.start + widePart.end,
                    start: asciiPart.start + widePart.start,
                    value: widePart.value,
                })),
        );
}

function trimRange(value: string, range: SourceRange): SourceRange {
    let { end, start } = range;
    while (start < end && /\s/u.test(value[start] ?? "")) {
        start += 1;
    }
    while (start < end && /\s/u.test(value[end - 1] ?? "")) {
        end -= 1;
    }
    return { end, start };
}

function normalizeNames(values: string[]): Set<string> {
    return new Set(values.map((value) => value.toLowerCase()));
}
