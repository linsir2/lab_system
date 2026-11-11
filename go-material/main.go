package main

import (
	"log"
	"os"
	"time"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"

	"lab/material/internal/handler"
	"lab/material/internal/model"
	"lab/material/internal/repository"
	"lab/material/internal/router"
)

func main() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "lab:labpass@tcp(127.0.0.1:3307)/lab_material?charset=utf8mb4&parseTime=True&loc=UTC"
	}
	port := os.Getenv("PORT")
	if port == "" {
		port = "8082"
	}

	db := connectWithRetry(dsn)
	if err := db.AutoMigrate(&model.Material{}); err != nil {
		log.Fatalf("migrate: %v", err)
	}

	repo := repository.NewMaterialRepository(db)
	r := router.NewRouter(handler.NewMaterialHandler(repo))
	log.Printf("material service listening on :%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("server: %v", err)
	}
}

func connectWithRetry(dsn string) *gorm.DB {
	var lastErr error
	for i := 0; i < 30; i++ {
		db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
		if err == nil {
			sqlDB, pingErr := db.DB()
			if pingErr == nil && sqlDB.Ping() == nil {
				return db
			}
			lastErr = pingErr
		} else {
			lastErr = err
		}
		log.Printf("waiting for mysql (%d/30): %v", i+1, lastErr)
		time.Sleep(2 * time.Second)
	}
	log.Fatalf("connect mysql: %v", lastErr)
	return nil
}
