#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

JAVA_PORT=8080
PYTHON_PORT=8081
GO_PORT=8082

PYTHON_DSN="mysql+pymysql://lab:labpass@127.0.0.1:3307/lab_borrow"
GO_DSN="lab:labpass@tcp(127.0.0.1:3307)/lab_material?charset=utf8mb4&parseTime=True&loc=UTC"
MATERIAL_BIN="$ROOT/go-material/bin/material"

PIDS=()
PYTHON_PID=""

fail() {
    echo "FAIL: $*" >&2
    exit 1
}

pass() {
    echo "PASS: $*"
}

cleanup() {
    for pid in "${PIDS[@]:-}"; do
        kill "$pid" 2>/dev/null || true
    done
    wait 2>/dev/null || true
}
trap cleanup EXIT

require_free_port() {
    if (ss -ltn 2>/dev/null || netstat -ltn 2>/dev/null) | grep -q ":$1 "; then
        fail "port $1 is already in use"
    fi
}

wait_http() {
    local url=$1 name=$2
    for _ in $(seq 1 120); do
        if curl -sf "$url" >/dev/null 2>&1; then
            return 0
        fi
        sleep 0.5
    done
    fail "$name did not become healthy: $url"
}

wait_python_down() {
    for _ in $(seq 1 40); do
        if ! curl -sf "http://localhost:$PYTHON_PORT/health" >/dev/null 2>&1; then
            return 0
        fi
        sleep 0.25
    done
    fail "python service did not stop"
}

json_id() {
    python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["id"])'
}

json_field() {
    python3 -c "import sys,json; print(json.load(sys.stdin)['data']['$1'])"
}

assert_eq() {
    if [ "$1" != "$2" ]; then
        fail "$3 (expected '$2', got '$1')"
    fi
}

start_python() {
    (
        cd python-borrow
        DATABASE_URL="$PYTHON_DSN" PORT="$PYTHON_PORT" exec .venv/bin/python app.py
    ) >/tmp/lab-smoke-python.log 2>&1 &
    PYTHON_PID=$!
    PIDS+=("$PYTHON_PID")
}

echo "== prerequisites =="
command -v docker >/dev/null || fail "docker not found"
command -v curl >/dev/null || fail "curl not found"
command -v python3 >/dev/null || fail "python3 not found"
command -v java >/dev/null || fail "java not found"
command -v mvn >/dev/null || fail "mvn not found"
command -v go >/dev/null || fail "go not found (add it to PATH or set GO_BIN)"

require_free_port "$JAVA_PORT"
require_free_port "$PYTHON_PORT"
require_free_port "$GO_PORT"

echo "== mysql =="
docker compose up -d mysql >/dev/null
for _ in $(seq 1 60); do
    if docker compose exec -T mysql mysqladmin ping -prootpass --silent >/dev/null 2>&1; then
        break
    fi
    sleep 1
done
docker compose exec -T mysql mysqladmin ping -prootpass --silent >/dev/null 2>&1 \
    || fail "mysql did not become healthy"
pass "mysql healthy"

echo "== build =="
if [ ! -x python-borrow/.venv/bin/python ]; then
    python3 -m venv python-borrow/.venv
    python-borrow/.venv/bin/pip install -q -r python-borrow/requirements.txt
fi
(cd go-material && go build -buildvcs=false -o bin/material .)
(cd java-gateway && mvn -B -q -DskipTests package)
pass "artifacts built"

echo "== start services =="
(
    cd go-material
    DATABASE_URL="$GO_DSN" PORT="$GO_PORT" exec "$MATERIAL_BIN"
) >/tmp/lab-smoke-go.log 2>&1 &
PIDS+=($!)

start_python

(
    cd java-gateway
    exec java -jar target/java-gateway-0.0.1-SNAPSHOT.jar
) >/tmp/lab-smoke-java.log 2>&1 &
PIDS+=($!)

wait_http "http://localhost:$PYTHON_PORT/health" "python"
wait_http "http://localhost:$GO_PORT/health" "go"
wait_http "http://localhost:$JAVA_PORT/api/persons" "java"
pass "services healthy"

echo "== create person / material =="
person_json=$(curl -s -X POST "http://localhost:$JAVA_PORT/api/persons" \
    -H 'Content-Type: application/json' \
    -d '{"name":"smoke-user","role":"STUDENT","status":"ACTIVE"}')
person_id=$(printf '%s' "$person_json" | json_id)
[ -n "$person_id" ] || fail "person create failed: $person_json"

material_json=$(curl -s -X POST "http://localhost:$JAVA_PORT/api/materials" \
    -H 'Content-Type: application/json' \
    -d '{"name":"smoke-scope","quantity":10}')
material_id=$(printf '%s' "$material_json" | json_id)
[ -n "$material_id" ] || fail "material create failed: $material_json"
assert_eq "$(printf '%s' "$material_json" | json_field quantity)" "10" "initial stock"
pass "person=$person_id material=$material_id"

echo "== borrow / detail / return =="
borrow_json=$(curl -s -X POST "http://localhost:$JAVA_PORT/api/borrows" \
    -H 'Content-Type: application/json' \
    -d "{\"personId\":$person_id,\"materialId\":$material_id,\"quantity\":2,\"dueTime\":\"2099-01-01T00:00:00Z\"}")
borrow_id=$(printf '%s' "$borrow_json" | json_id)
assert_eq "$(printf '%s' "$borrow_json" | json_field status)" "BORROWED" "borrow status"

stock=$(curl -s "http://localhost:$JAVA_PORT/api/materials/$material_id" | json_field quantity)
assert_eq "$stock" "8" "stock after borrow"

detail=$(curl -s "http://localhost:$JAVA_PORT/api/borrows/$borrow_id/detail")
assert_eq "$(printf '%s' "$detail" | python3 -c 'import sys,json;print(json.load(sys.stdin)["data"]["person"]["deleted"])')" "False" "detail person"
assert_eq "$(printf '%s' "$detail" | python3 -c 'import sys,json;print(json.load(sys.stdin)["data"]["overdueDays"])')" "0" "overdueDays"

returned=$(curl -s -X PUT "http://localhost:$JAVA_PORT/api/borrows/$borrow_id/return")
assert_eq "$(printf '%s' "$returned" | json_field status)" "RETURNED" "return status"
stock=$(curl -s "http://localhost:$JAVA_PORT/api/materials/$material_id" | json_field quantity)
assert_eq "$stock" "10" "stock after return"
pass "borrow and return"

echo "== cancel =="
cancel_json=$(curl -s -X POST "http://localhost:$JAVA_PORT/api/borrows" \
    -H 'Content-Type: application/json' \
    -d "{\"personId\":$person_id,\"materialId\":$material_id,\"quantity\":3,\"dueTime\":\"2099-01-01T00:00:00Z\"}")
cancel_id=$(printf '%s' "$cancel_json" | json_id)
cancelled=$(curl -s -X DELETE "http://localhost:$JAVA_PORT/api/borrows/$cancel_id")
assert_eq "$(printf '%s' "$cancelled" | json_field status)" "CANCELLED" "cancel status"
stock=$(curl -s "http://localhost:$JAVA_PORT/api/materials/$material_id" | json_field quantity)
assert_eq "$stock" "10" "stock after cancel"
pass "cancel"

echo "== rejections =="
over_code=$(curl -s -o /tmp/lab-smoke-over.json -w '%{http_code}' -X POST "http://localhost:$JAVA_PORT/api/borrows" \
    -H 'Content-Type: application/json' \
    -d "{\"personId\":$person_id,\"materialId\":$material_id,\"quantity\":999,\"dueTime\":\"2099-01-01T00:00:00Z\"}")
assert_eq "$over_code" "409" "over-borrow status"

missing_code=$(curl -s -o /tmp/lab-smoke-missing.json -w '%{http_code}' -X POST "http://localhost:$JAVA_PORT/api/borrows" \
    -H 'Content-Type: application/json' \
    -d "{\"personId\":999999,\"materialId\":$material_id,\"quantity\":1,\"dueTime\":\"2099-01-01T00:00:00Z\"}")
assert_eq "$missing_code" "404" "missing person status"
pass "409 / 404"

echo "== python down => 502 =="
kill "$PYTHON_PID" 2>/dev/null || true
wait "$PYTHON_PID" 2>/dev/null || true
wait_python_down
down_code=$(curl -s -o /tmp/lab-smoke-502.json -w '%{http_code}' -X POST "http://localhost:$JAVA_PORT/api/borrows" \
    -H 'Content-Type: application/json' \
    -d "{\"personId\":$person_id,\"materialId\":$material_id,\"quantity\":1,\"dueTime\":\"2099-01-01T00:00:00Z\"}")
assert_eq "$down_code" "502" "python down status"
pass "502"

echo "== restart python and clean up =="
start_python
wait_http "http://localhost:$PYTHON_PORT/health" "python (restart)"
curl -s -o /dev/null -X DELETE "http://localhost:$PYTHON_PORT/borrows/$borrow_id" || true
curl -s -o /dev/null -X DELETE "http://localhost:$PYTHON_PORT/borrows/$cancel_id" || true
material_delete=$(curl -s -o /dev/null -w '%{http_code}' -X DELETE "http://localhost:$JAVA_PORT/api/materials/$material_id")
person_delete=$(curl -s -o /dev/null -w '%{http_code}' -X DELETE "http://localhost:$JAVA_PORT/api/persons/$person_id")
assert_eq "$material_delete" "204" "delete material"
assert_eq "$person_delete" "204" "delete person"
pass "cleanup"

echo "SMOKE PASSED"
