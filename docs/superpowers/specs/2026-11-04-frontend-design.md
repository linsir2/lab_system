# LabFlow 前端设计

## 1. 目标与范围

为现有跨语言实验室资源管理系统新增前端，严格对齐提供的 1600×1000 SVG 视觉稿，并对接 Java 网关 `http://localhost:8080`。

包含四个页面：

- 总览 `/`
- 人员管理 `/persons`
- 物资管理 `/materials`
- 借用记录 `/borrows`

包含完整动作：人员/物资 CRUD、创建借用、归还、取消、借用聚合详情。

不包含：认证/授权、移动端完整体验、后端接口改造、Docker/Nginx 部署。

## 2. 技术选型

- React 18 + TypeScript + Vite
- React Router
- 原生 CSS（设计 token + 组件样式），不引入 UI 框架
- 测试：Vitest + @testing-library/react + jsdom
- 开发期 Vite 代理 `/api` → `http://localhost:8080`

## 3. 架构

```text
frontend/ (Vite :5173)
  └─ fetch /api/* --proxy--> Java Gateway :8080
```

- 新增 `frontend/`，不改后端。
- 生产构建产物为 `frontend/dist`，可由任意静态服务器托管。
- 不在前端持久化业务状态；页面数据每次从网关获取。

## 4. 页面与交互

### 4.1 总览

- 四张指标卡：
  - 在册人员：人员总数；副文案为 ACTIVE 数。
  - 物资种类：物资条数；副文案为库存总量。
  - 借用中：`status=BORROWED` 的借用数。
  - 今日归还：`status=RETURNED` 且 `returnTime` 为当天的借用数。
- 最近借用记录：按 id 倒序取 5 条；用人员、物资列表在客户端做 id→name 映射。
- 状态徽章：
  - `BORROWED` 且未逾期：借用中（琥珀）。
  - `BORROWED` 且 `dueTime` 已过：已逾期（红）。
  - `RETURNED`：已归还（绿）。
  - `CANCELLED`：已取消（灰）。
- 库存概况：取当前库存前 3 的物资。
  - 总量 = 当前 `quantity` + 该物资所有 `BORROWED` 借用的 `quantity` 之和。
  - 进度条 = 当前库存 / 总量。
  - 展示格式：`当前 / 总量`。
- 系统说明面板保留三条原文案。

### 4.2 人员管理

- 筛选：角色、状态、姓名（姓名由前端过滤）。
- 表格列：ID、姓名、角色、状态、操作。
- 新建/编辑弹窗字段：`name`、`role`、`status`。
- 删除需二次确认；后端 409 时展示“存在未归还借用，无法删除”。
- 操作成功后刷新人员列表。

### 4.3 物资管理

- 表格列：ID、名称、当前库存、操作。
- 新建/编辑弹窗字段：`name`、`quantity`（>= 0）。
- 删除需二次确认；409 时展示“存在未归还借用，无法删除”。

### 4.4 借用记录

- 筛选：人员、物资、状态。
- 表格列：ID、借用人、物资、数量、借出时间、应还时间、状态、操作。
- 新建借用弹窗：
  - 人员下拉，仅列 ACTIVE 人员。
  - 物资下拉，展示当前库存。
  - 数量范围 1..当前库存。
  - 应还时间使用 `datetime-local`，必须晚于当前时间，提交时转 UTC ISO。
- 行操作：
  - `BORROWED`：归还、取消。
  - 全部状态：详情。
- 详情弹窗展示 `BorrowDetail`（人员、物资、overdueDays）。
- 客户端分页，每页 10 条；后端不做分页。

## 5. 目录结构

```text
frontend/
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── styles/{tokens.css,global.css}
    ├── types.ts
    ├── api/{client,persons,materials,borrows}.ts
    ├── hooks/{useResource,useMutation}.ts
    ├── components/
    │   ├── layout/{AppShell,Sidebar,Topbar}.tsx
    │   └── ui/{Modal,ConfirmDialog,DataTable,Pagination,StatusBadge,MetricCard,EmptyState,ErrorBanner,Spinner,FormField}.tsx
    ├── pages/{OverviewPage,PersonsPage,MaterialsPage,BorrowsPage}.tsx
    └── utils/{date,aggregate,labels}.ts
```

## 6. API 客户端契约

统一 `request<T>(path, init)`：

- 自动加 `Content-Type: application/json`。
- 非 2xx 读取 `{code,message}`，抛 `ApiError(status, message)`。
- 204 返回 `undefined`。
- 成功返回 `data` 字段。

类型：

```ts
type PersonRole = 'STUDENT' | 'TEACHER' | 'STAFF' | 'ADMIN' | 'VISITOR';
type PersonStatus = 'ACTIVE' | 'INACTIVE';
type BorrowStatus = 'BORROWED' | 'RETURNED' | 'CANCELLED';

interface Person { id: number; name: string; role: PersonRole; status: PersonStatus; }
interface Material { id: number; name: string; quantity: number; }
interface Borrow {
  id: number; personId: number; materialId: number; quantity: number;
  borrowTime: string; dueTime: string; returnTime: string | null;
  status: BorrowStatus;
}
interface BorrowDetail {
  borrow: Borrow;
  person: { id: number; name: string | null; role: PersonRole | null; deleted: boolean };
  material: { id: number; name: string | null; deleted: boolean };
  overdueDays: number;
}
```

## 7. 状态与错误

- `useResource(loader, deps)`：`data / loading / error / reload`。
- `useMutation`：`submitting / error / run`，成功后由调用方触发 `reload`。
- 错误展示：
  - 502：子服务暂不可用。
  - 409：直接展示后端 `message`。
  - 404：记录不存在。
  - 表单校验错误在前端就地展示。
- 空列表显示 `EmptyState`。
- 时间在界面按本地时区格式化；提交前转 UTC ISO。

## 8. 样式与响应式

设计 token 来自 SVG：

- 背景 `#f5f8fa`，卡片 `#fff`
- 主色 `#248f83`，辅助绿 `#43a293`
- 文本 `#182b3a`，次要文本 `#8494a2`
- 边框 `#e5ebee`，阴影 `0 5px 12px rgba(24,51,75,.07)`
- 字体 `Inter, "Noto Sans CJK SC", "Microsoft YaHei", sans-serif`
- 侧边栏 248px，卡片圆角 15px

响应式：

- 基准 1600×1000。
- ≤1200px：指标卡两列，右侧面板下移。
- ≤900px：侧边栏收为窄栏，表格允许横向滚动。

## 9. 测试与验收

单测：

- `client`：Result 解包、错误 message、204。
- `date`：ISO 与展示格式转换。
- `aggregate`：指标卡、今日归还、库存总量、逾期判断。
- `BorrowsPage`：数量与应还时间校验。

命令：

```bash
npm run test
npm run build
npx tsc --noEmit
```

端到端（手动）：

1. 启动 MySQL 与三服务。
2. `npm run dev` 打开 5173。
3. 建人员 → 建物资 → 建借用。
4. 总览指标与库存变化正确。
5. 归还/取消后库存恢复。
6. 有活跃借用时删除人员/物资提示 409。
