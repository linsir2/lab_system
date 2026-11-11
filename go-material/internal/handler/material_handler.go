package handler

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"lab/material/internal/repository"
)

type MaterialHandler struct {
	repo *repository.MaterialRepository
}

func NewMaterialHandler(repo *repository.MaterialRepository) *MaterialHandler {
	return &MaterialHandler{repo: repo}
}

type materialRequest struct {
	Name     string `json:"name"`
	Quantity *int   `json:"quantity"`
}

type quantityRequest struct {
	Quantity int `json:"quantity"`
}

type errorBody struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

func (h *MaterialHandler) List(c *gin.Context) {
	materials, err := h.repo.List()
	if err != nil {
		writeError(c, http.StatusInternalServerError, "internal error")
		return
	}
	c.JSON(http.StatusOK, materials)
}

func (h *MaterialHandler) Get(c *gin.Context) {
	id, ok := parseID(c)
	if !ok {
		return
	}
	m, err := h.repo.Get(id)
	if err != nil {
		writeRepoError(c, err)
		return
	}
	c.JSON(http.StatusOK, m)
}

func (h *MaterialHandler) Create(c *gin.Context) {
	var req materialRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		writeError(c, http.StatusBadRequest, "invalid request body")
		return
	}
	if !validName(req.Name) || req.Quantity == nil || *req.Quantity < 0 {
		writeError(c, http.StatusBadRequest, "name must not be blank and quantity must be >= 0")
		return
	}
	m, err := h.repo.Create(strings.TrimSpace(req.Name), *req.Quantity)
	if err != nil {
		writeError(c, http.StatusInternalServerError, "internal error")
		return
	}
	c.JSON(http.StatusCreated, m)
}

func (h *MaterialHandler) Update(c *gin.Context) {
	id, ok := parseID(c)
	if !ok {
		return
	}
	var req materialRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		writeError(c, http.StatusBadRequest, "invalid request body")
		return
	}
	if !validName(req.Name) || req.Quantity == nil || *req.Quantity < 0 {
		writeError(c, http.StatusBadRequest, "name must not be blank and quantity must be >= 0")
		return
	}
	m, err := h.repo.Update(id, strings.TrimSpace(req.Name), *req.Quantity)
	if err != nil {
		writeRepoError(c, err)
		return
	}
	c.JSON(http.StatusOK, m)
}

func (h *MaterialHandler) Delete(c *gin.Context) {
	id, ok := parseID(c)
	if !ok {
		return
	}
	if err := h.repo.Delete(id); err != nil {
		writeRepoError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *MaterialHandler) Deduct(c *gin.Context) {
	id, ok := parseID(c)
	if !ok {
		return
	}
	var req quantityRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.Quantity <= 0 {
		writeError(c, http.StatusBadRequest, "quantity must be > 0")
		return
	}
	m, err := h.repo.Deduct(id, req.Quantity)
	if err != nil {
		writeRepoError(c, err)
		return
	}
	c.JSON(http.StatusOK, m)
}

func (h *MaterialHandler) Restore(c *gin.Context) {
	id, ok := parseID(c)
	if !ok {
		return
	}
	var req quantityRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.Quantity <= 0 {
		writeError(c, http.StatusBadRequest, "quantity must be > 0")
		return
	}
	m, err := h.repo.Restore(id, req.Quantity)
	if err != nil {
		writeRepoError(c, err)
		return
	}
	c.JSON(http.StatusOK, m)
}

func parseID(c *gin.Context) (uint64, bool) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		writeError(c, http.StatusBadRequest, "invalid material id")
		return 0, false
	}
	return id, true
}

func validName(name string) bool {
	return strings.TrimSpace(name) != ""
}

func writeRepoError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, repository.ErrNotFound):
		writeError(c, http.StatusNotFound, "material not found")
	case errors.Is(err, repository.ErrInsufficientStock):
		writeError(c, http.StatusConflict, "insufficient stock")
	default:
		writeError(c, http.StatusInternalServerError, "internal error")
	}
}

func writeError(c *gin.Context, status int, message string) {
	c.JSON(status, errorBody{Code: status, Message: message})
}
