# 墨锭试磨室

运行：

```bash
npm start
```

访问 `http://localhost:3037`。数据保存在 `data/ink-stick-testing.json`。

## 页面

- **墨锭档案**：墨锭建档、状态更新、追加备注、录入试磨记录与评分统计（原有流程）。
- **试磨批次**：按烟料来源、胶料比例、存放年限筛选墨锭并选入批次（计划日期 + 责任人），生成评审报告、归档，并按烟料来源查看历史报告。

## 结构（批次规则 / 数据存取 / 页面操作分层）

- `src/store.js`：JSON 数据文件的读写与查找。
- `src/batchService.js`：批次业务规则——筛选、选入互斥、评审合格判定（评分 ≥ 80）、归档不可改、历史报告查询。
- `src/page.js`：服务端渲染的页面与前端交互。
- `server.js`：HTTP 路由层，墨锭与批次的 API 入口。

## 批次规则

- 同一块墨锭不能同时存在于两个未归档批次；在其他批次中的墨锭在候选列表中锁定。归档后自动解锁，可加入新批次。
- 评审从每块墨锭的全部试磨记录（`tests` 与评分试磨日志）中取最高分：≥ 80 分为合格并入选报告；无试磨记录标注「缺少试磨记录」，低于 80 分标注「评分低于80分（最高X分）」。
- 批次必须先生成评审报告才能归档；归档后拒绝任何内容修改，报告随批次快照保存。

## 批次相关接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/batches/facets` | 烟料/胶比/年限筛选项 |
| GET | `/api/batches/candidates?smokeSource=&glueRatio=&ageYears=` | 筛选可选墨锭（含锁定状态） |
| GET/POST | `/api/batches` | 批次列表 / 新建批次 |
| GET | `/api/batches/:id` | 批次详情（含选样与报告） |
| POST/DELETE | `/api/batches/:id/selections[/:code]` | 选入（计划日期、责任人）/ 移出 |
| POST | `/api/batches/:id/review` | 生成/刷新评审报告 |
| POST | `/api/batches/:id/archive` | 归档 |
| GET | `/api/reports?smokeSource=` | 已归档历史报告（可按烟料来源筛选） |
