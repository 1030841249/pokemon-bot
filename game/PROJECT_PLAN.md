# 宝可梦文字游戏项目规划

## 项目概述

一个基于文本的宝可梦游戏，玩家可以在文字世界中捕捉、培养宝可梦，进行回合制战斗，探索地图，挑战道馆。后期支持多人在线对战和交换。

---

## 一、游戏核心玩法

### 1.1 核心循环
```
探索地图 → 遭遇野生宝可梦 → 捕捉/战斗 → 获得经验 → 进化变强 → 挑战道馆 → 成为冠军
```

### 1.2 主要系统
| 系统 | 描述 |
|------|------|
| 捕捉系统 | 在野外遭遇宝可梦，使用精灵球捕捉 |
| 战斗系统 | 回合制战斗，属性克制，技能选择 |
| 培养系统 | 升级、进化、学习技能 |
| 探索系统 | 地图移动、NPC交互、道具收集 |
| 道馆系统 | 8个道馆挑战，获得徽章 |
| 多人系统 | 在线对战、宝可梦交换、好友系统 |

---

## 二、技术架构

### 2.1 技术选型

#### 单机版架构
| 层级 | 技术 | 说明 |
|------|------|------|
| 运行环境 | Node.js | 后端逻辑 |
| 前端界面 | 终端/命令行 | 文字交互界面 |
| 数据存储 | JSON文件 | 存档系统 |
| 语言 | TypeScript | 类型安全 |

#### 多人在线架构
| 层级 | 技术 | 说明 |
|------|------|------|
| 游戏服务器 | Node.js + Socket.io | 实时通信 |
| 数据库 | MongoDB / PostgreSQL | 玩家数据持久化 |
| 认证系统 | JWT | 用户登录认证 |
| 前端界面 | Web (React/Vue) 或 终端 | 多平台支持 |
| 缓存 | Redis | 在线状态、匹配队列 |
| 协议 | WebSocket | 双向实时通信 |

### 2.2 项目结构

#### 完整项目结构（含多人功能）
```
game/
├── packages/
│   ├── core/                    # 核心游戏逻辑（共享）
│   │   ├── src/
│   │   │   ├── battle.ts            # 战斗系统
│   │   │   ├── pokemon.ts           # 宝可梦实体
│   │   │   ├── player.ts            # 玩家数据
│   │   │   ├── world.ts             # 世界地图
│   │   │   └── types.ts             # 类型定义
│   │   └── package.json
│   │
│   ├── data/                    # 游戏数据（共享）
│   │   ├── pokemon.json              # 宝可梦图鉴
│   │   ├── moves.json                # 技能数据
│   │   ├── items.json                # 道具数据
│   │   └── maps.json                 # 地图数据
│   │
│   ├── cli/                     # 终端客户端
│   │   ├── src/
│   │   │   ├── ui/
│   │   │   │   ├── renderer.ts       # 文字渲染
│   │   │   │   ├── input.ts          # 输入处理
│   │   │   │   └── menus.ts          # 菜单系统
│   │   │   ├── offline.ts            # 单机模式
│   │   │   ├── online.ts             # 在线模式
│   │   │   └── main.ts
│   │   └── package.json
│   │
│   ├── server/                  # 多人服务器
│   │   ├── src/
│   │   │   ├── socket/
│   │   │   │   ├── handler.ts        # Socket处理
│   │   │   │   ├── battle.ts         # 对战通信
│   │   │   │   ├── trade.ts          # 交换通信
│   │   │   │   └── chat.ts           # 聊天系统
│   │   │   ├── services/
│   │   │   │   ├── auth.ts           # 认证服务
│   │   │   │   ├── matchmaking.ts    # 匹配系统
│   │   │   │   ├── leaderboard.ts    # 排行榜
│   │   │   │   └── friends.ts        # 好友系统
│   │   │   ├── models/
│   │   │   │   ├── user.ts           # 用户模型
│   │   │   │   └── player.ts         # 玩家模型
│   │   │   ├── db/
│   │   │   │   ├── connection.ts     # 数据库连接
│   │   │   │   └── migrations/       # 数据迁移
│   │   │   └── main.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                     # Web客户端（可选）
│       ├── src/
│       │   ├── components/
│       │   ├── pages/
│       │   └── App.tsx
│       └── package.json
│
├── saves/                       # 单机存档目录
├── docker-compose.yml           # Docker部署配置
├── package.json                 # Monorepo配置
└── tsconfig.json
```

---

## 三、功能模块详解

### 3.1 宝可梦系统

#### 数据结构
```typescript
interface Pokemon {
  id: number;
  name: string;
  types: Type[];
  baseStats: {
    hp: number;
    attack: number;
    defense: number;
    spAttack: number;
    spDefense: number;
    speed: number;
  };
  moves: Move[];
  level: number;
  exp: number;
  evolution?: {
    level: number;
    evolvesTo: number;
  };
}

type Type = 
  | '火' | '水' | '草' | '电' | '冰' | '格斗'
  | '毒' | '地面' | '飞行' | '超能' | '虫' | '岩石'
  | '幽灵' | '龙' | '恶' | '钢' | '妖精';
```

#### 属性克制表
```
火 → 草、冰、虫
水 → 火、地面、岩石
草 → 水、地面、岩石
电 → 水、飞行
...
```

### 3.2 战斗系统

#### 战斗流程
```
1. 显示双方宝可梦状态
2. 玩家选择行动（攻击/道具/逃跑/换人）
3. 敌方AI选择行动
4. 根据速度决定行动顺序
5. 执行行动，计算伤害
6. 检查战斗结束条件
7. 循环直到战斗结束
```

#### 伤害公式
```
伤害 = ((2 * 等级 / 5 + 2) * 威力 * 攻击/防御 / 50 + 2) * 属性克制 * 暴击 * 随机(0.85-1)
```

### 3.3 地图系统

#### 地图结构
```typescript
interface Location {
  id: string;
  name: string;
  description: string;
  connections: string[];
  wildPokemon: Encounter[];
  npcs: NPC[];
  gym?: Gym;
}

interface Encounter {
  pokemonId: number;
  level: [number, number];
  rate: number;
}
```

#### 地图示例
```
[新手镇] ──→ [1号道路] ──→ [常青市]
    │              │
    ↓              ↓
[研究所]      [野生区域]
```

### 3.4 玩家系统

```typescript
interface Player {
  id: string;                    // 玩家唯一ID
  name: string;
  party: Pokemon[];
  pc: Pokemon[][];
  inventory: InventoryItem[];
  badges: number;
  money: number;
  currentLocation: string;
  online?: {                     // 在线模式专属
    rating: number;              // 对战积分
    wins: number;
    losses: number;
    friends: string[];           // 好友ID列表
    lastOnline: Date;
  };
}
```

---

## 四、多人在线系统设计

### 4.1 系统架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        客户端层                                   │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   终端客户端     │   Web客户端      │        移动端（未来）         │
│   (CLI)         │   (React)       │                             │
└────────┬────────┴────────┬────────┴─────────────────────────────┘
         │                 │
         │    WebSocket    │
         ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Socket.io 服务器                              │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   对战处理器     │   交换处理器     │        聊天处理器            │
│   BattleHandler │  TradeHandler   │      ChatHandler           │
└────────┬────────┴────────┬────────┴─────────────────────────────┘
         │                 │
         ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      业务服务层                                   │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   认证服务       │   匹配服务       │        好友服务             │
│  AuthService    │MatchmakingService│     FriendService         │
├─────────────────┼─────────────────┼─────────────────────────────┤
│   排行榜服务     │   战斗引擎       │        存档同步             │
│LeaderboardService│  BattleEngine  │      SyncService           │
└────────┬────────┴────────┬────────┴─────────────────────────────┘
         │                 │
         ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      数据存储层                                   │
├─────────────────┬─────────────────┬─────────────────────────────┤
│    MongoDB      │     Redis       │        JSON存档             │
│   (玩家数据)     │  (缓存/会话)    │      (单机存档)             │
└─────────────────┴─────────────────┴─────────────────────────────┘
```

### 4.2 核心功能模块

#### 4.2.1 用户认证系统
```typescript
interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  playerData: Player;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
```

#### 4.2.2 匹配系统
```typescript
interface MatchmakingQueue {
  playerId: string;
  rating: number;
  preferences: {
    battleType: 'casual' | 'ranked';
    teamSize: 3 | 6;
  };
  joinedAt: Date;
}

interface Match {
  id: string;
  players: [string, string];
  battleType: 'casual' | 'ranked';
  status: 'waiting' | 'in_progress' | 'completed';
  createdAt: Date;
}
```

#### 4.2.3 对战通信协议
```typescript
interface BattleMessage {
  type: 'action' | 'switch' | 'surrender';
  payload: {
    action?: 'attack' | 'item';
    moveId?: number;
    itemId?: number;
    targetPokemon?: number;
  };
  timestamp: number;
}

interface BattleState {
  turn: number;
  player1: BattlePlayer;
  player2: BattlePlayer;
  weather?: Weather;
  terrain?: Terrain;
  log: BattleLogEntry[];
}
```

#### 4.2.4 交换系统
```typescript
interface TradeRequest {
  id: string;
  fromPlayer: string;
  toPlayer: string;
  offeredPokemon: number[];      // 宝可梦ID列表
  requestedPokemon?: number[];   // 可选：想要的宝可梦
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  createdAt: Date;
}

interface TradeSession {
  id: string;
  players: [string, string];
  offerings: {
    [playerId: string]: number[];  // 每个玩家提供的宝可梦
  };
  confirmations: {
    [playerId: string]: boolean;
  };
  status: 'negotiating' | 'confirmed' | 'completed';
}
```

#### 4.2.5 好友系统
```typescript
interface FriendRequest {
  id: string;
  from: string;
  to: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
}

interface FriendList {
  playerId: string;
  friends: {
    id: string;
    username: string;
    online: boolean;
    lastSeen: Date;
  }[];
}
```

### 4.3 服务器事件定义

```typescript
type ServerEvents = {
  'battle:matched': (match: Match) => void;
  'battle:start': (state: BattleState) => void;
  'battle:turn': (state: BattleState) => void;
  'battle:end': (result: BattleResult) => void;
  'trade:request': (request: TradeRequest) => void;
  'trade:update': (session: TradeSession) => void;
  'friend:request': (request: FriendRequest) => void;
  'friend:online': (friendId: string) => void;
  'friend:offline': (friendId: string) => void;
  'chat:message': (message: ChatMessage) => void;
};

type ClientEvents = {
  'matchmaking:join': (prefs: MatchPreferences) => void;
  'matchmaking:leave': () => void;
  'battle:action': (action: BattleAction) => void;
  'trade:offer': (pokemonIds: number[]) => void;
  'trade:confirm': () => void;
  'friend:add': (username: string) => void;
  'friend:accept': (requestId: string) => void;
  'chat:send': (message: string) => void;
};
```

### 4.4 数据库设计

#### MongoDB 集合设计
```javascript
db.users = {
  _id: ObjectId,
  username: String (unique),
  email: String (unique),
  passwordHash: String,
  createdAt: Date,
  updatedAt: Date
}

db.players = {
  _id: ObjectId,
  userId: ObjectId (ref: users),
  name: String,
  party: [Pokemon],
  pc: [[Pokemon]],
  inventory: [InventoryItem],
  badges: Number,
  money: Number,
  currentLocation: String,
  rating: Number,
  wins: Number,
  losses: Number,
  friends: [ObjectId],
  lastOnline: Date
}

db.battles = {
  _id: ObjectId,
  players: [ObjectId, ObjectId],
  battleType: String,
  result: {
    winner: ObjectId,
    turns: Number,
    duration: Number
  },
  replay: [BattleTurn],
  createdAt: Date
}

db.trades = {
  _id: ObjectId,
  players: [ObjectId, ObjectId],
  pokemonExchanged: {
    player1: [ObjectId],
    player2: [ObjectId]
  },
  createdAt: Date
}
```

#### Redis 键设计
```
online:{playerId}           -> 在线状态
matchmaking:queue           -> 匹配队列
matchmaking:{rating}        -> 按积分分段的队列
battle:{battleId}:state     -> 当前战斗状态
battle:{battleId}:lock      -> 战斗操作锁
player:{playerId}:socket    -> Socket ID映射
```

---

## 五、游戏数据设计

### 5.1 初始宝可梦（御三家）
| 编号 | 名称 | 属性 | 初始技能 |
|------|------|------|----------|
| 1 | 小火龙 | 火 | 抓、火花 |
| 4 | 杰尼龟 | 水 | 撞击、水枪 |
| 7 | 妙蛙种子 | 草 | 撞击、藤鞭 |

### 5.2 道馆设计
| 道馆 | 馆主 | 属性 | 徽章 |
|------|------|------|------|
| 常青市 | 小刚 | 岩石 | 灰色徽章 |
| 华蓝市 | 小霞 | 水 | 蓝色徽章 |
| 枯叶市 | 马志士 | 电 | 橙色徽章 |
| ... | ... | ... | ... |

---

## 六、开发阶段

### 第一阶段：基础框架（单机版）
- [ ] 项目初始化（Monorepo + TypeScript）
- [ ] 核心数据结构定义
- [ ] 文字界面渲染器
- [ ] 输入处理系统

### 第二阶段：核心系统（单机版）
- [ ] 宝可梦实体系统
- [ ] 战斗系统（基础版）
- [ ] 玩家数据管理
- [ ] 本地存档系统

### 第三阶段：游戏内容（单机版）
- [ ] 地图系统
- [ ] 野生宝可梦遭遇
- [ ] 捕捉系统
- [ ] 道具系统

### 第四阶段：进阶功能（单机版）
- [ ] 进化系统
- [ ] 技能学习
- [ ] NPC系统
- [ ] 道馆挑战

### 第五阶段：多人基础架构
- [ ] 服务器项目搭建
- [ ] 数据库设计与连接
- [ ] 用户认证系统
- [ ] Socket.io 集成

### 第六阶段：多人核心功能
- [ ] 在线状态管理
- [ ] 匹配系统
- [ ] 实时对战通信
- [ ] 战斗同步逻辑

### 第七阶段：多人扩展功能
- [ ] 宝可梦交换系统
- [ ] 好友系统
- [ ] 聊天系统
- [ ] 排行榜

### 第八阶段：完善与优化
- [ ] 游戏平衡调整
- [ ] 性能优化
- [ ] 错误处理
- [ ] 安全加固
- [ ] 部署配置

---

## 七、界面设计

### 7.1 主菜单
```
╔════════════════════════════════════╗
║        宝可梦文字冒险              ║
╠════════════════════════════════════╣
║                                    ║
║   [1] 新游戏（单机）               ║
║   [2] 继续游戏（单机）             ║
║   [3] 在线模式                     ║
║   [4] 设置                         ║
║   [5] 退出                         ║
║                                    ║
╚════════════════════════════════════╝
```

### 7.2 在线模式菜单
```
╔════════════════════════════════════╗
║           在线模式                 ║
╠════════════════════════════════════╣
║   玩家: 小明  积分: 1250           ║
║   战绩: 45胜 23负                  ║
╠════════════════════════════════════╣
║   [1] 排位对战                     ║
║   [2] 休闲对战                     ║
║   [3] 交换中心                     ║
║   [4] 好友列表                     ║
║   [5] 排行榜                       ║
║   [6] 返回                         ║
╚════════════════════════════════════╝
```

### 7.3 对战匹配界面
```
╔════════════════════════════════════╗
║           寻找对手中...            ║
╠════════════════════════════════════╣
║                                    ║
║        ████████████  搜索中        ║
║                                    ║
║   预计等待时间: ~30秒              ║
║   当前排队人数: 128                ║
║                                    ║
║   [取消]                           ║
╚════════════════════════════════════╝
```

### 7.4 多人对战界面
```
╔════════════════════════════════════╗
║  对手: 小红                        ║
║  皮卡丘 Lv.50                      ║
║  HP: ████████░░ 80/100             ║
╠════════════════════════════════════╣
║  我方: 小明                        ║
║  喷火龙 Lv.52                      ║
║  HP: ██████████ 100/100            ║
╠════════════════════════════════════╣
║  [1] 攻击  [2] 道具                ║
║  [3] 换人  [4] 投降                ║
╠════════════════════════════════════╣
║  对手正在思考...                   ║
╚════════════════════════════════════╝
```

### 7.5 交换界面
```
╔════════════════════════════════════╗
║           宝可梦交换               ║
╠════════════════════════════════════╣
║  对手: 小红                        ║
║  提供: 水箭龟 Lv.45                ║
║                                    ║
║  我方: 小明                        ║
║  选择要交换的宝可梦:               ║
║  [1] 妙蛙花 Lv.48                  ║
║  [2] 皮卡丘 Lv.35                  ║
║  [3] 取消                          ║
╚════════════════════════════════════╝
```

---

## 八、安全设计

### 8.1 认证安全
- 密码使用 bcrypt 加密存储
- JWT Token 有效期：Access Token 15分钟，Refresh Token 7天
- 登录失败次数限制，防止暴力破解

### 8.2 游戏安全
- 所有战斗逻辑在服务器端计算
- 客户端只发送意图，不发送结果
- 检测异常操作模式（如瞬间完成战斗）
- 防止修改客户端数据

### 8.3 数据安全
- 敏感数据加密存储
- 定期数据备份
- SQL注入/XSS防护

---

## 九、部署架构

### 9.1 Docker Compose 配置
```yaml
version: '3.8'
services:
  game-server:
    build: ./packages/server
    ports:
      - "3000:3000"
    depends_on:
      - mongodb
      - redis
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/pokemon
      - REDIS_URL=redis://redis:6379

  mongodb:
    image: mongo:6
    volumes:
      - mongodb_data:/data/db

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  mongodb_data:
  redis_data:
```

### 9.2 生产环境建议
- 使用 Nginx 反向代理
- 启用 HTTPS
- 配置负载均衡（多服务器实例）
- 使用 PM2 管理进程
- 配置日志收集和监控

---

## 十、开发优先级

```
第一阶段（必须）：战斗系统、宝可梦数据、基础UI、单机存档
第二阶段（重要）：地图系统、捕捉系统、道馆挑战
第三阶段（核心）：服务器架构、认证系统、匹配系统
第四阶段（扩展）：实时对战、交换系统、好友系统
第五阶段（优化）：性能优化、安全加固、部署上线
```

---

## 十一、技术风险与应对

| 风险 | 影响 | 应对措施 |
|------|------|----------|
| 战斗同步延迟 | 用户体验差 | 使用 WebSocket + 状态锁 |
| 数据库性能瓶颈 | 服务响应慢 | Redis缓存 + 读写分离 |
| 作弊行为 | 游戏公平性受损 | 服务端校验 + 异常检测 |
| 并发匹配压力 | 匹配时间长 | 分段队列 + 异步处理 |
| 存档同步冲突 | 数据丢失 | 版本控制 + 冲突合并 |
