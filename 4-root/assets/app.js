/* 个人学习网站 · 前端逻辑（纯静态，无需服务器） */
(function () {
  "use strict";

  var DATA = window.SITE_DATA || { siteTitle: "我的学习知识库", articles: [], categories: [] };
  var STORE_IMPORT = "lls_imported";
  var STORE_PROGRESS = "lls_progress";
  var STORE_THEME = "lls_theme";          /* legacy：单维明暗键，只读一次用于迁移 */
  var STORE_PALETTE = "lls_palette";      /* 配色身份：amber / paper / ink / night */
  var STORE_MODE = "lls_mode";            /* 明暗偏好：light / dark / system */
  var STORE_TYPE = "lls_type";            /* 正文排版（P1） */
  var STORE_SIDEBAR = "lls_sidebar";      /* 侧栏三态：expanded / rail / hidden */
  var STORE_EVENTS = "lls_events";       /* 最近动态：环形缓冲，只留 60 条 */
  var STORE_DELETED = "lls_deleted";
  var STORE_CANVAS = "lls_canvas";
  var STORE_CANVAS_NOTES = "lls_canvas_notes";
  var STORE_CARDS = "lls_cards";
  var STORE_HISTORY = "lls_history";
  var STORE_NOTES = "lls_notes";
  var STORE_AI = "lls_ai";
  var STORE_PRACTICE = "lls_practice";
  var STORE_PATHS = "lls_paths";
  var STORE_MINUTES = "lls_minutes";
  var STORE_GOAL = "lls_goal";
  var STORE_DRAFT = "lls_draft";
  var STORE_VERSIONS = "lls_versions";
  var STORE_AI_MODELS = "lls_ai_models";
  var STORE_AI_FETCH = "lls_ai_fetched";
  var STORE_MISTAKES = "lls_mistakes";
  var STORE_DISMISS = "lls_dismiss";
  var STORE_LAST = "lls_last";        /* 「继续上次」：{id, t} */
  /* ⚠ BACKUP_KEYS 用字面量而不是 STORE_* 常量：
     早先写成引用的形式，但 STORE_CHAIN / STORE_DOCK 的 var 赋值发生在文件中段
     （约 2006 / 2821 行），var 只提升声明不提升赋值 —— 本数组求值那一刻它们是
     undefined，于是知识链进度与 AI 抽屉会话**静默地不进备份也不进还原**。
     备份键名是常量字符串，写成字面量反而更不容易被 var 顺序打乱。 */
  var BACKUP_KEYS = ["lls_progress", "lls_imported", "lls_deleted", "lls_cards",
    "lls_history", "lls_notes", "lls_practice", "lls_paths", "lls_minutes",
    "lls_goal", "lls_canvas", "lls_canvas_notes", "lls_ai", "lls_versions",
    "lls_ai_models", "lls_ai_fetched", "lls_mistakes", "lls_chain", "lls_dock",
    "lls_dismiss", "lls_palette", "lls_mode", "lls_type", "lls_sidebar", "lls_last",
    /* 2026-10-08 审计补漏：下面四个此前漏在备份之外 ——
       lls_events 是「最近动态」（学习历史环形缓冲 60 条）、lls_draft 是笔记草稿，
       这两个是**真数据**（换浏览器/导出备份时会丢）；nbview / nbsort 是列表视图与排序偏好。 */
    "lls_events", "lls_draft", "lls_nbview", "lls_nbsort"];

  /* 学科色：同一套「荧光管色相」——统一饱和度与亮度，像一排同规格指示灯 */
  var PALETTE = [
    ["#ffb000", "#7a5200"], /* 0 琥珀 */
    ["#caadff", "#5b3f8f"], /* 1 紫 */
    ["#7ad14a", "#3d6b24"], /* 2 磷绿 */
    ["#4fd1c5", "#266b64"], /* 3 青 */
    ["#ffa678", "#7d4225"], /* 4 橙 */
    ["#90beff", "#34527d"], /* 5 蓝 */
    ["#ff9ecd", "#7d3659"], /* 6 品红 */
    ["#adc822", "#5f6b23"], /* 7 黄绿 */
  ];
  /* 分类 → 线性图标名 */
  var CAT_ICO = {
    "高等数学": "math", "线性代数": "matrix", "计算机基础": "laptop", "大学物理": "physics",
    "工程制图": "compass", "电路": "circuit", "模拟电子": "chip", "电气工程": "bolt",
    "数学": "math", "英语": "abc", "专业课程": "book", "读书笔记": "book",
    "项目实践": "box", "考试复习": "board", "生活随笔": "leaf",
    "未分类": "folder"
  };
  /* 分类 → 固定配色（PALETTE 下标），避免 hash 撞色 */
  var CAT_COLOR = {
    "高等数学": 0, "线性代数": 1, "计算机基础": 2, "大学物理": 3,
    "工程制图": 4, "电路": 5, "模拟电子": 6, "电气工程": 7
  };
  var MASTERY = [
    { k: 0, name: "未接触", c: "#8a8674" },
    { k: 1, name: "熟悉", c: "#ffb000" },
    { k: 2, name: "掌握", c: "#4fd1c5" },
    { k: 3, name: "精通", c: "#86d14a" }
  ];
  var INTERVALS = [
    10 * 60 * 1000, 24 * 3600 * 1000, 3 * 24 * 3600 * 1000,
    7 * 24 * 3600 * 1000, 15 * 24 * 3600 * 1000, 30 * 24 * 3600 * 1000
  ];
  var KEYWORDS = {
    python: ["def", "class", "return", "if", "elif", "else", "for", "while", "in", "not", "and", "or", "import", "from", "as", "try", "except", "with", "lambda", "None", "True", "False", "self", "yield", "pass", "break", "continue"],
    javascript: ["function", "const", "let", "var", "return", "if", "else", "for", "while", "new", "class", "this", "import", "export", "from", "async", "await", "try", "catch", "typeof", "null", "true", "false", "undefined"],
    java: ["public", "private", "class", "static", "void", "int", "return", "if", "else", "for", "while", "new", "this", "import", "package", "try", "catch", "final", "String"],
    cpp: ["include", "int", "void", "return", "if", "else", "for", "while", "class", "public", "private", "new", "delete", "const", "using", "namespace", "template", "std"],
    common: ["if", "else", "for", "while", "return", "function", "def", "class", "import", "new", "this", "const", "var", "let", "true", "false", "null"]
  };
  var TEMPLATES = {
    "（选择模板）": null,
    "课程笔记": "## 本节要点\n\n- \n\n## 重点概念\n\n**概念**：\n\n## 我的疑问\n\n- \n\n## 一句话小结\n\n",
    "读书笔记": "## 书籍信息\n\n- 书名：\n- 作者：\n\n## 核心观点\n\n1. \n\n## 金句摘录\n\n> \n\n## 我的行动\n\n- \n",
    "错题本": "## 题目\n\n\n## 我的错误答案\n\n\n## 正确答案\n\n\n## 错因分析\n\n\n## 相关知识点\n\n",
    "每日复盘": "## 今天学了什么\n\n- \n\n## 遇到的困难\n\n- \n\n## 明天计划\n\n- \n"
  };
  // 借鉴「镜界写作」的多智能体分工：不同 AI 角色各司其职
  var ROLES = [
    { id: "teacher", ico: "user", name: "讲解老师", desc: "把概念讲透、补齐前置知识",
      sys: "你是一位耐心、严谨的讲解老师。目标是让学生真正理解，而不是只给结论。回答时：先用一句话给出结论，再分层解释，必要时补上前置知识，最后用一个例子收尾。语言清晰，避免空话。" },
    { id: "socratic", ico: "think", name: "苏格拉底", desc: "只提问，引导你自己想出来",
      sys: "你是苏格拉底式导师。除非学生明确要求，否则不要直接给答案，而是通过连续追问引导他自己推导。每次回复以 1-3 个启发式问题为主，必要时给极小的提示；学生答对后再推进一层。" },
    { id: "quizzer", ico: "board", name: "出题官", desc: "出题考我并判分",
      sys: "你是严格的出题官。基于给定内容出题，题型多样（概念辨析、简答、应用题、易错陷阱）。先只给题目，等学生作答后再判分并给出详细解析。" },
    { id: "reviewer", ico: "search2", name: "纠错员", desc: "挑错、找漏洞、防自欺",
      sys: "你是挑剔的审阅者。任务是找出内容中的错误、含糊处、逻辑漏洞和常见误解。直接指出问题所在，给出修正版本，并说明为什么原说法有问题。" },
    { id: "summarizer", ico: "board", name: "总结官", desc: "提炼结构化要点",
      sys: "你是总结专家。输出结构清晰的要点：先一句核心结论，再分条列出关键内容（每条不超过两行），最后给出可执行的下一步。严禁复述原文。" },
    { id: "analogy", ico: "mask", name: "类比大师", desc: "用生活化类比讲明白",
      sys: "你是类比大师。把抽象概念映射到学生熟悉的生活场景或具体图像上，用一两个贴切类比讲明白，并明确指出类比的边界（哪里不再适用）。" },
    { id: "planner", ico: "map", name: "学习规划师", desc: "制定学习计划与顺序",
      sys: "你是学习规划师。基于内容和学生当前的掌握情况，给出分阶段的学习计划：先学什么后学什么、每阶段目标、检验方式、每天投入建议。计划要具体可执行。" }
  ];
  function roleById(id) {
    for (var i = 0; i < ROLES.length; i++) if (ROLES[i].id === id) return ROLES[i];
    return ROLES[0];
  }

  /* ---------- 线性图标（对齐镜界写作的极简图标风格） ---------- */
  var ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.3V20a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9.3"/>',
    grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1"/><rect x="13.5" y="3.5" width="7" height="7" rx="1"/><rect x="3.5" y="13.5" width="7" height="7" rx="1"/><rect x="13.5" y="13.5" width="7" height="7" rx="1"/>',
    refresh: '<path d="M20.5 12a8.5 8.5 0 1 1-2.5-6"/><path d="M20.5 3.5V9h-5.5"/>',
    cards: '<rect x="3" y="6" width="13" height="14" rx="2"/><path d="M8 3.5h10.5A2.5 2.5 0 0 1 21 6v10.5"/>',
    target: '<circle cx="12" cy="12" r="8.2"/><circle cx="12" cy="12" r="3.4"/>',
    chat: '<path d="M20.5 12a8 8 0 0 1-8 8H8.2L4 23v-5.4A8 8 0 1 1 20.5 12z"/>',
    graph: '<circle cx="6" cy="6.5" r="2.3"/><circle cx="18" cy="7.5" r="2.3"/><circle cx="12" cy="18" r="2.3"/><path d="M8.1 7.6 10.6 15.9M15.9 9.1 13.4 15.9M8.3 6.6h7.4"/>',
    pen: '<path d="M4 20h4.2L20.2 8a2.4 2.4 0 0 0-3.4-3.4L4.8 16.6 4 20z"/><path d="M14.6 6.6 17.4 9.4"/>',
    plus: '<path d="M12 5.2v13.6M5.2 12h13.6"/>',
    minus: '<path d="M5.2 12h13.6"/>',
    cog: '<circle cx="12" cy="12" r="3.1"/><path d="M12 2.6v2.6M12 18.8v2.6M4.4 4.4l1.9 1.9M17.7 17.7l1.9 1.9M2.6 12h2.6M18.8 12h2.6M4.4 19.6l1.9-1.9M17.7 6.3l1.9-1.9"/>',
    link: '<path d="M10.5 13.5a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 0 0-5.7-5.7l-1.4 1.4"/><path d="M13.5 10.5a4 4 0 0 0-5.7 0l-2.8 2.8a4 4 0 0 0 5.7 5.7l1.4-1.4"/>',
    save: '<path d="M5 3.5h11L20.5 8v11.5a1 1 0 0 1-1 1h-14a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1z"/><path d="M8 3.5v6h7v-6M8 20.5V14h8v6.5"/>',
    doc: '<path d="M13.5 3.5H7a1.5 1.5 0 0 0-1.5 1.5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8.5l-5-5z"/><path d="M13.5 3.5v5h5"/>',
    clock: '<circle cx="12" cy="12" r="8.4"/><path d="M12 7.4V12l3.1 1.9"/>',
    sparkle: '<path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9L12 3.5z"/><path d="M18.5 16.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2z"/>',
    chart: '<path d="M4 20V9.5M10 20V4.5M16 20v-8M22 20H2"/>',
    flame: '<path d="M12 22c4 0 6.8-2.9 6.8-6.6 0-3.2-1.6-5.2-3.1-7.1-1 1.5-2 2-3.1 2 .6-1.6 0-4.2-2.1-6.3-1 2.6-2.1 3.1-3.6 5.1-1 1.4-1.4 2.9-1.4 4.5C5.5 19.1 8 22 12 22z"/>',
    print: '<path d="M7 9V3.5h10V9"/><rect x="4" y="9" width="16" height="7.5" rx="1.5"/><path d="M7 14.5h10v6H7z"/>',
    download: '<path d="M12 3.5v12"/><path d="M7.5 11l4.5 4.5 4.5-4.5"/><path d="M4 18.5v1a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1"/>',
    volume: '<path d="M11 5.5 6.5 9.5H3.5v5h3L11 18.5z"/><path d="M15.5 9.2a4 4 0 0 1 0 5.6"/><path d="M18.4 6.6a8 8 0 0 1 0 10.8"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0"/><path d="M12 18v3"/>',
    chevron: '<path d="M6 9.5l6 6 6-6"/>',
    /* 分类图标 */
    laptop: '<rect x="4" y="5" width="16" height="10.5" rx="1.6"/><path d="M2.5 19h19"/>',
    math: '<path d="M17.8 5.4H6.6l5.6 6.6-5.6 6.6h11.2"/>',
    matrix: '<rect x="3.6" y="3.6" width="16.8" height="16.8" rx="1.8"/><path d="M9.2 3.6v16.8M14.8 3.6v16.8M3.6 9.2h16.8M3.6 14.8h16.8"/>',
    abc: '<path d="M3.5 19 8 5l4.5 14"/><path d="M5.1 14.5h5.8"/><path d="M18.3 19v-8.4"/><path d="M18.3 13c0-1.7 2.6-1.9 2.6 0V19"/>',
    book: '<path d="M12 6.6C10.4 5 8.2 4.5 4.5 4.5v13.2c3.7 0 5.9.5 7.5 2 1.6-1.5 3.8-2 7.5-2V4.5c-3.7 0-5.9.5-7.5 2.1z"/><path d="M12 6.6v13.1"/>',
    box: '<path d="M12 3 20 7.4v9.2L12 21l-8-4.4V7.4z"/><path d="M4 7.4 12 12l8-4.6M12 12v9"/>',
    leaf: '<path d="M12 20.5V12"/><path d="M12 12c0-3.6-2.6-6-6-6 0 3.6 2.6 6 6 6z"/><path d="M12 12c0-3.6 2.6-6 6-6 0 3.6-2.6 6-6 6z"/>',
    folder: '<path d="M3.5 6.5A1.5 1.5 0 0 1 5 5h4l2 2.5h8A1.5 1.5 0 0 1 20.5 9v9a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18z"/>',
    /* 功能图标 */
    map: '<path d="M9 4 3.5 6.2v13.6L9 17.6l6 2.2 5.5-2.2V4L15 6.2z"/><path d="M9 4v13.6M15 6.2v13.6"/>',
    expand: '<path d="M4 9.5V4h5.5M20 14.5V20h-5.5M15.5 4H20v5.5M8.5 20H4v-5.5"/>',
    trash: '<path d="M4.5 7h15M9.5 7V4.8h5V7"/><path d="M6.6 7l1 12.4a1 1 0 0 0 1 .9h6.8a1 1 0 0 0 1-.9L17.4 7"/>',
    check: '<circle cx="12" cy="12" r="8.4"/><path d="M8.3 12.2l2.5 2.5 4.9-5"/>',
    dice: '<rect x="4" y="4" width="16" height="16" rx="3.2"/><circle cx="9" cy="9" r="1.15"/><circle cx="15" cy="15" r="1.15"/><circle cx="12" cy="12" r="1.15"/>',
    bulb: '<path d="M9.5 18.5h5"/><path d="M10.5 21h3"/><path d="M12 3.2a5.8 5.8 0 0 0-3.3 10.6c.6.4.9 1.1.9 1.9h4.8c0-.8.3-1.5.9-1.9A5.8 5.8 0 0 0 12 3.2z"/>',
    globe: '<circle cx="12" cy="12" r="8.4"/><path d="M3.6 12h16.8"/><path d="M12 3.6c2.3 2.7 2.3 14.1 0 16.8M12 3.6c-2.3 2.7-2.3 14.1 0 16.8"/>',
    board: '<rect x="5.5" y="4.5" width="13" height="16" rx="2"/><path d="M9 9.5h6M9 13h6M9 16.5h3.5"/>',
    puzzle: '<path d="M9.6 4.4a2.1 2.1 0 1 1 4.2 0V6h3.4a1 1 0 0 1 1 1v3.4h1.4a2.1 2.1 0 1 1 0 4.2h-1.4V18a1 1 0 0 1-1 1H14v-1.4a2.1 2.1 0 1 0-4.2 0V19H6.4a1 1 0 0 1-1-1v-3.4H4a2.1 2.1 0 1 1 0-4.2h1.4V7a1 1 0 0 1 1-1h3.2z"/>',
    user: '<circle cx="12" cy="8" r="3.4"/><path d="M5.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/>',
    think: '<path d="M20 11.4a7.6 7.6 0 0 1-11.5 6.6L4 19.6l1.5-4.1A7.6 7.6 0 1 1 20 11.4z"/><path d="M10 10.3a2.1 2.1 0 1 1 3.3 1.7c-.6.4-.8.7-.8 1.5"/><circle cx="12.5" cy="15.6" r=".6"/>',
    mask: '<circle cx="12" cy="12" r="8.4"/><path d="M8.6 14.4a4.4 4.4 0 0 0 6.8 0"/><path d="M9.2 9.6h.01M14.8 9.6h.01"/>',
    star: '<path d="M12 3.8l2.5 5.1 5.6.8-4 4 1 5.6-5.1-2.7-5.1 2.7 1-5.6-4-4 5.6-.8z"/>',
    image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="9.8" r="1.5"/><path d="M4.5 17.5l4.5-4.2 2.8 2.5 3.4-3.1 4.3 4"/>',
    chevron: '<path d="M9 5.5 15.5 12 9 18.5"/>',
    moon: '<path d="M20.5 14.6A8.6 8.6 0 0 1 9.4 3.5a8.6 8.6 0 1 0 11.1 11.1z"/>',
    sun: '<circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    warn: '<path d="M12 3.5 21.5 20H2.5z"/><path d="M12 10v4.2"/><circle cx="12" cy="17.4" r=".7"/>',
    eraser: '<path d="M9 20h10"/><path d="M16 4.6 5 15.6a1.6 1.6 0 0 0 0 2.2l1.7 1.7a1.6 1.6 0 0 0 2.2 0L20 8.5a1.6 1.6 0 0 0 0-2.2l-1.8-1.7a1.6 1.6 0 0 0-2.2 0z"/><path d="M11.5 8.5 17 14"/>',
    upload: '<path d="M12 20.5V8.5"/><path d="M7.5 13l4.5-4.5 4.5 4.5"/><path d="M4.5 4.5h15"/>',
    arrowLeft: '<path d="M15 5.5 8.5 12l6.5 6.5"/>',
    arrowUp: '<path d="M5.5 15 12 8.5l6.5 6.5"/>',
    arrowDown: '<path d="M5.5 9 12 15.5 18.5 9"/>',
    palette: '<path d="M12 3.4c-4.7 0-8.6 3.6-8.6 8.1 0 4.5 3.9 8.1 8.6 8.1.9 0 1.6-.7 1.6-1.6 0-.4-.2-.8-.4-1.1-.2-.3-.4-.6-.4-1 0-.9.7-1.6 1.6-1.6h1.9c2.4 0 4.3-1.8 4.3-4 0-3.8-3.8-6.9-8.6-6.9z"/><circle cx="7.7" cy="12.3" r="1"/><circle cx="9.7" cy="8.5" r="1"/><circle cx="14.3" cy="8.4" r="1"/>',
    /* 学科图标 */
    physics: '<circle cx="12" cy="12" r="2"/><ellipse cx="12" cy="12" rx="8.6" ry="3.5"/><ellipse cx="12" cy="12" rx="8.6" ry="3.5" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="8.6" ry="3.5" transform="rotate(-60 12 12)"/>',
    compass: '<path d="M12 4 5.5 20M12 4l6.5 16"/><circle cx="12" cy="4" r="1.7"/><path d="M8.6 14.5h6.8"/>',
    circuit: '<path d="M2.5 12h3.1M18.4 12h3.1"/><rect x="5.6" y="9.1" width="12.8" height="5.8" rx="1"/><path d="M12 6.5V9.1M12 14.9v2.6"/>',
    chip: '<rect x="6.5" y="6.5" width="11" height="11" rx="2"/><path d="M9.5 3.3v3.2M14.5 3.3v3.2M9.5 17.5v3.2M14.5 17.5v3.2M3.3 9.5h3.2M3.3 14.5h3.2M17.5 9.5h3.2M17.5 14.5h3.2"/><rect x="10" y="10" width="4" height="4" rx="0.8"/>',
    bolt: '<path d="M13.6 2.5 5 13.2h5.6l-1.2 8.3L18.8 10.4h-5.6z"/>',
    search2: '<circle cx="10.6" cy="10.6" r="6.4"/><path d="M15.4 15.4 20.5 20.5"/><path d="M8.2 10.7l1.8 1.8 3.2-3.5"/>',
    chain: '<ellipse cx="12" cy="7.6" rx="4.6" ry="5"/><ellipse cx="12" cy="16.4" rx="4.6" ry="5"/>',
    lock: '<rect x="4.8" y="10.4" width="14.4" height="9.6" rx="2.2"/><path d="M8.2 10.4V7.8a3.8 3.8 0 0 1 7.6 0v2.6"/><circle cx="12" cy="15.2" r="1.2"/>',
    unlock: '<rect x="4.8" y="10.4" width="14.4" height="9.6" rx="2.2"/><path d="M8.2 10.4V7.8a3.8 3.8 0 0 1 7.6 0"/><circle cx="12" cy="15.2" r="1.2"/>',
    route: '<circle cx="6" cy="18.5" r="2.4"/><circle cx="18" cy="5.5" r="2.4"/><path d="M8.4 18.5h5.1a4.2 4.2 0 0 0 0-8.4H9.6a4.2 4.2 0 0 1 0-8.4" transform="translate(0 3.6)"/>',
    key: '<circle cx="8" cy="15.6" r="3.6"/><path d="M10.6 13 19 4.6"/><path d="M15.4 8.2l2.2 2.2"/><path d="M17.6 6l2.2 2.2"/>',
    plug: '<path d="M9 2.8v5.4M15 2.8v5.4"/><path d="M6.2 8.2h11.6v2.6a5.8 5.8 0 0 1-11.6 0z"/><path d="M12 16.6v4.6"/>',
    list: '<path d="M8.2 6.6h12M8.2 12h12M8.2 17.4h12"/><circle cx="4.4" cy="6.6" r="1.1"/><circle cx="4.4" cy="12" r="1.1"/><circle cx="4.4" cy="17.4" r="1.1"/>'
  };
  /* emoji 已统一替换为线性图标，渲染时由 hydrateIcons 填充 */
  function hydrateIcons(root) {
    var els = (root || document).querySelectorAll("[data-ico]");
    for (var i = 0; i < els.length; i++) {
      var e = els[i];
      if (e.getAttribute("data-done") || e.tagName.toLowerCase() !== "i") continue;
      var sz = e.getAttribute("data-sz");
      e.innerHTML = ico(e.getAttribute("data-ico"), sz ? parseInt(sz, 10) : 15);
      e.setAttribute("data-done", "1");
    }
  }
  function ico(n, size) {
    var s = size || 15;
    return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[n] || "") + "</svg>";
  }

  /* ---------- 主题：配色身份 × 明暗模式 ----------
     旧版只有单维 lls_theme（light/dark）。新版拆成两维，旧键读一次做迁移：
       旧 light → 暖纸书桌 · 浅色    旧 dark → 终端琥珀 · 深色
     迁移后写入新键，旧键不再回读，用户不会察觉被换了主题。 */
  var PALETTES = [
    { id: "glass", name: "液态玻璃", desc: "Apple 风玻璃材质 · 靛蓝强调（默认）" },
    { id: "amber", name: "终端琥珀", desc: "开发者终端 · 琥珀 CRT" },
    { id: "paper", name: "暖纸书桌", desc: "羊皮纸 + 胡桃棕，久读不刺眼" },
    { id: "ink",   name: "水墨",     desc: "宣纸底色 + 墨青强调" },
    { id: "night", name: "深靛夜航", desc: "深藏青 + 星青强调" }
  ];
  var MODES = [
    { id: "light",  name: "浅色",     i: "sun" },
    { id: "dark",   name: "深色",     i: "moon" },
    { id: "system", name: "跟随系统", i: "laptop" }
  ];
  var LEGACY_MAP = { light: { pal: "paper", mode: "light" }, dark: { pal: "amber", mode: "dark" } };

  function paletteIds() { return PALETTES.map(function (p) { return p.id; }); }
  function palName(id) {
    for (var i = 0; i < PALETTES.length; i++) if (PALETTES[i].id === id) return PALETTES[i].name;
    return id;
  }
  function modeName(id) {
    for (var i = 0; i < MODES.length; i++) if (MODES[i].id === id) return MODES[i].name;
    return id;
  }
  function sysDark() {
    try { return !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches); }
    catch (e) { return false; }
  }

  var _legacyRaw = null;
  try { _legacyRaw = localStorage.getItem(STORE_THEME); } catch (e) {}
  var _legacy = LEGACY_MAP[_legacyRaw] || null;

  var _palRaw = null, _modeRaw = null;
  try {
    _palRaw = localStorage.getItem(STORE_PALETTE);
    _modeRaw = localStorage.getItem(STORE_MODE);
  } catch (e) {}
  /* 默认（从未选过）：v14 起给「液态玻璃 · 浅色」，与 :root 兜底同源。
     老用户 localStorage 里已有 palette 值 → 原样保留，不强制迁移。 */
  var palette = paletteIds().indexOf(_palRaw) >= 0 ? _palRaw : (_legacy ? _legacy.pal : "glass");
  var modePref = (_modeRaw === "light" || _modeRaw === "dark" || _modeRaw === "system")
    ? _modeRaw : (_legacy ? _legacy.mode : "light");
  var theme = modePref === "system" ? (sysDark() ? "dark" : "light") : modePref;  /* 生效值 */

  /* ---------- 正文排版（运行时变量）----------
     与界面刻度分工明确：--fs-* 管框架，这五个变量只管正文。
     默认值与改造前逐字等价（16px / 1.8 / 0 / 12px / 800px），所以不动设置时视觉零变化。 */
  var TYPE_KEYS = ["fs", "lh", "ls", "gap", "w"];
  var TYPE_DEFAULTS = { fs: 16, lh: 1.8, ls: 0, gap: 12, w: 800 };
  var typeCfg = (function () {
    var c = { fs: TYPE_DEFAULTS.fs, lh: TYPE_DEFAULTS.lh, ls: TYPE_DEFAULTS.ls, gap: TYPE_DEFAULTS.gap, w: TYPE_DEFAULTS.w };
    var raw = loadJSON(STORE_TYPE, null);
    if (raw && typeof raw === "object") {
      TYPE_KEYS.forEach(function (k) {
        var v = Number(raw[k]);
        if (isFinite(v) && v > 0) c[k] = v;
      });
    }
    return c;
  })();
  function applyType() {
    var st = document.documentElement.style;
    st.setProperty("--read-fs", typeCfg.fs + "px");
    st.setProperty("--read-lh", String(typeCfg.lh));
    st.setProperty("--read-ls", typeCfg.ls + "px");
    st.setProperty("--para-gap", typeCfg.gap + "px");
    st.setProperty("--read-w", typeCfg.w + "px");
  }
  function saveType() {
    try { localStorage.setItem(STORE_TYPE, JSON.stringify(typeCfg)); } catch (e) {}
  }
  function typeIsDefault() {
    return TYPE_KEYS.every(function (k) { return typeCfg[k] === TYPE_DEFAULTS[k]; });
  }
  function typeOut(k) {
    var v = typeCfg[k];
    if (k === "lh") return v.toFixed(2);
    return k === "fs" || k === "ls" ? v.toFixed(k === "ls" ? 2 : 1) + "px" : String(v);
  }
  function typeRow(k, label, min, max, step) {
    return '<div class="set-row"><div class="info">' + label + "</div>" +
      '<span class="type-ctl"><input type="range" data-type-key="' + k + '" min="' + min + '" max="' + max +
      '" step="' + step + '" value="' + typeCfg[k] + '" aria-label="' + label + '">' +
      '<b data-type-out="' + k + '">' + typeOut(k) + "</b></span></div>";
  }
  function typeSelect(k, label, opts) {
    return '<div class="set-row"><div class="info">' + label + "</div>" +
      '<select class="ed-input" data-type-key="' + k + '" aria-label="' + label + '">' +
      opts.map(function (o) {
        return '<option value="' + o[0] + '"' + (typeCfg[k] === o[0] ? " selected" : "") + ">" + o[1] + "</option>";
      }).join("") + "</select></div>";
  }
  var progress = loadJSON(STORE_PROGRESS, { read: {}, review: {}, mastery: {} });
  var imported = loadJSON(STORE_IMPORT, []);
  var deleted = loadJSON(STORE_DELETED, []);
  var cards = loadJSON(STORE_CARDS, []);
  var history = loadJSON(STORE_HISTORY, {});
  var notes = loadJSON(STORE_NOTES, []);
  var paths = loadJSON(STORE_PATHS, []);
  var minutes = loadJSON(STORE_MINUTES, {});
  var goal = parseInt(localStorage.getItem(STORE_GOAL) || "5", 10) || 5;
  var drafts = loadJSON(STORE_DRAFT, {});
  var aiCfg = loadJSON(STORE_AI, { base: "https://api.deepseek.com/v1", key: "", model: "deepseek-chat" });
  var aiMsgs = [];
  var aiDraft = "";
  var aiRole = aiCfg.role || "teacher";
  var aiModels = loadJSON(STORE_AI_MODELS, []);
  var aiFetched = loadJSON(STORE_AI_FETCH, { at: 0, list: [], base: "" });
  var aiFetchBusy = false;
  /* 对话请求进行中：挡住重复发送（连点/回车会并发多个请求，浪费 token 且回复交错），
     同时把早已定义好的 .is-loading / [aria-busy] 加载态真正接上。 */
  var aiBusy = false;
  var aiFetchErr = "";
  var aiFetchNote = "";
  var aiCfgTest = "";
  var aiCtxOn = true;
  var aiCtxNames = [];
  var versions = loadJSON(STORE_VERSIONS, {});
  var immersive = false;
  var nbView = localStorage.getItem("lls_nbview") || "list";
  var nbSort = localStorage.getItem("lls_nbsort") || "updated";
  var histViewIdx = -1;
  var practiceLog = loadJSON(STORE_PRACTICE, []);
  var practice = { scope: "全部", type: "single", q: null, picked: null, submitted: false, loading: false };

  var route = { view: "home", category: null, tag: null, id: null, pathId: null };
  var prevRoute = { view: "home" };
  var query = "";
  var session = { list: [], idx: 0, revealed: false };
  var readStart = 0;

  function loadJSON(key, def) {
    try { return JSON.parse(localStorage.getItem(key)) || def; }
    catch (e) { return def; }
  }
  function saveProgress() { localStorage.setItem(STORE_PROGRESS, JSON.stringify(progress)); }
  function saveImported() { localStorage.setItem(STORE_IMPORT, JSON.stringify(imported)); }
  function saveDeleted() { localStorage.setItem(STORE_DELETED, JSON.stringify(deleted)); }
  function saveCards() { localStorage.setItem(STORE_CARDS, JSON.stringify(cards)); }
  function saveHistory() { localStorage.setItem(STORE_HISTORY, JSON.stringify(history)); }
  function saveNotes() { localStorage.setItem(STORE_NOTES, JSON.stringify(notes)); }
  function savePaths() { localStorage.setItem(STORE_PATHS, JSON.stringify(paths)); }
  function saveMinutes() { localStorage.setItem(STORE_MINUTES, JSON.stringify(minutes)); }
  function saveDrafts() { localStorage.setItem(STORE_DRAFT, JSON.stringify(drafts)); }
  function aiSave() { localStorage.setItem(STORE_AI, JSON.stringify(aiCfg)); }

  /* ---------- 笔记 ---------- */
  function allArticlesRaw() {
    var map = {};
    DATA.articles.forEach(function (a) { map[a.id] = a; });
    imported.forEach(function (a) { map[a.id] = a; });
    notes.forEach(function (a) { map[a.id] = a; });
    return Object.keys(map).map(function (k) { return map[k]; });
  }
  function allArticles() {
    return allArticlesRaw().filter(function (a) { return deleted.indexOf(a.id) < 0; });
  }
  function findArticle(id) {
    var all = allArticlesRaw();
    for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
    return null;
  }
  function articleByTitle(t) {
    var all = allArticles();
    for (var i = 0; i < all.length; i++) if (all[i].title === t) return all[i];
    return null;
  }
  function getCategories() {
    var tmp = {};
    allArticles().forEach(function (a) {
      var c = a.category || "未分类";
      if (!tmp[c]) tmp[c] = { name: c, count: 0, m: [0, 0, 0, 0] };
      tmp[c].count++;
      tmp[c].m[masteryOf(a.id)]++;
    });
    return Object.keys(tmp).map(function (k) { return tmp[k]; })
      .sort(function (x, y) { return y.count - x.count; });
  }

  /* ---------- 掌握度 / 删除 ---------- */
  function masteryOf(id) { return progress.mastery[id] || 0; }
  function setMastery(id, lvl) {
    progress.mastery[id] = lvl; saveProgress(); recordActivity();
    var _a = findArticle(id);
    logEvent("mastery", "《" + ((_a && _a.title) || "笔记") + "》掌握度 → " + (MASTERY[lvl] ? MASTERY[lvl].name : lvl), id);
  }
  /* 学习闭环：答对 / 复习「会了」→ 自动提升掌握度（保守策略，只升不降） */
  function bumpMastery(id, lvl) {
    if (!id) return false;
    if ((progress.mastery[id] || 0) >= lvl) return false;
    progress.mastery[id] = lvl; saveProgress();
    return true;
  }
  function isReview(id) { return !!progress.review[id]; }
  function isDeleted(id) { return deleted.indexOf(id) >= 0; }
  function deleteArticle(id) { if (deleted.indexOf(id) < 0) deleted.push(id); saveDeleted(); }
  function restoreArticle(id) { var i = deleted.indexOf(id); if (i >= 0) deleted.splice(i, 1); saveDeleted(); }

  /* ---------- 打卡 / 热力图 / 目标 / 时长 ---------- */
  function todayKey(d) {
    var t = d || new Date();
    return t.getFullYear() + "-" + ("0" + (t.getMonth() + 1)).slice(-2) + "-" + ("0" + t.getDate()).slice(-2);
  }
  /* 学习次数与专注分钟可能来自旧版本备份、或手工改过的 JSON，
     统一收口成有限数字——否则非数字值会一路写进界面（显示 [object Object]）。 */
  function numOf(v) {
    if (typeof v === "number" && isFinite(v)) return v;
    if (v && typeof v === "object" && typeof v.count === "number" && isFinite(v.count)) return v.count;
    var n = parseFloat(v);
    return isFinite(n) ? n : 0;
  }
  function histOf(k) { return numOf(history[k]); }
  function minOf(k) { return numOf(minutes[k]); }
  function recordActivity() {
    var k = todayKey();
    history[k] = histOf(k) + 1;
    saveHistory();
  }
  function calcStreak() {
    var d = new Date(), n = 0;
    if (!(histOf(todayKey(d)) > 0)) d.setDate(d.getDate() - 1);
    while (histOf(todayKey(d)) > 0) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  function heatmapData() {
    var out = [], end = new Date();
    var offset = (end.getDay() + 6) % 7;
    var start = new Date(end.getTime());
    start.setDate(start.getDate() - offset - 17 * 7);
    for (var i = 0; i < 18 * 7; i++) {
      var d = new Date(start.getTime());
      d.setDate(d.getDate() + i);
      out.push({ key: todayKey(d), count: histOf(todayKey(d)), future: d.getTime() > end.getTime() });
    }
    return out;
  }
  function startReadTimer() { flushMinutes(); readStart = Date.now(); }
  function flushMinutes() {
    if (!readStart) return;
    var m = Math.round((Date.now() - readStart) / 60000);
    readStart = 0;
    if (m <= 0) return;
    var k = todayKey();
    minutes[k] = minOf(k) + m;
    saveMinutes();
  }
  function todayMinutes() { return minOf(todayKey()); }
  function todayCount() { return histOf(todayKey()); }

  /* 「继续上次」：只读一篇文章最后读的是哪一篇 + 什么时候读的。
     标题一律从 allArticles() 现取，不落盘 —— 内容改了卡片跟着变，不会显示旧名字。 */
  function saveLast(id) {
    if (!id) return;
    try { localStorage.setItem(STORE_LAST, JSON.stringify({ id: id, t: Date.now() })); } catch (e) {}
  }
  function loadLast() {
    var o = null;
    try { o = JSON.parse(localStorage.getItem(STORE_LAST) || ""); } catch (e) {}
    if (!o || !o.id) return null;
    /* 笔记被删/被清空后旧 id 会变成空指针 —— 当没读过处理，别显示一篇打不开的卡 */
    if (!findArticle(o.id)) return null;
    return o;
  }
  /* 沉浸条要的是「一直在涨」的数：minOf(today) 只在 flush 那一刻动，
     所以把「这一段读了多少」实时叠上去。 */
  function liveMinutes() {
    var base = minOf(todayKey());
    if (readStart) base += Math.round((Date.now() - readStart) / 60000);
    return base;
  }

  /* ---------- 闪卡 / 间隔重复 ---------- */
  function dueCards() {
    var now = Date.now();
    return cards.filter(function (c) { return (c.due || 0) <= now; })
      .sort(function (a, b) { return (a.due || 0) - (b.due || 0); });
  }
  function addCard(q, a, articleId) {
    cards.push({
      id: "card-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
      articleId: articleId || "", q: q, a: a, box: 0, due: Date.now(), created: Date.now()
    });
    saveCards();
  }
  function deleteCard(id) {
    var i = cards.map(function (c) { return c.id; }).indexOf(id);
    if (i >= 0) { cards.splice(i, 1); saveCards(); }
  }
  function gradeCard(card, grade) {
    if (grade === "again") card.box = 0;
    else if (grade === "good") card.box = Math.min(5, (card.box || 0) + 1);
    card.due = Date.now() + INTERVALS[card.box];
    saveCards();
    recordActivity();
    /* 复习「会了」→ 对应笔记至少「熟悉」 */
    if (grade === "good" && card.articleId) bumpMastery(card.articleId, 1);
  }
  function cardsFromArticle(a) {
    var tmp = document.createElement("div");
    tmp.innerHTML = a.html || "";
    var out = [];
    var heads = tmp.querySelectorAll("h2,h3");
    for (var i = 0; i < heads.length; i++) {
      var h = heads[i], q = (h.textContent || "").trim(), ans = "", n = h.nextElementSibling;
      while (n && n.tagName !== "H2" && n.tagName !== "H3") {
        if (["P", "UL", "OL", "PRE", "BLOCKQUOTE", "TABLE"].indexOf(n.tagName) >= 0) ans += (n.textContent || "").trim() + "\n";
        if (ans.length > 260) break;
        n = n.nextElementSibling;
      }
      ans = ans.trim().slice(0, 300);
      if (q && ans) out.push({ q: q, a: ans });
    }
    if (!out.length) {
      var p = tmp.querySelector("p");
      if (p) out.push({ q: (a.title || "这篇笔记") + " 讲了什么？", a: (p.textContent || "").trim().slice(0, 300) });
    }
    return out;
  }

  /* ---------- 学习路径 ---------- */
  /* 推荐学习路径（按关键词匹配笔记，一键创建） */
  var RECO_PATH = [
    { id: "rec-gaoshu", title: "高等数学核心", desc: "从极限到级数的期末复习主线",
      keys: ["函数与极限", "导数与微分", "微分中值定理", "不定积分", "定积分：概念", "定积分的计算技巧", "微分方程：一阶", "重积分", "无穷级数"] },
    { id: "rec-xian", title: "线性代数速通", desc: "行列式到二次型，一条线走完",
      keys: ["行列式及其性质", "矩阵及其运算", "矩阵的初等变换与秩", "向量组的线性相关性", "特征值与特征向量", "二次型及其标准形", "正定二次型"] },
    { id: "rec-dianlu", title: "电路期末冲刺", desc: "从基尔霍夫定律到正弦稳态",
      keys: ["电路模型与基尔霍夫定律", "电阻电路的等效变换", "电阻电路的一般分析方法", "电路定理", "储能元件", "一阶电路的暂态分析", "相量法与正弦稳态", "正弦稳态电路的功率", "三相电路"] },
    { id: "rec-modian", title: "模拟电子基础", desc: "器件 → 放大 → 运放 → 电源",
      keys: ["常用半导体器件", "基本放大电路", "多级放大电路与差分", "集成运算放大器", "反馈放大电路", "信号的运算与处理", "波形产生电路", "直流稳压电源"] },
    { id: "rec-c", title: "C 语言入门到指针", desc: "零基础到能写完整程序",
      keys: ["C 语言概述", "数据类型、运算符", "顺序结构", "选择结构", "循环结构", "数组", "函数", "指针", "结构体与共用体", "文件操作"] },
    { id: "rec-wuli", title: "大学物理力学篇", desc: "运动学 → 牛顿 → 守恒 → 刚体",
      keys: ["质点运动学", "牛顿运动定律", "动量守恒与能量守恒", "刚体的定轴转动", "机械振动", "机械波"] }
  ];
  function recoSteps(keys) {
    var arts = allArticles(), used = {}, out = [];
    keys.forEach(function (k) {
      for (var i = 0; i < arts.length; i++) {
        if (used[arts[i].id]) continue;
        if (arts[i].title.indexOf(k) >= 0) { used[arts[i].id] = 1; out.push(arts[i].id); break; }
      }
    });
    return out;
  }
  function findPath(id) {
    for (var i = 0; i < paths.length; i++) if (paths[i].id === id) return paths[i];
    return null;
  }
  /* 步骤是否已完成：手动标记 或 掌握度达标（≥掌握） */
  function isStepDone(p, sid) {
    if (p.doneMap && p.doneMap[sid]) return true;
    return masteryOf(sid) >= 2;
  }
  function pathProgress(p) {
    var done = 0, total = (p.steps || []).length;
    (p.steps || []).forEach(function (sid) { if (isStepDone(p, sid)) done++; });
    return { done: done, total: total };
  }
  /* 路径预估学习时长（按字数估算，约 350 字/分钟） */
  function pathMinutes(p) {
    var wc = 0;
    (p.steps || []).forEach(function (sid) {
      var a = findArticle(sid);
      if (a) wc += a.wordCount || 0;
    });
    return Math.max(1, Math.round(wc / 350));
  }
  /* 下一个待学步骤的索引 */
  function nextStepIdx(p) {
    var steps = p.steps || [];
    for (var i = 0; i < steps.length; i++) if (!isStepDone(p, steps[i])) return i;
    return -1;
  }
  /* 新建 / 编辑学习路径弹窗 */
  function openPathForm(p) {
    var isNew = !p;
    showModal({
      title: isNew ? "新建学习路径" : "编辑学习路径",
      okText: isNew ? "创建路径" : "保存修改",
      body: '<p class="modal-hint">把相关笔记按顺序串成一条学习路线，进度会按「掌握度 / 手动完成」自动跟踪。</p>',
      fields: [
        { name: "title", label: "路径名称", ph: "如：线性代数入门", value: p ? p.title : "" },
        { name: "desc", label: "一句话描述（可选）", ph: "这条路径要解决什么？", value: p && p.desc ? p.desc : "" }
      ],
      onOk: function (v) {
        if (!v.title) { toast("路径名称不能为空"); return; }
        if (isNew) {
          var np = { id: "path-" + Date.now(), title: v.title, desc: v.desc || "", steps: [], doneMap: {} };
          paths.push(np); savePaths();
          prevRoute = Object.assign({}, route);
          route = { view: "path", pathId: np.id };
          render(); window.scrollTo(0, 0);
          toast("已创建路径：「" + v.title + "」");
        } else {
          p.title = v.title; p.desc = v.desc || "";
          savePaths(); render();
          toast("已保存");
        }
      }
    });
  }

  /* ---------- 数学公式（KaTeX） ---------- */
  /* KaTeX 按需加载
     269KB JS + 23KB CSS 此前无条件同步加载，占首屏必需资源 19%，
     而首屏驾驶舱一个公式都没有。改为首次真正要渲染公式时才注入；
     启动空闲期再 prefetch 预热，用户点进笔记时通常已在缓存里。
     占位态：.math 容器里本就存着构建期写入的 TeX 源码，按正文字体显示，
     可读、不空白 —— 相当于公式版的 font-display:swap。 */
  var KATEX_JS = "assets/katex/katex.min.js";
  var KATEX_CSS = "assets/katex/katex.min.css";
  var katexState = 0; /* 0 未开始 / 1 加载中 / 2 已就绪 */

  function ensureKatex() {
    if (typeof window.katex !== "undefined") { katexState = 2; return; }
    if (katexState === 1) return;
    katexState = 1;
    if (!document.querySelector("link[data-katex-css]")) {
      var link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = KATEX_CSS;
      link.setAttribute("data-katex-css", "1");
      document.head.appendChild(link);
    }
    var s = document.createElement("script");
    s.src = KATEX_JS;
    s.async = true;
    s.onload = function () {
      /* 只有真的出现了 window.katex 才算成功：Service Worker 在离线且无缓存时
         会把导航请求回退成 index.html，script 标签会"加载成功"却是 HTML。 */
      if (typeof window.katex === "undefined") { katexState = 0; return; }
      katexState = 2;
      /* 重扫当前视图：renderMathIn 认 data-math 做去重，decorate 全链可安全重入 */
      try { decorate(); } catch (e) {}
    };
    s.onerror = function () { katexState = 0; }; /* 失败就保持 TeX 源码，不阻塞任何视图 */
    document.head.appendChild(s);
  }
  /* 空闲期预热：prefetch 是最低优先级，不会和首屏关键资源抢带宽。
     注：sw.js 的 install 预缓存也含 KaTeX（在 load 之后后台跑，不影响首屏）；
     那条路只在本机 http 下生效，线上没有 sw.js，这里才是热缓存的主力。 */
  function prefetchKatex() {
    if (typeof window.katex !== "undefined") return;
    [["script", KATEX_JS], ["style", KATEX_CSS]].forEach(function (p) {
      var l = document.createElement("link");
      l.rel = "prefetch";
      l.as = p[0];
      l.href = p[1];
      document.head.appendChild(l);
    });
  }

  function renderMathIn(root) {
    if (typeof window.katex === "undefined") { ensureKatex(); return; }
    // 1) 构建期已包好的 <div class="math"> / <span class="math">
    var maths = root.querySelectorAll(".math");
    Array.prototype.forEach.call(maths, function (el) {
      if (el.getAttribute("data-math") === "1") return;
      try {
        window.katex.render(el.textContent, el, { display: el.tagName === "DIV", throwOnError: false });
        el.setAttribute("data-math", "1");
      } catch (e) {}
    });
    // 2) 纯文本里的 $行内$ 与 $$块级公式$$
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    var nodes = [], n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(function (node) {
      var txt = node.nodeValue;
      if (!txt || txt.indexOf("$") < 0) return;
      var p = node.parentElement;
      if (p && p.closest && p.closest("pre,code,script,style")) return;
      var re = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g, m, last = 0, frag = null;
      while ((m = re.exec(txt))) {
        if (!frag) frag = document.createDocumentFragment();
        frag.appendChild(document.createTextNode(txt.slice(last, m.index)));
        var el = document.createElement(m[1] ? "div" : "span");
        try { window.katex.render(m[1] || m[2], el, { display: !!m[1], throwOnError: false }); }
        catch (e) { el.textContent = m[0]; }
        frag.appendChild(el);
        last = m.index + m[0].length;
      }
      if (frag) {
        frag.appendChild(document.createTextNode(txt.slice(last)));
        node.parentNode.replaceChild(frag, node);
      }
    });
  }

  /* ---------- 代码高亮（轻量内置） ---------- */
  function highlightCode(root) {
    var pres = root.querySelectorAll("pre code");
    Array.prototype.forEach.call(pres, function (el) {
      var lang = (String(el.className).match(/language-(\w+)/) || [])[1] || "";
      el.innerHTML = hl(el.textContent, lang);
    });
  }
  function hl(raw, lang) {
    var kw = KEYWORDS[String(lang).toLowerCase()] || KEYWORDS.common;
    var out = "", last = 0, m;
    var re = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[^\n]*)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)/g;
    while ((m = re.exec(raw))) {
      out += esc(raw.slice(last, m.index));
      if (m[1]) out += '<span class="tk-cm">' + esc(m[1]) + "</span>";
      else if (m[2]) out += '<span class="tk-st">' + esc(m[2]) + "</span>";
      else if (m[3]) out += '<span class="tk-nm">' + esc(m[3]) + "</span>";
      else if (m[4]) out += kw.indexOf(m[4]) >= 0 ? '<span class="tk-kw">' + esc(m[4]) + "</span>" : esc(m[4]);
      last = m.index + m[0].length;
    }
    return out + esc(raw.slice(last));
  }
  function decorate() {
    var root = document.getElementById("app");
    if (!root) return;
    try { hydrateIcons(document); } catch (e) {}
    try { highlightCode(root); } catch (e) {}
    try { renderMathIn(root); } catch (e) {}
    try { anchorHeadings(root); } catch (e) {}
    try { setupFold(root); } catch (e) {}
  }
  /* 给文章内小标题统一编号，供右侧目录点击跳转（覆盖 markdown 生成的旧 id） */
  function anchorHeadings(root) {
    var art = root.querySelector(".article");
    if (!art) return;
    var hs = art.querySelectorAll("h2, h3");
    for (var i = 0; i < hs.length; i++) hs[i].id = "sec-" + i;
  }

  /* ---------- 双向链接 ---------- */
  function linkify(html) {
    return String(html || "").replace(/\[\[([^\]]+)\]\]/g, function (m, t) {
      var name = t.trim();
      var has = !!articleByTitle(name);
      return '<a class="wikilink' + (has ? "" : " missing") + '" data-action="wikilink" data-title="' + esc(name) + '">' + esc(name) + "</a>";
    });
  }
  function recentEdits() {
    var list = [];
    Object.keys(versions).forEach(function (id) {
      var arr = versions[id];
      if (arr && arr.length) {
        var cur = findArticle(id);
        list.push({ id: id, ts: arr[0].ts, title: arr[0].title || (cur ? cur.title : id) });
      }
    });
    list.sort(function (a, b) { return b.ts - a.ts; });
    return list.slice(0, 5);
  }
  function backlinksOf(a) {
    return allArticles().filter(function (o) {
      return o.id !== a.id && ((o.md || "") + (o.html || "")).indexOf("[[" + a.title + "]]") >= 0;
    });
  }
  function backlinksHTML(a) {
    var bl = backlinksOf(a);
    if (!bl.length) return "";
    return '<div class="backlinks"><h3><i class=ic data-ico=link></i> 反向链接（' + bl.length + "）</h3>" +
      bl.map(function (o) {
        return '<span class="bl-item" data-action="wikilink" data-title="' + esc(o.title) + '">' + esc(o.title) + "</span>";
      }).join("") + "</div>";
  }

  /* ---------- 搜索增强 ---------- */
  function tokens(q) { return String(q).toLowerCase().split(/\s+/).filter(Boolean); }
  function haystack(a) { return (a.title + " " + (a.tags || []).join(" ") + " " + (a.html || "") + " " + (a.md || "")).toLowerCase(); }
  function matchTokens(a, toks) {
    var hay = haystack(a);
    for (var i = 0; i < toks.length; i++) if (hay.indexOf(toks[i]) < 0) return false;
    return true;
  }
  /* 课程笔记的标题一律带「课程 · 」前缀。在对应分类页内这个前缀是冗余的
     （整页都是同一门课），剥掉后标题更短、更好扫读。 */
  function displayTitle(a) {
    var t = (a && a.title) || "";
    var c = (a && a.category) || "未分类";
    var pre = c + " · ";
    if (t.indexOf(pre) === 0) return t.slice(pre.length);
    return t;
  }
  function markText(text, toks) {
    var s = esc(text);
    toks.forEach(function (t) {
      if (!t) return;
      var re = new RegExp("(" + t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "gi");
      s = s.replace(re, "<mark>$1</mark>");
    });
    return s;
  }
  function snippet(a, toks) {
    var plain = String(a.md || a.html || "").replace(/<[^>]+>/g, " ");
    var low = plain.toLowerCase(), pos = -1;
    for (var i = 0; i < toks.length; i++) {
      var p = low.indexOf(toks[i]);
      if (p >= 0 && (pos < 0 || p < pos)) pos = p;
    }
    if (pos < 0) return "";
    var start = Math.max(0, pos - 40), end = Math.min(plain.length, pos + 90);
    return (start > 0 ? "…" : "") + markText(plain.slice(start, end), toks) + (end < plain.length ? "…" : "");
  }

  /* ---------- 工具 ---------- */
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function colorFor(name) {
    if (CAT_COLOR[name] !== undefined) return PALETTE[CAT_COLOR[name]];
    var h = 0;
    for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return PALETTE[h % PALETTE.length];
  }
  /* 学科色的两套变体：下标 0 = 深底用的亮荧光，1 = 浅底用的沉一档。
     此前所有调用点都硬取 [0]，于是浅色主题下这些小色点对比度只有 1.6–2.2:1。
     统一改走 catColor()，按当前明暗模式取对应变体。 */
  function catColor(name) { return colorFor(name)[theme === "dark" ? 0 : 1]; }
  function catIco(name) { return CAT_ICO[name] || "folder"; }
  function fmtDate(d) { return d ? String(d).slice(0, 10) : ""; }
  function fmtDue(ts) {
    var diff = ts - Date.now();
    if (diff <= 0) return "待复习";
    var d = Math.ceil(diff / (24 * 3600 * 1000));
    return d <= 1 ? "今天/明天" : d + " 天后";
  }
  function toast(msg) {
    var t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.classList.remove("show"); }, 1800);
  }

  /* ---------- 统计条 ---------- */
  function renderStats() {
    var box = document.getElementById("stats");
    if (!box) return;                       // 站内总览卡在部分页面不出现
    var arts = allArticles();
    var learned = arts.filter(function (a) { return masteryOf(a.id) >= 1; }).length;
    var sum = arts.reduce(function (s, a) { return s + masteryOf(a.id); }, 0);
    var pct = arts.length ? Math.round((sum / (arts.length * 3)) * 100) : 0;
    box.innerHTML =
      stat(arts.length, "篇笔记") + stat(getCategories().length, "个分类") +
      stat(learned, "已学习") + stat(pct + "%", "掌握度");
  }
  function stat(num, lbl) {
    return '<div class="stat"><div class="num">' + num + '</div><div class="lbl">' + lbl + "</div></div>";
  }

  /* ---------- 首页 ---------- */
/* ---------- 首页驾驶舱（工作台样式） ---------- */
  var DAY_MS = 24 * 3600 * 1000;

  /* ---------- 「今天要处理」的手动划除（按天存，次日自动重现） ---------- */
  var dismiss = loadJSON(STORE_DISMISS, {});
  if (!dismiss || typeof dismiss !== "object") dismiss = {};
  (function pruneDismiss() {
    var ks = Object.keys(dismiss).sort();
    if (ks.length <= 8) return;
    var keep = {};
    ks.slice(-8).forEach(function (x) { keep[x] = dismiss[x]; });
    dismiss = keep;
    localStorage.setItem(STORE_DISMISS, JSON.stringify(dismiss));
  })();
  function todayDismiss() { return dismiss[todayKey()] || {}; }
  function isDismissed(key) { return !!todayDismiss()[key]; }
  function dismissTask(key) {
    if (!key) return;
    if (!dismiss[todayKey()]) dismiss[todayKey()] = {};
    dismiss[todayKey()][key] = 1;
    localStorage.setItem(STORE_DISMISS, JSON.stringify(dismiss));
    render();
    toast("今天先不看，明天还会出现");
  }
  function restoreDismissed() {
    if (!dismiss[todayKey()]) { toast("今天没有划掉的任务"); return; }
    delete dismiss[todayKey()];
    localStorage.setItem(STORE_DISMISS, JSON.stringify(dismiss));
    render();
    toast("已恢复划掉的任务");
  }

  /* 一次性算出首页需要的全部数据（纯数据层：不碰 DOM、不调用任何渲染函数） */
  function homeCtx() {
    var arts = allArticles();
    var nodes = chainNodes(chainCat);
    var cdone = 0, cnext = -1;
    nodes.forEach(function (n, i) {
      var st = ringState(nodes, i);
      if (st === 'done') cdone++;
      else if (st === 'active' && cnext < 0) cnext = i;
    });
    var sum = arts.reduce(function (s, a) { return s + masteryOf(a.id); }, 0);
    return {
      arts: arts,
      cats: getCategories(),
      dueC: dueCards(),
      dueM: misDue(),
      revNotes: arts.filter(function (a) { return isReview(a.id); }).length,
      streak: calcStreak(),
      today: todayCount(),
      mins: todayMinutes(),
      pct: arts.length ? Math.round((sum / (arts.length * 3)) * 100) : 0,
      nodes: nodes,
      chainDone: cdone,
      chainNext: cnext
    };
  }

  /* 「今天要处理」清单：到期 → 今日目标 → 待推进，逾期优先 */
  function todayTasks(ctx) {
    var out = [], now = Date.now();

    if (ctx.dueC.length) {
      var lateC = 0;
      ctx.dueC.forEach(function (c) { if (now - (c.due || 0) > DAY_MS) lateC++; });
      out.push({
        key: 'cards', tone: lateC ? 'over' : 'today', ico: 'refresh',
        title: ctx.dueC.length + ' 张闪卡到期',
        sub: lateC ? '其中 ' + lateC + ' 张已延误超过 1 天，先清掉' : '按间隔重复排到了今天，过一遍再往后推',
        action: 'review', btn: '去复习'
      });
    }

    if (ctx.dueM.length) {
      var lateM = 0;
      ctx.dueM.forEach(function (m) { if (now - (m.due || 0) > DAY_MS) lateM++; });
      out.push({
        key: 'mis', tone: lateM ? 'over' : 'today', ico: 'warn',
        title: ctx.dueM.length + ' 道错题待复习',
        sub: lateM ? '其中 ' + lateM + ' 道已延误超过 1 天' : '做错过的题，趁还没忘再过一遍',
        action: 'mistakes', btn: '去错题集'
      });
    }

    if (ctx.today < goal) {
      out.push({
        key: 'goal', tone: ctx.today === 0 ? 'today' : 'soft', ico: 'target',
        title: '今日目标还差 ' + (goal - ctx.today) + ' 次',
        sub: '已完成 ' + ctx.today + ' / ' + goal + ' 次 · 已专注 ' + ctx.mins + ' 分钟',
        action: 'all-notes', btn: '去学一篇'
      });
    }

    if (ctx.chainNext >= 0) {
      var node = ctx.nodes[ctx.chainNext];
      var lv = diffLevel(node.d.level);
      out.push({
        key: 'chain:' + node.a.id, tone: 'soft', ico: 'chain',
        title: '知识链第 ' + (ctx.chainNext + 1) + ' 环：' + displayTitle(node.a),
        sub: '难度「' + lv.name + '」· 这条链共 ' + ctx.nodes.length + ' 环',
        action: 'chain', btn: '继续学习'
      });
    }

    var pathN = 0;
    paths.forEach(function (p) {
      if (pathN >= 2) return;
      var pr = pathProgress(p);
      if (!pr.total || pr.done === 0 || pr.done >= pr.total) return;
      var ni = nextStepIdx(p), na = ni >= 0 ? findArticle(p.steps[ni]) : null;
      pathN++;
      out.push({
        key: 'path:' + p.id, tone: 'soft', ico: 'map',
        title: '路径「' + p.title + '」下一步' + (na ? '：' + displayTitle(na) : ''),
        sub: pr.done + ' / ' + pr.total + ' 步已完成 · 进度 ' + Math.round(pr.done / pr.total * 100) + '%',
        action: 'open-path', actionId: p.id, btn: '继续'
      });
    });

    if (ctx.revNotes && !ctx.dueC.length) {
      out.push({
        key: 'review', tone: 'soft', ico: 'star',
        title: ctx.revNotes + ' 篇笔记标了「待复习」',
        sub: '这些是你手动标记要回头看的笔记',
        action: 'review', btn: '开始复习'
      });
    }

    return out;
  }

  /* 顶部 KPI 条：6 个可点击的扫视指标 */
  function kpiHTML(ctx) {
    var cells = [
      { v: ctx.dueC.length, k: '待复习闪卡', a: 'review', hot: ctx.dueC.length > 0 },
      { v: ctx.dueM.length, k: '待复习错题', a: 'mistakes', hot: ctx.dueM.length > 0 },
      { v: ctx.streak, k: '连续打卡', a: 'analytics', hot: false, u: '天' },
      { v: ctx.today, k: '今日学习', a: 'analytics', hot: false, u: '次' },
      { v: ctx.pct, k: '掌握度', a: 'analytics', hot: false, u: '%' },
      { v: ctx.arts.length, k: '笔记总数', a: 'all-notes', hot: false }
    ];
    return '<div class="dsh-kpi">' + cells.map(function (c) {
      return '<button type="button" class="dsh-kpi-c' + (c.hot ? ' hot' : '') + '" data-action="' + c.a + '">' +
        '<span class="v"><span class="vn" data-count="' + c.v + '">' + c.v + '</span>' +
          (c.u ? '<em>' + c.u + '</em>' : '') + '</span>' +
        '<span class="k">' + c.k + '</span></button>';
    }).join('') + '</div>';
  }

  /* ---------- 继续上次 ----------
     首页第一眼要同时回答两件事：今天要做什么 + 上次那篇读到哪了。
     KPI 管前者，这张卡管后者。没有记录时给空态而不是撤掉格子 ——
     首页版式不能因为「有没有读过」而跳动。 */
  function resumeHTML() {
    var last = loadLast();
    var emptyCard = '<div class="resume-card is-empty">' +
      '<span class="rc-ico">' + ico("book", 17) + "</span>" +
      '<div class="rc-tx"><strong>还没有读过笔记</strong>' +
      "<span>从「全部笔记」挑一篇开始，下次回来这里会接着上次那篇</span></div>" +
      '<button type="button" class="btn sm" data-action="all-notes">去挑一篇</button></div>';
    if (!last) return emptyCard;
    var a = findArticle(last.id);
    if (!a) return emptyCard;
    /* ⚠ 字段是 wordCount 不是 words —— 早先写成 a.words，全站 103 篇都显示「0 字」，
       而且 jsdom 断言只比对「有没有 字」这个字符，测不出来。真浏览器一量文案就露了。
       另：title 自带「分类 · 」前缀时 meta 里不再重复一遍分类。 */
    var cat = (a.title || "").indexOf((a.category || "") + " · ") === 0 ? "" : (a.category || "未分类");
    var meta = [cat, (a.wordCount || 0) + " 字", fmtAgo(last.t)]
      .filter(function (s) { return s; }).join(" · ");
    return '<div class="resume-card" data-action="open-article" data-id="' + esc(a.id) + '">' +
      '<span class="rc-ico">' + ico("book", 17) + "</span>" +
      '<div class="rc-tx"><strong>' + esc(a.title) + "</strong>" +
      '<span class="meta">' + esc(meta) + "</span></div>" +
      '<span class="rc-go">' + ico("arrowLeft", 15) + "</span></div>";
  }

  /* ---------- KPI 数字滚动 ----------
     渲染出来的初值就是真实数字（JS 万一挂了也看得见数，不是一排 0）；
     render 之后**同步**置 0，再交给 rAF 数上去 —— 同步那一步发生在下一帧绘制前，
     所以不会出现"先闪一下真值再归零"。
     620ms 与进度条的 0.6s 同一口径；reduced-motion 直接落定，不数。 */
  function animateCounts(root) {
    var els = (root || document).querySelectorAll("[data-count]");
    if (!els.length) return;
    var reduce = false;
    try { reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) {}
    Array.prototype.forEach.call(els, function (el) {
      var target = Number(el.getAttribute("data-count")) || 0;
      if (reduce || target <= 0) { el.textContent = String(target); return; }
      el.textContent = "0";
      var t0 = 0, DUR = 620;
      function step(ts) {
        if (!t0) t0 = ts;
        var p = Math.min(1, (ts - t0) / DUR);
        /* 缓出：先快后慢，最后一点慢慢落定 —— 像仪表读数稳下来，不是线性爬 */
        el.textContent = String(Math.round(target * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = String(target);
      }
      requestAnimationFrame(step);
    });
  }

  /* 「今天要处理」置顶区（支持手动划除，次日重现） */
  function todoHTML(ctx) {
    var all = todayTasks(ctx), shown = [], cut = [];
    all.forEach(function (t) { (isDismissed(t.key) ? cut : shown).push(t); });

    var badge = shown.length ? shown.length + ' 项'
      : (cut.length ? '已划掉 ' + cut.length + ' 项' : '已清空');
    var head = '<div class="section-title"><h2><i class=ic data-ico=bolt></i> 今天要处理</h2>' +
      '<span class="st-tools">' +
        (cut.length ? '<button type="button" class="dsh-restore" data-action="todo-restore">恢复划掉的 ' + cut.length + ' 项</button>' : '') +
        '<span class="badge">' + badge + '</span>' +
      '</span></div>';

    if (!shown.length) {
      return head + '<div class="dsh-todo empty">' +
        '<span class="dt-ico">' + ico('check', 18) + '</span>' +
        '<div class="dt-tx"><strong>' + (cut.length ? '今天的任务都划掉了' : '今天没有到期的任务') + '</strong>' +
        '<span>' + (cut.length ? '明天它们会再出现；想反悔可以点上面的「恢复」' : '可以接着学新内容，或去知识链挑下一环') +
        '</span></div>' +
        (cut.length ? '' : '<button type="button" class="btn" data-action="chain">去知识链</button>') +
        '</div>';
    }

    return head + '<div class="dsh-todo">' + shown.map(function (t) {
      return '<div class="dsh-task ' + t.tone + '">' +
        '<span class="dt-ico">' + ico(t.ico, 16) + '</span>' +
        '<div class="dt-tx"><strong>' + esc(t.title) + '</strong><span>' + esc(t.sub) + '</span></div>' +
        '<button type="button" class="btn sm" data-action="' + t.action + '"' +
          (t.actionId ? ' data-id="' + esc(t.actionId) + '"' : '') + '>' + esc(t.btn) + '</button>' +
        '<button type="button" class="dsh-x" data-action="todo-dismiss" data-key="' + esc(t.key) + '"' +
          ' title="今天先不看，明天还会出现" aria-label="今天先不看">' + ico('close', 13) + '</button>' +
        '</div>';
    }).join('') + '</div>';
  }

  /* 功能模块启动器 */
  function tilesHTML(ctx) {
    var acc = 0;
    if (practiceLog.length) {
      acc = Math.round(practiceLog.filter(function (l) { return l.ok; }).length / practiceLog.length * 100);
    }
    var tiles = [
      { a: 'review', i: 'refresh', t: '今日复习', s: ctx.dueC.length ? ctx.dueC.length + ' 张到期' : '暂无到期' },
      { a: 'mistakes', i: 'warn', t: '错题集', s: mis.list.length + ' 道 · ' + ctx.dueM.length + ' 待复习' },
      { a: 'cards', i: 'cards', t: '闪卡库', s: cards.length + ' 张卡' },
      { a: 'practice', i: 'target', t: 'AI 练习', s: practiceLog.length ? practiceLog.length + ' 次 · 正确率 ' + acc + '%' : '还没练过' },
      { a: 'ai', i: 'chat', t: 'AI 辅导', s: aiCfg.key ? aiCfg.model : '未配置密钥' },
      { a: 'chain', i: 'chain', t: '知识链', s: ctx.chainDone + ' / ' + ctx.nodes.length + ' 环' },
      { a: 'graph', i: 'graph', t: '知识图谱', s: '按 [[双链]] 生成' },
      { a: 'new-note', i: 'plus', t: '新建笔记', s: 'Markdown 写作' }
    ];
    return '<div class="section-title"><h2><i class=ic data-ico=grid></i> 功能模块</h2>' +
      '<span class="badge">' + tiles.length + ' 个</span></div>' +
      '<div class="dsh-tiles">' + tiles.map(function (t) {
        return '<button type="button" class="dsh-tile" data-action="' + t.a + '">' +
          '<span class="dtl-ico">' + ico(t.i, 17) + '</span>' +
          '<span class="dtl-tx"><strong>' + t.t + '</strong><span>' + esc(t.s) + '</span></span>' +
          '</button>';
      }).join('') + '</div>';
  }

  /* ---------- 最近动态（事件日志）----------
     lls_history 只记「每天几次」，没有事件粒度，推不出时间线；
     进度数据结构里也没有逐条时间戳。所以另起一条环形缓冲：
     只留最近 60 条，写成「什么时候做了什么」。 */
  var events = loadJSON(STORE_EVENTS, []);
  function logEvent(kind, text, id) {
    events.unshift({ t: Date.now(), k: kind, x: String(text || ""), id: id || null });
    if (events.length > 60) events.length = 60;
    try { localStorage.setItem(STORE_EVENTS, JSON.stringify(events)); } catch (e) {}
  }
  function fmtAgo(ts) {
    var d = Date.now() - ts;
    if (d < 60000) return "刚刚";
    if (d < 3600000) return Math.floor(d / 60000) + " 分钟前";
    if (d < 86400000) return Math.floor(d / 3600000) + " 小时前";
    if (d < 604800000) return Math.floor(d / 86400000) + " 天前";
    var dt = new Date(ts);
    return (dt.getMonth() + 1) + " 月 " + dt.getDate() + " 日";
  }
  var EV_ICO = { note: "doc", mastery: "star", review: "refresh", card: "cards", mistake: "warn", path: "map" };
  /* 首页只取 6 条 —— 它是「今天做什么」，不是流水账 */
  function timelineHTML() {
    var head = '<div class="section-title"><h2><i class=ic data-ico=clock></i> 最近动态</h2>';
    if (!events.length) {
      return head + "</div>" + '<div class="tl-wrap">' +
        emptyHint("还没有动态。读一篇笔记、评一张闪卡，这里就开始记事。") + "</div>";
    }
    var n = Math.min(6, events.length);
    var rows = events.slice(0, n).map(function (ev) {
      return '<li class="tl-item">' +
        '<span class="tl-ico">' + ico(EV_ICO[ev.k] || "clock", 13) + "</span>" +
        '<span class="tl-tx">' + esc(ev.x) + "</span>" +
        '<time class="tl-when">' + fmtAgo(ev.t) + "</time></li>";
    }).join("");
    return head + '<span class="badge">最近 ' + n + " 条 · 共 " + events.length + " 条</span></div>" +
      '<ol class="tl-wrap">' + rows + "</ol>";
  }

  /* 学习进度卡：节点三态 + 当前节点展开详情。
     数据取 ctx.nodes（= chainNodes(chainCat)），与首页 KPI 的「知识链」读数同源，
     两处永远一致，不会一个说 62% 一个说 58%。
     当前节点 = 第一个 active（ctx.chainNext）；全完成时给一句收尾，不留空白。 */
  function progressCardHTML(ctx) {
    var nodes = ctx.nodes;
    if (!nodes.length) return "";
    var total = nodes.length, cur = ctx.chainNext;
    var pct = total ? Math.round((ctx.chainDone / total) * 100) : 0;

    /* 节点轨：三态 —— done（实心勾）/ cur（实心高亮 + 外圈光晕）/ todo（留空）。
       环数多时靠横向拖动，所以节点上带 title，悬停可看是哪一环。 */
    var rail = "";
    nodes.forEach(function (n, i) {
      var st = ringState(nodes, i), isCur = (i === cur);
      var cls = st === "done" ? "done" : (isCur ? "cur" : "todo");
      var lbl = st === "done" ? ico("check", 12) : (isCur ? String(i + 1) : "");
      rail += '<span class="pnode ' + cls + '" title="第 ' + (i + 1) + ' 环 · ' +
        esc(n.a.title) + '">' + lbl + "</span>";
      if (i < total - 1) rail += '<span class="plink' + (st === "done" ? " done" : "") + '"></span>';
    });

    var detail;
    if (cur >= 0 && nodes[cur]) {
      var a = nodes[cur].a, d = nodes[cur].d, L = diffLevel(d.level);
      var col = catColor(a.category || "未分类");
      detail = '<div class="prog-now">' +
        '<div class="pn-top">' +
          '<span class="pn-tag">' + ico("route", 12) + " 当前 · 第 " + (cur + 1) + " 环</span>" +
          '<span class="pn-diff">' + starsHTML(d.level, L.c) + " " + esc(L.name) + "</span></div>" +
        '<div class="pn-title">' + esc(a.title) + "</div>" +
        '<div class="pn-meta"><span class="pdot" style="background:' + col + '"></span>' +
          esc(a.category || "未分类") + "<span>·</span>" + (a.wordCount || 0) + " 字" +
          "<span>·</span>约 " + Math.max(1, Math.round((a.wordCount || 0) / 350)) + " 分钟</div>" +
        '<div class="pn-ops">' +
          '<button type="button" class="btn primary sm" data-action="open-article" data-id="' + esc(a.id) + '">' +
            ico("doc", 13) + " 继续学习</button>" +
          '<button type="button" class="btn sm" data-action="chain">' +
            ico("chain", 13) + " 看整条链</button>" +
        "</div></div>";
    } else {
      detail = '<div class="prog-now all-done">' + ico("check", 16) + " 这条链已全部完成</div>";
    }

    return '<div class="prog-card">' +
      '<div class="prog-head">' +
        "<h3><i class=ic data-ico=chain></i> 学习进度 · " + esc(chainLabel()) + "</h3>" +
        '<span class="prog-meta">已完成 ' + ctx.chainDone + " / " + total + " 环</span>" +
        '<span class="prog-pct">' + pct + "%</span></div>" +
      '<div class="prog-rail" id="progRail">' + rail + "</div>" +
      detail + "</div>";
  }

  function renderHome() {
    var ctx = homeCtx();
    var gDone = Math.min(goal, ctx.today), gPct = goal ? Math.round((gDone / goal) * 100) : 0;

    var cardsH = ctx.cats.map(function (c) {
      var col = colorFor(c.name);
      var mastered = c.m[2] + c.m[3], segs = "";
      for (var l = 3; l >= 0; l--) {
        if (!c.m[l]) continue;
        segs += '<span style="width:' + (c.m[l] / c.count * 100) + "%;background:" + MASTERY[l].c + '"></span>';
      }
      return '<div class="cat-card" data-action="open-category" data-cat="' + esc(c.name) + '">' +
        '<div class="cat-top" style="--c1:' + col[0] + ";--c2:" + col[1] + '">' +
        '<i class="ic cat-ico" data-ico="' + catIco(c.name) + '" data-sz="24"></i></div>' +
        '<div class="cat-body"><h3>' + esc(c.name) + "</h3>" +
        '<div class="meta">共 ' + c.count + " 篇 · 掌握 " + mastered + " 篇</div>" +
        '<div class="bar multi">' + segs + "</div></div></div>";
    }).join("");

    var hm = heatmapData().map(function (d) {
      var lv = d.future ? -1 : (d.count === 0 ? 0 : d.count === 1 ? 1 : d.count === 2 ? 2 : d.count <= 4 ? 3 : 4);
      return '<i class="hm-cell hm-' + lv + '" title="' + d.key + "：" + d.count + ' 次"></i>';
    }).join("");

    var recoCards = RECO_PATH.filter(function (r) {
      return !paths.some(function (p) { return p.id === r.id; });
    }).map(function (r) {
      var rn = recoSteps(r.keys).length;
      return '<div class="path-card reco-card" data-action="use-path" data-id="' + esc(r.id) + '">' +
        '<div class="pc-top"><span class="pc-ico">' + ico("map", 15) + '</span>' +
          '<span class="pc-tag">推荐</span></div>' +
        '<div class="pc-t">' + esc(r.title) + "</div>" +
        '<div class="pc-d">' + esc(r.desc) + "</div>" +
        '<div class="meta">' + rn + " 篇 · 一键创建</div></div>";
    }).join("");

    var pathCards = paths.map(function (p) {
      var pr = pathProgress(p);
      var pct = pr.total ? Math.round((pr.done / pr.total) * 100) : 0;
      var pni = nextStepIdx(p), pna = pni >= 0 ? findArticle(p.steps[pni]) : null;
      return '<div class="path-card" data-action="open-path" data-id="' + esc(p.id) + '">' +
        '<div class="pc-top"><span class="pc-ico">' + ico("map", 15) + '</span>' +
          '<span class="pc-pct">' + pct + "%</span></div>" +
        '<div class="pc-t">' + esc(p.title) + "</div>" +
        (p.desc ? '<div class="pc-d">' + esc(p.desc) + "</div>" : "") +
        '<div class="meta">' + pr.done + " / " + pr.total + " 步已完成</div>" +
        '<div class="bar"><span style="width:' + pct + '%"></span></div>' +
        (pna ? '<div class="pc-next">下一步：' + esc(pna.title) + "</div>"
             : (pr.total ? '<div class="pc-next pc-next-done">' + ico("check", 12) + " 已全部完成</div>" : "")) +
        "</div>";
    }).join("");

    /* v13：首页各段曾各自带零散 margin（甚至内联 margin-top:24px / 26px），
       段间距全凭手感。现在整页包一层 .home-stack，纵向节奏交给一条 gap 管，
       标题与它自己那段内容的间距由 CSS 补偿 —— JS 里不再出现裸 margin。 */
    /* v14 第二批：首页补上页面标题区（对齐参考稿「工作台」）——
       大标题 + 副标题（日期 + 今天还剩几项），放在 .home-stack 之外，
       段内节奏不受影响。 */
    var _pn = 0;
    todayTasks(ctx).forEach(function (t) { if (!isDismissed(t.key)) _pn++; });
    var _dt = new Date();
    var _sub = (_dt.getMonth() + 1) + "月" + _dt.getDate() + "日 星期" +
      "日一二三四五六".charAt(_dt.getDay()) + " · " +
      (_pn ? "今天有 " + _pn + " 项待处理" : "今天的任务都清完了");
    document.getElementById("app").innerHTML =
      pageHead("home", "首页", _sub, "") +
      '<div class="home-stack">' +
      kpiHTML(ctx) +
      resumeHTML() +
      todoHTML(ctx) +
      tilesHTML(ctx) +
      timelineHTML() +
      progressCardHTML(ctx) +
      '<div class="section-title"><h2><i class=ic data-ico=book></i> 学习分类</h2><span class="badge">' + ctx.cats.length + " 个分类</span></div>" +
      '<div class="grid">' + (cardsH || emptyHint("还没有任何笔记，点右上角「导入」试试")) + "</div>" +
      '<div class="path-cta chain-cta-row" data-action="chain">' +
        '<span class="pcta-ico">' + ico("chain", 19) + "</span>" +
        '<div class="pcta-tx"><strong>知识链 · 由易到难</strong>' +
          "<span>" + ctx.arts.length + " 篇笔记按难度串成一环扣一环的学习链，学完一环自动解锁下一环</span></div>" +
        '<span class="pcta-go">' + ico("arrowLeft", 16) + "</span></div>" +
      '<div class="section-title"><h2><i class=ic data-ico=map></i> 学习路径</h2><span class="badge">' + paths.length + " 条</span></div>" +
      '<div class="grid">' + (pathCards || "") + recoCards +
        '<div class="cat-card new-path" data-action="new-path"><div class="cat-body" style="padding-top:26px">' +
        "<h3>＋ 新建路径</h3><div class=\"meta\">把相关笔记按顺序串起来</div></div></div></div>" +
      '<div class="section-title"><h2><i class=ic data-ico=flame></i> 学习热力图</h2>' +
        '<span class="badge">连续 ' + ctx.streak + " 天 · 今日 " + ctx.today + " 次 · 专注 " + ctx.mins + " 分钟</span></div>" +
      '<div class="heatbox"><div class="hm-grid">' + hm + "</div>" +
        '<div class="hm-legend"><span>少</span><i class="hm-cell hm-0"></i><i class="hm-cell hm-1"></i>' +
        '<i class="hm-cell hm-2"></i><i class="hm-cell hm-3"></i><i class="hm-cell hm-4"></i><span>多</span></div>' +
        '<div class="goal-row"><span><i class=ic data-ico=target></i> 今日目标</span><div class="bar" style="flex:1;margin:0 12px">' +
        '<span style="width:' + gPct + '%"></span></div><span>' + gDone + " / " + goal + " 次</span></div></div>" +
      "</div>";
    /* 渲染完立刻接上数字滚动：同步置 0 发生在下一帧绘制前，不会闪真值 */
    animateCounts(document.getElementById("app"));
    /* 进度轨滚到当前节点。用两段 rect 的差值定位，不依赖 offsetParent
       （.pnode / .prog-rail 都是 static，offsetLeft 会算到别的祖先上去）；
       直接赋值 scrollLeft，不做平滑 —— 每次 render 都会重跑，动画会打架。 */
    var railEl = document.getElementById("progRail");
    if (railEl) {
      var curEl = railEl.querySelector(".pnode.cur");
      if (curEl) {
        var _rr = railEl.getBoundingClientRect(), _cr = curEl.getBoundingClientRect();
        railEl.scrollLeft = Math.max(0, railEl.scrollLeft + (_cr.left - _rr.left) -
          (_rr.width - _cr.width) / 2);
      }
    }

    document.getElementById("footer").innerHTML =
      "本地静态网站 · 数据完全在你的设备上 · 生成于 " + esc(DATA.generatedAt || "") +
      (imported.length ? ' · <a data-action="clear-import">已导入 ' + imported.length + " 篇，点此清空</a>" : "");
  }

  function emptyHint(t) { return '<div class="empty">' + t + "</div>"; }

  /* ---------- 页面标题区（v14 第二批）----------
     参考稿形态：大标题 + 一行副标题说明。.page-head 是页面级标记
     （字号走 .page-head h2，不再靠 #app > 结构选择器，避免一页多个
     section-title 时次级标题被误放大）；.ph-tx 把标题+副标题纵排。
     right 放角标/按钮，居中对着两行标题块。 */
  function pageHead(ic, title, sub, right) {
    return '<div class="section-title page-head"><div class="ph-tx"><h2>' +
      (ic ? '<i class=ic data-ico=' + ic + '></i> ' : "") + title + "</h2>" +
      (sub ? '<p class="st-sub">' + sub + "</p>" : "") + "</div>" + (right || "") + "</div>";
  }

  /* ---------- 列表 ---------- */
  function filteredArticles() {
    var arts = allArticles();
    if (route.category) arts = arts.filter(function (a) { return (a.category || "未分类") === route.category; });
    if (route.tag) arts = arts.filter(function (a) { return (a.tags || []).indexOf(route.tag) >= 0; });
    if (query) {
      var toks = tokens(query);
      arts = arts.filter(function (a) { return matchTokens(a, toks); });
    }
    return arts.sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); });
  }

  /* ---------- 笔记列表 ---------- */
  function updatedAt(a) {
    var v = versions[a.id];
    if (v && v.length && v[0].ts) return v[0].ts;
    var t = Date.parse(a.date);
    return isNaN(t) ? 0 : t;
  }
  function sortArticles(arts) {
    var arr = arts.slice();
    if (nbSort === "title") arr.sort(function (a, b) { return String(a.title).localeCompare(String(b.title), "zh"); });
    else if (nbSort === "words") arr.sort(function (a, b) { return (b.wordCount || 0) - (a.wordCount || 0); });
    else if (nbSort === "mastery") arr.sort(function (a, b) { return masteryOf(a.id) - masteryOf(b.id) || updatedAt(b) - updatedAt(a); });
    else arr.sort(function (a, b) { return updatedAt(b) - updatedAt(a); });
    return arr;
  }
  /* 从 Markdown / HTML 原文抽取纯文本摘要（返回纯文本，调用方需 esc） */
  /* 从 Markdown 原文抽取可读摘要：
     公式剥离后会留下断句（如"对任意 ，存在 "），所以优先选取公式占比低的段落拼接。 */
  function excerptOf(a, n) {
    var limit = n || 120;
    var s = String(a.md || a.html || "");
    s = s.replace(/^---[\s\S]*?\n---\s*/, "").replace(/```[\s\S]*?```/g, "\n\n");
    var lines = s.split("\n").map(function (ln) {
      if (/^\s*#{1,6}\s/.test(ln)) return "";          // 标题行不计入摘要
      return ln
        .replace(/^\s*(?:[-*+]|\d+\.)\s+/, "")
        .replace(/^\s*>\s?/, "")
        .replace(/^\s*\|.*\|\s*$/, "")
        .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
        .replace(/\[\[([^\]]+)\]\]/g, "$1")
        .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
        .replace(/[*_`#~]/g, "")
        .trim();
    });
    var MATH_HTML = /<(span|div)[^>]*class="[^"]*math[^"]*"[^>]*>[\s\S]*?<\/\1>/gi;
    var paras = [], buf = [];
    function flush() {
      if (!buf.length) return;
      var raw = buf.join(" "); buf = [];
      var mathLen = 0;
      raw.replace(MATH_HTML, function (m) { mathLen += m.length; return m; });
      raw.replace(/\$[^$]*\$/g, function (m) { mathLen += m.length; return m; });
      var clean = raw
        .replace(MATH_HTML, " ")
        .replace(/<[^>]*>/g, " ")
        .replace(/\$[^$]*\$/g, " ")
        .replace(/&[a-z#0-9]{1,8};/gi, " ")
        .replace(/\s+/g, " ")
        .replace(/([\u4e00-\u9fa5])\s+([\u4e00-\u9fa5])/g, "$1$2")
        .replace(/\s+([，。；：、）】》])/g, "$1")
        .replace(/([，。；：、])\s+/g, "$1")
        .replace(/[（(]\s*[）)]/g, "")
        .replace(/[，。；：、]{2,}/g, "，")
        .trim();
      if (clean.replace(/[^\u4e00-\u9fa5A-Za-z0-9]/g, "").length < 10) return;
      paras.push({ text: clean, ratio: mathLen / Math.max(1, raw.length) });
    }
    lines.forEach(function (ln) { if (ln) buf.push(ln); else flush(); });
    flush();
    var out = "", scanned = 0;
    for (var i = 0; i < paras.length && out.length < limit; i++) {
      if (++scanned > 12) break;                       // 只从文章前部取
      if (paras[i].ratio > 0.2) continue;              // 公式太密，跳过
      out += (out ? " " : "") + paras[i].text;
    }
    if (!out && paras.length) {                        // 全是公式段：退回公式最少的
      var best = paras[0];
      for (var k = 1; k < paras.length && k < 12; k++) if (paras[k].ratio < best.ratio) best = paras[k];
      out = best.text;
    }
    return out.slice(0, limit).trim();
  }
  /* 状态胶囊双态（v14 第二批，对齐参考稿「已完成实底 / 生成中描边」）：
     掌握/精通 = 已完成 → 实底；未接触/熟悉 = 进行中 → 描边。
     描边态颜色走 --mc 自定义属性，文字用 color-mix 往正文色靠，琥珀色也有可读性。 */
  function nbBadgeLvl(m) {
    return m >= 2
      ? '<span class="mchip done" style="background:' + MASTERY[m].c + '">' + MASTERY[m].name + "</span>"
      : '<span class="mchip todo" style="--mc:' + MASTERY[m].c + '">' + MASTERY[m].name + "</span>";
  }
  function nbBadge(a) { return nbBadgeLvl(masteryOf(a.id)); }
  function noteRowHTML(a, toks) {
    var m = masteryOf(a.id);
    var col = catColor(a.category || "未分类");
    var isSearch = toks.length > 0;
    var ex = isSearch ? snippet(a, toks) : esc(excerptOf(a, 130)) + "…";
    var tags = (a.tags || []).slice(0, 3).map(function (t) {
      return '<span class="tag" data-action="search-tag" data-tag="' + esc(t) + '">#' + esc(t) + "</span>";
    }).join("");
    return '<div class="item' + (m >= 2 ? " done" : "") + '" data-action="open-article" data-id="' + esc(a.id) + '">' +
      '<span class="item-bar" style="background:' + col + '"></span>' +
      '<div class="item-main">' +
        '<div class="item-head"><h3>' + markText(displayTitle(a), toks) + "</h3>" +
          (isReview(a.id) ? '<span class="review-flag"><i class=ic data-ico=star></i> 复习</span>' : "") + nbBadge(a) + "</div>" +
        (ex ? '<p class="item-ex">' + ex + "</p>" : "") +
        '<div class="item-meta"><span>' + esc(a.category || "未分类") + "</span><span>·</span><span>" + a.wordCount + " 字</span>" +
          (fmtDate(a.date) ? "<span>·</span><span>" + fmtDate(a.date) + "</span>" : "") +
          (tags ? '<span class="item-tags">' + tags + "</span>" : "") + "</div>" +
      "</div></div>";
  }
  function noteCardHTML(a, toks) {
    var col = colorFor(a.category || "未分类");
    var isSearch = toks.length > 0;
    var ex = isSearch ? snippet(a, toks) : esc(excerptOf(a, 96)) + "…";
    return '<div class="note-card" data-action="open-article" data-id="' + esc(a.id) + '">' +
      '<div class="nc-top" style="background:linear-gradient(135deg,' + col[0] + "," + col[1] + ')"></div>' +
      '<div class="nc-body">' +
        '<div class="nc-head"><h3>' + markText(displayTitle(a), toks) + "</h3>" + nbBadge(a) + "</div>" +
        (ex ? '<p class="nc-ex">' + ex + "</p>" : "") +
        '<div class="nc-meta">' + esc(a.category || "未分类") + " · " + a.wordCount + " 字" +
        (isReview(a.id) ? ' · <span class="review-flag"><i class=ic data-ico=star></i></span>' : "") + "</div>" +
      "</div></div>";
  }
  /* 学科筛选胶囊行：选中态实底、超出横向滚动。
     侧栏「分类」栏撤掉后，这里是学科筛选的主入口（与首页分类卡并列）。
     走 nb-cat 而不是 open-category —— 后者会推 prevRoute 并清空搜索词，
     在一排胶囊里连点会把「返回」堆成一串，还会把正在搜的词清掉。 */
  function catPillsHTML() {
    var cats = getCategories();
    var total = allArticles().length;
    var h = '<div class="pill-row" role="group" aria-label="按学科筛选">' +
      '<button type="button" class="pill' + (route.category ? "" : " on") +
        '" data-action="nb-cat" data-cat="" aria-pressed="' + (route.category ? "false" : "true") + '">' +
        '全部<span class="pn">' + total + "</span></button>";
    cats.forEach(function (c) {
      var on = route.category === c.name;
      h += '<button type="button" class="pill' + (on ? " on" : "") +
        '" data-action="nb-cat" data-cat="' + esc(c.name) +
        '" aria-pressed="' + (on ? "true" : "false") + '">' +
        '<span class="cd" style="background:' + catColor(c.name) + '"></span>' +
        esc(c.name) + '<span class="pn">' + c.count + "</span></button>";
    });
    return h + "</div>";
  }

  function renderList() {
    var arts = sortArticles(filteredArticles());
    var title = query ? "搜索：" + esc(query)
      : route.tag ? "#" + esc(route.tag)
      : route.category ? esc(route.category)
      : "全部笔记";
    var titleIco = query ? "search2" : route.tag ? "link" : route.category ? catIco(route.category) : "doc";
    var toks = tokens(query);
    var items = arts.map(function (a) {
      return nbView === "grid" ? noteCardHTML(a, toks) : noteRowHTML(a, toks);
    }).join("");
    var empty = emptyHint(query ? "没有匹配「" + esc(query) + "」的笔记" : "这里还没有笔记");

    document.getElementById("app").innerHTML =
      pageHead(titleIco, title,
        arts.length + " 篇 · 共 " + arts.reduce(function (s, a) { return s + (a.wordCount || 0); }, 0) + " 字",
        "") +
      catPillsHTML() +
      (arts.length ? '<div class="nb-toolbar">' +
        '<div class="seg">' +
          '<button class="' + (nbView === "list" ? "on" : "") + '" data-action="nb-view" data-v="list">列表</button>' +
          '<button class="' + (nbView === "grid" ? "on" : "") + '" data-action="nb-view" data-v="grid">网格</button>' +
        "</div>" +
        '<div class="nb-right">' +
          '<select class="btn nb-sort" id="nbSort">' +
            '<option value="updated"' + (nbSort === "updated" ? " selected" : "") + ">最近更新</option>" +
            '<option value="title"' + (nbSort === "title" ? " selected" : "") + ">标题 A-Z</option>" +
            '<option value="words"' + (nbSort === "words" ? " selected" : "") + ">字数最多</option>" +
            '<option value="mastery"' + (nbSort === "mastery" ? " selected" : "") + ">掌握度最低</option>" +
          "</select>" +
          '<button class="btn sm" data-action="exp-all" title="导出全部笔记为 Markdown">导出全部</button>' +
          '<button class="btn sm" data-action="clear-all-notes" title="清空浏览器内的笔记">清空</button>' +
        "</div></div>" : "") +
      (nbView === "grid"
        ? '<div class="grid nb-grid">' + (items || empty) + "</div>"
        : '<div class="list">' + (items || empty) + "</div>");

    var sel = document.getElementById("nbSort");
    if (sel) sel.addEventListener("change", function () {
      nbSort = this.value;
      localStorage.setItem("lls_nbsort", nbSort);
      render();
    });
  }

  /* ---------- 沉浸条的分钟读数 ----------
     minOf(今天) 只在 flush 那一刻变，所以沉浸条里的数字本来是「进来的那一刻拍张快照」，
     一动不动。要它跳，只能每秒改那个 <span> 的 textContent ——
     **绝不能每秒 render()**：一次 render 会重绘整页、打断阅读、把正在选中的词清掉。 */
  var immTimer = 0;
  function bindImmersiveClock() {
    if (immTimer) { clearInterval(immTimer); immTimer = 0; }
    if (!immersive) return;
    var el = document.getElementById("immMin");
    if (!el) return;
    var tick = function () {
      var n = String(liveMinutes());
      if (el.textContent !== n) el.textContent = n;
    };
    immTimer = setInterval(tick, 1000);
    tick();
  }

  /* ---------- 文章 ---------- */
  function renderArticle() {
    var a = allArticles().filter(function (x) { return x.id === route.id; })[0];
    if (!a) { route.view = "home"; return render(); }
    var tags = (a.tags || []).map(function (t) {
      return '<span class="tag" data-action="search-tag" data-tag="' + esc(t) + '">#' + esc(t) + "</span>";
    }).join(" ");
    var m = masteryOf(a.id);
    var mBtns = MASTERY.map(function (lv) {
      return '<button class="btn ' + (m === lv.k ? "primary" : "") + '" data-action="set-mastery" data-id="' +
        esc(a.id) + '" data-lvl="' + lv.k + '">' + lv.name + "</button>";
    }).join("");
    document.getElementById("app").innerHTML =
      '<div class="breadcrumb"><a data-action="home">首页</a> / ' +
      '<a data-action="open-category" data-cat="' + esc(a.category || "未分类") + '">' + esc(a.category || "未分类") + "</a> / " +
      esc(a.title) + "</div>" +
      (immersive ? '<div class="imm-bar"><button class="btn" data-action="immersive"><i class=ic data-ico=expand></i> 退出沉浸（Esc）</button>' +
        '<span class="meta">专注中 · 今日已专注 <span id="immMin">' + liveMinutes() + '</span> 分钟</span></div>' : "") +
      '<div class="find-bar" id="findBar">' +
        '<span class="find-ico">' + ico("search2", 14) + "</span>" +
        '<input id="findInput" type="text" placeholder="在本文中查找…（Ctrl+F）">' +
        '<span class="find-count" id="findCount">0/0</span>' +
        '<button class="icon-btn find-prev" data-action="find-prev" title="上一个">' + ico("chevron", 14) + "</button>" +
        '<button class="icon-btn" data-action="find-next" title="下一个">' + ico("chevron", 14) + "</button>" +
        '<button class="icon-btn" data-action="find-close" title="关闭"><i class=ic data-ico=close></i></button>' +
      "</div>" +
      '<div class="tts-bar" id="ttsBar">' +
        '<span class="ni-ico">' + ico("volume", 14) + "</span>" +
        '<span class="tts-info" id="ttsInfo"></span>' +
        '<span class="tts-spacer"></span>' +
        '<button class="btn sm" data-action="tts-pause">暂停</button>' +
        '<button class="btn sm" data-action="tts-stop">停止</button>' +
        '<select class="btn sm" id="ttsRate" title="语速">' +
          '<option value="0.8">0.8x</option><option value="1" selected>1x</option>' +
          '<option value="1.2">1.2x</option><option value="1.5">1.5x</option>' +
        "</select>" +
      "</div>" +
      '<article class="article"><h1>' + esc(displayTitle(a)) + "</h1>" +
      '<div class="sub" style="color:var(--text-soft);font-size:13px;margin-bottom:8px">' +
        (fmtDate(a.date) ? fmtDate(a.date) + " · " : "") + a.wordCount + " 字" + (tags ? " · " + tags : "") + "</div>" +
      linkify(stripLeadingH1(a.html || "")) +
      '<div class="article-actions"><span class="act-label">掌握度</span>' + mBtns + "</div>" +
      '<div class="article-actions">' +
        '<button class="btn ' + (isReview(a.id) ? "primary" : "") + '" data-action="toggle-review" data-id="' + esc(a.id) + '">' +
          (isReview(a.id) ? "<i class=ic data-ico=star></i> 取消复习" : "<i class=ic data-ico=star></i> 加入复习") + "</button>" +
        '<button class="btn primary" data-action="dock-open" data-id="' + esc(a.id) + '"><i class=ic data-ico=chat></i> 边读边问</button>' +
        '<button class="btn" data-action="gen-cards" data-id="' + esc(a.id) + '"><i class=ic data-ico=cards></i> 生成闪卡</button>' +
        '<button class="btn" data-action="ai" data-id="' + esc(a.id) + '"><i class=ic data-ico=chat></i> AI 辅导</button>' +
        '<button class="btn" data-action="edit-note" data-id="' + esc(a.id) + '"><i class=ic data-ico=pen></i> 编辑</button>' +
        '<button class="btn" data-action="history" data-id="' + esc(a.id) + '"><i class=ic data-ico=clock></i> 历史' +
          (((versions[a.id] || []).length) ? "(" + (versions[a.id] || []).length + ")" : "") + "</button>" +
        '<button class="btn" data-action="immersive"><i class=ic data-ico=expand></i> 沉浸</button>' +
        '<button class="btn danger" data-action="delete-article" data-id="' + esc(a.id) + '"><i class=ic data-ico=trash></i> 删除</button>' +
        '<button class="btn" data-action="back"><i class=ic data-ico=arrowLeft></i> 返回</button></div>' +
      backlinksHTML(a) + artNavHTML(a) + "</article>";
    var fi = document.getElementById("findInput");
    if (fi) {
      fi.addEventListener("input", function () { runFind(this.value.trim()); });
      fi.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); findGo(e.shiftKey ? -1 : 1); }
        else if (e.key === "Escape") { e.preventDefault(); closeFind(); }
      });
    }
    var tr = document.getElementById("ttsRate");
    if (tr) tr.addEventListener("change", function () { ttsSetRate(this.value); });
    ttsSyncBtn();
    bindImmersiveClock();
  }
  /* 页面已有 h1，去掉正文开头重复的一级标题 */
  function stripLeadingH1(html) {
    return String(html || "").replace(/^\s*<h1[^>]*>[\s\S]*?<\/h1>\s*/, "");
  }
  /* 同分类的上一篇 / 下一篇 */
  function artNavHTML(a) {
    var cat = a.category || "未分类";
    var list = allArticles().filter(function (x) { return (x.category || "未分类") === cat; });
    var idx = -1;
    for (var i = 0; i < list.length; i++) if (list[i].id === a.id) idx = i;
    if (idx < 0 || list.length < 2) return "";
    var prev = idx > 0 ? list[idx - 1] : null;
    var next = idx < list.length - 1 ? list[idx + 1] : null;
    if (!prev && !next) return "";
    return '<div class="art-nav">' +
      (prev
        ? '<div class="an-item" data-action="open-article" data-id="' + esc(prev.id) + '">' +
          '<span class="an-dir">← 上一篇</span><strong>' + esc(prev.title) + "</strong></div>"
        : '<div class="an-item an-empty"></div>') +
      (next
        ? '<div class="an-item an-next" data-action="open-article" data-id="' + esc(next.id) + '">' +
          '<span class="an-dir">下一篇 →</span><strong>' + esc(next.title) + "</strong></div>"
        : '<div class="an-item an-empty"></div>') +
      "</div>";
  }

  /* ---------- 学习路径详情 ---------- */
  function renderPathDetail() {
    var p = findPath(route.pathId);
    if (!p) { route.view = "home"; return render(); }
    var pr = pathProgress(p), pct = pr.total ? Math.round((pr.done / pr.total) * 100) : 0;
    var mins = pathMinutes(p), ni = nextStepIdx(p);
    var steps = (p.steps || []).map(function (sid, i) {
      var a = findArticle(sid);
      if (!a) return "";
      var m = masteryOf(sid), done = isStepDone(p, sid);
      var col = catColor(a.category || "未分类");
      return '<div class="pstep' + (done ? " done" : "") + (i === ni ? " now" : "") + '">' +
        '<div class="pstep-no">' + (done ? ico("check", 15) : (i + 1)) + "</div>" +
        '<div class="pstep-body" data-action="open-article" data-id="' + esc(sid) + '">' +
          '<div class="pstep-head"><strong>' + esc(a.title) + "</strong>" +
            nbBadgeLvl(m) +
          "</div>" +
          '<div class="pstep-meta"><span class="pdot" style="background:' + col + '"></span>' +
            esc(a.category || "未分类") + " · " + a.wordCount + " 字" +
            (i === ni ? ' · <span class="pstep-now">进行中</span>' : "") + "</div>" +
        "</div>" +
        '<div class="pstep-ops">' +
          '<button class="btn sm' + (done ? " on" : "") + '" data-action="path-done" data-id="' + esc(p.id) +
            '" data-i="' + i + '" title="' + (done ? "取消完成" : "标记完成") + '">' + ico("check", 14) + "</button>" +
          (i > 0 ? '<button class="btn sm" data-action="path-up" data-id="' + esc(p.id) +
            '" data-i="' + i + '" title="上移">' + ico("arrowUp", 14) + "</button>" : "") +
          (i < p.steps.length - 1 ? '<button class="btn sm" data-action="path-down" data-id="' + esc(p.id) +
            '" data-i="' + i + '" title="下移">' + ico("arrowDown", 14) + "</button>" : "") +
          '<button class="btn sm danger" data-action="path-remove" data-id="' + esc(p.id) +
            '" data-i="' + i + '" title="移出路径">' + ico("close", 14) + "</button>" +
        "</div></div>";
    }).join("");
    var opts = allArticles().filter(function (a) { return p.steps.indexOf(a.id) < 0; })
      .map(function (a) { return '<option value="' + esc(a.id) + '">' + esc(a.title) + "</option>"; }).join("");
    var nextA = ni >= 0 ? findArticle(p.steps[ni]) : null;

    document.getElementById("app").innerHTML =
      '<div class="breadcrumb"><a data-action="home">首页</a> / <i class=ic data-ico=map></i> 学习路径</div>' +
      '<div class="path-hero">' +
        '<div class="ph-main">' +
          '<h1><i class=ic data-ico=map data-sz=22></i>' + esc(p.title) + "</h1>" +
          (p.desc
            ? '<p class="ph-desc">' + esc(p.desc) + "</p>"
            : '<p class="ph-desc ph-empty">还没有描述，点右侧「编辑」补充这条路径的目标</p>') +
          '<div class="ph-stats">' +
            '<span>' + ico("doc", 13) + " " + pr.total + " 个步骤</span>" +
            '<span>' + ico("check", 13) + " 已完成 " + pr.done + "</span>" +
            '<span>' + ico("clock", 13) + " 约 " + mins + " 分钟</span>" +
          "</div>" +
        "</div>" +
        '<div class="ph-side">' +
          '<div class="ph-ring" style="--pct:' + pct + '">' +
            '<div class="ph-ring-in"><span class="ph-num">' + pct + '%</span><span class="ph-cap">完成度</span></div>' +
          "</div>" +
          '<div class="ph-btns">' +
            '<button class="btn sm" data-action="path-edit" data-id="' + esc(p.id) + '">' + ico("pen", 14) + " 编辑</button>" +
            '<button class="btn sm danger" data-action="path-del" data-id="' + esc(p.id) + '">' + ico("trash", 14) + " 删除</button>" +
          "</div>" +
        "</div>" +
      "</div>" +
      (nextA
        ? '<div class="path-cta" data-action="open-article" data-id="' + esc(p.steps[ni]) + '">' +
            '<span class="pcta-ico">' + ico("expand", 18) + "</span>" +
            '<div class="pcta-tx"><strong>继续学习 · 第 ' + (ni + 1) + " 步</strong>" +
              "<span>" + esc(nextA.title) + "</span></div>" +
            '<span class="pcta-go">' + ico("chevron", 16) + "</span></div>"
        : (pr.total
            ? '<div class="path-cta all-done"><span class="pcta-ico">' + ico("check", 18) + "</span>" +
              '<div class="pcta-tx"><strong>这条路径已全部完成</strong>' +
              "<span>恭喜！可以复习巩固，或继续添加新步骤</span></div></div>"
            : "")) +
      '<div class="section-title" style="margin-top:22px"><h2><i class=ic data-ico=doc></i> 学习步骤</h2>' +
        '<span class="badge">' + pr.done + " / " + pr.total + "</span></div>" +
      '<div class="path-steps">' + (steps || emptyHint("这条路径还没有步骤，从下面添加笔记")) + "</div>" +
      '<div class="path-add">' +
        '<span class="pa-label">' + ico("plus", 14) + " 添加步骤</span>" +
        '<select id="pathPick" class="btn">' + (opts || '<option value="">（没有可添加的笔记）</option>') + "</select>" +
        '<button class="btn primary" data-action="path-add" data-id="' + esc(p.id) + '">加入路径</button>' +
      "</div>";
  }

  /* ---------- 编辑器 ---------- */
  var edPreviewOn = true;
  function renderEditor() {
    var a = route.id ? findArticle(route.id) : null;
    var dkey = route.id || "new";
    var draft = drafts[dkey];
    var src = draft !== undefined ? draft : (a ? (a.md || "") : "");
    var catsList = getCategories().map(function (c) { return '<option value="' + esc(c.name) + '">'; }).join("");
    var tmplOpts = '<option value="">插入模板…</option>' + Object.keys(TEMPLATES).map(function (k) {
      return '<option value="' + esc(k) + '">' + esc(k) + "</option>";
    }).join("");
    var tools = [["**", "**", "B"], ["*", "*", "I"], ["## ", "", "H2"], ["- ", "", "列表"],
      ["1. ", "", "编号"], ["`", "`", "代码"], ["```\n", "\n```", "代码块"],
      ["[[", "]]", "双链"], ["> ", "", "引用"]].map(function (t) {
      return '<button class="btn" data-action="ed-ins" data-b="' + esc(t[0]) + '" data-a="' + esc(t[1]) + '">' + t[2] + "</button>";
    }).join("");

    document.getElementById("app").innerHTML =
      '<div class="ed-head">' +
        '<input id="edTitle" class="ed-title" placeholder="给这篇笔记起个标题…" value="' + esc(a ? a.title : "") + '">' +
        '<div class="ed-head-actions">' +
          '<button class="btn" data-action="back">取消</button>' +
          '<button class="btn primary" data-action="save-note">保存</button>' +
        "</div>" +
      "</div>" +
      (draft !== undefined ? '<div class="ed-draft">已恢复上次未保存的草稿</div>' : "") +
      '<div class="ed-meta">' +
        '<input id="edCat" class="ed-input" list="catList" placeholder="分类" value="' + esc(a ? (a.category || "") : "") + '">' +
        '<datalist id="catList">' + catsList + "</datalist>" +
        '<input id="edTags" class="ed-input" placeholder="标签（逗号分隔）" value="' + esc(a ? (a.tags || []).join(", ") : "") + '">' +
        '<span class="ed-count" id="edCount"></span>' +
      "</div>" +
      '<div class="ed-tools">' +
        '<div class="ed-format">' + tools + "</div>" +
        '<select id="edTmpl" class="btn">' + tmplOpts + "</select>" +
        '<button class="btn" data-action="voice" title="语音输入（Chrome / Edge）">' + ico("mic", 14) + " 语音</button>" +
        '<button class="btn primary" data-action="toggle-preview">预览</button>' +
      "</div>" +
      '<div class="ed-split" id="edSplit">' +
        '<textarea id="edMd" class="ed-md" placeholder="用 Markdown 书写。公式用 $行内$ 或 $$独立成行$$；用 [[笔记标题]] 建立双向链接。">' + esc(src) + "</textarea>" +
        '<div id="edPreview" class="ed-prev article"></div>' +
      "</div>";

    var ta = document.getElementById("edMd");
    var pv = document.getElementById("edPreview");
    var cnt = document.getElementById("edCount");
    function sync() {
      drafts[dkey] = ta.value;
      saveDrafts();
      pv.innerHTML = linkify(jsMdToHtml(ta.value)) || '<div class="ed-empty">预览会实时显示在这里</div>';
      decorate();
      if (cnt) cnt.textContent = ta.value.replace(/\s/g, "").length + " 字";
    }
    ta.addEventListener("input", sync);
    sync();
    applyEdLayout();

    var tp = document.getElementById("edTmpl");
    if (tp) tp.addEventListener("change", function () {
      var t = TEMPLATES[this.value];
      if (t) {
        ta.value = ta.value ? ta.value + "\n\n" + t : t;
        sync();
        ta.focus();
      }
      this.value = "";
    });
  }
  function applyEdLayout() {
    var sp = document.getElementById("edSplit");
    if (!sp) return;
    var wide = window.innerWidth > 1100;
    if (wide) {
      sp.classList.toggle("hide-prev", !edPreviewOn);
      sp.classList.remove("show-prev");
    } else {
      sp.classList.toggle("show-prev", edPreviewOn);
      sp.classList.remove("hide-prev");
    }
    var b = document.querySelector('[data-action="toggle-preview"]');
    if (b) b.classList.toggle("primary", !wide || edPreviewOn);
  }

  function wrapSel(ta, before, after) {
    var s = ta.selectionStart, e = ta.selectionEnd, v = ta.value;
    ta.value = v.slice(0, s) + before + v.slice(s, e) + after + v.slice(e);
    ta.selectionStart = s + before.length;
    ta.selectionEnd = e + before.length;
    ta.focus();
    ta.dispatchEvent(new Event("input"));
  }

  /* ---------- 复习 ---------- */
  /* ---------- 复习看板（掌握度四档）----------
     MASTERY 正好四档，「待办 → 进行中 → 审阅中 → 已完成」这套看板
     在知识库里的自然映射就是：未接触 → 熟悉 → 掌握 → 精通。
     拖拽改档复用 setMastery() —— 所以事件日志与首页时间线会自动跟着记一笔。
     可访问性：HTML5 拖拽键盘不可用，所以每张卡右上角另给一个"推进到下一档"按钮。 */
  var boardCat = null;   /* null = 全部学科 */
  var BOARD_NEXT_ICO = "arrowLeft";
  function renderBoard() {
    var every = allArticles();
    var arts = every.filter(function (a) { return !boardCat || a.category === boardCat; });
    var cats = getCategories();
    var byLvl = [[], [], [], []];
    arts.forEach(function (a) {
      byLvl[Math.max(0, Math.min(3, masteryOf(a.id)))].push(a);
    });

    var chips = '<button' + (boardCat ? "" : ' class="on"') + ' data-action="board-cat" data-cat="">' +
        '全部<em>' + every.length + "</em></button>" +
      cats.map(function (c) {
        return '<button' + (boardCat === c.name ? ' class="on"' : "") + ' data-action="board-cat" data-cat="' +
          esc(c.name) + '">' + esc(c.name) + "<em>" + c.count + "</em></button>";
      }).join("");

    var cols = MASTERY.map(function (m, lvl) {
      var list = byLvl[lvl];
      var cards = list.map(function (a) {
        var nxt = Math.min(3, lvl + 1);
        return '<div class="kb-card" draggable="true" data-id="' + esc(a.id) + '">' +
          '<span class="kb-t">' + esc(displayTitle(a)) + "</span>" +
          '<span class="kb-meta">' + esc(a.category || "未分类") + "</span>" +
          (lvl < 3
            ? '<button class="kb-up" data-action="board-up" data-id="' + esc(a.id) + '" data-lvl="' + nxt +
              '" title="推进到「' + MASTERY[nxt].name + '」" aria-label="推进到' + MASTERY[nxt].name + '">' +
              ico(BOARD_NEXT_ICO, 11) + "</button>"
            : "") + "</div>";
      }).join("");
      return '<section class="kb-col" data-drop="' + lvl + '">' +
        '<header class="kb-hd"><i class="kb-dot" style="background:' + m.c + '"></i>' +
          '<span class="kb-hn">' + esc(m.name) + '</span><span class="kb-hc">' + list.length + "</span></header>" +
        '<div class="kb-body' + (list.length ? "" : " empty") + '">' +
          (cards || '<div class="kb-empty">拖到这里</div>') + "</div></section>";
    }).join("");

    document.getElementById("app").innerHTML =
      '<div class="breadcrumb"><a data-action="home">首页</a> / <i class=ic data-ico=board></i> 复习看板</div>' +
      pageHead("board", "复习看板", "拖动卡片改掌握度，也可用卡片右上角箭头", "") +
      '<div class="kb-filter">' + chips + "</div>" +
      '<div class="kb-board">' + cols + "</div>";
    bindBoardDnD();
  }
  /* 拖拽改档。dragover 必须 preventDefault —— 否则浏览器不认这是可放置区，drop 不会触发 */
  function bindBoardDnD() {
    var board = document.querySelector(".kb-board");
    if (!board) return;
    var dragging = null;
    var closest = function (t, sel) { return t && t.closest ? t.closest(sel) : null; };
    var clearOver = function () {
      Array.prototype.forEach.call(board.querySelectorAll(".kb-col"), function (c) { c.classList.remove("over"); });
    };
    board.addEventListener("dragstart", function (e) {
      var card = closest(e.target, ".kb-card");
      if (!card) return;
      dragging = card.getAttribute("data-id");
      card.classList.add("dragging");
      try { e.dataTransfer.setData("text/plain", dragging); e.dataTransfer.effectAllowed = "move"; } catch (x) {}
    });
    board.addEventListener("dragend", function (e) {
      var card = closest(e.target, ".kb-card");
      if (card) card.classList.remove("dragging");
      clearOver(); dragging = null;
    });
    board.addEventListener("dragover", function (e) {
      var col = closest(e.target, ".kb-col");
      if (!col || !dragging) return;
      e.preventDefault();
      try { e.dataTransfer.dropEffect = "move"; } catch (x) {}
      clearOver(); col.classList.add("over");
    });
    board.addEventListener("drop", function (e) {
      var col = closest(e.target, ".kb-col");
      if (!col) return;
      e.preventDefault();
      var id = dragging;
      try { id = e.dataTransfer.getData("text/plain") || id; } catch (x) {}
      moveToLevel(id, Number(col.getAttribute("data-drop")));
    });
  }
  function moveToLevel(id, lvl) {
    if (!id || !(lvl >= 0 && lvl <= 3)) return;
    var a = findArticle(id);
    if (!a || masteryOf(id) === lvl) return;
    setMastery(id, lvl);          /* 内部已 logEvent，首页时间线自动记一笔 */
    render();
    toast("《" + displayTitle(a) + "》→ " + MASTERY[lvl].name);
  }

  function renderReview() {
    var due = dueCards();
    if (session.list.length !== due.length || !session.list.length) {
      session.list = due.slice(); session.idx = 0; session.revealed = false;
    }
    if (session.idx >= session.list.length) session.idx = Math.max(0, session.list.length - 1);
    var body;
    if (!session.list.length) {
      var next = cards.map(function (c) { return c.due; }).sort(function (x, y) { return x - y; })[0];
      body = '<div class="empty"><i class=ic data-ico=check></i> 今日复习已完成<br><span class="meta">' +
        (next ? "下一张到期：" + fmtDue(next) : "还没有闪卡，去笔记页点「<i class=ic data-ico=cards></i> 生成闪卡」") + "</span></div>";
    } else {
      var c = session.list[session.idx];
      body = '<div class="fc-wrap"><div class="fc-top">第 ' + (session.idx + 1) + " / " + session.list.length +
        " 张 · 当前间隔 " + (INTERVALS[c.box] >= 24 * 3600 * 1000 ? Math.round(INTERVALS[c.box] / (24 * 3600 * 1000)) + " 天" : "10 分钟") + "</div>" +
        '<div class="fc-q">' + esc(c.q) + "</div>" +
        (session.revealed
          ? '<div class="fc-a">' + esc(c.a) + '</div><div class="fc-grades">' +
            '<button class="btn danger" data-action="grade" data-id="' + c.id + '" data-grade="again">忘了</button>' +
            '<button class="btn" data-action="grade" data-id="' + c.id + '" data-grade="hard">模糊</button>' +
            '<button class="btn primary" data-action="grade" data-id="' + c.id + '" data-grade="good">会了</button></div>'
          : '<button class="btn primary" data-action="reveal">显示答案</button>') + "</div>";
    }
    var revNotes = allArticles().filter(function (a) { return isReview(a.id); });
    var noteH = revNotes.map(function (a) {
      return '<div class="item" data-action="open-article" data-id="' + esc(a.id) + '">' +
        '<div class="check"><i class=ic data-ico=star></i></div><div class="info"><h3>' + esc(a.title) + '</h3>' +
        '<div class="sub"><span class="badge">' + esc(a.category || "未分类") + "</span></div></div></div>";
    }).join("");
    document.getElementById("app").innerHTML =
      (misDue().length ? '<div class="rev-misbar">' + ico("warn", 14) + " 另有 <b>" + misDue().length +
        '</b> 道错题到期未复习　<button class="btn sm" data-action="mistakes">去错题集</button></div>' : "") +
      '<div class="breadcrumb"><a data-action="home">首页</a> / <i class=ic data-ico=refresh></i> 今日复习</div>' +
      pageHead("refresh", "今日复习", "到期的按间隔重复排到了今天，过一遍再往后推",
        '<span class="badge">' + session.list.length + " 张到期</span>") + body +
      '<div class="section-title"><h2><i class=ic data-ico=star></i> 标记为复习的笔记</h2><span class="badge">' + revNotes.length + " 篇</span></div>" +
      '<div class="list">' + (noteH || emptyHint("还没有标记为复习的笔记")) + "</div>";
  }

  /* ---------- 闪卡库 ---------- */
  function renderCards() {
    var rows = cards.slice().sort(function (a, b) { return (a.due || 0) - (b.due || 0); }).map(function (c) {
      return '<div class="set-row"><div class="info"><strong>' + esc(c.q.slice(0, 40)) + (c.q.length > 40 ? "…" : "") + "</strong>" +
        '<div class="meta">' + fmtDue(c.due || 0) + " · 第 " + ((c.box || 0) + 1) + " 档</div></div>" +
        '<button class="btn danger" data-action="del-card" data-id="' + c.id + '"><i class=ic data-ico=trash></i></button></div>';
    }).join("");
    document.getElementById("app").innerHTML =
      '<div class="breadcrumb"><a data-action="home">首页</a> / <i class=ic data-ico=cards></i> 闪卡库</div>' +
      pageHead("cards", "闪卡库", "正面写问题背面写答案，按间隔重复自动排队",
        '<span class="badge">' + cards.length + " 张</span>") +
      '<div class="settings"><div class="set-card"><h3><i class=ic data-ico=plus></i> 新建闪卡</h3>' +
        '<textarea id="cardQ" class="wb-notes" style="height:70px" placeholder="正面：问题"></textarea>' +
        '<textarea id="cardA" class="wb-notes" style="height:90px;margin-top:8px" placeholder="背面：答案"></textarea>' +
        '<div style="margin-top:10px"><button class="btn primary" data-action="add-card">添加闪卡</button></div></div>' +
        '<div class="set-card"><h3><i class=ic data-ico=board></i> 全部闪卡</h3>' +
        (rows || emptyHint("还没有闪卡。打开任意笔记，点「<i class=ic data-ico=cards></i> 生成闪卡」自动从标题生成")) + "</div></div>";
  }

  /* ---------- AI 辅导 ---------- */
  function aiCallEx(messages, temperature) {
    if (!aiCfg.key) return Promise.reject(new Error("先在「AI 接口配置」里填好 API Key"));
    var url = String(aiCfg.base || "").replace(/\/+$/, "") + "/chat/completions";
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + aiCfg.key },
      body: JSON.stringify({ model: aiCfg.model, messages: messages, temperature: temperature === undefined ? 0.3 : temperature })
    }).then(function (r) {
      if (!r.ok) return r.text().then(function (t) { throw new Error("HTTP " + r.status + " " + String(t).slice(0, 200)); });
      return r.json();
    }).then(function (j) {
      var c = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
      if (!c) throw new Error("返回格式异常：" + JSON.stringify(j).slice(0, 200));
      return c;
    });
  }
  function aiCall(prompt, system) {
    var msgs = [];
    if (system) msgs.push({ role: "system", content: system });
    msgs.push({ role: "user", content: prompt });
    return aiCallEx(msgs, 0.3);
  }
  function aiSend(shownText, promptText) {
    if (aiBusy) return;                     /* 已有请求在飞：忽略重复发送 */
    aiBusy = true;
    aiMsgs.push({ role: "user", content: shownText });
    aiMsgs.push({ role: "assistant", content: "…思考中" });
    aiDraft = "";
    render();
    aiCall(promptText || shownText, roleById(aiRole).sys + CITE_RULE).then(function (reply) {
      aiMsgs[aiMsgs.length - 1] = { role: "assistant", content: reply };
      aiBusy = false;
      render();
    }).catch(function (err) {
      var m = (err && err.message) ? err.message : String(err);
      if (m.indexOf("Failed to fetch") >= 0 || m.indexOf("NetworkError") >= 0) {
        m = "请求失败：可能是没联网，或该接口不允许浏览器直接调用（跨域 CORS）。可换用支持 CORS 的接口，或让我加一个本地代理脚本。";
      }
      aiMsgs[aiMsgs.length - 1] = { role: "assistant", content: "出错了：" + m };
      aiBusy = false;
      render();
    });
  }
  /* 全局上下文：把双向链接、反向链接、同分类的相关笔记一起交给 AI，
     让它“看得见全局”，回答与整个知识体系一致（借鉴镜界写作的活地图思路） */
  function aiGlobalContext(a) {
    var rel = {};
    function add(x) { if (x && x.id !== a.id) rel[x.id] = x; }
    var re = /\[\[([^\]]+)\]\]/g, m;
    var src = a.md || a.html || "";
    while ((m = re.exec(src))) { var t = articleByTitle(m[1].trim()); if (t) add(t); }
    allArticles().forEach(function (o) {
      if (o.id === a.id) return;
      if (((o.md || "") + (o.html || "")).indexOf("[[" + a.title + "]]") >= 0) add(o);
      if (o.category && o.category === a.category) add(o);
    });
    var list = Object.keys(rel).map(function (k) { return rel[k]; }).slice(0, 6);
    if (!list.length) return { text: "", names: [] };
    var text = "【相关知识地图】下面是该学生知识库中的相关笔记，供参考，使回答与他的整体知识体系保持一致：\n";
    list.forEach(function (x) {
      var body = String(x.md || x.html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 200);
      text += "- 《" + x.title + "》[" + (x.category || "未分类") + "，掌握度：" +
        MASTERY[masteryOf(x.id)].name + "]：" + body + "\n";
    });
    return { text: text, names: list.map(function (x) { return x.title; }) };
  }
  function aiNotePrompt(instruction) {
    var a = route.id ? findArticle(route.id) : null;
    if (!a) { aiCtxNames = []; return instruction; }
    var s = "下面是我的笔记《" + a.title + "》的内容：\n\n" +
      String(a.md || a.html || "").replace(/<[^>]+>/g, " ").slice(0, 6000);
    if (aiCtxOn) {
      var ctx = aiGlobalContext(a);
      aiCtxNames = ctx.names;
      if (ctx.text) s += "\n\n" + ctx.text;
    } else aiCtxNames = [];
    return s + "\n\n" + instruction;
  }
  function parseQAPairs(text) {
    var out = [];
    String(text).split(/\n-{3,}\n/).forEach(function (b) {
      var qm = b.match(/Q[:：]\s*([\s\S]*?)(?=\n\s*A[:：]|$)/);
      var am = b.match(/A[:：]\s*([\s\S]*)/);
      if (qm && am && qm[1].trim() && am[1].trim()) out.push({ q: qm[1].trim(), a: am[1].trim() });
    });
    return out;
  }
  function renderAI() {
    var a = route.id ? findArticle(route.id) : null;
    var roleChips = ROLES.map(function (r) {
      return '<span class="role-chip' + (r.id === aiRole ? " on" : "") + '" data-action="ai-role" data-id="' +
        esc(r.id) + '" title="' + esc(r.desc) + '">' + ico(r.ico, 14) + esc(r.name) + "</span>";
    }).join("");
    var modelOpts = "", seenM = {};
    aiModels.forEach(function (m) {
      if (!seenM[m.model]) { seenM[m.model] = 1; modelOpts += '<option value="' + esc(m.model) + '">' + esc(m.name || m.model) + "</option>"; }
    });
    if (!seenM[aiCfg.model]) modelOpts = '<option value="' + esc(aiCfg.model) + '">' + esc(aiCfg.model) + "</option>" + modelOpts;
    var msgs = aiMsgs.map(function (m, i) {
      var body = m.role === "user" ? esc(m.content) : citeify(linkify(jsMdToHtml(m.content)));
      var extra = (m.role === "assistant" && parseQAPairs(m.content).length)
        ? '<button class="btn" data-action="ai-import-cards" data-idx="' + i + '"><i class=ic data-ico=plus></i> 导入为闪卡</button>' : "";
      return '<div class="ai-msg ' + m.role + '"><div class="ai-bubble">' + body + "</div>" + extra + "</div>";
    }).join("");
    document.getElementById("app").innerHTML =
      '<div class="breadcrumb"><a data-action="home">首页</a> / <i class=ic data-ico=chat></i> AI 辅导</div>' +
      pageHead("chat", "AI 辅导", "苏格拉底式追问，引导你自己把答案推出来",
        '<span class="badge">' + (aiCfg.key ? esc(aiCfg.model) : "未配置密钥") + "</span>") +
      '<div class="ai-wrap">' +
        '<div class="ai-roles">' + roleChips + "</div>" +
        '<div class="ai-cfgbar">' +
          '<select id="aiModelPick" class="btn">' + modelOpts + "</select>" +
          '<button class="btn sm" data-action="aiconfig" title="接口 / 密钥 / 模型库"><i class=ic data-ico=key></i> 管理模型</button>' +
          '<label class="ctx-toggle"><input type="checkbox" id="aiCtxBox"' + (aiCtxOn ? " checked" : "") + "> <i class=ic data-ico=globe></i> 附带相关知识（跨笔记全局上下文）</label>" +
          (aiCtxNames.length ? '<span class="meta">已附带 ' + aiCtxNames.length + " 篇：" + esc(aiCtxNames.join("、")) + "</span>" : "") +
        "</div>" +
        (a ? '<div class="ai-ctx"><i class=ic data-ico=book></i> 当前笔记：<strong>' + esc(a.title) + "</strong></div>"
           : '<div class="ai-ctx">没有指定笔记，可自由提问（打开任意笔记点「<i class=ic data-ico=chat></i> AI 辅导」可针对该笔记提问）</div>') +
        (a ? '<div class="ai-quick"><button class="btn" data-action="ai-sum"><i class=ic data-ico=board></i> 总结要点</button>' +
          '<button class="btn" data-action="ai-quiz"><i class=ic data-ico=think></i> 出题考我</button>' +
          '<button class="btn" data-action="ai-cards"><i class=ic data-ico=cards></i> AI 生成闪卡</button>' +
          '<button class="btn" data-action="ai-hard"><i class=ic data-ico=bulb></i> 解释难点</button></div>' : "") +
        '<div class="ai-log" id="aiLog">' + (msgs || emptyHint("选一个快捷操作，或直接在下面提问")) + "</div>" +
        '<div class="ai-input-row"><textarea id="aiInput" class="ai-input" placeholder="向 AI 提问…（Enter 发送，Shift+Enter 换行）"></textarea>' +
        /* 发送按钮：请求在飞时挂 is-loading / aria-busy，
           CSS 的 ::after 转圈 + 文字变淡（文字要包一层才会被 > * 选中）。
           输入框不锁 —— 等待期间用户还能接着打字。 */
        '<div class="ai-send-col"><button class="btn primary' + (aiBusy ? " is-loading" : "") +
          '" data-action="ai-send"' + (aiBusy ? ' aria-busy="true"' : "") + '><span>发送</span></button>' +
        '<button class="btn" data-action="ai-clear">清空</button></div></div></div>';
    var mp = document.getElementById("aiModelPick");
    if (mp) {
      mp.value = aiCfg.model;
      mp.addEventListener("change", function () { aiCfg.model = this.value; aiSave(); toast("已切换模型：" + this.value); });
    }
    var cb = document.getElementById("aiCtxBox");
    if (cb) cb.addEventListener("change", function () { aiCtxOn = this.checked; render(); });
    var inp = document.getElementById("aiInput");
    if (inp) {
      inp.value = aiDraft;
      inp.addEventListener("input", function () { aiDraft = this.value; });
      inp.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          var q = (this.value || "").trim();
          if (q) aiSend(q, route.id ? aiNotePrompt(q) : q);
        }
      });
      var log = document.getElementById("aiLog");
      if (log) log.scrollTop = log.scrollHeight;
    }
  }

  /* ---------- AI 学习助手（边读边问的侧边窗） ---------- */
  var STORE_DOCK = "lls_dock";
  var dock = loadJSON(STORE_DOCK, { open: false, msgs: [], noteId: null });
  if (!dock.msgs || !dock.msgs.length) dock.msgs = dock.msgs || [];
  var dockDraft = "", dockBusy = false, dockSel = "";
  function saveDock() {
    localStorage.setItem(STORE_DOCK, JSON.stringify({
      open: !!dock.open,
      msgs: (dock.msgs || []).slice(-40),
      noteId: dock.noteId || null
    }));
  }
  function dockNote() { return route.id ? findArticle(route.id) : null; }
  function dockShort(t) { return String(t || "").replace(/^[^·]*·\s*/, ""); }
  function dockPlaceholder() {
    var a = dockNote();
    if (dockBusy) return "AI 正在思考…";
    return a ? "就《" + dockShort(a.title) + "》提问…" : "问点什么…（Enter 发送）";
  }

  var DOCK_QUICK = [
    { a: "dock-explain", ico: "bulb", label: "解释这段",
      ins: "请把「我刚选中的段落」（若没有选中，就以这篇笔记的核心内容为准）讲清楚：先说结论，再分层解释，最后点出它在整体知识里的位置。" },
    { a: "dock-eg", ico: "puzzle", label: "举个例子",
      ins: "请针对这部分内容举 1-2 个具体例子（尽量带数值或生活场景），并说明例子的哪一部分对应哪个概念。" },
    { a: "dock-deeper", ico: "search2", label: "讲深一点",
      ins: "请在当前内容的基础上再深入一层：补充背后的原理、成立条件、常见推论和边界情况。" },
    { a: "dock-simple", ico: "mask", label: "讲浅一点",
      ins: "请用最朴素的话重讲一遍，假设我完全没有基础：尽量不用术语，必要时用类比，并指出这个类比的边界。" },
    { a: "dock-exam", ico: "board", label: "考点是什么",
      ins: "请指出这部分内容在考试里最可能怎么考：常见题型、必须记住的公式或结论、以及最容易失分的地方。" },
    { a: "dock-quiz", ico: "think", label: "出题检查我",
      ins: "请就这部分内容出 3 道题检查我是否真的理解（2 道简答 + 1 道选择），先只给题目和选项，不要给答案。" }
  ];
  function dockQuickByAct(a) {
    for (var i = 0; i < DOCK_QUICK.length; i++) if (DOCK_QUICK[i].a === a) return DOCK_QUICK[i];
    return null;
  }

  /* 拼装送给 AI 的上下文：当前笔记全文 + （可选）相关知识 + 选中段落 */
  function dockContext() {
    var a = dockNote(), s = "";
    if (a) {
      s = "下面是我正在阅读的笔记《" + a.title + "》（分类：" + (a.category || "未分类") + "）：\n\n" +
        String(a.md || a.html || "").replace(/<[^>]+>/g, " ").slice(0, 6000);
      if (aiCtxOn) {
        var ctx = aiGlobalContext(a);
        if (ctx && ctx.text) s += "\n\n" + ctx.text;
      }
    }
    if (dockSel) s += "\n\n【我刚选中的段落】\n" + dockSel.slice(0, 1500) + "\n【选中段落结束】";
    return s;
  }

  function dockRolesHTML() {
    return ROLES.map(function (r) {
      return '<span class="role-chip' + (r.id === aiRole ? " on" : "") + '" data-action="dock-role" data-id="' +
        esc(r.id) + '" title="' + esc(r.desc) + '">' + ico(r.ico, 13) + esc(r.name) + "</span>";
    }).join("");
  }
  function dockQuickHTML() {
    return DOCK_QUICK.map(function (q) {
      return '<button type="button" class="dquick" data-action="' + q.a + '">' + ico(q.ico, 13) + esc(q.label) + "</button>";
    }).join("");
  }
  function dockCtxHTML() {
    var a = dockNote();
    var h = a
      ? '<span class="dc-main">' + ico("book", 12) + " 已带入《" + esc(dockShort(a.title)) + "》" + "</span>"
      : '<span class="dc-main off">' + ico("book", 12) + " 未打开笔记，可自由提问</span>";
    if (dockSel) {
      h += '<span class="dc-sel">' + ico("doc", 12) + " 选中 " + dockSel.length + " 字" +
        '<button type="button" class="link-btn" data-action="dock-clearsel">移除</button></span>';
    }
    return h;
  }
  function dockLogHTML() {
    if (!dock.msgs.length) {
      var a = dockNote();
      return '<div class="dock-welcome">' +
        '<div class="dw-ico">' + ico("chat", 22) + "</div>" +
        "<h4>边读边问</h4>" +
        "<p>" + (a ? "我正在读《" + esc(dockShort(a.title)) + "》，读到哪里不懂就问我。" : "打开任意笔记，读到哪里不懂就问。") + "</p>" +
        '<div class="dw-tips">' +
          "<span>选中正文任意一段，会浮出「问 AI」按钮</span>" +
          "<span>Enter 发送 · Shift+Enter 换行</span>" +
          "<span>Alt + A 随时开关这个侧边窗</span>" +
        "</div>" +
        (aiCfg.key ? "" : '<div class="dw-warn">' + ico("warn", 13) + " 还没配置 API Key，去「AI 接口配置」填一下</div>") +
        "</div>";
    }
    return dock.msgs.map(function (m, i) {
      var pending = m.role === "assistant" && String(m.content).indexOf("…思考中") === 0;
      var body = pending ? '<span class="dots"><i></i><i></i><i></i></span> 思考中'
        : (m.role === "user" ? esc(m.content) : citeify(linkify(jsMdToHtml(m.content))));
      var extra = (m.role === "assistant" && !pending && parseQAPairs(m.content).length)
        ? '<button type="button" class="btn sm" data-action="dock-cards" data-idx="' + i + '">' +
          ico("plus", 12) + " 导入为闪卡</button>" : "";
      return '<div class="ai-msg ' + m.role + (pending ? " pending" : "") + '">' +
        '<div class="ai-bubble">' + body + "</div>" + extra + "</div>";
    }).join("");
  }

  function renderDockLog() {
    var el = document.getElementById("dockLog");
    if (!el) return;
    el.innerHTML = dockLogHTML();
    try { el.scrollTop = el.scrollHeight; } catch (e) {}
  }
  function renderDockCtx() {
    var el = document.getElementById("dockCtx");
    if (el) el.innerHTML = dockCtxHTML();
  }
  function setDockBusy(b) {
    dockBusy = !!b;
    var btn = document.getElementById("dockSend");
    if (btn) {
      btn.disabled = dockBusy;
      btn.innerHTML = dockBusy ? '<span class="dots"><i></i><i></i><i></i></span>' : ico("arrowUp", 13) + " 发送";
    }
    var inp = document.getElementById("dockInput");
    if (inp) inp.placeholder = dockPlaceholder();
  }
  function focusDockInput() {
    var inp = document.getElementById("dockInput");
    if (!inp) return;
    try { inp.focus(); } catch (e) {}
  }
  function dockOpen(on) {
    dock.open = !!on;
    saveDock();
    document.body.classList.toggle("dock-open", dock.open);
    var btn = document.getElementById("dockBtn");
    if (btn) btn.classList.toggle("on", dock.open);
    renderDock();
    if (dock.open) focusDockInput();
  }

  function renderDock() {
    var el = document.getElementById("aiDock");
    if (!el) return;
    document.body.classList.toggle("dock-open", !!dock.open);
    var tb = document.getElementById("dockBtn");
    if (tb) tb.classList.toggle("on", !!dock.open);
    if (!dock.open && !el.innerHTML) return;

    var hadFocus = !!(document.activeElement && document.activeElement.id === "dockInput");
    el.innerHTML =
      '<div class="dock-head">' +
        '<span class="dh-title">' + ico("chat", 15) + " AI 学习助手</span>" +
        '<span class="dh-hint">Alt + A</span>' +
        '<button type="button" class="icon-btn" data-action="dock-close" title="收起侧边窗">' + ico("close", 15) + "</button>" +
      "</div>" +
      '<div class="dock-roles">' + dockRolesHTML() + "</div>" +
      '<div class="dock-ctx" id="dockCtx">' + dockCtxHTML() + "</div>" +
      '<div class="dock-quick">' + dockQuickHTML() + "</div>" +
      '<div class="dock-log ai-log" id="dockLog">' + dockLogHTML() + "</div>" +
      '<div class="dock-foot">' +
        '<textarea id="dockInput" class="ai-input" rows="2" placeholder="' + esc(dockPlaceholder()) + '"></textarea>' +
        '<div class="foot-btns">' +
          '<button type="button" class="btn primary sm" id="dockSend" data-action="dock-send" title="发送（Enter）">' +
            ico("arrowUp", 13) + " 发送</button>" +
          '<button type="button" class="btn sm" data-action="dock-clear" title="清空这段对话">' + ico("trash", 13) + " 清空</button>" +
        "</div>" +
      "</div>";

    var inp = document.getElementById("dockInput");
    if (inp) {
      inp.value = dockDraft;
      inp.addEventListener("input", function () {
        dockDraft = this.value;
        this.style.height = "auto";
        this.style.height = Math.min(150, Math.max(42, this.scrollHeight)) + "px";
      });
      inp.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          var q = String(this.value || "").trim();
          if (!q) return;
          if (dockBusy) { toast("正在等 AI 回复…"); return; }
          this.value = ""; dockDraft = ""; this.style.height = "";
          dockAsk(q, q);
        }
      });
    }
    if (dockBusy) setDockBusy(true);
    var log = document.getElementById("dockLog");
    if (log) { try { log.scrollTop = log.scrollHeight; } catch (e) {} }
    if (hadFocus) focusDockInput();
  }

  /* 发问：posted = 气泡里显示的文字，instruction = 真正给 AI 的指令
     笔记上下文放进 system（不重复占用 token），追问按多轮 messages 传，保证「那第二点呢」这类追问能接上 */
  function dockAsk(posted, instruction) {
    if (dockBusy) { toast("正在等 AI 回复…"); return; }
    if (!aiCfg.key) { toast("先在「AI 接口配置」里填好 API Key"); return; }
    dock.msgs.push({ role: "user", content: posted });
    dock.msgs.push({ role: "assistant", content: "…思考中" });
    dockDraft = "";
    recordActivity();
    saveDock();
    renderDockLog(); renderDockCtx(); setDockBusy(true);

    var ctx = dockContext();
    var sys = roleById(aiRole).sys + CITE_RULE;
    if (ctx) sys += "\n\n【当前阅读上下文】\n" + ctx;
    var msgs = [{ role: "system", content: sys }];
    dock.msgs.slice(0, -2).slice(-6).forEach(function (m) {
      if (m.role === "user" || m.role === "assistant") {
        msgs.push({ role: m.role, content: String(m.content).slice(0, 1200) });
      }
    });
    msgs.push({ role: "user", content: instruction || posted });

    aiCallEx(msgs, 0.3).then(function (reply) {
      dock.msgs[dock.msgs.length - 1] = { role: "assistant", content: reply };
      saveDock(); setDockBusy(false); renderDockLog();
    }).catch(function (err) {
      dock.msgs[dock.msgs.length - 1] = {
        role: "assistant",
        content: "调用失败：" + (err && err.message ? err.message : "未知错误")
      };
      saveDock(); setDockBusy(false); renderDockLog();
    });
  }

  /* ---- 正文选中文字 → 浮出的「问 AI」按钮 ---- */
  function dockSelection() {
    var sel = null;
    try { sel = window.getSelection(); } catch (e) { return null; }
    if (!sel || !sel.rangeCount) return null;
    var txt = String(sel.toString()).replace(/\s+/g, " ").trim();
    if (txt.length < 4) return null;
    var art = document.querySelector("#app .article");
    if (!art) return null;
    var node = sel.getRangeAt(0).commonAncestorContainer;
    var host = node && node.nodeType === 1 ? node : (node ? node.parentNode : null);
    if (!host || !art.contains(host)) return null;
    var rect = null;
    try { rect = sel.getRangeAt(0).getBoundingClientRect(); } catch (e) { return null; }
    if (!rect || (!rect.width && !rect.height)) return null;
    return { text: txt, rect: rect };
  }
  function hideSelBubble() {
    var b = document.getElementById("selBubble");
    if (b) b.classList.remove("show");
  }
  function updateSelBubble() {
    var b = document.getElementById("selBubble");
    if (!b) return;
    if (!dockNote()) { hideSelBubble(); return; }
    var s = dockSelection();
    if (!s) { hideSelBubble(); return; }
    // 选区滚出视口就收起，否则会挂在页头那里看着很奇怪
    var vh = window.innerHeight || 800;
    if (s.rect.bottom < 60 || s.rect.top > vh - 24) { hideSelBubble(); return; }
    var top = s.rect.top - 46;
    if (top < 58) top = s.rect.bottom + 12;
    b.style.top = Math.max(58, top) + "px";
    b.style.left = Math.max(118, Math.min(s.rect.left + s.rect.width / 2, window.innerWidth - 118)) + "px";
    b.classList.add("show");
  }
  function refreshSelBubble() {
    var b = document.getElementById("selBubble");
    if (b && b.classList.contains("show")) updateSelBubble();
  }
  function bindDock() {
    document.addEventListener("mouseup", function (e) {
      if (e.target && e.target.closest && e.target.closest("#selBubble")) return;
      setTimeout(updateSelBubble, 10);
    });
    document.addEventListener("mousedown", function (e) {
      if (e.target && e.target.closest && e.target.closest("#selBubble")) { e.preventDefault(); return; }
      hideSelBubble();
    });
    document.addEventListener("keyup", function (e) {
      var tag = (e.target && e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      setTimeout(updateSelBubble, 10);
    });
    // 滚动 / 改变窗口大小时跟着选区重新定位，而不是直接消失
    window.addEventListener("scroll", refreshSelBubble, true);
    window.addEventListener("resize", refreshSelBubble);
  }

  /* ---------- AI 练习 ---------- */
  function randomChunk(a) {
    var text = String(a.md || "").trim();
    if (!text) text = String(a.html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!text) return "";
    var secs = text.split(/\n(?=#{1,6}\s)/).filter(function (s) { return s.trim().length > 60; });
    var pool = secs.length ? secs : [text];
    return pool[Math.floor(Math.random() * pool.length)].slice(0, 1500);
  }
  function pickRandomNote(scope) {
    var arts = allArticles().filter(function (a) { return scope === "全部" || (a.category || "未分类") === scope; });
    if (!arts.length) return null;
    var weighted = [];
    arts.forEach(function (a) {
      var w = masteryOf(a.id) <= 1 ? 3 : 1;
      for (var i = 0; i < w; i++) weighted.push(a);
    });
    return weighted[Math.floor(Math.random() * weighted.length)];
  }
  function parseQuizJSON(txt) {
    var s = String(txt).trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    var start = s.indexOf("{"), end = s.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    try {
      var j = JSON.parse(s.slice(start, end + 1));
      if (!j.question) return null;
      if (!Array.isArray(j.options)) j.options = [];
      return { question: String(j.question), options: j.options, answer: String(j.answer || ""), analysis: String(j.analysis || "") };
    } catch (e) { return null; }
  }
  function practiceGen() {
    var a = pickRandomNote(practice.scope);
    if (!a) { toast("这个范围内没有笔记"); return; }
    var chunk = randomChunk(a);
    if (!chunk) { toast("这篇笔记内容为空"); return; }
    practice.q = null; practice.picked = null; practice.submitted = false; practice.lastOk = null; practice.loading = true;
    render();
    var single = practice.type === "single";
    var prompt = "你是出题老师。基于下面这段笔记内容，出 1 道" + (single ? "单项选择题（4 个选项）" : "简答题") + "。\n" +
      "要求：只考核心概念，难度适中，题干清晰，不要出偏题怪题。\n" +
      "严格只输出如下 JSON，不要 markdown 代码块，不要任何其他文字：\n" +
      '{"question":"题干","options":["选项A","选项B","选项C","选项D"],"answer":"' +
      (single ? "正确选项的完整文本" : "参考答案") + '","analysis":"详细解题步骤与讲解"}\n' +
      (single ? "options 必须有且只有 4 项。" : "简答题时 options 必须是空数组 []。") +
      "\n\n笔记内容：\n\"\"\"\n" + chunk + "\n\"\"\"";
    aiCall(prompt).then(function (txt) {
      var q = parseQuizJSON(txt);
      if (!q) throw new Error("AI 返回的不是合法题目，再点一次试试");
      q.noteId = a.id; q.noteTitle = a.title; q.type = practice.type;
      practice.q = q; practice.loading = false;
      render();
    }).catch(function (err) {
      practice.loading = false;
      var m = (err && err.message) ? err.message : String(err);
      if (m.indexOf("Failed to fetch") >= 0) m = "网络或跨域问题，AI 没接通";
      toast("出题失败：" + m.slice(0, 60));
      render();
    });
  }
  function practiceRecord(ok) {
    if (!practice.q) return;
    /* 答错 → 自动收进错题集（页面里可关） */
    practice.lastOk = ok;
    if (!ok) misCollectQuiz(false);
    practiceLog.push({ q: practice.q.question.slice(0, 60), ok: ok, type: practice.q.type, noteId: practice.q.noteId, ts: Date.now() });
    if (practiceLog.length > 100) practiceLog = practiceLog.slice(-100);
    localStorage.setItem(STORE_PRACTICE, JSON.stringify(practiceLog));
    /* 答对 → 该笔记至少「熟悉」；累计答对 3 次 → 至少「掌握」 */
    if (ok && practice.q.noteId) {
      bumpMastery(practice.q.noteId, 1);
      var okN = 0;
      for (var ri = 0; ri < practiceLog.length; ri++) {
        if (practiceLog[ri].noteId === practice.q.noteId && practiceLog[ri].ok) okN++;
      }
      if (okN >= 3) bumpMastery(practice.q.noteId, 2);
    }
  }
  function renderPractice() {
    var cats = getCategories().map(function (c) { return c.name; });
    var scopeOpts = ['<option value="全部">全部分类</option>'].concat(
      cats.map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + "</option>"; })).join("");
    var body;
    if (practice.loading) body = '<div class="empty"><i class=ic data-ico=dice></i> 正在从你的笔记里随机抽题…</div>';
    else if (!practice.q) body = '<div class="empty">点上面「<i class=ic data-ico=dice></i> 随机出题」，AI 会从笔记里随机抽一段内容生成题目</div>';
    else {
      var q = practice.q, single = q.type === "single" && q.options.length;
      var qHtml = single
        ? q.options.map(function (o, i) {
            return '<div class="qz-opt' + (practice.picked === o ? " sel" : "") + '" data-action="qz-pick" data-i="' + i + '">' +
              '<span class="qz-k">' + "ABCD".charAt(i) + "</span>" + esc(o) + "</div>";
          }).join("")
        : '<textarea id="qzAns" class="qz-ans" placeholder="写下你的答案…">' + esc(practice.picked || "") + "</textarea>";
      var result = "";
      if (practice.submitted) {
        var correct = null;
        if (single) {
          var ans = q.answer, mm = ans.match(/^[A-Da-d]$/);
          if (mm) ans = q.options["ABCD".indexOf(mm[0].toUpperCase())] || ans;
          correct = !!practice.picked && practice.picked === ans;
        }
        var wrongNow = correct === false || (correct === null && practice.lastOk === false);
        result = '<div class="qz-result">' +
          (correct === null ? '<div class="qz-verdict"><i class=ic data-ico=book></i> 参考答案</div>'
            : correct ? '<div class="qz-verdict ok"><i class=ic-ok data-ico=check></i> 答对了</div>' : '<div class="qz-verdict no"><i class=ic-no data-ico=close></i> 答错了</div>') +
          '<div class="qz-row"><span class="qz-lbl">正确答案</span><span>' + esc(q.answer) + "</span></div>" +
          (practice.picked ? '<div class="qz-row"><span class="qz-lbl">你的答案</span><span>' + esc(practice.picked) + "</span></div>" : "") +
          '<div class="qz-analysis"><h3><i class=ic data-ico=puzzle></i> AI 解题</h3>' + linkify(jsMdToHtml(q.analysis)) + "</div>" +
          '<div class="qz-actions">' +
            (single ? "" : '<button class="btn" data-action="qz-rate" data-v="1"><i class=ic-ok data-ico=check></i> 我会了</button>' +
              '<button class="btn" data-action="qz-rate" data-v="0"><i class=ic-no data-ico=close></i> 没答对</button>') +
            '<button class="btn primary" data-action="practice-gen"><i class=ic data-ico=dice></i> 下一题</button>' +
            '<button class="btn" data-action="qz-askai"><i class=ic data-ico=chat></i> 就这题追问 AI</button>' +
            '<button class="btn" data-action="open-article" data-id="' + esc(q.noteId) + '"><i class=ic data-ico=book></i> 看来源笔记</button></div>' +
          (wrongNow
            ? (mis.auto
              ? '<div class="qz-mis ok"><i class=ic data-ico=check></i> 已自动收进错题集　<a data-action="mistakes">去错题集复习 →</a></div>'
              : '<div class="qz-mis"><button class="btn" data-action="mis-collect"><i class=ic data-ico=download></i> 收进错题集</button>' +
                '<span class="meta">（自动收录已关闭）</span></div>')
            : "") + "</div>";
      }
      body = '<div class="qz-card"><div class="qz-src"><i class=ic data-ico=doc></i> 来源：' + esc(q.noteTitle) + "</div>" +
        '<div class="qz-q">' + esc(q.question) + "</div>" + qHtml +
        (practice.submitted ? "" : '<div class="qz-actions">' +
          '<button class="btn primary" data-action="qz-submit">提交作答</button>' +
          '<button class="btn" data-action="qz-submit" data-skip="1">不会，直接看解题</button></div>') + result + "</div>";
    }
    var total = practiceLog.length;
    var okN = practiceLog.filter(function (r) { return r.ok; }).length;
    var rate = total ? Math.round((okN / total) * 100) : 0;
    var hist = practiceLog.slice(-8).reverse().map(function (r) {
      return '<div class="qz-hist"><span>' + (r.ok ? "<i class=ic-ok data-ico=check></i>" : "<i class=ic-no data-ico=close></i>") + "</span>" + esc(r.q) + "</div>";
    }).join("");
    document.getElementById("app").innerHTML =
      '<div class="breadcrumb"><a data-action="home">首页</a> / <i class=ic data-ico=target></i> AI 练习</div>' +
      pageHead("target", "AI 练习", "随机出题 · 自动判题 · AI 解题", "") +
      '<div class="qz-bar"><select id="qzScope" class="btn">' + scopeOpts + "</select>" +
        '<select id="qzType" class="btn"><option value="single">单选题</option><option value="short">简答题</option></select>' +
        '<button class="btn primary" data-action="practice-gen"><i class=ic data-ico=dice></i> 随机出题</button></div>' + body +
      '<div class="qz-stats"><div class="stat"><div class="num">' + total + '</div><div class="lbl">累计练习</div></div>' +
        '<div class="stat"><div class="num">' + rate + '%</div><div class="lbl">正确率</div></div></div>' +
      (hist ? '<div class="qz-histbox"><h3><i class=ic data-ico=clock></i> 最近练习</h3>' + hist + "</div>" : "");
    var sc = document.getElementById("qzScope");
    if (sc) { sc.value = practice.scope; sc.addEventListener("change", function () { practice.scope = this.value; }); }
    var ty = document.getElementById("qzType");
    if (ty) { ty.value = practice.type; ty.addEventListener("change", function () { practice.type = this.value; }); }
  }

  /* ---------- 错题集（自动收录 · 间隔重复复习） ---------- */
  var mis = loadJSON(STORE_MISTAKES, null);
  if (!mis || typeof mis !== "object" || !mis.list) mis = { auto: true, list: [] };
  var misState = { mode: "list", filter: "due", idx: 0, session: [], revealed: false, busy: "", open: "" };

  function saveMis() { localStorage.setItem(STORE_MISTAKES, JSON.stringify(mis)); }
  function misOf(id) {
    for (var i = 0; i < mis.list.length; i++) if (mis.list[i].id === id) return mis.list[i];
    return null;
  }
  function misDue() {
    var now = Date.now();
    return mis.list.filter(function (m) { return !m.mastered && (m.due || 0) <= now; })
      .sort(function (a, b) { return (a.due || 0) - (b.due || 0); });
  }
  function misPending() { return mis.list.filter(function (m) { return !m.mastered; }); }
  function misMastered() { return mis.list.filter(function (m) { return !!m.mastered; }); }

  /* 收录。同一道题干只保留一条：再次做错就累计错次并重置复习进度，
     避免同一道题反复堆成十几条。 */
  function addMistake(o) {
    if (!o || !o.q) return null;
    var key = String(o.q).replace(/\s+/g, "").slice(0, 120);
    for (var i = 0; i < mis.list.length; i++) {
      var m = mis.list[i];
      if (String(m.q).replace(/\s+/g, "").slice(0, 120) === key) {
        m.wrongCount = (m.wrongCount || 1) + 1;
        m.box = 0; m.due = Date.now(); m.mastered = false; m.rightStreak = 0;
        m.myAnswer = o.myAnswer || m.myAnswer || "";
        if (o.answer) m.answer = o.answer;
        if (o.analysis && !m.analysis) m.analysis = o.analysis;
        m.lastTs = Date.now();
        saveMis();
        return { item: m, dup: true };
      }
    }
    var it = {
      id: "mist-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
      q: String(o.q), type: o.type || "manual",
      options: o.options || [], answer: o.answer || "", analysis: o.analysis || "",
      myAnswer: o.myAnswer || "", noteId: o.noteId || "", noteTitle: o.noteTitle || "",
      tags: o.tags || [], ts: Date.now(), lastTs: Date.now(),
      box: 0, due: Date.now(), reviewed: 0, wrongCount: 1, rightStreak: 0, mastered: false
    };
    mis.list.push(it);
    saveMis();
    return { item: it, dup: false };
  }
  /* 把当前这道做错的练习题整理成错题条目 */
  function misFromQuiz() {
    var q = practice.q;
    if (!q) return null;
    var ans = String(q.answer || "");
    if (q.type === "single") {
      var m = ans.match(/^[A-Da-d]$/);
      if (m) ans = (q.options || [])["ABCD".indexOf(m[0].toUpperCase())] || ans;
    }
    return {
      q: q.question, type: q.type, options: q.options || [], answer: ans,
      analysis: q.analysis || "", myAnswer: practice.picked || "",
      noteId: q.noteId || "", noteTitle: q.noteTitle || ""
    };
  }
  function misCollectQuiz(silent, force) {
    if (!mis.auto && !force) return null;
    var o = misFromQuiz();
    if (!o) return null;
    var r = addMistake(o);
    if (r && !silent) {
      toast(r.dup ? "已更新错题集里的这道题（累计错 " + r.item.wrongCount + " 次）" : "已自动收进错题集");
    }
    return r;
  }
  function misGrade(id, grade) {
    var m = misOf(id);
    if (!m) return;
    m.reviewed = (m.reviewed || 0) + 1;
    if (grade === "again") {
      m.box = 0; m.rightStreak = 0; m.wrongCount = (m.wrongCount || 1) + 1;
    } else if (grade === "good") {
      m.box = Math.min(5, (m.box || 0) + 1);
      m.rightStreak = (m.rightStreak || 0) + 1;
      /* 复习「会了」→ 来源笔记至少「熟悉」，与闪卡/练习同一套联动 */
      if (m.noteId) bumpMastery(m.noteId, 1);
    } else {
      m.rightStreak = 0;
      m.box = Math.max(0, Math.min(5, m.box || 0));
    }
    m.due = Date.now() + INTERVALS[m.box || 0];
    saveMis();
    recordActivity();
  }
  function misNextDueText(m) {
    if (m.mastered) return "已掌握";
    var d = (m.due || 0) - Date.now();
    if (d <= 0) return "待复习";
    var mn = Math.round(d / 60000);
    if (mn < 60) return mn + " 分钟后";
    var hr = Math.round(mn / 60);
    if (hr < 24) return hr + " 小时后";
    return Math.round(hr / 24) + " 天后";
  }
  function misFiltered() {
    var f = misState.filter, list = mis.list.slice();
    if (f === "due") return misDue();
    if (f === "todo") return misPending().sort(function (a, b) { return (b.lastTs || 0) - (a.lastTs || 0); });
    if (f === "done") return misMastered();
    return list.sort(function (a, b) { return (b.lastTs || 0) - (a.lastTs || 0); });
  }
  function misStartReview() {
    misState.session = misDue().map(function (m) { return m.id; });
    misState.idx = 0; misState.revealed = false; misState.mode = "review";
    if (!misState.session.length) { toast("现在没有到期的错题，明天再来"); misState.mode = "list"; }
  }
  function misExportMd() {
    var list = mis.list.slice().sort(function (a, b) { return (b.lastTs || 0) - (a.lastTs || 0); });
    if (!list.length) { toast("错题集还是空的"); return; }
    var md = "# 错题集\n\n> 导出时间：" + new Date().toLocaleString("zh-CN") +
      " · 共 " + list.length + " 道（待复习 " + misPending().length + " · 已掌握 " + misMastered().length + "）\n\n";
    list.forEach(function (m, i) {
      md += "## " + (i + 1) + ". " + m.q + "\n\n";
      if ((m.options || []).length) {
        md += m.options.map(function (o, ix) { return "- " + "ABCD".charAt(ix) + ". " + o; }).join("\n") + "\n\n";
      }
      if (m.myAnswer) md += "- **我的答案**：" + m.myAnswer + "\n";
      if (m.answer) md += "- **正确答案**：" + m.answer + "\n";
      md += "- 错 " + (m.wrongCount || 1) + " 次 · 复习 " + (m.reviewed || 0) + " 次" + (m.mastered ? " · 已掌握" : "") + "\n";
      if (m.noteTitle) md += "- 来源笔记：" + m.noteTitle + "\n";
      if ((m.tags || []).length) md += "- 标签：" + m.tags.map(function (t) { return "#" + t; }).join(" ") + "\n";
      if (m.analysis) md += "\n**解析**\n\n" + m.analysis + "\n";
      md += "\n---\n\n";
    });
    downloadBlob("错题集-" + todayKey() + ".md", md, "text/markdown;charset=utf-8");
    toast("已导出 " + list.length + " 道错题");
  }
  /* 手工录入 / 编辑 */
  function misForm(item) {
    showModal({
      title: item ? "编辑这道错题" : "手工录入错题",
      okText: item ? "保存" : "收进错题集",
      fields: [
        { name: "q", label: "题干", multiline: true, value: item ? item.q : "", ph: "做错的那道题" },
        { name: "myAnswer", label: "我的答案（当时怎么错的）", value: item ? item.myAnswer : "", ph: "可留空" },
        { name: "answer", label: "正确答案", value: item ? item.answer : "", ph: "正确解法或选项" },
        { name: "analysis", label: "解析 / 错因", multiline: true, value: item ? item.analysis : "", ph: "可留空，之后能让 AI 补" },
        { name: "noteTitle", label: "来源笔记标题", value: item ? item.noteTitle : "", ph: "可留空；填了就支持一键跳回" },
        { name: "tags", label: "标签（逗号分隔）", value: item ? (item.tags || []).join(", ") : "", ph: "如 极限, 易错" }
      ],
      onOk: function (v) {
        if (!v.q) { toast("题干不能为空"); return; }
        var tags = String(v.tags || "").split(/[,，]/).map(function (s) { return s.trim(); }).filter(Boolean);
        var nid = item ? item.noteId : "";
        if (v.noteTitle) { var t = articleByTitle(v.noteTitle); if (t) nid = t.id; }
        if (item) {
          item.q = v.q; item.myAnswer = v.myAnswer; item.answer = v.answer;
          item.analysis = v.analysis; item.noteTitle = v.noteTitle; item.noteId = nid;
          item.tags = tags;
          saveMis(); toast("已保存"); render();
        } else {
          addMistake({
            q: v.q, type: "manual", myAnswer: v.myAnswer, answer: v.answer,
            analysis: v.analysis, noteTitle: v.noteTitle, noteId: nid, tags: tags
          });
          toast("已收进错题集"); render();
        }
      }
    });
  }
  /* 让 AI 补一份解析（手工录入的错题通常没有解析） */
  function misAiAnalysis(id) {
    var m = misOf(id);
    if (!m) return;
    if (!aiCfg.key) { toast("先在「AI 接口配置」里填好 API Key"); return; }
    misState.busy = id; render();
    var p = "下面这道题我做错了，请帮我彻底弄懂。\n\n题目：" + m.q + "\n" +
      ((m.options || []).length ? "选项：\n" + m.options.map(function (o, i) { return "ABCD".charAt(i) + ". " + o; }).join("\n") + "\n" : "") +
      "我当时的答案：" + (m.myAnswer || "（未记录）") + "\n" +
      "正确答案：" + (m.answer || "（未给出，请你判断）") + "\n\n" +
      "请用 Markdown 输出四段：\n**正确答案** ／ **我为什么错** ／ **完整解题步骤** ／ **涉及的知识点**。简洁准确，不要客套。";
    aiCall(p).then(function (txt) {
      m.analysis = txt; m.lastTs = Date.now();
      saveMis(); misState.busy = ""; render(); toast("已生成解析");
    }).catch(function (err) {
      misState.busy = ""; render();
      toast("生成失败：" + String((err && err.message) || err).slice(0, 60));
    });
  }

  function misReviewHTML() {
    if (!misState.session.length) {
      return '<div class="mis-card"><div class="mis-done">' + ico("check", 26) +
        "<h3>这一轮错题复习完了</h3>" +
        "<p>共 " + mis.list.length + " 道错题 · 待复习 " + misPending().length +
        " · 已掌握 " + misMastered().length + "</p>" +
        '<div class="ed-toolbar" style="justify-content:center">' +
          '<button class="btn primary" data-action="mis-start">再复习一轮</button>' +
          '<button class="btn" data-action="mis-mode" data-v="list">看全部错题</button>' +
        "</div></div></div>";
    }
    if (misState.idx >= misState.session.length) {
      return '<div class="mis-card"><div class="mis-done">' + ico("check", 26) +
        "<h3>本轮完成 ✓</h3><p>复习了 " + misState.session.length + " 道错题</p>" +
        '<div class="ed-toolbar" style="justify-content:center">' +
          '<button class="btn primary" data-action="mis-start">再复习一轮</button>' +
          '<button class="btn" data-action="mis-mode" data-v="list">看全部错题</button>' +
        "</div></div></div>";
    }
    var m = misOf(misState.session[misState.idx]);
    if (!m) { misState.idx++; return misReviewHTML(); }
    var opts = "";
    if ((m.options || []).length) {
      opts = '<div class="mis-opts">' + m.options.map(function (o, i) {
        var k = "ABCD".charAt(i);
        var isRight = m.answer && (o === m.answer || m.answer === k);
        var isMine = misState.revealed && m.myAnswer && (o === m.myAnswer || m.myAnswer === k);
        var cls = "mis-opt" + (isMine && !isRight ? " bad" : "") + (isRight ? " right" : "");
        return '<div class="' + cls + '"><span class="mis-k">' + k + "</span><span>" + esc(o) + "</span>" +
          (misState.revealed && isRight ? '<span class="mis-flag">正确</span>' : "") +
          (isMine && !isRight ? '<span class="mis-flag bad">你选的</span>' : "") + "</div>";
      }).join("") + "</div>";
    }
    var revealed = misState.revealed
      ? '<div class="mis-verdict">' +
          (m.myAnswer ? '<div class="mis-my"><span>你的答案</span><em>' + esc(m.myAnswer) + "</em></div>" : "") +
          '<div class="mis-right"><span>正确答案</span><em>' + esc(m.answer || "（未记录）") + "</em></div>" +
        "</div>" +
        (m.analysis ? '<div class="mis-an">' + linkify(jsMdToHtml(m.analysis)) + "</div>"
                    : '<div class="mis-an mis-an-empty">这道题还没有解析。' +
                      '<button class="btn sm" data-action="mis-ai" data-id="' + esc(m.id) + '">' + ico("sparkle", 13) + " AI 生成解析</button></div>") +
        '<div class="mis-grades">' +
          '<button class="btn danger" data-action="mis-rate" data-id="' + esc(m.id) + '" data-v="again">又错了</button>' +
          '<button class="btn" data-action="mis-rate" data-id="' + esc(m.id) + '" data-v="hard">模糊</button>' +
          '<button class="btn primary" data-action="mis-rate" data-id="' + esc(m.id) + '" data-v="good">会了</button>' +
        "</div>"
      : '<button class="btn primary" data-action="mis-reveal">显示答案</button>';

    return '<div class="mis-card" id="misCard">' +
      '<div class="mis-top">第 ' + (misState.idx + 1) + " / " + misState.session.length + " 道 · " +
        (m.type === "single" ? "单选" : m.type === "short" ? "简答" : "手工") +
        " · 累计错 " + (m.wrongCount || 1) + " 次" +
        (m.noteTitle ? ' · 来源 <a data-action="open-article" data-id="' + esc(m.noteId) + '">' + esc(m.noteTitle) + "</a>" : "") +
      "</div>" +
      '<div class="mis-q">' + esc(m.q) + "</div>" +
      opts + revealed +
    "</div>";
  }

  function misListHTML() {
    var list = misFiltered();
    if (!list.length) {
      return emptyHint(mis.list.length
        ? "这个筛选下没有错题"
        : "错题集还是空的。做 AI 练习时答错的题会自动收进来；也可以用上面的「手工录入」添加。");
    }
    return '<div class="mis-list">' + list.map(function (m) {
      var open = misState.open === m.id;
      return '<div class="mis-item' + (m.mastered ? " done" : "") + (open ? " open" : "") + '">' +
        '<div class="mis-item-head" data-action="mis-toggle" data-id="' + esc(m.id) + '">' +
          '<span class="mis-type">' + (m.type === "single" ? "单选" : m.type === "short" ? "简答" : "手工") + "</span>" +
          "<strong>" + esc(m.q.length > 60 ? m.q.slice(0, 60) + "…" : m.q) + "</strong>" +
          '<span class="mis-side">' +
            '<span class="mis-cnt">错 ' + (m.wrongCount || 1) + " 次</span>" +
            '<span class="mis-due' + (!m.mastered && (m.due || 0) <= Date.now() ? " now" : "") + '">' + misNextDueText(m) + "</span>" +
            '<span class="mis-caret">' + ico("chevron", 14) + "</span>" +
          "</span></div>" +
        (open ? '<div class="mis-item-body">' +
            ((m.options || []).length ? '<div class="mis-opts">' + m.options.map(function (o, i) {
              var k = "ABCD".charAt(i);
              var isRight = m.answer && (o === m.answer || m.answer === k);
              var isMine = m.myAnswer && (o === m.myAnswer || m.myAnswer === k);
              return '<div class="mis-opt' + (isMine && !isRight ? " bad" : "") + (isRight ? " right" : "") +
                '"><span class="mis-k">' + k + "</span><span>" + esc(o) + "</span></div>";
            }).join("") + "</div>" : "") +
            (m.myAnswer ? '<div class="mis-my"><span>你的答案</span><em>' + esc(m.myAnswer) + "</em></div>" : "") +
            (m.answer ? '<div class="mis-right"><span>正确答案</span><em>' + esc(m.answer) + "</em></div>" : "") +
            (m.noteTitle ? '<div class="mis-src">来源笔记：<a data-action="open-article" data-id="' + esc(m.noteId) + '">' + esc(m.noteTitle) + "</a></div>" : "") +
            ((m.tags || []).length ? '<div class="mis-src">标签：' + m.tags.map(function (t) {
              return '<span class="tag">#' + esc(t) + "</span>";
            }).join(" ") + "</div>" : "") +
            (m.analysis
              ? '<div class="mis-an">' + linkify(jsMdToHtml(m.analysis)) + "</div>"
              : '<div class="mis-an mis-an-empty">还没有解析' +
                '<button class="btn sm" data-action="mis-ai" data-id="' + esc(m.id) + '">' + ico("sparkle", 13) + " AI 生成解析</button></div>") +
            '<div class="mis-ops">' +
              '<button class="btn sm" data-action="mis-review-one" data-id="' + esc(m.id) + '">' + ico("refresh", 13) + " 单独复习</button>" +
              '<button class="btn sm" data-action="mis-ai" data-id="' + esc(m.id) + '">' + ico("sparkle", 13) + " AI 解析</button>" +
              '<button class="btn sm" data-action="mis-edit" data-id="' + esc(m.id) + '">' + ico("pen", 13) + " 编辑</button>" +
              '<button class="btn sm' + (m.mastered ? " on" : "") + '" data-action="mis-master" data-id="' + esc(m.id) + '">' +
                ico("check", 13) + (m.mastered ? " 已掌握" : " 标记掌握") + "</button>" +
              '<button class="btn sm danger" data-action="mis-del" data-id="' + esc(m.id) + '">' + ico("trash", 13) + " 删除</button>" +
            "</div></div>" : "") +
      "</div>";
    }).join("") + "</div>";
  }

  function renderMistakes() {
    var due = misDue().length, pend = misPending().length, done = misMastered().length;
    var wrongTotal = mis.list.reduce(function (s, m) { return s + (m.wrongCount || 1); }, 0);
    var reviewedTotal = mis.list.reduce(function (s, m) { return s + (m.reviewed || 0); }, 0);

    var stats = [
      [mis.list.length, "道错题"],
      [due, "现在待复习"],
      [pend, "未掌握"],
      [done, "已掌握"],
      [reviewedTotal, "累计复习次数"],
      [wrongTotal, "累计做错次数"]
    ].map(function (m) {
      return '<div class="mis-stat' + (m[1] > 0 && m[1] === due ? " hot" : "") + '">' +
        '<div class="v">' + m[0] + '</div><div class="k">' + m[1] + "</div></div>";
    }).join("");

    var filters = [["due", "待复习 " + due], ["todo", "未掌握 " + pend], ["done", "已掌握 " + done], ["all", "全部 " + mis.list.length]]
      .map(function (f) {
        return '<button class="chip-tab' + (misState.filter === f[0] ? " on" : "") +
          '" data-action="mis-filter" data-v="' + f[0] + '">' + f[1] + "</button>";
      }).join("");

    var body = misState.mode === "review" ? misReviewHTML() : misListHTML();

    document.getElementById("app").innerHTML =
      '<div class="breadcrumb"><a data-action="home">首页</a> / <i class=ic data-ico=warn></i> 错题集</div>' +
      pageHead("warn", "错题集", "做错过的题，趁还没忘再过一遍",
        '<span class="badge">' + (due ? due + " 道待复习" : "暂无到期的题") + "</span>") +
      '<div class="mis-stats">' + stats + "</div>" +
      '<div class="mis-toolbar">' +
        '<div class="mis-modes">' +
          '<button class="btn' + (misState.mode === "list" ? " primary" : "") + '" data-action="mis-mode" data-v="list">题目列表</button>' +
          '<button class="btn' + (misState.mode === "review" ? " primary" : "") + '" data-action="mis-start">开始复习' +
            (due ? '<span class="mis-pill">' + due + "</span>" : "") + "</button>" +
        "</div>" +
        '<div class="mis-tools">' +
          '<label class="ctx-toggle"><input type="checkbox" id="misAuto"' + (mis.auto ? " checked" : "") + "> 练习答错自动收录</label>" +
          '<button class="btn" data-action="mis-add">' + ico("plus", 14) + " 手工录入</button>" +
          '<button class="btn" data-action="mis-export">' + ico("download", 14) + " 导出 Markdown</button>" +
        "</div>" +
      "</div>" +
      (misState.mode === "list" ? '<div class="mis-filters">' + filters + "</div>" : "") +
      body;

    var ab = document.getElementById("misAuto");
    if (ab) ab.addEventListener("change", function () {
      mis.auto = this.checked; saveMis();
      toast(mis.auto ? "之后练习答错会自动收进错题集" : "已关闭自动收录");
    });
  }

  /* ---------- 笔记版本历史（变更追踪 / 回滚） ---------- */
  function saveVersion(noteId, md, title) {
    if (!noteId || md === undefined) return;
    var arr = versions[noteId] || [];
    arr.unshift({ ts: Date.now(), md: md, title: title || "" });
    if (arr.length > 20) arr = arr.slice(0, 20);
    versions[noteId] = arr;
    localStorage.setItem(STORE_VERSIONS, JSON.stringify(versions));
  }
  function fmtTs(ts) {
    var d = new Date(ts);
    return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2) +
      " " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
  }
  function renderHistory() {
    var a = findArticle(route.id);
    if (!a) { route.view = "home"; return render(); }
    var arr = versions[route.id] || [];
    var rows = arr.map(function (v, i) {
      return '<div class="set-row"><div class="info"><strong>' + fmtTs(v.ts) + "</strong>" +
        '<div class="meta">' + esc(String(v.md).replace(/\s+/g, " ").slice(0, 50)) + "…（" + v.md.length + " 字）</div></div>" +
        '<div class="step-ops">' +
          '<button class="btn" data-action="hist-view" data-i="' + i + '">查看</button>' +
          '<button class="btn" data-action="hist-restore" data-i="' + i + '">回滚</button>' +
          '<button class="btn danger" data-action="hist-del" data-i="' + i + '"><i class=ic data-ico=trash></i></button></div></div>';
    }).join("");
    var view = (histViewIdx >= 0 && arr[histViewIdx])
      ? '<div class="article" style="max-width:none;margin-top:14px;white-space:pre-wrap">' + esc(arr[histViewIdx].md) + "</div>"
      : "";
    document.getElementById("app").innerHTML =
      '<div class="breadcrumb"><a data-action="home">首页</a> / <i class=ic data-ico=clock></i> 版本历史</div>' +
      pageHead("clock", "版本历史：" + esc(a.title), "保存时自动留档，最多 20 个，可随时回滚",
        '<span class="badge">' + arr.length + " 个版本</span>") +
      '<div class="path-detail">' +
        (rows || emptyHint("还没有历史版本。编辑并保存后会自动留存。")) + view + "</div>";
  }

  /* ---------- 知识链（由易到难 · 环环相扣） ---------- */
  var STORE_CHAIN = "lls_chain";
  var chain = loadJSON(STORE_CHAIN, { done: {}, open: {}, strict: true });
  if (!chain.done) chain.done = {};
  if (!chain.open) chain.open = {};
  if (typeof chain.strict !== "boolean") chain.strict = true;
  function saveChain() { localStorage.setItem(STORE_CHAIN, JSON.stringify(chain)); }

  var DIFF_LEVELS = [
    { k: 1, name: "入门", c: "#86d14a", d: "概念与定义，零基础可直接读" },
    { k: 2, name: "基础", c: "#c8e04a", d: "基本方法与公式，前置要求少" },
    { k: 3, name: "进阶", c: "#ffb000", d: "多步推导，需要前面的知识打底" },
    { k: 4, name: "挑战", c: "#ff8a4c", d: "计算量大 / 易错点多" },
    { k: 5, name: "综合", c: "#ff6152", d: "跨章节综合，需要扎实基础" }
  ];
  function diffLevel(k) { return DIFF_LEVELS[Math.max(0, Math.min(DIFF_LEVELS.length - 1, (k || 1) - 1))]; }

  /* 进阶术语：命中越多越偏「挑战 / 综合」 */
  var DIFF_TERMS = ["定理", "积分", "变换", "暂态", "级数", "特征", "矩阵", "网络", "相量",
    "谐振", "耦合", "反馈", "频率响应", "微分方程", "曲线积分", "曲面积分", "二端口", "三相",
    "继电保护", "高电压", "量子", "相对论", "热力学", "机械波", "衍射", "干涉", "互感",
    "运算放大器", "功率放大", "直流电源", "装配图", "截交", "相贯", "指针", "结构体",
    "文件操作", "正定", "二次型", "对角化", "重积分", "傅里叶"];

  function mathCountOf(a) {
    var m = String(a.html || "").match(/class="math"/g);
    return m ? m.length : 0;
  }
  function termCountOf(a) {
    var txt = (a.title || "") + " " + (a.tags || []).join(" ") + " " + String(a.md || "").slice(0, 1600);
    var n = 0;
    for (var i = 0; i < DIFF_TERMS.length; i++) if (txt.indexOf(DIFF_TERMS[i]) >= 0) n++;
    return n;
  }

  var _diffBase = null, _diffMap = null;
  function diffReset() { _diffBase = null; _diffMap = null; }
  function diffBase() {
    if (_diffBase) return _diffBase;
    var mx = { m: 1, w: 1, t: 1 };
    allArticles().forEach(function (a) {
      var m = mathCountOf(a), t = termCountOf(a);
      if (m > mx.m) mx.m = m;
      if ((a.wordCount || 0) > mx.w) mx.w = a.wordCount || 0;
      if (t > mx.t) mx.t = t;
    });
    _diffBase = mx;
    return mx;
  }
  function byChapter(a, b) { return a.id < b.id ? -1 : (a.id > b.id ? 1 : 0); }

  /* 难度分 = 章节序位 46% + 公式密度 22% + 篇幅 14% + 术语深度 18%
     （用于全站贯通排序与「难度依据」展示） */
  var DIFF_W = { pos: 0.46, math: 0.22, word: 0.14, term: 0.18 };
  function diffMap() {
    if (_diffMap) return _diffMap;
    var mx = diffBase(), m = {};
    var byCat = {};
    allArticles().forEach(function (a) {
      var c = a.category || "未分类";
      (byCat[c] = byCat[c] || []).push(a);
    });
    Object.keys(byCat).forEach(function (c) {
      var list = byCat[c].slice().sort(byChapter);
      list.forEach(function (a, i) {
        var pPos = list.length > 1 ? i / (list.length - 1) : 0;
        var mm = mathCountOf(a), tt = termCountOf(a);
        var score = DIFF_W.pos * pPos
          + DIFF_W.math * Math.min(1, mm / mx.m)
          + DIFF_W.word * Math.min(1, (a.wordCount || 0) / mx.w)
          + DIFF_W.term * Math.min(1, tt / mx.t);
        // 等级按科目内章节分位分档：前 20% 入门 … 后 20% 综合。
        // 只按加权分分档会让每门课的第一章就落到「基础」，阶梯底部永远空着。
        var lvl = 1 + Math.min(DIFF_LEVELS.length - 1, Math.floor(pPos * DIFF_LEVELS.length));
        m[a.id] = { score: score, math: mm, term: tt, pos: i, total: list.length, level: lvl };
      });
    });
    _diffMap = m;
    return m;
  }
  /* 2026-10-08 审计删除 noteDiff()：唯一调用点已内联成 diffMap()[a.id] || 默认值。 */
  function diffWhy(a, d) {
    var band = d.total > 1 ? Math.round(d.pos / (d.total - 1) * 100) : 0;
    return "难度 " + d.level + "/5（" + diffLevel(d.level).name + "）\n" +
      "· 本科目顺序：第 " + (d.pos + 1) + " / " + d.total + " 章（约 " + band + "% 处）\n" +
      "· 公式数量：" + d.math + " 个\n" +
      "· 篇幅：" + (a.wordCount || 0) + " 字\n" +
      "· 进阶术语命中：" + d.term + " 个\n" +
      "· 综合加权分：" + Math.round(d.score * 100) + " / 100";
  }
  function starsHTML(level, color) {
    var h = '<span class="diff-bars" style="--dc:' + color + '" title="难度 ' + level + "/5 · " + diffLevel(level).name + '">';
    for (var i = 1; i <= DIFF_LEVELS.length; i++) h += "<i" + (i <= level ? ' class="on"' : "") + "></i>";
    return h + "</span>";
  }

  /* 关联笔记（来自 [[双向链接]]，仅作参考，不作为前置条件） */
  function relatedOf(a) {
    var txt = String(a.md || "") + String(a.html || "");
    var re = /\[\[([^\]]+)\]\]/g, m, seen = {}, out = [];
    while ((m = re.exec(txt))) {
      var t = m[1].trim();
      if (seen[t]) continue;
      seen[t] = 1;
      var tgt = articleByTitle(t);
      if (tgt && tgt.id !== a.id) out.push(tgt);
    }
    return out.slice(0, 5);
  }

  /* 构建链条：cat 为空 → 全站贯通（各科内部保持章节序，整体按难度升序插空） */
  function chainNodes(cat) {
    var dm = diffMap();
    var byCat = {};
    allArticles().forEach(function (a) {
      var c = a.category || "未分类";
      (byCat[c] = byCat[c] || []).push(a);
    });
    var out = [];
    if (cat) {
      var list = (byCat[cat] || []).slice().sort(byChapter);
      list.forEach(function (a, i) {
        out.push({ a: a, d: dm[a.id] || { level: 1, score: 0 }, prev: i ? list[i - 1].id : null });
      });
      return out;
    }
    var cats = Object.keys(byCat);
    var ptr = {}, lastOf = {};
    cats.forEach(function (c) { byCat[c].sort(byChapter); ptr[c] = 0; });
    var guard = 0;
    while (guard++ < 8000) {
      var best = null, bc = null;
      for (var i = 0; i < cats.length; i++) {
        var c = cats[i], cand = byCat[c][ptr[c]];
        if (!cand) continue;
        var sc = (dm[cand.id] || { score: 0 }).score;
        if (best === null || sc < best) { best = sc; bc = c; }
      }
      if (!bc) break;
      var art = byCat[bc][ptr[bc]++];
      out.push({ a: art, d: dm[art.id] || { level: 1, score: 0 }, prev: lastOf[bc] || null });
      lastOf[bc] = art.id;
    }
    return out;
  }

  function ringDone(id) { return !!(chain.done[id] || masteryOf(id) >= 2); }
  function ringState(nodes, i) {
    var n = nodes[i];
    if (!n) return "locked";
    if (ringDone(n.a.id)) return "done";
    if (!n.prev) return "active";
    if (!chain.strict) return "active";
    return (ringDone(n.prev) || chain.open[n.a.id]) ? "active" : "locked";
  }
  function chainStat(nodes) {
    var done = 0, active = 0, sum = 0;
    nodes.forEach(function (n, i) {
      var s = ringState(nodes, i);
      if (s === "done") done++;
      else if (s === "active") active++;
      sum += n.d.score;
    });
    return {
      done: done, active: active, total: nodes.length,
      pct: nodes.length ? Math.round(done / nodes.length * 100) : 0,
      avg: nodes.length ? sum / nodes.length : 0
    };
  }
  function chainMinutes(nodes) {
    var wc = 0;
    nodes.forEach(function (n) { wc += n.a.wordCount || 0; });
    return Math.max(1, Math.round(wc / 350));
  }
  function chainLabel() { return chainCat ? chainCat : "全站贯通"; }

  /* 安全滚动（部分环境不支持 scrollIntoView 的选项参数，甚至没有该方法） */
  function scrollToEl(el) {
    if (!el || typeof el.scrollIntoView !== "function") return;
    try { el.scrollIntoView({ behavior: "smooth", block: "center" }); }
    catch (e) { try { el.scrollIntoView(); } catch (e2) {} }
  }

  /* ---- 视图片段 ---- */
  function chainTabsHTML() {
    var cats = getCategories();
    var h = '<div class="chain-tabs">' +
      '<button type="button" class="chip-tab' + (chainCat === null ? " on" : "") +
        '" data-action="chain-cat" data-cat="">' + ico("chain", 14) + " 全站贯通</button>";
    cats.forEach(function (c) {
      h += '<button type="button" class="chip-tab' + (chainCat === c.name ? " on" : "") +
        '" data-action="chain-cat" data-cat="' + esc(c.name) + '">' +
        '<span class="cd" style="background:' + catColor(c.name) + '"></span>' +
        esc(c.name) + '<span class="cnt">' + c.count + "</span></button>";
    });
    return h + "</div>";
  }

  function miniChainsHTML() {
    var cats = getCategories();
    var h = '<div class="mini-chains">';
    cats.forEach(function (c) {
      var st = chainStat(chainNodes(c.name));
      var col = colorFor(c.name);
      h += '<div class="mini-chain" data-action="chain-cat" data-cat="' + esc(c.name) + '">' +
        '<div class="mc-top"><span class="mc-ico" style="background:linear-gradient(135deg,' + col[0] + "," + col[1] + ')">' +
          ico(catIco(c.name), 15) + "</span><span class=\"mc-name\">" + esc(c.name) + "</span></div>" +
        '<div class="mc-bar"><i style="width:' + st.pct + '%;background:' + catColor(c.name) + '"></i></div>' +
        '<div class="mc-meta">' + st.done + " / " + st.total + " 环 · 均难 " +
          diffLevel(Math.max(1, Math.min(5, Math.round(st.avg * 5)))).name + "</div></div>";
    });
    return h + "</div>";
  }

  function ladderHTML(nodes) {
    var dist = [0, 0, 0, 0, 0];
    nodes.forEach(function (n) { dist[Math.max(0, Math.min(4, n.d.level - 1))]++; });
    var mx = Math.max.apply(null, dist) || 1;
    var rows = DIFF_LEVELS.map(function (L, i) {
      var n = dist[i];
      return '<div class="lad-row"><span class="lad-name" style="color:' + L.c + '">' + L.name + "</span>" +
        '<span class="lad-bar"><i style="width:' + Math.round(n / mx * 100) + "%;background:" + L.c + '"></i></span>' +
        '<span class="lad-num">' + n + "</span></div>";
    }).join("");
    return '<div class="chain-ladder"><div class="cl-head">' + ico("chart", 14) +
      " 难度阶梯<span>" + chainLabel() + " · " + nodes.length + " 环</span></div>" + rows + "</div>";
  }

  function chainHeroHTML(nodes, st) {
    var avgLv = diffLevel(Math.max(1, Math.min(5, Math.round(st.avg * 5))));
    var curIdx = -1;
    nodes.forEach(function (n, i) { if (curIdx < 0 && ringState(nodes, i) === "active") curIdx = i; });
    var nextTxt = curIdx >= 0
      ? "下一步：第 " + (curIdx + 1) + " 环 · " + esc(nodes[curIdx].a.title.replace(/^[^·]*·\s*/, ""))
      : (st.total ? "整条链已全部完成" : "这条链还没有内容");
    var h = '<div class="path-hero chain-hero">' +
      '<div class="ph-main">' +
        /* h2 而不是 h1：知识链视图已经有 pageHead 的「知识链」页面标题了，
           这里再来一个 h1 就是层级倒挂（h2 → h1 → h3），屏幕阅读器按标题
           导航会先跳回"页面级"。path 详情页的 path-hero 没有 pageHead，
           那里的 h1 仍是真正的页面标题，保持不动。 */
        "<h2>" + ico("chain") + " " + esc(chainLabel()) + " 知识链</h2>" +
        '<p class="ph-desc">' + esc("由易到难串成 " + st.total + " 环，学完一环解锁下一环") + "</p>" +
        '<div class="ph-stats">' +
          "<span>" + ico("check", 13) + " 已完成 " + st.done + " / " + st.total + "</span>" +
          "<span>" + ico("doc", 13) + " 约 " + chainMinutes(nodes) + " 分钟</span>" +
          "<span>" + ico("chart", 13) + " 平均难度：" + avgLv.name + "</span>" +
          '<span class="ch-next">' + nextTxt + "</span>" +
        "</div>" +
      "</div>" +
      '<div class="ph-side">' +
        '<div class="ph-ring" style="--pct:' + st.pct + '"><div class="ph-ring-in">' +
          '<div><div class="ph-num">' + st.pct + '%</div><div class="ph-cap">已完成</div></div></div></div>' +
        '<div class="ph-btns">' +
          '<button type="button" class="btn primary sm" data-action="chain-start">' +
            ico("arrowDown", 13) + " 跳到当前环</button>" +
          '<button type="button" class="btn sm" data-action="chain-path">' +
            ico("map", 13) + " 存为学习路径</button>" +
          '<button type="button" class="btn sm' + (chain.strict ? " on" : "") + '" data-action="chain-strict">' +
            ico(chain.strict ? "lock" : "unlock", 13) + (chain.strict ? " 严格串联" : " 自由学习") + "</button>" +
          '<button type="button" class="btn sm" data-action="chain-unlock-all">' +
            ico("unlock", 13) + " 解锁全部</button>" +
          '<button type="button" class="btn sm" data-action="chain-reset">' + ico("refresh", 13) + " 重置进度</button>" +
        "</div>" +
      "</div></div>";
    return h;
  }

  function stageHTML(lv, from) {
    var L = diffLevel(lv);
    return '<div class="cstage" style="--c:' + L.c + '">' +
      '<span class="cs-lv">' + L.k + "</span>" +
      '<span class="cs-name">阶段 · ' + L.name + "</span>" +
      '<span class="cs-note">' + esc(L.d) + "</span>" +
      '<span class="cs-cnt">从第 ' + from + " 环开始</span></div>";
  }

  function ringHTML(nodes, i, state, idxOf) {
    var n = nodes[i], a = n.a, d = n.d, L = diffLevel(d.level);
    var col = colorFor(a.category || "未分类");
    var no = i + 1;
    var m = masteryOf(a.id);
    var inner = state === "done" ? ico("check", 23)
      : (state === "locked" ? ico("lock", 17) : "<span>" + no + "</span>");
    var short = a.title.replace(/^[^·]*·\s*/, "");
    var mName = MASTERY[m] ? MASTERY[m].name : "未接触";

    var rel = relatedOf(a);
    var relHTML = rel.length
      ? '<div class="cc-rel"><span class="ccr-lb">' + ico("link", 12) + " 关联</span>" +
        rel.map(function (r) {
          return '<span class="ccr-chip" data-action="open-article" data-id="' + esc(r.id) + '">' +
            esc(r.title.replace(/^[^·]*·\s*/, "")) + "</span>";
        }).join("") + "</div>"
      : "";

    var prevT = n.prev ? findArticle(n.prev) : null;
    var prevNo = n.prev && idxOf[n.prev] ? idxOf[n.prev] : 0;
    var ops = '<div class="cc-ops">';
    if (state === "locked") {
      ops += '<span class="cc-lockhint">' + ico("lock", 13) + " 需先完成第 " + prevNo + " 环" +
        (prevT ? "《" + esc(prevT.title.replace(/^[^·]*·\s*/, "")) + "》" : "") + "</span>" +
        '<button type="button" class="btn sm" data-action="chain-unlock" data-id="' + esc(a.id) + '">' +
        ico("unlock", 13) + " 强制解锁</button>";
    } else {
      ops += '<button type="button" class="btn sm' + (state === "done" ? "" : " primary") +
        '" data-action="open-article" data-id="' + esc(a.id) + '">' + ico("doc", 13) +
        (state === "done" ? " 再读一遍" : (chain.open[a.id] && !ringDone(n.prev) ? " 学这一环" : " 开始学习")) +
        "</button>" +
        '<button type="button" class="btn sm' + (state === "done" ? " on" : "") +
        '" data-action="chain-done" data-id="' + esc(a.id) + '">' + ico("check", 13) +
        (state === "done" ? " 已完成" : " 标记完成") + "</button>";
      if (chain.open[a.id] && !ringDone(a.id)) ops += '<span class="cc-tag-ok">手动解锁</span>';
    }
    ops += "</div>";

    return '<div class="crow ' + state + '" data-state="' + state + '" data-id="' + esc(a.id) + '">' +
      '<div class="crail"><span class="cnode">' + inner + "</span>" +
        (i < nodes.length - 1 ? '<span class="cseg"></span>' : "") + "</div>" +
      '<div class="ccard">' +
        '<div class="cc-head">' +
          '<span class="cc-no">第 ' + no + " 环</span>" +
          "<h3>" + esc(a.title) + "</h3>" +
          '<span class="cc-diff" style="--c:' + L.c + '">' + starsHTML(d.level, L.c) + " " + L.name + "</span>" +
        "</div>" +
        '<div class="cc-meta">' +
          '<span class="cc-cat"><i style="background:' + catColor(a.category || "未分类") + '"></i>' + esc(a.category || "未分类") + "</span>" +
          "<span>" + a.wordCount + " 字</span>" +
          "<span>约 " + Math.max(1, Math.round((a.wordCount || 0) / 350)) + " 分钟</span>" +
          "<span>掌握度：" + mName + "</span>" +
          '<span class="cc-dwhy" title="' + esc(diffWhy(a, d)) + '">' + ico("think", 12) + " 难度依据</span>" +
        "</div>" +
        relHTML + ops +
      "</div></div>";
  }

  function chainBodyHTML(nodes) {
    if (!nodes.length) return emptyHint("这条链还没有内容");
    var idxOf = {}, states = [], divs = {}, maxSeen = 0;
    nodes.forEach(function (n, i) {
      idxOf[n.a.id] = i + 1;
      states.push(ringState(nodes, i));
      // 只在难度「创新高」时开一个新阶段：跨学科混排后难度会反复升降，
      // 若按等级变化分段会切出二十多段，反而看不出由易到难的主线。
      if (n.d.level > maxSeen) { divs[i] = n.d.level; maxSeen = n.d.level; }
    });
    var h = '<div class="chain">';
    for (var i = 0; i < nodes.length; i++) {
      if (divs[i]) h += stageHTML(divs[i], i + 1);
      h += ringHTML(nodes, i, states[i], idxOf);
    }
    return h + "</div>";
  }

  var chainCat = null;
  function renderChain() {
    diffReset();
    var el = document.getElementById("app");
    if (!el) return;
    var nodes = chainNodes(chainCat);
    var st = chainStat(nodes);
    var h = pageHead("chain", "知识链", "由易到难 · 一环扣一环，学完一环解锁下一环", "") +
      chainTabsHTML();
    if (chainCat === null && nodes.length) h += miniChainsHTML();
    h += chainHeroHTML(nodes, st);
    if (nodes.length) h += ladderHTML(nodes);
    h += chainBodyHTML(nodes);
    el.innerHTML = h;
  }

  function chainAsideHTML() {
    var nodes = chainNodes(chainCat);
    var st = chainStat(nodes);
    var dist = [0, 0, 0, 0, 0];
    nodes.forEach(function (n) { dist[Math.max(0, Math.min(4, n.d.level - 1))]++; });
    var h = '<div class="aside-card"><h4>知识链 <a data-action="chain">看全站 →</a></h4>' +
      '<div class="set-row" style="padding:5px 0"><div class="info">当前链</div><div class="meta">' + esc(chainLabel()) + "</div></div>" +
      '<div class="set-row" style="padding:5px 0"><div class="info">环数</div><div class="meta">' + st.total + " 环</div></div>" +
      '<div class="set-row" style="padding:5px 0"><div class="info">已完成</div><div class="meta">' + st.done + " 环 · " + st.pct + "%</div></div>" +
      '<div class="set-row" style="padding:5px 0"><div class="info">当前可学</div><div class="meta">' + st.active + " 环</div></div>" +
      '<div class="hint" style="margin:8px 0 0">' +
        (chain.strict ? "严格串联：完成一环才解锁下一环。" : "自由学习：所有环都可直接学。") + "</div></div>";
    h += '<div class="aside-card"><h4>难度分级</h4>' +
      DIFF_LEVELS.map(function (L, i) {
        return '<div class="set-row" style="padding:4px 0"><div class="info">' +
          '<span class="diff-dot" style="background:' + L.c + '"></span>' + L.name +
          '</div><div class="meta">' + dist[i] + " 环</div></div>";
      }).join("") + "</div>";
    var others = getCategories().filter(function (c) { return c.name !== chainCat; }).slice(0, 6);
    if (others.length) {
      h += '<div class="aside-card"><h4>其他学科链</h4>' +
        others.map(function (c) {
          var s2 = chainStat(chainNodes(c.name));
          return '<div class="nav-item" data-action="chain-cat" data-cat="' + esc(c.name) + '" style="font-size:12.5px;padding:5px 10px">' +
            '<span class="nav-dot" style="background:' + catColor(c.name) + '"></span>' +
            '<span class="ni-txt">' + esc(c.name) + "</span>" +
            '<span class="ni-cnt">' + s2.done + "/" + s2.total + "</span></div>";
        }).join("") + "</div>";
    }
    return h;
  }

  /* 把当前链存为学习路径 */
  function chainToPath() {
    var nodes = chainNodes(chainCat);
    if (!nodes.length) { toast("这条链还没有内容"); return; }
    var title = chainLabel() + " · 知识链";
    var p = {
      id: "path-" + Date.now(), title: title,
      desc: "由「知识链」生成（" + nodes.length + " 环，由易到难）",
      steps: nodes.map(function (n) { return n.a.id; }), doneMap: {}
    };
    paths.push(p); savePaths();
    toast("已生成学习路径：" + title);
    prevRoute = Object.assign({}, route);
    route = { view: "path", pathId: p.id };
    render();
  }
  function chainReset() {
    var nodes = chainNodes(chainCat);
    showModal({
      title: "重置知识链进度", danger: true, okText: "重置",
      body: '<p class="modal-hint">将清除「<b>' + esc(chainLabel()) + "</b>」这条链的 <b>" +
        nodes.length + '</b> 环的手动完成标记与解锁记录。<br>' +
        "注意：由掌握度（≥掌握）自动达成的完成状态<b>不受影响</b>。</p>",
      onOk: function () {
        nodes.forEach(function (n) { delete chain.done[n.a.id]; delete chain.open[n.a.id]; });
        saveChain(); render(); toast("已重置这条链的进度");
      }
    });
  }

  /* ---------- 学习分析 ---------- */
  function renderAnalytics() {
    var arts = allArticles();
    var cats = getCategories();
    var sum = arts.reduce(function (s, a) { return s + masteryOf(a.id); }, 0);
    var masteryPct = arts.length ? Math.round(sum / (arts.length * 3) * 100) : 0;
    var mastered = arts.filter(function (a) { return masteryOf(a.id) >= 2; }).length;
    var totalMin = 0;
    Object.keys(minutes).forEach(function (k) { totalMin += (minutes[k] || 0); });
    var right = practiceLog.filter(function (p) { return p.ok; }).length;
    var acc = practiceLog.length ? Math.round(right / practiceLog.length * 100) : 0;
    var due = dueCards().length;

    var metrics = [
      [arts.length, "篇笔记"],
      [masteryPct + "%", "整体掌握度"],
      [mastered + " / " + arts.length, "已掌握（≥掌握）"],
      [calcStreak() + " 天", "连续打卡"],
      [(Math.round(totalMin / 6) / 10) + " h", "累计专注"],
      [cards.length, "张闪卡"],
      [practiceLog.length ? acc + "%" : "—", "练习正确率"],
      [due, "张待复习"]
    ].map(function (m) {
      return '<div class="dsh-kpi-c"><span class="v">' + m[0] + '</span><span class="k">' + m[1] + "</span></div>";
    }).join("");

    var catRows = cats.map(function (c) {
      var segs = "";
      var pct = Math.round((c.m[1] + c.m[2] * 2 + c.m[3] * 3) / (c.count * 3) * 100);
      for (var l = 3; l >= 0; l--) {
        if (!c.m[l]) continue;
        segs += '<span style="width:' + (c.m[l] / c.count * 100) + "%;background:" + MASTERY[l].c +
          '" title="' + MASTERY[l].name + " " + c.m[l] + ' 篇"></span>';
      }
      return '<div class="an-row"><span class="an-label" title="' + esc(c.name) + '">' + esc(c.name) + "</span>" +
        '<span class="an-track">' + segs + '</span><span class="an-val">' + pct + "%</span></div>";
    }).join("");

    var hm = heatmapData();
    var last30 = hm.slice(-30);
    var maxN = 1;
    last30.forEach(function (d) { if (d.count > maxN) maxN = d.count; });
    var cols = last30.map(function (d, i) {
      var h = d.count ? Math.max(9, Math.round(d.count / maxN * 100)) : 4;
      return '<div class="an-col' + (i === last30.length - 1 ? " today" : "") + (d.count ? "" : " zero") +
        '" style="height:' + h + '%" title="' + d.key + "：" + d.count + ' 次"></div>';
    }).join("");
    var totalIn30 = last30.reduce(function (s, d) { return s + d.count; }, 0);

    var boxDist = [0, 0, 0, 0, 0, 0];
    cards.forEach(function (c) { boxDist[c.box] = (boxDist[c.box] || 0) + 1; });
    var boxMax = 1;
    boxDist.forEach(function (n) { if (n > boxMax) boxMax = n; });
    var boxNames = ["10 分钟", "1 天", "3 天", "7 天", "15 天", "30 天"];
    var boxRows = boxDist.map(function (n, i) {
      var col = i < 2 ? "var(--accent)" : i < 4 ? "var(--info)" : "var(--success)";
      return '<div class="an-row"><span class="an-label">' + boxNames[i] + "</span>" +
        '<span class="an-track"><span style="width:' + Math.round(n / boxMax * 100) + "%;background:" + col + '"></span></span>' +
        '<span class="an-val">' + n + "</span></div>";
    }).join("");

    document.getElementById("app").innerHTML =
      pageHead("chart", "学习分析", "每一次学习都有记录，数据全部来自本机", "") +
      '<div class="dsh-kpi an-kpi">' + metrics + "</div>" +
      '<div class="an-card"><h3>各分类掌握度<span>按掌握等级加权</span></h3><div class="an-bars">' +
        (catRows || '<div class="hint" style="margin:0">还没有分类数据</div>') + "</div>" +
        '<div class="an-legend">' + MASTERY.map(function (m) {
          return '<span><i style="background:' + m.c + '"></i>' + m.name + "</span>";
        }).join("") + "</div></div>" +
      '<div class="an-card"><h3>近 30 天学习活跃度<span>共 ' + totalIn30 + " 次</span></h3>" +
        (totalIn30 === 0 ? '<div class="hint" style="margin:0 0 10px">最近 30 天还没有学习记录 —— 打开笔记、调整掌握度、评分闪卡都会计入。</div>' : "") +
        '<div class="an-chart">' + cols + "</div>" +
        '<div class="an-xaxis"><span>' + (last30.length ? last30[0].key.slice(5) : "") + "</span><span>" +
        (last30.length ? last30[last30.length - 1].key.slice(5) : "") + "</span></div></div>" +
      '<div class="an-card"><h3>复习队列分布<span>共 ' + cards.length + ' 张闪卡</span></h3><div class="an-bars">' +
        (cards.length ? boxRows : '<div class="hint" style="margin:0">还没有闪卡，去笔记页点「生成闪卡」</div>') +
      "</div></div>";
  }

  /* ---------- AI 接口配置（独立页面） ---------- */

  /* 常见模型与服务商：兼容用 */
  var AI_COMMON = [
    { id: "deepseek-chat", label: "DeepSeek 对话" },
    { id: "deepseek-reasoner", label: "DeepSeek 推理" },
    { id: "qwen-plus", label: "通义千问 Plus" },
    { id: "qwen-turbo", label: "通义千问 Turbo" },
    { id: "moonshot-v1-8k", label: "Kimi 8K" },
    { id: "glm-4-flash", label: "智谱 GLM-4" },
    { id: "gpt-4o-mini", label: "OpenAI 4o-mini" },
    { id: "llama3.1", label: "本地 Ollama" }
  ];

  function aiModelsUrl(base) {
    var b = String(base === undefined ? aiCfg.base : base || "").replace(/\/+$/, "");
    if (!b) b = "https://api.deepseek.com/v1";
    return b + "/models";
  }
  /* 依次尝试几个候选地址，兼容 base 里没写 /v1 的情况 */
  function modelsUrlCandidates(base) {
    var b = String(base || "").replace(/\/+$/, "");
    if (!b) b = "https://api.deepseek.com/v1";
    var out = [b + "/models"];
    if (!/\/v\d+$/i.test(b)) {
      out.push(b + "/v1/models");
      out.push(b.replace(/\/api$/i, "") + "/v1/models");
    }
    var uniq = [];
    out.forEach(function (u) { if (uniq.indexOf(u) < 0) uniq.push(u); });
    return uniq;
  }
  /* 服务商返回的形状五花八门，统一成 [{id, owner}] */
  function parseModelList(j) {
    var arr = [];
    if (!j) return arr;
    if (Array.isArray(j)) arr = j;
    else if (Array.isArray(j.data)) arr = j.data;
    else if (Array.isArray(j.models)) arr = j.models;
    else if (j.data && Array.isArray(j.data.models)) arr = j.data.models;
    else if (Array.isArray(j.result)) arr = j.result;
    var out = [], seen = {};
    arr.forEach(function (it) {
      var id = "", owner = "";
      if (typeof it === "string") id = it;
      else if (it && typeof it === "object") {
        id = it.id || it.model || it.name || it.slug || "";
        owner = it.owned_by || it.owner || it.provider || "";
      }
      id = String(id).trim();
      if (!id || seen[id]) return;
      seen[id] = 1;
      out.push({ id: id, owner: String(owner || "").trim() });
    });
    out.sort(function (x, y) { return x.id.localeCompare(y.id); });
    return out;
  }
  function saveFetched() { localStorage.setItem(STORE_AI_FETCH, JSON.stringify(aiFetched)); }
  function saveModels() { localStorage.setItem(STORE_AI_MODELS, JSON.stringify(aiModels)); }

  /* 把模型列表写进预设（去重），返回新增数量 */
  function writeModelsToPresets(list, wipe) {
    if (wipe) aiModels = [];
    var have = {};
    aiModels.forEach(function (m) { if (m && m.model) have[m.model] = 1; });
    var n = 0;
    (list || []).forEach(function (m) {
      if (!m || !m.id || have[m.id]) return;
      have[m.id] = 1;
      aiModels.push({ name: m.id, model: m.id });
      n++;
    });
    saveModels();
    return n;
  }

  /* 一键获取模型：先存配置 → 请求 /models → 写入模型库 + 预设 */
  function aiFetchModels() {
    if (aiFetchBusy) return;
    var baseEl = document.getElementById("aiBase");
    var keyEl = document.getElementById("aiKey");
    var mdlEl = document.getElementById("aiModel");
    var base = ((baseEl && baseEl.value) || aiCfg.base || "").trim();
    var key = ((keyEl && keyEl.value) || aiCfg.key || "").trim();
    if (mdlEl && (mdlEl.value || "").trim()) aiCfg.model = (mdlEl.value || "").trim();
    if (base) aiCfg.base = base;
    aiCfg.key = key;
    if (!key) { aiFetchErr = "还没有填 API Key —— 填好再点一次就能获取。"; aiFetchNote = ""; render(); return; }
    aiSave();
    aiFetchBusy = true; aiFetchErr = ""; aiFetchNote = "";
    render();
    var urls = modelsUrlCandidates(base), tried = [];
    function tryAt(i, lastErr) {
      if (i >= urls.length) return Promise.reject(lastErr || new Error("请求失败"));
      var u = urls[i];
      tried.push(u);
      return fetch(u, {
        method: "GET",
        headers: { "Authorization": "Bearer " + key, "Accept": "application/json" }
      }).then(function (r) {
        if (!r.ok) {
          return r.text().then(function (t) {
            var e = new Error("HTTP " + r.status + " · " + String(t).replace(/\s+/g, " ").slice(0, 160));
            if (r.status === 404 && i + 1 < urls.length) return tryAt(i + 1, e);
            throw e;
          });
        }
        return r.json().then(function (j) {
          var list = parseModelList(j);
          if (!list.length) {
            var e2 = new Error("接口有响应，但里面没有可识别的模型列表");
            if (i + 1 < urls.length) return tryAt(i + 1, e2);
            throw e2;
          }
          return { list: list, url: u };
        });
      }, function (err) {
        if (i + 1 < urls.length) return tryAt(i + 1, err);
        throw err;
      });
    }
    tryAt(0, null).then(function (res) {
      aiFetched = { at: Date.now(), base: String(aiCfg.base || ""), url: res.url, list: res.list };
      saveFetched();
      var added = writeModelsToPresets(res.list, false);
      if (!aiCfg.model || !res.list.some(function (m) { return m.id === aiCfg.model; })) {
        aiCfg.model = res.list[0].id;
        aiSave();
      }
      aiFetchBusy = false;
      aiFetchNote = "已从 " + res.url + " 获取 " + res.list.length + " 个模型" +
        (added ? "，新增 " + added + " 个到预设" : "（预设已是最新）");
      recordActivity();
      render();
      toast("已获取 " + res.list.length + " 个模型");
    }).catch(function (err) {
      aiFetchBusy = false;
      var m = (err && err.message) ? err.message : String(err);
      if (/Failed to fetch|NetworkError|Load failed|Network request failed/i.test(m)) {
        m = "请求发不出去：可能是没联网，或该服务商不允许浏览器直接调用（跨域 CORS）。" +
            "换一个支持 CORS 的接口即可；需要的话我可以给你加一个本机代理小脚本。";
      } else if (/HTTP 401|HTTP 403/.test(m)) {
        m = "密钥被拒绝（" + m + "）：确认 Key 没写错、没过期，且与 Base URL 属于同一家服务商。";
      } else if (/HTTP 404/.test(m) && tried.length) {
        m = "地址找不到模型列表接口：" + tried.join(" → ") + "。检查 Base URL 是否漏了路径（如 /v1）。";
      }
      aiFetchErr = m;
      render();
    });
  }

  /* 用一个极小请求验证「密钥 + 模型名」真的能用 */
  function aiTestConn() {
    var mo = ((document.getElementById("aiModel") || {}).value || aiCfg.model || "").trim();
    if (mo) aiCfg.model = mo;
    if (!aiCfg.key) { toast("先填 API Key"); return; }
    aiSave();
    aiCfgTest = "测试中…"; render();
    var t0 = Date.now();
    aiCallEx([{ role: "user", content: "回复两个字：正常" }], 0).then(function (reply) {
      aiCfgTest = "连接成功 · " + aiCfg.model + " · " + (Date.now() - t0) + "ms · 返回「" + String(reply).trim().slice(0, 30) + "」";
      render();
    }).catch(function (err) {
      var m = (err && err.message) ? err.message : String(err);
      if (/Failed to fetch|NetworkError/i.test(m)) m = "请求失败：没联网或服务商不支持浏览器直连（CORS）。";
      aiCfgTest = "测试失败 · " + m;
      render();
    });
  }

  function aiModelPickHTML() {
    var cur = aiCfg.model || "";
    var h = "";
    AI_COMMON.forEach(function (c) {
      h += '<button type="button" class="mdl-quick' + (c.id === cur ? " on" : "") +
        '" data-action="ai-use-model" data-m="' + esc(c.id) + '" title="' + esc(c.id) + '">' + esc(c.label) + "</button>";
    });
    return h;
  }

  function renderAIConfig() {
    var keyShown = !!window.__aiKeyShow;
    var keyVal = esc(aiCfg.key || "");
    var list = (aiFetched.list || []);
    var cur = aiCfg.model || "";

    var state = aiFetchBusy
      ? '<span class="cfg-state busy"><i class=ic data-ico=refresh></i> 正在请求 ' + esc(aiModelsUrl()) + " …</span>"
      : aiFetchErr
        ? '<span class="cfg-state bad"><i class=ic data-ico=warn></i> ' + esc(aiFetchErr) + "</span>"
        : aiFetchNote
          ? '<span class="cfg-state ok"><i class=ic data-ico=check></i> ' + esc(aiFetchNote) + "</span>"
          : (list.length
            ? '<span class="cfg-state ok"><i class=ic data-ico=check></i> 模型库已有 ' + list.length + " 个（" + fmtWhen(aiFetched.at) + "获取）</span>"
            : '<span class="cfg-state mut"><i class=ic data-ico=bulb></i> 还没获取过模型。填好 Base URL 与 Key，点「一键获取模型」即可把该密钥可用的模型全部拉下来。</span>');

    var rows = list.map(function (m) {
      var on = m.id === cur;
      return '<div class="mdl-row' + (on ? " on" : "") + '" data-mv="' + esc(m.id.toLowerCase()) + '">' +
        '<div class="mdl-main"><strong>' + esc(m.id) + "</strong>" +
          (m.owner ? '<span class="mdl-owner">' + esc(m.owner) + "</span>" : "") + "</div>" +
        (on ? '<span class="mdl-cur"><i class=ic data-ico=check></i> 当前</span>' : "") +
        (on ? "" : '<button class="btn sm" data-action="ai-use-model" data-m="' + esc(m.id) + '">使用</button>') +
        "</div>";
    }).join("");

    var presetRows = aiModels.length
      ? aiModels.map(function (m, i) {
          return '<div class="mdl-row" data-mv="' + esc(String(m.model).toLowerCase()) + '">' +
            '<div class="mdl-main"><strong>' + esc(m.name || m.model) + "</strong>" +
              (m.name && m.name !== m.model ? '<span class="mdl-owner">' + esc(m.model) + "</span>" : "") + "</div>" +
            (m.model === cur ? '<span class="mdl-cur"><i class=ic data-ico=check></i> 当前</span>'
                             : '<button class="btn sm" data-action="ai-use-model" data-m="' + esc(m.model) + '">使用</button>') +
            '<button class="btn sm danger" data-action="del-model" data-i="' + i + '" title="从预设移除"><i class=ic data-ico=trash></i></button>' +
            "</div>";
        }).join("")
      : emptyHint("预设为空。可一键获取模型，或手工加一个。");

    document.getElementById("app").innerHTML =
      '<div class="breadcrumb"><a data-action="home">首页</a> / <i class=ic data-ico=key></i> AI 接口配置</div>' +
      pageHead("key", "AI 接口配置", "密钥只保存在本机浏览器，不上传任何服务器",
        '<span class="badge">' + (aiCfg.key ? "已配置 · " + esc(aiCfg.model) : "未配置密钥") + "</span>") +

      '<div class="cfg-grid">' +
        '<div class="set-card"><h3><i class=ic data-ico=plug></i> 接口与密钥</h3>' +
          '<p class="hint">密钥只保存在你本机浏览器（localStorage），不会上传到任何地方。分享站点文件前请先点「清除密钥」。支持任何 OpenAI 兼容接口（DeepSeek / 通义 / Kimi / 智谱 / OpenAI / 本机 Ollama…）。不配置也不影响其它功能。</p>' +
          '<label class="cfg-field"><span>API Base URL</span>' +
            '<input id="aiBase" class="ed-input" placeholder="https://api.deepseek.com/v1" value="' + esc(aiCfg.base || "") + '"></label>' +
          '<label class="cfg-field"><span>API Key</span>' +
            '<span class="cfg-keyrow"><input id="aiKey" class="ed-input" type="' + (keyShown ? "text" : "password") + '" placeholder="sk-..." value="' + keyVal + '" autocomplete="off" spellcheck="false">' +
            '<button class="btn sm" data-action="ai-toggle-key" title="显示 / 隐藏">' + (keyShown ? "隐藏" : "显示") + "</button></span></label>" +
          '<label class="cfg-field"><span>当前模型</span>' +
            '<input id="aiModel" class="ed-input" placeholder="deepseek-chat" value="' + esc(cur) + '"></label>' +
          '<div class="ed-toolbar">' +
            '<button class="btn primary" data-action="save-ai"><i class=ic data-ico=save></i> 保存配置</button>' +
            '<button class="btn" data-action="ai-test"><i class=ic data-ico=plug></i> 测试连接</button>' +
            '<button class="btn danger" data-action="clear-ai"><i class=ic data-ico=trash></i> 清除密钥</button>' +
          "</div>" +
          (aiCfgTest ? '<div class="cfg-test' + (/成功/.test(aiCfgTest) ? " ok" : /测试中/.test(aiCfgTest) ? " busy" : " bad") + '">' + esc(aiCfgTest) + "</div>" : "") +
        "</div>" +

        '<div class="set-card"><h3><i class=ic data-ico=star></i> 常用模型</h3>' +
          '<p class="hint">点一下即切换为当前模型（会立刻保存）。下面这些只是快捷入口，不限于此——用「一键获取模型」可以拉出你密钥下全部可用模型。</p>' +
          '<div class="mdl-quicks">' + aiModelPickHTML() + "</div>" +
          '<div class="set-row" style="margin-top:12px"><div class="info">当前生效模型<div class="meta">' + esc(cur) + "</div></div>" +
            '<div class="meta" style="color:var(--success)">' + (aiCfg.key ? "密钥已配置" : "缺密钥") + "</div></div>" +
          '<div class="set-row"><div class="info">接口地址<div class="meta">' + esc(aiCfg.base || "（空）") + "</div></div></div>" +
          '<div class="set-row"><div class="info">模型列表接口<div class="meta">' + esc(aiModelsUrl()) + "</div></div></div>" +
        "</div>" +
      "</div>" +

      '<div class="set-card cfg-lib"><h3><i class=ic data-ico=list></i> 模型库 <span class="cfg-cnt">' +
        (list.length ? list.length + " 个" : "未获取") + "</span></h3>" +
        '<div class="cfg-tools">' +
          /* 「一键获取模型」是全站少数的真实网络长任务：除 disabled 外
             再挂上 is-loading / aria-busy，让早已定义好的加载态真正生效 */
          '<button class="btn primary' + (aiFetchBusy ? " is-loading" : "") + '" data-action="ai-fetch-models"' +
            (aiFetchBusy ? ' disabled aria-busy="true"' : "") + ">" +
            '<i class=ic data-ico=' + (aiFetchBusy ? "refresh" : "download") + "></i> " +
            (aiFetchBusy ? "获取中…" : (list.length ? "重新获取模型" : "一键获取模型")) + "</button>" +
          (list.length ? '<button class="btn" data-action="ai-write-presets"><i class=ic data-ico=save></i> 全部写入预设</button>' : "") +
          (list.length ? '<span class="cfg-search"><i class=ic data-ico=search2></i><input id="mdlFilter" class="ed-input" placeholder="按名称筛选，如 qwen / reasoner"></span>' : "") +
        "</div>" +
        state +
        (list.length ? '<div class="mdl-list" id="mdlList">' + rows + "</div>" +
          '<div class="mdl-none" id="mdlNone" style="display:none">没有匹配的模型</div>'
          : "") +
      "</div>" +

      '<div class="set-card"><h3><i class=ic data-ico=puzzle></i> 已保存的模型预设 <span class="cfg-cnt">' + aiModels.length + " 个</span></h3>" +
        '<p class="hint">预设会出现在 AI 辅导页顶部的下拉里，用于快速切换。「一键获取模型」会把拉到的模型自动写进这里。</p>' +
        '<div class="mdl-list mdl-compact" id="presetList">' + presetRows + "</div>" +
        '<div class="ed-row" style="margin-top:10px"><input id="mdName" class="ed-input" placeholder="显示名，如 深度思考">' +
          '<input id="mdModel" class="ed-input" placeholder="模型名，如 deepseek-reasoner"></div>' +
        '<div class="ed-toolbar"><button class="btn primary" data-action="add-model"><i class=ic data-ico=plus></i> 手工添加</button>' +
          (aiModels.length ? '<button class="btn danger" data-action="ai-clear-presets"><i class=ic data-ico=trash></i> 清空预设</button>' : "") +
        "</div>" +
      "</div>";

    var fi = document.getElementById("mdlFilter");
    if (fi) {
      fi.addEventListener("input", function () {
        var q = String(this.value || "").trim().toLowerCase();
        ["mdlList", "presetList"].forEach(function (id) {
          var box = document.getElementById(id);
          if (!box) return;
          var rows2 = box.querySelectorAll(".mdl-row"), hit = 0;
          for (var i = 0; i < rows2.length; i++) {
            var ok = !q || (rows2[i].getAttribute("data-mv") || "").indexOf(q) >= 0;
            rows2[i].style.display = ok ? "" : "none";
            if (ok) hit++;
          }
          if (id === "mdlList") {
            var none = document.getElementById("mdlNone");
            if (none) none.style.display = hit ? "none" : "";
          }
        });
      });
    }
  }
  function fmtWhen(ts) {
    if (!ts) return "";
    var d = new Date(ts);
    function p(n) { return (n < 10 ? "0" : "") + n; }
    return (d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes());
  }

  /* ---------- 设置 ---------- */
  function renderSettings() {
    var raw = allArticlesRaw();
    var delCount = raw.filter(function (a) { return isDeleted(a.id); }).length;
    var rows = raw.map(function (a) {
      var d = isDeleted(a.id);
      return '<div class="set-row"><div class="info"><span class="badge">' + esc(a.category || "未分类") + "</span> " +
        "<strong>" + esc(a.title) + "</strong>" + (d ? ' <span class="review-flag">已删除</span>' : "") + "</div>" +
        (d ? '<button class="btn" data-action="restore-article" data-id="' + esc(a.id) + '">↩ 恢复</button>'
           : '<button class="btn danger" data-action="delete-article" data-id="' + esc(a.id) + '"><i class=ic data-ico=trash></i> 删除</button>') + "</div>";
    }).join("");
    document.getElementById("app").innerHTML =
      '<div class="breadcrumb"><a data-action="home">首页</a> / <i class=ic data-ico=cog></i> 设置</div>' +
      pageHead("cog", "设置", "外观、数据与备份，全部只动本机", "") +
      '<div class="settings">' +
        '<div class="set-card"><h3><i class=ic data-ico=palette></i> 外观</h3>' +
          '<p class="hint">配色决定中性色与强调色，明暗决定两套成对的亮度。' +
          '四套配色都过同一组对比度与语义断言——换的是底色，不换的是秩序。</p>' +
          '<div class="theme-grid">' + PALETTES.map(function (p) {
            return '<button class="theme-chip' + (p.id === palette ? " on" : "") + '"' +
              ' data-action="set-palette" data-id="' + p.id + '" title="' + esc(p.desc) + '">' +
              '<b>' + esc(p.name) + '</b><i>' + esc(p.desc) + "</i></button>";
          }).join("") + "</div>" +
          '<div class="mode-row">' + MODES.map(function (m) {
            return '<button class="btn' + (m.id === modePref ? " primary" : "") + '"' +
              ' data-action="set-mode" data-id="' + m.id + '"><i class=ic data-ico=' + m.i + "></i> " +
              esc(m.name) + "</button>";
          }).join("") + "</div></div>" +
        '<div class="set-card"><h3><i class=ic data-ico=doc></i> 正文排版</h3>' +
          '<p class="hint">只影响笔记正文。界面刻度（导航 / 标签 / 数值）不跟着动——' +
          '「终端语言只铺框架，正文保可读」。默认值与改版前完全一致，不动这几个滑块就不会有变化。</p>' +
          typeRow("fs", "正文字号", 14, 20, 0.5) +
          typeRow("lh", "行高", 1.5, 2.2, 0.05) +
          typeRow("ls", "字间距", 0, 1.5, 0.05) +
          typeSelect("gap", "段落间距", [[8, "紧凑"], [12, "标准"], [20, "宽松"]]) +
          typeSelect("w", "版心宽度", [[660, "窄 · 久读省眼力"], [800, "标准"], [940, "宽 · 公式多"]]) +
          '<div class="ed-toolbar"><button class="btn" data-action="reset-type"' +
            (typeIsDefault() ? " disabled" : "") + '><i class=ic data-ico=refresh></i> 恢复默认</button>' +
            '<span class="meta">' + (typeIsDefault() ? "当前即默认" : "已自定义（仅本机）") + "</span></div></div>" +
        '<div class="set-card"><h3><i class=ic data-ico=key></i> 键盘快捷键</h3>' +
          '<p class="hint">不用离开键盘就能走完常用动作。输入框里打字时不会被抢。</p>' +
          [["⌘ / Ctrl + K", "命令面板：搜索一切动作与笔记"],
           ["⌘ / Ctrl + 1…5", "切到前五个导航：首页 / 全部笔记 / 知识链 / 今日复习 / 复习看板"],
           ["⌘ / Ctrl + N", "快速新建笔记（浏览器若占用此键，改用 ⌘K → 新建笔记）"],
           ["⌘ / Ctrl + F", "笔记页内查找（仅文章页生效）"],
           ["Esc", "关掉最上层：弹窗 → 命令面板 → AI 抽屉 → 查找栏 → 朗读条"]]
          .map(function (r) {
            return '<div class="set-row kbd-row"><div class="info">' + esc(r[1]) + "</div>" +
              '<kbd class="kbd">' + esc(r[0]) + "</kbd></div>";
          }).join("") + "</div>" +
        '<div class="set-card"><h3><i class=ic data-ico=chart></i> 学习数据</h3>' +
          '<div class="set-row"><div class="info">笔记总数</div><div class="meta">' + raw.length + " 篇</div></div>" +
          '<div class="set-row"><div class="info">闪卡总数</div><div class="meta">' + cards.length + " 张</div></div>" +
          '<div class="set-row"><div class="info">已删除（隐藏）</div><div class="meta">' + delCount + " 篇</div></div>" +
          '<div class="set-row"><div class="info">连续打卡</div><div class="meta">' + calcStreak() + " 天</div></div>" +
          '<div class="set-row"><div class="info">今日专注</div><div class="meta">' + todayMinutes() + " 分钟</div></div></div>" +
        '<div class="set-card"><h3><i class=ic data-ico=target></i> 学习目标</h3>' +
          '<p class="hint">设定每天完成几次学习动作（打开笔记、改掌握度、评分闪卡都算），首页会显示完成进度。</p>' +
          '<div class="ed-row"><input id="goalInput" class="ed-input" type="number" min="1" max="100" aria-label="每日学习目标次数" value="' + goal + '">' +
          '<button class="btn primary" data-action="save-goal">保存目标</button></div></div>' +
        '<div class="set-card"><h3><i class=ic data-ico=save></i> 数据备份</h3>' +
          '<p class="hint">所有学习记录（闪卡、掌握度、打卡、笔记、路径）都存在本机浏览器里。清缓存或换设备会丢失，建议定期导出备份。</p>' +
          '<div class="ed-toolbar"><button class="btn primary" data-action="backup-export"><i class=ic data-ico=download></i> 导出备份</button>' +
          '<button class="btn" data-action="backup-import"><i class=ic data-ico=upload></i> 导入备份</button>' +
          '<button class="btn" data-action="exp-all"><i class=ic data-ico=doc></i> 导出全部笔记（Markdown）</button></div></div>' +
        '<div class="set-card"><h3><i class=ic data-ico=key></i> AI 接口配置</h3>' +
          '<p class="hint">密钥、接口地址、模型选择已移到独立页面（含「一键获取模型」：填好 Key 即可把该密钥可用的模型全部拉下来并写入预设）。</p>' +
          '<div class="set-row"><div class="info">当前状态</div>' +
            '<div class="meta" style="color:' + (aiCfg.key ? "var(--success)" : "var(--warn)") + '">' +
            (aiCfg.key ? "已配置 · " + esc(aiCfg.model) : "未配置密钥") + "</div></div>" +
          '<div class="set-row"><div class="info">已保存预设</div><div class="meta">' + aiModels.length + " 个</div></div>" +
          '<div class="set-row"><div class="info">模型库</div><div class="meta">' +
            ((aiFetched.list || []).length ? (aiFetched.list || []).length + " 个（" + fmtWhen(aiFetched.at) + "）" : "未获取") + "</div></div>" +
          '<div class="ed-toolbar"><button class="btn primary" data-action="aiconfig">' +
            '<i class=ic data-ico=key></i> 打开 AI 接口配置</button></div></div>' +
        '<div class="set-card"><h3><i class=ic data-ico=trash></i> 删除学习内容</h3>' +
          '<p class="hint">删除为「本地隐藏」，可随时在此恢复；若要从源文件彻底删除，请删除 content/ 下对应 .md 后重新运行 build.py。</p>' +
          (rows || emptyHint("暂无内容")) + "</div>" +
        (imported.length ? '<div class="set-card"><h3><i class=ic data-ico=upload></i> 导入管理</h3><div class="set-row">' +
          '<div class="info">浏览器内导入的笔记</div>' +
          '<button class="btn danger" data-action="clear-import">清空 ' + imported.length + " 篇</button></div></div>" : "") +
        '<div class="set-card danger-card"><h3><i class=ic data-ico=warn></i> 危险操作</h3>' +
          '<p class="hint">一键清空浏览器内的全部笔记（导入的 + 站内新建/编辑的 + 软删除记录），恢复为 <code>content/</code> 里的原始内容。此操作不可撤销，建议先导出备份。</p>' +
          '<div class="ed-toolbar">' +
            '<button class="btn" data-action="backup-export"><i class=ic data-ico=download></i> 先导出备份</button>' +
            '<button class="btn danger" data-action="clear-all-notes"><i class=ic data-ico=trash></i> 清空全部笔记</button>' +
          "</div></div>" +
      "</div>";
  }

  /* ---------- 工作台画布 ---------- */
  function renderCanvas() {
    document.getElementById("app").innerHTML =
      '<div class="breadcrumb"><a data-action="home">首页</a> / <i class=ic data-ico=palette></i> 工作台画布</div>' +
      pageHead("palette", "工作台画布", "手写 · 画图 · 随手记，松手自动保存", "") +
      '<div class="canvas-wrap"><div class="canvas-toolbar">' +
        '<input type="color" id="wbColor" value="#ffb000" title="画笔颜色">' +
        '<input type="range" id="wbSize" min="1" max="40" value="4" title="画笔粗细">' +
        '<button class="btn" id="wbEraser"><i class=ic data-ico=eraser></i> 橡皮擦</button>' +
        '<button class="btn danger" id="wbClear"><i class=ic data-ico=trash></i> 清空画布</button>' +
        '<span class="meta" id="wbHint">在画布上自由书写 / 画图，松手自动保存</span></div>' +
        '<div class="wb-stage">' +
          '<canvas id="wbCanvas" class="wb-canvas"></canvas>' +
          '<div class="wb-empty" id="wbEmpty">' +
            '<span class="wb-e-ico">' + ico("palette", 26) + '</span>' +
            '<strong>随手写、画草图、推导公式</strong>' +
            '<span>选好颜色与粗细，按住鼠标（或手指）直接写；松手自动保存，下次打开还在。</span>' +
          '</div>' +
        '</div>' +
        '<textarea id="wbNotes" class="wb-notes" placeholder="在这里记临时想法、待办、公式…（自动保存）"></textarea></div>';
    setupCanvas();
  }
  function setupCanvas() {
    var cv = document.getElementById("wbCanvas");
    if (!cv) return;
    cv.width = Math.max(320, cv.parentNode.clientWidth - 4);
    cv.height = 460;
    /* 空态与底纹不依赖 2D 上下文：先判定有没有存档，再尝试取上下文。
       这样即使取不到上下文（某些受限环境），引导与底纹依然在。 */
    var empty = document.getElementById("wbEmpty");
    var saved = localStorage.getItem(STORE_CANVAS);
    function showEmpty(on) { if (empty) empty.style.display = on ? "" : "none"; }
    showEmpty(!saved);

    var ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    if (saved) {
      var img = new Image();
      img.onload = function () { ctx.drawImage(img, 0, 0); };
      img.src = saved;
    }
    var drawing = false, erasing = false, last = null;
    function pos(e) {
      var r = cv.getBoundingClientRect();
      var p = (e.touches && e.touches[0]) ? e.touches[0] : e;
      return { x: (p.clientX - r.left) * (cv.width / r.width), y: (p.clientY - r.top) * (cv.height / r.height) };
    }
    function start(e) {
      drawing = true; last = pos(e); e.preventDefault();
      showEmpty(false);                       // 一动笔就收起空态引导
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", end);
    }
    function move(e) {
      if (!drawing) return;
      var p = pos(e);
      ctx.globalCompositeOperation = erasing ? "destination-out" : "source-over";
      ctx.strokeStyle = erasing ? "rgba(0,0,0,1)" : document.getElementById("wbColor").value;
      ctx.lineWidth = parseInt(document.getElementById("wbSize").value, 10);
      ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke();
      last = p; e.preventDefault();
    }
    function end() {
      if (!drawing) return;
      drawing = false;
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", end);
      try { localStorage.setItem(STORE_CANVAS, cv.toDataURL("image/png")); } catch (err) {}
    }
    cv.addEventListener("mousedown", start);
    cv.addEventListener("touchstart", start, { passive: false });
    cv.addEventListener("touchmove", move, { passive: false });
    cv.addEventListener("touchend", end);
    var eraserBtn = document.getElementById("wbEraser");
    eraserBtn.addEventListener("click", function () { erasing = !erasing; eraserBtn.classList.toggle("primary", erasing); });
    document.getElementById("wbClear").addEventListener("click", function () {
      if (confirm("确定清空画布？")) {
        ctx.clearRect(0, 0, cv.width, cv.height);
        localStorage.removeItem(STORE_CANVAS);
        showEmpty(true);
      }
    });
    var nt = document.getElementById("wbNotes");
    nt.value = localStorage.getItem(STORE_CANVAS_NOTES) || "";
    nt.addEventListener("input", function () { localStorage.setItem(STORE_CANVAS_NOTES, nt.value); });
  }

  /* ---------- 知识图谱 ---------- */
  /* ---------- 知识图谱（SVG · 力导向 · 可交互） ---------- */
  var SVGNS = "http://www.w3.org/2000/svg";
  var graphState = {
    sel: null, labels: "auto", hideIso: false, offCats: {},
    k: 1, tx: 0, ty: 0,
    nodes: [], edges: [], adj: {}, W: 0, H: 0,
    els: { nodes: {}, edges: [] }
  };
  /* 标签三档：全部 / 重点（枢纽节点）/ 关闭。节点多时默认「重点」，
     否则 103 个标签互相糊成一团。悬停或选中任一节点时它的标签始终可见。 */
  function graphLabelMode() {
    if (graphState.labels === "auto") return graphState.nodes.length > 60 ? "key" : "all";
    return graphState.labels;
  }
  function graphKeyDeg() { return 3; }
  /* 节点半径与标签纵坐标：碰撞检测与绘制必须用同一套公式，避免漂移 */
  function graphNodeR(n) { return 4.5 + Math.min(n.deg, 8) * 1.15; }
  function graphLabelY(n, r, up) { return up ? n.y - r - 6 : n.y + r + 14; }

  /* 标签防重叠：按连接度从高到低依次放置，与已占位矩形相交的压住不显示。
     分两档各算一次——「全部」档在所有标签之间避让，「重点」档只在枢纽之间避让，
     这样切到「重点」时不会因为「全部」档的碰撞而误伤。
     被压住的标签仍然生成，hover / 选中时可临时亮出。 */
  function graphLabelCollisions(nodes) {
    var FS = 10.5;
    function mkBox(n, i) {
      var r = graphNodeR(n);
      var t = displayTitle(n);
      if (t.length > 11) t = t.slice(0, 11) + "…";
      var w = 0;
      for (var k = 0; k < t.length; k++) w += (t.charCodeAt(k) > 0x2e80 ? 1 : 0.56);
      w *= FS;
      var y = graphLabelY(n, r, i % 2 === 1);
      /* 文字框：横向按估算宽度左右各留 2px，纵向覆盖基线以上一行 */
      return { id: n.id, x1: n.x - w / 2 - 2, x2: n.x + w / 2 + 2, y1: y - FS - 1.5, y2: y + 2.5 };
    }
    function place(list) {
      var kept = [], hid = {};
      list.slice().sort(function (a, b) {
        if (b.n.deg !== a.n.deg) return b.n.deg - a.n.deg;   // 连接度高的优先占位
        return a.i - b.i;
      }).forEach(function (it) {
        for (var k = 0; k < kept.length; k++) {
          var q = kept[k];
          if (it.b.x1 < q.x2 && it.b.x2 > q.x1 && it.b.y1 < q.y2 && it.b.y2 > q.y1) {
            hid[it.n.id] = 1;
            return;
          }
        }
        kept.push(it.b);
      });
      return hid;
    }
    var all = [], key = [];
    nodes.forEach(function (n, i) {
      var box = mkBox(n, i);
      all.push({ n: n, i: i, b: box });
      if (n.deg >= graphKeyDeg()) key.push({ n: n, i: i, b: box });
    });
    return { all: place(all), key: place(key) };
  }
  function graphLabelText() {
    var m = graphLabelMode();
    return "标签：" + (m === "all" ? "全部" : m === "key" ? "重点" : "关闭");
  }

  function svgNew(tag, attrs) {
    var e = document.createElementNS(SVGNS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  /* 抽取节点与边：边由笔记正文里的 [[标题]] 推导，双向去重 */
  function graphData() {
    var arts = allArticles();
    var titleToId = {};
    arts.forEach(function (a) { titleToId[a.title] = a.id; });
    var nodes = arts.map(function (a) {
      return { id: a.id, title: a.title, category: a.category || "未分类", deg: 0, x: 0, y: 0, vx: 0, vy: 0 };
    });
    var idx = {};
    nodes.forEach(function (n, i) { idx[n.id] = i; });
    var edges = [], seen = {};
    arts.forEach(function (a) {
      var src = (a.md || "") + (a.html || "");
      var re = /\[\[([^\]]+)\]\]/g, m;
      while ((m = re.exec(src))) {
        var tid = titleToId[m[1].trim()];
        if (!tid || tid === a.id) continue;
        var key = a.id < tid ? a.id + "|" + tid : tid + "|" + a.id;
        if (seen[key]) continue;
        seen[key] = 1;
        edges.push({ s: idx[a.id], t: idx[tid] });
      }
    });
    var adj = {};
    edges.forEach(function (e) {
      nodes[e.s].deg++; nodes[e.t].deg++;
      var si = nodes[e.s].id, ti = nodes[e.t].id;
      (adj[si] = adj[si] || []).push(ti);
      (adj[ti] = adj[ti] || []).push(si);
    });
    return { nodes: nodes, edges: edges, adj: adj };
  }

  /* 力导向布局：斥力 + 边弹簧 + 分类聚簇初始位 + 向心力 */
  function graphLayout() {
    var nodes = graphState.nodes, edges = graphState.edges;
    var W = graphState.W, H = graphState.H;
    var cats = getCategories().map(function (c) { return c.name; });
    var ci = {};
    cats.forEach(function (c, i) { ci[c] = i; });
    var nC = Math.max(1, cats.length);
    var n = nodes.length;
    nodes.forEach(function (nn, i) {
      var c = ci[nn.category] === undefined ? 0 : ci[nn.category];
      var ang = (c / nC) * Math.PI * 2 + (i % 4) * 0.26;
      var rad = Math.min(W, H) * 0.3 + (i % 3) * 30;
      nn.x = W / 2 + Math.cos(ang) * rad;
      nn.y = H / 2 + Math.sin(ang) * rad;
      nn.vx = 0; nn.vy = 0;
    });
    var rep = 3200 + n * 560;
    var springLen = 90 + n * 1.8;
    for (var it = 0; it < 480; it++) {
      for (var i = 0; i < nodes.length; i++) {
        for (var j = i + 1; j < nodes.length; j++) {
          var dx = nodes[j].x - nodes[i].x, dy = nodes[j].y - nodes[i].y;
          var d2 = dx * dx + dy * dy || 1, d = Math.sqrt(d2);
          var f = Math.min(rep / d2, 1.6);
          nodes[i].vx -= (dx / d) * f; nodes[i].vy -= (dy / d) * f;
          nodes[j].vx += (dx / d) * f; nodes[j].vy += (dy / d) * f;
        }
      }
      edges.forEach(function (e) {
        var a = nodes[e.s], b = nodes[e.t];
        var dx = b.x - a.x, dy = b.y - a.y;
        var d = Math.sqrt(dx * dx + dy * dy) || 1;
        var f = (d - springLen) * 0.015;
        a.vx += (dx / d) * f; a.vy += (dy / d) * f;
        b.vx -= (dx / d) * f; b.vy -= (dy / d) * f;
      });
      nodes.forEach(function (nn) {
        nn.vx += (W / 2 - nn.x) * 0.0016;
        nn.vy += (H / 2 - nn.y) * 0.0016;
        nn.x += Math.max(-13, Math.min(13, nn.vx));
        nn.y += Math.max(-13, Math.min(13, nn.vy));
        nn.vx *= 0.8; nn.vy *= 0.8;
      });
    }
    // 铺满画布：x / y 两轴分别缩放。
    // 力导向布局天生近似圆形，而画布是宽扁的「信箱」形状——等比缩放必然浪费左右两侧
    // （实测 103 节点时只用到画布 39% 的宽度）。这里按轴独立缩放，把版面真正铺开。
    if (nodes.length > 1) {
      var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      nodes.forEach(function (nn) {
        if (nn.x < minX) minX = nn.x;
        if (nn.x > maxX) maxX = nn.x;
        if (nn.y < minY) minY = nn.y;
        if (nn.y > maxY) maxY = nn.y;
      });
      var padX = 58, padY = 48;
      var sx = Math.min((W - padX * 2) / Math.max(1, maxX - minX), 4.5);
      var sy = Math.min((H - padY * 2) / Math.max(1, maxY - minY), 4.5);
      var cx0 = (minX + maxX) / 2, cy0 = (minY + maxY) / 2;
      nodes.forEach(function (nn) {
        nn.x = W / 2 + (nn.x - cx0) * sx;
        nn.y = H / 2 + (nn.y - cy0) * sy;
      });
    }
    // 碰撞分离：等比缩放之后再推开重叠节点，否则推开的间距会被缩放抵消
    for (var cpass = 0; cpass < 30; cpass++) {
      for (var ci = 0; ci < nodes.length; ci++) {
        for (var cj = ci + 1; cj < nodes.length; cj++) {
          var A = nodes[ci], B = nodes[cj];
          var ax = B.x - A.x, ay = B.y - A.y;
          var ad = Math.sqrt(ax * ax + ay * ay) || 0.01;
          var ra = 4.5 + Math.min(A.deg, 8) * 1.15, rb2 = 4.5 + Math.min(B.deg, 8) * 1.15;
          var minD = ra + rb2 + 12;
          if (ad < minD) {
            var push = (minD - ad) / 2;
            ax /= ad; ay /= ad;
            A.x -= ax * push; A.y -= ay * push;
            B.x += ax * push; B.y += ay * push;
          }
        }
      }
    }
    nodes.forEach(function (nn) {
      nn.x = Math.max(62, Math.min(W - 62, nn.x));
      nn.y = Math.max(44, Math.min(H - 50, nn.y));
    });
  }

  function renderGraph() {
    var d = graphData();
    graphState.nodes = d.nodes;
    graphState.edges = d.edges;
    graphState.adj = d.adj;
    graphState.els = { nodes: {}, edges: [] };
    if (graphState.sel) {
      var still = false;
      d.nodes.forEach(function (n) { if (n.id === graphState.sel) still = true; });
      if (!still) graphState.sel = null;
    }
    var iso = d.nodes.filter(function (n) { return n.deg === 0; }).length;
    var chips = getCategories().map(function (c) {
      var off = !!graphState.offCats[c.name];
      return '<button class="gp-chip' + (off ? "" : " on") + '" data-action="gp-cat" data-cat="' + esc(c.name) + '">' +
        '<i style="background:' + catColor(c.name) + '"></i>' + esc(c.name) +
        "<span>" + c.count + "</span></button>";
    }).join("");

    document.getElementById("app").innerHTML =
      pageHead("graph", "知识图谱", "按 [[双链]] 生成，点节点打开笔记",
        '<span class="badge">' + d.nodes.length + " 节点 · " + d.edges.length + " 连接" +
        (iso ? " · " + iso + " 孤立" : "") + "</span>") +
      '<div class="gp-toolbar">' +
        '<div class="gp-chips">' + (chips || '<span class="hint" style="margin:0">暂无分类</span>') + "</div>" +
        '<div class="gp-tools">' +
          '<button class="btn sm' + (graphLabelMode() !== "off" ? " primary" : "") +
            '" data-action="gp-labels" title="标签：全部 / 重点 / 关闭">' + graphLabelText() + "</button>" +
          '<button class="btn sm' + (graphState.hideIso ? " primary" : "") + '" data-action="gp-iso">隐藏孤立</button>' +
          '<button class="btn sm" data-action="gp-relayout">重新布局</button>' +
          '<button class="btn sm" data-action="gp-reset">重置视图</button>' +
        "</div>" +
      "</div>" +
      '<div class="gp-stage" id="gpStage">' +
        '<svg id="gpSvg" class="gp-svg"></svg>' +
        (d.edges.length ? "" : '<div class="gp-hint">还没有建立关联 · 在笔记正文里写 [[' + esc(d.nodes[0] ? d.nodes[0].title : "笔记标题") + ']] 即可生成连线</div>') +
        '<div class="gp-zoom">' +
          '<button class="icon-btn" data-action="gp-out" title="缩小">' + ico("minus", 14) + "</button>" +
          '<span id="gpZoom">100%</span>' +
          '<button class="icon-btn" data-action="gp-in" title="放大">' + ico("plus", 14) + "</button>" +
        "</div>" +
      "</div>";

    setupGraph();
  }

  function setupGraph() {
    var svg = document.getElementById("gpSvg");
    var stage = document.getElementById("gpStage");
    if (!svg || !stage) return;
    var W = Math.max(320, stage.clientWidth), H = Math.max(360, stage.clientHeight);
    graphState.W = W;
    graphState.H = H;
    graphLayout();

    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var g = svgNew("g", { id: "gpRoot" });
    svg.appendChild(g);

    graphState.edges.forEach(function (e) {
      var a = graphState.nodes[e.s], b = graphState.nodes[e.t];
      var ln = svgNew("line", {
        "class": "gp-edge", x1: a.x, y1: a.y, x2: b.x, y2: b.y,
        "data-s": a.id, "data-t": b.id
      });
      g.appendChild(ln);
      graphState.els.edges.push({ el: ln, s: a.id, t: b.id });
    });

    var coll = graphLabelCollisions(graphState.nodes);
    graphState.nodes.forEach(function (n, idx) {
      var r = graphNodeR(n);
      var grp = svgNew("g", { "class": "gp-node" + (n.deg === 0 ? " iso" : ""), "data-id": n.id });
      grp.appendChild(svgNew("circle", { cx: n.x, cy: n.y, r: r, fill: catColor(n.category), "data-r": r }));
      /* 标签全部生成，显隐交给 .lbl-* / .hid-* 类控制（这样 hover 时能临时亮出来） */
      var up = idx % 2 === 1;
      var cls = "gp-label" + (n.deg >= graphKeyDeg() ? " key" : "");
      if (coll.all[n.id]) cls += " hid-all";
      if (coll.key[n.id]) cls += " hid-key";
      var tx = svgNew("text", { "class": cls, x: n.x, y: graphLabelY(n, r, up) });
      var lbl = displayTitle(n);
      tx.textContent = lbl.length > 11 ? lbl.slice(0, 11) + "…" : lbl;
      grp.appendChild(tx);
      g.appendChild(grp);
      graphState.els.nodes[n.id] = grp;
      bindNode(grp, n);
    });

    applyView();
    applyCatFilter();
    applyLabelMode(svg);
    svg.classList.toggle("hide-iso", graphState.hideIso);
    bindStage(svg);
    if (graphState.sel) applyHighlight(graphState.sel);
  }
  function applyLabelMode(svg) {
    var el = svg || document.getElementById("gpSvg");
    if (!el) return;
    var m = graphLabelMode();
    el.classList.toggle("lbl-all", m === "all");
    el.classList.toggle("lbl-key", m === "key");
    el.classList.toggle("lbl-off", m === "off");
  }

  function applyView() {
    var root = document.getElementById("gpRoot");
    if (!root) return;
    root.setAttribute("transform",
      "translate(" + graphState.tx + "," + graphState.ty + ") scale(" + graphState.k + ")");
    var z = document.getElementById("gpZoom");
    if (z) z.textContent = Math.round(graphState.k * 100) + "%";
  }

  function applyCatFilter() {
    var vis = {};
    graphState.nodes.forEach(function (n) { vis[n.id] = !graphState.offCats[n.category]; });
    Object.keys(graphState.els.nodes).forEach(function (k) {
      graphState.els.nodes[k].style.display = vis[k] ? "" : "none";
    });
    graphState.els.edges.forEach(function (e) {
      e.el.style.display = (vis[e.s] && vis[e.t]) ? "" : "none";
    });
  }

  function updateNodePos(n) {
    var grp = graphState.els.nodes[n.id];
    if (!grp) return;
    var c = grp.firstChild, t = grp.lastChild;
    var r = parseFloat(c.getAttribute("data-r")) || 10;
    c.setAttribute("cx", n.x); c.setAttribute("cy", n.y);
    t.setAttribute("x", n.x); t.setAttribute("y", n.y + r + 14);
    graphState.els.edges.forEach(function (e) {
      if (e.s === n.id) { e.el.setAttribute("x1", n.x); e.el.setAttribute("y1", n.y); }
      else if (e.t === n.id) { e.el.setAttribute("x2", n.x); e.el.setAttribute("y2", n.y); }
    });
  }

  function applyHighlight(id) {
    var els = graphState.els, on = null;
    if (id) {
      on = {};
      on[id] = 1;
      (graphState.adj[id] || []).forEach(function (x) { on[x] = 1; });
    }
    Object.keys(els.nodes).forEach(function (k) {
      els.nodes[k].classList.toggle("dim", !!on && !on[k]);
      els.nodes[k].classList.toggle("sel", id === k);
    });
    els.edges.forEach(function (e) {
      var hit = !!id && (e.s === id || e.t === id);
      e.el.classList.toggle("dim", !!id && !hit);
      e.el.classList.toggle("on", hit);
    });
  }

  function selectGraphNode(id) {
    graphState.sel = (graphState.sel === id) ? null : id;
    applyHighlight(graphState.sel);
    renderAside();
  }
  function openGraphNode(id) {
    if (!findArticle(id)) { toast("找不到这篇笔记"); return; }
    graphState.sel = null;
    prevRoute = Object.assign({}, route);
    route = { view: "article", id: id };
    recordActivity();
    render();
    window.scrollTo(0, 0);
  }
  function graphZoom(f, cx, cy) {
    var k0 = graphState.k;
    var k1 = Math.max(0.35, Math.min(2.8, k0 * f));
    if (k1 === k0) return;
    if (cx === undefined) { cx = graphState.W / 2; cy = graphState.H / 2; }
    graphState.tx = cx - (cx - graphState.tx) * (k1 / k0);
    graphState.ty = cy - (cy - graphState.ty) * (k1 / k0);
    graphState.k = k1;
    applyView();
  }

  function bindNode(grp, n) {
    grp.addEventListener("pointerdown", function (ev) {
      ev.stopPropagation();
      var sx = ev.clientX, sy = ev.clientY, ox = n.x, oy = n.y, moved = false;
      function mv(e2) {
        var dx = (e2.clientX - sx) / graphState.k, dy = (e2.clientY - sy) / graphState.k;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
        n.x = ox + dx; n.y = oy + dy;
        updateNodePos(n);
      }
      function up() {
        document.removeEventListener("pointermove", mv);
        document.removeEventListener("pointerup", up);
        if (!moved) selectGraphNode(n.id);
      }
      document.addEventListener("pointermove", mv);
      document.addEventListener("pointerup", up);
    });
    grp.addEventListener("mouseenter", function () { if (!graphState.sel) applyHighlight(n.id); });
    grp.addEventListener("mouseleave", function () { if (!graphState.sel) applyHighlight(null); });
    grp.addEventListener("dblclick", function (e) { e.stopPropagation(); openGraphNode(n.id); });
  }

  function bindStage(svg) {
    svg.addEventListener("pointerdown", function (ev) {
      if (ev.target.closest && ev.target.closest(".gp-node")) return;
      var sx = ev.clientX, sy = ev.clientY, ox = graphState.tx, oy = graphState.ty, moved = false;
      function mv(e2) {
        var dx = e2.clientX - sx, dy = e2.clientY - sy;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
        graphState.tx = ox + dx; graphState.ty = oy + dy;
        applyView();
      }
      function up() {
        document.removeEventListener("pointermove", mv);
        document.removeEventListener("pointerup", up);
        if (!moved && graphState.sel) { graphState.sel = null; applyHighlight(null); renderAside(); }
      }
      document.addEventListener("pointermove", mv);
      document.addEventListener("pointerup", up);
    });
    svg.addEventListener("wheel", function (ev) {
      ev.preventDefault();
      var rect = svg.getBoundingClientRect();
      graphZoom(ev.deltaY < 0 ? 1.13 : 1 / 1.13, ev.clientX - rect.left, ev.clientY - rect.top);
    }, { passive: false });
  }

  function graphAsideHTML() {
    var n = null, i;
    for (i = 0; i < graphState.nodes.length; i++) if (graphState.nodes[i].id === graphState.sel) n = graphState.nodes[i];
    if (!n) {
      return '<div class="aside-card"><h4>图谱操作</h4>' +
        '<div class="hint" style="margin:0 0 8px">单击节点查看详情与关联，双击直接打开笔记。</div>' +
        '<div class="hint" style="margin:0">拖拽节点可调整位置 · 滚轮缩放 · 空白处拖拽平移</div></div>';
    }
    var rel = (graphState.adj[n.id] || []).map(function (id) {
      for (var k = 0; k < graphState.nodes.length; k++) if (graphState.nodes[k].id === id) return graphState.nodes[k];
      return null;
    }).filter(Boolean);
    var a = findArticle(n.id);
    var m = a ? masteryOf(a.id) : 0;
    var h = '<div class="aside-card"><h4>节点详情</h4>' +
      '<div style="font-size:15px;font-weight:600;line-height:1.4;margin-bottom:7px">' + esc(n.title) + "</div>" +
      '<div style="display:flex;align-items:center;gap:7px;font-size:12px;color:var(--text-soft);margin-bottom:11px;flex-wrap:wrap">' +
        '<span style="display:inline-flex;align-items:center;gap:5px"><span class="nav-dot" style="background:' + catColor(n.category) + '"></span>' + esc(n.category) + "</span>" +
        "<span>·</span><span>" + n.deg + " 条连接</span>" +
        '<span>·</span><span style="color:' + MASTERY[m].c + '">' + MASTERY[m].name + "</span>" +
      "</div>" +
      '<div class="ed-toolbar">' +
        '<button class="btn primary" data-action="gp-open" data-id="' + esc(n.id) + '">打开笔记</button>' +
        '<button class="btn" data-action="gp-unsel">取消选中</button>' +
      "</div></div>";
    if (rel.length) {
      h += '<div class="aside-card"><h4>关联笔记（' + rel.length + "）</h4>" + rel.map(function (r) {
        return '<div class="nav-item" data-action="gp-sel" data-id="' + esc(r.id) + '" style="font-size:12.5px;padding:5px 10px">' +
          '<span class="ni-ico">' + ico("link", 13) + '</span><span class="ni-txt">' + esc(r.title) + "</span></div>";
      }).join("") + "</div>";
    }
    return h;
  }

  function graphLegendHTML() {
    var cats = getCategories();
    if (!cats.length) return "";
    return '<div class="aside-card"><h4>分类图例</h4>' + cats.map(function (c) {
      return '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:4px 0;font-size:12.5px">' +
        '<span style="display:flex;align-items:center;gap:8px;min-width:0"><span class="nav-dot" style="background:' + catColor(c.name) + '"></span>' +
        '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(c.name) + "</span></span>" +
        '<span style="color:var(--text-soft);flex:none">' + c.count + "</span></div>";
    }).join("") + "</div>";
  }

  /* ---------- 主渲染 ---------- */
  function render() {
    document.getElementById("siteTitle").textContent = DATA.siteTitle || "我的学习知识库";
    document.title = DATA.siteTitle || "我的学习知识库";
    var backBtn = document.getElementById("backBtn");
    if (backBtn) backBtn.style.display = route.view === "home" ? "none" : "";
    renderSidebar();
    syncRailTitles();
    renderCrumb();
    /* 「继续上次」在这里落盘，不在 open-article 分发里 ——
       列表 / 图谱节点 / 双链 / 上一篇下一篇 / 命令面板 / 来源引用都汇到 render() 这一处，
       单点写入比在每个入口各写一次更不容易漏。 */
    if (route.view === "article") { saveLast(route.id); renderArticle(); startReadTimer(); }
    else {
      flushMinutes();
      if (ttsState.on) ttsStopAll();
      if (findState.on) findState = { on: false, hits: [], idx: -1 };
      if (route.view === "settings") renderSettings();
      else if (route.view === "canvas") renderCanvas();
      else if (route.view === "review") renderReview();
      else if (route.view === "board") renderBoard();
      else if (route.view === "cards") renderCards();
      else if (route.view === "editor") renderEditor();
      else if (route.view === "analytics") renderAnalytics();
      else if (route.view === "chain") renderChain();
      else if (route.view === "graph") renderGraph();
      else if (route.view === "ai") renderAI();
      else if (route.view === "aiconfig") renderAIConfig();
      else if (route.view === "practice") renderPractice();
      else if (route.view === "mistakes") renderMistakes();
      else if (route.view === "path") renderPathDetail();
      else if (route.view === "history") renderHistory();
      else if (route.view === "list" || query || route.category || route.tag) renderList();
      else renderHome();
    }
    renderAside();
    document.body.classList.toggle("reading", route.view === "article");
    updateScrollUI();
    decorate();
    renderDock();
  }

  /* ---------- 滚动相关 UI（阅读进度 + 回到顶部） ---------- */
  function updateScrollUI() {
    var d = document.documentElement;
    var max = d.scrollHeight - d.clientHeight;
    var pct = max > 8 ? Math.min(100, Math.max(0, (d.scrollTop / max) * 100)) : 0;
    var bar = document.getElementById("readBar");
    /* 用 scaleX 而不是 width：改 width 会让这一层在每次滚动时布局失效，
       transform 只走合成，长文页快速滚动时不再有布局抖动 */
    if (bar) bar.style.transform = "scaleX(" + (route.view === "article" ? pct / 100 : 0) + ")";
    var tt = document.getElementById("toTop");
    if (tt) tt.classList.toggle("show", d.scrollTop > 400);
  }
  /* 滚动事件按帧合并：一帧内多次 scroll 只做一次「读布局 → 写样式」，
     避免读写在同帧里反复穿插触发强制同步布局 */
  var scrollUIRaf = 0;
  function scheduleScrollUI() {
    if (scrollUIRaf) return;
    if (typeof requestAnimationFrame !== "function") { updateScrollUI(); return; }
    scrollUIRaf = requestAnimationFrame(function () { scrollUIRaf = 0; updateScrollUI(); });
  }

  /* ---------- 顶栏面包屑 ---------- */
  function crumbHTML() {
    var parts = ['<a data-action="home">首页</a>'];
    function push(t) { parts.push('<span class="sep">/</span>'); parts.push(t); }
    if (route.view === "list") {
      if (route.category) push('<span class="cur">' + esc(route.category) + "</span>");
      else if (route.tag) push('<span class="cur">#' + esc(route.tag) + "</span>");
      else if (query) push('<span class="cur">搜索：' + esc(query) + "</span>");
      else push('<span class="cur">全部笔记</span>');
    } else if (route.view === "article") {
      var a = findArticle(route.id);
      if (a) {
        push('<a data-action="open-category" data-cat="' + esc(a.category || "未分类") + '">' + esc(a.category || "未分类") + "</a>");
        push('<span class="cur">' + esc(displayTitle(a)) + "</span>");
      } else push('<span class="cur">笔记</span>');
    } else if (route.view === "path") {
      push('<span class="cur">学习路径</span>');
    } else if (route.view === "chain") {
      push('<a data-action="chain">知识链</a>');
      if (chainCat) push('<span class="cur">' + esc(chainCat) + '</span>');
    } else {
      var names = { review: "今日复习", cards: "闪卡库", practice: "AI 练习", ai: "AI 辅导",
        graph: "知识图谱", analytics: "学习分析", canvas: "工作台画布", settings: "设置",
        editor: "编辑笔记", history: "版本历史", aiconfig: "AI 接口配置", mistakes: "错题集" };
      if (names[route.view]) push('<span class="cur">' + names[route.view] + "</span>");
    }
    return parts.join("");
  }
  function renderCrumb() {
    var el = document.getElementById("crumb");
    if (el) el.innerHTML = crumbHTML();
  }

  /* ---------- 左侧导航 ---------- */
  function renderSidebar() {
    var el = document.getElementById("sidebar");
    if (!el) return;
    var due = dueCards().length;
    var revNotes = allArticles().filter(function (a) { return isReview(a.id); }).length;
    var v = route.view;

    function ni(act, ico, txt, extra, on, attrs) {
      return '<div class="nav-item' + (on ? " on" : "") + '" data-action="' + act + '"' + (attrs || "") + ">" +
        '<span class="ni-ico">' + ico + "</span>" +
        '<span class="ni-txt">' + esc(txt) + "</span>" + (extra || "") + "</div>";
    }
    var todo = due + revNotes;
    var badge = todo ? '<span class="nav-badge">' + todo + "</span>" : "";
    var cst = chainStat(chainNodes(null));
    var chainCnt = cst.total ? '<span class="ni-cnt">' + cst.done + "/" + cst.total + "</span>" : "";

    /* 侧栏分组。
       ① 「分类」一栏已按设计师要求去掉 —— 学科入口仍在首页分类卡与「全部笔记」的筛选里。
       ② 列表顺序**刻意保持不变**：⌘1…5 映射的就是前五项，命令面板的导航项也复用这里的
          data-action。所以只插分组标题，不动顺序，两处都不用跟着改。 */
    var h = '<div class="nav-label">学习</div>' +
      ni("home", ico("home"), "首页", "", v === "home") +
      ni("all-notes", ico("doc"), "全部笔记",
        '<span class="ni-cnt">' + allArticles().length + "</span>",
        v === "list" && !route.category && !route.tag && !query) +
      ni("chain", ico("chain"), "知识链", chainCnt, v === "chain") +
      '<div class="nav-label">复习</div>' +
      ni("review", ico("refresh"), "今日复习", badge, v === "review") +
      ni("board", ico("board"), "复习看板",
        (function () { var n = allArticles().filter(function (a) { return masteryOf(a.id) < 2; }).length;
          return n ? '<span class="ni-cnt">' + n + "</span>" : ""; })(), v === "board") +
      ni("cards", ico("cards"), "闪卡库", cards.length ? '<span class="ni-cnt">' + cards.length + "</span>" : "", v === "cards") +
      ni("practice", ico("target"), "AI 练习", "", v === "practice") +
      ni("mistakes", ico("warn"), "错题集",
        mis.list.length ? '<span class="ni-cnt">' + misDue().length + "/" + mis.list.length + "</span>" : "",
        v === "mistakes") +
      '<div class="nav-label">工具</div>' +
      ni("ai", ico("chat"), "AI 辅导", "", v === "ai") +
      ni("aiconfig", ico("key"), "AI 接口配置", aiCfg.key ? "" : '<span class="ni-cnt">!</span>', v === "aiconfig") +
      ni("graph", ico("graph"), "知识图谱", "", v === "graph") +
      ni("analytics", ico("chart"), "学习分析", "", v === "analytics") +
      ni("canvas", ico("pen"), "工作台画布", "", v === "canvas") +
      '<div class="nav-label">操作</div>' +
      ni("new-note", ico("plus"), "新建笔记", "", v === "editor") +
      '<div class="nav-label">系统</div>' +
      ni("settings", ico("cog"), "设置与备份", "", v === "settings");

    /* 侧栏底部「我的」入口卡（v14 第二批，对齐参考稿）：
       头像 + 名称 + 进行数据（连续打卡）+ 右箭头，上方一条发丝分隔线。
       侧栏拆成两段：导航放 .nav-scroll（可滚，flex:1），这张卡在固定段 ——
       导航 20 项本来就超一屏，若整栏滚动卡会被滚出视野；分滚后它永远可见。
       落点选「学习分析」——它是本站的"我的学习档案"，比设置更贴"个人中心"。 */
    var meCard = '<div class="side-me' + (v === "analytics" ? " on" : "") + '" data-action="analytics" title="我的学习档案">' +
      '<span class="me-ava">' + ico("user", 15) + "</span>" +
      '<span class="me-tx"><strong>我的</strong><span>连续打卡 ' + calcStreak() + " 天</span></span>" +
      '<span class="me-go">' + ico("chevron", 13) + "</span></div>";

    el.innerHTML = '<div class="nav-scroll">' + h + "</div>" + meCard;
  }

  /* ---------- 右侧信息面板 ---------- */
  /* ---------- 右栏（信息面板）----------
     四组拼装：① 页面专属 → ② 可操作 → ③ 工具与状态 → ④ 站内总览
     页面专属永远排最前，保证「打开这一页最想看到的东西」在首屏；
     全局统计（站内总览）放最后，且在本页已有统计的页面不重复出现。
  */
  function renderAside() {
    var el = document.getElementById("aside");
    if (!el) return;
    var v = route.view;
    var a = v === "article" ? findArticle(route.id) : null;
    var due = dueCards().length;
    var revNotes = allArticles().filter(function (x) { return isReview(x.id); }).length;

    var page = "", acts = "", tools = "", overview = "";

    /* ① 页面专属 */
    if (a) page += asideToc(a) + asideMastery(a) + asideBacklinks(a) + asideExport(a);
    else if (v === "graph") page += graphAsideHTML() + graphLegendHTML();
    else if (v === "chain") page += chainAsideHTML();
    else if (v === "mistakes") page += asideMistakes();
    else if (v === "aiconfig") page += asideCfg();

    /* ② 可操作 */
    if (due + revNotes > 0 && v !== "home") {
      acts += '<div class="aside-card"><h4>待办复习 <a data-action="review">去复习 →</a></h4>' +
        '<div class="set-row" style="padding:6px 0"><div class="info"><i class=ic data-ico=cards></i> 到期闪卡</div><div class="meta">' + due + " 张</div></div>" +
        '<div class="set-row" style="padding:6px 0"><div class="info"><i class=ic data-ico=star></i> 待复习笔记</div><div class="meta">' + revNotes + " 篇</div></div></div>";
    }
    if (!a) acts += asideQuick();

    /* ③ 工具与状态 */
    var recent = recentEdits();
    if (recent.length && !a) tools += asideRecent(recent);
    tools += asideAI();

    /* ④ 站内总览：全局统计，放最后。
       只在「本身没有学习统计的工具页」出现——其余页面（首页 KPI 条、学习分析指标条、
       列表篇数、文章字数与掌握度、错题集 6 项统计、链条环数、图谱节点数…）都有自己的
       统计，重复一份只会把右栏撑长。 */
    if (["canvas", "settings", "editor", "history", "ai"].indexOf(v) >= 0) {
      overview = '<div class="aside-card"><h4>站内总览</h4><div class="stats" id="stats"></div></div>';
    }

    el.innerHTML = page + acts + tools + overview;
    renderStats();
  }

  /* 右栏 · 本篇大纲（含文内查找与折叠开关） */
  function asideToc(a) {
    var heads = (a.md || "").match(/^#{2,3}\s+(.+)$/gm) || [];
    var outH = heads.slice(0, 10).map(function (l, i) {
      var isH3 = /^###/.test(l);
      return '<div class="nav-item toc-item' + (isH3 ? " toc-sub" : "") + '" data-action="jump" data-sec="sec-' + i + '">' +
        '<span class="ni-txt">' + esc(l.replace(/^#{2,3}\s+/, "")) + "</span></div>";
    }).join("");
    return '<div class="aside-card"><h4>本篇大纲 <button type="button" class="link-btn" data-action="fold-all">折叠 / 展开</button></h4>' +
      '<div class="nav-item" data-action="open-find"><span class="ni-ico">' + ico("search2", 13) + '</span><span class="ni-txt">在本文中查找</span></div>' +
      (outH ? '<div class="toc">' + outH + "</div>" : '<div class="hint" style="margin:0">这篇笔记没有小标题</div>') + "</div>";
  }

  /* 右栏 · 掌握度（含「问 AI / 生成闪卡」两个动作） */
  function asideMastery(a) {
    var mCur = masteryOf(a.id);
    return '<div class="aside-card"><h4>掌握度</h4>' +
      '<div class="stat stat-hero"><div class="num" style="color:' + MASTERY[mCur].c + '">' + MASTERY[mCur].name + "</div>" +
      '<div class="lbl">' + a.wordCount + " 字 · " + esc(a.category || "未分类") + "</div></div>" +
      '<div class="ed-toolbar" style="margin-top:10px"><button class="btn" data-action="ai" data-id="' + esc(a.id) + '"><i class=ic data-ico=chat></i> 问 AI</button>' +
      '<button class="btn" data-action="gen-cards" data-id="' + esc(a.id) + '"><i class=ic data-ico=cards></i> 生成闪卡</button></div></div>';
  }

  /* 右栏 · 反向链接 */
  function asideBacklinks(a) {
    var bks = backlinksOf ? backlinksOf(a) : [];
    if (!bks.length) return "";
    return '<div class="aside-card"><h4>反向链接</h4>' + bks.slice(0, 6).map(function (b) {
      return '<div class="nav-item" data-action="open-article" data-id="' + esc(b.id) + '" style="font-size:12.5px;padding:5px 10px">' +
        '<span class="ni-ico">' + ico("link", 13) + '</span><span class="ni-txt">' + esc(b.title) + "</span></div>";
    }).join("") + "</div>";
  }

  /* 右栏 · 导出与打印 */
  function asideExport(a) {
    return '<div class="aside-card"><h4>导出与打印</h4>' +
      '<div class="nav-item" data-action="tts" id="ttsBtn"><span class="ni-ico">' + ico("volume", 13) + '</span><span class="ni-txt">朗读全文</span></div>' +
      '<div class="nav-item" data-action="exp-md" data-id="' + esc(a.id) + '"><span class="ni-ico">' + ico("download", 13) + '</span><span class="ni-txt">导出 Markdown</span></div>' +
      '<div class="nav-item" data-action="exp-html" data-id="' + esc(a.id) + '"><span class="ni-ico">' + ico("download", 13) + '</span><span class="ni-txt">导出独立 HTML</span></div>' +
      '<div class="nav-item" data-action="exp-copy" data-id="' + esc(a.id) + '"><span class="ni-ico">' + ico("save", 13) + '</span><span class="ni-txt">复制 Markdown</span></div>' +
      '<div class="nav-item" data-action="exp-print"><span class="ni-ico">' + ico("print", 13) + '</span><span class="ni-txt">打印 / 存为 PDF</span></div>' +
    "</div>";
  }

  /* 右栏 · 错题概况（用法说明并入本卡，不再单开一张） */
  function asideMistakes() {
    var mDue = misDue().length, mPend = misPending().length, mDone = misMastered().length;
    var byNote = {};
    mis.list.forEach(function (m2) {
      var k2 = m2.noteTitle || "未关联笔记";
      byNote[k2] = (byNote[k2] || 0) + 1;
    });
    var topNotes = Object.keys(byNote).sort(function (a2, b2) { return byNote[b2] - byNote[a2]; }).slice(0, 6);
    var h = '<div class="aside-card"><h4>错题概况</h4>' +
      '<div class="set-row" style="padding:6px 0"><div class="info">现在待复习</div><div class="meta"' +
        (mDue ? ' style="color:var(--accent)"' : "") + ">" + mDue + " 道</div></div>" +
      '<div class="set-row" style="padding:6px 0"><div class="info">未掌握</div><div class="meta">' + mPend + " 道</div></div>" +
      '<div class="set-row" style="padding:6px 0"><div class="info">已掌握</div><div class="meta">' + mDone + " 道</div></div>" +
      '<div class="hint" style="margin:8px 0 0">AI 练习答错的题会自动收进来。每道题按 10 分钟 → 1 天 → 3 天 → 7 天 → 15 天 → 30 天 排复习，答对往后推、答错退回第一档。</div></div>';
    if (topNotes.length) {
      h += '<div class="aside-card"><h4>错得最多的知识点</h4>' + topNotes.map(function (k3) {
        return '<div class="set-row" style="padding:5px 0"><div class="info" style="font-size:12.5px">' +
          esc(k3.length > 18 ? k3.slice(0, 18) + "…" : k3) + '</div><div class="meta">' + byNote[k3] + " 道</div></div>";
      }).join("") + "</div>";
    }
    return h;
  }

  /* 右栏 · AI 接口配置状态 */
  function asideCfg() {
    var cn = (aiFetched.list || []).length;
    return '<div class="aside-card"><h4>配置状态</h4>' +
      '<div class="set-row" style="padding:6px 0"><div class="info">密钥</div><div class="meta" style="color:' +
        (aiCfg.key ? "var(--success)" : "var(--warn)") + '">' + (aiCfg.key ? "已配置" : "未配置") + "</div></div>" +
      '<div class="set-row" style="padding:6px 0"><div class="info">当前模型</div><div class="meta">' + esc(aiCfg.model) + "</div></div>" +
      '<div class="set-row" style="padding:6px 0"><div class="info">模型库</div><div class="meta">' + (cn ? cn + " 个" : "未获取") + "</div></div>" +
      '<div class="set-row" style="padding:6px 0"><div class="info">模型预设</div><div class="meta">' + aiModels.length + " 个</div></div>" +
      '<div class="hint" style="margin:8px 0 0">密钥只存在这台设备的浏览器里。换设备或清缓存后需要重填，可用「设置 → 数据备份」一起带走（备份含密钥，注意保管）。</div>' +
      "</div>";
  }

  /* 右栏 · 快捷操作 */
  function asideQuick() {
    return '<div class="aside-card"><h4>快捷操作</h4>' +
      '<div class="nav-item" data-action="new-note"><span class="ni-ico">' + ico("plus") + '</span><span class="ni-txt">新建笔记</span></div>' +
      '<div class="nav-item" data-action="review"><span class="ni-ico">' + ico("refresh") + '</span><span class="ni-txt">开始今日复习</span></div>' +
      '<div class="nav-item" data-action="practice"><span class="ni-ico">' + ico("target") + '</span><span class="ni-txt">AI 随机出题</span></div>' +
      '<div class="nav-item" data-action="settings"><span class="ni-ico">' + ico("save") + '</span><span class="ni-txt">导出数据备份</span></div></div>';
  }

  /* 右栏 · 最近编辑 */
  function asideRecent(list) {
    return '<div class="aside-card"><h4>最近编辑</h4>' + list.map(function (r) {
      return '<div class="nav-item" data-action="open-article" data-id="' + esc(r.id) + '" style="font-size:12.5px;padding:5px 10px">' +
        '<span class="ni-ico">' + ico("clock", 13) + '</span><span class="ni-txt">' + esc(r.title) + "</span></div>";
    }).join("") + "</div>";
  }

  /* 右栏 · AI 状态 */
  function asideAI() {
    if (aiCfg.key) {
      return '<div class="aside-card"><h4>AI 状态</h4><div class="set-row" style="padding:4px 0;border:none">' +
        '<div class="info" style="font-size:12.5px">' + esc(aiCfg.model) + "</div>" +
        '<div class="meta" style="color:var(--success)">已配置</div></div>' +
        '<div class="hint" style="margin:6px 0 0">当前角色：' + ico(roleById(aiRole).ico, 13) + esc(roleById(aiRole).name) + "</div></div>";
    }
    return '<div class="aside-card"><h4>AI 状态</h4><div class="hint" style="margin:0">未配置密钥，AI 功能不可用。' +
      '<a data-action="aiconfig">去配置 →</a></div></div>';
  }

  /* ---------- Markdown 解析 ---------- */
  function parseFM(raw) {
    var fm = {}, body = raw;
    var m = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
    if (m) {
      body = m[2];
      m[1].split("\n").forEach(function (line) {
        var i = line.indexOf(":");
        if (i > 0) {
          var k = line.slice(0, i).trim(), v = line.slice(i + 1).trim();
          if (v[0] === "[" && v[v.length - 1] === "]")
            v = v.slice(1, -1).split(",").map(function (s) { return s.trim().replace(/['"]/g, ""); }).filter(Boolean);
          fm[k] = v;
        }
      });
    }
    return { fm: fm, body: body };
  }
  function jsMdToHtml(text) {
    // 多行块级公式合并成一行，避免被按行拆成多个文本节点后无法识别
    text = String(text).replace(/\$\$([\s\S]+?)\$\$/g, function (m, c) { return "$$" + c.replace(/\n/g, " ") + "$$"; });
    var lines = text.split("\n"), out = [], i = 0;
    function inline(s) {
      s = esc(s);
      s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
           .replace(/\*(.+?)\*/g, "<em>$1</em>")
           .replace(/`(.+?)`/g, "<code>$1</code>")
           .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
      return s;
    }
    while (i < lines.length) {
      var ln = lines[i];
      if (/^```/.test(ln)) {
        var code = [], lang = ln.replace(/^```/, "").trim();
        i++;
        while (i < lines.length && !/^```/.test(lines[i])) { code.push(lines[i]); i++; }
        i++;
        out.push("<pre><code" + (lang ? ' class="language-' + esc(lang) + '"' : "") + ">" + esc(code.join("\n")) + "</code></pre>");
        continue;
      }
      var h = ln.match(/^(#{1,6})\s+(.*)$/);
      if (h) { out.push("<h" + h[1].length + ">" + inline(h[2]) + "</h" + h[1].length + ">"); i++; continue; }
      if (/^\s*>\s?/.test(ln)) {
        var bq = [];
        while (i < lines.length && /^\s*>\s?/.test(lines[i])) { bq.push(lines[i].replace(/^\s*>\s?/, "")); i++; }
        out.push("<blockquote>" + inline(bq.join(" ")) + "</blockquote>");
        continue;
      }
      if (/^\s*[-*]\s+/.test(ln)) {
        var ul = [];
        while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) { ul.push("<li>" + inline(lines[i].replace(/^\s*[-*]\s+/, "")) + "</li>"); i++; }
        out.push("<ul>" + ul.join("") + "</ul>");
        continue;
      }
      if (/^\s*\d+\.\s+/.test(ln)) {
        var ol = [];
        while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) { ol.push("<li>" + inline(lines[i].replace(/^\s*\d+\.\s+/, "")) + "</li>"); i++; }
        out.push("<ol>" + ol.join("") + "</ol>");
        continue;
      }
      if (ln.trim() === "") { i++; continue; }
      out.push("<p>" + inline(ln) + "</p>");
      i++;
    }
    return out.join("\n");
  }
  function handleFiles(files) {
    Array.prototype.forEach.call(files, function (f) {
      if (!/\.(md|markdown)$/i.test(f.name)) return;
      var reader = new FileReader();
      reader.onload = function () {
        var p = parseFM(reader.result);
        var h = (p.body.match(/^#\s+(.+)$/m) || [])[1];
        var title = p.fm.title || h || f.name.replace(/\.(md|markdown)$/i, "");
        var tags = p.fm.tags || [];
        if (typeof tags === "string") tags = [tags];
        var html = jsMdToHtml(p.body);
        var wc = (p.body.replace(/\s/g, "").match(/[一-鿿]/g) || []).length + (p.body.match(/[A-Za-z0-9]+/g) || []).length;
        imported.push({
          id: "imp-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
          title: title, category: p.fm.category || "导入", tags: tags,
          date: p.fm.date || "", wordCount: wc, html: html, md: p.body
        });
      };
      reader.readAsText(f, "utf-8");
    });
    setTimeout(function () {
      saveImported();
      toast("已导入 " + imported.length + " 篇笔记（含历史导入）");
      render();
    }, 400);
  }

  /* ---------- 备份 ---------- */
  function backupExport() {
    var data = { __app: "my-learning-site", __version: 1, exportedAt: new Date().toISOString(), data: {} };
    BACKUP_KEYS.forEach(function (k) {
      var v = localStorage.getItem(k);
      if (v !== null) data.data[k] = v;
    });
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "学习网站备份-" + todayKey() + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { try { if (URL.revokeObjectURL) URL.revokeObjectURL(url); } catch (e) {} }, 1000);
    toast("备份已导出");
  }
  function backupImport(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var j = JSON.parse(reader.result);
        var d = j.data || j;
        if (!d || typeof d !== "object") throw new Error("文件格式不对");
        if (!confirm("导入将覆盖当前的学习数据（闪卡、掌握度、打卡等），确定继续？")) return;
        BACKUP_KEYS.forEach(function (k) { if (d[k] !== undefined) localStorage.setItem(k, d[k]); });
        toast("导入成功，即将刷新");
        setTimeout(function () { location.reload(); }, 800);
      } catch (e) {
        toast("导入失败：" + (e.message || "文件解析错误"));
      }
    };
    reader.readAsText(file, "utf-8");
  }

  /* ---------- 导出 ---------- */
  function safeName(s) {
    return String(s || "笔记").replace(/[\\/:*?"<>|\n\r]/g, "_").slice(0, 60) || "笔记";
  }
  function downloadBlob(name, content, mime) {
    try {
      var blob = new Blob([content], { type: mime || "text/plain;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { try { URL.revokeObjectURL(url); } catch (e) {} }, 1500);
      return true;
    } catch (e) { return false; }
  }
  /* 构建阶段把公式包成了 HTML 容器，导出时还原为 Markdown 的 $ / $$ 写法 */
  function demathify(s) {
    return String(s || "")
      .replace(/<div class="math">\s*([\s\S]*?)\s*<\/div>/g, function (m, c) { return "\n$$\n" + c.trim() + "\n$$\n"; })
      .replace(/<span class="math">([\s\S]*?)<\/span>/g, function (m, c) { return "$" + c + "$"; });
  }
  function articleMarkdown(a) {
    var fm = "---\ntitle: " + a.title + "\ncategory: " + (a.category || "未分类") + "\n";
    if ((a.tags || []).length) fm += "tags: [" + a.tags.join(", ") + "]\n";
    fm += "date: " + (a.date || todayKey()) + "\n---\n\n";
    var body = demathify(a.md || "").replace(/^#\s+.*\n/, "");
    return fm + body.trim() + "\n";
  }
  function exportArticleMd(id) {
    var a = findArticle(id);
    if (!a) { toast("找不到笔记"); return; }
    if (downloadBlob(safeName(a.title) + ".md", articleMarkdown(a), "text/markdown;charset=utf-8")) toast("已导出 Markdown");
    else toast("导出失败");
  }
  function exportArticleHtml(id) {
    var a = findArticle(id);
    if (!a) { toast("找不到笔记"); return; }
    var MONO = "ui-monospace,Consolas,'Cascadia Mono',monospace";
    var css = "body{max-width:780px;margin:44px auto;padding:0 24px;font:16px/1.85 -apple-system,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;color:#241f14;background:#faf6ec}" +
      "h1{font-size:25px;letter-spacing:-.01em;margin:0 0 8px}" +
      ".meta{font-family:" + MONO + ";color:#6d6552;font-size:12px;letter-spacing:.02em;margin-bottom:26px;padding-bottom:14px;border-bottom:1px solid #d7cdb6}" +
      "h2{font-family:" + MONO + ";font-size:13.5px;letter-spacing:.05em;margin-top:34px;padding-top:12px;border-top:1px solid #bfb494}" +
      "h3{font-size:15.5px;margin-top:22px;padding-left:10px;border-left:2px solid #9a5b00}" +
      "pre{background:#f1ebdd;border:1px solid #d7cdb6;border-left:2px solid #9a5b00;border-radius:2px;padding:12px;overflow:auto;font-size:13px}" +
      "code{background:#f1ebdd;border:1px solid #d7cdb6;padding:0 5px;border-radius:2px;font-size:.88em;color:#9a5b00}" +
      "pre code{background:none;border:0;padding:0;color:#241f14}" +
      "table{border-collapse:collapse;width:100%;margin:18px 0;font-size:14px}th,td{border:0;border-bottom:1px solid #d7cdb6;padding:8px 10px;text-align:left}" +
      "th{font-family:" + MONO + ";font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#6d6552;border-bottom-color:#bfb494}" +
      "blockquote{border-left:2px solid #9a5b00;margin:16px 0;padding:2px 0 2px 16px;color:#6d6552;background:none}a{color:#9a5b00}";
    var doc = "<!DOCTYPE html>\n<html lang=\"zh-CN\"><head><meta charset=\"utf-8\">\n<title>" + esc(a.title) + "</title>\n" +
      "<style>" + css + "</style></head><body>\n<h1>" + esc(a.title) + "</h1>\n" +
      '<div class="meta">' + esc(a.category || "未分类") + " · " + a.wordCount + " 字" +
      (fmtDate(a.date) ? " · " + fmtDate(a.date) : "") + "</div>\n" +
      linkify(stripLeadingH1(a.html || "")) + "\n</body></html>";
    if (downloadBlob(safeName(a.title) + ".html", doc, "text/html;charset=utf-8")) toast("已导出 HTML");
    else toast("导出失败");
  }
  function copyArticleMd(id) {
    var a = findArticle(id);
    if (!a) return;
    var md = articleMarkdown(a);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(md).then(function () { toast("Markdown 已复制到剪贴板"); },
        function () { toast("复制失败，请改用导出"); });
    } else toast("当前环境不支持剪贴板，请改用导出");
  }
  function exportAllMd() {
    var arts = allArticles();
    if (!arts.length) { toast("没有可导出的笔记"); return; }
    var out = "# " + (DATA.siteTitle || "我的学习笔记") + "\n\n> 共 " + arts.length + " 篇 · 导出时间 " +
      new Date().toLocaleString("zh-CN") + "\n\n---\n\n";
    arts.forEach(function (a) {
      out += "## " + a.title + "\n\n*" + (a.category || "未分类") + " · " + a.wordCount + " 字" +
        (fmtDate(a.date) ? " · " + fmtDate(a.date) : "") + "*\n\n" +
        demathify(a.md || "").replace(/^#\s+.*\n/, "").trim() + "\n\n---\n\n";
    });
    if (downloadBlob("学习笔记合集-" + todayKey() + ".md", out, "text/markdown;charset=utf-8"))
      toast("已导出 " + arts.length + " 篇为 Markdown");
  }

  /* ---------- 语音朗读（浏览器内置 TTS，零依赖零联网） ---------- */
  var ttsState = { on: false, paused: false, chunks: [], idx: 0, rate: 1 };
  function ttsSupported() {
    return "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  }
  function ttsArticleText() {
    var art = document.querySelector(".article");
    if (!art) return "";
    var c = art.cloneNode(true);
    var drop = c.querySelectorAll(".article-actions, .art-nav, .backlinks, .fold-ico");
    for (var i = 0; i < drop.length; i++) if (drop[i].parentNode) drop[i].parentNode.removeChild(drop[i]);
    return String(c.textContent || "").replace(/\s+/g, " ").trim();
  }
  function ttsSplit(text) {
    var parts = text.match(/[^。！？；!?;\n]+[。！？；!?;\n]?/g) || [text];
    var out = [], buf = "";
    parts.forEach(function (s) {
      if (buf && (buf + s).length > 170) { out.push(buf); buf = s; }
      else buf += s;
    });
    if (buf) out.push(buf);
    return out.length ? out : [text];
  }
  function ttsUpdateInfo() {
    var i = document.getElementById("ttsInfo");
    if (!i) return;
    if (!ttsState.on) { i.textContent = ""; return; }
    var pct = ttsState.chunks.length ? Math.round(ttsState.idx / ttsState.chunks.length * 100) : 0;
    i.textContent = "朗读中 " + Math.min(ttsState.idx + 1, ttsState.chunks.length) + "/" + ttsState.chunks.length + " · " + pct + "%";
  }
  function ttsSpeak() {
    if (!ttsState.on || ttsState.paused) return;
    if (ttsState.idx >= ttsState.chunks.length) { ttsStopAll(); toast("朗读完毕"); return; }
    var u = new SpeechSynthesisUtterance(ttsState.chunks[ttsState.idx]);
    u.lang = "zh-CN";
    u.rate = ttsState.rate;
    u.onend = function () {
      if (!ttsState.on || ttsState.paused) return;
      ttsState.idx++;
      ttsUpdateInfo();
      ttsSpeak();
    };
    u.onerror = function () {};
    try { window.speechSynthesis.speak(u); } catch (e) {}
  }
  function ttsStart() {
    if (!ttsSupported()) { toast("当前浏览器不支持语音朗读"); return; }
    var text = ttsArticleText();
    if (!text) { toast("没有可朗读的内容"); return; }
    try { window.speechSynthesis.cancel(); } catch (e) {}
    ttsState.chunks = ttsSplit(text);
    ttsState.idx = 0;
    ttsState.on = true;
    ttsState.paused = false;
    var b = document.getElementById("ttsBar");
    if (b) b.classList.add("show");
    ttsUpdateInfo();
    ttsSyncBtn();
    ttsSpeak();
  }
  function ttsTogglePause() {
    if (!ttsState.on) return;
    ttsState.paused = !ttsState.paused;
    if (ttsState.paused) { try { window.speechSynthesis.cancel(); } catch (e) {} }
    else ttsSpeak();
    ttsSyncBtn();
  }
  function ttsStopAll() {
    ttsState.on = false;
    ttsState.paused = false;
    try { window.speechSynthesis.cancel(); } catch (e) {}
    var b = document.getElementById("ttsBar");
    if (b) b.classList.remove("show");
    ttsSyncBtn();
  }
  function ttsSyncBtn() {
    var b = document.querySelector('[data-action="tts"]');
    if (b) b.textContent = ttsState.on ? "■ 停止朗读" : "<i class=ic data-ico=volume></i> 朗读全文";
    var p = document.querySelector('[data-action="tts-pause"]');
    if (p) p.textContent = ttsState.paused ? "继续" : "暂停";
  }
  function ttsSetRate(v) {
    ttsState.rate = parseFloat(v) || 1;
    if (ttsState.on && !ttsState.paused) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
      ttsSpeak();
    }
  }

  /* ---------- 语音输入（编辑器） ---------- */
  var voiceState = { rec: null };
  function voiceToggle() {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast("当前浏览器不支持语音输入（建议 Chrome / Edge）"); return; }
    var ta = document.getElementById("edMd");
    if (!ta) return;
    if (voiceState.rec) {
      try { voiceState.rec.stop(); } catch (e) {}
      voiceState.rec = null;
      voiceSyncBtn(false);
      return;
    }
    var rec = new SR();
    rec.lang = "zh-CN";
    rec.continuous = true;
    rec.interimResults = false;
    var base = ta.value;
    rec.onresult = function (e) {
      var txt = "";
      for (var i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) txt += e.results[i][0].transcript;
      }
      if (!txt) return;
      ta.value = base + (base && !/\s$/.test(base) ? " " : "") + txt;
      base = ta.value;
      ta.dispatchEvent(new Event("input"));
    };
    rec.onerror = function () { toast("语音识别出错或未授权麦克风"); voiceState.rec = null; voiceSyncBtn(false); };
    rec.onend = function () { voiceState.rec = null; voiceSyncBtn(false); };
    try { rec.start(); } catch (e) { toast("无法启动语音识别"); return; }
    voiceState.rec = rec;
    voiceSyncBtn(true);
    toast("开始语音输入，说完再点一次结束");
  }
  function voiceSyncBtn(on) {
    var b = document.querySelector('[data-action="voice"]');
    if (b) b.classList.toggle("rec", !!on);
  }

  /* ---------- AI 引用标注 ---------- */
  var CITE_RULE = "\n\n【引用要求】当你的回答直接引用了某篇笔记的内容时，在对应句子末尾用中文方括号标注来源，格式：［来源：笔记标题］。" +
    "只标注确实出现在本次上下文中的笔记标题，绝不编造来源；如果回答不依赖具体笔记，可以不标注。";
  function citeify(html) {
    return String(html || "").replace(/[\[［]\s*来源\s*[:：]\s*([^\]］]+?)\s*[\]］]/g, function (m, t) {
      var a = articleByTitle(t);
      if (a) return '<a class="cite" data-action="open-article" data-id="' + esc(a.id) + '" title="打开这篇笔记">［来源：' + esc(t) + "］</a>";
      return '<span class="cite missing">［来源：' + esc(t) + "］</span>";
    });
  }

  /* ---------- 文章内查找 ---------- */
  var findState = { on: false, hits: [], idx: -1 };
  function closeFind() {
    clearFindHits();
    findState = { on: false, hits: [], idx: -1 };
    var bar = document.getElementById("findBar");
    if (bar) bar.classList.remove("show");
  }
  function clearFindHits() {
    var art = document.querySelector(".article");
    if (!art) return;
    var ms = art.querySelectorAll("mark.find-hit");
    for (var i = ms.length - 1; i >= 0; i--) {
      var m = ms[i], p = m.parentNode;
      p.replaceChild(document.createTextNode(m.textContent), m);
      p.normalize();
    }
  }
  function openFind() {
    var bar = document.getElementById("findBar");
    if (!bar) return;
    findState.on = true;
    bar.classList.add("show");
    var inp = document.getElementById("findInput");
    if (inp) { inp.focus(); inp.select(); }
  }
  function runFind(q) {
    clearFindHits();
    findState.hits = [];
    findState.idx = -1;
    var art = document.querySelector(".article");
    var cnt = document.getElementById("findCount");
    if (!art || !q) { if (cnt) cnt.textContent = "0/0"; return; }
    var ql = q.toLowerCase();
    var walker = document.createTreeWalker(art, NodeFilter.SHOW_TEXT, null, false);
    var nodes = [], n;
    while ((n = walker.nextNode())) {
      var p = n.parentNode;
      if (!p || /^(SCRIPT|STYLE|MARK|BUTTON)$/.test(p.nodeName)) continue;
      if (p.closest && (p.closest(".katex") || p.closest("#findBar"))) continue;
      if (n.nodeValue.toLowerCase().indexOf(ql) >= 0) nodes.push(n);
    }
    var hits = [];
    nodes.forEach(function (node) {
      var text = node.nodeValue, low = text.toLowerCase();
      var frag = document.createDocumentFragment(), last = 0, i;
      while ((i = low.indexOf(ql, last)) >= 0) {
        if (i > last) frag.appendChild(document.createTextNode(text.slice(last, i)));
        var m = document.createElement("mark");
        m.className = "find-hit";
        m.textContent = text.slice(i, i + q.length);
        frag.appendChild(m);
        hits.push(m);
        last = i + q.length;
      }
      if (!hits.length && last === 0) return;
      if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
      if (frag.childNodes.length) node.parentNode.replaceChild(frag, node);
    });
    findState.hits = hits;
    if (hits.length) findGo(0);
    else if (cnt) cnt.textContent = "0/0";
  }
  function findGo(dir) {
    var hits = findState.hits;
    if (!hits.length) return;
    findState.idx = findState.idx < 0 ? 0 : (findState.idx + dir + hits.length) % hits.length;
    hits.forEach(function (m, i) { m.classList.toggle("cur", i === findState.idx); });
    var cnt = document.getElementById("findCount");
    if (cnt) cnt.textContent = (findState.idx + 1) + "/" + hits.length;
    try { hits[findState.idx].scrollIntoView({ behavior: "smooth", block: "center" }); }
    catch (e) {}
  }

  /* ---------- 大纲折叠 ---------- */
  function setupFold(root) {
    var art = root.querySelector(".article");
    if (!art) return;
    var hs = art.querySelectorAll("h2, h3");
    for (var i = 0; i < hs.length; i++) {
      var h = hs[i];
      if (h.querySelector(".fold-ico")) continue;
      var lv = h.tagName === "H2" ? 2 : 3;
      var group = [];
      var sib = h.nextElementSibling;
      while (sib) {
        if (/^H[123]$/.test(sib.tagName) && +sib.tagName[1] <= lv) break;
        group.push(sib);
        sib = sib.nextElementSibling;
      }
      if (!group.length) continue;
      h._foldGroup = group;
      h.setAttribute("data-action", "fold");
      h.setAttribute("data-sec", h.id || "");
      h.classList.add("foldable");
      var svg = document.createElementNS(SVGNS, "svg");
      svg.setAttribute("class", "fold-ico");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("aria-hidden", "true");
      var path = document.createElementNS(SVGNS, "path");
      path.setAttribute("d", "M8 5l10 7-10 7z");
      svg.appendChild(path);
      h.insertBefore(svg, h.firstChild);
    }
  }
  function toggleFold(sec) {
    var h = document.getElementById(sec);
    if (!h || !h._foldGroup) return;
    var collapsed = h.classList.toggle("collapsed");
    h._foldGroup.forEach(function (el) { el.style.display = collapsed ? "none" : ""; });
  }
  function toggleFoldAll() {
    var art = document.querySelector(".article");
    if (!art) return;
    var hs = art.querySelectorAll("h2.foldable, h3.foldable");
    var anyOpen = false;
    hs.forEach(function (h) { if (!h.classList.contains("collapsed")) anyOpen = true; });
    hs.forEach(function (h) {
      h.classList.toggle("collapsed", anyOpen);
      (h._foldGroup || []).forEach(function (el) { el.style.display = anyOpen ? "none" : ""; });
    });
    toast(anyOpen ? "已折叠全部章节" : "已展开全部章节");
  }

  /* ---------- 命令面板（Ctrl / ⌘ + K）----------
     一个输入框直达：视图 / 操作 / 学科 / 笔记。
     导航项复用侧栏的 data-action 元素（点它等价于点侧栏），逻辑不重复实现。 */
  var cmdkOpen = false;
  var cmdkIdx = 0;
  var cmdkQuery = "";
  var cmdkList = [];

  function cmdkItems(q) {
    var nav = [
      ["首页", "今天要处理 · 学习概览", "home", "home"],
      ["全部笔记", allArticles().length + " 篇", "doc", "all-notes"],
      ["知识链", "由易到难 · 一环扣一环", "chain", "chain"],
      ["今日复习", dueCards().length + " 张闪卡到期", "refresh", "review"],
      ["复习看板", "四档掌握度 · 拖动改档", "board", "board"],
      ["闪卡库", cards.length + " 张卡片", "cards", "cards"],
      ["AI 练习", "随机出题 · AI 解题", "target", "practice"],
      ["错题集", misDue().length + " 道待复习", "warn", "mistakes"],
      ["知识图谱", "笔记之间的关联结构", "graph", "graph"],
      ["学习分析", "掌握度 · 活跃度 · 复习分布", "chart", "analytics"],
      ["AI 辅导", aiCfg.key ? aiCfg.model : "未配置密钥", "chat", "ai"],
      ["AI 接口配置", aiCfg.key ? "密钥已配置" : "密钥未配置", "key", "aiconfig"],
      ["工作台画布", "手写 · 随手记", "palette", "canvas"],
      ["设置与备份", "数据备份 · 危险操作", "cog", "settings"]
    ].map(function (r) {
      return {
        g: "导航", t: r[0], s: r[1], i: r[2], w: 3,
        sel: '#sidebar [data-action="' + r[3] + '"]'
      };
    });
    var acts = [
      { g: "操作", t: "新建笔记", s: "用 Markdown 写一篇", i: "plus", w: 25,
        sel: '#sidebar [data-action="new-note"]' },
      { g: "操作", t: "切换为" + (theme === "light" ? "深色" : "浅色"),
        s: "明暗 · 当前 " + modeName(modePref), i: theme === "light" ? "moon" : "sun", w: 25, sel: "#themeBtn" },
      { g: "操作", t: "导出数据备份", s: "学习记录 / 闪卡 / 错题一并带走", i: "save", w: 25,
        fn: function () { backupExport(); } },
      { g: "操作", t: "在笔记正文中搜索", s: "标题 / 标签 / 正文全文检索", i: "search2", w: 25,
        fn: function () {
          var si = document.getElementById("searchInput");
          if (si) { si.focus(); try { si.select(); } catch (e) {} }
        } }
    ].concat(PALETTES.map(function (p) {
      /* 换配色不该要求用户先跑到设置页——命令面板里两步到位 */
      return {
        g: "配色", t: "配色：" + p.name, s: p.desc, i: "palette", w: 4,
        fn: function () {
          palette = p.id;
          applyTheme();
          if (route.view === "settings") render();
          toast("配色已切换为「" + p.name + "」");
        }
      };
    }));
    /* 学科也并入「需要输入才列出」的组：默认只留「操作 + 导航」，列表不用滚动 */
    var cats = (q ? getCategories() : []).map(function (c) {
      return {
        g: "学科", t: c.name, s: c.count + " 篇", i: "folder", w: 2,
        sel: '#sidebar [data-action="open-category"][data-cat="' + c.name + '"]'
      };
    });
    var notes = q ? allArticles().map(function (a) {
      return {
        g: "笔记", t: displayTitle(a), i: "doc", w: 1,
        s: (a.category || "未分类") + " · " + a.wordCount + " 字", note: a.id
      };
    }) : [];
    /* 动作排在导航之前（命令面板先说「能做什么」）；同分时按 ord 保持人工排序，
       否则无输入时会被标题长度打乱成随意的顺序。 */
    var all = acts.concat(nav).concat(cats).concat(notes);
    all.forEach(function (it, i) { it.ord = i; });
    return all;
  }

  /* 打分：前缀 > 词中 > 子序列 > 副标题命中；再按分组权重微调 */
  function cmdkScore(it, q) {
    if (!q) return it.w * 10;
    var t = it.t.toLowerCase(), k = q.toLowerCase();
    var pos = t.indexOf(k), sc = -1;
    if (pos === 0) sc = 200 - t.length;
    else if (pos > 0) sc = 140 - Math.min(50, pos * 5);
    else {
      var ti = 0, ok = k.length > 0;
      for (var i = 0; i < k.length; i++) {
        ti = t.indexOf(k[i], ti);
        if (ti < 0) { ok = false; break; }
        ti++;
      }
      if (ok) sc = 60;
      else if (it.s && it.s.toLowerCase().indexOf(k) >= 0) sc = 30;
    }
    if (sc < 0) return -1;
    return sc + it.w * 6;
  }

  function cmdkMark(text, q) {
    if (!q) return esc(text);
    var i = text.toLowerCase().indexOf(q.toLowerCase());
    if (i < 0) return esc(text);
    return esc(text.slice(0, i)) + "<mark>" + esc(text.slice(i, i + q.length)) + "</mark>" +
      esc(text.slice(i + q.length));
  }

  function cmdkScrollTo(el) {
    if (!el || typeof el.scrollIntoView !== "function") return;
    try { el.scrollIntoView({ block: "nearest" }); }
    catch (e) { try { el.scrollIntoView(); } catch (e2) {} }
  }

  function renderCmdk() {
    var box = document.getElementById("cmdkList");
    if (!box) return;
    var q = cmdkQuery.trim();
    var scored = [];
    cmdkItems(q).forEach(function (it) {
      var sc = cmdkScore(it, q);
      if (sc >= 0) scored.push({ it: it, sc: sc });
    });
    scored.sort(function (a, b) { return b.sc - a.sc || a.it.ord - b.it.ord; });
    cmdkList = scored.slice(0, 60).map(function (x) { return x.it; });
    if (cmdkIdx >= cmdkList.length || cmdkIdx < 0) cmdkIdx = 0;

    var h = "", lastG = "";
    cmdkList.forEach(function (it, i) {
      if (it.g !== lastG) { h += '<div class="cmdk-group">' + esc(it.g) + "</div>"; lastG = it.g; }
      h += '<button type="button" class="cmdk-row' + (i === cmdkIdx ? " on" : "") + '"' +
        ' data-action="cmdk-go" data-i="' + i + '">' +
        '<span class="cmdk-ico">' + ico(it.i, 14) + "</span>" +
        '<span class="cmdk-tx"><strong>' + cmdkMark(it.t, q) + "</strong>" +
        (it.s ? "<em>" + esc(it.s) + "</em>" : "") + "</span>" +
        '<span class="cmdk-ret">' + ico("chevron", 12) + "</span></button>";
    });
    if (!cmdkList.length) h = '<div class="cmdk-none">没有匹配的内容</div>';
    box.innerHTML = h;

    var hint = document.getElementById("cmdkHint");
    if (hint) {
      hint.textContent = q ? cmdkList.length + " 项结果"
        : "输入关键词可搜索 " + allArticles().length + " 篇笔记";
    }
    cmdkScrollTo(box.querySelector(".cmdk-row.on"));
  }

  function openCmdk() {
    if (cmdkOpen) return;
    var root = document.getElementById("cmdk");
    if (!root) return;
    cmdkOpen = true;
    cmdkQuery = "";
    cmdkIdx = 0;
    cmdkList = [];
    root.innerHTML =
      '<div class="cmdk-mask" data-action="cmdk-close"></div>' +
      '<div class="cmdk" role="dialog" aria-modal="true" aria-label="命令面板">' +
        '<div class="cmdk-head">' + ico("search2", 15) +
          '<input id="cmdkInput" class="cmdk-input" type="text" autocomplete="off" ' +
            'placeholder="搜索笔记、页面或操作…">' +
          '<span class="kk" data-action="cmdk-close">Esc</span>' +
        "</div>" +
        '<div class="cmdk-list" id="cmdkList"></div>' +
        '<div class="cmdk-foot">' +
          '<span><span class="kk">↑</span><span class="kk">↓</span> 选择</span>' +
          '<span><span class="kk">Enter</span> 打开</span>' +
          '<span><span class="kk">Esc</span> 关闭</span>' +
          '<span class="cmdk-hint" id="cmdkHint"></span>' +
        "</div>" +
      "</div>";
    root.classList.add("show");
    renderCmdk();
    var inp = document.getElementById("cmdkInput");
    if (inp) {
      inp.addEventListener("input", function () {
        cmdkQuery = this.value;
        cmdkIdx = 0;
        renderCmdk();
      });
      inp.addEventListener("keydown", function (e) {
        if (e.key === "ArrowDown") { e.preventDefault(); cmdkMove(1); }
        else if (e.key === "ArrowUp") { e.preventDefault(); cmdkMove(-1); }
        else if (e.key === "Enter") { e.preventDefault(); cmdkGo(cmdkIdx); }
        else if (e.key === "Escape") { e.preventDefault(); closeCmdk(); }
      });
      setTimeout(function () { try { inp.focus(); } catch (e) {} }, 30);
    }
  }

  function closeCmdk() {
    cmdkOpen = false;
    var root = document.getElementById("cmdk");
    if (root) { root.classList.remove("show"); root.innerHTML = ""; }
  }

  function cmdkMove(d) {
    if (!cmdkList.length) return;
    cmdkIdx = (cmdkIdx + d + cmdkList.length) % cmdkList.length;
    renderCmdk();
  }

  function cmdkGo(i) {
    var it = cmdkList[i];
    if (!it) return;
    closeCmdk();
    if (it.note) {
      prevRoute = Object.assign({}, route);
      route = { view: "article", id: it.note };
      recordActivity();
      render();
      window.scrollTo(0, 0);
      return;
    }
    if (it.fn) { it.fn(); return; }
    var el = it.sel ? document.querySelector(it.sel) : null;
    if (el) { el.click(); return; }
    toast("这个入口当前不可用");
  }

  /* 快捷键提示里的 ⌘ / Ctrl 要跟平台走 */
  function cmdkKeyLabel() {
    var mac = /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent || "");
    return mac ? "⌘K" : "Ctrl K";
  }

  /* ---------- 通用确认弹窗 ---------- */
  var modalState = null;
  function showModal(opts) {
    modalState = opts || {};
    var el = document.getElementById("modal");
    if (!el) return;
    var need = opts.confirmText || "";
    var fieldsHtml = (opts.fields || []).map(function (f) {
      /* type:"select" 用 options 收选项 —— 快速新建要选学科，普通 input 不够用 */
      var t;
      if (f.type === "select") {
        t = '<select class="ed-input" data-field="' + esc(f.name) + '">' +
          (f.options || []).map(function (o) {
            var val = typeof o === "string" ? o : o.value;
            var lab = typeof o === "string" ? o : o.label;
            return '<option value="' + esc(val) + '"' +
              (String(f.value) === String(val) ? " selected" : "") + ">" + esc(lab) + "</option>";
          }).join("") + "</select>";
      } else if (f.multiline) {
        t = '<textarea class="ed-input modal-ta" data-field="' + esc(f.name) + '" rows="3" placeholder="' + esc(f.ph || "") + '">' + esc(f.value || "") + "</textarea>";
      } else {
        t = '<input class="ed-input" data-field="' + esc(f.name) + '" placeholder="' + esc(f.ph || "") + '" value="' + esc(f.value || "") + '">';
      }
      return '<label class="modal-field"><span>' + esc(f.label) + "</span>" + t + "</label>";
    }).join("");
    el.innerHTML =
      '<div class="modal-mask" data-action="modal-cancel"></div>' +
      '<div class="modal" role="dialog" aria-modal="true">' +
        '<h3 class="modal-title">' +
          (opts.danger ? '<span class="modal-badge">危险操作</span>' : "") + esc(opts.title) + "</h3>" +
        '<div class="modal-body">' + (opts.body || "") + "</div>" +
        (fieldsHtml ? '<div class="modal-fields">' + fieldsHtml + "</div>" : "") +
        (need ? '<input id="modalInput" class="ed-input modal-input" placeholder="输入「' + esc(need) + '」以确认">' : "") +
        '<div class="modal-actions">' +
          (opts.extra ? '<div class="modal-extra">' + opts.extra + "</div>" : "") +
          '<div class="modal-btns">' +
            '<button class="btn" data-action="modal-cancel">取消</button>' +
            '<button class="btn ' + (opts.danger ? "danger-solid" : "primary") + '" id="modalOk"' +
              (need ? " disabled" : "") + ' data-action="modal-ok">' + esc(opts.okText || "确认") + "</button>" +
          "</div>" +
        "</div>" +
      "</div>";
    el.classList.add("show");
    var inp = document.getElementById("modalInput");
    var ok = document.getElementById("modalOk");
    if (inp && ok) {
      inp.addEventListener("input", function () { ok.disabled = this.value.trim() !== need; });
      inp.addEventListener("keydown", function (e) { if (e.key === "Enter" && !ok.disabled) ok.click(); });
      setTimeout(function () { try { inp.focus(); } catch (e) {} }, 40);
    }
    var firstField = el.querySelector("[data-field]");
    if (firstField) setTimeout(function () { try { firstField.focus(); } catch (e) {} }, 40);
  }
  function hideModal() {
    modalState = null;
    var el = document.getElementById("modal");
    if (el) { el.classList.remove("show"); el.innerHTML = ""; }
  }

  /* ---------- 一键清空笔记 ---------- */
  function clearAllNotes() {
    var nImp = imported.length, nNote = notes.length, nDel = deleted.length;
    var rows = "";
    if (nImp) rows += "<li>浏览器导入的笔记 <b>" + nImp + "</b> 篇</li>";
    if (nNote) rows += "<li>站内新建 / 编辑过的笔记 <b>" + nNote + "</b> 篇</li>";
    if (nDel) rows += "<li>被隐藏（软删除）的记录 <b>" + nDel + "</b> 条</li>";
    showModal({
      title: "清空全部笔记？",
      danger: true,
      body:
        (rows ? "<p>以下内容将从本站移除：</p><ul class=\"modal-list\">" + rows + "</ul>"
              : "<p>当前没有浏览器内的笔记，此操作只会重置删除记录。</p>") +
        '<p class="modal-hint">' +
          (nNote ? "站内对内置笔记的修改会一并丢弃，恢复为 <code>content/</code> 里的原始版本。" : "") +
          "源文件 <code>content/</code> 不受影响，重新构建即可恢复。</p>" +
        '<p class="modal-danger-line">此操作不可撤销，建议先导出备份。</p>',
      confirmText: "清空",
      okText: "确认清空",
      extra: '<button class="btn" data-action="backup-export">先导出备份</button>',
      onOk: function () {
        imported = []; saveImported();
        notes = []; saveNotes();
        deleted = []; saveDeleted();
        query = "";
        var si = document.getElementById("searchInput");
        if (si) si.value = "";
        route = { view: "list", category: null, tag: null };
        render();
        window.scrollTo(0, 0);
        toast("已清空全部笔记");
      }
    });
  }

  /* ---------- 快速新建（⌘N）与快捷键导航 ----------
     快速新建不跳编辑器再让人填三遍：先把标题/学科/标签定下来，
     建完直接进编辑器写正文（笔记对象结构与 save-note 一致）。 */
  function gotoView(act) {
    /* 复用侧栏的 data-action 元素 —— 点它等价于点侧栏，导航逻辑不重复实现 */
    var el = document.querySelector('#sidebar [data-action="' + act + '"]');
    if (el) { el.click(); return true; }
    return false;
  }
  function openQuickNew() {
    var cats = getCategories().map(function (c) { return c.name; });
    if (!cats.length) cats = ["未分类"];
    showModal({
      title: "新建笔记",
      body: '<p class="hint">先定标题与归属，创建后直接进编辑器写正文。</p>',
      fields: [
        { name: "title", label: "标题", ph: "例：傅里叶变换的相位谱" },
        { name: "category", label: "学科", type: "select", options: cats },
        { name: "tags", label: "标签", ph: "空格或逗号分隔，可留空" }
      ],
      okText: "创建并编辑",
      onOk: function (v) {
        var t = String(v.title || "").trim();
        if (!t) { toast("标题不能为空"); return; }
        var id = "note-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6);
        notes.push({
          id: id, title: t,
          category: String(v.category || "未分类").trim() || "未分类",
          tags: String(v.tags || "").split(/[,，\s]+/).filter(Boolean),
          date: todayKey(), wordCount: 0, html: "", md: ""
        });
        saveNotes();
        recordActivity();
        logEvent("note", "新建笔记《" + t + "》", id);
        prevRoute = Object.assign({}, route);
        route = { view: "editor", id: id };
        render();
        window.scrollTo(0, 0);
        toast("已创建，开始写正文");
      }
    });
  }

  /* ---------- Liquid Glass：注入折射滤镜 + 指针镜面高光 ----------
     为什么走 JS 注入而不是写进 index.html：平台托管的那份有注入锚点，整包覆盖会抹掉；
     走 JS 就完全不用碰它。滤镜拿不到时 CSS 已退回普通磨砂（@supports），所以失败也不难看。 */
  function injectGlassDefs() {
    if (document.getElementById("lg-defs")) return;
    /* 位移图：中心中性、边缘染色 —— 背后的画面只在边缘被"掰"一下，中间保持直，
       这正是厚玻璃边缘的折射形态。R 通道管横向位移、G 通道管纵向。 */
    var svg = "<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'>" +
      "<defs><radialGradient id='g' cx='50%' cy='50%' r='50%'>" +
        "<stop offset='0%' stop-color='#808080'/>" +
        "<stop offset='52%' stop-color='#808080'/>" +
        "<stop offset='74%' stop-color='#8d7581'/>" +
        "<stop offset='89%' stop-color='#bb6058'/>" +
        "<stop offset='100%' stop-color='#ff3f2e'/>" +
      "</radialGradient></defs><rect width='240' height='240' fill='url(#g)'/></svg>";
    var href = "data:image/svg+xml;utf8," + encodeURIComponent(svg);
    document.body.insertAdjacentHTML("beforeend",
      '<svg id="lg-defs" aria-hidden="true" focusable="false" width="0" height="0"' +
        ' style="position:absolute;width:0;height:0;overflow:hidden;pointer-events:none">' +
        '<filter id="lg-refract" x="-14%" y="-14%" width="128%" height="128%" color-interpolation-filters="sRGB">' +
          '<feImage href="' + href + '" result="m"/>' +
          '<feDisplacementMap in="SourceGraphic" in2="m" xChannelSelector="R" yChannelSelector="G" scale="24"/>' +
        '</filter>' +
      "</svg>");
  }
  /* 「流动」：镜面高光跟着指针走。
     只改两个自定义属性，写操作按帧合并；矩形在进入元素时取一次（不在 pointermove 里反复读布局）。 */
  function bindGlassSheen() {
    var SEL = ".topbar,.sidebar,.aside,.modal,.cmdk,.ai-dock";
    var cur = null, rect = null, pending = null, raf = 0;
    var flush = function () {
      raf = 0;
      if (!pending) return;
      pending.el.style.setProperty("--glass-mx", pending.mx + "%");
      pending.el.style.setProperty("--glass-my", pending.my + "%");
      pending.el.style.setProperty("--glass-sheen", "0.14");
      pending = null;
    };
    document.addEventListener("pointermove", function (e) {
      var el = e.target && e.target.closest ? e.target.closest(SEL) : null;
      if (el !== cur) {
        if (cur) cur.style.setProperty("--glass-sheen", "0");
        cur = el;
        rect = el ? el.getBoundingClientRect() : null;
      }
      if (!el || !rect || !rect.width || !rect.height) return;
      pending = {
        el: el,
        mx: Math.round(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))),
        my: Math.round(Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)))
      };
      if (!raf) raf = requestAnimationFrame(flush);
    }, { passive: true });
    document.addEventListener("pointerleave", function () {
      if (cur) cur.style.setProperty("--glass-sheen", "0");
      cur = null; rect = null;
    }, { passive: true });
  }

  /* ---------- 主题 / 面板 ---------- */
  var ICO_MOON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
  var ICO_SUN = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';

  /* 把「偏好」折算成「生效值」（system 要问系统） */
  function effTheme() {
    return modePref === "system" ? (sysDark() ? "dark" : "light") : modePref;
  }
  /* 各主题的 --bg（移动端地址栏 / PWA 标题栏颜色）。
     与 style.css 配色表逐字一致，test_theme 有断言锁同步；
     index.html 启动脚本里有一份同样的内联表（首帧就要正确，不能等 app.js）。 */
  var THEME_BG = {
    "glass:light": "#eaeefb", "glass:dark": "#0b1020",
    "amber:light": "#f1ebdd", "amber:dark": "#0e0d0a",
    "paper:light": "#faf2e9", "paper:dark": "#1c1610",
    "ink:light": "#f3f2ee", "ink:dark": "#131312",
    "night:light": "#eef1f8", "night:dark": "#0a1030"
  };
  function syncThemeColor() {
    var mc = document.querySelector('meta[name="theme-color"]');
    var hex = THEME_BG[palette + ":" + theme];
    if (mc && hex) mc.setAttribute("content", hex);
  }
  function applyTheme() {
    theme = effTheme();
    var d = document.documentElement;
    d.setAttribute("data-theme", palette);   /* 配色身份 */
    d.setAttribute("data-mode", theme);      /* 明暗模式 */
    syncThemeColor();                        /* 地址栏颜色跟随配色 × 明暗 */
    try {
      localStorage.setItem(STORE_PALETTE, palette);
      localStorage.setItem(STORE_MODE, modePref);
      localStorage.removeItem(STORE_THEME);  /* 迁移完成，旧键退休 */
    } catch (e) {}
    var b = document.getElementById("themeBtn");
    if (b) {
      b.title = "当前 " + palName(palette) + " · " +
        (modePref === "system" ? "跟随系统（" + modeName(theme === "dark" ? "dark" : "light") + "）" : modeName(modePref)) +
        "　点击切换明暗";
      /* 图标表示"点下去会变成什么"，与旧版一致 */
      b.innerHTML = theme === "light" ? ICO_MOON : ICO_SUN;
    }
  }
  /* 系统主题变化时，只有选了「跟随系统」才响应 */
  try {
    if (window.matchMedia) {
      var mq = window.matchMedia("(prefers-color-scheme: dark)");
      var onSys = function () { if (modePref === "system") { applyTheme(); render(); } };
      if (mq.addEventListener) mq.addEventListener("change", onSys);
      else if (mq.addListener) mq.addListener(onSys);
    }
  } catch (e) {}
  /* ---------- 侧栏三态：展开 / 图标条 / 隐藏 ----------
     窄屏（≤880）不参与三态，一律走抽屉的开关。
     断点取 880 与 CSS 对齐 —— 原实现写的是 860，在 861–880 之间 JS 与 CSS 会各说各话。 */
  var SIDEBAR_STATES = ["expanded", "rail", "hidden"];
  var SIDEBAR_LABEL = { expanded: "展开", rail: "图标条", hidden: "隐藏" };
  var sidebarState = (function () {
    var raw = null;
    try { raw = localStorage.getItem(STORE_SIDEBAR); } catch (e) {}
    return SIDEBAR_STATES.indexOf(raw) >= 0 ? raw : "expanded";
  })();
  function nextSidebarState(s) {
    return SIDEBAR_STATES[(SIDEBAR_STATES.indexOf(s) + 1) % SIDEBAR_STATES.length];
  }
  function applySidebarState() {
    var b = document.body;
    /* 窄屏只有「抽屉开/关」，不参与三态：此时两个状态类都不挂。
       让 CSS 去覆盖虽然也能看对，但状态与呈现就该一致，别留一个"挂着却不生效"的类。 */
    var wide = window.innerWidth > 880;
    b.classList.toggle("rail-sidebar", wide && sidebarState === "rail");
    b.classList.toggle("no-sidebar", wide && sidebarState === "hidden");
    syncRailTitles();
    var btn = document.getElementById("sidebarToggle");
    if (btn) {
      btn.title = wide
        ? "侧栏：" + SIDEBAR_LABEL[sidebarState] + "（点击切到「" + SIDEBAR_LABEL[nextSidebarState(sidebarState)] + "」）"
        : "展开/收起侧栏";
      btn.setAttribute("aria-expanded", wide ? (sidebarState === "expanded" ? "true" : "false") : "false");
    }
  }
  /* 图标条里 .ni-txt 是 display:none，语义只能靠原生 title 补回。
     为什么不自绘 tooltip：侧栏是 overflow-y:auto，横向溢出的浮层会被裁掉。 */
  function syncRailTitles() {
    var rail = sidebarState === "rail" && window.innerWidth > 880;
    var items = document.querySelectorAll("#sidebar .nav-item");
    Array.prototype.forEach.call(items, function (it) {
      var t = it.querySelector(".ni-txt");
      var label = t ? t.textContent.trim() : "";
      if (rail && label) it.setAttribute("title", label);
      else it.removeAttribute("title");
    });
  }
  function toggleSidebar() {
    if (window.innerWidth <= 880) { document.body.classList.toggle("show-sidebar"); return; }
    sidebarState = nextSidebarState(sidebarState);
    try { localStorage.setItem(STORE_SIDEBAR, sidebarState); } catch (e) {}
    applySidebarState();
    toast("侧栏：" + SIDEBAR_LABEL[sidebarState] +
      "（再点一次切到「" + SIDEBAR_LABEL[nextSidebarState(sidebarState)] + "」）");
  }
  function toggleAside() {
    if (window.innerWidth <= 1080) document.body.classList.toggle("show-aside");
    else document.body.classList.toggle("no-aside");
  }

  /* ---------- 事件绑定 ---------- */
  function bind() {
    var searchInput = document.getElementById("searchInput");
    searchInput.addEventListener("input", function () {
      query = searchInput.value.trim();
      if (query) { route.view = "list"; route.category = null; route.tag = null; }
      render();
    });
    document.getElementById("themeBtn").addEventListener("click", function () {
      /* 顶栏这个按钮只切明暗（保持旧肌肉记忆）；换配色走「设置 → 外观」或命令面板 */
      modePref = effTheme() === "light" ? "dark" : "light";
      applyTheme();
    });
    /* 正文排版：range / select 都是即时生效 + 即时持久化（#app 内容会被整体替换，故用委托） */
    var appEl = document.getElementById("app");
    function onTypeInput(e) {
      var t = e.target;
      if (!t || !t.getAttribute) return;
      var k = t.getAttribute("data-type-key");
      if (!k || TYPE_KEYS.indexOf(k) < 0) return;
      var v = Number(t.value);
      if (!isFinite(v) || v <= 0 || typeCfg[k] === v) return;
      typeCfg[k] = v;
      applyType(); saveType();
      var out = t.parentNode.querySelector("[data-type-out]");
      if (out) out.textContent = typeOut(k);
      var rb = appEl.querySelector('[data-action="reset-type"]');
      if (rb) rb.disabled = typeIsDefault();
    }
    appEl.addEventListener("input", onTypeInput);
    appEl.addEventListener("change", onTypeInput);
    document.getElementById("importBtn").addEventListener("click", function () { document.getElementById("fileInput").click(); });
    var sbT = document.getElementById("sidebarToggle");
    if (sbT) sbT.addEventListener("click", toggleSidebar);
    var asT = document.getElementById("asideToggle");
    if (asT) asT.addEventListener("click", toggleAside);
    var dkB = document.getElementById("dockBtn");
    if (dkB) dkB.addEventListener("click", function () { dockOpen(!dock.open); });
    bindDock();
    window.addEventListener("scroll", scheduleScrollUI, { passive: true });
    var wasNarrow = window.innerWidth <= 880;
    window.addEventListener("resize", function () {
      updateScrollUI();
      if (route.view === "editor") applyEdLayout();
      var narrow = window.innerWidth <= 880;
      if (narrow !== wasNarrow) { wasNarrow = narrow; applySidebarState(); }
    });
    var ttBtn = document.getElementById("toTop");
    if (ttBtn) ttBtn.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });
    document.getElementById("fileInput").addEventListener("change", function (e) { handleFiles(e.target.files); e.target.value = ""; });
    document.getElementById("backupInput").addEventListener("change", function (e) {
      if (e.target.files && e.target.files[0]) backupImport(e.target.files[0]);
      e.target.value = "";
    });
    var drop = document.getElementById("drop");
    document.addEventListener("dragover", function (e) { e.preventDefault(); drop.classList.add("show"); });
    document.addEventListener("dragleave", function (e) { if (e.target === document || e.clientX === 0) drop.classList.remove("show"); });
    document.addEventListener("drop", function (e) {
      e.preventDefault(); drop.classList.remove("show");
      if (e.dataTransfer && e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
    });
    window.addEventListener("beforeunload", flushMinutes);
    document.addEventListener("visibilitychange", function () { if (document.hidden) flushMinutes(); });
    var ckBtn = document.getElementById("cmdkBtn");
    if (ckBtn) {
      var kk = ckBtn.querySelector(".kk");
      if (kk) kk.textContent = cmdkKeyLabel();
      ckBtn.addEventListener("click", openCmdk);
    }

    document.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && (e.code === "KeyK" || e.key === "k" || e.key === "K")) {
        e.preventDefault();
        if (cmdkOpen) closeCmdk(); else openCmdk();
        return;
      }
      /* ⌘/Ctrl + 1..4：直达侧栏前四项（首页 / 全部笔记 / 知识链 / 今日复习） */
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && /^[1-5]$/.test(e.key) && !modalState) {
        var nav4 = ["home", "all-notes", "chain", "review", "board"];
        e.preventDefault();
        gotoView(nav4[Number(e.key) - 1]);
        return;
      }
      /* ⌘/Ctrl + N：快速新建。Chrome 会优先占用 Ctrl+N，所以设置页里也写了 ⌘K 的替代路径 */
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && (e.code === "KeyN" || e.key === "n" || e.key === "N")) {
        e.preventDefault();
        openQuickNew();
        return;
      }
      if (e.key === "Escape" && cmdkOpen) { closeCmdk(); return; }
      if (e.altKey && (e.code === "KeyA" || e.key === "a" || e.key === "A")) {
        e.preventDefault(); dockOpen(!dock.open); return;
      }
      if (e.key === "Escape" && dock.open && document.activeElement &&
          document.activeElement.id === "dockInput") { dockOpen(false); return; }
      if (e.key === "Escape" && modalState) { hideModal(); return; }
      /* Esc 也要关得掉查找栏与朗读条：此前只有在输入框里按才关得掉 */
      if (e.key === "Escape" && findState.on) { closeFind(); return; }
      if (e.key === "Escape" && ttsState.on) { ttsStopAll(); render(); return; }
      if ((e.ctrlKey || e.metaKey) && (e.key === "f" || e.key === "F") && route.view === "article") {
        e.preventDefault(); openFind(); return;
      }
      if (e.key === "Escape" && findState.on) { closeFind(); return; }
      if (e.key === "Escape" && immersive) { immersive = false; document.body.classList.remove("immersive"); render(); return; }
      var tag = (e.target && e.target.tagName || "").toLowerCase();
      var typing = tag === "input" || tag === "textarea" || tag === "select" || (e.target && e.target.isContentEditable);
      if (!typing && e.key === "/") { e.preventDefault(); var si = document.getElementById("searchInput"); if (si) si.focus(); }
    });

    document.addEventListener("click", function (e) {
      var el = e.target.closest("[data-action]");
      if (!el) return;
      var act = el.getAttribute("data-action");
      var id = el.getAttribute("data-id");
      var cat = el.getAttribute("data-cat");
      var tag = el.getAttribute("data-tag");
      var lvl = el.getAttribute("data-lvl");

      if (act === "home") { route = { view: "home" }; query = ""; searchInput.value = ""; render(); }
      else if (act === "all-notes") { prevRoute = Object.assign({}, route); route = { view: "list", category: null, tag: null }; query = ""; searchInput.value = ""; render(); window.scrollTo(0, 0); }
      else if (act === "chain") { prevRoute = Object.assign({}, route); route = { view: "chain" }; render(); window.scrollTo(0, 0); }
      else if (act === "chain-cat") { chainCat = cat || null; render(); window.scrollTo(0, 0); }
      else if (act === "chain-done") {
        if (chain.done[id]) delete chain.done[id];
        else { chain.done[id] = true; recordActivity(); }
        saveChain(); render();
        toast(chain.done[id] ? "这一环已完成，下一环解锁" : "已取消完成标记");
      }
      else if (act === "chain-unlock") { chain.open[id] = true; saveChain(); render(); toast("已手动解锁这一环"); }
      else if (act === "chain-unlock-all") {
        var _cns = chainNodes(chainCat);
        _cns.forEach(function (n) { chain.open[n.a.id] = true; });
        saveChain(); render(); toast("已解锁这条链的全部 " + _cns.length + " 环");
      }
      else if (act === "chain-reset") chainReset();
      else if (act === "chain-path") chainToPath();
      else if (act === "chain-strict") {
        chain.strict = !chain.strict; saveChain(); render();
        toast(chain.strict ? "严格串联：必须按顺序解锁" : "自由学习：所有环都可以直接学");
      }
      else if (act === "chain-start") {
        var _cnodes = chainNodes(chainCat), _ctgt = null;
        for (var _ci = 0; _ci < _cnodes.length; _ci++) {
          if (ringState(_cnodes, _ci) === "active") { _ctgt = _cnodes[_ci]; break; }
        }
        if (!_ctgt) { toast("这条链已经全部完成"); return; }
        var _cel = document.querySelector('.crow[data-id="' + _ctgt.a.id + '"]');
        scrollToEl(_cel);
        if (_cel) {
          _cel.classList.add("spot");
          setTimeout(function () { _cel.classList.remove("spot"); }, 1800);
        }
      }
      else if (act === "dock-open") { dockOpen(true); }
      else if (act === "dock-close") { dockOpen(false); }
      else if (act === "dock-role") {
        aiRole = id; aiCfg.role = id; aiSave(); renderDock();
        toast("已切换 AI 角色：" + roleById(id).name);
      }
      else if (act === "dock-clearsel") { dockSel = ""; renderDockCtx(); }
      else if (act === "dock-clear") {
        if (!dock.msgs.length) { toast("对话已经是空的"); return; }
        showModal({
          title: "清空侧边窗对话", okText: "清空",
          body: '<p class="modal-hint">将删除这 <b>' + dock.msgs.length + "</b> 条对话记录。笔记内容与学习进度不受影响。</p>",
          onOk: function () { dock.msgs = []; saveDock(); renderDockLog(); renderDockCtx(); toast("已清空对话"); }
        });
      }
      else if (act === "dock-send") {
        var _dIn = document.getElementById("dockInput");
        var _dQ = _dIn ? String(_dIn.value || "").trim() : "";
        if (!_dQ) { toast("先写点什么再发送"); return; }
        _dIn.value = ""; dockDraft = "";
        dockAsk(_dQ, _dQ);
      }
      else if (act === "dock-cards") {
        var _dIdx = parseInt(el.getAttribute("data-idx"), 10);
        var _dMsg = dock.msgs[_dIdx];
        if (!_dMsg) return;
        var _dPairs = parseQAPairs(_dMsg.content);
        _dPairs.forEach(function (p) { addCard(p.q, p.a, dock.noteId || ""); });
        toast(_dPairs.length ? "已导入 " + _dPairs.length + " 张闪卡" : "这段回复里没有识别到问答对");
      }
      else if (act.indexOf("dock-") === 0) {
        var _dq = dockQuickByAct(act);
        if (_dq) {
          dockAsk(_dq.label + (dockSel ? "：" + dockSel.slice(0, 46) + (dockSel.length > 46 ? "…" : "") : "（整篇笔记）"), _dq.ins);
        }
      }
      else if (act === "sel-ask") {
        var _ss = dockSelection();
        if (_ss) dockSel = _ss.text;
        hideSelBubble(); dockOpen(true);
        toast(dockSel ? "已带入选中段落，可以直接提问" : "已打开 AI 学习助手");
      }
      else if (act === "sel-explain") {
        var _ss2 = dockSelection();
        if (_ss2) dockSel = _ss2.text;
        hideSelBubble(); dockOpen(true);
        var _dq0 = DOCK_QUICK[0];
        dockAsk(_dq0.label + (dockSel ? "：" + dockSel.slice(0, 46) + (dockSel.length > 46 ? "…" : "") : "（整篇笔记）"), _dq0.ins);
      }
      else if (act === "nb-cat") { route.category = cat || null; render(); }
      else if (act === "open-category") { prevRoute = Object.assign({}, route); route = { view: "list", category: cat, tag: null }; query = ""; searchInput.value = ""; render(); window.scrollTo(0, 0); }
      else if (act === "search-tag") { prevRoute = Object.assign({}, route); route = { view: "list", category: null, tag: tag }; query = ""; searchInput.value = ""; render(); window.scrollTo(0, 0); }
      else if (act === "open-article") { prevRoute = Object.assign({}, route); route = { view: "article", id: id }; recordActivity(); render(); window.scrollTo(0, 0); }
      else if (act === "settings") { prevRoute = Object.assign({}, route); route = { view: "settings" }; render(); window.scrollTo(0, 0); }
      else if (act === "set-palette") {
        if (paletteIds().indexOf(id) >= 0 && id !== palette) {
          palette = id;
          applyTheme(); render();
          toast("配色已切换为「" + palName(palette) + "」");
        }
      }
      else if (act === "reset-type") {
        TYPE_KEYS.forEach(function (k) { typeCfg[k] = TYPE_DEFAULTS[k]; });
        applyType(); saveType(); render();
        toast("正文排版已恢复默认");
      }
      else if (act === "set-mode") {
        if (id === "light" || id === "dark" || id === "system") {
          modePref = id;
          applyTheme(); render();
          toast("明暗：" + modeName(modePref) +
            (modePref === "system" ? "（跟随系统当前为" + modeName(effTheme()) + "）" : ""));
        }
      }
      else if (act === "canvas") { prevRoute = Object.assign({}, route); route = { view: "canvas" }; render(); window.scrollTo(0, 0); }
      else if (act === "review") { prevRoute = Object.assign({}, route); route = { view: "review" }; session = { list: [], idx: 0, revealed: false }; render(); window.scrollTo(0, 0); }
      else if (act === "board") { prevRoute = Object.assign({}, route); route = { view: "board" }; render(); window.scrollTo(0, 0); }
      else if (act === "board-cat") { boardCat = cat || null; render(); }
      else if (act === "board-up") { moveToLevel(id, parseInt(lvl, 10)); }
      else if (act === "cards") { prevRoute = Object.assign({}, route); route = { view: "cards" }; render(); window.scrollTo(0, 0); }
      else if (act === "graph") { prevRoute = Object.assign({}, route); route = { view: "graph" }; render(); window.scrollTo(0, 0); }
      else if (act === "new-note") { prevRoute = Object.assign({}, route); route = { view: "editor", id: null }; render(); window.scrollTo(0, 0); }
      else if (act === "edit-note") { prevRoute = Object.assign({}, route); route = { view: "editor", id: id }; render(); window.scrollTo(0, 0); }
      else if (act === "back") { route = prevRoute; render(); window.scrollTo(0, 0); }
      else if (act === "set-mastery") { setMastery(id, parseInt(lvl, 10)); render(); toast("已标记：" + MASTERY[parseInt(lvl, 10)].name); }
      else if (act === "toggle-review") {
        progress.review[id] = !progress.review[id]; saveProgress(); render();
        var _ra = findArticle(id);
        logEvent("review", (progress.review[id] ? "加入复习《" : "移出复习《") + ((_ra && _ra.title) || "笔记") + "》", id);
        toast(progress.review[id] ? "已加入复习" : "已移出复习");
      }
      else if (act === "gen-cards") {
        var a = findArticle(id);
        var gen = a ? cardsFromArticle(a) : [];
        gen.forEach(function (c) { addCard(c.q, c.a, id); });
        toast(gen.length ? "已生成 " + gen.length + " 张闪卡" : "这篇笔记没有可生成的小节");
        render();
      }
      else if (act === "add-card") {
        var q = ((document.getElementById("cardQ") || {}).value || "").trim();
        var an = ((document.getElementById("cardA") || {}).value || "").trim();
        if (!q || !an) { toast("正面和背面都要填"); return; }
        addCard(q, an, ""); toast("已添加闪卡"); render();
      }
      else if (act === "del-card") { deleteCard(id); render(); toast("已删除闪卡"); }
      else if (act === "reveal") { session.revealed = true; render(); }
      else if (act === "grade") {
        var grade = el.getAttribute("data-grade");
        var cd = cards.filter(function (x) { return x.id === id; })[0];
        if (cd) gradeCard(cd, grade);
        session.idx++; session.revealed = false;
        if (session.idx >= session.list.length) session = { list: [], idx: 0, revealed: false };
        render();
      }
      else if (act === "analytics") { prevRoute = Object.assign({}, route); route = { view: "analytics" }; render(); window.scrollTo(0, 0); }
      else if (act === "todo-dismiss") dismissTask(el.getAttribute("data-key"));
      else if (act === "todo-restore") restoreDismissed();
      else if (act === "fold") toggleFold(el.getAttribute("data-sec"));
      else if (act === "fold-all") toggleFoldAll();
      else if (act === "open-find") openFind();
      else if (act === "find-next") findGo(1);
      else if (act === "find-prev") findGo(-1);
      else if (act === "find-close") closeFind();
      else if (act === "tts") { if (ttsState.on) ttsStopAll(); else ttsStart(); }
      else if (act === "tts-pause") ttsTogglePause();
      else if (act === "tts-stop") ttsStopAll();
      else if (act === "voice") voiceToggle();
      else if (act === "exp-md") exportArticleMd(id);
      else if (act === "exp-html") exportArticleHtml(id);
      else if (act === "exp-copy") copyArticleMd(id);
      else if (act === "exp-print") window.print();
      else if (act === "exp-all") exportAllMd();
      else if (act === "clear-all-notes") clearAllNotes();
      else if (act === "modal-cancel") hideModal();
      else if (act === "modal-ok") {
        var st = modalState;
        var vals = {};
        if (st && st.fields) {
          st.fields.forEach(function (f) {
            var inp = document.querySelector('#modal [data-field="' + f.name + '"]');
            vals[f.name] = inp ? String(inp.value).trim() : "";
          });
        }
        hideModal();
        if (st && st.onOk) st.onOk(vals);
      }
      else if (act === "jump") {
        var t3 = document.getElementById(el.getAttribute("data-sec"));
        if (t3) t3.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      else if (act === "nb-view") {
        nbView = el.getAttribute("data-v") || "list";
        localStorage.setItem("lls_nbview", nbView);
        render();
      }
      else if (act === "gp-cat") {
        if (graphState.offCats[cat]) delete graphState.offCats[cat];
        else graphState.offCats[cat] = 1;
        el.classList.toggle("on", !graphState.offCats[cat]);
        applyCatFilter();
      }
      else if (act === "gp-labels") {
        var cur1 = graphLabelMode();
        graphState.labels = cur1 === "all" ? "key" : (cur1 === "key" ? "off" : "all");
        applyLabelMode();
        el.textContent = graphLabelText();
        el.classList.toggle("primary", graphLabelMode() !== "off");
      }
      else if (act === "gp-iso") {
        graphState.hideIso = !graphState.hideIso;
        el.classList.toggle("primary", graphState.hideIso);
        var gs2 = document.getElementById("gpSvg");
        if (gs2) gs2.classList.toggle("hide-iso", graphState.hideIso);
      }
      else if (act === "gp-relayout") {
        graphState.k = 1; graphState.tx = 0; graphState.ty = 0;
        setupGraph(); toast("已重新布局");
      }
      else if (act === "gp-reset") {
        graphState.k = 1; graphState.tx = 0; graphState.ty = 0;
        applyView(); toast("视图已重置");
      }
      else if (act === "gp-in") graphZoom(1.2);
      else if (act === "gp-out") graphZoom(1 / 1.2);
      else if (act === "gp-sel") { graphState.sel = id; applyHighlight(id); renderAside(); }
      else if (act === "gp-unsel") { graphState.sel = null; applyHighlight(null); renderAside(); }
      else if (act === "gp-open") openGraphNode(id);
      else if (act === "wikilink") {
        var ttl = el.getAttribute("data-title");
        var tgt = articleByTitle(ttl);
        if (tgt) { prevRoute = Object.assign({}, route); route = { view: "article", id: tgt.id }; recordActivity(); render(); window.scrollTo(0, 0); }
        else toast("还没有《" + ttl + "》这篇笔记");
      }
      else if (act === "ai") {
        var aid2 = el.getAttribute("data-id") || null;
        prevRoute = Object.assign({}, route);
        if (!(route.view === "ai" && route.id === aid2)) aiMsgs = [];
        route = { view: "ai", id: aid2 }; render(); window.scrollTo(0, 0);
      }
      else if (act === "aiconfig") { prevRoute = Object.assign({}, route); route = { view: "aiconfig" }; render(); window.scrollTo(0, 0); }
      else if (act === "ai-fetch-models") aiFetchModels();
      else if (act === "ai-write-presets") {
        var wN = writeModelsToPresets(aiFetched.list, false);
        toast(wN ? "已写入 " + wN + " 个新模型到预设" : "预设里已经有了，没有新增");
        render();
      }
      else if (act === "ai-clear-presets") {
        aiModels = []; saveModels();
        toast("已清空模型预设");
        render();
      }
      else if (act === "ai-use-model") {
        var useM = el.getAttribute("data-m") || "";
        if (useM) {
          aiCfg.model = useM; aiSave();
          var inP = aiModels.some(function (m) { return m.model === useM; });
          if (!inP) { aiModels.push({ name: useM, model: useM }); saveModels(); }
          toast("当前模型：" + useM);
        }
        render();
      }
      else if (act === "ai-toggle-key") { window.__aiKeyShow = !window.__aiKeyShow; render(); }
      else if (act === "ai-test") aiTestConn();
      else if (act === "ai-send") {
        var inp = document.getElementById("aiInput");
        var qq2 = (inp && inp.value || "").trim();
        if (qq2) aiSend(qq2, route.id ? aiNotePrompt(qq2) : qq2);
      }
      else if (act === "ai-clear") { aiMsgs = []; aiDraft = ""; render(); }
      else if (act === "ai-role") { aiRole = id; aiCfg.role = id; aiSave(); render(); toast("已切换 AI 角色：" + roleById(id).name); }
      else if (act === "history") { prevRoute = Object.assign({}, route); histViewIdx = -1; route = { view: "history", id: id }; render(); window.scrollTo(0, 0); }
      else if (act === "immersive") { immersive = !immersive; document.body.classList.toggle("immersive", immersive); render(); }
      else if (act === "hist-view") { histViewIdx = parseInt(el.getAttribute("data-i"), 10); render(); }
      else if (act === "hist-del") {
        (versions[route.id] || []).splice(parseInt(el.getAttribute("data-i"), 10), 1);
        localStorage.setItem(STORE_VERSIONS, JSON.stringify(versions));
        histViewIdx = -1; render();
      }
      else if (act === "hist-restore") {
        var hi2 = parseInt(el.getAttribute("data-i"), 10);
        var arr2 = versions[route.id] || [];
        if (!arr2[hi2]) return;
        if (!confirm("回滚到该版本？当前内容会先存为一个新版本。")) return;
        var cur = findArticle(route.id);
        if (cur) saveVersion(route.id, cur.md || "", cur.title);
        var md3 = arr2[hi2].md;
        var obj3 = {
          id: route.id, title: cur ? cur.title : "", category: cur ? (cur.category || "未分类") : "未分类",
          tags: cur ? (cur.tags || []) : [], date: todayKey(),
          wordCount: (md3.replace(/\s/g, "").match(/[一-鿿]/g) || []).length + (md3.match(/[A-Za-z0-9]+/g) || []).length,
          html: jsMdToHtml(md3), md: md3
        };
        var ex3 = notes.filter(function (n) { return n.id === route.id; })[0];
        if (ex3) Object.keys(obj3).forEach(function (k) { ex3[k] = obj3[k]; });
        else notes.push(obj3);
        saveNotes();
        toast("已回滚到该版本");
        route = { view: "article", id: route.id };
        render();
      }
      else if (act === "add-model") {
        var mn = ((document.getElementById("mdName") || {}).value || "").trim();
        var mm2 = ((document.getElementById("mdModel") || {}).value || "").trim();
        if (!mm2) { toast("模型名不能为空"); return; }
        aiModels.push({ name: mn || mm2, model: mm2 });
        localStorage.setItem(STORE_AI_MODELS, JSON.stringify(aiModels));
        toast("已添加模型预设"); render();
      }
      else if (act === "del-model") {
        aiModels.splice(parseInt(el.getAttribute("data-i"), 10), 1);
        localStorage.setItem(STORE_AI_MODELS, JSON.stringify(aiModels));
        render();
      }
      else if (act === "ai-sum") aiSend("<i class=ic data-ico=board></i> 总结要点", aiNotePrompt("请用 3-5 条要点总结这篇笔记，最后给出一句话核心结论。"));
      else if (act === "ai-quiz") aiSend("<i class=ic data-ico=think></i> 出题考我", aiNotePrompt("基于这篇笔记出 5 道题：3 道简答 + 2 道单选。先只给题目，最后统一给出答案和简要解析。"));
      else if (act === "ai-cards") aiSend("<i class=ic data-ico=cards></i> AI 生成闪卡", aiNotePrompt("基于这篇笔记生成 5-8 张记忆闪卡。严格按下面格式输出，不要任何多余内容：\nQ: 问题\nA: 答案\n---\nQ: 问题\nA: 答案"));
      else if (act === "ai-hard") aiSend("<i class=ic data-ico=bulb></i> 解释难点", aiNotePrompt("找出这篇笔记中最容易混淆或最难懂的 2-3 个点，用通俗类比讲给初学者听。"));
      else if (act === "ai-import-cards") {
        var ix = parseInt(el.getAttribute("data-idx"), 10);
        var mm = aiMsgs[ix];
        var pairs = mm ? parseQAPairs(mm.content) : [];
        if (!pairs.length) { toast("没解析到问答对"); return; }
        pairs.forEach(function (p) { addCard(p.q, p.a, route.id || ""); });
        toast("已导入 " + pairs.length + " 张闪卡");
      }
      else if (act === "save-ai") {
        aiCfg.base = ((document.getElementById("aiBase") || {}).value || "").trim() || aiCfg.base;
        aiCfg.key = ((document.getElementById("aiKey") || {}).value || "").trim();
        aiCfg.model = ((document.getElementById("aiModel") || {}).value || "").trim() || aiCfg.model;
        aiSave(); toast("AI 配置已保存"); render();
      }
      else if (act === "clear-ai") { aiCfg.key = ""; aiSave(); toast("已清除密钥"); render(); }
      else if (act === "practice") { prevRoute = Object.assign({}, route); route = { view: "practice" }; render(); window.scrollTo(0, 0); }
      else if (act === "mistakes") {
        prevRoute = Object.assign({}, route);
        route = { view: "mistakes" };
        misState.mode = "list";
        render(); window.scrollTo(0, 0);
      }
      else if (act === "mis-mode") {
        misState.mode = el.getAttribute("data-v") || "list";
        if (misState.mode === "review") misStartReview();
        render();
      }
      else if (act === "mis-filter") { misState.filter = el.getAttribute("data-v") || "all"; misState.open = ""; render(); }
      else if (act === "mis-start") { misStartReview(); if (misState.mode === "review") render(); }
      else if (act === "mis-reveal") { misState.revealed = true; render(); }
      else if (act === "mis-rate") {
        var mid1 = el.getAttribute("data-id");
        misGrade(mid1, el.getAttribute("data-v") || "good");
        misState.revealed = false;
        misState.idx++;
        render();
        if (misState.idx >= misState.session.length) toast("本轮错题复习完成 ✓");
      }
      else if (act === "mis-toggle") {
        var mid2 = el.getAttribute("data-id");
        misState.open = misState.open === mid2 ? "" : mid2;
        render();
      }
      else if (act === "mis-add" || act === "mis-edit") {
        var mid3 = el.getAttribute("data-id");
        misForm(mid3 ? misOf(mid3) : null);
      }
      else if (act === "mis-del") {
        var mid4 = el.getAttribute("data-id");
        var mi = misOf(mid4);
        if (!mi) return;
        showModal({
          title: "删除这道错题？",
          danger: true, okText: "删除",
          body: "<p>将从错题集移除，不可恢复。复习进度也会一并丢失。</p>" +
            '<div class="mis-quote">' + esc(mi.q.slice(0, 120)) + "</div>",
          onOk: function () {
            var ix = mis.list.map(function (m) { return m.id; }).indexOf(mid4);
            if (ix >= 0) { mis.list.splice(ix, 1); saveMis(); }
            misState.session = misState.session.filter(function (s2) { return s2 !== mid4; });
            if (misState.idx >= misState.session.length && misState.mode === "review") misState.idx = misState.session.length;
            toast("已删除"); render();
          }
        });
      }
      else if (act === "mis-master") {
        var mid5 = el.getAttribute("data-id");
        var m5 = misOf(mid5);
        if (m5) {
          m5.mastered = !m5.mastered;
          if (m5.mastered) { m5.box = 5; m5.due = Date.now() + INTERVALS[5]; }
          else { m5.box = 0; m5.due = Date.now(); }
          saveMis();
          toast(m5.mastered ? "已标记掌握（不再出现在复习队列）" : "已重新加入复习队列");
          render();
        }
      }
      else if (act === "mis-ai") misAiAnalysis(el.getAttribute("data-id"));
      else if (act === "mis-collect") {
        var mr = misCollectQuiz(false, true);
        if (mr) render();
      }
      else if (act === "mis-export") misExportMd();
      else if (act === "mis-review-one") {
        var mid6 = el.getAttribute("data-id");
        var m6 = misOf(mid6);
        if (!m6) return;
        m6.due = 0; saveMis();
        misState.session = [mid6]; misState.idx = 0; misState.revealed = false; misState.mode = "review";
        render(); window.scrollTo(0, 0);
      }
      else if (act === "practice-gen") practiceGen();
      else if (act === "qz-pick") { if (practice.q) { practice.picked = practice.q.options[parseInt(el.getAttribute("data-i"), 10)]; render(); } }
      else if (act === "qz-submit") {
        if (!practice.q) return;
        var skip = el.getAttribute("data-skip") === "1";
        if (practice.q.type !== "single") {
          var ta2 = document.getElementById("qzAns");
          practice.picked = ta2 ? (ta2.value || "").trim() : "";
        }
        if (!skip && practice.q.type === "single" && !practice.picked) { toast("先选一个答案"); return; }
        if (!skip && practice.q.type === "single") {
          var an2 = practice.q.answer, m3 = an2.match(/^[A-Da-d]$/);
          if (m3) an2 = practice.q.options["ABCD".indexOf(m3[0].toUpperCase())] || an2;
          practiceRecord(practice.picked === an2);
        }
        practice.submitted = true; render();
      }
      else if (act === "qz-rate") { practiceRecord(el.getAttribute("data-v") === "1"); toast("已记录"); render(); }
      else if (act === "qz-askai") {
        var qz = practice.q;
        if (!qz) return;
        var pp = "题目：" + qz.question + "\n" +
          (qz.options.length ? "选项：\n" + qz.options.map(function (o, i) { return "ABCD".charAt(i) + ". " + o; }).join("\n") + "\n" : "") +
          "参考答案：" + qz.answer + "\n\n请详细讲解这道题的解题思路、涉及的知识点，以及容易踩的坑。";
        prevRoute = Object.assign({}, route);
        aiMsgs = [];
        route = { view: "ai", id: qz.noteId };
        aiSend("<i class=ic data-ico=chat></i> 就这题追问 AI", aiNotePrompt(pp));
      }
      else if (act === "new-path") openPathForm(null);
      else if (act === "use-path") {
        var rec = null;
        for (var ri = 0; ri < RECO_PATH.length; ri++) if (RECO_PATH[ri].id === id) rec = RECO_PATH[ri];
        if (rec) {
          var rsteps = recoSteps(rec.keys);
          var rnp = { id: rec.id, title: rec.title, desc: rec.desc, steps: rsteps, doneMap: {} };
          paths.push(rnp); savePaths();
          prevRoute = Object.assign({}, route);
          route = { view: "path", pathId: rnp.id };
          render(); window.scrollTo(0, 0);
          toast("已创建「" + rec.title + "」共 " + rsteps.length + " 步");
        }
      }
      else if (act === "path-edit") openPathForm(findPath(id));
      else if (act === "path-done") {
        var pd = findPath(id), pdi = parseInt(el.getAttribute("data-i"), 10);
        if (pd && pd.steps[pdi]) {
          if (!pd.doneMap) pd.doneMap = {};
          var sk = pd.steps[pdi];
          if (pd.doneMap[sk]) delete pd.doneMap[sk];
          else { pd.doneMap[sk] = 1; recordActivity(); }
          savePaths(); render();
        }
      }
      else if (act === "open-path") { prevRoute = Object.assign({}, route); route = { view: "path", pathId: id }; render(); window.scrollTo(0, 0); }
      else if (act === "path-add") {
        var p2 = findPath(id);
        var sel = document.getElementById("pathPick");
        if (p2 && sel && sel.value) { p2.steps.push(sel.value); savePaths(); render(); }
      }
      else if (act === "path-remove") {
        var p3 = findPath(id);
        if (p3) { p3.steps.splice(parseInt(el.getAttribute("data-i"), 10), 1); savePaths(); render(); }
      }
      else if (act === "path-up") {
        var p4 = findPath(id), i4 = parseInt(el.getAttribute("data-i"), 10);
        if (p4 && i4 > 0) { var tmp2 = p4.steps[i4]; p4.steps[i4] = p4.steps[i4 - 1]; p4.steps[i4 - 1] = tmp2; savePaths(); render(); }
      }
      else if (act === "path-down") {
        var p5 = findPath(id), i5 = parseInt(el.getAttribute("data-i"), 10);
        if (p5 && i5 < p5.steps.length - 1) { var tmp3 = p5.steps[i5]; p5.steps[i5] = p5.steps[i5 + 1]; p5.steps[i5 + 1] = tmp3; savePaths(); render(); }
      }
      else if (act === "path-del") {
        if (confirm("删除这条学习路径？（笔记本身不受影响）")) {
          var i6 = paths.map(function (x) { return x.id; }).indexOf(id);
          if (i6 >= 0) paths.splice(i6, 1);
          savePaths(); route = { view: "home" }; render();
        }
      }
      else if (act === "ed-ins") wrapSel(document.getElementById("edMd"), el.getAttribute("data-b"), el.getAttribute("data-a"));
      else if (act === "toggle-preview") {
        edPreviewOn = !edPreviewOn;
        applyEdLayout();
      }
      else if (act === "save-note") {
        var t2 = ((document.getElementById("edTitle") || {}).value || "").trim();
        var md = (document.getElementById("edMd") || {}).value || "";
        if (!t2) { toast("标题不能为空"); return; }
        var prevNote = findArticle(nid);
        if (prevNote && prevNote.md !== undefined && prevNote.md !== md) saveVersion(nid, prevNote.md, prevNote.title);
        var c2 = ((document.getElementById("edCat") || {}).value || "未分类").trim();
        var tg = (((document.getElementById("edTags") || {}).value) || "").split(/[,，\s]+/).filter(Boolean);
        var nid = route.id || ("note-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6));
        var htmlv = jsMdToHtml(md);
        var wc = (md.replace(/\s/g, "").match(/[一-鿿]/g) || []).length + (md.match(/[A-Za-z0-9]+/g) || []).length;
        var obj = { id: nid, title: t2, category: c2, tags: tg, date: todayKey(), wordCount: wc, html: htmlv, md: md };
        var ex = notes.filter(function (n) { return n.id === nid; })[0];
        if (ex) Object.keys(obj).forEach(function (k) { ex[k] = obj[k]; });
        else { notes.push(obj); logEvent("note", "新建笔记《" + t2 + "》", nid); }
        saveNotes();
        delete drafts[route.id || "new"];
        saveDrafts();
        recordActivity();
        toast("已保存");
        route = { view: "article", id: nid };
        render();
      }
      else if (act === "save-goal") {
        var g = parseInt(((document.getElementById("goalInput") || {}).value || "5"), 10);
        goal = g > 0 ? g : 5;
        localStorage.setItem(STORE_GOAL, String(goal));
        toast("目标已保存"); render();
      }
      else if (act === "cmdk-open") openCmdk();
      else if (act === "cmdk-close") closeCmdk();
      else if (act === "cmdk-go") cmdkGo(parseInt(el.getAttribute("data-i"), 10));
      else if (act === "backup-export") backupExport();
      else if (act === "backup-import") document.getElementById("backupInput").click();
      else if (act === "delete-article") {
        var da = findArticle(id);
        if (confirm("确定删除《" + (da ? da.title : "该笔记") + "》？可在「设置 → 删除学习内容」中恢复。")) {
          deleteArticle(id); toast("已删除（设置中可恢复）"); render();
        }
      }
      else if (act === "restore-article") { restoreArticle(id); toast("已恢复"); render(); }
      else if (act === "clear-import") {
        showModal({
          title: "清空导入的笔记？",
          danger: true,
          body: "<p>将移除浏览器内导入的 <b>" + imported.length + "</b> 篇笔记。</p>" +
            '<p class="modal-hint">源文件 <code>content/</code> 不受影响。</p>' +
            '<p class="modal-danger-line">此操作不可撤销。</p>',
          confirmText: "清空",
          okText: "确认清空",
          extra: '<button class="btn" data-action="backup-export">先导出备份</button>',
          onOk: function () {
            imported = []; saveImported();
            route = { view: "settings" };
            render();
            toast("已清空导入的笔记");
          }
        });
      }
    });
  }

  /* ---------- 启动 ---------- */
  (function migrate() {
    var changed = false;
    Object.keys(progress.read || {}).forEach(function (id) {
      if (progress.read[id] && progress.mastery[id] === undefined) { progress.mastery[id] = 2; changed = true; }
    });
    if (changed) saveProgress();
  })();

  if ("serviceWorker" in navigator && (location.protocol === "http:" || location.protocol === "https:")) {
    window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () {}); });
  }

  /* 启动骨架退场：与 index.html 里的 #boot 配套。
     顺序不能反——先摘 .booting 放开过渡，再淡出骨架，最后删节点。 */
  function dismissBoot() {
    document.documentElement.classList.remove("booting");
    var b = document.getElementById("boot");
    if (!b) return;
    b.classList.add("is-out");
    setTimeout(function () {
      document.documentElement.classList.remove("js-boot");
      if (b.parentNode) b.parentNode.removeChild(b);
    }, 280);
  }

  document.documentElement.classList.add("booting");
  applyTheme();
  applyType();
  applySidebarState();
  injectGlassDefs();
  bindGlassSheen();
  bind();
  render();
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      dismissBoot();
      /* 首屏驾驶舱不含公式，等画面稳定后再预热 KaTeX（prefetch 最低优先级，不抢关键资源带宽） */
      if (typeof requestIdleCallback === "function") requestIdleCallback(prefetchKatex, { timeout: 3000 });
      else setTimeout(prefetchKatex, 1200);
    });
  });
})();
