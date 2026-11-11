package testutil

import (
	"context"
	"database/sql"
	"os"
	"testing"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"

	"lab/material/internal/model"
)

const lockName = "lab_material_test_schema"

func dsn() string {
	if v := os.Getenv("TEST_DATABASE_URL"); v != "" {
		return v
	}
	return "lab:labpass@tcp(127.0.0.1:3307)/lab_material_test?charset=utf8mb4&parseTime=True&loc=UTC"
}

func DB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(mysql.Open(dsn()), &gorm.Config{})
	if err != nil {
		t.Fatalf("connect test db: %v", err)
	}
	if err := db.Exec("DROP TABLE IF EXISTS material").Error; err != nil {
		t.Fatalf("drop table: %v", err)
	}
	if err := db.AutoMigrate(&model.Material{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	return db
}

func Main(m *testing.M) {
	db, err := gorm.Open(mysql.Open(dsn()), &gorm.Config{})
	if err != nil {
		panic(err)
	}
	sqlDB, err := db.DB()
	if err != nil {
		panic(err)
	}
	ctx := context.Background()
	conn, err := sqlDB.Conn(ctx)
	if err != nil {
		panic(err)
	}
	var acquired sql.NullInt64
	if err := conn.QueryRowContext(ctx, "SELECT GET_LOCK(?, 60)", lockName).Scan(&acquired); err != nil {
		panic(err)
	}
	if !acquired.Valid || acquired.Int64 != 1 {
		panic("could not acquire test schema lock")
	}

	code := m.Run()

	_, _ = conn.ExecContext(ctx, "SELECT RELEASE_LOCK(?)", lockName)
	_ = conn.Close()
	_ = sqlDB.Close()
	os.Exit(code)
}
