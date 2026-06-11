/**
 * 英语语法内容数据
 * @author listen-english
 */

export interface GrammarCard {
  title: string;
  rule?: string;
  table?: { headers: string[]; rows: string[][] };
  examples?: string[];
  notes?: string;
}

export interface GrammarSubsection {
  id: string;
  title: string;
  cards: GrammarCard[];
}

export interface GrammarSection {
  id: string;
  title: string;
  subsections: GrammarSubsection[];
}

export const grammarSections: GrammarSection[] = [
  {
    id: "structure",
    title: "1. 语法结构核心体系",
    subsections: [
      {
        id: "sentence-components",
        title: "1.1 句子成分与基本架构",
        cards: [
          {
            title: "主语、谓语、宾语 (SVO)",
            rule: "英语基本语序为 主语-谓语-宾语(SVO)。主语为动作执行者，谓语为句子核心述谓成分，宾语为动作承受者。第三人称单数主语需与谓语动词保持人称和数的一致。",
            table: {
              headers: ["成分", "功能", "典型形式", "位置"],
              rows: [
                ["主语", "动作执行者/状态承载者", "名词、代词、名词短语、从句", "句首，谓语之前"],
                ["谓语", "表达动作、状态、事件", "动词或动词短语（含助/情态动词）", "主语之后"],
                ["直接宾语", "动作的直接承受者", "名词短语、代词、从句", "及物动词之后"],
                [
                  "间接宾语",
                  "动作的受益者/接收者",
                  "名词短语、代词",
                  "动词与直宾之间，或介词to/for后",
                ],
                [
                  "表语",
                  "说明主语性质、身份、状态",
                  "名词短语、形容词短语、介词短语",
                  "系动词之后",
                ],
                [
                  "宾语补语",
                  "补充说明宾语状态或结果",
                  "名词短语、形容词短语、不定式、分词",
                  "宾语之后",
                ],
              ],
            },
            examples: ['"She (主语) gave (谓语) him (间宾) a book (直宾)."'],
          },
          {
            title: "定语、状语、补语",
            rule: "定语修饰名词，前置遵循'观点→大小→形状→年龄→颜色→来源→材料→用途'规则。状语修饰动词/形容词/副词/整句，位置灵活。补语是完成谓语语义不可或缺的成分。",
            examples: [
              '"a lovely small old rectangular brown French oak writing desk"（定语语序）',
              '"Something important"（后置定语修饰不定代词）',
              '"They elected him president"（宾语补语）',
            ],
          },
        ],
      },
      {
        id: "tense-system",
        title: "1.2 时态系统",
        cards: [
          {
            title: "过去时态对比",
            rule: "过去时态系统包括4种形式，共同建立叙事时间背景和时序关系。",
            table: {
              headers: ["时态", "结构", "核心功能", "例句"],
              rows: [
                [
                  "一般过去时",
                  "V-ed（规则）/不规则",
                  "过去完成的动作或状态",
                  '"She graduated from UNC."',
                ],
                [
                  "过去进行时",
                  "was/were + V-ing",
                  "过去某时正在进行的动作",
                  '"Dr. Jones was lecturing."',
                ],
                [
                  "过去完成时",
                  "had + V-ed/V3",
                  "过去的过去，建立时间先后关系",
                  '"My family had left."',
                ],
                [
                  "过去完成进行时",
                  "had been + V-ing",
                  "过去某时前持续进行的动作",
                  '"Had been working for 12 hours."',
                ],
              ],
            },
            notes:
              "过去进行时常与一般过去时搭配形成'长动作被短动作打断'模式。过去完成时在虚拟条件句中表达与过去事实相反的假设。",
          },
          {
            title: "现在时态对比",
            rule: "现在时态实际功能远超'现在时间'的字面意义。一般现在时具有'无时间性'特征，用于普遍真理和习惯。现在完成时强调'当前相关性'，不可与明确过去时间状语连用。",
            table: {
              headers: ["时态", "结构", "核心功能", "例句"],
              rows: [
                ["一般现在时", "V（三单V-s）", "习惯动作、真理、时间表", '"Water boils at 100°C."'],
                [
                  "现在进行时",
                  "am/is/are + V-ing",
                  "说话时正进行的动作",
                  '"I\'m playing football."',
                ],
                [
                  "现在完成时",
                  "have/has + V-ed/V3",
                  "过去动作与现在的关联",
                  '"I\'ve lost my keys."',
                ],
                [
                  "现在完成进行时",
                  "have/has been + V-ing",
                  "从过去持续至今，强调过程",
                  '"I\'ve been reading this book."',
                ],
              ],
            },
          },
          {
            title: "将来时态对比",
            rule: "英语将来表达多元化：will（预测/即时决定/承诺）、be going to（基于证据预测/事先意图）、现在进行时（已安排的近期计划）、一般现在时（时间表将来）、be to + V（正式安排）、be about to + V（即刻）。",
            table: {
              headers: ["时态", "结构", "核心功能"],
              rows: [
                ["一般将来时", "will + V / be going to + V", "预测、即时决定、计划"],
                ["将来进行时", "will be + V-ing", "将来某时正在进行的动作"],
                ["将来完成时", "will have + V-ed/V3", "将来某时前将已完成"],
                ["将来完成进行时", "will have been + V-ing", "将来某时前持续进行的动作（罕见）"],
              ],
            },
            examples: [
              '"Look at those clouds — it\'s going to rain."（基于证据预测）',
              '"The conference starts on Monday."（时间表将来）',
            ],
          },
          {
            title: "时态呼应原则",
            rule: "主句谓语为过去时态时，从句谓语通常需'回退'：现在时→过去时，现在完成时→过去完成时，将来时→过去将来时(would + V)。例外：普遍真理保留现在时、时间参照与说话时刻相关时重新计算。",
            examples: [
              '"He said she was tired."（间接引语时态后移）',
              '"He said that the earth is round."（普遍真理例外）',
            ],
          },
        ],
      },
      {
        id: "aspect",
        title: "1.3 体态（Aspect）",
        cards: [
          {
            title: "进行体 vs. 完成体",
            rule: "进行体(be + V-ing)表达动作的持续性、动态性和未完成性——'内部视角'。完成体(have + V-ed/V3)表达动作的'先行性'和'当前相关性'——建立两个时间点的关联。",
            examples: [
              '"I\'ve been reading your proposals."（完成进行体：强调持续过程，可能未读完）',
              '"I\'ve read your proposal."（完成体：强调动作完成和结果）',
            ],
            notes:
              "状态动词（know, believe, love, have表拥有）通常排斥进行体。特定语境中的动态化解读可突破限制（'I'm having dinner' / 'You're being foolish'）。完成体与明确过去时间状语不可兼容（*I have seen him yesterday）。",
          },
        ],
      },
      {
        id: "voice",
        title: "1.4 语态（Voice）",
        cards: [
          {
            title: "主动语态与被动语态",
            rule: "主动语态：S + V + (O)，主语为施事，直接简洁。被动语态：be + V-ed/V3，原宾语提升为主语，原主语降格为by-短语（可选）。核心语用功能：信息结构优化、施事隐退、客观性营造、语篇衔接。",
            table: {
              headers: ["功能", "机制", "应用场景"],
              rows: [
                ["信息结构优化", "受事前置为话题焦点", "受事比施事更重要"],
                ["施事隐退", "省略by-短语", "施事未知、不重要或需回避"],
                ["客观性营造", "消除第一人称主观印记", "学术写作、科技报告"],
                ["语篇衔接", "维持主语链连续性", "避免频繁更换主语"],
              ],
            },
            examples: [
              '"The experiment was conducted following standard protocols."（学术语体）',
              '"This book sells well."（中动语态：主动形式，被动意义）',
            ],
          },
        ],
      },
      {
        id: "mood",
        title: "1.5 语气（Mood）",
        cards: [
          {
            title: "四种语气类型",
            rule: "陈述语气(Indicative)：无标记，表达事实。祈使语气(Imperative)：动词原形，省略主语，表达命令/请求。虚拟语气(Subjunctive)：表达非现实性——与事实相反的假设、愿望、建议。",
            table: {
              headers: ["语气", "特征", "例句"],
              rows: [
                ["陈述语气", "无标记，真实性承诺", '"She is a doctor."'],
                ["祈使语气", "动词原形，隐含you", '"Please sit down." / "Don\'t move."'],
                ["虚拟语气(re)", "所有人称be用were", '"If I were you, I would apologize."'],
                ["虚拟语气(be)", "动词原形，无-s变化", '"It is essential that he be informed."'],
                ["虚拟语气(had)", "过去完成时", '"If I had known, I would have acted."'],
              ],
            },
          },
          {
            title: "条件句系统",
            rule: "if从句用一般现在时 → 零条件（普遍真理）/第一条件（真实可能）。if从句用一般过去时 → 第二条件（与现在相反）。if从句用过去完成时 → 第三条件（与过去相反）。正式语体可倒装省略if：Were I you... / Had I known...",
            table: {
              headers: ["条件类型", "if从句", "主句", "语义"],
              rows: [
                ["零条件", "一般现在时", "一般现在时", "普遍真理：If you heat ice, it melts"],
                [
                  "第一条件",
                  "一般现在时",
                  "will/can/may + V",
                  "将来可能：If it rains, we will cancel",
                ],
                [
                  "第二条件",
                  "一般过去时(be用were)",
                  "would/could + V",
                  "与现在相反：If I knew, I would tell you",
                ],
                [
                  "第三条件",
                  "过去完成时",
                  "would/could + have V-ed",
                  "与过去相反：If I had studied, I would have passed",
                ],
              ],
            },
          },
        ],
      },
    ],
  },
  {
    id: "morphology",
    title: "2. 词法系统",
    subsections: [
      {
        id: "nouns",
        title: "2.1 名词（Nouns）",
        cards: [
          {
            title: "专有名词与普通名词",
            rule: "专有名词指称独一无二实体（London, Einstein），首字母大写，通常无复数。普通名词指称类别成员，分具体/抽象、可数/不可数。两者可转化：专有→普通（a Shakespeare）、普通→专有（the Internet）。",
            examples: [],
          },
          {
            title: "可数名词与不可数名词",
            rule: "可数名词有单复数对立，可用a/an（单数）、数词、many/few。不可数名词无复数，不用a/an，需用量词短语（a piece of advice）。双栖名词跨类使用时语义变化：paper（纸-不可数/论文-可数）、experience（经验-不可数/经历-可数）。",
          },
          {
            title: "名词复数规则",
            table: {
              headers: ["条件", "规则", "例词"],
              rows: [
                ["一般情况", "加-s", "cats, dogs, bees"],
                ["s/x/z/ch/sh结尾", "加-es /ɪz/", "boxes, churches"],
                ["辅音+y结尾", "变y为i加-es", "cities"],
                ["元音+y结尾", "直接加-s", "boys"],
                ["-o结尾（多数）", "加-es", "potatoes, heroes"],
                ["-o结尾（外来词）", "加-s", "photos, pianos"],
              ],
            },
            notes:
              "不规则复数：man → men, child → children, criterion → criteria, datum → data。少数名词单复数同形：sheep, deer, fish, species, aircraft。",
          },
          {
            title: "名词所有格",
            rule: "单数名词和不以-s结尾复数加's（John's, children's）。以-s结尾复数仅加'（students'）。语义远超'所有'：所有权、来源、主体、客体、特征（a women's college）、度量（a day's work）、时间（today's newspaper）等。",
          },
        ],
      },
      {
        id: "pronouns",
        title: "2.2 代词（Pronouns）",
        cards: [
          {
            title: "人称代词格系统",
            table: {
              headers: ["人称", "主格", "宾格", "形代", "名代", "反身代词"],
              rows: [
                ["一单", "I", "me", "my", "mine", "myself"],
                ["二单/复", "you", "you", "your", "yours", "yourself/yourselves"],
                ["三阳单", "he", "him", "his", "his", "himself"],
                ["三阴单", "she", "her", "her", "hers", "herself"],
                ["三中单", "it", "it", "its", "its", "itself"],
                ["一复", "we", "us", "our", "ours", "ourselves"],
                ["三复", "they", "them", "their", "theirs", "themselves"],
              ],
            },
            notes:
              "单数they用于性别中立指称，已被主要词典和风格指南认可。宾格在非正式语体替代主格（It's me）。its(所有格)≠it's(=it is/has)。",
          },
          {
            title: "关系代词",
            rule: "who用于人，which用于物/事，that用于人/物（仅限制性从句）。非限制性从句需逗号分隔，不可用that。",
            table: {
              headers: ["关系代词", "先行词", "限制性/非限制性"],
              rows: [
                ["who", "人", "两者皆可"],
                ["whom", "人（宾格，正式）", "两者皆可"],
                ["whose", "人（所有格）", "两者皆可"],
                ["which", "物/事", "非限制性更常见"],
                ["that", "人/物", "仅限制性"],
              ],
            },
            examples: [
              '"The man who is standing there is my boss."（限制性，无逗号）',
              '"My boss, who is standing there, is very strict."（非限制性，有逗号）',
            ],
          },
          {
            title: "不定代词",
            rule: "some-系列主要用于肯定句和提供/请求疑问句。any-系列主要用于否定句、疑问句、条件句。any在肯定句获自由任选解读（Anyone can do it = 无论谁都能做）。复合不定代词语法上单数，口语常复数回指（Everyone should bring their lunch）。",
          },
        ],
      },
      {
        id: "verbs",
        title: "2.3 动词（Verbs）",
        cards: [
          {
            title: "实义动词分类",
            table: {
              headers: ["类型", "句法特征", "例句"],
              rows: [
                ["不及物动词", "SV结构", '"The baby cried."'],
                ["单及物动词", "SVO结构", '"She reads books."'],
                ["双及物动词", "SVOiOd / SVOdOi", '"He gave me a book."'],
                ["复杂及物动词", "SVOC结构", '"They elected him president."'],
              ],
            },
            notes:
              "大量动词兼具多用法（ambitransitive）：run（跑步/经营）、open（开了/打开门）、eat（吃饭/吃某物）。",
          },
          {
            title: "系动词",
            rule: "系动词连接主语与主语补语（表语），表达状态/特征/身份/变化。后接形容词而非副词作表语。无被动语态。",
            table: {
              headers: ["类别", "成员", "例句"],
              rows: [
                ["be动词", "am, is, are, was, were", '"He is a doctor."'],
                [
                  "状态系动词",
                  "seem, appear, look, feel, smell",
                  '"The flowers smell delightful."',
                ],
                ["变化系动词", "become, get, grow, turn, go", '"He became angry."'],
                ["结果系动词", "prove, turn out", '"The rumor proved false."'],
              ],
            },
          },
          {
            title: "助动词体系",
            table: {
              headers: ["类别", "成员", "功能"],
              rows: [
                ["基本助动词", "be, have, do", "构成时态、体、语态、否定、疑问、强调"],
                [
                  "情态助动词",
                  "can/could, may/might, must, shall/should, will/would",
                  "表达能力、许可、义务、推测、意愿",
                ],
                ["半助动词", "be going to, have to, be able to", "类似情态意义，保留更多实义特征"],
              ],
            },
          },
          {
            title: "情态动词核心用法",
            table: {
              headers: ["情态动词", "核心意义", "例句"],
              rows: [
                ["can/could", "能力、可能性、许可", '"I can swim." / "Could I go?"'],
                ["may/might", "许可、可能性", '"You may leave." / "It might rain."'],
                ["must", "义务、肯定推测", '"You must finish." / "He must be tired."'],
                ["shall/should", "义务、建议、预期", '"You should see a doctor."'],
                [
                  "will/would",
                  "意愿、预测、习惯、虚拟",
                  '"I will help." / "He would always sing."',
                ],
              ],
            },
            notes:
              "情态动词+完成体不定式表达回溯性推测：must have left（肯定走了）、should have told（早该说）、could have won（本可能赢）。",
          },
          {
            title: "非限定形式",
            rule: "不定式(to V / V裸)具有名词、形容词、副词功能。动名词(V-ing)仅名词功能。分词(V-ing / V-ed/V-en)可构成体/语态或形容词/副词。不定式与动名词选择：remember to do(记得去做) vs remember doing(记得做过)；stop to do(停下做另一事) vs stop doing(停止正在做的事)。",
            table: {
              headers: ["形式", "结构", "句法功能", "例句"],
              rows: [
                ["不定式", "to V / V(bare)", "主、宾、表、定、状", '"To err is human."'],
                ["动名词", "V-ing", "主、宾、表、介词宾语", '"Swimming is good exercise."'],
                ["现在分词", "V-ing", "进行体、定、表、状", '"a sleeping child"'],
                ["过去分词", "V-ed/V-en", "完成体、被动、定、表、状", '"a broken window"'],
              ],
            },
          },
        ],
      },
      {
        id: "adjectives-adverbs",
        title: "2.4 形容词与副词（Adjectives & Adverbs）",
        cards: [
          {
            title: "形容词位置",
            rule: "默认前置，多形容词排列遵循：观点→大小→形状→年龄→颜色→来源→材料→用途→中心名词。后置修饰：以-a结尾表语形容词(alive, asleep)、修饰不定代词(something important)、形容词短语(a student good at math)。",
          },
          {
            title: "比较级与最高级",
            table: {
              headers: ["构成", "适用范围", "原级", "比较级", "最高级"],
              rows: [
                [
                  "-er/-est",
                  "单音节+双音节(y,ow,le)",
                  "tall, happy",
                  "taller, happier",
                  "tallest, happiest",
                ],
                ["more/most", "多音节词", "beautiful", "more beautiful", "most beautiful"],
                [
                  "不规则",
                  "高频词",
                  "good, bad, far",
                  "better, worse, farther",
                  "best, worst, farthest",
                ],
              ],
            },
          },
          {
            title: "副词分类与位置",
            rule: "方式副词(quickly)：动词后或句末。时间副词(now/today)：灵活。频率副词(always/often)：实义动词前，be/助动词后。程度副词(very)：紧邻被修饰成分。位置变化影响意义：Only John saw Mary./John only saw Mary./John saw only Mary.",
          },
        ],
      },
      {
        id: "prepositions",
        title: "2.5 介词（Prepositions）",
        cards: [
          {
            title: "时间介词",
            table: {
              headers: ["类型", "核心介词", "例句"],
              rows: [
                ["时间点", "at（精确时刻）、on（日期/天）", '"at 5 o\'clock, on Monday"'],
                ["时间段", "in（年/月/季节）、during（持续期间）", '"in 2024, during the war"'],
                [
                  "期限",
                  "for（持续）、since（起点）、by（截止）",
                  '"for two hours, since 2010, by tomorrow"',
                ],
              ],
            },
          },
          {
            title: "空间介词",
            table: {
              headers: ["维度", "核心介词", "例句"],
              rows: [
                [
                  "静态位置",
                  "at（点）、in（三维空间）、on（表面）",
                  '"at the door, in the room, on the table"',
                ],
                [
                  "动态方向",
                  "to（朝向）、into（进入）、onto（到...上）",
                  '"go to school, walk into the room"',
                ],
                ["距离", "near, by, beside, between, among", '"near the station, among the crowd"'],
              ],
            },
          },
          {
            title: "动词+介词搭配",
            rule: "短语动词(Phrasal Verbs)：动词+副词小品词（look up, give up, turn on）。介词动词(Prepositional Verbs)：动词+介词（look after, depend on, listen to）。短语介词动词：动词+副词+介词（look forward to, put up with, get on with）。形容词+介词搭配：interested in, afraid of, good at。",
          },
        ],
      },
      {
        id: "conjunctions",
        title: "2.6 连词（Conjunctions）",
        cards: [
          {
            title: "并列连词",
            rule: "连接语法对等的成分（词、短语、分句）。and(添加)、but/yet(转折)、or(选择)、for/so(因果)。neither...nor连接时谓语与最近主语一致（就近原则）。",
            table: {
              headers: ["功能", "连词", "例句"],
              rows: [
                [
                  "添加",
                  "and, both...and, not only...but also",
                  '"both intelligent and hardworking"',
                ],
                ["转折", "but, yet, while, whereas", '"rich, but unhappy"'],
                ["选择", "or, either...or, neither...nor", '"Either you leave, or I will."'],
                ["因果", "for(古旧/正式), so", '"It was raining, so I stayed home."'],
              ],
            },
          },
          {
            title: "从属连词引导从句",
            rule: "名词性从句：that, whether, if, wh-词。形容词性从句（关系从句）：who, whom, whose, which, that。副词性从句包括时间(when/while)、原因(because/since)、目的(so that)、条件(if/unless)、让步(although/though)等。",
          },
        ],
      },
      {
        id: "interjections",
        title: "2.7 感叹词（Interjections）",
        cards: [
          {
            title: "情感感叹词",
            rule: "感叹词表达突然情感反应或态度，独立于句子语法结构，常用感叹号或逗号隔开。oh/ah/wow(惊讶)、ouch(痛苦)、yay(喜悦)、ugh/yuck(厌恶)、um/uh/well(犹豫思考)。",
          },
          {
            title: "呼唤与应答用语",
            rule: "hey/hi/hello(呼唤注意)、goodbye/bye/see you(告别)、thanks/cheers(致谢应答)、sorry/excuse me/pardon(道歉应答)、bless you(打喷嚏后)/get well soon(健康祝愿)。",
          },
        ],
      },
      {
        id: "morphemes",
        title: "2.8 词素与构词法",
        cards: [
          {
            title: "自由词素与黏着词素",
            rule: "自由词素(Free Morphemes)可独立构词(hand, dog, run, happy)。黏着词素(Bound Morphemes)仅作为词成分(-ful, -ness, un-, -ed, -ing, -s)。英语能产性黏着词素极为有限：-(e)s(复数/属格/三单)、-(e)d(过去时/过去分词)、-ing(现在分词/动名词)。",
          },
          {
            title: "派生法",
            rule: "前缀(Prefixes)改变词义，保留词类：un-, re-, pre-, dis-, mis-, over-。后缀(Suffixes)主要改变词类：-ful(形), -ness(名), -ize(动), -tion/-sion(名), -er/-or(名), -able/-ible(形), -ly(副)。能产性差异：un-/-ness/-er/-ly高度能产，-th/-tion趋于固化。",
          },
          {
            title: "复合法",
            rule: "复合法(Compounding)将两个或多个自由词素组合为新词，是英语词汇扩展最能产手段。语义关系：主谓(sunrise)、动宾(pickpocket, haircut)、修饰(blackboard, highway)。复合词书写形式演变：分写→连字符→连写，反映词汇化进程。",
          },
        ],
      },
    ],
  },
  {
    id: "syntax",
    title: "3. 句法系统",
    subsections: [
      {
        id: "sentence-types",
        title: "3.1 句子类型",
        cards: [
          {
            title: "按结构分类",
            rule: "简单句：单一主谓结构。并列句：多个主谓结构由并列连词连接。复合句：主句+一个或多个从句（名词性/形容词性/副词性）。并列复合句：并列句+从句，含多个层次。",
            examples: [
              '"I like apples."（简单句）',
              '"I like apples and she likes oranges."（并列句）',
              '"I know that you like apples."（复合句）',
              '"I like apples, and she knows that I like apples."（并列复合句）',
            ],
          },
          {
            title: "按功能分类",
            rule: "陈述句(Declarative): 陈述事实或观点，正常主谓语序。疑问句(Interrogative): 一般疑问句(助动词前置)、特殊疑问句(wh-词+助动词)、选择疑问句(or)、反意疑问句(tag question)。祈使句(Imperative): 命令/请求。感叹句(Exclamatory): 表达强烈情感。",
          },
        ],
      },
      {
        id: "phrase-structure",
        title: "3.2 短语结构",
        cards: [
          {
            title: "五种核心短语",
            rule: "名词短语(NP)：限定词 + 前置修饰 + 中心名词 + 后置修饰。动词短语(VP)：助动词序列 + 主要动词。形容词短语(AdjP)：程度修饰词 + 中心形容词 + 补足成分。副词短语(AdvP)：程度修饰词 + 中心副词。介词短语(PP)：介词 + 名词短语补足语。",
          },
          {
            title: "短语与分句的层级关系",
            rule: "X-bar理论：所有短语具有一致的层级结构——中心词(X)投影为X'(中间层级)，再投影为XP(最大投射)。指定语(Specifier)位于XP层，补足语(Complement)为中心词的姐妹节点，修饰语(Adjunct)附加于X'层。层级结构解释句法歧义：层级不同，意义不同。",
          },
        ],
      },
      {
        id: "clause-system",
        title: "3.3 从句系统",
        cards: [
          {
            title: "名词性从句",
            rule: "名词性从句在句中充当主语、宾语、表语、同位语等名词性成分。引导词：that(陈述)、whether/if(是否)、wh-词(疑问/关系)。that在宾语从句中常省略，主语从句中不可省略。",
            examples: [
              '"That he is honest is obvious."（主语从句）',
              '"I know (that) he is honest."（宾语从句，that可省略）',
              '"The question is whether he will come."（表语从句）',
              '"The fact that he resigned surprised us."（同位语从句）',
            ],
          },
          {
            title: "形容词性从句（关系从句）",
            rule: "限制性从句：提供必要信息识别先行词，无逗号。非限制性从句：提供附加信息，有逗号。只有限制性从句可用that。介词+关系代词：the person to whom I spoke(正式)/the person (who/that) I spoke to(口语)。关系代词作宾语时可省略。",
            examples: [
              '"The book that I bought is interesting."（限制性，that可省略）',
              '"My mother, who lives in Beijing, is a teacher."（非限制性）',
            ],
          },
          {
            title: "副词性从句（状语从句）",
            table: {
              headers: ["类型", "连词", "例句"],
              rows: [
                [
                  "时间",
                  "when, while, before, after, since, until, as soon as",
                  '"Call me when you arrive."',
                ],
                ["地点", "where, wherever", '"Sit wherever you like."'],
                ["原因", "because, since, as", '"I stayed home because it was raining."'],
                ["目的", "so that, in order that", '"Speak clearly so that everyone can hear."'],
                ["结果", "so...that, such...that", '"It was so cold that we stayed inside."'],
                ["条件", "if, unless, provided that, as long as", '"You\'ll pass if you study."'],
                [
                  "让步",
                  "although, though, even though, while",
                  '"Although tired, he kept working."',
                ],
                [
                  "比较",
                  "than, as...as, the...the",
                  '"The more you practice, the better you get."',
                ],
              ],
            },
          },
        ],
      },
      {
        id: "special-sentences",
        title: "3.4 特殊句型",
        cards: [
          {
            title: "存在句（There be）",
            rule: "there be结构将新信息后置，实现信息结构重组(there is/are/was/were)。变体：there + 助动词 + be (there must be)、there + seem/appear/happen + to be (there seems to be)、there + 存在动词 (there remains)。",
            examples: [
              '"There is a book on the table."',
              '"There must be a mistake."',
              '"There seems to be a problem."',
            ],
          },
          {
            title: "强调句（Cleft Sentences）",
            rule: "It-cleft：It is/was + 被强调成分 + that/who... 可强调主语、宾语、状语。Pseudo-cleft：Wh-从句 + be + 被强调成分。两种结构均提取特定信息为焦点，其余为预设。",
            examples: [
              '"It was John who bought the book."（强调主语）',
              '"It was a book that John bought."（强调宾语）',
              '"It was yesterday that John bought the book."（强调状语）',
              '"What John bought was a book."（拟分裂句）',
            ],
          },
          {
            title: "倒装句",
            rule: "完全倒装（主谓倒装）：地点/时间状语前置+名词主语（On the table sat a cat）。部分倒装（助动词前置）：否定词/半否定词前置、only+状语前置（Never have I seen such beauty）。So do I / Neither do I（省略重复）。虚拟条件省略if：Had I known, I would have acted.",
          },
        ],
      },
    ],
  },
  {
    id: "discourse",
    title: "4. 语篇语法",
    subsections: [
      {
        id: "paragraph-structure",
        title: "4.1 段落结构",
        cards: [
          {
            title: "段落宏观结构",
            rule: "主题句(Topic Sentence)：段首，点明核心论点。支撑句(Supporting Sentences)：具体阐述、例证、数据。结论句(Concluding Sentence)：总结、过渡。统一性(Unity)：所有句子围绕一个中心思想。连贯性(Coherence)：逻辑流畅，过渡自然。",
          },
          {
            title: "段落发展模式",
            rule: "演绎(Deduction)：主题句→具体细节。归纳(Induction)：具体事实→一般结论。时间顺序(Chronological)：按事件先后排列。空间顺序(Spatial)：按空间位置组织。列举(Listing)：逐一列举要点。比较对比(Comparison & Contrast)：两点之间的相似与差异。因果(Cause & Effect)：原因分析或结果推测。",
          },
        ],
      },
      {
        id: "cohesion",
        title: "4.2 衔接手段",
        cards: [
          {
            title: "衔接手段五种类型",
            rule: "语法衔接：照应(Reference)——代词回指/下指、指示词。替代(Substitution)——用替代词避免重复（one, ones, do, so/not）。省略(Ellipsis)——在语境可恢复时删除冗余成分。词汇衔接：复现(Reiteration)——原词重复、同义词、上义词。搭配(Collocation)——词语习惯性共现。",
            examples: [
              '"John bought a car. It is red."（照应：it 指代 a car）',
              '"I like this book better than the old one."（替代：one）',
              '"Is it raining? I hope not."（省略：not = it is not raining）',
            ],
          },
        ],
      },
      {
        id: "discourse-markers",
        title: "4.3 话语标记",
        cards: [
          {
            title: "话语标记分类",
            rule: "话语标记(Discourse Markers)独立于句子语法结构，引导读者理解语篇的逻辑关系和言外之意，通常位于句首，用逗号隔开。",
            table: {
              headers: ["功能", "标记", "例句"],
              rows: [
                [
                  "添加/列举",
                  "moreover, furthermore, in addition, firstly",
                  '"Furthermore, the data supports this."',
                ],
                [
                  "转折/对比",
                  "however, nevertheless, in contrast, on the other hand",
                  '"However, this is not always true."',
                ],
                [
                  "因果/推理",
                  "therefore, thus, consequently, as a result",
                  '"Therefore, we conclude that..."',
                ],
                [
                  "总结/归纳",
                  "in conclusion, to summarize, overall, in short",
                  '"In conclusion, three findings emerge."',
                ],
                [
                  "澄清/重述",
                  "in other words, that is to say, rather",
                  '"In other words, it was a failure."',
                ],
                [
                  "例证",
                  "for example, for instance, such as, namely",
                  '"For example, consider the case of..."',
                ],
              ],
            },
          },
        ],
      },
      {
        id: "information-structure",
        title: "4.4 信息结构",
        cards: [
          {
            title: "主位与述位",
            rule: "主位(Theme)：句子信息的出发点，通常为已知信息。述位(Rheme)：对主位的陈述，承载新信息。无标记主位：主语充当主位（英语默认）。有标记主位：状语/宾语充当主位，实现信息重组或强调。主位推进模式决定语篇的信息流动。",
          },
          {
            title: "尾重原则与信息焦点",
            rule: "尾重原则(End-Weight)：将长、复杂的成分置于句末，符合英语'先轻后重'偏好。信息焦点(Information Focus)：新信息通常位于句末，口语中通过语调重音标记。被动化、存在句、分裂句均为信息结构调节手段，将焦点成分置于适当位置。",
          },
        ],
      },
    ],
  },
  {
    id: "specific-purposes",
    title: "5. 特定用途的语法",
    subsections: [
      {
        id: "academic-grammar",
        title: "5.1 学术写作语法",
        cards: [
          {
            title: "客观性手段：被动语态与名词化",
            rule: "被动语态：施事隐退或省略，营造非个人化叙述（'The experiment was conducted...'）。名词化(Nominalization)：将动词/形容词转为名词（increase→the increase of），提升信息密度，便于量化修饰和逻辑运算。注意避免过度名词化导致表达臃肿。",
          },
          {
            title: "情态动词与模糊限制语（Hedges）",
            rule: "学术写作需精细调控确定性程度。高确定性：must, certainly。中等：should, probably。低确定性：may, might, possibly。模糊限制语：approximately, roughly, to some extent。审慎陈述(tentative stating)为学术对话和修正留有余地。",
            table: {
              headers: ["确定性", "表达", "例句"],
              rows: [
                ["高", "must, certainly", '"The data must be interpreted cautiously."'],
                ["中", "should, probably", '"The results should be generalizable."'],
                ["低", "may, might, possibly", '"This may reflect a limitation."'],
                ["模糊", "approximately, roughly", '"approximately 15% larger"'],
              ],
            },
          },
        ],
      },
      {
        id: "business-grammar",
        title: "5.2 商务英语语法",
        cards: [
          {
            title: "商务英语语法特征",
            rule: "正式性：使用完整句式、避免缩略（I will而非I'll）、正式词汇（request而非ask for）。间接性：使用条件句和疑问句替代直接祈使（Would you mind...?而非Do it）。被动语态：淡化责任（A mistake was made而非You made a mistake）。情态降级：用could/may替代can，would替代will实现礼貌。",
            examples: [
              '"Would you mind sending the report by Friday?"（礼貌请求）',
              '"It has been noted that the deadline was missed."（被动语态淡化责任）',
            ],
          },
        ],
      },
      {
        id: "spoken-grammar",
        title: "5.3 口语语法",
        cards: [
          {
            title: "口语语法特征",
            rule: "片段化(Sentence Fragments)：不完整句在对话中普遍('Coming!'/ 'Sounds good')。省略(Ellipsis)：!'A: \'Where are you going?\' B: \'To the store.\''/ 'Feeling better?')。话语标记大量使用(well, you know, I mean, like)。左移位与右移位：将话题前置或后置于句子之外以适应在线加工。",
            examples: [
              '"That new guy, I don\'t really like him."（左移位）',
              '"He\'s really nice, John."（右移位）',
            ],
          },
          {
            title: "口语中的非正式语法",
            rule: "缩略形式近乎强制(don't, can't, I'm, it's)。附和疑问(Question Tags)：It's nice, isn't it? / You don't mind, do you?。回应标记(Response Tokens)：right, okay, really?, oh really?。模糊语(Vague Language)：and stuff, or something, kind of, sort of。广泛使用ain't（非标准但普遍）。",
          },
        ],
      },
      {
        id: "cross-register",
        title: "5.4 跨用途语法对比",
        cards: [
          {
            title: "书面语与口语对比",
            rule: "书面语（尤其学术）：高词汇密度、长句子、高嵌入、名词化、被动语态、显式逻辑连接。口语：低词汇密度、短句、低嵌入、动词主导、主动语态、互动标记、省略和缩略。语法规则的语境敏感性体现在交际目标、社会关系、媒介渠道等多维度调节。",
            table: {
              headers: ["维度", "书面语", "口语"],
              rows: [
                ["词汇密度", "高（4-6实词/语法词）", "低（<2实词/语法词）"],
                ["句长", "长（平均20-30词）", "短（平均5-15词）"],
                ["语态", "被动语态高频", "主动语态主导"],
                ["情态", "精细区分", "依赖语调、语境"],
                ["省略", "严格限制", "广泛存在"],
                ["缩略", "避免", "近乎强制"],
              ],
            },
          },
          {
            title: "正式程度连续体",
            rule: "语体连续体(register continuum)：极度非正式(私密对话)→一般非正式(日常对话)→中性(新闻/通用写作)→正式(学术/法律/商务)→极度正式(仪式/法律条文)。语体混合和语体转换是常见现象，娴熟交际者根据语境灵活调整语法资源。",
          },
        ],
      },
    ],
  },
];
