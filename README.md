# 跨语言实验室资源管理系统

Java 网关 + Python 借用记录 + Go 物资管理，三服务共享一个 MySQL 实例。

```text
Client -> Java Gateway :8080 -> JPA -> lab_person
                       -> HTTP -> Python Borrow :8081 -> SQLAlchemy -> lab_borrow
                       -> HTTP -> Go Material   :8082 -> GORM       -> lab_material
```

对外只暴露 8080；8081/8082 为内部服务。

## 目录

```text
experiment1/
├── docker-compose.yml
├── init/mysql/01-databases.sql
├── frontend/            # React 18 / TypeScript / Vite
├── java-gateway/        # Spring Boot 3.2 / Java 21
├── python-borrow/       # Flask 3 / SQLAlchemy
├── go-material/         # Gin / GORM
├── scripts/smoke.sh
└── README.md
```

## 前置依赖

- Docker + Docker Compose
- Java 21、Maven 3.8+
- Go 1.23+
- Python 3.11+

MySQL 映射到宿主机 **3307**（本地 3306 已被其它 MySQL 占用）。数据库账号：`lab / labpass`。

> 安全说明：仓库中的 `rootpass`、`labpass` 仅是本仓库 Docker 本地实验环境的默认值，不是任何线上服务凭据；仓库不包含真实的 token、密钥或个人凭据。`.env` 等本地配置文件已被 `.gitignore` 排除。

## 快速开始

```bash
# 1. 启动 MySQL（首次会执行 init/mysql/01-databases.sql）
docker compose up -d mysql

# 2. 启动三个服务（各开一个终端）
cd go-material && go build -buildvcs=false -o bin/material . && \
  DATABASE_URL='lab:labpass@tcp(127.0.0.1:3307)/lab_material?charset=utf8mb4&parseTime=True&loc=UTC' \
  PORT=8082 ./bin/material

cd python-borrow && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt && \
  DATABASE_URL='mysql+pymysql://lab:labpass@127.0.0.1:3307/lab_borrow' \
  PORT=8081 .venv/bin/python app.py

cd java-gateway && mvn -DskipTests package && \
  java -jar target/java-gateway-0.0.1-SNAPSHOT.jar
```

启动后：

- Swagger UI: <http://localhost:8080/swagger-ui.html>
- 健康检查：`http://localhost:8081/health`、`http://localhost:8082/health`

## 前端

前端位于 `frontend/`，开发期由 Vite 代理 `/api` 到 `http://localhost:8080`。

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
```

页面：总览、人员管理、物资管理、借用记录。操作会直接调用网关，不需要另起 BFF。

```bash
npm run test       # Vitest + Testing Library
npm run typecheck
npm run build      # 产出 frontend/dist
```

### 前端截图

![LabFlow 总览](docs/images/overview.png)

## 对外接口（8080）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET/POST | `/api/persons` | 列表（`role`、`status` 过滤）/ 创建 |
| GET/PUT/DELETE | `/api/persons/{id}` | 详情 / 更新 / 删除 |
| GET/POST | `/api/materials` | 列表 / 创建 |
| GET/PUT/DELETE | `/api/materials/{id}` | 详情 / 更新 / 删除 |
| GET/POST | `/api/borrows` | 列表（`personId`、`materialId`、`status`）/ 创建 |
| GET | `/api/borrows/{id}` | 详情 |
| GET | `/api/borrows/{id}/detail` | 聚合人员/物资与 `overdueDays` |
| PUT | `/api/borrows/{id}/return` | 归还 |
| DELETE | `/api/borrows/{id}` | 取消 |

统一响应：`{"code":200,"message":"success","data":...}`。存在 `BORROWED` 借用时，删除人员/物资返回 409。

示例：

```bash
curl -X POST localhost:8080/api/persons -H 'Content-Type: application/json' \
  -d '{"name":"张三","role":"STUDENT","status":"ACTIVE"}'

curl -X POST localhost:8080/api/materials -H 'Content-Type: application/json' \
  -d '{"name":"示波器","quantity":10}'

curl -X POST localhost:8080/api/borrows -H 'Content-Type: application/json' \
  -d '{"personId":1,"materialId":1,"quantity":2,"dueTime":"2026-11-11T02:00:00Z"}'

curl localhost:8080/api/materials/1
```

## 测试

```bash
# Go（需要 MySQL，默认连 lab_material_test @ 127.0.0.1:3307）
cd go-material && go test -buildvcs=false ./...

# Python（默认连 lab_borrow_test @ 127.0.0.1:3307）
cd python-borrow && .venv/bin/pytest -q

# Java（单元测试 + Testcontainers MySQL）
cd java-gateway && mvn test
```

说明：

- 非 git 目录下 Go 构建需要 `-buildvcs=false`（或先 `git init`）。
- Testcontainers 在本机 Docker 29 上需要 API 1.44，`pom.xml` 的 surefire 已设置 `api.version=1.44`；使用更老的 Docker 时请调整该值。

## 端到端验收

```bash
bash scripts/smoke.sh
```

脚本会自行启动 MySQL 与三个服务，依次验证：

- 三服务健康检查
- 创建人员/物资/借用，库存扣减与聚合详情
- 归还与取消后的库存恢复
- 超量借用 409、人员不存在 404
- Python 停止后创建借用返回 502
- 清理测试数据后退出

需要 Go 在 `PATH` 中；若不在，可先 `export PATH=/path/to/go/bin:$PATH`。

## 已知限制

- 归还/取消的进程内锁只在单网关实例内有效，多实例需分布式锁。
- 删除守卫的“检查→删除”非原子，窗口内仍可能创建新借用。
- 跨服务补偿为尽力而为：补偿失败只记录日志，不重试、不回滚。
- 创建借用成功后若响应丢失，可能留下“有记录未扣库存”的状态；未引入幂等键。
- 物资 `PUT quantity` 是绝对值覆盖，与并发扣减并发时以最后一次更新为准。
- 不做认证/授权、分页、缓存、消息队列、分布式事务、前端与 CI。
