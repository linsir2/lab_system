package handler_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"

	"github.com/gin-gonic/gin"

	"lab/material/internal/handler"
	"lab/material/internal/model"
	"lab/material/internal/repository"
	"lab/material/internal/router"
	"lab/material/internal/testutil"
)

func TestMain(m *testing.M) {
	testutil.Main(m)
}

func setup(t *testing.T) (*gin.Engine, *repository.MaterialRepository) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	db := testutil.DB(t)
	repo := repository.NewMaterialRepository(db)
	return router.NewRouter(handler.NewMaterialHandler(repo)), repo
}

func request(t *testing.T, engine *gin.Engine, method, path, body string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(method, path, bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	engine.ServeHTTP(w, req)
	return w
}

func decodeMaterial(t *testing.T, w *httptest.ResponseRecorder) model.Material {
	t.Helper()
	var m model.Material
	if err := json.Unmarshal(w.Body.Bytes(), &m); err != nil {
		t.Fatalf("decode: %v body=%s", err, w.Body.String())
	}
	return m
}

func TestHealth(t *testing.T) {
	engine, _ := setup(t)
	w := request(t, engine, http.MethodGet, "/health", "")
	if w.Code != http.StatusOK {
		t.Fatalf("want 200, got %d", w.Code)
	}
}

func TestCRUD(t *testing.T) {
	engine, _ := setup(t)

	w := request(t, engine, http.MethodPost, "/materials", `{"name":"示波器","quantity":10}`)
	if w.Code != http.StatusCreated {
		t.Fatalf("create: want 201, got %d body=%s", w.Code, w.Body.String())
	}
	created := decodeMaterial(t, w)
	if created.ID == 0 || created.Name != "示波器" || created.Quantity != 10 {
		t.Fatalf("unexpected: %+v", created)
	}

	w = request(t, engine, http.MethodGet, "/materials/"+strconv.FormatUint(created.ID, 10), "")
	if w.Code != http.StatusOK {
		t.Fatalf("get: want 200, got %d", w.Code)
	}
	if got := decodeMaterial(t, w); got.Name != "示波器" {
		t.Fatalf("unexpected get: %+v", got)
	}

	w = request(t, engine, http.MethodPut, "/materials/"+strconv.FormatUint(created.ID, 10), `{"name":"数字示波器","quantity":8}`)
	if w.Code != http.StatusOK {
		t.Fatalf("update: want 200, got %d body=%s", w.Code, w.Body.String())
	}
	if got := decodeMaterial(t, w); got.Name != "数字示波器" || got.Quantity != 8 {
		t.Fatalf("unexpected update: %+v", got)
	}

	w = request(t, engine, http.MethodDelete, "/materials/"+strconv.FormatUint(created.ID, 10), "")
	if w.Code != http.StatusNoContent {
		t.Fatalf("delete: want 204, got %d", w.Code)
	}

	w = request(t, engine, http.MethodGet, "/materials/"+strconv.FormatUint(created.ID, 10), "")
	if w.Code != http.StatusNotFound {
		t.Fatalf("get deleted: want 404, got %d", w.Code)
	}
}

func TestValidationAndNotFound(t *testing.T) {
	engine, _ := setup(t)

	cases := []struct {
		name string
		body string
	}{
		{"empty name", `{"name":"  ","quantity":1}`},
		{"negative quantity", `{"name":"x","quantity":-1}`},
	}
	for _, c := range cases {
		w := request(t, engine, http.MethodPost, "/materials", c.body)
		if w.Code != http.StatusBadRequest {
			t.Fatalf("%s: want 400, got %d body=%s", c.name, w.Code, w.Body.String())
		}
	}

	if w := request(t, engine, http.MethodGet, "/materials/abc", ""); w.Code != http.StatusBadRequest {
		t.Fatalf("bad id: want 400, got %d", w.Code)
	}
	if w := request(t, engine, http.MethodGet, "/materials/999", ""); w.Code != http.StatusNotFound {
		t.Fatalf("missing: want 404, got %d", w.Code)
	}
}

func TestDeductAndRestore(t *testing.T) {
	engine, repo := setup(t)
	m, _ := repo.Create("万用表", 5)
	id := strconv.FormatUint(m.ID, 10)

	w := request(t, engine, http.MethodPost, "/materials/"+id+"/deduct", `{"quantity":2}`)
	if w.Code != http.StatusOK {
		t.Fatalf("deduct: want 200, got %d body=%s", w.Code, w.Body.String())
	}
	if got := decodeMaterial(t, w); got.Quantity != 3 {
		t.Fatalf("want 3, got %d", got.Quantity)
	}

	w = request(t, engine, http.MethodPost, "/materials/"+id+"/deduct", `{"quantity":4}`)
	if w.Code != http.StatusConflict {
		t.Fatalf("insufficient: want 409, got %d body=%s", w.Code, w.Body.String())
	}
	if got, _ := repo.Get(m.ID); got.Quantity != 3 {
		t.Fatalf("stock changed: %d", got.Quantity)
	}

	w = request(t, engine, http.MethodPost, "/materials/"+id+"/restore", `{"quantity":4}`)
	if w.Code != http.StatusOK {
		t.Fatalf("restore: want 200, got %d body=%s", w.Code, w.Body.String())
	}
	if got := decodeMaterial(t, w); got.Quantity != 7 {
		t.Fatalf("want 7, got %d", got.Quantity)
	}

	w = request(t, engine, http.MethodPost, "/materials/"+id+"/deduct", `{"quantity":0}`)
	if w.Code != http.StatusBadRequest {
		t.Fatalf("zero: want 400, got %d", w.Code)
	}
}

func TestDeductMissingMaterial(t *testing.T) {
	engine, _ := setup(t)
	w := request(t, engine, http.MethodPost, "/materials/999/deduct", `{"quantity":1}`)
	if w.Code != http.StatusNotFound {
		t.Fatalf("want 404, got %d", w.Code)
	}
}
