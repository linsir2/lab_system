package repository

import (
	"errors"
	"sync"
	"sync/atomic"
	"testing"

	"lab/material/internal/testutil"
)

func TestMain(m *testing.M) {
	testutil.Main(m)
}

func TestCreateGetUpdateDelete(t *testing.T) {
	db := testutil.DB(t)
	repo := NewMaterialRepository(db)

	created, err := repo.Create("示波器", 10)
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if created.ID == 0 || created.Name != "示波器" || created.Quantity != 10 {
		t.Fatalf("unexpected created: %+v", created)
	}

	got, err := repo.Get(created.ID)
	if err != nil || got.Name != "示波器" {
		t.Fatalf("get: %v %+v", err, got)
	}

	updated, err := repo.Update(created.ID, "数字示波器", 8)
	if err != nil {
		t.Fatalf("update: %v", err)
	}
	if updated.Name != "数字示波器" || updated.Quantity != 8 {
		t.Fatalf("unexpected update: %+v", updated)
	}

	if err := repo.Delete(created.ID); err != nil {
		t.Fatalf("delete: %v", err)
	}
	if _, err := repo.Get(created.ID); !errors.Is(err, ErrNotFound) {
		t.Fatalf("want ErrNotFound, got %v", err)
	}
	if err := repo.Delete(created.ID); !errors.Is(err, ErrNotFound) {
		t.Fatalf("delete missing: want ErrNotFound, got %v", err)
	}
}

func TestDeductAndRestore(t *testing.T) {
	db := testutil.DB(t)
	repo := NewMaterialRepository(db)
	m, _ := repo.Create("万用表", 5)

	got, err := repo.Deduct(m.ID, 2)
	if err != nil {
		t.Fatalf("deduct: %v", err)
	}
	if got.Quantity != 3 {
		t.Fatalf("want 3, got %d", got.Quantity)
	}

	got, err = repo.Restore(m.ID, 4)
	if err != nil {
		t.Fatalf("restore: %v", err)
	}
	if got.Quantity != 7 {
		t.Fatalf("want 7, got %d", got.Quantity)
	}
}

func TestDeductInsufficientDoesNotChangeStock(t *testing.T) {
	db := testutil.DB(t)
	repo := NewMaterialRepository(db)
	m, _ := repo.Create("电源", 1)

	if _, err := repo.Deduct(m.ID, 2); !errors.Is(err, ErrInsufficientStock) {
		t.Fatalf("want ErrInsufficientStock, got %v", err)
	}
	got, _ := repo.Get(m.ID)
	if got.Quantity != 1 {
		t.Fatalf("stock changed: %d", got.Quantity)
	}
	if _, err := repo.Deduct(99999, 1); !errors.Is(err, ErrNotFound) {
		t.Fatalf("want ErrNotFound, got %v", err)
	}
}

func TestConcurrentDeduct(t *testing.T) {
	db := testutil.DB(t)
	repo := NewMaterialRepository(db)
	m, _ := repo.Create("并发测试", 5)

	var success, insufficient int32
	var wg sync.WaitGroup
	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if _, err := repo.Deduct(m.ID, 1); err != nil {
				if errors.Is(err, ErrInsufficientStock) {
					atomic.AddInt32(&insufficient, 1)
					return
				}
				t.Errorf("unexpected: %v", err)
				return
			}
			atomic.AddInt32(&success, 1)
		}()
	}
	wg.Wait()

	if success != 5 || insufficient != 5 {
		t.Fatalf("want 5/5, got success=%d insufficient=%d", success, insufficient)
	}
	got, _ := repo.Get(m.ID)
	if got.Quantity != 0 {
		t.Fatalf("want 0, got %d", got.Quantity)
	}
}
