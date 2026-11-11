package model

type Material struct {
	ID       uint64 `gorm:"primaryKey;autoIncrement" json:"id"`
	Name     string `gorm:"type:varchar(100);not null" json:"name"`
	Quantity int    `gorm:"size:32;not null;default:0;check:chk_material_quantity,quantity >= 0" json:"quantity"`
}

func (Material) TableName() string {
	return "material"
}
