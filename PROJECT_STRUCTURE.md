# 宝可梦文字冒险游戏 - 项目结构文档

> 本文档详细说明项目目录结构和各模块用途，便于AI模型快速理解项目架构。

---

## 一、项目概述

这是一个基于 TypeScript 开发的文字版宝可梦游戏，支持：
- **单机版**：通过终端运行 TypeScript 编译后的 JavaScript
- **QQ机器人版**：通过 NoneBot2 + NapCat 部署到 QQ 群，实现多人游戏

---

## 二、根目录结构

```
pokemon-bot/
├── game/                    # 主游戏目录
│   ├── src/                 # TypeScript 源代码
│   ├── dist/                # 编译输出目录 (JS)
│   ├── packages/            # 扩展包目录
│   ├── data/                # 游戏数据 (符号链接或复制)
│   └── saves/               # 存档目录
├── skill/                   # AI 技能/工具目录
│   └── superpowers/         # 超能力模块
└── PROJECT_STRUCTURE.md     # 本文档
```

---

## 三、核心目录详解

### 3.1 `game/src/` - TypeScript 源代码

**这是游戏核心逻辑所在，所有游戏功能在此实现。**

```
src/
├── core/                    # 核心游戏逻辑
│   ├── battle.ts            # 战斗系统：伤害计算、行动执行、状态效果处理
│   ├── player.ts            # 玩家管理：创建角色、背包管理、PC系统
│   ├── pokemon.ts           # 宝可梦管理：创建、进化、经验值、状态
│   └── types.ts             # TypeScript 类型定义：所有数据结构
│
├── data/                    # 游戏数据 (JSON)
│   ├── pokemon.json         # 宝可梦基础数据：种族值、属性、进化链
│   ├── pokemon_full.json    # 完整宝可梦数据（含更多详细信息）
│   ├── moves.json           # 技能数据：威力、命中、属性、效果
│   ├── items.json           # 道具数据：价格、效果、类型
│   ├── maps.json            # 地图数据：连接、野生遭遇、NPC、设施
│   └── typeChart.json       # 属性克制表：攻击/防御属性相性
│
├── systems/                 # 系统模块
│   └── save.ts              # 存档系统：读写玩家数据到 JSON 文件
│
├── ui/                      # 用户界面
│   ├── renderer.ts          # 渲染器：终端输出、战斗画面、菜单绘制
│   └── input.ts             # 输入处理：键盘输入、菜单选择
│
└── main.ts                  # 程序入口：游戏主循环
```

**关键文件说明：**

| 文件 | 用途 | AI查找关键词 |
|------|------|-------------|
| `core/battle.ts` | 战斗逻辑、伤害公式、捕捉计算 | 战斗、伤害、捕捉、回合 |
| `core/player.ts` | 玩家数据操作、背包、PC | 玩家、背包、PC、存入、取出 |
| `core/pokemon.ts` | 宝可梦创建、进化、经验值 | 宝可梦、进化、经验、等级 |
| `core/types.ts` | 所有数据结构定义 | 类型、接口、Player、Pokemon |
| `data/*.json` | 游戏配置数据 | 数据、配置、宝可梦列表、技能列表 |

---

### 3.2 `game/dist/` - 编译输出

**TypeScript 编译后的 JavaScript 文件，可直接运行。**

```
dist/
├── core/                    # 编译后的核心逻辑 (.js, .d.ts, .map)
├── data/                    # 数据文件副本
├── systems/                 # 编译后的系统模块
├── ui/                      # 编译后的 UI 模块
└── main.js                  # 入口文件
```

**运行方式：**
```bash
cd game
node dist/main.js
```

---

### 3.3 `game/packages/qqbot/` - QQ机器人插件

**NoneBot2 插件，实现 QQ 群多人游戏。**

```
qqbot/
├── bot.py                   # NoneBot2 入口：初始化、适配器注册
├── pyproject.toml           # 项目配置：依赖、插件声明
├── requirements.txt         # Python 依赖列表
├── .env                     # 环境变量：端口、超级用户、命令前缀
├── DEPLOY.md                # 部署指南：NapCat 配置、服务器部署
│
├── plugins/                 # NoneBot2 插件目录
│   ├── __init__.py          # 插件包初始化
│   └── pokemon_game.py      # 游戏主插件：命令处理、游戏逻辑
│
├── data/                    # 游戏数据副本 (与 src/data/ 保持同步)
│   ├── pokemon.json
│   ├── moves.json
│   ├── items.json
│   ├── maps.json
│   └── typeChart.json
│
└── saves/                   # 玩家存档目录 (运行时生成)
    ├── {group_id}_{user_id}.json  # 群聊存档
    └── {user_id}.json             # 私聊存档
```

**关键文件说明：**

| 文件 | 用途 | AI查找关键词 |
|------|------|-------------|
| `bot.py` | 机器人启动入口 | 启动、初始化、适配器 |
| `plugins/pokemon_game.py` | 所有游戏逻辑和命令 | 命令、处理、战斗、探索 |
| `.env` | 配置文件 | 配置、端口、超级用户 |
| `DEPLOY.md` | 部署文档 | 部署、NapCat、服务器 |

**存档格式：**
```json
{
  "name": "玩家名",
  "party": [...],           // 队伍宝可梦 (最多6只)
  "pc": [[...], ...],       // PC盒子 (30个盒子，每盒30只)
  "inventory": [...],       // 背包道具
  "badges": 0,              // 徽章数量
  "money": 3000,            // 金钱
  "currentLocation": "xxx", // 当前位置
  "playTime": 0             // 游戏时长
}
```

---

### 3.4 `game/saves/` - 单机版存档

**TypeScript 单机版存档目录。**

```
saves/
└── save_1.json             # 存档槽位1
```

---

### 3.5 `skill/superpowers/` - AI 工具模块

**辅助开发工具，非游戏核心。**

```
superpowers/
├── brainstorming/           # 头脑风暴工具
│   ├── SKILL.md            # 技能说明
│   ├── scripts/            # 辅助脚本
│   └── *.md                # 提示词模板
│
└── writing-plans/           # 计划编写工具
    ├── SKILL.md            # 技能说明
    └── *.md                # 提示词模板
```

---

## 四、数据文件结构

### 4.1 `pokemon.json` - 宝可梦数据

```json
{
  "id": 1,
  "name": "妙蛙种子",
  "types": ["grass", "poison"],
  "baseStats": { "hp": 45, "attack": 49, ... },
  "learnset": [1, 5, 10, ...],    // 可学技能ID
  "evolution": { "to": 2, "level": 16 }
}
```

### 4.2 `moves.json` - 技能数据

```json
{
  "id": 1,
  "name": "撞击",
  "type": "normal",
  "category": "physical",     // physical/special/status
  "power": 40,
  "accuracy": 100,
  "pp": 35
}
```

### 4.3 `items.json` - 道具数据

```json
{
  "id": 1,
  "name": "精灵球",
  "type": "ball",            // ball/medicine/key/等
  "price": 200,
  "catchRate": 1.0,
  "description": "用来捕捉宝可梦"
}
```

### 4.4 `maps.json` - 地图数据

```json
{
  "id": "route-1",
  "name": "1号道路",
  "description": "...",
  "connections": ["pallet-town", "viridian-city"],
  "wildPokemon": [
    { "pokemonId": 10, "minLevel": 2, "maxLevel": 4, "rate": 0.4 }
  ],
  "hasCenter": false,
  "hasShop": false,
  "shopItems": [1, 10]       // 商店出售道具ID
}
```

### 4.5 `typeChart.json` - 属性克制

```json
{
  "normal": { "rock": 0.5, "ghost": 0 },
  "fire": { "grass": 2, "water": 0.5, "fire": 0.5 }
}
```

---

## 五、核心类型定义 (`core/types.ts`)

```typescript
// 玩家数据
interface Player {
  name: string;
  party: PokemonInstance[];      // 队伍 (最多6只)
  pc: PokemonInstance[][];       // PC盒子 (30盒×30只)
  inventory: InventoryItem[];
  badges: number;
  money: number;
  currentLocation: string;
  playTime: number;
}

// 宝可梦实例
interface PokemonInstance {
  baseId: number;                // 种类ID
  level: number;
  exp: number;
  currentHp: number;
  stats: Stats;
  moves: MoveSlot[];
  ivs: Stats;                    // 个体值
  evs: Stats;                    // 努力值
  nature: string;                // 性格
  ability: string;               // 特性
  statusEffects: string[];       // 状态异常
}

// 战斗状态
interface BattleState {
  type: 'wild' | 'trainer';
  playerPokemon: PokemonInstance;
  enemyPokemon: PokemonInstance;
  playerParty?: PokemonInstance[];
  turn: number;
  isOver: boolean;
  winner: 'player' | 'enemy' | null;
}
```

---

## 六、命令速查

### QQ机器人命令

| 命令 | 说明 |
|------|------|
| `!开始` / `!游戏` / `!菜单` | 开始游戏/显示主菜单 |
| `!帮助` / `!help` | 显示帮助信息 |
| `!状态` | 查看玩家状态 |

### 游戏内操作

游戏中直接发送数字进行选择：
- `1` - 选择第一个选项
- `2` - 选择第二个选项
- ...

---

## 七、开发指南

### 7.1 修改游戏数据

编辑 `game/src/data/` 下的 JSON 文件，然后：
- 单机版：重新编译 `npm run build`
- QQ机器人：复制到 `packages/qqbot/data/`

### 7.2 添加新功能

1. TypeScript 单机版：在 `game/src/core/` 或 `game/src/systems/` 添加模块
2. QQ机器人版：在 `game/packages/qqbot/plugins/pokemon_game.py` 添加逻辑

### 7.3 调试

```bash
# TypeScript 单机版
cd game
npm run build
node dist/main.js

# QQ机器人版
cd game/packages/qqbot
python bot.py
```

---

## 八、架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        用户交互层                            │
├─────────────────────────┬───────────────────────────────────┤
│   终端 (TypeScript)      │      QQ群 (NoneBot2 + NapCat)    │
│   main.ts → renderer.ts  │   pokemon_game.py → QQ消息       │
├─────────────────────────┴───────────────────────────────────┤
│                        游戏逻辑层                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ battle.ts │  │player.ts │  │pokemon.ts│  │ types.ts │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
├─────────────────────────────────────────────────────────────┤
│                        数据持久层                            │
│  ┌──────────┐  ┌──────────────────────────────────────┐   │
│  │ save.ts  │  │ saves/*.json (单机) / qqbot/saves/   │   │
│  └──────────┘  └──────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                        配置数据层                            │
│  data/pokemon.json, moves.json, items.json, maps.json      │
└─────────────────────────────────────────────────────────────┘
```

---

## 九、版本差异

| 功能 | TypeScript版 | Python版 |
|------|:------------:|:--------:|
| 基础探索 | ✅ | ✅ |
| 野生战斗 | ✅ | ✅ |
| 捕捉系统 | ✅ | ✅ |
| 存档系统 | ✅ | ✅ |
| PC电脑 | ✅ | ❌ |
| 商店 | ✅ | ❌ |
| 宝可梦中心 | ✅ | ❌ |
| 状态效果 | ✅ | ❌ |
| 性格/特性 | ✅ | ❌ |
| 进化系统 | ✅ | ❌ |
| 道具使用 | ✅ | ❌ |
| 训练家战斗 | ✅ | ❌ |

---

## 十、快速定位指南

**AI模型查找建议：**

| 需求 | 查找位置 |
|------|----------|
| 修改宝可梦属性 | `game/src/data/pokemon.json` |
| 添加新技能 | `game/src/data/moves.json` |
| 修改地图/遭遇 | `game/src/data/maps.json` |
| 修改战斗逻辑 | `game/src/core/battle.ts` |
| 修改玩家逻辑 | `game/src/core/player.ts` |
| 添加QQ命令 | `game/packages/qqbot/plugins/pokemon_game.py` |
| 修改存档格式 | `game/src/core/types.ts` + `game/src/systems/save.ts` |
| 部署问题 | `game/packages/qqbot/DEPLOY.md` |

---

*文档版本: 1.0.0 | 最后更新: 2026-04-13*
