package repository

import (
	"errors"

	"gorm.io/gorm"

	"lab/material/internal/model"
)

var (
	ErrNotFound          = errors.New("material not found")
	ErrInsufficientStock = errors.New("insufficient stock")
)

type MaterialRepository struct {
	db *gorm.DB
}

func NewMaterialRepository(db *gorm.DB) *MaterialRepository {
	return &MaterialRepository{db: db}
}

func (r *MaterialRepository) List() ([]model.Material, error) {
	var materials []model.Material
	if err := r.db.Order("id asc").Find(&materials).Error; err != nil {
		return nil, err
	}
	return materials, nil
}

func (r *MaterialRepository) Get(id uint64) (*model.Material, error) {
	var m model.Material
	if err := r.db.First(&m, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &m, nil
}

func (r *MaterialRepository) Create(name string, quantity int) (*model.Material, error) {
	m := &model.Material{Name: name, Quantity: quantity}
	if err := r.db.Create(m).Error; err != nil {
		return nil, err
	}
	return m, nil
}

func (r *MaterialRepository) Update(id uint64, name string, quantity int) (*model.Material, error) {
	if err := r.db.Model(&model.Material{}).Where("id = ?", id).
		Updates(map[string]any{"name": name, "quantity": quantity}).Error; err != nil {
		return nil, err
	}
	return r.Get(id)
}

func (r *MaterialRepository) Delete(id uint64) error {
	res := r.db.Delete(&model.Material{}, id)
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *MaterialRepository) Deduct(id uint64, quantity int) (*model.Material, error) {
	res := r.db.Model(&model.Material{}).
		Where("id = ? AND quantity >= ?", id, quantity).
		Update("quantity", gorm.Expr("quantity - ?", quantity))
	if res.Error != nil {
		return nil, res.Error
	}
	if res.RowsAffected == 0 {
		var count int64
		if err := r.db.Model(&model.Material{}).Where("id = ?", id).Count(&count).Error; err != nil {
			return nil, err
		}
		if count == 0 {
			return nil, ErrNotFound
		}
		return nil, ErrInsufficientStock
	}
	return r.Get(id)
}

func (r *MaterialRepository) Restore(id uint64, quantity int) (*model.Material, error) {
	res := r.db.Model(&model.Material{}).
		Where("id = ?", id).
		Update("quantity", gorm.Expr("quantity + ?", quantity))
	if res.Error != nil {
		return nil, res.Error
	}
	if res.RowsAffected == 0 {
		return nil, ErrNotFound
	}
	return r.Get(id)
}
