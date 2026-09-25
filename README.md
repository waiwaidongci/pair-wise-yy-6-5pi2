# 墨锭试磨室

运行：

```bash
npm start
```

访问`http://localhost:3037`。数据保存在`data/ink-stick-testing.json`。

## 结构

- `server.js` — HTTP 路由，只做请求分发
- `lib/store.js` — 数据存取（加载、保存、种子数据）
- `lib/batchRules.js` — 试磨批次规则（纯逻辑，不碰文件和网络）
- `lib/page.js` — 页面与前端操作

## 试磨批次

- 按烟料来源（包含匹配）、胶料比例（精确）和年限范围筛选墨锭，选入批次时必填计划日期和责任人
- 同一块墨锭不能同时留在两个未归档批次；归档或移出后释放
- 评审时每块墨锭挑一条合格结果；缺记录或评分低于 80 必须写清原因
- 归档需先完成评审报告，归档后批次内容锁定，不可再改
- 历史报告只含已归档批次，可按烟料来源过滤查看

### 接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/batch-candidates?smokeSource=&glueRatio=&minAge=&maxAge=` | 筛选候选墨锭，标注是否已在未归档批次 |
| GET/POST | `/api/batches` | 批次列表 / 新建批次（含选样） |
| GET | `/api/batches/:id` | 批次详情 |
| POST/DELETE | `/api/batches/:id/selections[/:itemId]` | 追加选样 / 移出选样 |
| POST | `/api/batches/:id/report` | 保存评审报告 |
| POST | `/api/batches/:id/archive` | 归档批次 |
| GET | `/api/reports?smokeSource=` | 历史报告，可按烟料来源过滤 |

原有建档（`POST /api/items`）、备注（`POST /api/items/:id/logs`）、试磨（`POST /api/items/:id/action`）等接口保持不变。
